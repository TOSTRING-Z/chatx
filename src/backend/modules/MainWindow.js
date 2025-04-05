const { Window } = require("./Window")
const { store, global, inner, utils } = require('./globals')
const { clearMessages, saveMessages, loadMessages, deleteMessage, stopMessage, getStopIds } = require('../server/llm_service');
const { captureMouse } = require('../mouse/capture_mouse');
const { State } = require("../server/agent.js")
const { ToolCall } = require('../server/tool_call');
const { ChainCall } = require('../server/chain_call');

const { BrowserWindow, Menu, shell, ipcMain, clipboard, dialog } = require('electron');
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const fs = require('fs');
const os = require('os');
const path = require('path');

class MainWindow extends Window {
    constructor(windowManager) {
        super(windowManager);
        this.tool_call = new ToolCall(inner.model_obj[inner.model_name.plugins]);
        this.chain_call = new ChainCall();
        this.funcItems = {
            clip: {
                statu: utils.getConfig("func_status").clip,
                event: () => { },
                click: () => {
                    this.funcItems.clip.statu = !this.funcItems.clip.statu;
                }
            },
            markdown: {
                statu: utils.getConfig("func_status").markdown,
                event: () => { },
                click: () => {
                    this.funcItems.markdown.statu = !this.funcItems.markdown.statu;
                    this.funcItems.markdown.event();
                }
            },
            math: {
                statu: utils.getConfig("func_status").math,
                event: () => { },
                click: () => {
                    this.funcItems.math.statu = !this.funcItems.math.statu;
                    this.funcItems.math.event();
                }
            },
            text: {
                statu: utils.getConfig("func_status").text,
                event: () => { },
                click: () => {
                    this.funcItems.text.statu = !this.funcItems.text.statu;
                }
            },
            react: {
                statu: utils.getConfig("func_status").react,
                event: () => { },
                click: () => {
                    this.funcItems.react.statu = !this.funcItems.react.statu;
                    this.funcItems.react.event();
                }
            },
        };
    }

    create() {
        this.window = new BrowserWindow({
            width: 600,
            height: 600,
            icon: path.join(__dirname, '../icon/icon.ico'),
            webPreferences: {
                preload: path.join(__dirname, '../preload.js')
            }
        })

        this.window.on('focus', () => {
            this.window.setAlwaysOnTop(true)
            setTimeout(() => this.window.setAlwaysOnTop(false), 0);
        })

        const menu = Menu.buildFromTemplate(this.getTemplate())
        Menu.setApplicationMenu(menu)

        this.window.loadFile('src/frontend/index.html')

        // 在窗口加载完成后发送消息到渲染进程
        this.window.webContents.on('did-finish-load', () => {
            this.setPrompt(utils.getConfig("prompt"));
            this.initFuncItems();
        });

        // 拦截页面跳转
        this.window.webContents.on('will-navigate', (event, url) => {
            function isValidUrl(url) {
                try {
                    new URL(url); // 如果 URL 无效，会抛出错误
                    return true;
                } catch {
                    return false;
                }
            }
            // 阻止跳转
            event.preventDefault();
            console.log(`试图跳转到: ${url}，已被阻止`);
            if (isValidUrl(url)) {
                shell.openExternal(url).catch((error) => {
                    console.error('打开链接失败:', error.message);
                });
            } else {
                console.error('无效的 URL:', url);
            }
        });

        // 绑定窗口关闭事件
        this.window.on('close', () => {
            this.windowManager.closeAllWindows();
        })

        this.window.on('closed', () => {
            this.window = null;
        })

        global.last_clipboard_content = clipboard.readText();
    }

