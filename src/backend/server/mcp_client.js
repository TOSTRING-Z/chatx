const { Client } = require("@modelcontextprotocol/sdk/client/index.js");
const { StdioClientTransport } = require("@modelcontextprotocol/sdk/client/stdio.js");

const transport = new StdioClientTransport({
  command: "uvx",
  args: ["mcp-server-fetch"]
});

const client = new Client(
  {
    name: "chatx-client",
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

export {
    transport, client
}