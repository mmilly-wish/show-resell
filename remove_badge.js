const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

const searchString = "document.getElementById('tt-pct').innerHTML = '+' + p + '% ' + badge + countBadge;";
const replaceString = "document.getElementById('tt-pct').innerHTML = '+' + p + '% ' + countBadge;";
html = html.replace(searchString, replaceString);

const searchBadge = "var badge = minTicket.source === 'kr' ? '<span style=\"color:#00e676;\">[kr]</span>' : '<span style=\"color:#ff5252;\">[cn]</span>';";
html = html.replace(searchBadge, "");

fs.writeFileSync('index.html', html, 'utf8');
console.log("Replaced successfully");
