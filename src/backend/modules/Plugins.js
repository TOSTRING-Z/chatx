const { utils, inner } = require("./globals");

class Plugins {
    constructor() {
        if (!Plugins.instance) {
            Plugins.instance = this;
        }
        return Plugins.instance;
    }
    // 配置插件接口
    loadPlugin(name) {
        const pluginPath = utils.getConfig("plugins")[name].path.format(process);
        const pluginParams = utils.getConfig("plugins")[name]?.params;
        try {
            console.log(`loading plugin: ${name}`);
            const plugin = require(pluginPath);
            if (pluginParams) {
                return { func: plugin.main(pluginParams), extre: plugin?.extre };
            }
            else {
                return { func: plugin.main, extre: plugin?.extre };
            }
        } catch (error) {
            return {
                func: () => `插件: ${name}, 路径: ${pluginPath}, 加载插件发生错误: ${error.message}`
            }
        }
    }
    init() {
        // 加载插件
        Object.keys(utils.getConfig("plugins")).forEach((_version) => {
            inner.model[inner.model_name.plugin]["versions"].push(_version);
            inner.model_obj[inner.model_name.plugin][_version] = this.loadPlugin(_version)
        })
    }
}

module.exports = {
    Plugins
}