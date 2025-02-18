// renderer.js (渲染进程)
window.memoryAPI.initialize().then(() => {
    // 集成到LLM对话
    async function chatWithMemory(userInput) {
      // 检索相关记忆
      const memories = await window.memoryAPI.searchMemory(userInput)
      
      // 构建记忆上下文
      const context = memories
        .sort((a, b) => b.score - a.score)
        .map(m => `[Related Memory]: ${m.text}`)
        .join('\n')
  
      // 调用LLM接口
      const response = await fetchLLMResponse(
        `Context:\n${context}\n\nQuestion: ${userInput}`
      )
  
      // 存储新记忆（带重要性评估）
      const importance = calculateImportance(userInput, response)
      await window.memoryAPI.addMemory(userInput, { importance })
      
      return response
    }
  
    function calculateImportance(text, response) {
      // 基于文本长度、响应复杂度、情感分析的综合评估
      return Math.min(1, 
        text.length / 200 + 
        response.complexity * 0.3 +
        sentimentAnalysis(text).score * 0.2
      )
    }
  })