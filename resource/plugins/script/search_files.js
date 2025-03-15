const fs = require('fs');
const path = require('path');
const glob = require('glob');

async function main({ input, regex="test", file_pattern="*.js" }) {
  try {
    const files = await new Promise((resolve, reject) => {
      glob(file_pattern, { cwd: input, nodir: true, absolute: true }, (err, matches) => {
        if (err) {
          reject(new Error(`Glob error: ${err.message}`));
        } else {
          resolve(matches);
        }
      });
    });
    if (!Array.isArray(files)) {
      throw new Error('No files found matching the pattern');
    }
    const results = [];
    const regexObj = new RegExp(regex, 'g');

    for (const file of files) {
      const content = fs.readFileSync(file, 'utf8');
      let match;
      while ((match = regexObj.exec(content)) !== null) {
        const start = Math.max(0, match.index - 50);
        const end = Math.min(content.length, match.index + match[0].length + 50);
        const context = content.substring(start, end);
        results.push({
          file: path.relative(input, file),
          match: match[0],
          context: context,
          line: (content.substring(0, match.index).match(/\n/g) || []).length + 1
        });
      }
    }

    return results;
  } catch (error) {
    throw new Error(`Error searching files: ${error.message}`);
  }
}

module.exports = { main };