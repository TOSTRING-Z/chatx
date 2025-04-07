# MCP环境 https://github.com/modelcontextprotocol/python-sdk
```bash
# 安装
~/.local/bin/uv add "mcp[cli]"

# 环境

* linux
source mcp_server/.venv/bin/activate

* window
.\mcp_server\.venv\Scripts\activate

# 测试
mcp dev mcp_server/server.py
```

# docker环境 

[docker](https://www.anaconda.com/docs/tools/working-with-conda/applications/docker#docker)
[mcp-fetch](https://github.com/modelcontextprotocol/servers/blob/main/src/fetch/Dockerfile)

```bash
# 构建
docker pull continuumio/miniconda3
docker build -t transagent:latest .

# 打包
docker save -o transagent.tar transagent:latest

# 加载
docker load -i transagent.tar

# linux
docker run -i --name transagent --rm -v /mnt/ubuntu_zgr/install/chatx/mcp_client/tmp:/tmp -v /mnt/ubuntu_zgr/install/chatx/mcp_client/data:/data -p 3001:3001 transagent

# window
docker run -i --rm -v C:/Users/Administrator/Desktop/Document/chatx/mcp_client/tmp:/tmp -v C:/Users/Administrator/Desktop/Document/chatx/mcp_client/data:/data -p 3001:3001 transagent

# dev
npx @modelcontextprotocol/inspector
```