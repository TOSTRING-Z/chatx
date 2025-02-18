// main.js (主进程)
const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const { HNSWLib } = require("hnswlib-node")
const { pipeline } = require('@xenova/transformers')

class ElectronVectorMemory {
  constructor() {
    this.index = null
    this.embedder = null
    this.storagePath = path.join(app.getPath('userData'), 'memory_db')
    this.memoryData = []
  }

  async initialize() {
    try {
      // 加载本地模型
      this.embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2')
      
      // 尝试加载已有索引
      const exists = await fs.pathExists(this.storagePath)
      if (exists) {
        const [indexBuffer, dataBuffer] = await Promise.all([
          fs.readFile(path.join(this.storagePath, 'index.bin')),
          fs.readFile(path.join(this.storagePath, 'data.json'))
        ])
        this.index = new HNSWLib('cosine', 384)
        await this.index.readIndex(indexBuffer)
        this.memoryData = JSON.parse(dataBuffer)
      } else {
        this.index = new HNSWLib('cosine', 384)
        await this.index.initIndex(1000)
      }
    } catch (error) {
      console.error('Memory init failed:', error)
    }
  }

  // 持久化存储
  async persist() {
    await fs.ensureDir(this.storagePath)
    const indexBuffer = await this.index.writeIndex()
    await Promise.all([
      fs.writeFile(path.join(this.storagePath, 'index.bin'), indexBuffer),
      fs.writeFile(path.join(this.storagePath, 'data.json'), JSON.stringify(this.memoryData))
    ])
  }
}

// 初始化主进程存储实例
let memorySystem = null
ipcMain.handle('memory:init', async () => {
  memorySystem = new ElectronVectorMemory()
  await memorySystem.initialize()
})

ipcMain.handle('memory:add', async (_, { text, metadata }) => {
  const embedding = await memorySystem.embedder(text)
  memorySystem.index.addPoint(embedding, memorySystem.memoryData.length)
  memorySystem.memoryData.push({
    text,
    embedding: Array.from(embedding.data),
    timestamp: Date.now(),
    ...metadata
  })
  await memorySystem.persist()
})

ipcMain.handle('memory:search', async (_, query) => {
  const queryEmbedding = await memorySystem.embedder(query)
  const results = memorySystem.index.searchKnn(queryEmbedding, 5)
  return results.neighbors.map(index => ({
    text: memorySystem.memoryData[index].text,
    score: 1 - results.distances[index]
  }))
})