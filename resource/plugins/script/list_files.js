const fs = require('fs');
const path = require('path');

const EXCLUDE_PATTERNS = [
  // IDE config
  /\/\.vscode\//i,
  /\/\.idea\//i,
  // Cache
  /\/\.cache\//i,
  /\/\.npm\//i,
  // Test
  /\/__tests__\//i,
  /\/coverage\//i,
  // library
  /\/node_modules\//i,
  /\/venv\//i,
  // Logs
  /\.log(\.\d+)?$/i,
  // Media
  /\.(gif|mp4|mov|avi)$/i,
  // Binaries
  /\.(exe|dll|so|a)$/i,
  // Documents
  /\.(pptx?)$/i,
  // Hidden files and directories
  /\/\.[^\/]+\//i,
  /\/\.\w+$/i,
  // Build directories
  /\/(dist|build|__pycache__)\//i,
  // Dependency management
  /\/bower_components\//i,
  /\/\.git\//i,
  // Temporary files and directories
  /\/(\.tmp|temp)\//i
];


function shouldExclude(path) {
  return EXCLUDE_PATTERNS.some(pattern => pattern.test(path.replaceAll("\\", "/")));
}


function main(params) {
  return async ({ input, recursive = false }) => {
    try {
      const items = fs.readdirSync(input);
      const result = [];

      items.forEach(item => {
        const fullPath = path.join(input, item);
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
      console.error(`Error listing files in ${input}:`, error);
      return error.message;
    }
  }
}

if (require.main === module) {
  const input = process.argv[2];
  const recursive = process.argv.includes('--recursive');
  console.log(main({ input, recursive }).join('\n'));
}

module.exports = { main };