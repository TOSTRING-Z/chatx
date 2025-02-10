document.getElementById('search-form').addEventListener('submit', async (e) => {
    e.preventDefault()
    
    const keyword = document.getElementById('keyword').value
    const numResults = document.getElementById('num-results').value || 10
    const resultsDiv = document.getElementById('results')
    const loading = document.getElementById('loading')
  
    loading.style.display = 'block'
    resultsDiv.innerHTML = ''
  
    try {
      const results = await window.electronAPI.search({
        keyword,
        numResults: parseInt(numResults)
      })
  
      resultsDiv.innerHTML = results.map(result => `
        <div class="result-item">
          <div class="rank">#${result.rank}</div>
          <h3><a href="${result.url}" target="_blank">${result.title}</a></h3>
          <div class="url">${result.url}</div>
          <p class="abstract">${result.abstract}</p>
        </div>
      `).join('')
    } catch (error) {
      resultsDiv.innerHTML = `<div class="error">搜索失败: ${error.message}</div>`
    } finally {
      loading.style.display = 'none'
    }
  })