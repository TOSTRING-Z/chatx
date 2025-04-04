/* 全局变量 */

const Store = require('electron-store');
const { Utils } = require('./Utils');

const store = new Store();

const utils = new Utils();

const global = {
    model: utils.getConfig("default")["model"],
    version: utils.getConfig("default")["version"],
    id: 0
}


module.exports = {
    store, global, utils
};