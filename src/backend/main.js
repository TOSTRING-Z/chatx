const { app, BrowserWindow, Menu, shell, ipcMain, clipboard, dialog, globalShortcut, desktopCapturer } = require('electron');
if (require('electron-squirrel-startup')) return app.quit();
const { chatBase, clearMessages, saveMessages, loadMessages, deleteMessage, stopMessage, getStopIds } = require('./server/llm_service');
const { captureMouse } = require('./mouse/capture_mouse');
const { clearInterval } = require('node:timers');
const fs = require('fs');
const os = require('os');
const Store = require('electron-store');
const path = require('path');
const jsdom = require("jsdom");
const { JSDOM } = jsdom;

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

/* 复制配置文件到用户目录 */
const copyConfigFile = () => {
    // 配置文件源路径
    const sourcePath = path.join(process.resourcesPath, 'resource/', 'config.json');
    // 目标路径为用户目录下的 .chatx 目录
    const targetPath = path.join(os.homedir(), '.chatx', 'config.json');

    if (!fs.existsSync(path.dirname(targetPath))) {
        fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    }

    fs.copyFileSync(sourcePath, targetPath);
};

const isFirstInstall = () => {
    const targetPath = path.join(os.homedir(), '.chatx', 'config.json');
    return !fs.existsSync(targetPath);
};

if (isFirstInstall()) {
    copyConfigFile();
}

/* 插件配置 */

// 配置插件接口
function loadPlugin(name) {
    const pluginPath = getConfig("plugins")[name].path.format(process);
    try {
        console.log(`loading plugin: ${name}`);
        const plugin = require(pluginPath);
        return {func: plugin.main, extre: plugin?.extre};
    } catch (error) {
        return () => `插件: ${name}, 路径: ${pluginPath}, 加载插件发生错误, 请检查路径和依赖！`
    }
}

// 插件配置参数
const inner_model_name = {
    plugin: "plugin"
};

let inner_model = {
    "plugin": { "versions": [] }
};

let inner_model_obj = {
    "plugin": {}
};

// 加载插件
Object.keys(getConfig("plugins")).forEach((_version) => {
    inner_model[inner_model_name.plugin]["versions"].push(_version);
    inner_model_obj[inner_model_name.plugin][_version] = loadPlugin(_version)
})

/* 单例窗口管理器 */

let windowManager = {
    mainWindow: null,
    iconWindow: null,
    overlayWindow: null,
    configWindow: null,
    autoCloseTimer: null,
    iconWindowWidth: 200,
    iconWindowHeight: 40,
    createIconWindow(position) {

        let x = position.x
        let y = position.y > 50 ? position.y - 50 : position.y

        if (this.iconWindow) {
            this.iconWindow.setPosition(x, y);
            if (this.autoCloseTimer) {
                clearTimeout(this.autoCloseTimer);
                this.autoCloseTimer = setTimeout(() => {
                    this.destroyIconWindow()
                }, getConfig("icon_time") * 1000) // 自动关闭
            }
            return this.iconWindow
        }

        this.iconWindow = new BrowserWindow({
            width: windowManager.iconWindowWidth,
            height: windowManager.iconWindowHeight,
            x,
            y,
            transparent: true,
            frame: false,
            skipTaskbar: true,
            alwaysOnTop: true,
            resizable: false,
            focusable: false, // 设置窗口不可聚焦
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false
            }
        })

        this.iconWindow.loadFile('./src/frontend/icon.html')

        this.iconWindow.setIgnoreMouseEvents(false) // 允许鼠标交互

        this.iconWindow.on('closed', (event) => {
            this.iconWindow = null;
        })

        // 新增自动关闭逻辑
        this.autoCloseTimer = setTimeout(() => {
            this.destroyIconWindow()
        }, getConfig("icon_time") * 1000) // 自动关闭

        return this.iconWindow
    },

    destroyIconWindow() {
        if (this.iconWindow) {
            this.iconWindow.close();
            this.iconWindow = null;
        }
        if (this.autoCloseTimer) {
            clearTimeout(this.autoCloseTimer);
            this.autoCloseTimer = null;
        }
    },

    closeAllWindows() {
        if (this.overlayWindow) this.overlayWindow.close();
        if (this.configWindow) this.configWindow.close();
        this.destroyIconWindow();
    }
}

/* 功能选项 */

