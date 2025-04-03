const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  handleQuery: (callback) => ipcRenderer.on('query', (_event, data) => callback(data)),
  handleOptions: (callback) => ipcRenderer.on('options', (_event, data) => callback(data)),
  handleClear: (callback) => ipcRenderer.on('clear', (_event, value) => callback(value)),
  handleLoad: (callback) => ipcRenderer.on('load', (_event, value) => callback(value)),
  queryText: (data) => ipcRenderer.invoke('query-text', data),
  getFilePath: () => ipcRenderer.invoke('get-file-path'),
  planActMode: (mode) => ipcRenderer.send('plan-act-mode', mode),
  clickSubmit: (formData) => ipcRenderer.send('submit', formData),
  openExternal: (href) => ipcRenderer.send('open-external', href),
  streamMessageStop: (id) => ipcRenderer.send('stream-message-stop', id),
  streamData: (callback) => ipcRenderer.on('stream-data', (_event, chunk) => callback(chunk)),
  infoData: (callback) => ipcRenderer.on('info-data', (_event, info) => callback(info)),
})