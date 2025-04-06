# docker环境 https://www.anaconda.com/docs/tools/working-with-conda/applications/docker#docker
```bash
# 构建
docker pull continuumio/miniconda3
docker build -t transagent:latest .

# 打包
docker save -o transagent.tar transagent:latest

# 加载
docker load -i transagent.tar

# linux
docker run -it \
-v /tmp:/tmp \
-v /data/zgr/TransAgent/client/data:/data \
--rm transagent \
bash

# window
docker run -it --rm -v C:/Users/Administrator/Desktop/Document/chatx/mcp_client/tmp:/tmp -v C:/Users/Administrator/Desktop/Document/chatx/mcp_client/data:/data transagent findMotifsGenome.pl /tmp/genes.bed hg19 /tmp/motif_output -size 200 -mask
```