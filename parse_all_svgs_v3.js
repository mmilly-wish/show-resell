const fs = require('fs');

const txtPath = 'seat.txt';
if (!fs.existsSync(txtPath)) {
    console.log('File not found:', txtPath);
    process.exit(1);
}

const content = fs.readFileSync(txtPath, 'utf8');

const finalZoneSeatData = {};
let totalSeats = 0;

const lines = content.split('\n');

for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.includes('구역') && line.length < 50) {
        let rawZone = line.replace('구역', '').trim(); // e.g. "37", "FLOOR 층 W"
        let zoneId = rawZone;
        let floor = "2";

        if (rawZone.includes('FLOOR')) {
            zoneId = rawZone.replace(/FLOOR\s*층\s*/i, '').trim();
            floor = "1";
        } else if (parseInt(zoneId) >= 20) {
            floor = "3";
        } else if (zoneId === '별') {
            floor = "1";
        }

        let svgText = '';
        for (let j = i + 1; j < lines.length; j++) {
            const ln = lines[j];
            if (ln.includes('<svg')) {
                svgText = ln;
                if (!svgText.includes('</svg>')) {
                    for (let k = j + 1; k < lines.length; k++) {
                        svgText += '\n' + lines[k];
                        if (lines[k].includes('</svg>')) break;
                    }
                }
                break;
            }
        }

        if (!svgText) continue;

        const rects = [];
        const rectRe = /<rect[^>]*fill="#DDDDDD"[^>]*>/gi;
        let m;
        while ((m = rectRe.exec(svgText)) !== null) {
            const tag = m[0];
            const xm = /\bx="([\d.]+)"/.exec(tag);
            const ym = /\by="([\d.]+)"/.exec(tag);
            if (xm && ym) {
                rects.push({ x: parseFloat(xm[1]), y: parseFloat(ym[1]) });
            }
        }

        const rowMap = {};
        const textRe = /<text[^>]*y="([\d.]+)"[^>]*>.*?<tspan[^>]*>([A-Za-z0-9가-힣★]+)<\/tspan>/gi;
        while ((m = textRe.exec(svgText)) !== null) {
            const textY = parseFloat(m[1]);
            const rowNum = m[2];
            rowMap[textY] = rowNum;
        }

        const textYs = Object.keys(rowMap).map(Number).sort((a, b) => a - b);
        const rectYsUniq = [...new Set(rects.map(r => r.y))].sort((a, b) => a - b);

        const rectYToRow = {};
        for (const ty of textYs) {
            let best = null, bestDist = Infinity;
            for (const ry of rectYsUniq) {
                const d = Math.abs(ry - (ty - 9));
                if (d < bestDist) { bestDist = d; best = ry; }
            }
            if (best !== null) rectYToRow[best] = rowMap[ty];
        }

        const rows = {};
        for (const rect of rects) {
            const row = rectYToRow[rect.y];
            if (row === undefined) continue;
            if (!rows[row]) rows[row] = [];
            rows[row].push({ x: rect.x, y: rect.y });
        }

        for (const r of Object.keys(rows)) {
            rows[r].sort((a, b) => a.x - b.x);
        }

        const allX = rects.map(r => r.x);
        const allY = rects.map(r => r.y);
        if (allX.length === 0) continue;

        const minX = Math.min(...allX), maxX = Math.max(...allX) + 11;
        const minY = Math.min(...allY), maxY = Math.max(...allY) + 11;

        // Summing seats
        for (const [rn, seats] of Object.entries(rows)) {
            totalSeats += seats.length;
        }

        finalZoneSeatData[zoneId] = {
            blockBounds: { x: minX, y: minY, w: maxX - minX, h: maxY - minY },
            css: 2,
            rows: rows
        };
        console.log(`구역 ${zoneId} (Floor ${floor}) 처리 완료`);
    }
}

let injectScript = '\n\n// ─── [AUTO-GENERATED: ALL ZONES] start ───────────────────────────\n';
injectScript += `const ZONE_SEAT_DATA = ${JSON.stringify(finalZoneSeatData, null, 2)};\n`;
injectScript += '// ─── [AUTO-GENERATED: ALL ZONES] end ───────────────────────────\n\n';

fs.writeFileSync('inject_seats.js', injectScript);
console.log(`완료: 총 ${Object.keys(finalZoneSeatData).length}개 구역 처리 완료, 전체 좌석 수: ${totalSeats}`);

let index = fs.readFileSync('index.html', 'utf8');

// We have the marker from our previous injection:
const sIdx = index.indexOf('// ─── [AUTO-GENERATED: ALL ZONES] start');
if (sIdx !== -1) {
    let head = index.substring(0, sIdx);
    let m2Marker = '    loadInitialData().then(() => {';
    const loadIdx = index.indexOf(m2Marker);
    if (loadIdx !== -1) {
        let tail = index.substring(loadIdx);
        fs.writeFileSync('index.html', head + injectScript + '    ' + tail);
        console.log('RE-INJECTED custom ZONE_SEAT_DATA into index.html successfully!');
    } else {
        console.log('Could not find loadInitialData marker');
    }
} else {
    console.log('Cannot find auto-generated marker.');
}
