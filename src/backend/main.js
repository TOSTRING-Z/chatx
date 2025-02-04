const { app, BrowserWindow, Menu, shell, ipcMain, clipboard, dialog, globalShortcut, desktopCapturer } = require('electron');
if (require('electron-squirrel-startup')) return app.quit();
const { chatBase, clearMessages, saveMessages, loadMessages, deleteMessage } = require('./server/llm_service');
const { captureMouse } = require('./mouse/capture_mouse');
const { clearInterval } = require('node:timers');
const fs = require('fs');
const os = require('os');
const Store = require('electron-store');
const path = require('path');
const jsdom = require("jsdom");
const { JSDOM } = jsdom;

/* 复制配置文件到用户目录 */
const copyConfigFile = () => {
    // 配置文件源路径
    const sourcePath = path.join(__dirname, 'config.json');
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
function loadTranslation(name) {
    try {
        console.log(`loading plugin: ${name}`);
        const plugin = require(getConfig("plugins")[name].path);
        return plugin.main;
    } catch (error) {
        return () => `插件: ${name}, 路径: ${getConfig("plugins")[name].path}, 加载插件发生错误, 请检查路径和依赖！`
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
Object.keys(getConfig("plugins")).forEach((name) => {
    inner_model[inner_model_name.plugin]["versions"].push(name);
    inner_model_obj[inner_model_name.plugin][name] = { func: loadTranslation(name) }
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
    model: () => getConfig("default")["model"],
    version: () => getConfig("default")["version"],
    is_plugin: () => getIsPlugin(this.model),
    last_clipboard_content: () => clipboard.readText(),
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
                windowManager.mainWindow.webContents.send("model", global)
            },
            label: _model
        }
    })
}

function getVersionsSubmenu() {
    let versions;
    if (global.is_plugin) {
        versions = inner_model[inner_model_name.plugin]["versions"];
    }
    else {
        versions = getConfig("models")[global.model]["versions"];
    }
    console.log(versions);
    return versions.map((_version) => {
        return {
            type: 'radio',
            checked: global.version == _version,
            click: () => {
                global.version = _version
            },
            label: _version
        }
    })
}

function setPrompt(prompt) {
    windowManager.mainWindow.webContents.send('prompt', prompt);
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
                    label: '加载',
                    click: async () => {
                        // 获取上次打开的目录
                        const lastDirectory = store.get('lastDirectory') || path.join(os.homedir(), '.chatx');
                        // 打开文件选择对话框
                        dialog
                            .showOpenDialog(windowManager.mainWindow, {
                                properties: ['openFile'],
                                defaultPath: lastDirectory
                            })
                            .then(result => {
                                if (!result.canceled) {
                                    const filePath = result.filePaths[0]; // 获取用户选取的文件路径
                                    store.set('lastDirectory', path.dirname(filePath)); // 记录当前选择的目录
                                    console.log(filePath); // 在控制台输出文件路径
                                    const prompt = fs.readFileSync(filePath, 'utf-8');
                                    setPrompt(prompt);
                                }
                            })
                            .catch(err => {
                                console.log(err);
                            });
                    }
                }
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
                        dialog.showSaveDialog(windowManager.mainWindow, {
                            defaultPath: 'messages.json',
                            filters: [
                                { name: 'JSON文件', extensions: ['json'] },
                                { name: '所有文件', extensions: ['*'] }
                            ]
                        }).then(result => {
                            if (!result.canceled) {
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
                        dialog.showOpenDialog(windowManager.mainWindow, {
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

function getId() {
    global.id += 1;
    return JSON.stringify(global.id);
}

function send_query(text, model, version, img_url) {
    const data = {
        text: text, model: model, version: version, is_plugin: getIsPlugin(model), img_url: img_url, id: getId()
    }
    windowManager.mainWindow.webContents.send('query', data);
}

function createMainWindow() {
    windowManager.mainWindow = new BrowserWindow({
        width: 400,
        height: 400,
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
    });

    // 绑定窗口关闭事件
    windowManager.mainWindow.on('close', (event) => {
        windowManager.closeAllWindows();
    })

    windowManager.mainWindow.on('closed', () => {
        windowManager.mainWindow = null;
    })
}

ipcMain.handle('query-text', async (_event, data) => {
    data.query = funcItems.text.event(data.query);
    console.log(data);
    let result;
    if (data.is_plugin) {
        const func = inner_model_obj[data.model][data.version].func
        result = await func(data.query);
    }
    else {
        let api_url = getConfig("models")[data.model].api_url;
        let api_key = getConfig("models")[data.model].api_key;
        let memory_length = getConfig("memory_length");
        result = await chatBase(data.query, data.prompt, data.version, api_url, api_key, memory_length, data.img_url, data.id);
    }

    console.log(result);
    windowManager.mainWindow.show();
    return result;
})

ipcMain.handle("delete-message", async (_event, data) => {
    let statu = await deleteMessage(data.id);
    console.log(`delect id: ${data.id}, statu: ${statu}`)
    return statu;
})

ipcMain.on('submit', (_event, text) => {
    send_query(text, global.model, global.version, null)
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
    send_query(global.last_clipboard_content, inner_model_name.plugin, getConfig("default")["plugin"], null);
    windowManager.destroyIconWindow();
})

ipcMain.on('submit-clicked', () => {
    global.concat = false;
    send_query(global.last_clipboard_content, global.model, global.version, null);
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
    send_query(null, global.model, global.version, img_url);
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