const getClipEvent = (e) => {
    if (e.statu) {
        return setInterval(async () => {
            let clipboardContent = clipboard.readText();

            if (clipboardContent !== global.last_clipboard_content) {
                if (global.concat) {
                    global.last_clipboard_content = `${global.last_clipboard_content} ${clipboardContent}`;
                    clipboard.writeText(global.last_clipboard_content);
                } else {
                    global.last_clipboard_content = clipboardContent;
                }
                if (funcItems.text.statu) {
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
                captureMouse()
                    .then((mousePosition) => {
                        console.log(mousePosition);
                        windowManager.createIconWindow(mousePosition);
                    })
                    .catch((error) => {
                        console.error(error);
                    });
            }
        }, 200);
    }
}

const getMathEvent = (e) => {
    const mathFormat = () => {
        windowManager.mainWindow.webContents.send('math-format', e.statu);
    }
    mathFormat();
    return mathFormat;
}

const getTextEvent = (e) => {
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

let funcItems = {
    clip: {
        statu: true,
        event: null,
        click: () => {
            if (funcItems.clip.statu) {
                clearInterval(funcItems.clip.event)
                funcItems.clip.event = null;
                funcItems.clip.statu = !funcItems.clip.statu;
            }
            else {
                funcItems.clip.statu = !funcItems.clip.statu;
                funcItems.clip.event = getClipEvent(funcItems.clip);
            }
        }
    },
    math: {
        statu: true,
        event: null,
        click: () => {
            funcItems.math.statu = !funcItems.math.statu;
            funcItems.math.event();
        }
    },
    text: {
        statu: false,
        event: null,
        click: () => {
            funcItems.text.statu = !funcItems.text.statu
        }
    },
};

const ininFuncItems = () => {
    funcItems.clip.event = getClipEvent(funcItems.clip);
    funcItems.math.event = getMathEvent(funcItems.math);
    funcItems.text.event = getTextEvent(funcItems.text);
}


/* 全局变量 */

const store = new Store()

let global = {
    model: getConfig("default")["model"],
    version: getConfig("default")["version"],
    stream: getConfig("stream"),
    is_plugin: getIsPlugin(this.model),
    last_clipboard_content: null,
    concat: false,
    id: 0
}

/* 主页面 */

function getIsPlugin(model) {
    return Object.values(inner_model_name).includes(model);
}

function getModelsSubmenu() {
    return Object.keys(getConfig("models")).map((_model) => {
        return {
            type: 'radio',
            checked: global.model == _model,
            click: () => {
                global.model = _model;
                global.is_plugin = getIsPlugin(_model)
                global.version = getConfig("models")[_model]["versions"][0];
                updateVersionsSubmenu();
            },
            label: _model
        }
    })
}


function getVersionsSubmenu() {
    let versions;
    if (global.is_plugin) {
        versions = inner_model[inner_model_name.plugin]["versions"];
        windowManager.mainWindow.webContents.send("extre_load", inner_model_obj[global.model][versions[0]].extre)
    }
    else {
        versions = getConfig("models")[global.model]["versions"];
        windowManager.mainWindow.webContents.send("extre_load", getConfig("extre"))
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
                    windowManager.mainWindow.webContents.send("extre_load", inner_model_obj[global.model][_version].extre)
                }
            },
            label: _version
        }
    })
}

function setPrompt(prompt) {
    const config = getConfig();
    config.prompt = prompt;
    setConfig(config);
    windowManager.mainWindow.webContents.send('prompt', prompt);
}

function loadPrompt() {
    // 获取上次打开的目录
    const lastDirectory = store.get('lastPromptDirectory') || path.join(process.resourcesPath, 'resource/', 'system_prompts/');
    // 打开文件选择对话框
    dialog
        .showOpenDialog(windowManager.mainWindow, {
            properties: ['openFile'],
            defaultPath: lastDirectory
        })
        .then(result => {
            if (!result.canceled) {
                const filePath = result.filePaths[0]; // 获取用户选取的文件路径
                store.set('lastPromptDirectory', path.dirname(filePath)); // 记录当前选择的目录
                console.log(filePath); // 在控制台输出文件路径
                const prompt = fs.readFileSync(filePath, 'utf-8');
                setPrompt(prompt);
            }
        })
        .catch(err => {
            console.log(err);
        });
}

function setChain(chain) {
    let config = getConfig();
    config.chain_call = JSON.parse(chain).chain_call;
    config.extre = JSON.parse(chain).extre;
    windowManager.mainWindow.webContents.send("extre_load", config.extre);
    setConfig(config);
}

