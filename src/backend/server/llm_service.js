const axios = require("axios");
const fs = require("fs");
const OpenAI = require('openai');

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

async function chatBase(queryText, prompt = null, version, api_url, api_key, memory_length, img_url = null, id, event, stream = true, max_tokens=8000) {
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
        message_user = { "role": "user", "content": content, "id": id };
        if (prompt) {
            messages_list = [{ "role": "system", "content": prompt, "id": id }]
            messages_list = messages_list.concat(messages.slice(messages.length - memory_length, messages.length))
        }
        else {
            messages_list = messages.slice(messages.length - memory_length, messages.length)
        }
        messages_list.push(message_user)
        let message_system = { role: 'assistant', content: '', id: id }

        if (stream) {
            try {
                const matches = api_url.match(/^(.*?)(\/[^\/]+\/[^\/]+)$/);
                const baseURL = matches[1];
                const openai = new OpenAI({ baseURL: baseURL, apiKey: api_key })
                const stream_res = await openai.chat.completions.create({
                    model: version,
                    messages: format_messages(messages_list),
                    stream: true,
                    max_tokens: max_tokens,
                })
                for await (const chunk of stream_res) {
                    // 处理流式输出
                    let delta = chunk.choices[0]?.delta;
                    let content = "";
                    if (chunk.choices.length > 0 && delta) {
                        if (delta.hasOwnProperty("reasoning_content") && delta.reasoning_content)
                            content = delta.reasoning_content;
                        else if (delta.hasOwnProperty("content") && delta.content) {
                            content = delta.content;
                            message_system.content += content;
                        }
                        // 发送数据块到渲染进程
                        event.sender.send('stream-data', { id: id, content: content, end: false });
                    }
                }
                messages.push(message_user);
                messages.push(message_system);
                console.log(message_system)
                event.sender.send('stream-data', { id: id, content: "", end: true });
            } catch (error) {
                console.log(error);
                event.sender.send('stream-data', { id: id, content: "发生错误！", end: true });
            }


        } else {
            const response = await axios.post(api_url, {
                "model": version,
                "messages": format_messages(messages_list),
            }, {
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${api_key}`,
                },
            });
            message_system.content = response.data.choices[0].message.content;
            messages.push(message_user);
            messages.push(message_system);
        }
    } catch (error) {
        console.log(error)
    }
}

module.exports = {
    chatBase, clearMessages, saveMessages, loadMessages, deleteMessage
};
