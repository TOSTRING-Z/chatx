const { app, BrowserWindow, Menu, shell, ipcMain, clipboard, dialog, globalShortcut, desktopCapturer } = require('electron');
if (require('electron-squirrel-startup')) return app.quit();
const { chatBase, clearMessages, saveMessages, loadMessages, deleteMessage } = require('./server/llm_service');
const { captureMouse } = require('./mouse/capture_mouse');
const { clearInterval } = require('node:timers');
const { exec } = require('child_process');
const fs = require('fs');
const os = require('os');
const Store = require('electron-store');
const path = require('path');
const jsdom = require("jsdom");
const { JSDOM } = jsdom;

const store = new Store(); // 创建 Store 实例

/* 复制配置文件到用户目录 */
const copyConfigFile = () => {
    const sourcePath = path.join(__dirname, 'config.json'); // 配置文件源路径
    const targetPath = path.join(os.homedir(), '.chatx', 'config.json'); // 目标路径为用户目录下的 .chatx 目录

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

/* 配置插件接口 */
function loadTranslation(name) {
    console.log(`loading plugin: ${name}`);
    const plugin = require(getConfig("plugins")[name].path);
    return plugin.main;
}

/* 插件配置参数 */
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

function getConfig(key) {
    const configFilePath = path.join(os.homedir(), '.chatx', 'config.json');
    const data = fs.readFileSync(configFilePath, 'utf-8');
    let config = JSON.parse(data);
    config["models"][inner_model_name.plugin] = inner_model[inner_model_name.plugin]
    return config[key]
}

/* 全局变量 */
let function_select = {
    clip: {
        statu: true,
        event: getClipEvent()
    },
    math: {
        statu: false
    },
    text: {
        statu: false
    },
}

let global = {
    model: getConfig("default")["model"],
    version: getConfig("default")["version"],
    is_plugin: getIsPlugin(this.model),
    last_clipboard_content: null,
    concat: false,
    id: 0
}

let mainWindow = null;
let overlayWindow = null;

function getClipEvent() {
    return setInterval(async () => {
        let clipboardContent = clipboard.readText();

        if (clipboardContent !== global.last_clipboard_content) {
            if (global.concat) {
                global.last_clipboard_content = `${global.last_clipboard_content} ${clipboardContent}`;
                clipboard.writeText(global.last_clipboard_content);
            } else {
                global.last_clipboard_content = clipboardContent;
            }
            if (function_select.text.statu) {
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
                mainWindow.webContents.send("model", global)
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
                    click: () => {
                        changeLoop()
                    },
                    label: '复制翻译',
                    type: 'checkbox',
                    checked: function_select.clip.statu,
                },
                {
                    click: () => {
                        mathFormat()
                    },
                    label: '公式格式化',
                    type: 'checkbox',
                    checked: function_select.math.statu,
                },
                {
                    click: () => {
                        function_select.text.statu = !function_select.text.statu
                    },
                    label: '文本格式化',
                    type: 'checkbox',
                    checked: function_select.text.statu,
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
                            .showOpenDialog(mainWindow, {
                                properties: ['openFile'],
                                defaultPath: lastDirectory
                            })
                            .then(result => {
                                if (!result.canceled) {
                                    const filePath = result.filePaths[0]; // 获取用户选取的文件路径
                                    store.set('lastDirectory', path.dirname(filePath)); // 记录当前选择的目录
                                    console.log(filePath); // 在控制台输出文件路径
                                    const prompt = fs.readFileSync(filePath, 'utf-8');
                                    mainWindow.webContents.send('prompt', prompt)
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
                        const configFilePath = path.join(os.homedir(), '.chatx', 'config.json');
                        exec(`open ${configFilePath}`);
                    }
                },
                {
                    label: '控制台',
                    click: () => {
                        // if (windowManager.iconWindow) windowManager.iconWindow.webContents.openDevTools();
                        if (mainWindow) mainWindow.webContents.openDevTools();
                    }
                },
                {
                    label: '重置对话',
                    click: () => {
                        clearMessages();
                        mainWindow.webContents.send('clear')
                    }
                },
                {
                    label: '保存对话',
                    click: () => {

                        dialog.showSaveDialog(mainWindow, {
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
                        dialog.showOpenDialog(mainWindow, {
                            filters: [
                                { name: 'JSON文件', extensions: ['json'] },
                                { name: '所有文件', extensions: ['*'] }
                            ]
                        }).then(result => {
                            if (!result.canceled) {
                                let messages = loadMessages(result.filePaths[0])
                                if (messages) {
                                    mainWindow.webContents.send('load', messages)
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

function getId() {
    global.id += 1;
    return JSON.stringify(global.id);
}

function send_query(text, model, version, img_url) {
    const data = {
        text: text, model: model, version: version, is_plugin: getIsPlugin(model), img_url: img_url, id: getId()
    }
    mainWindow.webContents.send('query', data);
}

function mathFormat() {
    function_select.math.statu = !function_select.math.statu;
    mainWindow.webContents.send('math-format', function_select.math.statu);
}

function textFormat(text) {
    text = text.replaceAll('-\n', '');
    if (function_select.text.statu) {
        return text.replace(/[\s\n]+/g, ' ').trim();
    } else {
        return text;
    }
}

function changeLoop() {
    if (function_select.clip.statu) {
        clearInterval(function_select.clip.event)
        function_select.clip.event = null;
        function_select.clip.statu = !function_select.clip.statu;
    }
    else {
        function_select.clip.statu = !function_select.clip.statu;
        function_select.clip.event = getClipEvent();
    }
}

const iconWindowWidth = 200;
const iconWindowHeight = 80;

/* 单例窗口管理器 */
let windowManager = {
    iconWindow: null,
    autoCloseTimer: null,

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
        width: iconWindowWidth,
        height: iconWindowHeight,
            x,
            y,
            transparent: true,
            frame: false,
            skipTaskbar: true,
            alwaysOnTop: true,
            resizable: false,
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
    }
}

/* 截图 */
function createOverlay() {
    overlayWindow = new BrowserWindow({
        fullscreen: true,
        frame: false,
        transparent: true,
        skipTaskbar: true,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    })

    overlayWindow.loadFile('./src/frontend/overlay.html')
    overlayWindow.setAlwaysOnTop(true, 'screen-saver')

    overlayWindow.on('closed', (event) => {
        overlayWindow = null;
    })
}

ipcMain.handle('app:overlay:get-position', async (_) => {
    return windowManager.iconWindow.getBounds();
})
ipcMain.on('app:overlay:set-position', async (_, { x, y }) => {
    windowManager.iconWindow.setBounds({ x: x, y: y, width: iconWindowWidth, height: iconWindowHeight })
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
    if (overlayWindow) overlayWindow.close();
})


/* 更新版本选择子菜单的函数 */
function updateVersionsSubmenu() {
    const menu = Menu.buildFromTemplate(getTemplate());
    Menu.setApplicationMenu(menu);
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 400,
        height: 400,
        icon: path.join(__dirname, 'icon/icon.ico'),
        webPreferences: {
            preload: path.join(__dirname, 'preload.js')
        }
    })

    mainWindow.on('focus', () => {
        mainWindow.setAlwaysOnTop(true)
        setTimeout(() => mainWindow.setAlwaysOnTop(false), 0);
    })

    const menu = Menu.buildFromTemplate(getTemplate())
    Menu.setApplicationMenu(menu)

    mainWindow.loadFile('./src/frontend/index.html')

    // 在窗口加载完成后发送消息到渲染进程
    mainWindow.webContents.on('did-finish-load', () => {
        mainWindow.webContents.send('prompt', getConfig("prompt"))
    });

    global.last_clipboard_content = clipboard.readText();

    // 绑定窗口关闭事件
    mainWindow.on('close', (event) => {
        console.log('窗口即将关闭');
        if (overlayWindow)
            overlayWindow.close();
        windowManager.destroyIconWindow();

    })

    mainWindow.on('closed', () => {
        console.log('窗口已关闭')
        mainWindow = null // 释放窗口对象
    })
}

app.whenReady().then(() => {
    ipcMain.handle('query-text', async (_event, data) => {
        data.query = textFormat(data.query);
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
        mainWindow.focus();
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

    createWindow()

    app.on('activate', function () {
        if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })

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
})

app.on('will-quit', () => {
    globalShortcut.unregisterAll();
    windowManager.destroyIconWindow();
});

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit()
})