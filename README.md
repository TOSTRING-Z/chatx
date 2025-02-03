# ChatX

![ChatX](source/chatx.png)

ChatX 是一款功能强大的跨平台应用程序，支持 Windows 和 Ubuntu 系统。它集成了多种大模型功能，如 ChatGPT、ChatGLM 和 DeepSeek 等，旨在为用户提供高效、智能的文本处理和翻译服务。

## 主要功能

### 1. 复制翻译

![ChatX](source/chatx-copy.png)

- 支持一键复制文本并自动翻译。
- 支持多语言翻译，满足不同用户的需求。

### 2. 分段组合
- 支持将长文本分段处理，便于逐段翻译或编辑。
- 提供分段组合功能，方便用户将多段文本合并为一个整体。

### 3. 大模型支持
- 集成 ChatGPT、ChatGLM 和 DeepSeek 等大模型，提供智能对话和文本生成功能。
- 支持多种模型切换，用户可以根据需求选择不同的模型进行交互。

### 4. 跨平台支持
- 支持 Windows 和 Ubuntu 系统，确保用户在不同操作系统上都能流畅使用。

### 4. 插件支持
- 支持通过配置文件（~/.chatx/config.json）配置自定义翻译插件。

## 使用场景
- **翻译工作**：快速翻译长篇文章或文档，支持分段翻译和组合。
- **文本编辑**：通过分段组合功能，轻松编辑和整理文本内容。
- **智能对话**：利用大模型功能进行智能对话，获取实时反馈和建议。
- **文字优化**：提升文本质量，适用于写作、报告和邮件等场景。

## 系统要求
- **Windows**：Windows 10 或更高版本。
- **Ubuntu**：Ubuntu 18.04 或更高版本。

## 下载与安装
- 用户可以从官方网站下载适用于 Windows 和 Ubuntu 的安装包，按照提示进行安装即可。

## 未来更新
- 计划增加更多大模型支持，进一步提升智能交互体验。
- 优化用户界面，提供更加友好的操作体验。

ChatX 致力于为用户提供高效、智能的文本处理工具，无论是翻译、编辑还是智能对话，都能满足您的需求。

## 启动 / 编译
```shell
nvm use 23
# 安装环境
npm install
# 启动electron
npm run electron-start
# 打包
npm run package
# or
npm run make
# win
npm run make-win
```

## 配置

### 修改配置文件：~/.chatx/config.json

```json
{
    "models": {
        "chatgpt": {
            "api_url": "https://gptgod.online/api/v1/chat/completions",
            "api_key": "",
            "versions": ["gpt-3.5-turbo","o1-mini-2024-09-12","o1-preview-2024-09-12","gpt-4o-mini","gpt-4o-2024-08-06","gpt-4","gpt-4-turbo-preview"]
        },
        "chatglm": {
            "api_url": "https://open.bigmodel.cn/api/paas/v4/chat/completions",
            "api_key": "",
            "versions": ["glm-4-flash","glm-4-plus","glm-4-0520","glm-4-alltools","glm-4-long","glm-4v-flash","glm-4v-plus"]
        },
        "deepseek": {
            "api_url": "https://api.deepseek.com/chat/completions",
            "api_key": "",
            "versions": ["deepseek-chat","deepseek-reasoner"]
        }
    },
    "plugins": {
        "百度翻译[新]": {
            "path": "/mnt/ubuntu_zgr/install/chatx/plugins/trans_baidu_new.js"
        },
        "百度翻译[旧]": {
            "path": "/mnt/ubuntu_zgr/install/chatx/plugins/trans_baidu_old.js"
        },
        "谷歌翻译": {
            "path": "/mnt/ubuntu_zgr/install/chatx/plugins/trans_google.js"
        },
        "影响因子查询": {
            "path": "/mnt/ubuntu_zgr/install/chatx/plugins/if_pmid.js"
        }
    },
    "default": {
        "model": "chatgpt",
        "version": "gpt-4o-mini",
        "plugin": "百度翻译[新]"
    },
    "short_cut": "CommandOrControl+Shift+M",
    "prompt": "你是一个中英文翻译专家，将用户输入的中文翻译成英文（图片或者文字），或将用户输入的英文翻译成中文。对于非中文内容，它将提供中文翻译结果。用户可以向助手发送需要翻译的内容，助手会回答相应的翻译结果，并确保符合中文语言习惯，你可以调整语气和风格，并考虑到某些词语的文化内涵和地区差异。同时作为翻译家，需将原文翻译成具有信达雅标准的译文。\"信\" 即忠实于原文的内容与意图；\"达\" 意味着译文应通顺易懂，表达清晰；\"雅\" 则追求译文的文化审美和语言的优美。目标是创作出既忠于原作精神，又符合目标语言文化和读者审美的翻译。",
    "memory_length": 10,
    "icon_time": 10
}
```