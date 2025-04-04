const { Window } = require("./Window")
const { store, global, utils } = require('./globals')
const { clearMessages, saveMessages, loadMessages, stopMessage, getStopIds } = require('../server/llm_service');
const { State } = require("../server/agent.js")
const { ToolCall } = require('../server/tool_call');

const { BrowserWindow, Menu, shell, ipcMain, dialog } = require('electron');
const os = require('os');
const path = require('path');

class MainWindow extends Window {
    constructor(windowManager) {
        super(windowManager);
        this.tool_call = new ToolCall();
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
                prompt: null,
                query: data.query,
                img_url: data?.img_url,
                model: utils.copy(data.model),
                version: utils.copy(data.version),
                output_template: null,
                input_template: null,
                prompt_template: null,
                params: null,
                push_message: true,
                end: null,
                event: _event
            }
            data.outputs = []
            data.output_formats = []
            // ReAct
            let step = 0;
            this.tool_call.state = State.IDLE;
            while (this.tool_call.state != State.FINAL && this.tool_call.state != State.PAUSE) {
                if (getStopIds().includes(data.id)) {
                    this.tool_call.state = State.FINAL
                    break;
                }
                data = { ...data, ...defaults, step: ++step };

                let options = await this.tool_call.step(data);
                if (this.tool_call.state == State.PAUSE) {
                    this.window.webContents.send("options", { options, id: data.id });
                }
            }
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
        data = { ...data, model, version, id: ++global.id }
        this.window.webContents.send('query', data);
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
                    global.version = utils.getConfig("models")[_model]["versions"][0].version;
                    this.updateVersionsSubmenu();
                },
                label: _model
            }
        })
    }

    getVersionsSubmenu() {
        let versions = utils.getConfig("models")[global.model]["versions"];
        console.log(versions);
        return versions.map((version) => {
            const _version = version?.version||version;
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
                            this.tool_call.environment_details.memory_len = 0;
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
}

module.exports = {
    MainWindow
};