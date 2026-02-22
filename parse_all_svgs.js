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
    // 매치 조건: 한글, 영문, 숫자
    const zoneMatch = substr.match(/([A-Za-z가-힣0-9]+)$/);

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

    // 1층(플로어) 판별: 알파벳이거나 '별'이거나 하는 숫자가 아닌 경우 등
    let floor = '2';
    if (/^[A-Za-z가-힣]+$/.test(zoneId) || zoneId === '별') {
        floor = '1'; // 플로어
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
        const rowNum = m[2]; // 열 번호 문자 그대로 저장
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

    // sbid는 문자일 경우 해시값이나 임의의 숫자를 사용. ticketbay_initial.json에서 영문/한글 구역 사용.
    // parseSeatCallbackData용 임의의 숫자 ID가 필요함.
    let sbid = parseInt(zoneId) * 10;
    if (isNaN(sbid)) {
        // A=1000, B=1010 ... 별=9990
        if (zoneId === '별') sbid = 9990;
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

    console.log(`구역 ${zoneId} 설정완료... (floor: ${floor}, sbid: ${sbid}, rows: ${rowCount}, seats: ${ss.length})`);
}

console.log(`총 ${Object.keys(zonesData).length}개 구역 처리 완료, 전체 좌석 수: ${totalSeats}`);

let injectScript = '\n\n// ─── [AUTO-GENERATED: ALL ZONES] ───────────────────────────\n';
for (const [zoneId, data] of Object.entries(zonesData)) {
    injectScript += `parseSeatCallbackData(${JSON.stringify(data)});\n`;
}
fs.writeFileSync('inject_seats.js', injectScript);
console.log('Saved inject_seats.js');
