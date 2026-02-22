const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

const regex = /document\.getElementById\('tt-pct'\)\.textContent = '\+' \+ p \+ '% ~ \+' \+ c\.maxPremium \+ '%';/;

const replacement = `var countText = ' (KR: ' + c.kr + '장, CN: ' + c.cn + '장)';
          document.getElementById('tt-pct').textContent = '+' + p + '% ~ +' + c.maxPremium + '%' + countText;`;

html = html.replace(regex, replacement);

const regexSingle = /document\.getElementById\('tt-pct'\)\.textContent = '\+' \+ p \+ '% ' \+ badge;/;
const replacementSingle = `var countText = ' (KR: ' + c.kr + '장, CN: ' + c.cn + '장)';
          document.getElementById('tt-pct').textContent = '+' + p + '% ' + badge + countText;`;

html = html.replace(regexSingle, replacementSingle);

fs.writeFileSync('index.html', html, 'utf8');
console.log("Appended counts successfully");
