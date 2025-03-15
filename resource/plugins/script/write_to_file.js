const fs = require('fs');
const path = require('path');

async function main({ file_path, input }) {
    try {
        const dir = path.dirname(file_path);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        await fs.writeFileSync(file_path, input);
        return `文件 ${file_path} 保存成功`;
    } catch (error) {
        return `文件 ${file_path} 保存失败: ${error.message}`;
    }
}

const extre = [{ type: 'file-reader' }];

module.exports = {
    main, extre
};