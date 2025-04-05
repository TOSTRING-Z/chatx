const { ReActAgent, State } = require("./agent.js")
const { utils } = require('../modules/globals')
const { pushMessage, getMessages } = require('../server/llm_service');
const { MCPClient } = require('./mcp_client.js')
const fs = require('fs');
const os = require('os');

class ToolCall extends ReActAgent {

  async init_mcp() {
    try {
      const configs = utils.getConfig("mcp_server");
      Object.keys(configs).forEach(name => {
        const config = configs[name];
        this.mcp_client.setTransport({ name, config });

      });
      await this.mcp_client.connectMCP();
      return this.mcp_client.mcp_prompt;
    } catch (error) {
      return "MCP server不可用!"
    }
  }

  constructor(tools = {}) {
    super();
    this.mcp_client = new MCPClient();
    const base_tools = {
      "mcp_server": {
        func: async ({ name, args }) => {
          const params = {
            name: name,
            arguments: args
          }
          const result = await this.mcp_client.client.callTool(params, undefined, {
            timeout: utils.getConfig("tool_call").mcp_timeout * 1000
          });
          return result;
        }
      },
      "ask_followup_question": {
        func: async ({ question, options }) => {
          this.state = State.PAUSE;
          return { question, options }
        }
      },
      "waiting_feedback": {
        func: () => {
          this.state = State.PAUSE;
          return { question: "任务暂停,等待用户反馈...", options: ["允许", "拒绝"] }
        }
      },
      "plan_mode_response": {
        func: async ({ response, options }) => {
          this.state = State.PAUSE;
          return { question: response, options }
        }
      },
      "terminate": {
        func: ({ final_answer }) => {
          this.state = State.FINAL;
          return final_answer;
        }
      },
      "memory_retrieval": {
        func: ({ memory_id }) => {
          const memory = getMessages().filter(m => m.memory_id === memory_id).map(m => { return { role: m.role, content: m.content } });
          return memory || "未找到指定的记忆ID";
        }
      },
    }

    this.tool_prompt = []
    for (let key in tools) {
      if (!!tools[key]?.getPrompt) {
        const getPrompt = tools[key].getPrompt;
        this.tool_prompt.push(getPrompt());
      }
    }
    this.tools = { ...tools, ...base_tools }

    this.task_prompt = `你是ChatX,一个全能的人工智能助手,旨在解决用户提出的任何任务.你可以使用各种工具来高效地完成复杂的请求.

你应该严格遵循先思考,后行动,然后观察的整个流程:
1. 思考: 描述你为了解决这个问题的思考过程或者计划
2. 行动: 基于你的思考判断需要调用的工具
3. 观察: 分析行动的结果并将其纳入你的思考当中


工具使用说明:
你可以根据用户的批准访问并使用一系列工具.每次消息中只能使用一个工具,并且会在用户的回应中收到该工具的执行结果.你需要逐步使用工具来完成给定的任务,而每次工具的使用都应基于前一次工具的结果进行调整.

====

# 工具使用格式:

## 输出格式:

工具使用采用纯JSON内容的格式,禁止使用任何Markdown代码块标记(包括\`\`\`json或\`\`\`),不要包含额外解释,注释或非JSON文本.以下是结构示例:

{{
  "thinking": "[思考过程]",
  "tool": "[工具名]",
  "params": {{
    "[parameter1_name]": "[value1]",
    "[parameter2_name]": "[value2]",
    ...
  }}
}}

## 示例:
{{
  "thinking": "用户简单地打招呼，没有提出具体任务或问题。在规划模式下，我需要与用户交流以了解他们的需求或任务。",
  "tool": "plan_mode_response",
  "params": {{
    "response": "你好！请问有什么我可以帮助您的吗？",
    "options": [
      "我需要帮助完成一个项目",
      "我想了解如何使用某些工具",
      "我有一些具体的问题需要解答"
    ]
  }}
}}

请始终遵循此格式以确保工具能够正确解析和执行

====

# 工具:

{tool_prompt}

## mcp_server
描述: 请求MCP(模型上下文协议)服务.
参数:
- name: (需要)请求MCP服务名.
- args: (需要)请求MCP服务参数.
使用:
{{
  "thinking": "[思考过程]",
  "tool": "mcp_server",
  "params": {{
    "name": "[value]",
    "args": {{
      "[parameter1_name]": [value1],
      "[parameter2_name]": [value2],
      ...
    }}
  }}
}}

## ask_followup_question
描述: 向用户提问以收集完成任务所需的额外信息.在遇到歧义,需要澄清或需要更多细节以有效进行时,应使用此工具.它通过允许与用户的直接沟通,实现互动式问题解决.明智地使用此工具,以在收集必要信息和避免过多来回交流之间保持平衡.
参数:
- question: (需要)要问用户的问题.这应该是一个针对您需要的信息的明确和具体的问题.
- options: (可选)为用户提供选择的2-5个选项.每个选项应为描述可能答案的字符串.您并非总是需要提供选项,但在许多情况下,这可以帮助用户避免手动输入回复.
使用:
{{
  "thinking": "[思考过程]",
  "tool": "ask_followup_question",
  "params": {{
    "question": "[value]",
    "options": [
      "Option 1",
      "Option 2",
      ...
    ]
  }}
}}

## waiting_feedback
描述: 当需要执行文件操作,系统指令时调用该任务等待用户允许或拒绝
使用示例:
{{
  "thinking": "[思考过程]",
  "tool": "waiting_feedback",
  "params": {{}}
}}

## plan_mode_response
描述: 响应用户的询问,以规划解决用户任务的方案.当您需要回应用户关于如何完成任务的问题或陈述时,应使用此工具.此工具仅在"规划模式"下可用.环境详细信息将指定当前模式,如果不是"规划模式",则不应使用此工具.根据用户的消息,您可能会提出问题以澄清用户的请求,设计任务的解决方案,并与用户一起进行头脑风暴.例如,如果用户的任务是创建一个网站,您可以从提出一些澄清问题开始,然后根据上下文提出详细的计划,说明您将如何完成任务,并可能进行来回讨论直到用户将您切换模式以实施解决方案之前最终确定细节.
参数:
response: (需要)在思考过程之后提供给用户的响应.
options: (可选)一个包含2-5个选项的数组,供用户选择.每个选项应描述一个可能的选择或规划过程中的前进路径.这可以帮助引导讨论,并让用户更容易提供关键决策的输入.您可能并不总是需要提供选项,但在许多情况下,这可以节省用户手动输入响应的时间.不要提供切换模式的选项,因为不需要您引导用户操作.
使用:
{{
  "thinking": "[思考过程]",
  "tool": "plan_mode_response",
  "params": {{
    "response": "[value]",
    "options": [
      "Option 1",
      "Option 2",
      ...
    ]
  }}
}}

## memory_retrieval
描述: 记忆回溯工具,通过记忆ID检索过去的工具调用信息和执行结果.
参数:
- memory_id: (需要)要检索的记忆ID。
使用:
{{
  "thinking": "[思考过程]",
  "tool": "memory_retrieval",
  "params": {{
    "memory_id": "[value]"
  }}
}}

## terminate
描述: 停止任务(当判断任务完成时调用)
参数:
- final_answer: (需要)总结并给出最终回答(MarkDown格式)
使用:
{{
  "thinking": "[思考过程]",
  "tool": "terminate",
  "params": {{
    "final_answer": "[value]"
  }}
}}

====

# 可用MCP服务

{mcp_prompt}

====

{extra_prompt}

====

# 自动模式 vs. 执行模式 vs. 规划模式

环境详细信息将指定当前模式,有三种模式: 

**自动模式**: 在此模式下,您不能使用 plan_mode_response, waiting_feedback 和 ask_followup_question 工具.

- 在自动模式中,您使用可以使用除 plan_mode_response, waiting_feedback 和 ask_followup_question 以外的工具来完成用户的任务,后续流程不需要询问用户问题直到模式改变.
- 您所处环境从其它模式变为自动模式后应当意识到后续流程中不需要询问用户问题直到模式改变.
- 一旦完成任务,您使用 terminate 工具向用户展示任务结果.

**执行模式**: 在此模式下,您不能使用 plan_mode_response 工具.

- 在执行模式中,您可以使用除 plan_mode_response 以外的工具来完成用户的任务.
- 一旦完成任务,您使用 terminate 工具向用户展示任务结果.

**规划模式**: 在此特殊模式下,您只能使用 plan_mode_response 工具.

- 在规划模式中,目标是收集信息并获取上下文,以创建详细的计划来完成用户的任务.用户将审查并批准该计划,然后切换到执行模式或者自动模式以实施解决方案.
- 在规划模式中,当您需要与用户交流或呈现计划时,应直接使用 plan_mode_response 工具来传递您的响应.
- 当前模式如果切换到规划模式,您应该停止任何待定任务,并于用户进行来回讨论,规划如何最好地继续完成任务.
- 在规划模式下,根据用户的请求,您可能需要进行一些信息收集,例如向用户提出澄清问题,以更好地理解任务.
- 一旦您对用户的请求有了更多的上下文,您应该制定一个详细的计划来完成该任务.
- 然后,您可以询问用户是否对该计划满意,或者是否希望进行任何更改.将此视为一个头脑风暴会议,您可以讨论任务并规划最佳完成方式.
- 最后,一旦您认为已经制定了一个好的计划,请要求将当前模式切换回执行模式以实施解决方案.

====

# 目标

您通过迭代完成给定任务,将其分解为清晰的步骤,并系统地完成这些步骤.

1. 分析用户的任务,并设定明确、可实现的目标以完成任务.按逻辑顺序优先处理这些目标.
2. 按顺序完成这些目标,必要时逐一使用可用工具.每个目标应对应于您问题解决过程中的一个明确步骤.您将在过程中了解已完成的工作和剩余的工作.
3. 请记住,您拥有广泛的能力,可以访问各种工具,这些工具可以根据需要以强大和巧妙的方式使用.在调用工具之前,请在[思考过程]内进行分析.首先,分析"环境详细信息"中提供的当前模式,从而选择使用工具的范围.
4. 接下来,当您处于"执行模式"时,请逐一检查相关工具的每个必需参数,并确定用户是否直接提供了足够的信息来推断值.在决定是否可以推断参数时,请仔细考虑所有上下文,以查看其是否支持特定值.如果所有必需的参数都存在或可以合理推断,请继续使用工具.但是,如果缺少某个必需参数的值,请不要调用工具(即使使用占位符填充缺失的参数),而是使用 ask_followup_question 工具要求用户提供缺失的参数.如果未提供可选参数的信息,请不要要求更多信息.
5. 当您处于"自动模式"时,也应当逐一检查相关工具的每个必需参数,如果缺少某个必需参数的值,请自动规划解决方案并执行,请记住,在此模式下严禁调用与用户交互的工具.
6. 一旦完成用户的任务,您必须使用 terminate 工具向用户展示任务结果.
7. 应当根据上下文信息判断是否需要进行记忆检索.

====

# 环境详细信息解释
- 语言: 助手回复消息需要使用的语言类型
- 临时文件夹: 所有执行过程中的临时文件存放位置
- 当前时间: 当前系统时间
- 当前模式: 当前所处模式(自动模式 / 执行模式 / 规划模式)

====

# 系统信息

- 操作系统类型: {type}
- 操作系统平台: {platform}
- CPU架构: {arch}

===

# 记忆索引列表

{memory_list}

===

# 记忆索引列表解释

每次用户和助手消息时,会存储"memory_id"在"记忆索引列表"中.并且记忆存储是按"memory_id"的大小顺序连续排列的.
"memory_id"是连接工具调用细节的索引,而工具调用细节被保存在数据库中,仅可以使用 memory_retrieval 工具来查询.

- 应该何时调用 memory_retrieval 工具:
1. 当用户询问内容在历史对话记录里出现过时.
2. 当助手需要了解历史工具调用的具体细节时.
3. 当需要调用重复的工具时,应当首先调用 memory_retrieval 工具来获取工具的执行结果.

====`

    this.system_prompt;
    this.mcp_prompt;
    this.memory_id = 0;
    this.memory_list = [];

    this.env = `环境详细信息:
- 语言: {language}
- 临时文件夹: {tmpdir}
- 当前时间: {time}
- 当前模式: {mode}`

    this.modes = {
      AUTO: '自动模式',
      ACT: '执行模式',
      PLAN: '规划模式',
    }

    this.environment_details = {
      mode: this.modes.ACT,
      tmpdir: os.tmpdir(),
      time: utils.formatDate(),
      language: utils.getLanguage()
    }
  }

