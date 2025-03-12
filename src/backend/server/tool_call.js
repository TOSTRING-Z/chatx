const { ReActAgent, State } = require("./re_act_agent.js")
const { utils } = require('../modules/globals')
const { messages } = require('../server/llm_service');

class ToolCall extends ReActAgent {
    constructor() {
        super();
        this.tools = {
            "python_execute": ({code}) => {
                console.log(code);
                return "print('hello world!')\nimport numpy as np\nnp.array([1,2,3])";
            },
            "baidu_search": ({content}) => {
                console.log(content);
                return "衡阳温度：16摄氏度。";
            },
            "terminate": () => {
                this.state = State.FINAL;
            }
        }

        this.prompt = null;

        this.system_prompt = `你是OpenManus，一个全能的人工智能助手，旨在解决用户提出的任何任务。您可以使用各种工具来高效地完成复杂的请求。
您可以使用PythonExecute与计算机交互，使用GoogleSearch检索信息。
PythonExecute: 执行Python代码与计算机系统、数据处理、自动化任务等进行交互。
BaiduSearch: 执行网络信息检索。
Terminate: 如果人工智能助手认为所有任务已经完成，请使用“terminate”工具/函数调用。`

        this.task_prompt = `# 你当前的任务是：

- 在使用每个工具后，清楚地解释执行结果。

- 根据用户初始要求，判断是否需要进行下一步。

- 若判断需要下一步，则给出下一步的具体任务要求。

- 若判断下一步需要进行文件修改，系统指令执行等高风险任务，需要立刻给出停止任务的要求，并在得到用户同意后才能继续执行后续任务。

- 若判断任务已经全部完成，则给出立即停止任务的要求。




# 输出要求

- 输出非结构化格式。
- 输出MarkDown格式。`
        
        this.tool_prompt = `# 你当前的任务是：

- 判断是否需要调用工具。

# 你的输出应该严格遵守如下json格式：

## 若判断调用PythonExecute工具

{
    "content": "[请添加具体调用工具和目的]"
    "tool": "python_execute",
    "params": {
        {"code": "[请添加回答内容]", "type": "string"}
    }
}

### 工具描述

- 人工智能助手可以调用该工具来本地执行python代码，例如实现文件读取，数据分析，和代码执行等。

### 字段描述

- code: 可执行的python代码片段。（python代码输出要求保留空格，并严格要求代码格式，不正确的缩进会导致代码执行失败。）

## 若判断调用BaiduSearch工具

{
    "content": "[请添加调用该工具和原因和目的]"
    "tool": "baidu_search",
    "params": {
        {"context": "[请添加回答内容]", "type": "string"}
    }
}

### 工具描述

- 人工智能助手可以调用该工具来执行联网搜索等工具。

### 字段描述

- context: 需要搜索的文字，要求是用户输入中提取的关键字或总结的搜索内容。

## 若判断调用Terminate工具

{
    "content": "[请添加调用该工具和原因和目的]"
    "tool": "terminate",
    "params": {}
}

### 工具描述

- 当人工智能助手认为已经完成所有任务后会调用该工具。

## 若判断不需要调用工具

{
    "content": "[请清晰的解释执行结果]"
    "tool": "",
    "params": {}
}

# 输出要求

- 仅输出json字符串。
- 不输出任何解释。
- 不输出MarkDown格式。
- 输出不使用\`\`\`json xxxx \`\`\`格式`
    }

    push_message(role, content) {
        let message = {role: role, content: content};
        messages.push(message);
    }

    async step(data) {
        if (this.state == State.IDLE) {
            this.push_message("user", data.query);
            this.state = State.RUNNING;
            this.prompt = utils.copy(data.prompt)
        }
        // 判断是否调用工具
        const tool_info = await this.tool(data);
        if (tool_info?.tool) {
            // 调用工具
            await this.act(tool_info);
            if (this.state == State.FINAL) {
                return this.final(data);
            }
        }
        data.event.sender.send('info-data', { id: data.id, content: this.get_info(data) });
        // 下一步任务
        data.output_format = await this.task(data);
        data.event.sender.send('info-data', { id: data.id, content: this.get_info(data) });
        return data.output_format;
    }

    async tool(data) {
        data.push_message = true
        data.prompt = this.system_prompt;
        data.output_format = this.tool_prompt;
        let content = await this.llmCall(data);
        return this.get_tool(content);
    }

    async task(data) {
        data.push_message = true
        data.prompt = this.system_prompt;
        data.output_format = this.task_prompt;
        let content = await this.llmCall(data);
        return content;
    }

    async final(data) {
        data.end = true;
        data.prompt = this.prompt;
        data.output_format = `* 请忽略工具调用信息，仅关注工具执行结果，并回答用户最初的输入。\n${data.query}`;
        let content = await this.llmCall(data);
        return content;
    }
    
    async act({tool, params}) {
        try {
            const will_tool = this.tools[tool];
            const output = will_tool(params);
            const observation = `工具 ${tool} 已经被执行，输出结果如下：
            {
                "observation": "${JSON.stringify(output)}"
            }`;
            this.push_message("user", observation);
        } catch (error) {
            console.log(error);
            const observation = `工具 ${tool} 已经被执行，出现报错：${error.message}`;
            this.push_message("user", observation);
        }
    }

    get_tool(content) {
        try {
            const tool_info = JSON.parse(content);
            if (!!tool_info?.tool) {
                return tool_info;
            }
        } catch (error) {
            console.log(error);
            const observation = `JONS.parse 反序列化发生错误：${error.message}`;
            this.push_message("user", observation);
        }
    }
}

module.exports = {
    ToolCall
};