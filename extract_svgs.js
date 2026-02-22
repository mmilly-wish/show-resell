const fs = require('fs');
const path = require('path');
const logDir = 'C:\\\\Users\\\\rudal\\\\.gemini\\\\antigravity\\\\brain\\\\16f872b6-1c96-47ac-9bf4-46939b088cfa\\\\.system_generated\\\\logs';
const files = fs.readdirSync(logDir).filter(f => f.endsWith('.txt')).map(f => path.join(logDir, f));
files.sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);

// The latest log might not be the one with the SVGs if the session just rolled over. 
// So we read the latest few until we find them.
let found = 0;
for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    const zones = ['37', '36', '35'];
    for (const z of zones) {
        // Look for "37구역" followed by "<svg"
        const idx = content.indexOf(z + '구역');
        if (idx !== -1) {
            const svgStart = content.indexOf('<svg', idx);
            const svgEnd = content.indexOf('</svg>', svgStart);
            if (svgStart !== -1 && svgEnd !== -1) {
                let svg = content.substring(svgStart, svgEnd + 6);
                // Save only if it looks like a valid SVG and we haven't saved it yet
                const outPath = 'zone' + z + '.svg';
                if (!fs.existsSync(outPath) && svg.length > 100) {
                    fs.writeFileSync(outPath, svg);
                    console.log('Wrote', outPath, svg.length, 'bytes');
                    found++;
                }
            }
        }
    }
    if (found === 3) break;
}
console.log('Done extracting SVGs. Found:', found);