  error_response(text) {
    text = JSON.stringify(`${text.slice(0,10)}...`);
    switch (this.environment_details.mode) {
      case this.modes.PLAN:
        return `{
  "thinking": ${text},
  "tool": "plan_mode_response",
  "params": {
    "response": "是否继续?",
    "options": ["继续","结束"]
  }
}`;
    case this.modes.ACT:
      return `{
  "thinking": ${text},
  "tool": "ask_followup_question",
  "params": {
    "response": "是否继续?",
    "options": ["继续","结束"]
  }
}`;
    case this.modes.AUTO:
      return `{
  "thinking": ${text},
  "tool": "terminate",
  "params": {
    "final_answer": "是否继续?"
  }
}`;
    }
  }

  clear_memory() {
    this.memory_list.length = 0
  }

  get_extra_prompt(file) {
    try {
      const extra_prompt = fs.readFileSync(file.format(process), 'utf-8');
      return extra_prompt;
    } catch (error) {
      console.log(error.message);
      return "";
    }
  }

  environment_update(data) {
    this.environment_details.time = utils.formatDate();
    this.environment_details.language = utils.getLanguage();
    pushMessage("user", this.env.format(this.environment_details), data.id, this.memory_id, false);
  }

  plan_act_mode(mode) {
    this.environment_details.mode = mode;
  }

