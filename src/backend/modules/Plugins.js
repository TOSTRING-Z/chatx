const { utils, inner } = require("./globals");

class Plugins {
    constructor() {
        if (!Plugins.instance) {
            Plugins.instance = this;
        }
        return Plugins.instance;
    }
    // 配置插件接口
    loadPlugin(params) {
        const pluginPath = utils.getConfig("plugins")[params.version].path.format(process);
        const pluginParams = utils.getConfig("plugins")[params.version]?.params;
        try {
            console.log(`loading plugin: ${params.version}`);
            const plugin = require(pluginPath);
            if (pluginParams) {
                return { func: plugin.main(pluginParams), extre: params?.extre };
            }
            else {
                return { func: plugin.main, extre: params?.extre };
            }
        } catch (error) {
            return {
                func: () => `插件: ${params.version}, 路径: ${pluginPath}, 加载插件发生错误: ${error.message}`
            }
        }
    }
    init() {
        // 加载插件
        const plugins = utils.getConfig("plugins");
        Object.keys(plugins).forEach((version) => {
            const params = {version, ...plugins[version]}
            inner.model[inner.model_name.plugins].versions.push(params);
            inner.model_obj[inner.model_name.plugins][version] = this.loadPlugin(params)
        })
    }
}

module.exports = {
    Plugins
}