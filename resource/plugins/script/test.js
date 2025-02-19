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
    .then(function(textContent) {
        let lastY, text = '';
        for (let item of textContent.items) {
            if (lastY == item.transform[5] || !lastY){
                text += item.str;
            }  
            else{
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

// 读取PDF文件
let dataBuffer = fs.readFileSync('/home/tostring/桌面/document/改稿2/TRAPT修稿2/517153_2_merged_1738145634.pdf');

// 使用pdf-parse提取文本
pdf(dataBuffer,options).then(function(data) {
    
    // data.Text是提取出的文本内容
    console.log(data.text); 
});
