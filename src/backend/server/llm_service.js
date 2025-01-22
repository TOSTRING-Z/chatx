const axios = require("axios");
const { Marked } = require("marked");
const { markedHighlight } = require("marked-highlight");
const hljs = require("highlight.js");
const fs = require("fs");

const marked = new Marked(
    markedHighlight({
        langPrefix: "hljs language-",
        highlight(code, lang) {
            const language = hljs.getLanguage(lang) ? lang : "plaintext";
            return hljs.highlight(code, { language }).value;
        }
    })
);

let messages = [];

function clearMessages() {
    messages = [];
}

function saveMessages(filePath) {
    fs.writeFile(filePath, JSON.stringify(messages), err => {
        if(err){
            console.log("写入失败");
            return;
        }
        console.log(filePath);
    });
}

function loadMessages(filePath) {
    try {
        const data = fs.readFileSync(filePath, "utf-8");
        messages = JSON.parse(data);
        console.log("加载成功");
        return messages;
    } catch (error) {
        console.log(error);
        return false;
    }
}

async function chatBase(queryText, prompt=null, version, api_url, api_key, memory_length) {
    try {
        messages.push({ "role": "user", "content": queryText });
        if (prompt) {
            messages_list = [{"role": "system", "content": prompt}]
            messages_list = messages_list.concat(messages.slice(messages.length-memory_length,messages.length))
        }
        else {
            messages_list = messages.slice(messages.length-memory_length,messages.length)
        }
        const response = await axios.post(api_url, {
            "model": version,
            "messages": messages_list,
        }, {
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${api_key}`,
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
    chatBase,clearMessages,saveMessages,loadMessages,
};