    setup() {

        ipcMain.handle('get-file-path', async (_event) => {
            return new Promise((resolve, rejects) => {
                const lastDirectory = store.get('lastFileDirectory') || path.join(os.homedir(), '.chatx', 'config.json');
                dialog
                    .showOpenDialog(this.window, {
                        properties: ['openFile'],
                        defaultPath: lastDirectory
                    })
                    .then(result => {
                        if (!result.canceled) {
                            const filePath = result.filePaths[0];
                            store.set('lastFileDirectory', path.dirname(filePath));
                            console.log(filePath);
                            resolve(filePath)
                        }
                    })
                    .catch(err => {
                        rejects(err);
                    });
            });
        })

        ipcMain.handle('query-text', async (_event, data) => {
            if (process.platform !== 'win32') {
                this.window.show();
            } else {
                this.window.focus();
            }
            // 默认值
            let defaults = {
                prompt: this.funcItems.text.event(data.prompt),
                query: this.funcItems.text.event(data.query),
                img_url: data?.img_url,
                file_path: data?.file_path,
                model: utils.copy(data.model),
                version: utils.copy(data.version),
                output_template: null,
                input_template: null,
                prompt_template: null,
                params: null,
                llm_parmas: utils.getConfig("llm_parmas"),
                memory_length: utils.getConfig("memory_length"),
                push_message: true,
                end: null,
                event: _event
            }
            data.outputs = []
            data.output_formats = []
            if (data.is_plugin) {
                let content = await this.chain_call.pluginCall(data);
                _event.sender.send('stream-data', { id: data.id, content: content, end: true });
            }
            else if (this.funcItems.react.statu) {
                // ReAct
                let step = 0;
                this.tool_call.state = State.IDLE;
                let tool_call = utils.getConfig("tool_call");
                while (this.tool_call.state != State.FINAL && this.tool_call.state != State.PAUSE) {
                    if (getStopIds().includes(data.id)) {
                        this.tool_call.state = State.FINAL
                        break;
                    }
                    data = { ...data, ...defaults, ...tool_call, step: ++step };

                    let options = await this.tool_call.step(data);
                    if (this.tool_call.state == State.PAUSE) {
                        this.window.webContents.send("options", { options, id: data.id });
                    }
                }

            }
            else {
                // 链式调用
                this.chain_call.state = State.IDLE;
                let chain_calls = utils.getConfig("chain_call");
                for (const step in chain_calls) {
                    if (getStopIds().includes(data.id)) {
                        break;
                    }
                    data = { ...data, ...defaults, ...chain_calls[step], step: step };
                    const tool_parmas = {}
                    const input_data = chain_calls[step]?.input_data || [];
                    for (const key in input_data) {
                        if (Object.hasOwnProperty.call(input_data, key)) {
                            const item = input_data[key];
                            tool_parmas[key] = item.format(data);
                        }
                    }
                    data = { ...data, ...tool_parmas };
                    await this.chain_call.step(data);
                    if (this.chain_call.state == State.FINAL) {
                        if (this.chain_call.is_plugin)
                            _event.sender.send('stream-data', { id: data.id, content: data.output_format, end: true });
                        break;
                    }
                    if (this.chain_call.state == State.ERROR) {
                        _event.sender.send('stream-data', { id: data.id, content: "发生错误！", end: true });
                        break;
                    }

                    let info = this.chain_call.get_info(data);
                    _event.sender.send('info-data', { id: data.id, content: info });
                }
            }
        })


        ipcMain.handle("delete-message", async (_event, id) => {
            let message_len = await deleteMessage(id);
            if (message_len <= utils.getConfig("memory_length")) {
                this.tool_call.environment_details.memory_len = 0;
            }
            console.log(`delect id: ${id}, length: ${message_len}`)
            return message_len;
        })

        ipcMain.on("stream-message-stop", (_event, id) => {
            stopMessage(id);
            console.log(`stop id: ${id}`)
        })

        ipcMain.on('submit', (_event, formData) => {
            this.send_query(formData, global.model, global.version)
        })

        ipcMain.on('plan-act-mode', (_event, mode) => {
            this.tool_call.plan_act_mode({
                "auto": this.tool_call.modes.AUTO,
                "plan": this.tool_call.modes.PLAN,
                "act": this.tool_call.modes.ACT,
            }[mode])
        })

        ipcMain.on('open-external', (_event, href) => {
            console.log(href)
            shell.openExternal(href);
        })
    }

    send_query(data, model, version) {
        data = { ...data, model, version, is_plugin: utils.getIsPlugin(model), id: ++global.id }
        this.window.webContents.send('query', data);
    }

