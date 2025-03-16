
const fs = require('fs')
const path = require('path')

function main(parmas) {
    return async ({ input, prompt = null }) => {

        return new Promise(async (resolve, reject) => {
            try {
                // 读取文件内容
                const imageBuffer = await fs.promises.readFile(input)

                // 获取文件扩展名
                const ext = path.extname(input).slice(1)

                // 构建 Base64 字符串
                let url = `data:image/${ext};base64,${imageBuffer.toString('base64')}`

                let content = [
                    {
                        "type": "text",
                        "text": !!prompt?prompt:"提取图片中的所有文字"
                    },
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": url
                        }
                    }
                ];

                let messages = [
                    { "role": "user", "content": content }
                ];

                let body = {
                    model: parmas.version,
                    messages: messages,
                    stream: false
                }

                let response = await fetch(new URL(parmas.api_url), {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${parmas.api_key}`,
                    },
                    body: JSON.stringify(body),
                });

                if (!response.ok) {
                    resolve(`视觉大模型API请求失败: ${response.statusText}`);
                }

                let data = await response.json();
                resolve(data?.choices[0].message.content);
            } catch (error) {
                resolve(error.message);
            }
        })
    }
}

module.exports = {
    main,
};