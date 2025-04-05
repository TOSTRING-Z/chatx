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
      return "MCP server is not available!"
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
          return { question: "Task paused, waiting for user feedback...", options: ["Allow", "Deny"] }
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
          return memory || "No memory ID found";
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

    this.task_prompt = `You are ChatX, an all-around AI assistant designed to solve any tasks proposed by users. You can use various tools to efficiently complete complex requests.

You should strictly follow the entire process of thinking first, then acting, and then observing:
1. Thinking: Describe your thought process or plan to solve this problem
2. Action: Based on your thinking, determine the tools needed to be called
3. Observation: Analyze the results of the action and incorporate them into your thinking


Tool usage instructions:
You can access and use a series of tools according to the user's approval. Only one tool can be used in each message, and you will receive the execution result of the tool in the user's response. You need to gradually use tools to complete the given task, and each use of the tool should be adjusted based on the results of the previous tool.

====

# Tool usage format:

## Output format:

Tool usage adopts the format of pure JSON content, prohibiting the use of any Markdown code block tags (including \`\`\`json or \`\`\`), and should not contain additional explanations, comments, or non-JSON text. The following is a structural example:

{{
  "thinking": "[Thinking process]",
  "tool": "[Tool name]",
  "params": {{
    "[parameter1_name]": "[value1]",
    "[parameter2_name]": "[value2]",
    ...
  }}
}}

## Example:
{{
  "thinking": "The user simply greets without proposing a specific task or question. In planning mode, I need to communicate with the user to understand their needs or tasks.",
  "tool": "plan_mode_response",
  "params": {{
    "response": "Hello! May I help you with anything?",
    "options": [
      "I need help completing a project",
      "I want to learn how to use certain tools",
      "I have some specific questions that need answers"
    ]
  }}
}}

Please always follow this format to ensure the tool can be correctly parsed and executed.

====

# Tools:

{tool_prompt}

## mcp_server
Description: Request MCP (Model Context Protocol) service.
Parameters:
- name: (Required) The name of the MCP service to request.
- args: (Required) The parameters of the MCP service request.
Usage:
{{
  "thinking": "[Thinking process]",
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
Description: Ask the user questions to collect additional information needed to complete the task. It should be used when encountering ambiguity, needing clarification, or requiring more details to proceed effectively. It achieves interactive problem-solving by allowing direct communication with the user. Use this tool wisely to balance between collecting necessary information and avoiding excessive back-and-forth communication.
Parameters:
- question: (Required) The question to ask the user. This should be a clear and specific question targeting the information you need.
- options: (Optional) Provide the user with 2-5 options to choose from. Each option should be a string describing a possible answer. You do not always need to provide options, but in many cases, this can help the user avoid manually entering a response.
Usage:
{{
  "thinking": "[Thinking process]",
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
Description: When file operations or system commands need to be executed, call this task to wait for user approval or rejection.
Usage example:
{{
  "thinking": "[Thinking process]",
  "tool": "waiting_feedback",
  "params": {{}}
}}

## plan_mode_response
Description: Respond to user inquiries to plan solutions for user tasks. This tool should be used when you need to respond to user questions or statements about how to complete a task. This tool is only available in "planning mode". The environment details will specify the current mode; if it is not "planning mode", this tool should not be used. Depending on the user's message, you may ask questions to clarify the user's request, design a solution for the task, and brainstorm with the user. For example, if the user's task is to create a website, you can start by asking some clarifying questions, then propose a detailed plan based on the context, explain how you will complete the task, and possibly engage in back-and-forth discussions until the user switches you to another mode to implement the solution before finalizing the details.
Parameters:
response: (Required) The response provided to the user after the thinking process.
options: (Optional) An array containing 2-5 options for the user to choose from. Each option should describe a possible choice or a forward path in the planning process. This can help guide the discussion and make it easier for the user to provide input on key decisions. You may not always need to provide options, but in many cases, this can save the user time from manually entering a response. Do not provide options to switch modes, as there is no need for you to guide the user's operations.
Usage:
{{
  "thinking": "[Thinking process]",
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
Description: Memory retrieval tool, retrieving past tool call information and execution results through memory ID.
Parameters:
- memory_id: (Required) The memory ID to retrieve.
Usage:
{{
  "thinking": "[Thinking process]",
  "tool": "memory_retrieval",
  "params": {{
    "memory_id": "[value]"
  }}
}}

## terminate
Description: Stop the task (called when the task is judged to be completed)
Parameters:
- final_answer: (Required) Summarize and give the final answer (MarkDown format)
Usage:
{{
  "thinking": "[Thinking process]",
  "tool": "terminate",
  "params": {{
    "final_answer": "[value]"
  }}
}}

====

# Available MCP Services

{mcp_prompt}

====

{extra_prompt}

====

# Automatic Mode vs. Execution Mode vs. Planning Mode

Environment details will specify the current mode, there are three modes: 

**Automatic Mode**: In this mode, you cannot use plan_mode_response, waiting_feedback and ask_followup_question tools.

- In automatic mode, you can use tools other than plan_mode_response, waiting_feedback and ask_followup_question to complete the user's task, and the subsequent process does not need to ask the user questions until the mode changes.
- When your environment changes from other modes to automatic mode, you should be aware that you do not need to ask the user questions in the subsequent process until the mode changes.
- Once the task is completed, you use the terminate tool to show the task result to the user.

**Execution Mode**: In this mode, you cannot use the plan_mode_response tool.

- In execution mode, you can use tools other than plan_mode_response to complete the user's task.
- Once the task is completed, you use the terminate tool to show the task result to the user.

**Planning Mode**: In this special mode, you can only use the plan_mode_response tool.

- In planning mode, the goal is to collect information and obtain context to create a detailed plan to complete the user's task. The user will review and approve the plan, then switch to execution mode or automatic mode to implement the solution.
- In planning mode, when you need to communicate with the user or present a plan, you should directly use the plan_mode_response tool to deliver your response.
- If the current mode switches to planning mode, you should stop any pending tasks and discuss with the user to plan how best to proceed with the task.
- In planning mode, depending on the user's request, you may need to do some information gathering, such as asking the user clarifying questions to better understand the task.
- Once you have more context about the user's request, you should develop a detailed plan to complete the task.
- Then, you can ask the user if they are satisfied with the plan or if they wish to make any changes. Consider this a brainstorming session where you can discuss the task and plan the best way to complete it.
- Finally, once you think a good plan has been developed, ask to switch the current mode back to execution mode to implement the solution.

====

# Goals

You complete the given task iteratively, breaking it down into clear steps and systematically completing these steps.

1. Analyze the user's task and set clear, achievable goals to complete the task. Prioritize these goals in a logical order.
2. Complete these goals in order, using the available tools one by one if necessary. Each goal should correspond to a clear step in your problem-solving process. You will understand the work done and the remaining work in the process.
3. Remember that you have extensive capabilities and can access various tools that can be used in powerful and clever ways as needed. Before calling a tool, analyze it within the [thinking process]. First, analyze the current mode provided in the "Environment Details" to select the scope of tool usage.
4. Next, when you are in "execution mode", check each required parameter of the relevant tools one by one and determine whether the user has directly provided enough information to infer the value. When deciding whether a parameter can be inferred, carefully consider all the context to see if it supports a specific value. If all required parameters exist or can be reasonably inferred, proceed with using the tool. However, if a required parameter value is missing, do not call the tool (even if you use a placeholder to fill in the missing parameter), but use the ask_followup_question tool to ask the user to provide the missing parameter. If information about optional parameters is not provided, do not ask for more information.
5. When you are in "automatic mode", you should also check each required parameter of the relevant tools one by one. If a required parameter value is missing, automatically plan a solution and execute it. Remember that in this mode, it is strictly forbidden to call tools that interact with the user.
6. Once the user's task is completed, you must use the terminate tool to show the task result to the user.
7. You should judge whether memory retrieval is needed based on the context information.

====

# Environment Details Explanation
- Language: The type of language the assistant needs to use to reply to messages
- Temporary folder: The location where temporary files are stored during the execution process
- Current time: Current system time
- Current mode: The current mode (automatic mode / execution mode / planning mode)

====

# System Information

- Operating system type: {type}
- Operating system platform: {platform}
- CPU architecture: {arch}

===

# Memory Index List

{memory_list}

===

# Memory Index List Explanation
Each time a user and assistant message is exchanged, a "memory_id" is stored in the "memory index list". The memory storage is continuously arranged in order of the size of "memory_id".
"memory_id" is an index linking to the details of tool calls, and the details of tool calls are stored in the database, which can only be queried using the memory_retrieval tool.

- When should the memory_retrieval tool be called:
1. When the content the user is asking about has appeared in the historical conversation records.
2. When the assistant needs to understand the specific details of historical tool calls.
3. When needing to call a repeated tool, the memory_retrieval tool should first be called to obtain the execution results of the tool.

====`

    this.system_prompt;
    this.mcp_prompt;
    this.memory_id = 0;
    this.memory_list = [];

    this.env = `Environment details:
- Language: {language}
- Temporary folder: {tmpdir}
- Current time: {time}
- Current mode: {mode}`

    this.modes = {
      AUTO: 'Automatic mode',
      ACT: 'Execution mode',
      PLAN: 'Planning mode',
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
    "response": "Continue?",
    "options": ["Continue","End"]
  }
}`;
    case this.modes.ACT:
      return `{
  "thinking": ${text},
  "tool": "ask_followup_question",
  "params": {
    "response": "Continue?",
    "options": ["Continue","End"]
  }
}`;
    case this.modes.AUTO:
      return `{
  "thinking": ${text},
  "tool": "terminate",
  "params": {
    "final_answer": "Continue?"
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
    // Check if a tool needs to be called
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
        const observation = `Tool ${tool} does not exist! Please check if the tool name is incorrect or if the MCP service call format is wrong.`;
        return { observation, output: null };
      }
      const will_tool = this.tools[tool].func;
      const output = await will_tool(params);
      const observation = `Tool ${tool} has been executed, output as follows:
{
    "observation": ${JSON.stringify(output, null, 4)},
    "error": ""
}`;
      return { observation, output };
    } catch (error) {
      console.log(error);
      const observation = `Tool ${tool} has been executed, output as follows:
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
        this.memory_list.push({ memory_id: this.memory_id, user: `Assistant called ${tool_info.tool} tool` });
        data.event.sender.send('stream-data', { id: data.id, content: `${tool_info.thinking}\n\n---\n\n` });
      }
      if (!!tool_info?.tool) {
        return tool_info;
      }
    } catch (error) {
      console.log(error);
      data.output_format = `Tool was not executed, output as follows:
{
    "observation": "",
    "error": "Your response is not a pure JSON text, or there is a problem with the JSON format: ${error.message}"
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