    getClipEvent(e) {
        return setInterval(async () => {
            let clipboardContent = clipboard.readText();

            if (clipboardContent !== global.last_clipboard_content) {
                if (global.concat) {
                    global.last_clipboard_content = `${global.last_clipboard_content} ${clipboardContent}`;
                    clipboard.writeText(global.last_clipboard_content);
                } else {
                    global.last_clipboard_content = clipboardContent;
                }
                if (this.funcItems.text.statu) {
                    try {
                        const dom = new JSDOM(global.last_clipboard_content);
                        const plainText = dom.window.document.body.textContent;
                        global.last_clipboard_content = plainText
                        clipboard.writeText(plainText);
                        console.log('Clipboard content has been converted to plain text.');
                    } catch (error) {
                        console.error('Failed to clear clipboard formatting:', error);
                    }
                }
                if (e.statu) {
                    captureMouse()
                        .then((mousePosition) => {
                            console.log(mousePosition);
                            this.windowManager.iconWindow.create(mousePosition);
                        })
                        .catch((error) => {
                            console.error(error);
                        });
                }
            }
        }, 100);
    }

    getMarkDownEvent(e) {
        const markdownFormat = () => {
            this.window.webContents.send('markdown-format', e.statu);
        }
        markdownFormat();
        return markdownFormat;
    }

    getMathEvent(e) {
        const mathFormat = () => {
            this.window.webContents.send('math-format', e.statu);
        }
        mathFormat();
        return mathFormat;
    }

    getTextEvent(e) {
        const textFormat = (text) => {
            text = text.replaceAll('-\n', '');
            if (e.statu) {
                return text.replace(/[\s\n]+/g, ' ').trim();
            } else {
                return text;
            }
        }
        return textFormat;
    }

    getReactEvent(e) {
        const extraReact = () => {
            if (global.is_plugin) {
                console.log(inner.model_obj)
                console.log(global)
                this.window.webContents.send("extra_load", e.statu && inner.model_obj[global.model][global.version]?.extra)
            }
            else {
                this.window.webContents.send("extra_load", e.statu ? [{ "type": "act-plan" }] : utils.getConfig("extra"));
            }
        }
        extraReact();
        return extraReact;
    }

    initFuncItems() {
        this.funcItems.clip.event = this.getClipEvent(this.funcItems.clip);
        this.funcItems.markdown.event = this.getMarkDownEvent(this.funcItems.markdown);
        this.funcItems.math.event = this.getMathEvent(this.funcItems.math);
        this.funcItems.text.event = this.getTextEvent(this.funcItems.text);
        this.funcItems.react.event = this.getReactEvent(this.funcItems.react);
    }

    updateVersionsSubmenu() {
        const menu = Menu.buildFromTemplate(this.getTemplate());
        Menu.setApplicationMenu(menu);
    }

    getModelsSubmenu() {
        return Object.keys(utils.getConfig("models")).map((_model) => {
            return {
                type: 'radio',
                checked: global.model == _model,
                click: () => {
                    global.model = _model;
                    global.is_plugin = utils.getIsPlugin(_model)
                    global.version = utils.getConfig("models")[_model]["versions"][0].version;
                    this.updateVersionsSubmenu();
                },
                label: _model
            }
        })
    }

    getVersionsSubmenu() {
        let versions;
        if (global.is_plugin) {
            versions = inner.model[inner.model_name.plugins]["versions"];
            console.log(versions)
            versions = versions.filter(version => version?.show);
            console.log(versions)
        }
        else {
            versions = utils.getConfig("models")[global.model]["versions"];
        }
        this.funcItems.react.event();
        console.log(versions);
        return versions.map((version) => {
            const _version = version?.version || version;
            return {
                type: 'radio',
                checked: global.version == _version,
                click: () => {
                    global.version = _version
                    if (global.is_plugin) {
                        this.window.webContents.send("extra_load", version?.extra)
                    }
                },
                label: _version
            }
        })
    }

