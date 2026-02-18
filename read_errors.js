import fs from 'fs';
const content = fs.readFileSync('errors_final.txt', 'utf8');
console.log('--- START ---');
console.log(content);
console.log('--- END ---');
