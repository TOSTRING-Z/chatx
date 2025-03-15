const fs = require('fs');

function main({ file_path, input }) {
    try {
        let content = fs.readFileSync(file_path, 'utf8');
        const blocks = input.split('<<<<<<< SEARCH');
        blocks.shift(); // Remove the first element as it is empty
        blocks.forEach(block => {
            const [search, replace] = block.split('=======');
            const searchContent = search.trim();
            const replaceContent = replace.split('>>>>>>> REPLACE')[0].trim();
            content = content.replace(searchContent, replaceContent);
        });
        fs.writeFileSync(file_path, content);
        return `文件 ${file_path} 修改成功`;
    } catch (error) {
        return `文件 ${file_path} 修改失败: ${error.message}`;
    }
}

const extre = [{ type: 'file-reader' }];

module.exports = {
    main, extre
};