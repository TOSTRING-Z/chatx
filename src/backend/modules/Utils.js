const fs = require('fs');
const os = require('os');
const path = require('path');
const { app } = require('electron');

class Utils {
    constructor(inner) {
        if (!Utils.instance) {
            this.inner = inner;
            Utils.instance = this;
        }
        return Utils.instance;
    }

    delay(seconds) {
        return new Promise(resolve => setTimeout(resolve, seconds * 1000));
    }

    getConfig(key = null) {
        const configFilePath = path.join(os.homedir(), '.chatx', 'config.json');
        const data = fs.readFileSync(configFilePath, 'utf-8');
        let config = JSON.parse(data);
        if (key === null) {
            return config;
        }
        if (key == "models") {
            const models = config["models"];
            for (const key in models) {
                if (Object.hasOwnProperty.call(models, key)) {
                    const versions = models[key].versions;
                    versions.forEach((version, i) => {
                        version = typeof version == "string" ? { version: version } : version;
                        config["models"][key].versions[i] = version;
                    });
                }
            }
        }
        config["models"][this.inner.model_name.plugins] = this.inner.model[this.inner.model_name.plugins]
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

    getLanguage() {
        // 方法1: 使用 app.getLocale()
        let locale = app.getLocale();
        
        // 方法2: 如果为空，尝试 process.env.LANG (Unix-like 系统)
        if (!locale && process.env.LANG) {
            locale = process.env.LANG.split('.')[0].replace('_', '-');
        }
        
        // 方法3: 如果仍然为空，使用 navigator.language (仅在渲染进程可用)
        if (!locale && typeof navigator !== 'undefined') {
            locale = navigator.language;
        }
        
        // 方法4: 最终回退到英语
        if (!locale) {
            locale = 'en-US';
        }
        
        // 标准化语言代码
        locale = locale.replace('_', '-');
        
        // 映射到友好名称
        const languageMap = {
            'zh': '中文',
            'zh-CN': '中文(简体)',
            'zh-TW': '中文(繁体)',
            'zh-HK': '中文(香港)',
            'en': '英文',
            'en-US': '英文(美国)',
            'en-GB': '英文(英国)',
            'ja': '日文',
            'ko': '韩文',
            'fr': '法文',
            'de': '德文',
            'es': '西班牙文',
            'ru': '俄文',
            'pt': '葡萄牙文',
            'it': '意大利文',
            // 可以添加更多语言映射
        };
        
        // 尝试匹配完整代码，如果不匹配则尝试基础语言代码
        return languageMap[locale] || 
               languageMap[locale.split('-')[0]] || 
               locale;
    }

    formatDate() {
        const date = new Date();
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0'); // 月份是从0开始的
        const day = date.getDate().toString().padStart(2, '0');
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        const seconds = date.getSeconds().toString().padStart(2, '0');
        return `${year}-${month}-${day}_${hours}-${minutes}-${seconds}`;
    }

    copy(data) {
        return JSON.parse(JSON.stringify(data));
    }
}

module.exports = {
    Utils
};