/* 全局变量 */

const Store = require('electron-store');
const { Utils } = require('./Utils');

const store = new Store();

// 插件配置参数
const inner = {
    model_name: {
        plugin: "plugin"
    },
    model: {
        "plugin": { "versions": [] }
    },
    model_obj: {
        "plugin": {}
    }
};

const utils = new Utils(inner);

const global = {
    model: utils.getConfig("default")["model"],
    version: utils.getConfig("default")["version"],
    stream: utils.getConfig("stream"),
    is_plugin: utils.getIsPlugin(this.model),
    last_clipboard_content: null,
    concat: false,
    id: 0
}


module.exports = {
    store, global, inner, utils
};