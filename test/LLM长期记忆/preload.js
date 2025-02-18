// preload.js (预加载脚本)
const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('memoryAPI', {
  initialize: () => ipcRenderer.invoke('memory:init'),
  addMemory: (text, metadata) => ipcRenderer.invoke('memory:add', { text, metadata }),
  searchMemory: query => ipcRenderer.invoke('memory:search', query)
})