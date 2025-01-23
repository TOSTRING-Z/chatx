const { app, BrowserWindow, Menu, shell, ipcMain, clipboard, dialog, globalShortcut, remote } = require('electron');
if (require('electron-squirrel-startup')) return app.quit();
const { chatBase, clearMessages, saveMessages, loadMessages } = require('./server/llm_service');
const { captureMouse } = require('./mouse/capture_mouse');
const { translation } = require('./server/trans_baidu');
const { clearInterval } = require('node:timers');
const { exec } = require('child_process');
const fs = require('fs');
const os = require('os');
const Store = require('electron-store');
const path = require('path');

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

/* 配置预留翻译接口 */
function loadTranslation(name) {
    console.log(`loading plugin: ${name}`);
    const plugin = require(getConfig("translations")[name].path);
    return plugin.translation;
}

/* 配置参数 */
const inner_model_name = {
    translation: "translation"
};

let inner_model = {
    "translation": { "versions": ["百度翻译"] }
};

let inner_model_obj = {
    "translation": {
        "百度翻译": { func: translation },
    }
};

// 加载插件
Object.keys(getConfig("translations")).forEach((name) => {
    inner_model["translation"]["versions"].push(name);
    inner_model_obj["translation"][name] = { func: loadTranslation(name) }
})

function getConfig(key) {
    const configFilePath = path.join(os.homedir(), '.chatx', 'config.json');
    const data = fs.readFileSync(configFilePath, 'utf-8');
    let config = JSON.parse(data);
    config["models"][inner_model_name.translation] = inner_model[inner_model_name.translation]
    return config[key]
}

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

let model = inner_model_name.translation;
let version = inner_model[inner_model_name.translation]["versions"][0];
let main_window;
let last_clipboard_content;
let concat = false;