    getTemplate() {
        return [
            {
                label: "模型选择",
                submenu: this.getModelsSubmenu()
            },
            {
                label: "版本选择",
                submenu: this.getVersionsSubmenu()
            },
            {
                label: "功能选择",
                submenu: [
                    {
                        click: this.funcItems.clip.click,
                        label: '复制翻译',
                        type: 'checkbox',
                        checked: this.funcItems.clip.statu,
                    },
                    {
                        click: this.funcItems.markdown.click,
                        label: 'MarkDown',
                        type: 'checkbox',
                        checked: this.funcItems.markdown.statu,
                    },
                    {
                        click: this.funcItems.math.click,
                        label: '公式格式化',
                        type: 'checkbox',
                        checked: this.funcItems.math.statu,
                    },
                    {
                        click: this.funcItems.text.click,
                        label: '文本格式化',
                        type: 'checkbox',
                        checked: this.funcItems.text.statu,
                    }
                ]
            },
            {
                label: "智能体",
                submenu: [
                    {
                        label: '系统提示',
                        click: async () => {
                            this.loadPrompt();
                        }
                    },
                    {
                        label: '链式调用',
                        click: async () => {
                            this.loadChain();
                        }
                    },
                    {
                        click: this.funcItems.react.click,
                        label: 'ReAct',
                        type: 'checkbox',
                        checked: this.funcItems.react.statu,
                    },
                ]
            },
            {
                label: '其它',
                submenu: [
                    {
                        label: '配置文件',
                        click: async () => {
                            this.windowManager.configsWindow.create();
                        }
                    },
                    {
                        label: '控制台',
                        click: () => {
                            if (this.windowManager?.configsWindow) this.windowManager.configsWindow.window?.webContents.openDevTools();
                            if (this.window) this.window.webContents.openDevTools();
                        }
                    },
                    {
                        label: '重置对话',
                        click: () => {
                            clearMessages();
                            this.tool_call.clear_memory();
                            this.window.webContents.send('clear')
                        }
                    },
                    {
                        label: '保存对话',
                        click: () => {
                            const lastPath = path.join(store.get('lastSavePath') || path.join(process.resourcesPath, 'resource/', 'messages/'), `messages_${utils.formatDate()}.json`);
                            console.log(lastPath)
                            dialog.showSaveDialog(this.window, {
                                defaultPath: lastPath,
                                filters: [
                                    { name: 'JSON文件', extensions: ['json'] },
                                    { name: '所有文件', extensions: ['*'] }
                                ]
                            }).then(result => {
                                if (!result.canceled) {
                                    store.set('lastSavePath', path.dirname(result.filePath));
                                    saveMessages(result.filePath);
                                }
                            }).catch(err => {
                                console.error(err);
                            });
                        }
                    },
                    {
                        label: '加载对话',
                        click: () => {
                            const lastPath = store.get('lastSavePath') || path.join(process.resourcesPath, 'resource/', 'messages/');
                            dialog.showOpenDialog(this.window, {
                                defaultPath: lastPath,
                                filters: [
                                    { name: 'JSON文件', extensions: ['json'] },
                                    { name: '所有文件', extensions: ['*'] }
                                ]
                            }).then(result => {
                                if (!result.canceled) {
                                    clearMessages();
                                    this.tool_call.clear_memory();
                                    this.window.webContents.send('clear')
                                    let messages = loadMessages(result.filePaths[0])
                                    if (messages.length > 0) {
                                        const maxId = messages.reduce((max, current) => {
                                            return parseInt(current.id) > parseInt(max.id) ? current : max;
                                        }, messages[0]);
                                        if (!!maxId.id) {
                                            global.id = parseInt(maxId.id);
                                            if (!!messages[0].react) {
                                                const maxMemoryId = messages.reduce((max, current) => {
                                                    return parseInt(current.memory_id) > parseInt(max.memory_id) ? current : max;
                                                }, messages[0]);
                                                this.tool_call.memory_id = maxMemoryId.memory_id;
                                            }
                                            for (let i in messages) {
                                                i = parseInt(i);
                                                if (Object.hasOwnProperty.call(messages, i)) {
                                                    let { role, content, id, memory_id, react } = messages[i];
                                                    if (role == "user") {
                                                        if (!!react) {
                                                            let content_format = content.replaceAll("\`", "'").replaceAll("`", "'");
                                                            this.window.webContents.send('info-data', { id: id, content: `阶段 ${i}, 输出: \n\n\`\`\`\n${content_format}\n\`\`\`\n\n` });
                                                        }
                                                        else {
                                                            this.tool_call.memory_list.push({ user: content, memory_id: memory_id })
                                                            this.window.webContents.send('user-data', { id: id, content: content });
                                                        }
                                                    } else {
                                                        if (!!react) {
                                                            try {
                                                                const tool_info = JSON.parse(content);
                                                                if (!!tool_info?.thinking) {
                                                                    this.tool_call.memory_list.push({ assistant: tool_info.thinking, memory_id: memory_id });
                                                                    this.tool_call.memory_list.push({ memory_id: memory_id, user: `助手调用了 ${tool_info.tool} 工具` });
                                                                    const thinking = `${tool_info.thinking}\n\n---\n\n`
                                                                    let content_format = content.replaceAll("\`", "'").replaceAll("`", "'");
                                                                    this.window.webContents.send('info-data', { id: id, content: `阶段 ${i}, 输出: \n\n\`\`\`\n${content_format}\n\`\`\`\n\n` });
                                                                    this.window.webContents.send('stream-data', { id: id, content: thinking, end: true });
                                                                }
                                                            } catch (error) {
                                                                continue;
                                                            }
                                                        } else {
                                                            this.window.webContents.send('stream-data', { id: id, content: content, end: true });
                                                        }
                                                    }
                                                }
                                            }
                                            console.log(`加载成功：${result.filePaths[0]}`)
                                        } else {
                                            console.log(`加载失败：${result.filePaths[0]}`)
                                        }
                                    };
                                }
                            }).catch(err => {
                                console.error(err);
                            });
                        }
                    },
                ]
            }

        ]
    }

