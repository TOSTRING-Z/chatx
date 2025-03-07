const { Window } = require("./Window")
const { store, global, inner, utils } = require('./globals')
const { chatBase, clearMessages, saveMessages, loadMessages, deleteMessage, stopMessage, getStopIds } = require('../server/llm_service');
const { captureMouse } = require('../mouse/capture_mouse');

const { BrowserWindow, Menu, shell, ipcMain, clipboard, dialog } = require('electron');
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const fs = require('fs');
const os = require('os');
const path = require('path');

function format(template, params) {
    const keys = Object.keys(params);
    const values = Object.values(params);
    return new Function(...keys, `return \`$${template}\`;`)(...values);
}

String.prototype.format = function (data) {
    if (!!this) {
        let format_text = this.replaceAll("{{", "@bracket_left").replaceAll("}}", "@bracket_right");
        format_text = format_text.replace(/(\{.*?\})/g, (match, cmd) => {
            try {
                return format(cmd, data);
            } catch (e) {
                console.log(e);
                return match;
            }
        });
        format_text = format_text.replaceAll("@bracket_left", "{").replaceAll("@bracket_right", "}")
        return format_text;
    } else {
        return this
    }
}

class MainWindow extends Window {
    constructor(windowManager) {
        super(windowManager);
        this.funcItems = {
            clip: {
                statu: true,
                event: null,
                click: () => {
                    this.funcItems.clip.statu = !this.funcItems.clip.statu;
                }
            },
            math: {
                statu: true,
                event: null,
                click: () => {
                    this.funcItems.math.statu = !this.funcItems.math.statu;
                    this.funcItems.math.event();
                }
            },
            text: {
                statu: false,
                event: null,
                click: () => {
                    this.funcItems.text.statu = !this.funcItems.text.statu
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
            this.window.webContents.send("extre_load", utils.getConfig("extre"))
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
            // chain_calls中默认值
            let defaults = {
                prompt: this.funcItems.text.event(data.prompt),
                query: this.funcItems.text.event(data.query),
                img_url: data?.img_url,
                model: utils.copy(data.model),
                version: utils.copy(data.version),
                output_template: null,
                input_template: null,
                prompt_template: null,
                params: null,
                end: null,
                event: _event
            }
            data.outputs = []
            data.output_formats = []
            if (data.is_plugin) {
                let content = await this.pluginCall(data);
                _event.sender.send('stream-data', { id: data.id, content: content, end: true });
            }
            else {
                // 链式调用
                let chain_calls = utils.getConfig("chain_call");
                for (const step in chain_calls) {
                    if (getStopIds().includes(data.id)) {
                        break;
                    }

                    data = { ...data, ...defaults, ...chain_calls[step], step: step };
                    let statu;
                    if (utils.getIsPlugin(data.model)) {
                        statu = await this.pluginCall(data);
                        if (data.end) {
                            _event.sender.send('stream-data', { id: data.id, content: data.output_format, end: true });
                            break;
                        }
                    }
                    else {
                        statu = await this.llmCall(data);
                        if (data.end) {
                            break;
                        }
                    }
                    if (!statu) {
                        _event.sender.send('stream-data', { id: data.id, content: "发生错误！", end: true });
                        break;
                    }
                    let content = utils.getConfig("info_template").format(data);
                    console.log(content);
                    _event.sender.send('info-data', { id: data.id, content: content });
                }
            }
        })


        ipcMain.handle("delete-message", async (_event, id) => {
            let statu = await deleteMessage(id);
            console.log(`delect id: ${id}, statu: ${statu}`)
            return statu;
        })

        ipcMain.on("stream-message-stop", (_event, id) => {
            stopMessage(id);
            console.log(`stop id: ${id}`)
        })

        ipcMain.on('submit', (_event, formData) => {
            this.send_query(formData, global.model, global.version)
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

    async retry(func, data) {
        if (data.hasOwnProperty("output_format")) {
            data.input = data.output_format;
        } else {
            data.input = data.query;
        }
        if (data.hasOwnProperty("prompt_format")) {
            data.system_prompt = data.prompt_format;
        } else {
            data.system_prompt = data.prompt;
        }
        if (data.input_template) {
            data.input = data.input_template.format(data);
        }
        let retry_time = utils.getConfig("retry_time");
        let count = 0;
        while (count < retry_time) {
            if (getStopIds().includes(data.id)) {
                return null;
            }
            try {
                let output = await func(data);
                if (!!output) {
                    return output;
                }
                else {
                    count++;
                    continue;
                }
            } catch (_error) {
                count++;
            }
        }
        return null;
    }

    async llmCall(data) {
        data.api_url = utils.getConfig("models")[data.model].api_url;
        data.api_key = utils.getConfig("models")[data.model].api_key;
        data.params = utils.getConfig("models")[data.model].versions.find(version => {
            return typeof version !== "string" && version.version === data.version;
        });
        if (data.params?.hasOwnProperty("llm_parmas"))
            data.llm_parmas = data.params.llm_parmas;
        else
            data.llm_parmas = utils.getConfig("llm_parmas");
        data.memory_length = utils.getConfig("memory_length");
        if (data.prompt_template) {
            data.prompt_format = data.prompt_template.format(data);
        } else {
            data.prompt_format = data.prompt
        }
        data.output = await this.retry(chatBase, data);
        if (!data.output) {
            return null;
        }
        data.outputs.push(utils.copy(data.output));
        if (data.output_template) {
            data.output_format = data.output_template.format(data);
        } else {
            data.output_format = data.output;
        }
        data.output_formats.push(utils.copy(data.output_format));
        return data.output_format;
    }

    async pluginCall(data) {
        data.prompt_format = "";
        let func = inner.model_obj[data.model][data.version].func
        data.output = await this.retry(func, data);
        if (!data.output) {
            return null;
        }
        data.outputs.push(utils.copy(data.output));
        if (data.output_template) {
            data.output_format = data.output_template.format(data);
        } else {
            data.output_format = data.output;
        }
        data.output_formats.push(utils.copy(data.output_format));
        return data.output_format;
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
                        // 使用jsdom解析剪贴板内容，假设它是HTML
                        const dom = new JSDOM(global.last_clipboard_content);
                        const plainText = dom.window.document.body.textContent;
                        global.last_clipboard_content = plainText

                        // 将纯文本写回剪贴板
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

    initFuncItems() {
        this.funcItems.clip.event = this.getClipEvent(this.funcItems.clip);
        this.funcItems.math.event = this.getMathEvent(this.funcItems.math);
        this.funcItems.text.event = this.getTextEvent(this.funcItems.text);
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
                    global.version = utils.getConfig("models")[_model]["versions"][0];
                    this.updateVersionsSubmenu();
                },
                label: _model
            }
        })
    }

    getVersionsSubmenu() {
        let versions;
        if (global.is_plugin) {
            versions = inner.model[inner.model_name.plugin]["versions"];
            this.window.webContents.send("extre_load", inner.model_obj[global.model][versions[0]].extre)
        }
        else {
            versions = utils.getConfig("models")[global.model]["versions"];
            this.window.webContents.send("extre_load", utils.getConfig("extre"))
        }
        console.log(versions);
        return versions.map((_version) => {
            if (typeof _version !== "string") {
                _version = _version.version
            }
            return {
                type: 'radio',
                checked: global.version == _version,
                click: () => {
                    global.version = _version
                    if (global.is_plugin) {
                        this.window.webContents.send("extre_load", inner.model_obj[global.model][_version].extre)
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
                            // if (this.windowManager.iconWindow) this.windowManager.iconWindow.webContents.openDevTools();
                            if (this.windowManager.configsWindow) this.windowManager.configsWindow.webContents.openDevTools();
                            if (this.window) this.window.webContents.openDevTools();
                        }
                    },
                    {
                        label: '重置对话',
                        click: () => {
                            clearMessages();
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
                                    let messages = loadMessages(result.filePaths[0])
                                    if (messages.length > 0) {
                                        const maxId = messages.reduce((max, current) => {
                                            return parseInt(current.id) > parseInt(max.id) ? current : max;
                                        }, messages[0]);
                                        if (!!maxId.id) {
                                            global.id = parseInt(maxId.id);
                                            this.window.webContents.send('load', messages)
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
        // 获取上次打开的目录
        const lastDirectory = store.get('lastPromptDirectory') || path.join(process.resourcesPath, 'resource/', 'system_prompts/');
        // 打开文件选择对话框
        dialog
            .showOpenDialog(this.window, {
                properties: ['openFile'],
                defaultPath: lastDirectory
            })
            .then(result => {
                if (!result.canceled) {
                    const filePath = result.filePaths[0]; // 获取用户选取的文件路径
                    store.set('lastPromptDirectory', path.dirname(filePath)); // 记录当前选择的目录
                    console.log(filePath); // 在控制台输出文件路径
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
        config.extre = JSON.parse(chain).extre;
        this.window.webContents.send("extre_load", config.extre);
        utils.setConfig(config);
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