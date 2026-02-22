const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

// Find all occurrences of "const ZONE_SEAT_DATA"
let parts = html.split('const ZONE_SEAT_DATA');
console.log('Occurrences of const ZONE_SEAT_DATA:', parts.length - 1);

// We want to delete the one that is just `{}`. 
// It could be `const ZONE_SEAT_DATA = {};`
let newHtml = html.replace(/const\s+ZONE_SEAT_DATA\s*=\s*\{\s*\};\s*/, '');

if (newHtml !== html) {
    fs.writeFileSync('index.html', newHtml, 'utf8');
    console.log('Successfully removed the empty ZONE_SEAT_DATA declaration!');
} else {
    // If not exactly `{}` maybe there's something else?
    console.log('Could not find exact empty declaration, checking for other patterns...');
    console.log('Lines containing ZONE_SEAT_DATA:');
    let lines = html.split('\n');
    lines.forEach((l, i) => {
        if (l.includes('ZONE_SEAT_DATA')) console.log((i + 1) + ':', l.trim());
    });
}
