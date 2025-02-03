const axios = require("axios");
const fs = require("fs");

let messages = [];

function clearMessages() {
    messages = [];
}

function saveMessages(filePath) {
    fs.writeFile(filePath, JSON.stringify(messages), err => {
        if (err) {
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

function deleteMessage(id) {
    // 使用 filter 方法删除 id 为 0 的对象
    messages = messages.filter(message => message.id !== id);
    return true;
}

function format_messages(messages_list) {
    // 遍历 messages_list 数组，并删除每个对象的 id 属性
    return messages_list.map(message => {
        let message_copy = JSON.parse(JSON.stringify(message));
        delete message_copy.id;
        return message_copy;
    });
}

async function chatBase(queryText, prompt = null, version, api_url, api_key, memory_length, img_url = null, id) {
    try {
        let content = queryText;
        if (img_url) {
            content = [
                {
                    "type": "text",
                    "text": queryText
                },
                {
                    "type": "image_url",
                    "image_url": {
                        "url": img_url
                    }
                }
            ];
        }
        messages.push({ "role": "user", "content": content, "id": id });
        if (prompt) {
            messages_list = [{ "role": "system", "content": prompt, "id": id  }]
            messages_list = messages_list.concat(messages.slice(messages.length - memory_length, messages.length))
        }
        else {
            messages_list = messages.slice(messages.length - memory_length, messages.length)
        }
        const response = await axios.post(api_url, {
            "model": version,
            "messages": format_messages(messages_list),
        }, {
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${api_key}`,
            },
        });
        let res_message = response.data.choices[0].message;
        res_message.id = id;
        messages.push(res_message);
        return res_message.content;
    } catch (error) {
        console.log(error)
        return error.response.data.msg
    }
}

module.exports = {
    chatBase, clearMessages, saveMessages, loadMessages, deleteMessage
};
