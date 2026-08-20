const c = require('../coverage/coverage-final.json');
const files = Object.keys(c);

console.log('Total files in coverage:', files.length);
console.log('\nBreakdown by category:');

const categories = {};
files.forEach(f => {
  const normalized = f.replace(/\\/g, '/');
  const parts = normalized.split('/src/');
  if (parts[1]) {
    const cat = parts[1].split('/')[0];
    categories[cat] = (categories[cat] || 0) + 1;
  }
});

Object.entries(categories).sort((a,b) => b[1] - a[1]).forEach(([cat, count]) => {
  console.log(cat.padEnd(20), count);
});