function loadChain() {
    const lastDirectory = store.get('lastChainDirectory') || path.join(process.resourcesPath, 'resource/', 'chain_calls/');
    dialog
        .showOpenDialog(windowManager.mainWindow, {
            properties: ['openFile'],
            defaultPath: lastDirectory
        })
        .then(result => {
            if (!result.canceled) {
                const filePath = result.filePaths[0];
                store.set('lastChainDirectory', path.dirname(filePath));
                console.log(filePath);
                const chain = fs.readFileSync(filePath, 'utf-8');
                setChain(chain);
            }
        })
        .catch(err => {
            console.log(err);
        });
}

function formatDate() {
    const date = new Date();
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0'); // 月份是从0开始的
    const day = date.getDate().toString().padStart(2, '0');
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');

    // 返回格式化的日期字符串，例如 "2023-11-08 15:46:42"
    return `${year}-${month}-${day}_${hours}:${minutes}:${seconds}`;
}

function getTemplate() {
    return [
        {
            label: "模型选择",
            submenu: getModelsSubmenu()
        },
        {
            label: "版本选择",
            submenu: getVersionsSubmenu()
        },
        {
            label: "功能选择",
            submenu: [
                {
                    click: funcItems.clip.click,
                    label: '复制翻译',
                    type: 'checkbox',
                    checked: funcItems.clip.statu,
                },
                {
                    click: funcItems.math.click,
                    label: '公式格式化',
                    type: 'checkbox',
                    checked: funcItems.math.statu,
                },
                {
                    click: funcItems.text.click,
                    label: '文本格式化',
                    type: 'checkbox',
                    checked: funcItems.text.statu,
                }
            ]
        },
        {
            label: "智能体",
            submenu: [
                {
                    label: '系统提示',
                    click: async () => {
                        loadPrompt();
                    }
                },
                {
                    label: '链式调用',
                    click: async () => {
                        loadChain();
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
                        createConfigWindow();
                    }
                },
                {
                    label: '控制台',
                    click: () => {
                        // if (windowManager.iconWindow) windowManager.iconWindow.webContents.openDevTools();
                        if (windowManager.configWindow) windowManager.configWindow.webContents.openDevTools();
                        if (windowManager.mainWindow) windowManager.mainWindow.webContents.openDevTools();
                    }
                },
                {
                    label: '重置对话',
                    click: () => {
                        clearMessages();
                        windowManager.mainWindow.webContents.send('clear')
                    }
                },
                {
                    label: '保存对话',
                    click: () => {
                        const lastPath = path.join(store.get('lastSavePath') || path.join(process.resourcesPath, 'resource/', 'messages/'), `messages_${formatDate()}.json`);
                        console.log(lastPath)
                        dialog.showSaveDialog(windowManager.mainWindow, {
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
                        dialog.showOpenDialog(windowManager.mainWindow, {
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
                                    global.id = parseInt(maxId.id);
                                    windowManager.mainWindow.webContents.send('load', messages)
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

function updateVersionsSubmenu() {
    const menu = Menu.buildFromTemplate(getTemplate());
    Menu.setApplicationMenu(menu);
}

function send_query(data, model, version, stream) {
    data = { ...data, model, version, stream, is_plugin: getIsPlugin(model), id: ++global.id }
    windowManager.mainWindow.webContents.send('query', data);
}

function createMainWindow() {
    windowManager.mainWindow = new BrowserWindow({
        width: 600,
        height: 600,
        icon: path.join(__dirname, 'icon/icon.ico'),
        webPreferences: {
            preload: path.join(__dirname, 'preload.js')
        }
    })

    windowManager.mainWindow.on('focus', () => {
        windowManager.mainWindow.setAlwaysOnTop(true)
        setTimeout(() => windowManager.mainWindow.setAlwaysOnTop(false), 0);
    })

    const menu = Menu.buildFromTemplate(getTemplate())
    Menu.setApplicationMenu(menu)

    windowManager.mainWindow.loadFile('./src/frontend/index.html')

    // 在窗口加载完成后发送消息到渲染进程
    windowManager.mainWindow.webContents.on('did-finish-load', () => {
        setPrompt(getConfig("prompt"));
        ininFuncItems();
        windowManager.mainWindow.webContents.send("extre_load", getConfig("extre"))
    });

    // 绑定窗口关闭事件
    windowManager.mainWindow.on('close', (event) => {
        windowManager.closeAllWindows();
    })

    windowManager.mainWindow.on('closed', () => {
        windowManager.mainWindow = null;
    })

    global.last_clipboard_content = clipboard.readText();
}

function isValidOutput(output) {
    return !!output; // 如果 output 是假值，返回 false；否则返回 true
}

function copy(data) {
    return JSON.parse(JSON.stringify(data));
}

async function retry(func, data) {
    if (data.hasOwnProperty("output_format")) {
        data.input = data.output_format;
    } else {
        data.input = data.query;
    }
    if (data.input_template) {
        data.input = data.input_template.format(data);
    }
    let retry_time = getConfig("retry_time");
    let count = 0;
    let error;
    while (count < retry_time) {
        try {
            let output = await func(data);
            if (isValidOutput(output)) {
                return output;
            }
            else {
                count++;
                continue;
            }
        } catch (_error) {
            error = _error
            count++;
        }
    }
    console.log(error);
    return null;
}

async function llmCall(data, params = null) {
    if (params) {
        data.model = params.model;
        data.version = params.version;
        data.prompt = params.prompt.format(data);
    }

    data.api_url = getConfig("models")[data.model].api_url;
    data.api_key = getConfig("models")[data.model].api_key;
    data.params = getConfig("models")[data.model].versions.find(version => {
        return typeof version !== "string" && version.version === data.version
    });
    data.memory_length = getConfig("memory_length");
    data.max_tokens = getConfig("max_tokens");
    data.output = await retry(chatBase, data);
    if (!data.output) {
        data.event.sender.send('info-data', { id: data.id, content: `### 重试失败！\n\n`, end: true });
    }
    data.outputs.push(copy(data.output));
    if (data.output_template) {
        data.output_format = data.output_template.format(data);
    } else {
        data.output_format = data.output;
    }
    data.output_formats.push(copy(data.output_format));
    return data.output_format;
}

async function pluginCall(data, params = null) {
    if (params) {
        data.model = params.model;
        data.version = params.version;
    }

    data.prompt = "";
    let func = inner_model_obj[data.model][data.version].func
    data.output = await retry(func, data);
    data.outputs.push(copy(data.output));
    if (data.output_template) {
        data.output_format = data.output_template.format(data);
    } else {
        data.output_format = data.output;
    }
    data.output_formats.push(copy(data.output_format));
    return data.output_format;
}

ipcMain.handle('get-file-path', async (_event) => {

    return new Promise((resolve,rejects) => {
        const lastDirectory = store.get('lastFileDirectory') || path.join(os.homedir(), '.chatx', 'config.json');
        dialog
            .showOpenDialog(windowManager.mainWindow, {
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
    windowManager.mainWindow.show();
    let primary_data = copy(data);
    data.query = funcItems.text.event(data.query);
    data.outputs = []
    data.output_formats = []
    data.event = _event;
    if (data.is_plugin) {
        let content = await pluginCall(data);
        _event.sender.send('stream-data', { id: data.id, content: content, end: true });
    }
    else {
        // 链式调用
        let chain_calls = getConfig("chain_call");
        for (const step in chain_calls) {
            if (getStopIds().includes(data.id)) {
                break;
            }
            data.step = step;
            let params = chain_calls[step];
            if (params.hasOwnProperty("output_template")) {
                data.output_template = params.output_template;
            } else {
                data.output_template = null;
            }
            if (params.hasOwnProperty("input_template")) {
                data.input_template = params.input_template;
            } else {
                data.input_template = null;
            }
            if (params.hasOwnProperty("params")) {
                data.params = params.params;
            }
            if (params.hasOwnProperty("end")) {
                data.end = params.end
            }
            if (getIsPlugin(params.model)) {
                if (data.end) {
                    if (!params.hasOwnProperty("model"))
                        data.model = primary_data.model;
                    if (!params.hasOwnProperty("version"))
                        data.version = primary_data.version;
                    await pluginCall(data);
                    _event.sender.send('stream-data', { id: data.id, content: data.output_format, end: true });
                    break;
                }
                else {
                    await pluginCall(data, params);
                }
            }
            else {
                if (data.end) {
                    if (!params.hasOwnProperty("model"))
                        data.model = primary_data.model;
                    if (!params.hasOwnProperty("version"))
                        data.version = primary_data.version;
                    if (!params.hasOwnProperty("prompt") && !!params.prompt)
                        data.prompt = primary_data.prompt.format(data);
                    await llmCall(data);
                    break;
                } else {
                    await llmCall(data, params);
                }
            }
            let content = getConfig("info_template").format(data);
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
    send_query(formData, global.model, global.version, global.stream)
})

ipcMain.on('open-external', (_event, href) => {
    console.log(href)
    shell.openExternal(href);
})

ipcMain.on('concat-clicked', () => {
    global.concat = true;
    windowManager.destroyIconWindow();
})

ipcMain.on('translation-clicked', () => {
    global.concat = false;
    send_query({ query: global.last_clipboard_content }, inner_model_name.plugin, getConfig("default")["plugin"], null);
    windowManager.destroyIconWindow();
})

ipcMain.on('submit-clicked', () => {
    global.concat = false;
    send_query({ query: global.last_clipboard_content }, global.model, global.version, global.stream);
    windowManager.destroyIconWindow();
})

ipcMain.on('clear-clicked', () => {
    global.concat = false;
    windowManager.destroyIconWindow();
    global.last_clipboard_content = "";
    clipboard.writeText(global.last_clipboard_content);
})

/* 配置页面 */

function createConfigWindow() {
    if (windowManager.configWindow) {
        windowManager.configWindow.restore(); // 恢复窗口
        windowManager.configWindow.show();
        windowManager.configWindow.focus();
    } else {
        windowManager.configWindow = new BrowserWindow({
            width: 400,
            height: 400,
            titleBarStyle: 'hidden',
            titleBarOverlay: {
                height: 20
            },
            icon: path.join(__dirname, 'icon/icon.ico'),
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false
            }
        })

        windowManager.configWindow.loadFile('./src/frontend/config.html')
        windowManager.configWindow.on('closed', () => {
            windowManager.configWindow = null;
        })
    }
}

function getConfig(key = null) {
    const configFilePath = path.join(os.homedir(), '.chatx', 'config.json');
    const data = fs.readFileSync(configFilePath, 'utf-8');
    let config = JSON.parse(data);
    if (key === null) {
        return config;
    }
    config["models"][inner_model_name.plugin] = inner_model[inner_model_name.plugin]
    return config[key]
}

function setConfig(config) {
    const configPath = path.join(os.homedir(), '.chatx', 'config.json');
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2)); // 美化输出
    return true;
}

// 读取配置
ipcMain.handle('get-config', () => {
    return getConfig();
});

// 保存配置
ipcMain.handle('set-config', (_, config) => {
    return setConfig(config);
});

/* 截图界面 */

function createOverlay() {
    windowManager.overlayWindow = new BrowserWindow({
        fullscreen: true,
        frame: false,
        transparent: true,
        skipTaskbar: true,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    })

    windowManager.overlayWindow.loadFile('./src/frontend/overlay.html')
    windowManager.overlayWindow.setAlwaysOnTop(true, 'screen-saver')

    windowManager.overlayWindow.on('closed', (event) => {
        windowManager.overlayWindow = null;
    })
}

ipcMain.handle('app:overlay:get-position', async (_) => {
    return windowManager.iconWindow.getBounds();
})

ipcMain.on('app:overlay:set-position', async (_, { x, y }) => {
    windowManager.iconWindow.setBounds({ x: x, y: y, width: windowManager.iconWindowWidth, height: windowManager.iconWindowHeight })
})

ipcMain.on('start-capture', () => {
    windowManager.destroyIconWindow();
    createOverlay()
})

ipcMain.handle('capture-region', async (_, { start, end, dpr }) => {
    try {
        const sources = await desktopCapturer.getSources({ types: ['screen'] });
        const source = sources.find(s => s.name === 'Entire Screen' || s.name === '整个屏幕');

        // 返回源数据给渲染进程
        return {
            source: source,
            captureRect: {
                x: Math.min(start.x, end.x) * dpr,
                y: Math.min(start.y, end.y) * dpr,
                width: Math.abs(end.x - start.x) * dpr,
                height: Math.abs(end.y - start.y) * dpr
            }
        }
    } catch (error) {
        throw new Error(`主进程捕获失败: ${error.message}`)
    }
})

ipcMain.on('query-img', (_, img_url) => {
    send_query({ img_url: img_url }, global.model, global.version, global.stream);
    if (windowManager.overlayWindow) windowManager.overlayWindow.close();
})

/* 快捷键 */

const initShortcut = () => {
    globalShortcut.register(getConfig("short_cut"), () => {
        captureMouse()
            .then((mousePosition) => {
                console.log(mousePosition);
                windowManager.createIconWindow(mousePosition);
            })
            .catch((error) => {
                console.error(error);
            });
    });
}


/* app生命周期 */

app.whenReady().then(() => {

    createMainWindow();
    initShortcut();

    app.on('activate', function () {
        if (BrowserWindow.getAllWindows().length === 0) createMainWindow()
    })

    app.on('will-quit', () => {
        globalShortcut.unregisterAll();
        windowManager.destroyIconWindow();
    });

    app.on('window-all-closed', function () {
        if (process.platform !== 'darwin') app.quit()
    })


})