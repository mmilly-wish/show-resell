const fs = require('fs');
const content = fs.readFileSync('seat.txt', 'utf8');
const lines = content.split('\n');
const zones = [];
for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes('구역') && line.length < 50) {
        zones.push(line.trim());
    }
}
console.log('Total identified zones:', zones.length);
console.log(zones.join(', '));
