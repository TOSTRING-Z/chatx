from concurrent.futures import ThreadPoolExecutor
from mcp import types
from typing import Any
import httpx
from mcp.server.sse import SseServerTransport
from mcp.server.lowlevel.server import Server
from starlette.applications import Starlette
from starlette.routing import Mount, Route


async def fetch_website(
    url: str,
) -> list[types.TextContent | types.ImageContent | types.EmbeddedResource]:
    # 定义异步函数fetch_website，用于获取网页内容
    # 参数: url - 要获取内容的网站URL
    # 返回: 包含文本、图像或嵌入资源的列表

    headers = {
        "User-Agent": "MCP Test Server (github.com/modelcontextprotocol/python-sdk)"
    }  # 设置HTTP请求头，指定User-Agent

    async with httpx.AsyncClient(follow_redirects=True, headers=headers) as client:
        # 创建异步HTTP客户端，设置自动跟随重定向并使用上面定义的headers
        response = await client.get(url)  # 异步发送GET请求获取URL内容
        response.raise_for_status()  # 如果HTTP响应状态码不是2xx，则抛出异常
        return [
            types.TextContent(type="text", text=response.text)
        ]  # 返回网页文本内容作为TextContent对象


def web_search_bing(query: str, page_num: int = 3):
    # 定义函数web_search_bing，用于使用Bing搜索引擎进行网络搜索
    # 参数: query - 搜索关键词, page_num - 要检索的页面数量，默认为3

    subscription_key = "******"  # 个人APIkey，用于Bing搜索API认证
    endpoint = "https://api.bing.microsoft.com/v7.0/search"  # Bing搜索API端点
    search_urls = []  # 初始化存储搜索结果URL的列表
    titles = []  # 初始化存储搜索结果标题的列表
    mkt = "en-US"  # 设置搜索市场为美国英语
    params = {
        "q": query,
        "mkt": mkt,
        "count": page_num * 10,
    }  # 设置搜索参数：查询词、地区和结果数量
    headers = {"Ocp-Apim-Subscription-Key": subscription_key}  # 设置请求头，包含API密钥

    try:
        response = httpx.get(
            endpoint, headers=headers, params=params
        )  # 发送GET请求到Bing搜索API
        response.raise_for_status()  # 如果HTTP响应状态码不是2xx，则抛出异常
        web_content = response.json()  # 将响应解析为JSON格式

        search_urls = [
            single_page["url"] for single_page in web_content["webPages"]["value"]
        ]  # 从结果中提取所有URL

        titles = [
            single_page["name"] for single_page in web_content["webPages"]["value"]
        ]  # 从结果中提取所有标题

    except Exception as e:
        print(e)  # 捕获并打印任何异常

    return search_urls, titles  # 返回搜索结果的URL列表和标题列表


async def search_by_bing(
    searchKeyWords: str, page_num: int = 2
) -> dict[str, Any] | None:
    # 定义异步函数search_by_bing，使用Bing搜索并提取网页内容
    # 参数: searchKeyWords - 搜索关键词, page_num - 要检索的页面数量，默认为2

    search_urls, search_title = web_search_bing(
        searchKeyWords, page_num
    )  # 调用web_search_bing函数获取搜索结果

    with ThreadPoolExecutor(max_workers=len(search_urls) / int(page_num)) as executor:
        # 创建线程池，设置最大工作线程数
        res = list(
            executor.map(fetch_website, search_urls)
        )  # 并行获取所有搜索结果URL的内容

    respone_content = {}  # 初始化响应内容字典
    for idx in range(len((res))):
        # 遍历所有搜索结果
        respone_content[f"Reference {idx}"] = (
            search_title[idx] + "\n" + str(res[idx])[:10000]
        )  # 为每个结果创建引用，包含标题和内容（限制为10000字符）

    return [
        types.TextContent(type="text", text=str(respone_content))
    ]  # 返回包含所有搜索结果的TextContent对象


## 创建SSE Server
sse = SseServerTransport("/messages/")  # 创建SSE服务器传输实例，路径为"/messages/"
app = Server("fetch-bing")  # 创建MCP服务器实例，名称为"mcp-website-fetcher"


@app.call_tool()
async def fetch_tool(
    name: str, arguments: dict
) -> list[types.TextContent | types.ImageContent | types.EmbeddedResource]:
    # 定义异步函数fetch_tool，作为MCP工具调用处理器
    # 参数: name - 工具名称, arguments - 工具参数字典
    # 返回: 包含文本、图像或嵌入资源的列表

    if name == "fetch":
        # 如果调用的是"fetch"工具
        if "url" not in arguments:
            raise ValueError(
                "Missing required argument 'url'"
            )  # 检查是否提供了必需的url参数
        return await fetch_website(
            arguments["url"]
        )  # 调用fetch_website函数获取网页内容

    elif name == "searchBing":
        # 如果调用的是"searchBing"工具
        if "searchKeyWords" not in arguments:
            raise ValueError(
                "Missing required argument 'searchKeyWords'"
            )  # 检查是否提供了必需的searchKeyWords参数
        return await search_by_bing(
            arguments["searchKeyWords"], arguments["page_num"]
        )  # 调用search_by_bing函数进行搜索


@app.list_tools()
async def list_tools() -> list[types.Tool]:
    # 定义异步函数list_tools，用于列出可用的工具
    # 返回: Tool对象列表，描述可用工具

    return [
        types.Tool(
            name="fetch",  # 工具名称
            description="Fetches a website and returns its content",  # 工具描述
            inputSchema={  # 输入模式定义
                "type": "object",
                "required": ["url"],  # 必需参数
                "properties": {
                    "url": {  # url参数定义
                        "type": "string",
                        "description": "URL to fetch",
                    }
                },
            },
        ),
        types.Tool(
            name="searchBing",  # 工具名称
            description="Search Bing and Extract Content From Web Page",  # 工具描述
            inputSchema={  # 输入模式定义
                "type": "object",
                "required": ["searchKeyWords"],  # 必需参数
                "properties": {
                    "searchKeyWords": {  # searchKeyWords参数定义
                        "type": "string",
                        "description": "The keyword you want to search",
                    },
                    "page_num": {  # page_num参数定义
                        "type": "integer",
                        "default": 2,
                        "description": "Number of pages to retrieve, default is 2",
                    },
                },
            },
        ),
    ]


async def handle_sse(request):
    # 定义异步函数handle_sse，处理SSE请求
    # 参数: request - HTTP请求对象

    async with sse.connect_sse(
        request.scope, request.receive, request._send
    ) as streams:
        # 建立SSE连接，获取输入输出流
        await app.run(
            streams[0], streams[1], app.create_initialization_options()
        )  # 运行MCP应用，处理SSE连接


starlette_app = Starlette(
    debug=True,  # 启用调试模式
    routes=[
        Route("/sse", endpoint=handle_sse),  # 设置/sse路由，处理函数为handle_sse
        Mount(
            "/messages/", app=sse.handle_post_message
        ),  # 挂载/messages/路径，处理POST消息
    ],
)  # 创建Starlette应用实例，配置路由

import uvicorn  # 导入uvicorn ASGI服务器

uvicorn.run(
    starlette_app, host="127.0.0.1", port=3001
)  # 运行Starlette应用，监听127.0.0.1和指定端口
