const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js');

describe('MCP Client', () => {
  let client, transport;

  beforeEach(() => {
    transport = new StdioClientTransport({
      command: "uv",
      args: ["run","mcp-server-fetch"]
    });

    client = new Client(
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
  });

  test('should initialize transport and client', () => {
    expect(transport).toBeDefined();
    expect(client).toBeDefined();
  });

  test('should connect to transport', async () => {
    await client.connect(transport);
    expect(client.connected).toBeTruthy();
  });

  test('should list prompts', async () => {
    const prompts = await client.listPrompts();
    expect(Array.isArray(prompts)).toBeTruthy();
  });

  test('should list tools', async () => {
    const tools = await client.listTools();
    expect(Array.isArray(tools)).toBeTruthy();
  });

  test('should call fetch tool', async () => {
    const result = await client.callTool({
      name: "fetch",
      arguments: {
        url: "https://www.claudemcp.com/zh/docs/write-ts-server"
      }
    });
    expect(result).toBeDefined();
  });
});