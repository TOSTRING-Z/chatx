const { searchFiles } = require('./search_files');

async function testSearch() {
  try {
    const results = await searchFiles({
      path: 'C:/Users/Administrator/Desktop/Document/chatx/resource/plugins/script',
      regex: 'match.*',
      file_pattern: '*.js'
    });

    console.log('Search Results:', results);
  } catch (error) {
    console.error('Error during search:', error);
  }
}

testSearch();