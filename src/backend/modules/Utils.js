const fs = require('fs');
const os = require('os');
const path = require('path');
const JSON5 = require('json5');
const { app } = require('electron');

class Utils {
    constructor(inner) {
        if (!Utils.instance) {
            this.inner = inner;
            Utils.instance = this;
        }
        return Utils.instance;
    }

    fixJsonString(jsonString) {
        // 修复常见的 JSON 格式问题
        let fixed = jsonString;

        // 1. 修复未转义的特殊字符
        fixed = fixed.replace(/([^\\])\\([^\\\/bfnrtu"])/g, '$1\\\\$2');

        // 3. 修复单引号问题（将单引号转为双引号）
        fixed = fixed.replace(/'/g, '"');

        // 4. 修复未闭合的字符串
        fixed = fixed.replace(/"([^"]*)$/, '"$1"');

        // 5. 修复未闭合的对象或数组
        if ((fixed.match(/{/g) || []).length > (fixed.match(/}/g) || []).length) {
            fixed += '}';
        }

        if ((fixed.match(/\[/g) || []).length > (fixed.match(/\]/g) || []).length) {
            fixed += ']';
        }

        return fixed;
    }

    extractJson(text) {
        let startIndex = text.search(/[{[]/);
        if (startIndex === -1) return null;

        const stack = [];
        let isInsideString = false;

        for (let i = startIndex; i < text.length; i++) {
            const currentChar = text[i]; // 合并 currentChar 声明

            // 处理字符串内的转义字符（如 \"）
            if (currentChar === '"' && text[i - 1] !== '\\') {
                isInsideString = !isInsideString;
            }

            if (isInsideString) continue;

            // 跟踪括号层级
            if (currentChar === '{' || currentChar === '[') {
                stack.push(currentChar);
            } else if (
                (currentChar === '}' && stack[stack.length - 1] === '{') ||
                (currentChar === ']' && stack[stack.length - 1] === '[')
            ) {
                stack.pop();
            }

            // 当所有括号闭合时尝试解析
            if (stack.length === 0) {
                const candidate = text.substring(startIndex, i + 1);
                try {
                    return candidate;
                } catch (e) {
                    // 继续扫描后续内容
                    startIndex = text.indexOf('{', i + 1);
                    if (startIndex === -1) return null;
                    i = startIndex - 1;
                    stack.length = 0;
                }
            }
        }
        return null;
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