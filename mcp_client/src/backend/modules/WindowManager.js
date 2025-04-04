const { MainWindow } = require("./MainWindow");
const { ConfigsWindow } = require("./ConfigsWindow");

class WindowManager {
    constructor() {
        if (!WindowManager.instance) {
            this.mainWindow = new MainWindow(this);
            this.configsWindow = new ConfigsWindow(this);
            WindowManager.instance = this;
        }
        return WindowManager.instance;
    }

    closeAllWindows() {
        this.configsWindow.destroy();
    }
}

module.exports = {
    WindowManager
};