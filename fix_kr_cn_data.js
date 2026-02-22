const fs = require('fs');

let html = fs.readFileSync('index.html', 'utf8');
const tbData = fs.readFileSync('ticketbay_full_data.txt', 'utf8').trim();
const cnData = fs.readFileSync('china_full_data.txt', 'utf8').trim();

// 1. Locate the start of RESALE_FULL_DATA_KR
const startMarker = 'const RESALE_FULL_DATA_KR = [';
const startIdx = html.indexOf(startMarker);

if (startIdx === -1) {
    console.error('Could not find const RESALE_FULL_DATA_KR = [ in index.html');
    process.exit(1);
}

// 2. Locate the end of the array, which is before `function updateSeatPremium()`
const endMarker = 'function updateSeatPremium()';
const endIdx = html.indexOf(endMarker, startIdx);

if (endIdx === -1) {
    console.error('Could not find endMarker in index.html');
    process.exit(1);
}

// We need to replace the content between startIdx and endIdx
let newHtml = html.substring(0, startIdx) +
    'const RESALE_FULL_DATA_KR = ' + tbData + ';\n    ' +
    'const RESALE_FULL_DATA_CN = ' + cnData + ';\n\n    ' +
    html.substring(endIdx);

fs.writeFileSync('index.html', newHtml, 'utf8');
console.log('Successfully updated index.html with separate KR and CN data!');
