const fs = require('fs');
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
    let dataBuffer = fs.readFileSync(file_path);
    switch (getFileExtension(file_path)) {
        case "docx" | "doc" | "pdf" | "odt" | "odp" | "ods" | "pptx" | "xlsx":
            return new Promise((resolve, rejects) => {
                officeParser.parseOfficeAsync(dataBuffer).then(function (data) {
                    resolve(data);
                }).catch(function (error) {
                    console.log(error);
                    rejects(error);
                });
            })
        default:
            return dataBuffer.toString();
    }

    
}

const extre = [{ type: 'file-reader' }];

module.exports = {
    main, extre
};