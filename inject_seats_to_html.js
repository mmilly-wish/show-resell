const fs = require('fs');

const txtPath = 'seat.txt';
if (!fs.existsSync(txtPath)) {
    console.log('File not found:', txtPath);
    process.exit(1);
}

const content = fs.readFileSync(txtPath, 'utf8');
const zonesData = {};
let totalSeats = 0;

let startIndex = 0;
while (true) {
    const gIdx = content.indexOf('구역', startIndex);
    if (gIdx === -1) break;

    const startNum = Math.max(0, gIdx - 5);
    const substr = content.substring(startNum, gIdx);
    const zoneMatch = substr.match(/([A-Za-z가-힣0-9★]+)$/);

    if (!zoneMatch) {
        startIndex = gIdx + 2;
        continue;
    }
    const zoneId = zoneMatch[1];

    const svgStart = content.indexOf('<svg', gIdx);
    if (svgStart === -1) break;

    const svgEnd = content.indexOf('</svg>', svgStart);
    if (svgEnd === -1) break;

    const svgText = content.substring(svgStart, svgEnd + 6);
    startIndex = svgEnd + 6;

    let floor = '2';
    if (/^[A-Za-z가-힣★]+$/.test(zoneId) || zoneId === '별') {
        floor = '1';
    } else if (parseInt(zoneId) >= 20) {
        floor = '3';
    }

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
    const textRe = /<text[^>]*y="([\d.]+)"[^>]*>.*?<tspan[^>]*>([A-Za-z0-9가-힣]+)<\/tspan>/gi;
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
    console.log(`구역 ${zoneId} 생성 완료 (좌석 수: ${ss.length})`);
}

// --- SYNTHETIC ★ ZONE GENERATION ---
(function () {
    const starZoneId = '★';
    const sbid = 9990;
    const numRows = 5;
    const seatsPerRow = 15;
    const startX = 300;
    const startY = 300;
    const seatSpacingX = 13;
    const seatSpacingY = 13;

    let ss = [];
    let y = startY;

    for (let r = 1; r <= numRows; r++) {
        let x = startX;
        for (let c = 1; c <= seatsPerRow; c++) {
            ss.push({
                x: x, y: y,
                sntv: { a: starZoneId, l: String(r), n: String(c), f: '1' },
                sc: "0"
            });
            x += seatSpacingX;
        }
        y += seatSpacingY;
    }

    zonesData[starZoneId] = {
        seatData: {
            st: [{ sbid, ss }],
            da: {
                sb: [{
                    cc: seatsPerRow,
                    cd: { x: startX, y: startY, w: seatsPerRow * seatSpacingX, h: numRows * seatSpacingY },
                    css: 2,
                    rt: 0,
                    sbt: "SE0001",
                    ls: "0",
                    sntv: { a: starZoneId, f: '1' },
                    it: "number",
                    iv: "1",
                    ssn: 1,
                    rc: numRows,
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
    console.log(`구역 ★ (Synthetic) 생성 완료 (좌석 수: ${ss.length})`);
})();
// -----------------------------------

let injectScript = '\n\/\/ ─── [AUTO-GENERATED: ALL ZONES] ───────────────────────────\n';
for (const [zoneId, data] of Object.entries(zonesData)) {
    injectScript += `parseSeatCallbackData(${JSON.stringify(data)});\n`;
}

// Write to index.html
let index = fs.readFileSync('index.html', 'utf8');

// Replace everything between the API response marker and initialization
const markerStart = '// ─── 임시 API 응답 데이터 (17, 28구역 외) ──────────────';
const markerEnd = '// ─── 초기 구동 ───────────────────────────────────────';

const p1 = index.indexOf(markerStart);
const p2 = index.indexOf(markerEnd);

if (p1 !== -1 && p2 !== -1) {
    let head = index.substring(0, p1 + markerStart.length);
    let tail = index.substring(p2);

    let newIndex = head + '\n' + injectScript + '\n\n' + tail;
    fs.writeFileSync('index.html', newIndex);
    console.log('Successfully injected into index.html: ' + Object.keys(zonesData).length + ' zones, ' + totalSeats + ' seats');
} else {
    console.log('Could not find injection point');
}