function getClipEvent() {
    return setInterval(async () => {
        let clipboardContent = clipboard.readText();

        if (clipboardContent !== last_clipboard_content) {
            if (concat) {
                last_clipboard_content = `${last_clipboard_content} ${clipboardContent}`;
                clipboard.writeText(last_clipboard_content);
            } else {
                last_clipboard_content = clipboardContent;
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

function getModelsSubmenu() {
    return Object.keys(getConfig("models")).map((_model) => {
        return {
            type: 'radio',
            checked: model == _model,
            click: () => {
                model = _model;
                version = getConfig("models")[_model]["versions"][0];
                updateVersionsSubmenu();
                main_window.webContents.send("model", _model)
            },
            label: _model
        }
    })
}

function getVersionsSubmenu() {
    let versions;
    if (Object.values(inner_model_name).includes(model)) {
        versions = inner_model[inner_model_name.translation]["versions"];
    }
    else {
        versions = getConfig("models")[model]["versions"];
    }
    console.log(versions);
    return versions.map((_version) => {
        return {
            type: 'radio',
            checked: false,
            click: () => {
                version = _version
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
                            .showOpenDialog(main_window, {
                                properties: ['openFile'],
                                defaultPath: lastDirectory
                            })
                            .then(result => {
                                if (!result.canceled) {
                                    const filePath = result.filePaths[0]; // 获取用户选取的文件路径
                                    store.set('lastDirectory', path.dirname(filePath)); // 记录当前选择的目录
                                    console.log(filePath); // 在控制台输出文件路径
                                    const prompt = fs.readFileSync(filePath, 'utf-8');
                                    main_window.webContents.send('prompt', prompt)
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
                        main_window.webContents.openDevTools();
                    }
                },
                {
                    label: '重置对话',
                    click: () => {
                        clearMessages();
                        main_window.webContents.send('clear')
                    }
                },
                {
                    label: '保存对话',
                    click: () => {

                        dialog.showSaveDialog(main_window, {
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
                        dialog.showOpenDialog(main_window, {
                            filters: [
                                { name: 'JSON文件', extensions: ['json'] },
                                { name: '所有文件', extensions: ['*'] }
                            ]
                        }).then(result => {
                            if (!result.canceled) {
                                let messages = loadMessages(result.filePaths[0])
                                if (messages) {
                                    main_window.webContents.send('load', messages)
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

function send_query(text) {
    if (Object.values(inner_model_name).includes(model)) {
        main_window.webContents.send('trans-query', text);
    }
    else {
        main_window.webContents.send('query', text);
    }
}

function mathFormat() {
    function_select.math.statu = !function_select.math.statu;
    main_window.webContents.send('math-format', function_select.math.statu);
}

function textFormat(text) {
    text = text.replaceAll('-\n','');
    if (function_select.text.statu) {
        return text.replace(/[\s\n]+/g, ' ').trim();
    } else {
        return text;
    }
}

// 单例窗口管理器
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
            width: 180,
            height: 40,
            x,
            y,
            transparent: true,
            frame: false,
            alwaysOnTop: true,
            resizable: false,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false
            }
        })

        this.iconWindow.loadFile('./src/frontend/icon.html')

        this.iconWindow.setIgnoreMouseEvents(false) // 允许鼠标交互

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

ipcMain.on('concat-clicked', () => {
    concat = true;
    windowManager.destroyIconWindow();
})

ipcMain.on('translation-clicked', () => {
    concat = false;
    send_query(last_clipboard_content);
    windowManager.destroyIconWindow();
})

ipcMain.on('submit-clicked', () => {
    concat = false;
    send_query(last_clipboard_content);
    windowManager.destroyIconWindow();
})

ipcMain.on('clear-clicked', () => {
    concat = false;
    windowManager.destroyIconWindow();
    last_clipboard_content = "";
    clipboard.writeText(last_clipboard_content);
})

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

// 更新版本选择子菜单的函数
function updateVersionsSubmenu() {
    // 重新构建菜单
    const menu = Menu.buildFromTemplate(getTemplate());
    Menu.setApplicationMenu(menu); // 重新设置应用菜单
}

function createWindow() {
    main_window = new BrowserWindow({
        width: 400,
        height: 400,
        icon: path.join(__dirname, 'icon/icon.ico'),
        webPreferences: {
            preload: path.join(__dirname, 'preload.js')
        }
    })

    main_window.on('focus', () => {
        main_window.setAlwaysOnTop(true)
        setTimeout(() => main_window.setAlwaysOnTop(false), 0);
    })

    const menu = Menu.buildFromTemplate(getTemplate())
    Menu.setApplicationMenu(menu)

    main_window.loadFile('./src/frontend/index.html')

    // 在窗口加载完成后发送消息到渲染进程
    main_window.webContents.on('did-finish-load', () => {
        main_window.webContents.send('prompt', getConfig("prompt"))
    });

    last_clipboard_content = clipboard.readText();
}

app.whenReady().then(() => {
    ipcMain.on('query-text', async (_event, text) => {
        text.query = textFormat(text.query);
        console.log(text);
        let result;
        if (Object.values(inner_model_name).includes(model)) {
            const func = inner_model_obj[model][version].func
            result = await func(text.query);
        }
        else {
            let api_url = getConfig("models")[model].api_url;
            let api_key = getConfig("models")[model].api_key;
            let memory_length = getConfig("memory_length");
            result = await chatBase(text.query, text.prompt, version, api_url, api_key, memory_length);
        }

        main_window.webContents.send('response', result);
        console.log(result);
        main_window.focus();
    })
    ipcMain.on('submit', (_event, text) => {
        send_query(text)
    })
    ipcMain.on('open-external', (_event, href) => {
        console.log(href)
        shell.openExternal(href);
    })

    createWindow()

    app.on('activate', function () {
        if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })

    globalShortcut.register('CommandOrControl+Shift+M', () => {
        // 获取当前鼠标的位置
        captureMouse()
            .then((mousePosition) => {
                console.log(mousePosition);
            })
            .catch((error) => {
                console.error(error);
            });
    });
})

app.on('will-quit', () => {
    globalShortcut.unregisterAll();
});

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit()
})