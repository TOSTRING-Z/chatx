const { ReActAgent, State } = require("./re_act_agent.js")
const { utils } = require('../modules/globals')

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
            }
        }

        this.prompt = null;

        this.system_prompt = `你是OpenManus，一个全能的人工智能助手，旨在解决用户提出的任何任务。您可以使用各种工具来高效地完成复杂的请求。
您可以使用PythonExecute与计算机交互，使用GoogleSearch检索信息。
PythonExecute：执行Python代码与计算机系统、数据处理、自动化任务等进行交互。
BaiduSearch：执行网络信息检索。`

        this.task_prompt = `# 你当前的任务是：

- 根据当前信息判断是否需要执行下一步任务。

- 若需要执行下一步任务，则给出下一步的任务要求。

- 若判断任务结束，则总结并回答。

- 修复报错。

# 你的输出应该严格遵守如下json格式：

## 若判断任务执行完成

{
    "content": "[请添加回答内容]",
    "task": false
}

### 字段描述

- content: 理解所有对话内容后最终结果输出（请回答用户最初的输入，不需要回答“完成任务”等和用户目的无关的内容）。

## 若判断还需进行下一步任务

{
    "content": "[请添加回答内容]",
    "task": true
}

### 字段描述

- content: 理解所有对话内容后下一步需要要执行的任务描述文本。

# 输出要求

- 仅输出json字符串，不要输出任何解释和MarkDown格式。`
        
        this.tool_prompt = `${this.system_prompt}

# 你当前的任务是：

- 判断是否需要调用工具。

- 修复报错。

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

## 若判断不需要调用工具

{
    "content": "[请添加调用该工具和原因和目的]"
    "tool": "",
    "params": {}
}

# 输出要求

- 仅输出json字符串，不要输出任何解释和MarkDown格式。`
    }

    async step(data) {
        if (!this.prompt) {
            this.prompt = utils.copy(data.prompt)
        }
        data.push_message = true
        // 判断是否调用工具
        const tool_info = await this.tool(data);
        // 若判断调用工具且工具解析正确
        if (tool_info?.tool) {
            // 运行工具
            data.output_format = await this.act(tool_info);
        } else if(tool_info?.error) {
            // 工具解析报错
            data.output_format = tool_info.error;
        } else {
            // 下一步任务
            data.output_format = "请判断是否需要继续下一步任务。"
            data.output_format = await this.task(data);
            if (this.state == State.FINAL) {
                this.final(data);
            }
        }
        return data.output_format;
    }

    async tool(data) {
        data.prompt = this.tool_prompt;
        let content = await this.llmCall(data);
        return this.get_tool(content);
    }

    async task(data) {
        data.prompt = this.task_prompt;
        let content = await this.llmCall(data);
        return this.get_task(content);
    }

    async final(data) {
        data.end = true;
        data.prompt = this.prompt;
        data.output_format = `请忽略工具调用信息，仅关注工具执行结果，并回答用户最初的输入：`;
        let content = await this.llmCall(data);
        return content;
    }


    
    async act({tool, params}) {
        try {
            const will_tool = this.tools[tool];
            const output = will_tool(params);
            return `工具输出结果如下：

\`\`\`
${output}
\`\`\`

请判断是否需要进一步调用工具。`;
        } catch (error) {
            console.log(error);
            return `工具调用报错：${error.message}`;
        }
    }

    get_tool(content) {
        try {
            const tool_info = JSON.parse(content);
            if (!!tool_info.tool) {
                return tool_info;
            }
            else {
                return null;
            }
        } catch (error) {
            console.log(error);
            return {error: `工具调用json字符串如下：
            ${content}

            json解析发生错误：
            ${error.message}
            
            请尝试修正错误。`}
        }
    }

    get_task(content) {
        try {
            const info = JSON.parse(content);
            if (!!(info?.task)) {
                return info.content;
            } else {
                this.state = State.FINAL;
                return info.content;
            }
        } catch (error) {
            console.log(error);
            return ` json解析发生错误：
            ${error.message}
            
            请尝试修正错误。`;
        } 
    }
}

module.exports = {
    ToolCall
};