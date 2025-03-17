// search_files.js
// This script provides a function to search files in a directory matching a given pattern,
// and find regex matches within those files, returning the matching content with context.

const fs = require('fs');
const path = require('path');
const glob = require('glob');

/**
 * Searches files in a directory for regex matches
 * @param {Object} options - Search options
 * @param {string} options.input - Directory path to search
 * @param {string} [options.regex="test"] - Regular expression to search for
 * @param {string} [options.file_pattern="*.js"] - File pattern to search within
 * @returns {Array|string} Array of match results or error message
 */
async function main({ input, regex="test", file_pattern="*.js" }) {
  try {
    // Find all files matching the pattern using glob
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
    // Initialize results array and compile regex
    const results = [];
    const regexObj = new RegExp(regex, 'g');

    for (const file of files) {
      // Read file content and search for regex matches
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

    // Return array of match results
    return results;
  } catch (error) {
    console.log(error);
    return error.message;
  }
}

module.exports = { main };