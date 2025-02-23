const fs = require('fs');
const os = require('os');
const path = require('path');

/* 复制配置文件到用户目录 */
const copyConfigFile = () => {
    // 配置文件源路径
    const sourcePath = path.join(process.resourcesPath, 'resource/', 'config.json');
    // 目标路径为用户目录下的 .chatx 目录
    const targetPath = path.join(os.homedir(), '.chatx', 'config.json');

    if (!fs.existsSync(path.dirname(targetPath))) {
        fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    }

    fs.copyFileSync(sourcePath, targetPath);
};

const isFirstInstall = () => {
    const targetPath = path.join(os.homedir(), '.chatx', 'config.json');
    return !fs.existsSync(targetPath);
};

function install() {

    if (isFirstInstall()) {
        copyConfigFile();
    }

}

module.exports = {
    install
};