const express = require('express');
const { Client } = require('ssh2');
const WebSocket = require('ws');

const app = express();
const wss = new WebSocket.Server({ port: 8080 });

wss.on('connection', (ws) => {
  const ssh = new Client();

  ws.on('message', (command) => {
    ssh.exec(command, (err, stream) => {
      if (err) throw err;
      stream.on('data', (data) => ws.send(data));
    });
  });

  ssh.connect({
    host: '127.0.0.1',
    username: 'user',
    password: 'pass'
  });
});

app.listen(3000, () => console.log('Backend running on port 3000'));
