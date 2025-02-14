const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  handleQuery: (callback) => ipcRenderer.on('query', (_event, data) => callback(data)),
  handleModel: (callback) => ipcRenderer.on('model', (_event, data) => callback(data)),
  handleClear: (callback) => ipcRenderer.on('clear', (_event, value) => callback(value)),
  handleLoad: (callback) => ipcRenderer.on('load', (_event, value) => callback(value)),
  handlePrompt: (callback) => ipcRenderer.on('prompt', (_event, prompt) => callback(prompt)),
  handleMathFormat: (callback) => ipcRenderer.on('math-format', (_event, math_statu) => callback(math_statu)),
  queryText: (data) => ipcRenderer.invoke('query-text', data),
  clickSubmit: (text) => ipcRenderer.send('submit', text),
  openExternal: (href) => ipcRenderer.send('open-external', href),
  captureRegion: (params) => ipcRenderer.invoke('capture-region', params),
  deleteMessage: (id) => ipcRenderer.invoke('delete-message', id),
  streamMessageStop: (id) => ipcRenderer.send('stream-message-stop', id),
  streamData: (callback) => ipcRenderer.on('stream-data', (_event, chunk) => callback(chunk)),
  infoData: (callback) => ipcRenderer.on('info-data', (_event, info) => callback(info)),
})