const fs = require('fs');
const path = require('path');

const appContent = fs.readFileSync(path.join(__dirname, '../src/App.jsx'), 'utf8');
const lines = appContent.split('\n');

lines.forEach((line, idx) => {
  if (line.includes('handleSearchGMaps')) {
    console.log(`Line ${idx + 1}: ${line}`);
  }
});
