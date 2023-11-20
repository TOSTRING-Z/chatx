const axios = require('axios');
const { Marked } = require('marked');
const { markedHighlight } = require('marked-highlight');
const hljs = require('highlight.js');
const fs = require('fs');
const os = require('os');
const path = require('path');

// 复制配置文件到用户目录
const copyConfigFile = () => {
    const sourcePath = path.join(__dirname, 'config.json'); // 配置文件源路径
    const targetPath = path.join(os.homedir(), '.translation', 'config.json'); // 目标路径为用户目录下的 .translation 目录

    // 如果目标目录不存在，则创建目标目录
    if (!fs.existsSync(path.dirname(targetPath))) {
        fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    }

    // 复制源文件到目标目录
    fs.copyFileSync(sourcePath, targetPath);
};

// 判断是否为应用程序的第一次安装
const isFirstInstall = () => {
    const targetPath = path.join(os.homedir(), '.translation', 'config.json');
    return !fs.existsSync(targetPath);
};

// 如果是首次安装，则复制配置文件
if (isFirstInstall()) {
    copyConfigFile();
}

const marked = new Marked(
    markedHighlight({
        langPrefix: 'hljs language-',
        highlight(code, lang) {
            const language = hljs.getLanguage(lang) ? lang : 'plaintext';
            return hljs.highlight(code, { language }).value;
        }
    })
);

const configFilePath = path.join(os.homedir(), '.translation', 'config.json');
const data = fs.readFileSync(configFilePath, 'utf-8');
const config = JSON.parse(data);

console.log(config)

const OPENAI_API_URL = config.OPENAI_API_URL;
const OPENAI_API_KEY = config.OPENAI_API_KEY;
const MEMORY_LENGTH = config.MEMORY_LENGTH;

let messages = [];

function clearMessages() {
    messages = [];
}

function saveMessages(filePath) {
    fs.writeFile(filePath, JSON.stringify(messages), err => {
        if(err){
            console.log('写入失败');
            return;
        }
        console.log(filePath);
    });
}

function loadMessages(filePath) {
    try {
        const data = fs.readFileSync(filePath, 'utf-8');
        messages = JSON.parse(data);
        console.log('加载成功');
        return messages;
    } catch (error) {
        console.log(error);
        return false;
    }
}

async function chatgpt(queryText, gpt_version) {
    try {
        messages.push({ 'role': 'user', 'content': queryText });
        const response = await axios.post(OPENAI_API_URL, {
            'model': gpt_version,
            'messages': messages.slice(messages.length-MEMORY_LENGTH,messages.length),
        }, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
            },
        });
        res_message = response.data.choices[0].message;
        messages.push(res_message);
        return marked.parse(res_message.content.trim());
    } catch (error) {
        console.log(error)
        return error.response.data.msg
    }
}

module.exports = {
    chatgpt,clearMessages,saveMessages,loadMessages,
};
