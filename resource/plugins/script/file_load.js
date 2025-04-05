const fs = require('fs');
const officeParser = require('officeparser');

/**
 * 获取文件扩展名
 * @param {string} filename - 文件名
 * @returns {string|null} 文件扩展名
 */
function getFileExtension(filename) {
    const parts = filename.split('.');
    if (parts.length > 1 && filename.indexOf('.') !== 0) {
        return parts.length > 1 ? parts.pop().toLowerCase() : null;
    } else {
        return null;
    }
}
function readLines(data, startLine, endLine, params) {
    const lines = data.split('\r\n');
    if (!startLine || !endLine) {
        data = data;
    } else {
        data = lines.slice(startLine - 1, endLine).join('\r\n');
    } 
    if (data.length > params.threshold) {
        return "返回内容过多,请尝试其它方案!";
    } else {
        return data;
    }
}

function main(params) {
    return async ({ file_path, startLine=null, endLine=null }) => {
        let dataBuffer = fs.readFileSync(file_path);
        switch (getFileExtension(file_path)) {
            case "docx": case "doc": case "pdf": case "odt": case "odp": case "ods": case "pptx": case "xlsx":
                return new Promise((resolve, reject) => {
                    officeParser.parseOfficeAsync(dataBuffer).then(function (data) {
                         resolve(readLines(data, startLine, endLine, params));
                    }).catch(function (error) {
                        console.log(error);
                        resolve(error.message);
                    });
                })
            default:
                const data = dataBuffer.toString();
                if (startLine && endLine) {
                    return readLines(data, startLine, endLine, params);
                }
                return data;
        }
    }
}

if (require.main === module) {
    const file_path = process.argv[2];
    main({ threshold: 10000 })({ file_path }).then(result => {
        console.log(result);
    });
}

function getPrompt() {
    const prompt = `## file_load
描述: 读取文件(仅支持docx,doc,pdf,odt,odp,ods和pptx)
参数:
- file_path: (需要)需要读取的文件路径
- startLine: (可选)开始读取的行号
- endLine: (可选)结束读取的行号
使用:
{
    "thinking": "[思考过程]"
    "tool": "file_load",
    "params": {
        {
            "file_path": "[value]",
            "startLine": [value],
            "endLine": [value]
        }
    }
}`
    return prompt
}

module.exports = {
    main, getPrompt
};