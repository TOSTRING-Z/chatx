const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  handleQuery: (callback) => ipcRenderer.on('query', callback),
  handleTransQuery: (callback) => ipcRenderer.on('trans-query', callback),
  handleResponse: (callback) => ipcRenderer.on('response', callback),
  handleMethod: (callback) => ipcRenderer.on('method', callback),
  handleClear: (callback) => ipcRenderer.on('clear', callback),
  handleLoad: (callback) => ipcRenderer.on('load', callback),
  handlePrompt: (callback) => ipcRenderer.on('prompt', callback),
  clickSubmit: (text) => ipcRenderer.send('submit', text),
})