// 引入child_process模块中的spawn和exec方法，用于创建子进程执行命令
const { spawn } = require('child_process');

/**
 * 打开控制台并执行命令
 * @param {string} command - 要在控制台中执行的命令，默认为'dir'（Windows）
 * @description 此函数根据当前操作系统类型，打开终端并执行指定命令
 * Windows系统使用cmd.exe，MacOS使用Terminal.app，Linux使用x-terminal-emulator
 */
function openConsole(command = 'dir') {
  return new Promise((resolve, reject) => {
    if (process.platform === 'win32') {
      const child = spawn('cmd', ['/c', 'start', 'cmd.exe', '/k', command], { stdio: 'pipe', shell: true });
      
      let output = '';
      child.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      child.stderr.on('data', (data) => {
        output += data.toString();
      });
      
      child.on('close', (code) => {
        if (code === 0) {
          resolve(output);
        } else {
          reject(new Error(`Command failed with exit code ${code}`));
        }
      });
    } else if (process.platform === 'darwin') {
      const child = spawn('open', ['-a', 'Terminal', '.', '-e', command], { stdio: 'pipe', shell: true });
      
      let output = '';
      child.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      child.stderr.on('data', (data) => {
        output += data.toString();
      });
      
      child.on('close', (code) => {
        if (code === 0) {
          resolve(output);
        } else {
          reject(new Error(`Command failed with exit code ${code}`));
        }
      });
    } else {
      const child = spawn('x-terminal-emulator', ['-e', command], { stdio: 'pipe', shell: true });
      
      let output = '';
      child.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      child.stderr.on('data', (data) => {
        output += data.toString();
      });
      
      child.on('close', (code) => {
        if (code === 0) {
          resolve(output);
        } else {
          reject(new Error(`Command failed with exit code ${code}`));
        }
      });
    }
  });
}

// 导出函数，供其他模块使用
module.exports = { openConsole };