const fs = require('fs');
let index = fs.readFileSync('index.html', 'utf8');
let injectScript = fs.readFileSync('inject_seats.js', 'utf8');

const sIdx = index.indexOf('// ─── [AUTO-GENERATED: ALL ZONES]');

if (sIdx !== -1) {
    let head = index.substring(0, sIdx);
    let m2Marker = '    loadInitialData().then(() => {';
    const loadIdx = index.indexOf(m2Marker);
    if (loadIdx !== -1) {
        let tail = index.substring(loadIdx);
        fs.writeFileSync('index.html', head + injectScript + '\n' + tail);
        console.log('Successfully re-injected all seats into index.html');
    } else {
        console.log('Could not find loadInitialData marker');
    }
} else {
    console.log('Cannot find auto-generated marker.');
}
