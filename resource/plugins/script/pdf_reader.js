const fs = require('fs');
const pdf = require('pdf-parse');

// default render callback
function render_page(pageData) {
    //check documents https://mozilla.github.io/pdf.js/
    let render_options = {
        //replaces all occurrences of whitespace with standard spaces (0x20). The default value is `false`.
        normalizeWhitespace: false,
        //do not attempt to combine same line TextItem's. The default value is `false`.
        disableCombineTextItems: false
    }

    return pageData.getTextContent(render_options)
        .then(function (textContent) {
            let lastY, text = '';
            for (let item of textContent.items) {
                if (lastY == item.transform[5] || !lastY) {
                    text += item.str;
                }
                else {
                    text += '\n' + item.str;
                }
                lastY = item.transform[5];
            }
            return text;
        });
}

let options = {
    pagerender: render_page
}

async function main({ file_path }) {
    // 读取PDF文件
    let dataBuffer = fs.readFileSync(file_path);

    // 使用pdf-parse提取文本
    return new Promise((resolve, rejects) => {
        pdf(dataBuffer, options).then(function (data) {
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