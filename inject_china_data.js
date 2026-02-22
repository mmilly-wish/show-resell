const fs = require('fs');

let html = fs.readFileSync('index.html', 'utf8');
const chinaDataStr = fs.readFileSync('china_full_data.txt', 'utf8');

// The replacement function signature
const markerStart = "// 1. 초기 정적 데이터 로드";

// Create string to inject
const injection = `
    const CHINA_INITIAL_DATA = ${chinaDataStr};

    ${markerStart}`;

// Avoid multiple injections
if (!html.includes('const CHINA_INITIAL_DATA =')) {
    html = html.replace(markerStart, injection);
    fs.writeFileSync('index.html', html, 'utf8');
    console.log('Successfully injected CHINA_INITIAL_DATA into index.html!');
} else {
    // If it already exists, replace it
    const startIdx = html.indexOf('const CHINA_INITIAL_DATA =');
    const endIdx = html.indexOf(markerStart);
    if (startIdx !== -1 && endIdx !== -1) {
        let head = html.substring(0, startIdx);
        let tail = html.substring(endIdx);
        let newHtml = head + injection + tail.substring(markerStart.length);
        fs.writeFileSync('index.html', newHtml, 'utf8');
        console.log('Successfully updated CHINA_INITIAL_DATA in index.html!');
    } else {
        console.log('CHINA_INITIAL_DATA already exists but failed to update.');
    }
}
