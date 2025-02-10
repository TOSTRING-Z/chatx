const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  search: (params) => ipcRenderer.invoke('baidu-search', params)
})