const { app } = require('electron');

const { WindowManager } = require("./modules/WindowManager");
const { install } = require('./modules/Install');

install();

const windowManager = new WindowManager();

/* app生命周期 */

app.on('ready', () => {
    windowManager.mainWindow.create();
    windowManager.mainWindow.setup();
    windowManager.configsWindow.setup();
})