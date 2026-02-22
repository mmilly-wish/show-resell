const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

// Replace the parseTicketbayItem and parseChinaItem logic carefully using regex
html = html.replace(/function parseTicketbayItem[\s\S]*?function applyDateFilter/, `function parseTicketbayItem(it) {
      if (!it) return null;
      var pStr = (it.price || '').replace(/[,원\\s]/g, '');
      var p = parseInt(pStr, 10);
      if (isNaN(p) || p <= 0) return null;
      var loc = (it.location || '').trim();
      var zM = loc.match(/^(.+?)\\uAD6C\\uC5ED/); // 구역
      if (!zM) return null;
      var z = zM[1].trim(); if (z === '\\uBCC4' || z === '별') z = '\\u2605';
      var rM = loc.slice(zM[0].length).match(/(\\d+).*?\\uC5F4/); // 열
      if (!rM) return null;
      return { source: 'kr', zone: z, row: parseInt(rM[1], 10), price: p, isSpecial: (it.grade_floor || '').indexOf('\\uC2DC\\uC5BC\\uC81C\\uD55C') !== -1, datetime: (it.datetime || '').trim() };
    }

    function parseChinaItem(it) {
      if (!it) return null;
      var rmb = parseInt((it.price || '').replace(/[^0-9]/g, ''), 10);
      if (isNaN(rmb) || rmb <= 0) return null;
      var loc = (it.location || '').trim();
      var zM = loc.match(/(?:\\uD50C\\uB85C\\uC5B4\\s*)?(.+?)\\uAD6C\\uC5ED/); // 플로어 구역
      if (!zM) return null;
      var z = zM[1].trim(); if (z === '\\uBCC4' || z === '별') z = '\\u2605';
      var rM = loc.slice(zM[0].length).match(/(\\d+)\\s*\\uC5F4/);
      return { source: 'cn', zone: z, row: rM ? parseInt(rM[1], 10) : 1, price: rmb * 193, isSpecial: (it.grade_floor || '').indexOf('\\uC2DC\\uC5BC\\uC81C\\uD55C') !== -1, datetime: (it.datetime || '').trim() };
    }

    function applyDateFilter`);

fs.writeFileSync('index.html', html, 'utf8');
console.log('Successfully updated parsing logic!');
