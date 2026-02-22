const fs = require('fs');

let html = fs.readFileSync('index.html', 'utf8');

const tbData = fs.readFileSync('ticketbay_full_data.txt', 'utf8').trim();
const cnData = fs.readFileSync('china_full_data.txt', 'utf8').trim();

// 1. Locate start of RESALE_FULL_DATA_KR
const startMarker = 'const RESALE_FULL_DATA_KR = [';
const startIdx = html.indexOf(startMarker);

// 2. Locate the broken fragment left behind
const endMarker = "    ttEl.style.left = x + 'px'; ttEl.style.top = y + 'px';";
const endIdx = html.indexOf(endMarker);

if (startIdx === -1 || endIdx === -1) {
  console.error("Could not find start or end markers. startIdx:", startIdx, "endIdx:", endIdx);
  process.exit(1);
}

const functionsToInject = `
    const RESALE_FULL_DATA_KR = ${tbData};
    const RESALE_FULL_DATA_CN = ${cnData};

    function updateSeatPremium() {
      for (var k in seatPremiumMap) delete seatPremiumMap[k];
      for (var k in seatMinPriceMap) delete seatMinPriceMap[k];
      for (var k in seatCountMap) delete seatCountMap[k];
      if (!runtimeListings.length) return;
      var g = {};
      runtimeListings.forEach(function (it) {
        var k = it.zone + '-' + it.row;
        if (!g[k]) g[k] = [];
        g[k].push(it);
      });
      for (var k in g) {
        var ls = g[k];
        var minP = Math.min.apply(null, ls.map(function (x) { return x.price; }));
        var maxP = Math.max.apply(null, ls.map(function (x) { return x.price; }));
        var zId = k.split('-')[0];
        var base = (SPECIAL_HOVER_ZONES.indexOf(zId) !== -1) ? BASE_PRICE_SP : BASE_PRICE;

        ls.sort(function (a, b) { return a.price - b.price; });

        seatPremiumMap[k] = Math.round(((minP - base) / base) * 100);
        seatMinPriceMap[k] = minP;
        seatCountMap[k] = {
          kr: ls.filter(function (x) { return x.source === 'kr' }).length,
          cn: ls.filter(function (x) { return x.source === 'cn' }).length,
          tickets: ls,
          maxPrice: maxP,
          maxPremium: Math.round(((maxP - base) / base) * 100)
        };
      }
    }

    function updateSeatVisuals() {
      var lb = document.getElementById('zone-label');
      document.querySelectorAll('.seat-rect').forEach(function (el) {
        var row = el.getAttribute('data-row');
        var k = currentZoneId + '-' + row;
        var c = seatCountMap[k] || { kr: 0, cn: 0 };
        if (c.kr > 0 || c.cn > 0) { el.setAttribute('fill', '#f44336'); el.setAttribute('fill-opacity', '1'); }
        else {
          var isSpec = SPECIAL_HOVER_ZONES.indexOf(currentZoneId) !== -1;
          el.setAttribute('fill', isSpec ? '#7c4dff' : '#c8b89a');
          el.setAttribute('fill-opacity', '0.3');
        }
      });
    }

    let currentZoneId = '35';
    function selectZone(id) {
      currentZoneId = id;
      document.querySelectorAll('.mms').forEach(function (p) {
        p.classList.toggle('active', p.id === 'mm-s' + id.toLowerCase() || (id === '\\u2605' && p.id === 'mm-star')); // \u2605 = ??
      });
      renderZone(id);
      updateSeatVisuals();
    }

    function renderZone(id) {
      var group = document.getElementById('seat-group'); group.innerHTML = '';
      var zd = ZONE_SEAT_DATA[id]; if (!zd) return;
      var b = zd.blockBounds;
      var svg = document.getElementById('main-seats-svg');
      var pad = 40;
      svg.setAttribute('viewBox', (b.x - pad) + ' ' + (b.y - pad) + ' ' + (b.w + pad * 2) + ' ' + (b.h + pad * 2));
      for (var r in zd.rows) {
        if (zd.rows[r].length > 0) {
          var firstSeat = zd.rows[r][0];
          var text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          text.setAttribute('x', firstSeat.x - 15);
          text.setAttribute('y', firstSeat.y + 8);
          text.setAttribute('font-size', '10px');
          text.setAttribute('fill', '#aaaaaa');
          text.textContent = r;
          text.style.pointerEvents = 'none';
          group.appendChild(text);
        }

        zd.rows[r].forEach(function (s) {
          var rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
          rect.setAttribute('x', s.x); rect.setAttribute('y', s.y);
          rect.setAttribute('width', 9); rect.setAttribute('height', 9);
          rect.setAttribute('rx', 1.5); rect.setAttribute('class', 'seat-rect');
          rect.setAttribute('data-row', r); rect.setAttribute('style', 'cursor:pointer;');
          rect.addEventListener('mouseenter', function (e) { showTT(e, id, r); });
          rect.addEventListener('mouseleave', hideTT);
          rect.addEventListener('mousemove', moveTT);
          rect.addEventListener('click', function () { selectSeat(id, r, rect); });
          group.appendChild(rect);
        });
      }
    }

    let lastSelected = null;
    function selectSeat(z, r, el) {
      if (lastSelected) lastSelected.classList.remove('selected');
      lastSelected = el; el.classList.add('selected');
      var k = z + '-' + r;
      var p = seatPremiumMap[k], m = seatMinPriceMap[k], c = seatCountMap[k] || { kr: 0, cn: 0, tickets: [] };

      document.getElementById('sel-info').style.display = 'block';
      document.getElementById('si-seat').querySelector('.v').textContent = z + '\\uAD6C\\uC5ED ' + r + '\\uC5F4';
      var base = (SPECIAL_HOVER_ZONES.indexOf(z) !== -1) ? BASE_PRICE_SP : BASE_PRICE;
      document.getElementById('si-base').querySelector('.v').textContent = base.toLocaleString() + '\\uC6D0';

      var listContainer = document.getElementById('si-ticket-list');
      if (!listContainer) {
        listContainer = document.createElement('div');
        listContainer.id = 'si-ticket-list';
        listContainer.style.marginTop = '10px';
        listContainer.style.borderTop = '1px solid #333';
        listContainer.style.paddingTop = '10px';
        document.getElementById('sel-info').appendChild(listContainer);
        var resellEl = document.getElementById('si-resell');
        var pctEl = document.getElementById('si-pct');
        if (resellEl) resellEl.style.display = 'none';
        if (pctEl) pctEl.style.display = 'none';
      }
      listContainer.innerHTML = '';

      if (c.tickets && c.tickets.length > 0) {
        c.tickets.forEach(function (t) {
          var row = document.createElement('div');
          row.className = 'si-row';
          var badge = t.source === 'kr' ? '<span style="color:#00e676; font-weight:bold;">[kr]</span>' : '<span style="color:#ff5252; font-weight:bold;">[cn]</span>';
          var tP = Math.round(((t.price - base) / base) * 100);
          row.innerHTML = '<span class="l">' + badge + ' +' + tP + '%</span><span class="v" style="color:#fff;">' + (t.price).toLocaleString() + '\\uC6D0</span>';
          listContainer.appendChild(row);
        });
      } else {
        listContainer.innerHTML = '<div class="si-row"><span class="v">\\u2014</span></div>';
      }
    }

    function showTT(e, z, r) {
      var k = z + '-' + r;
      var p = seatPremiumMap[k], m = seatMinPriceMap[k], c = seatCountMap[k] || { kr: 0, cn: 0, tickets: [] };
      document.getElementById('tt-name').textContent = z + '\\uAD6C\\uC5ED ' + r + '\\uC5F4';
      var base = (SPECIAL_HOVER_ZONES.indexOf(z) !== -1) ? BASE_PRICE_SP : BASE_PRICE;
      document.getElementById('tt-base').textContent = base.toLocaleString() + '\\uC6D0';
      if (m && c.tickets && c.tickets.length > 0) {
        if (c.maxPrice && c.maxPrice !== m) {
          document.getElementById('tt-resell').textContent = m.toLocaleString() + ' ~ ' + c.maxPrice.toLocaleString() + '\\uC6D0';
          document.getElementById('tt-pct').textContent = '+' + p + '% ~ +' + c.maxPremium + '%';
        } else {
          var minTicket = c.tickets[0];
          var badge = minTicket.source === 'kr' ? '[kr]' : '[cn]';
          document.getElementById('tt-resell').textContent = m.toLocaleString() + '\\uC6D0';
          document.getElementById('tt-pct').textContent = '+' + p + '% ' + badge;
        }
      } else {
        document.getElementById('tt-resell').textContent = '\\u2014';
        document.getElementById('tt-pct').textContent = '\\u2014';
      }
      ttEl.classList.add('on');
    }

    function moveTT(e) {
      var x = e.clientX + 14, y = e.clientY - 8;
      if (x + 170 > window.innerWidth) x = e.clientX - 174;
      if (y + 110 > window.innerHeight) y = e.clientY - 118;
`;

let newHtml = html.substring(0, startIdx) + functionsToInject + html.substring(endIdx);
fs.writeFileSync('index.html', newHtml, 'utf8');

console.log("Successfully rebuilt index.html!");
