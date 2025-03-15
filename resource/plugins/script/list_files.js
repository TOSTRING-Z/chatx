const fs = require('fs');
const path = require('path');

function main({ input, recursive = false }) {
  try {
    const items = fs.readdirSync(input);
    const result = [];

    items.forEach(item => {
      const fullPath = path.join(input, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory() && recursive) {
        result.push(...listFiles(fullPath, recursive));
      } else {
        result.push(fullPath);
      }
    });

    return result;
  } catch (error) {
    console.error(`Error listing files in ${input}:`, error);
    return [];
  }
}

module.exports = { main };