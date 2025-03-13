const fs = require('fs');
const path = require('path');

async function main({ input, content }) {
    try {
        const dir = path.dirname(input);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        await fs.writeFileSync(input, content);
        return `文件 ${input} 保存成功`;
    } catch (error) {
        return `文件 ${input} 保存失败: ${error.message}`;
    }
}

module.exports = {
    main,
};