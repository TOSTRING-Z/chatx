const axios = require("axios");
const fs = require("fs");
const { streamSse } = require("./stream.js")

let messages = [];
let stop_ids = [];

function getStopIds() {
    return stop_ids;
}

function clearMessages() {
    messages = [];
    stop_ids = [];
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
    try {
        messages = messages.filter(message => message.id !== id);
        return true;
    } catch (error) {
        return false;
    }
}

function stopMessage(id) {
    stop_ids.push(id);
}

function copy(data) {
    return JSON.parse(JSON.stringify(data));
}

function format_messages(messages_list, params) {
    params = params ? params : {};
    // 遍历 messages_list 数组，并删除每个对象的 id 属性
    messages_list = messages_list.map(message => {
        let message_copy = copy(message);
        delete message_copy.id;
        return message_copy;
    });

    // 判断是否是视觉模型
    if (!params.hasOwnProperty("vision")) {
        messages_list = messages_list.filter(message => {
            if (typeof message.content !== "string") {
                return false;
            }
            return true;
        })
    }
    else {
        messages_list = messages_list.filter(message => {
            if (typeof message.content !== "string") {
                switch (message.content[1].type) {
                    case "image_url":
                        return params.vision.includes("image")
                    case "video_url":
                        return params.vision.includes("video")
                    default:
                        return false;
                }
            }
            return true;
        })
    }

    return messages_list;

}


async function chatBase({ query, prompt = null, version, api_url, api_key, memory_length, img_url = null, id, event, stream = true, max_tokens = 8000, statu = "output", params = null }) {
    try {
        let content = query;
        if (img_url) {
            content = [
                {
                    "type": "text",
                    "text": query
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
        if (!!prompt) {
            messages_list = [{ "role": "system", "content": prompt, "id": id }]
            messages_list = messages_list.concat(messages.slice(messages.length - memory_length * 2, messages.length))
        }
        else {
            messages_list = messages.slice(messages.length - memory_length * 2, messages.length)
        }
        messages_list.push(message_user)
        let message_system = { role: 'assistant', content: '', id: id }

        if (stream && statu === "output") {
            try {
                const resp = await fetch(new URL(api_url), {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${api_key}`,
                    },
                    body: JSON.stringify({
                        model: version,
                        messages: format_messages(messages_list, params),
                        stream: true,
                        max_tokens: max_tokens,
                    }),
                });

                const stream_res = streamSse(resp);

                for await (const chunk of stream_res) {
                    if (stop_ids.includes(id)) {
                        break;
                    }
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
                "max_tokens": max_tokens,
            }, {
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${api_key}`,
                },
            });
            if (statu === "output") {
                message_system.content = response.data.choices[0].message.content;
                messages.push(message_user);
                messages.push(message_system);
            } else {
                return response.data.choices[0].message.content;
            }
        }
        return true;
    } catch (error) {
        event.sender.send('info-data', { id: id, content: `chatBase 发生错误:\n\`\`\`\n${JSON.stringify(error)}\n\`\`\`\n` });
        return null;
    }
}

module.exports = {
    chatBase, clearMessages, saveMessages, loadMessages, deleteMessage, stopMessage, getStopIds
};
