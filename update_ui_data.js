const fs = require('fs');

let html = fs.readFileSync('index.html', 'utf8');

// 1. Add min-width and overflow to body
html = html.replace(
    /body\s*\{\s*font-family:[^}]*\}/,
    (match) => {
        // Find 'overflow: hidden;' and replace it, then inject min-width
        let newStyle = match.replace(/overflow:\s*hidden;/, 'overflow-x: auto;\n      overflow-y: hidden;\n      min-width: 1100px;');
        return newStyle;
    }
);

if (!html.includes('min-width: 1100px;')) {
    // If regex failed, let's do a more brute-force addition.
    html = html.replace('height: 100vh;', 'height: 100vh;\n      min-width: 1100px;\n      overflow-x: auto;\n      overflow-y: hidden;');
}

// Ensure the #main overflows correctly if the body is scrolling
html = html.replace(/#main\s*\{\s*flex:\s*1;\s*display:\s*flex;\s*overflow:\s*hidden;\s*\}/, '#main {\n      flex: 1;\n      display: flex;\n      overflow: hidden;\n      min-width: 1100px;\n    }');


// 2. Remove the Sync button
const syncBtnRegex = /<button class="refresh-btn" id="sync-btn"[^>]*>.*?(?:\n.*?)*<\/button>/m;
html = html.replace(syncBtnRegex, '');


// 3. Embed JSON
const jsonData = fs.readFileSync('ticketbay_initial.json', 'utf8');

const replacementFunc = `
    const TICKETBAY_INITIAL_DATA = ${jsonData};

    // 1. 초기 정적 데이터 로드
    async function loadInitialData() {
      try {
        const raw = TICKETBAY_INITIAL_DATA;
        if (raw.length > 0 && raw[0].location !== undefined) {
          allListingsRaw = raw.map(parseTicketbayItem).filter(Boolean);
          console.log(\`✅ ticketbay_initial.json 파싱 완료: \${allListingsRaw.length}건 / 원본 \${raw.length}건\`);
        } else {
          allListingsRaw = raw;
        }
      } catch (e) {
        console.warn('정적 데이터 로드 실패', e);
        allListingsRaw = [];
      }
      applyDateFilter(); // 날짜 필터 적용 → updateSeatPremium() 내부 호출
    }
`;

// Find the existing loadInitialData function and replace it
const oldFuncRegex = /\/\/ 1\. 초기 정적 데이터 로드\s*async function loadInitialData\(\) \{[\s\S]*?applyDateFilter\(\); \/\/ 날짜 필터 적용 → updateSeatPremium\(\) 내부 호출\s*\}/m;

if (oldFuncRegex.test(html)) {
    html = html.replace(oldFuncRegex, replacementFunc);
    fs.writeFileSync('index.html', html, 'utf8');
    console.log('Successfully injected TICKETBAY_INITIAL_DATA and removed sync button!');
} else {
    console.log('Failed to match loadInitialData function.');
}