    setPrompt(prompt) {
        const config = utils.getConfig();
        config.prompt = prompt;
        utils.setConfig(config);
        this.window.webContents.send('prompt', prompt);
    }

    loadPrompt() {
        const lastDirectory = store.get('lastPromptDirectory') || path.join(process.resourcesPath, 'resource/', 'system_prompts/');
        dialog
            .showOpenDialog(this.window, {
                properties: ['openFile'],
                defaultPath: lastDirectory
            })
            .then(result => {
                if (!result.canceled) {
                    const filePath = result.filePaths[0];
                    store.set('lastPromptDirectory', path.dirname(filePath));
                    console.log(filePath);
                    const prompt = fs.readFileSync(filePath, 'utf-8');
                    this.setPrompt(prompt);
                }
            })
            .catch(err => {
                console.log(err);
            });
    }

    setChain(chain) {
        let config = utils.getConfig();
        config.chain_call = JSON.parse(chain).chain_call;
        config.extra = [];
        for (const key in config.chain_call) {
            if (Object.hasOwnProperty.call(config.chain_call, key)) {
                const item = config.chain_call[key];
                let extra;
                if (item?.model == inner.model_name.plugins) {
                    extra = inner.model_obj.plugins[item.version]?.extra || []
                } else {
                    extra = [{ "type": "system-prompt" }]
                }
                extra.forEach(extra_ => {
                    config.extra.push(extra_)
                });
            }
        }
        const deduplicateByType = (arr) => {
            const seen = new Set();
            return arr.filter(item => {
                const duplicate = seen.has(item.type);
                seen.add(item.type);
                return !duplicate;
            });
        }
        config.extra = deduplicateByType(config.extra);
        utils.setConfig(config);
        this.funcItems.react.statu = false;
        this.funcItems.react.event();
        this.updateVersionsSubmenu();
    }

    loadChain() {
        const lastDirectory = store.get('lastChainDirectory') || path.join(process.resourcesPath, 'resource/', 'chain_calls/');
        dialog
            .showOpenDialog(this.window, {
                properties: ['openFile'],
                defaultPath: lastDirectory
            })
            .then(result => {
                if (!result.canceled) {
                    const filePath = result.filePaths[0];
                    store.set('lastChainDirectory', path.dirname(filePath));
                    console.log(filePath);
                    const chain = fs.readFileSync(filePath, 'utf-8');
                    this.setChain(chain);
                }
            })
            .catch(err => {
                console.log(err);
            });
    }
}

module.exports = {
    MainWindow
};