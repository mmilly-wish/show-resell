const fs = require('fs');

let index = fs.readFileSync('index.html', 'utf8');
let injectScript = fs.readFileSync('inject_seats.js', 'utf8');

const marker = '// ─── 임시 API 응답 데이터 (17, 28구역 외) ──────────────';
const m1 = index.indexOf(marker);

const nextMarker = 'const PROD_DATA';
const m2 = index.indexOf(nextMarker);

if (m1 !== -1 && m2 !== -1) {
    let head = index.substring(0, m1 + marker.length);
    let tail = index.substring(m2);
    let newIndex = head + '\n' + injectScript + '\n\n' + tail;
    fs.writeFileSync('index.html', newIndex);
    console.log('RE-INJECTED seats into index.html successfully');
} else {
    console.log('Markers not found. m1:', m1, 'm2:', m2);
}
