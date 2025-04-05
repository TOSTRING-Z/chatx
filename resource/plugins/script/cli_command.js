// Import spawn and exec methods from child_process module for creating child processes to execute commands
const { spawn } = require('child_process');

/**
 * Open console and execute command
 * @param {string} command - Command to be executed in console, default is 'dir' (Windows)
 * @description This function opens a terminal and executes the specified command based on the current OS type
 * Windows uses cmd.exe, MacOS uses Terminal.app, Linux uses x-terminal-emulator
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

// Export function for use by other modules
module.exports = { openConsole };