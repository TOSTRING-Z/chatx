
const { searchFiles } = require('C:/Users/Administrator/Desktop/Document/chatx/resource/plugins/script/search_files.js');
async function testSearch() {
  const results = await searchFiles({
    path: 'C:/Users/Administrator/Desktop/Document/chatx/resource/plugins/script',
    regex: 'match*',
    file_pattern: '*.js'
  });
  console.log(results);
}
testSearch();
