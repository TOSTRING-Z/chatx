<template>
  <div class="term-page">
    <el-form :model="ruleForm" @submit.native.prevent="">
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
        <el-button type="primary" @click="" :disabled="!connected">断开连接</el-button>
      </el-form-item>
    </el-form>
    <div id="terminal-container">
      <div id="terminal"></div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'Terminal',
  data() {
    return {
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
  },
  methods: {
  }
});
</script>
