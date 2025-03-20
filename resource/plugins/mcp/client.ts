import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const transport = new StdioClientTransport({
  command: "uv",
  args: ["run","mcp-server-fetch"]
});

const client = new Client(
  {
    name: "example-client",
    version: "1.0.0"
  },
  {
    capabilities: {
      prompts: {},
      resources: {},
      tools: {}
    }
  }
);

await client.connect(transport);

// List prompts
const prompts = await client.listPrompts();

// Get a prompt

const tools = await client.listTools();

// Read a resource

// Call a tool
const result = await client.callTool({
  name: "fetch",
  arguments: {
    url: "https://www.claudemcp.com/zh/docs/write-ts-server"
  }
});

console.log(result)

const mcp_prompt = tools.tools.map(tool=>{
  const mcp_name = tool.name;
  const mcp_description = tool.description;
  const properties = tool.inputSchema.properties;
  const required = tool.inputSchema.required;
  const arg_keys = Object.keys(properties);
  const mcp_args = arg_keys.map(key=>{
    const values = properties[key];
    const req = required.includes(key);
    return `- ${key}: ${req?"(required) ":""}${values.description} (type: ${values.type})`;
  }).join("\n");

  const mcp_prompt = `MCP name: ${mcp_name}
MCP description: ${mcp_description}
MCP args:
${mcp_args}`;
  return mcp_prompt;
}).join("\n\n---\n\n")