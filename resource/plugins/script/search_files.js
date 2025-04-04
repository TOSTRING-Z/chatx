// search_files.js
// This script provides a function to search files in a directory matching a given pattern,
// and find regex matches within those files, returning the matching content with context.

const fs = require('fs');
const path = require('path');
const glob = require('glob');

/**
 * Searches files in a directory for regex matches
 * @param {Object} options - Search options
 * @param {string} options.path - Directory path to search
 * @param {string} [options.regex="test"] - Regular expression to search for
 * @param {string} [options.file_pattern="*.js"] - File pattern to search within
 * @returns {Array|string} Array of match results or error message
 */
async function main({ path, regex="test", file_pattern="*.js" }) {
  try {
    // Find all files matching the pattern using glob
    const files = await new Promise((resolve, reject) => {
      glob(file_pattern, { cwd: path, nodir: true, absolute: true }, (err, matches) => {
        if (err) {
          reject(new Error(`Glob error: ${err.message}`));
        } else {
          resolve(matches);
        }
      });
    });
    if (!Array.isArray(files)) {
      throw new Error('No files found matching the pattern');
    }
    // Initialize results array and compile regex
    const results = [];
    const regexObj = new RegExp(regex, 'g');

    for (const file of files) {
      // Read file content and search for regex matches
      const content = fs.readFileSync(file, 'utf8');
      let match;
      while ((match = regexObj.exec(content)) !== null) {
        const start = Math.max(0, match.index - 50);
        const end = Math.min(content.length, match.index + match[0].length + 50);
        const context = content.substring(start, end);
        results.push({
          file: path.relative(path, file),
          match: match[0],
          context: context,
          line: (content.substring(0, match.index).match(/\n/g) || []).length + 1
        });
      }
    }

    // Return array of match results
    return results;
  } catch (error) {
    console.log(error);
    return error.message;
  }
}

function getPrompt() {
  const prompt = `## search_files 
描述: 请求在指定目录中对文件执行正则表达式搜索,提供上下文丰富的结果.此工具在多个文件中搜索模式或特定内容,显示每个匹配项及其封装上下文.
参数:
path: 要搜索的目录路径.此目录将被递归搜索. 
regex: 要搜索的正则表达式模式.使用 NodeJs 正则表达式语法. 
file_pattern: 用于过滤文件的 Glob 模式(例如,'*.ts' 用于 TypeScript 文件).
使用:
{
    "thinking": "[思考过程]"
    "tool": "search_files",
    "params": {
        {
            "path": "[value]",
            "regex": "[value]",
            "file_pattern": "[value]"
        }
    }
}`
  return prompt
}

module.exports = {
  main, getPrompt
};