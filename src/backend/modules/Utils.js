const fs = require('fs');
const os = require('os');
const path = require('path');

class Utils {
    constructor(inner) {
        if (!Utils.instance) {
            this.inner = inner;
            Utils.instance = this;
        }
        return Utils.instance;
    }

    getConfig(key = null) {
        const configFilePath = path.join(os.homedir(), '.chatx', 'config.json');
        const data = fs.readFileSync(configFilePath, 'utf-8');
        let config = JSON.parse(data);
        if (key === null) {
            return config;
        }
        config["models"][this.inner.model_name.plugin] = this.inner.model[this.inner.model_name.plugin]
        return config[key]
    }

    setConfig(config) {
        const configPath = path.join(os.homedir(), '.chatx', 'config.json');
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2)); // 美化输出
        return true;
    }

    getIsPlugin(model) {
        return Object.values(this.inner.model_name).includes(model);
    }

    formatDate() {
        const date = new Date();
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0'); // 月份是从0开始的
        const day = date.getDate().toString().padStart(2, '0');
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        const seconds = date.getSeconds().toString().padStart(2, '0');

        // 返回格式化的日期字符串，例如 "2023-11-08 15:46:42"
        return `${year}-${month}-${day}_${hours}:${minutes}:${seconds}`;
    }

    copy(data) {
        return JSON.parse(JSON.stringify(data));
    }
}

module.exports = {
    Utils
};