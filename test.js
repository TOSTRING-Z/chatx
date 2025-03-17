const { cliCommand } = require('./cli_command.js');

// 测试命令
cliCommand('dir', process.cwd());

// 保持进程运行
setInterval(() => {}, 1000);