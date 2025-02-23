const { Window } = require("./Window");
const { utils } = require('./globals');

const { BrowserWindow } = require('electron');

class IconWindow extends Window {
    constructor(windowManager) {
        super(windowManager);
        this.iconWindowWidth = 200;
        this.iconWindowHeight = 40;
    }

    create(position) {

        let x = position.x
        let y = position.y > 50 ? position.y - 50 : position.y

        if (this.window) {
            this.window.setPosition(x, y);
            if (this.autoCloseTimer) {
                clearTimeout(this.autoCloseTimer);
                this.autoCloseTimer = setTimeout(() => {
                    this.destroy()
                }, utils.getConfig("icon_time") * 1000) // 自动关闭
            }
            return this.window
        }

        this.window = new BrowserWindow({
            width: this.iconWindowWidth,
            height: this.iconWindowHeight,
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

        this.window.loadFile('src/frontend/icon.html')

        this.window.setIgnoreMouseEvents(false) // 允许鼠标交互

        this.window.on('closed', (event) => {
            this.window = null;
        })

        // 新增自动关闭逻辑
        this.autoCloseTimer = setTimeout(() => {
            this.destroy()
        }, utils.getConfig("icon_time") * 1000) // 自动关闭

        return this.window
    }

    destroy() {
        if (this.window) {
            this.window.close();
            this.window = null;
        }
        if (this.autoCloseTimer) {
            clearTimeout(this.autoCloseTimer);
            this.autoCloseTimer = null;
        }
    }

    setup() {
        
    }

}

module.exports = {
    IconWindow
};