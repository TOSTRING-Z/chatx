const fs = require('fs');

function main({ file_path, diff }) {
    try {
        const originalContent = fs.readFileSync(file_path, 'utf8');
        let content = originalContent;
        const blocks = diff.split('<<<<<<< SEARCH');
        blocks.shift(); // Remove the first element as it is empty
        blocks.forEach(block => {
            const [search, replace] = block.split('=======');
            const searchContent = search;
            const replaceContent = replace.split('>>>>>>> REPLACE')[0];
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


function getPrompt() {
    const prompt = `## replace_in_file
描述: 此工具用于在现有文件中使用 SEARCH/REPLACE 块来替换部分内容.当需要对文件的特定部分进行精确修改时,应使用此工具
参数:
- file_path: (需要)需要修改的文件路径
- diff: (需要)一个或多个 SEARCH/REPLACE 块,格式如下:
    <<<<<<< SEARCH
    [要查找的确切内容]
    =======
    [替换后的新内容]
    >>>>>>> REPLACE
    关键规则:
        1. SEARCH 内容必须与文件中的目标部分完全匹配:
            * 匹配时需逐字符对比,包括空格,缩进和行尾符
            * 包含所有注释,文档字符串等内容.
        2. SEARCH/REPLACE 块仅替换第一个匹配项:
            * 如果需要进行多次修改,请包含多个独立的 SEARCH/REPLACE 块
            * 每个 SEARCH 部分只需包含足够的行数以确保唯一性
            * 列出的 SEARCH/REPLACE 块顺序应与文件中出现的顺序一致
        3. 保持 SEARCH/REPLACE 块简洁:
            * 将较大的块拆分为多个较小的块,每个块只修改文件的一小部分
            * 仅包含需要更改的行,以及为唯一性所需的上下文行
            * 不要在 SEARCH/REPLACE 块中包含大量未更改的行
            * 每一行必须完整,不能中途截断,否则可能导致匹配失败
        4. 特殊操作:
            * 移动代码: 使用两个 SEARCH/REPLACE 块(一个从原位置删除,另一个在新位置插入)
            * 删除代码: 使用空的 REPLACE 部分
使用:
{
    "thinking": "[思考过程]"
    "tool": "replace_in_file",
    "params": {
        {
            "file_path": "[value]",
            "diff": "[value]"
        }
    }
}`
    return prompt
}

module.exports = {
    main, getPrompt
};