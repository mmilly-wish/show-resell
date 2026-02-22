const fs = require('fs');

const txtPath = 'seat.txt';
if (!fs.existsSync(txtPath)) {
    console.log('File not found:', txtPath);
    process.exit(1);
}

const content = fs.readFileSync(txtPath, 'utf8');
const zonesData = {};
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
            // finding closest y-coordinate
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

        let sbid = parseInt(zoneId) * 10;
        if (isNaN(sbid)) {
            if (zoneId === '별' || zoneId === '★') sbid = 9990;
            else sbid = 1000 + (zoneId.charCodeAt(0) * 10);
        }

        const ss = [];
        for (const [rn, seats] of Object.entries(rows)) {
            for (const [colIdx, s] of seats.entries()) {
                ss.push({ rn: String(rn), cd: { x: s.x, y: s.y } });
            }
        }

        const rowCount = Object.keys(rows).length;
        const maxCols = Math.max(...Object.values(rows).map(s => s.length));

        totalSeats += ss.length;

        zonesData[zoneId] = {
            seatData: {
                st: [{ sbid, ss }],
                da: {
                    sb: [{
                        cc: maxCols,
                        cd: { x: minX, y: minY, w: maxX - minX, h: maxY - minY },
                        css: 2,
                        rt: 0,
                        sbt: "SE0001",
                        ls: "0",
                        sntv: { a: zoneId, f: floor },
                        it: "number",
                        iv: "1",
                        ssn: 1,
                        rc: rowCount,
                        rss: 2,
                        sst: "",
                        spt: "SP0001",
                        snt: "SN0004",
                        if: "Y",
                        sbid
                    }]
                }
            }
        };
        console.log(`구역 ${zoneId} (Floor ${floor}) 처리 완료 (좌석 수: ${ss.length})`);
    }
}

let injectScript = '\n\n// ─── [AUTO-GENERATED: ALL ZONES] start ───────────────────────────\n';
for (const [zoneId, data] of Object.entries(zonesData)) {
    injectScript += `parseSeatCallbackData(${JSON.stringify(data)});\n`;
}
injectScript += '// ─── [AUTO-GENERATED: ALL ZONES] end ───────────────────────────\n\n';

fs.writeFileSync('inject_seats.js', injectScript);
console.log(`완료: 총 ${Object.keys(zonesData).length}개 구역 처리 완료, 전체 좌석 수: ${totalSeats}`);

let index = fs.readFileSync('index.html', 'utf8');
const markerStart = '// ─── 임시 API 응답 데이터 (17, 28구역 외) ──────────────';
const m1 = index.indexOf(markerStart);
const markerEnd = 'const PROD_DATA';
const m2 = index.indexOf(markerEnd);

if (m1 !== -1 && m2 !== -1) {
    let head = index.substring(0, m1 + markerStart.length);
    let tail = index.substring(m2);
    let newIndex = head + '\n' + injectScript + '\n\n' + tail;
    fs.writeFileSync('index.html', newIndex);
    console.log('RE-INJECTED seats into index.html successfully with FLOOR zones!');
} else {
    console.log('Markers not found in index.html for insertion.');
}
