<template>
  <div class="term-page">
    <el-form :model="ruleForm" @submit.native.prevent="setupSSHConnection()">
      <el-form-item label="主机：" prop="host">
        <el-input v-model="ruleForm.host" placeholder="请输入主机"></el-input>
      </el-form-item>
      <el-form-item label="用户名：" prop="username">
        <el-input v-model="ruleForm.username" placeholder="请输入用户名"></el-input>
      </el-form-item>
      <el-form-item label="密码：" prop="password">
        <el-input v-model="ruleForm.password" type="password" placeholder="请输入密码"></el-input>
      </el-form-item>
      <el-form-item label="端口：" prop="port">
        <el-input v-model="ruleForm.port" placeholder="请输入端口"></el-input>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" native-type="submit">创建连接</el-button>
        <el-button type="primary" @click="disConnectSSH" :disabled="!connected">断开连接</el-button>
      </el-form-item>
    </el-form>
    <div id="terminal-container">
      <div id="terminal"></div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { SSHService } from '../services/sshService';

export default defineComponent({
  name: 'Terminal',
  data() {
    return {
      terminal: null as Terminal | null,
      sshService: null as SSHService | null,
      connected: false,
      ruleForm: {
        host: '127.0.0.1',
        username: 'tostring',
        password: 'root',
        port: 22
      },
    };
  },
  mounted() {
    this.setupTerminal();
  },
  methods: {
    // 初始化 xterm 终端
    setupTerminal() {
      const fitAddon = new FitAddon();
      const terminal = new Terminal({
        cursorBlink: true,
        fontSize: 14,
      });
      this.terminal = terminal;
      this.terminal.loadAddon(fitAddon);
      const terminalElement = document.getElementById('terminal');
      this.terminal.open(terminalElement!); // Using non-null assertion operator
      fitAddon.fit();
    },
    // 设置 SSH 连接
    setupSSHConnection() {
      const config = {
        host: this.ruleForm.host,
        port: this.ruleForm.port,
        username: this.ruleForm.username,
        password: this.ruleForm.password,
      };
      this.sshService = new SSHService();
      // 建立连接并处理数据
      this.sshService.connect(
        config,
        (data: string | Uint8Array) => this.terminal?.write(data),
        (error: Error | undefined) => this.terminal?.write(`\r\nError: ${error?.message}`),
        () => this.terminal?.write('\r\nConnection closed.')
      ).then(() => {
        this.connected = !!this.sshService?.isConnected;
      });
    },
    // 断开 SSH 连接
    disConnectSSH() {
      if (this.sshService) {
        this.sshService.disconnect();
        this.connected = false;
      }
    },
  }
});
</script>../../ws/sshService
