const fs = require('fs');
const path = require('path');

async function main({ file_path, context }) {
    try {
        const dir = path.dirname(file_path);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        await fs.writeFileSync(file_path, context);
        return `文件 ${file_path} 保存成功`;
    } catch (error) {
        return `文件 ${file_path} 保存失败: ${error.message}`;
    }
}

function getPrompt() {
    const prompt = `## write_to_file
描述: 保存文件到指定路径(仅支持文本文件)
参数:
- file_path: (需要)需要保存的文件路径(一定要使用/)
- context: (需要)需要保存的内容
使用:
{
    "thinking": "[思考过程]"
    "tool": "write_to_file",
    "params": {
        {
            "file_path": "[value]",
            "context": "[value]"
        }
    }
}`
    return prompt
}

module.exports = {
    main, getPrompt
};