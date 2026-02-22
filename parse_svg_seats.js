// parse_svg_seats.js
// 멜론 티켓 SVG 좌석 데이터 파서
// usage: node parse_svg_seats.js

// ── 각 구역의 SVG viewBox & 원시 데이터 ────────────
// rect: fill="#DDDDDD" → 좌석
// text: row number label (y 기준으로 행 매핑)

// SVG를 파싱하기 위한 간단한 regex 기반 파서
function parseSVGSeats(svgText, zoneId, floor) {
  // 1) rect 요소에서 x,y 추출 (fill="#DDDDDD" 인 것만)
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

  // 2) text 요소에서 row number와 y 추출
  const rowMap = {}; // y → row number
  const textRe = /<text[^>]*y="([\d.]+)"[^>]*>.*?<tspan[^>]*>([\d]+)<\/tspan>/gi;
  while ((m = textRe.exec(svgText)) !== null) {
    const textY = parseFloat(m[1]);
    const rowNum = parseInt(m[2]);
    rowMap[textY] = rowNum;
  }

  // 3) text y → nearest rect y 매핑
  // text y는 약간 아래에 위치 (y_text ≈ y_rect + 9 정도)
  const textYs = Object.keys(rowMap).map(Number).sort((a, b) => a - b);
  const rectYsUniq = [...new Set(rects.map(r => r.y))].sort((a, b) => a - b);

  // 행 y 매핑: 각 text y에 가장 가까운 rect y를 매핑
  const rectYToRow = {};
  for (const ty of textYs) {
    let best = null, bestDist = Infinity;
    for (const ry of rectYsUniq) {
      const d = Math.abs(ry - (ty - 9));
      if (d < bestDist) { bestDist = d; best = ry; }
    }
    if (best !== null) rectYToRow[best] = rowMap[ty];
  }

  // 4) 행별로 좌석 그룹화
  const rows = {};
  for (const rect of rects) {
    const row = rectYToRow[rect.y];
    if (row === undefined) continue;
    if (!rows[row]) rows[row] = [];
    rows[row].push({ x: rect.x, y: rect.y });
  }

  // 각 행 x 기준 정렬
  for (const r of Object.keys(rows)) {
    rows[r].sort((a, b) => a.x - b.x);
  }

  // 5) blockBounds 계산
  const allX = rects.map(r => r.x);
  const allY = rects.map(r => r.y);
  const minX = Math.min(...allX), maxX = Math.max(...allX) + 11;
  const minY = Math.min(...allY), maxY = Math.max(...allY) + 11;

  // 6) parseSeatCallbackData 형식으로 출력
  const sbid = parseInt(zoneId) * 10; // 임의 sbid
  const ss = [];
  for (const [rn, seats] of Object.entries(rows)) {
    for (const s of seats) {
      ss.push({ rn, cd: { x: s.x, y: s.y } });
    }
  }

  const rowCount = Object.keys(rows).length;
  const maxCols = Math.max(...Object.values(rows).map(s => s.length));

  const data = {
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

  console.log(`\n// ─── ${zoneId}구역 (${floor}층) ───────────────────────────`);
  console.log(`// 행수: ${rowCount}, 최대열수: ${maxCols}, 총좌석: ${ss.length}`);
  console.log(`// bounds: x=${minX.toFixed(2)}, y=${minY.toFixed(2)}, w=${(maxX-minX).toFixed(2)}, h=${(maxY-minY).toFixed(2)}`);
  console.log(`parseSeatCallbackData(${JSON.stringify(data)});`);
}

// ── 구역별 SVG 파일 읽기 ─────────────────────────────
const fs = require('fs');
const path = require('path');

const dir = __dirname;

['37', '36', '35'].forEach(zoneId => {
  const file = path.join(dir, `zone${zoneId}.svg`);
  if (fs.existsSync(file)) {
    const svg = fs.readFileSync(file, 'utf8');
    const floor = zoneId === '37' || zoneId === '36' || zoneId === '35' ? '3' : '2';
    parseSVGSeats(svg, zoneId, floor);
  } else {
    console.error(`파일 없음: ${file}`);
  }
});
