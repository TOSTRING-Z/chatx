const { ReActAgent, State } = require("./re_act_agent.js")
const { utils, inner } = require('../modules/globals')
const { pushMessage } = require('../server/llm_service');

class ToolCall extends ReActAgent {
    constructor() {
        super();
        this.tools = {
            "python_execute": async ({ code }) => {
                console.log(code);
                const func = inner.model_obj.plugin["python执行"].func
                return await func({ input: code })
                // return "print('hello world!')\nimport numpy as np\nnp.array([1,2,3])";
            },
            "baidu_search": async ({ content }) => {
                console.log(content);
                const func = inner.model_obj.plugin["百度搜索"].func
                return await func({ input: content, params: { jina: "" } })
                // return "衡阳温度:16摄氏度.";
            },
            "terminate": () => {
                this.state = State.FINAL;
                return "任务结束!";
            },
            "pause": () => {
                this.state = State.PAUSE;
                return "任务暂停,等待用户反馈...";
            },
        }

        this.prompt = null;

        this.final_prompt = `# 你当前扮演非结构化输出的*总结助手*.

- 忽略工具调用信息,仅关注工具执行结果,并回答用户最初的输入

# 输出要求

请严格按以下要求执行:
- 输出非结构化格式
- 输出MarkDown格式`

        this.task_prompt = `你是ChatX,一个全能的人工智能助手,旨在解决用户提出的任何任务.你可以使用各种工具来高效地完成复杂的请求.你可以调用的工具如下:
PythonExecute: 人工智能助手可以调用该工具来本地执行python代码,例如实现文件读取,数据分析,和代码执行等
BaiduSearch: 人工智能助手可以调用该工具来执行联网搜索
Terminate: 当人工智能助手收到停止任务后会调用该工具
Pause: 当人工智能助手收到暂停任务后会调用该工具

你应该先思考,后行动,然后观察:
思考: 描述你为了解决这个问题的思考过程或者计划
行动: 基于你的思考判断需要调用的工具
观察: 分析行动的结果并将其纳入你的思考当中

# 你的输出应该严格遵守如下json格式:

## 若判断调用PythonExecute工具

{
    "content": "[思考过程]"
    "tool": "python_execute",
    "params": {
        {"code": "[value]", "type": "string"}
    }
}

### 字段描述

- code: 可执行的python代码片段.(python代码输出要求保留空格换行,并严格要求代码格式,不正确的缩进和换行会导致代码执行失败）

## 若判断调用BaiduSearch工具

{
    "content": "[思考过程]"
    "tool": "baidu_search",
    "params": {
        {"context": "[value]", "type": "string"}
    }
}

### 字段描述

- context: 需要搜索的文字,要求是用户输入中提取的关键字或总结的搜索内容

## 若判断调用Pause工具

{
    "content": "[思考过程]"
    "tool": "pause",
    "params": {}
}

## 若判断调用Terminate工具

{
    "content": "[思考过程]"
    "tool": "terminate",
    "params": {}
}

# 输出要求

请严格按以下要求执行:
- 你只能输出**纯JSON内容**
- 禁止使用任何Markdown代码块标记(包括\`\`\`json或\`\`\`)
- 不要包含额外解释、注释或非JSON文本
- 确保输出可直接被JSON解析器读取

示例错误格式:
\`\`\`json
{"key": "value"}`
    }


    async step(data) {
        if (this.state == State.IDLE) {
            pushMessage("user", data.query, data.id);
            this.state = State.RUNNING;
            this.prompt = utils.copy(data.prompt)
        }
        // 判断是否调用工具
        const tool_info = await this.task(data);
        if (tool_info?.tool) {
            // 调用工具
            data.output_format = await this.act(tool_info);
            pushMessage("user", data.output_format, data.id);
            if (this.state == State.PAUSE) {
                return data.output_format;
            }
            data.event.sender.send('info-data', { id: data.id, content: this.get_info(data) });
            if (this.state == State.FINAL) {
                return this.final(data);
            }
            
        }
        return data.output_format;
    }

    async task(data) {
        data.push_message = true
        data.prompt = this.task_prompt;
        data.output_format = await this.llmCall(data);
        data.event.sender.send('info-data', { id: data.id, content: this.get_info(data) });
        return this.get_tool(data.output_format, data.id);
    }

    async final(data) {
        data.end = true;
        data.prompt = this.prompt;
        data.output_format = `${this.final_prompt}\n\n${data.query}`;
        let content = await this.llmCall(data);
        return content;
    }

    async act({ tool, params }) {
        try {
            const will_tool = this.tools[tool];
            const output = await will_tool(params);
            const observation = `工具 ${tool} 已经被执行,输出结果如下:
            {
                "observation": "${JSON.stringify(output)}",
                "error": "",
            }`;
            return observation;
        } catch (error) {
            console.log(error);
            const observation = `工具 ${tool} 已经被执行,输出结果如下:
            {
                "observation": "",
                "error": "${error.message}",
            }`;
            return observation;
        }
    }

    get_tool(content, id) {
        try {
            const tool_info = JSON.parse(content);
            if (!!tool_info?.tool) {
                return tool_info;
            }
        } catch (error) {
            console.log(error);
            const observation = `工具未被执行,输出结果如下:
            {
                "observation": "",
                "error": "JSON.parse反序列化发生错误,${error.message}",
            }`;
            pushMessage("user", observation, id);
        }
    }
}

module.exports = {
    ToolCall
};