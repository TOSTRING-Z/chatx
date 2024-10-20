const axios = require('axios');
const { Marked } = require('marked');
const { markedHighlight } = require('marked-highlight');
const hljs = require('highlight.js');
const fs = require('fs');
const os = require('os');
const path = require('path');

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

const MEMORY_LENGTH = config.MEMORY_LENGTH;

function get_api_url(gpt_version) {
    switch (gpt_version){
        case 'glm-4':
            return config.CHATGLM_API_URL;
        case 'glm-3-turbo':
            return config.CHATGLM_API_URL;
        default:
            return config.OPENAI_API_URL;
    }
}

function get_api_key(gpt_version) {
    switch (gpt_version){
        case 'glm-4':
            return config.CHATGLM_API_KEY;
        case 'glm-3-turbo':
            return config.CHATGLM_API_KEY;
        default:
            return config.OPENAI_API_KEY;
    }
}

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

async function chatgpt(queryText, prompt=null, gpt_version) {
    try {
        messages.push({ 'role': 'user', 'content': queryText });
        if (prompt) {
            messages_list = [{"role": "system", "content": prompt}]
            messages_list = messages_list.concat(messages.slice(messages.length-MEMORY_LENGTH,messages.length))
        }
        else {
            messages_list = messages.slice(messages.length-MEMORY_LENGTH,messages.length)
        }
        const response = await axios.post(get_api_url(gpt_version), {
            'model': gpt_version,
            'messages': messages_list,
        }, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${get_api_key(gpt_version)}`,
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
