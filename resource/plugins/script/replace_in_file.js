const fs = require('fs');

function main({ file_path, input }) {
    try {
        const originalContent = fs.readFileSync(file_path, 'utf8');
        let content = originalContent;
        const blocks = input.split('<<<<<<< SEARCH');
        blocks.shift(); // Remove the first element as it is empty
        blocks.forEach(block => {
            const [search, replace] = block.split('=======');
            const searchContent = search.trim();
            const replaceContent = replace.split('>>>>>>> REPLACE')[0].trim();
            content = content.replace(searchContent, replaceContent);
        });
        if (content === originalContent) {
            return `文件 ${file_path} 未修改: SEARCH块中的内容,换行符或空格与文件中的实际内容可能不完全匹配`;
        }
        fs.writeFileSync(file_path, content);
        return `文件 ${file_path} 修改成功`;
    } catch (error) {
        return `文件 ${file_path} 修改失败: ${error.message}`;
    }
}

if (require.main === module) {
    const file_path = "C:\\Users\\Administrator\\Desktop\\Document\\chatx\\resource\\plugins\\script\\test_file.js";
    const input = `<<<<<<< SEARCH
    const matchExample = '\\/This\\/ is a match example';
=======
1
>>>>>>> REPLACE`;
    console.log(main({ file_path, input }));
}

const extre = [{ type: 'file-reader' }];

module.exports = {
    main, extre
};