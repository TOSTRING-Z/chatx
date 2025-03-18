const { Client } = require('ssh2');

export class SSHService {
  constructor() {
    this.client = new Client();
    this.stream = null;
    this.isConnected = false; // 添加连接状态
  }

  connect(config, onData, onError, onClose) {
    return new Promise((resolve, reject) => {
        this.client.on('ready', () => {
          this.isConnected = true; // 更新连接状态
          this.client.shell((err, stream) => {
            if (err) {
              onError(err);
              return reject(err);
            }
            this.stream = stream;
            stream.on('data', onData);
            stream.on('close', () => {
              this.isConnected = false; // 更新连接状态
              onClose();
              this.client.end();
            });
            stream.stderr.on('data', onData);
            resolve();
          });
        }).on('error', (err) => {
          this.isConnected = false; // 更新连接状态
          onError(err);
          reject(err);
        }).connect(config);
      });
  }

  sendCommand(command) {
    if (this.stream) {
      this.stream.write(command + '\n');
    }
  }

  disconnect() {
    if (this.isConnected) {
        this.isConnected = false; // 更新连接状态
        this.client.end();
      }
  }
}
