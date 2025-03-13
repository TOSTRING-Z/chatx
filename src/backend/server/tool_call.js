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
            "file_save": async ({ file_path, content }) => {
                console.log(file_path);
                const func = inner.model_obj.plugin["文件保存"].func
                return await func({ input: file_path, content: content})
            },
            "file_load": async ({ file_path }) => {
                console.log(file_path);
                const func = inner.model_obj.plugin["文件读取"].func
                return await func({ file_path: file_path})
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

        this.final_prompt = `* 你当前扮演非结构化输出的总结助手.

* 请严格按以下要求执行:
忽略工具调用信息,仅关注工具执行结果,并回答用户最初的输入
输出非结构化格式
输出MarkDown格式`

        this.task_prompt = `* 你是ChatX,一个全能的人工智能助手,旨在解决用户提出的任何任务.你可以使用各种工具来高效地完成复杂的请求.

* 你应该严格遵循先思考,后行动,然后观察的整个流程:
思考: 描述你为了解决这个问题的思考过程或者计划
行动: 基于你的思考判断需要调用的工具
观察: 分析行动的结果并将其纳入你的思考当中

* 你的可以调用工具的具体格式和解释如下:

工具名: PythonExecute
功能: 本地执行python代码,例如实现文件读取,数据分析,和代码执行等
输出格式:
{
    "content": "[思考过程]"
    "tool": "python_execute",
    "params": {
        {"code": "[value]"}
    }
}
字段描述:
code: 可执行的python代码片段(python代码输出要求保留空格换行,并严格要求代码格式,不正确的缩进和换行会导致代码执行失败）

工具名: BaiduSearch
功能: 执行联网搜索
输出格式:
{
    "content": "[思考过程]"
    "tool": "baidu_search",
    "params": {
        {"context": "[value]"}
    }
}
字段描述:
context: 需要搜索的文字,要求是用户输入中提取的关键字或总结的搜索内容

工具名: FileSave
功能: 保存文件到指定路径(仅支持文本文件)
输出格式:
{
    "content": "[思考过程]"
    "tool": "file_save",
    "params": {
        {file_path: "[value]", content: "[value]"}
    }
}
字段描述:
file_path: 需要保存的文件路径(一定要使用/)
context: 需要保存的内容

工具名: FileLoad
功能: 读取文件(仅支持docx,doc,pdf,odt,odp,ods和pptx)
输出格式:
{
    "content": "[思考过程]"
    "tool": "file_load",
    "params": {
        {file_path: "[value]"}
    }
}
字段描述:
file_path: 需要读取的文件路径

工具名: Pause
功能: 暂停任务
输出格式:
{
    "content": "[思考过程]"
    "tool": "pause",
    "params": {}
}

工具名: Terminate
功能: 停止任务
输出格式:
{
    "content": "[思考过程]"
    "tool": "terminate",
    "params": {}
}

* 请严格按以下要求执行:
你只能输出**纯JSON内容**
禁止使用任何Markdown代码块标记(包括\`\`\`json或\`\`\`)
不要包含额外解释,注释或非JSON文本
确保输出可直接被JSON解析器读取

* 示例错误格式:
\`\`\`json
{"key": "value"}`
    }


    async step(data) {
        if (this.state == State.IDLE) {
            pushMessage("user", data.query, data.id);
            this.state = State.RUNNING;
        }
        const tool_info = await this.task(data);
        // 判断是否调用工具
        if (tool_info?.tool) {
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
        return this.get_tool(data.output_format, data);
    }

    async final(data) {
        data.end = true;
        // 总结回复不加入记忆,否则会导致回复格式错乱
        data.stream_push = false
        data.prompt = this.final_prompt;
        data.output_format = `* 回忆用户最初输入:\n${data.query}`;
        let content = await this.llmCall(data);
        return content;
    }

    async act({ tool, params }) {
        try {
            const will_tool = this.tools[tool];
            const output = await will_tool(params);
            const observation = `工具 ${tool} 已经被执行,输出结果如下:
{
    "observation": ${JSON.stringify(output, null, 4)},
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

    get_tool(content, data) {
        try {
            const tool_info = JSON.parse(content);
            if (!!tool_info?.tool) {
                return tool_info;
            }
        } catch (error) {
            console.log(error);
            data.output_format = `工具未被执行,输出结果如下:
{
    "observation": "",
    "error": "JSON.parse反序列化发生错误,${error.message}",
}`;
            pushMessage("user", data.output_format, data.id);
            data.event.sender.send('info-data', { id: data.id, content: this.get_info(data) });
        }
    }
}

module.exports = {
    ToolCall
};