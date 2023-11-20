const { app, BrowserWindow, Menu, ipcMain, clipboard, dialog } = require('electron');
if (require('electron-squirrel-startup')) return app.quit();
const { chatgpt, clearMessages, saveMessages, loadMessages } = require('./chatgptService');
const { translation } = require('./translationService');
const { clearInterval } = require('node:timers');
const { exec } = require('child_process');
const os = require('os');
const path = require('path');


let loop
let method = 'chatgpt'
let gpt_version = 'gpt-3.5-turbo'
let mainWindow
let lastClipboardContent

function send_query(text) {
    switch (method) {
        case 'chatgpt':
            mainWindow.webContents.send('query', text)
            break
        case 'translation':
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

    const menu = Menu.buildFromTemplate([
        {
            label: "功能选择",
            submenu: [
                {
                    type: 'radio',
                    checked: true,
                    click: () => {
                        mainWindow.webContents.send('method', 'chatgpt')
                        method = 'chatgpt'
                        gpt_version = 'gpt-3.5-turbo'
                    },
                    label: 'gpt-3.5-turbo',
                },
                {
                    type: 'radio',
                    checked: false,
                    click: () => {
                        mainWindow.webContents.send('method', 'chatgpt')
                        method = 'chatgpt'
                        gpt_version = 'gpt-3.5-turbo-16k'
                    },
                    label: 'gpt-3.5-turbo-16k',
                },
                {
                    type: 'radio',
                    checked: false,
                    click: () => {
                        mainWindow.webContents.send('method', 'chatgpt')
                        method = 'chatgpt'
                        gpt_version = 'gpt-4'
                    },
                    label: 'gpt-4',
                },
                {
                    type: 'radio',
                    checked: false,
                    click: () => {
                        mainWindow.webContents.send('method', 'translation')
                        method = 'translation'
                    },
                    label: '百度翻译'
                },
            ]
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
                    checked: true,
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

    lastClipboardContent = clipboard.readText();

    changeLoop()
}

app.whenReady().then(() => {
    ipcMain.on('query-text', async (_event, text) => {
        console.log(text)
        let result
        switch (method) {
            case 'chatgpt':
                result = await chatgpt(text, gpt_version);
                break
            case 'translation':
                result = await translation(text);
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