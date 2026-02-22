const fs = require('fs');

let html = fs.readFileSync('index.html', 'utf8');

const tbDataRaw = fs.readFileSync('ticketbay_full_data.txt', 'utf8');
const cnDataRaw = fs.readFileSync('china_full_data.txt', 'utf8');

// Parse and Stringify to ensure clean, valid JS representations without encoding weirdness
const tbData = JSON.stringify(JSON.parse(tbDataRaw), null, 2);
const cnData = JSON.stringify(JSON.parse(cnDataRaw), null, 2);

const startMarker = 'const RESALE_FULL_DATA_KR = [';
const startIdx = html.indexOf(startMarker);

const endMarker = "function updateSeatPremium() {";
const endIdx = html.indexOf(endMarker);

if (startIdx === -1 || endIdx === -1) {
    console.error("Could not find start or end markers. startIdx:", startIdx, "endIdx:", endIdx);
    process.exit(1);
}

const functionsToInject = `const RESALE_FULL_DATA_KR = ${tbData};
    const RESALE_FULL_DATA_CN = ${cnData};

    `;

let newHtml = html.substring(0, startIdx) + functionsToInject + html.substring(endIdx);
fs.writeFileSync('index.html', newHtml, 'utf8');

console.log("Successfully rebuilt index.html with clean JSON data!");
