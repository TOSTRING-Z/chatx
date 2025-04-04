
const fs = require('fs')
const path = require('path')

function main(params) {
    return async ({ input: img_path, prompt = null }) => {

        return new Promise(async (resolve, reject) => {
            try {
                // 读取文件内容
                const imageBuffer = await fs.promises.readFile(img_path)

                // 获取文件扩展名
                const ext = path.extname(img_path).slice(1)

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
                    model: params.version,
                    messages: messages,
                    stream: false
                }

                let response = await fetch(new URL(params.api_url), {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${params.api_key}`,
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

function getPrompt() {
    const prompt = `## llm_ocr
描述: 当需要读取图片内容时调用该工具,该工具通过使用视觉大模型来识别图片内容,因此你需要提供具体的提示词让大模型理解你的意图.
参数:
img_path: 图片路径(本地路径,在线或者base64格式的输入前应先调用python_execute将图片保存在本地)
prompt: 提示词
使用:
{
    "thinking": "[思考过程]"
    "tool": "llm_ocr",
    "params": {
        {
            "img_path": "[value]",
            "prompt": "[value]",
        }
    }
}`
    return prompt
}

module.exports = {
    main, getPrompt
};