  async step(data) {
    this.system_prompt = this.task_prompt.format({
      type: os.type(),
      platform: os.platform(),
      arch: os.arch(),
      tool_prompt: this.tool_prompt.join("\n\n"),
      mcp_prompt: this.mcp_prompt,
      extra_prompt: this.get_extra_prompt(data.extra_prompt),
      memory_list: JSON.stringify(this.memory_list.slice(this.memory_list.length - utils.getConfig("memory_length") * 10, this.memory_list.length), null, 4)
    })
    if (!this.mcp_prompt) {
      this.mcp_prompt = await this.init_mcp();
    }
    data.push_message = false
    if (this.state == State.IDLE) {
      pushMessage("user", data.query, data.id, ++this.memory_id, true, false);
      this.memory_list.push({ memory_id: this.memory_id, user: data.query })
      this.environment_update(data);
      this.state = State.RUNNING;
    }
    const tool_info = await this.task(data);
    // 判断是否调用工具
    if (tool_info?.tool) {
      const { observation, output } = await this.act(tool_info);
      data.output_format = observation;
      pushMessage("user", data.output_format, data.id, this.memory_id);
      this.environment_update(data);
      if (this.state == State.PAUSE) {
        const { question, options } = output;
        data.event.sender.send('stream-data', { id: data.id, content: question, end: true });
        return options;
      }
      if (this.state == State.FINAL) {
        data.event.sender.send('stream-data', { id: data.id, content: output, end: true });
      } else {
        data.event.sender.send('info-data', { id: data.id, content: this.get_info(data) });
      }
    }
  }

