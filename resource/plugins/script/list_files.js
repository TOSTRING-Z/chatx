const fs = require('fs');
const path_ = require('path');

const EXCLUDE_PATTERNS = [
  // IDE config
  /\/\.vscode\//i,
  /\/\.idea\//i,
  // Cache
  /\/\.cache\//i,
  /\/\.npm\//i,
  // Media
  /\.(gif|mp4|mov|avi)$/i,
  // Binaries
  /\.(exe|dll|so|a)$/i,
  // Documents
  /\.(pptx?)$/i,
];


function shouldExclude(path) {
  return EXCLUDE_PATTERNS.some(pattern => pattern.test(path.replaceAll("\\", "/")));
}


function main(params) {
  return async ({ path, recursive = false }) => {
    try {
      const items = fs.readdirSync(path);
      const result = [];

      items.forEach(item => {
        const fullPath = path_.join(path, item);
        if (shouldExclude(fullPath)) return;

        const stat = fs.statSync(fullPath);

        if (stat.isDirectory() && recursive) {
          result.push(...main({ input: fullPath, recursive }));
        } else {
          result.push(fullPath);
        }
      });
      if (result.length > params.threshold) {
        return '返回内容过多,请尝试其它方案!';
      }
      return result;
    } catch (error) {
      console.error(`Error listing files in ${path}:`, error);
      return error.message;
    }
  }
}

if (require.main === module) {
  const input = process.argv[2];
  const recursive = process.argv.includes('--recursive');
  console.log(main({ input, recursive }).join('\n'));
}

function getPrompt() {
  const prompt = `## list_files
描述: 请求列出指定目录中的文件和目录.不要使用此工具来确认您可能创建的文件的存在,因为用户会让您知道文件是否已成功创建.
参数:
- path: (需要)需要读取的文件夹路径
- recursive: (可选)true或false,如果recursive为true,它将递归列出所有文件和目录.如果递归为false或未提供,则它将仅列出顶级内容.
使用:
{
    "thinking": "[思考过程]"
    "tool": "list_files",
    "params": {
        {
            "path": "[value]",
            "recursive": [value],
        }
    }
}`
  return prompt
}

module.exports = {
  main, getPrompt
};