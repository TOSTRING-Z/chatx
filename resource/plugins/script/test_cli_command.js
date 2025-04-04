/**
 * test_cli_command.js
 * 这个文件用于测试cli_command.js中的openConsole函数的功能。
 * 它执行openConsole函数并打印输出，然后在2秒后退出进程。
 */

import { openConsole } from './cli_command.js';

// 测试初始命令的执行
let output = await openConsole();
console.log(output);

// 设置一个定时器，2秒后退出进程
setTimeout(() => {
  process.exit(0);
}, 2000);