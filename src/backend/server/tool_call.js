const { ReActAgent, State } = require("./re_act_agent.js")

class ToolCall extends ReActAgent {
    constructor() {
        super();
        this.tools = {
            "python_execute": ({code}) => {
                console.log(code);
                return "print('hello world!')";
            },
            "baidu_search": ({content}) => {
                console.log(content);
                return "衡阳温度：16摄氏度。";
            }
        }

        this.system_prompt = `你是OpenManus，一个全能的人工智能助手，旨在解决用户提出的任何任务。您可以使用各种工具来高效地完成复杂的请求。
        您可以使用PythonExecute与计算机交互，使用GoogleSearch检索信息。
        PythonExecute：执行Python代码与计算机系统、数据处理、自动化任务等进行交互。
        BaiduSearch：执行网络信息检索。`

        this.task_prompt = `# 你当前的任务是给出下一步的任务要求，你的输出应该严格遵守如下json格式：

        ## 若判断任务执行完成

        {
            "content": "",
            "task": false
        }

        ### 字段描述

        - content: 最终结果输出。

        ## 若判断任务并未执行完成

        {
            "content": "",
            "task": true
        }

        ### 字段描述

        - content: 理解所有对话内容后下一步需要要执行的任务描述文本。

        # 输出要求

        - 仅输出json字符串，不要输出任何解释和MarkDown格式。
        `
        
        this.tool_prompt = `${this.system_prompt}

        # 你当前的任务是判断是否需要调用工具，你的输出应该严格遵守如下json格式：

        ## 若判断调用PythonExecute功能

        {
            "content": "调用 python_execute 功能"
            "tool": "python_execute",
            "params": {
                {"code": "", "type": "string"}
            }
        }

        ### 功能描述

        - 人工智能助手可以调用该功能来本地执行python代码，例如实现文件读取，数据分析，和代码执行等。

        ### 字段描述

        - code: 可执行的python代码片段。（python代码输出要求保留空格，并严格要求代码格式，不正确的缩进会导致代码执行失败。）

        ## 若判断调用BaiduSearch功能

        {
            "content": "调用 baidu_search 功能"
            "tool": "baidu_search",
            "params": {
                {"context": "", "type": "string"}
            }
        }

        ### 功能描述

        - 人工智能助手可以调用该功能来执行联网搜索等功能。

        ### 字段描述

        - context: 需要搜索的文字，要求是用户输入中提取的关键字或总结的搜索内容。

        ## 若判断不需要调用功能

        {
            "content": "不需要调用功能"
            "tool": "",
            "params": {}
        }

        # 输出要求

        - 仅输出json字符串，不要输出任何解释和MarkDown格式。`
    }

    async step(data) {
        const {state, tool_info} = await this.tool(data);
        data.output_format = tool_info;
        data.role = "assistant"
        if (state) {
            data.role = "tool";
            data.output_format = await this.act(tool_info);
        } else {
            return data.output_format;
        }
        data.output_format = await this.task(data);
        return data.output_format;
    }

    async tool(data) {
        data.prompt = this.tool_prompt;
        data.push_message = false
        let content = await this.llmCall(data);
        data.push_message = true
        return this.get_tool(content);
    }

    async task(data) {
        data.prompt = this.task_prompt;
        let content = await this.llmCall(data);
        return this.get_task(content);
    }
    
    async act(tool_info) {
        try {
            const tool_name = tool_info.tool;
            const tool_params = tool_info.params;
            const will_tool = this.tools[tool_name];
            const output = will_tool(tool_params);
            return `- 调用功能：${tool_name}
            - 输入参数：${JSON.stringify(tool_params)}
            - 功能返回结果：

            \`\`\`
            ${output}
            \`\`\``;
        } catch (error) {
            console.log(error);
            return `工具调用报错：${error.message}`;
        }
    }

    get_tool(content) {
        try {
            const tool_info = JSON.parse(content);
            if (!!tool_info.tool) {
                return {state: true, tool_info: tool_info};
            }
            else {
                return {state: false, tool_info: "工具调用为空！"};
            }
        } catch (error) {
            console.log(error);
            return {state: false, tool_info: `工具调用json字符串如下：
            ${content}

            json解析发生错误：
            ${error.message}
            
            请修正错误后重新生成。`}
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
            return error.message;
        } 
    }
}

module.exports = {
    ToolCall
};