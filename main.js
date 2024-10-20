const { app, BrowserWindow, Menu, ipcMain, clipboard, dialog } = require('electron');
if (require('electron-squirrel-startup')) return app.quit();
const { chatBase, clearMessages, saveMessages, loadMessages } = require('./chatService');
const { translation } = require('./translationService');
const { translation_new } = require('./baidu_new');
const { clearInterval } = require('node:timers');
const { exec } = require('child_process');
const fs = require('fs');
const os = require('os');
const Store = require('electron-store');
const path = require('path');

const store = new Store(); // 创建 Store 实例

// 复制配置文件到用户目录
const copyConfigFile = () => {
    const sourcePath = path.join(__dirname, 'config.json'); // 配置文件源路径
    const targetPath = path.join(os.homedir(), '.translation', 'config.json'); // 目标路径为用户目录下的 .translation 目录

    // 如果目标目录不存在，则创建目标目录
    if (!fs.existsSync(path.dirname(targetPath))) {
        fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    }

    // 复制源文件到目标目录
    fs.copyFileSync(sourcePath, targetPath);
};

// 判断是否为应用程序的第一次安装
const isFirstInstall = () => {
    const targetPath = path.join(os.homedir(), '.translation', 'config.json');
    return !fs.existsSync(targetPath);
};

// 如果是首次安装，则复制配置文件
if (isFirstInstall()) {
    copyConfigFile();
}

const configFilePath = path.join(os.homedir(), '.translation', 'config.json');
const data = fs.readFileSync(configFilePath, 'utf-8');
const config = JSON.parse(data);

// console.log(config)

let loop
let method = 'translation_new'
let mainWindow
let lastClipboardContent

function send_query(text) {
    switch (method) {
        case 'chatgpt':
            mainWindow.webContents.send('query', text)
            break
        case 'chatglm':
            mainWindow.webContents.send('query', text)
            break
        case 'translation':
            mainWindow.webContents.send('trans-query', text)
            break
        case 'translation_new':
            mainWindow.webContents.send('trans-query', text)
            break
    }
}

function changeLoop() {
    if (loop) {
        clearInterval(loop)
        loop = null
    }
    else {
        loop = setInterval(async () => {
            let clipboardContent = clipboard.readText();

            if (clipboardContent !== lastClipboardContent) {
                lastClipboardContent = clipboardContent;
                send_query(lastClipboardContent)
            }
        }, 1000);
    }
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 400,
        height: 400,
        icon: path.join(__dirname, 'icon.ico'),
        webPreferences: {
            preload: path.join(__dirname, 'preload.js')
        }
    })

    mainWindow.on('focus', () => {
        mainWindow.setAlwaysOnTop(true)
        setTimeout(() => mainWindow.setAlwaysOnTop(false), 0);
    })

    const translation = [
        {
            method: 'translation_new',
            label: '百度翻译[new]',
            checked: true
        },
        {
            method: 'translation',
            label: '百度翻译',
            checked: false
        },
    ]

    const translation_template = translation.map((params) => {
        return {
            type: 'radio',
            checked: params.checked,
            click: () => {
                mainWindow.webContents.send('method', 'translation')
                method = params.method
            },
            label: params.label
        }
    })

    const chatgpt_template = config.CHATGPT_METHODS.map((label) => {
        return {
            type: 'radio',
            checked: false,
            click: () => {
                mainWindow.webContents.send('method', 'chat')
                method = 'chatgpt'
                version = label
            },
            label: label
        }
    })

    const chatglm_template = config.CHATGLM_METHODS.map((label) => {
        return {
            type: 'radio',
            checked: false,
            click: () => {
                mainWindow.webContents.send('method', 'chat')
                method = 'chatglm'
                version = label
            },
            label: label
        }
    })

    const template = [...translation_template, ...chatgpt_template, ...chatglm_template];

    const menu = Menu.buildFromTemplate([
        {
            label: "功能选择",
            submenu: template
        },
        {
            label: "复制翻译",
            submenu: [
                {
                    click: () => {
                        changeLoop()
                    },
                    label: '循环',
                    type: 'checkbox',
                    checked: false,
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
                        const lastDirectory = store.get('lastDirectory') || path.join(os.homedir(), '.translation');
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
                        const configFilePath = path.join(os.homedir(), '.translation', 'config.json');
                        exec(`open ${configFilePath}`);
                    }
                },
                {
                    label: '控制台',
                    click: () => {
                        mainWindow.webContents.openDevTools();
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

    ])

    Menu.setApplicationMenu(menu)
    mainWindow.loadFile('index.html')

    // 在窗口加载完成后发送消息到渲染进程
    mainWindow.webContents.on('did-finish-load', () => {
        mainWindow.webContents.send('prompt', config.PROMPT)
    });

    lastClipboardContent = clipboard.readText();
}

app.whenReady().then(() => {
    ipcMain.on('query-text', async (_event, text) => {
        console.log(text)
        let result
        switch (method) {
            case 'chatgpt':
                result = await chatBase(text.query, text.prompt, version, method);
                break
            case 'chatglm':
                result = await chatBase(text.query, text.prompt, version, method);
                break
            case 'translation':
                result = await translation(text.query);
                break
            case 'translation_new':
                result = await translation_new(text.query);
                break
        }
        mainWindow.webContents.send('response', result);
        mainWindow.focus();
    })
    ipcMain.on('submit', (_event, text) => {
        send_query(text)
    })

    createWindow()

    app.on('activate', function () {
        if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
})

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit()
})