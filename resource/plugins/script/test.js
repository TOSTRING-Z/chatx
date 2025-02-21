const officeParser = require('officeparser');

// get file buffers
const fileBuffers = fs.readFileSync("/home/tostring/桌面/document/改稿3/Author_Checklist_NCOMMS-24-36631B_1740011481_65.docx");
officeParser.parseOfficeAsync(fileBuffers)
    .then(data => console.log(data))
    .catch(err => console.error(err))

const filePath = "/home/tostring/桌面/document/改稿3/Author_Checklist_NCOMMS-24-36631B_1740011481_65.docx"; // 替换为你的文件路径
readOfficeFile(filePath);