  async task(data) {
    data.prompt = this.system_prompt;
    const raw_json = await this.llmCall(data);
    console.log(`raw_json: ${raw_json}`);
    data.output_format = utils.extractJson(raw_json) || raw_json;
    data.event.sender.send('info-data', { id: data.id, content: this.get_info(data) });
    return this.get_tool(data.output_format, data);
  }

  async act({ tool, params }) {
    try {
      if (!this.tools.hasOwnProperty(tool)) {
        const observation = `工具 ${tool} 不存在!请检查是否调用工具名出错或使用了错误的MCP服务调用格式.`;
        return { observation, output: null };
      }
      const will_tool = this.tools[tool].func;
      const output = await will_tool(params);
      const observation = `工具 ${tool} 已经被执行,输出结果如下:
{
    "observation": ${JSON.stringify(output, null, 4)},
    "error": ""
}`;
      return { observation, output };
    } catch (error) {
      console.log(error);
      const observation = `工具 ${tool} 已经被执行,输出结果如下:
{
    "observation": "",
    "error": "${error.message}"
}`;
      return { observation, output: error.message };
    }
  }

  get_tool(content, data) {
    pushMessage("assistant", content, data.id, ++this.memory_id);
    try {
      const tool_info = JSON.parse(content);
      if (!!tool_info?.thinking) {
        this.memory_list.push({ memory_id: this.memory_id, assistant: tool_info.thinking });
        this.memory_list.push({ memory_id: this.memory_id, user: `助手调用了 ${tool_info.tool} 工具` });
        data.event.sender.send('stream-data', { id: data.id, content: `${tool_info.thinking}\n\n---\n\n` });
      }
      if (!!tool_info?.tool) {
        return tool_info;
      }
    } catch (error) {
      console.log(error);
      data.output_format = `工具未被执行,输出结果如下:
{
    "observation": "",
    "error": "您的回复不是一个纯JSON文本,或者JSON格式存在问题: ${error.message}"
}`;
      pushMessage("user", data.output_format, data.id, this.memory_id);
      this.environment_update(data);
      data.event.sender.send('info-data', { id: data.id, content: this.get_info(data) });
    }
  }
}

module.exports = {
  ToolCall
};