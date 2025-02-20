const fs = require('fs');
const pdf = require('pdf-parse');
const officeParser = require('officeparser');

function getFileExtension(filename) {
    // 使用split方法以点（.）分割文件名
    var parts = filename.split('.');
    
    // 检查分割后的数组长度是否大于1，以及文件名是否不包含点
    if (parts.length > 1 && filename.indexOf('.') !== 0) {
      // 使用pop方法获取数组的最后一个元素，即文件后缀
      return parts.pop().toLowerCase();
    } else {
      // 如果没有后缀，返回null
      return null;
    }
  }

async function main({ file_path }) {
    // 读取PDF文件
    let dataBuffer = fs.readFileSync(file_path);
    let obj;
    switch (getFileExtension) {
        case "docx" || "doc":
            obj = officeParser.parseOfficeAsync(dataBuffer)
            break;
        case "pdf":
            obj = pdf(dataBuffer)
            break;
        default:
            return dataBuffer.toString();
    }

    return new Promise((resolve, rejects) => {
        obj.then(function (data) {
            resolve(data.text);
        }).catch(function (error) {
            console.log(error);
            rejects(error);
        });
    })
}

const extre = [{ type: 'file-reader' }];

module.exports = {
    main, extre
};