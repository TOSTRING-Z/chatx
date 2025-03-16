const fs = require('fs');
const officeParser = require('officeparser');

function getFileExtension(filename) {
    var parts = filename.split('.');
    if (parts.length > 1 && filename.indexOf('.') !== 0) {
        return parts.pop().toLowerCase();
    } else {
        return null;
    }
}

async function main({ file_path }) {
    let dataBuffer = fs.readFileSync(file_path);
    switch (getFileExtension(file_path)) {
        case "docx" || "doc" || "pdf" || "odt" || "odp" || "ods" || "pptx" || "xlsx":
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

if (require.main === module) {
    const file_path = process.argv[2];
    const result = main({ file_path });
    console.log(result);
}

const extre = [{ type: 'file-reader' }];

module.exports = {
    main, extre
};