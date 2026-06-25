const fs = require('fs');
const realBase64 = 'data:image/jpeg;base64,' + fs.readFileSync('C:/Users/default.LAPTOP-FC0O7KOQ/Downloads/TMSCaptcha_v0.3.1/assets/empty.jpg').toString('base64');
let src = fs.readFileSync('extension_scripts/tms_inject.js', 'utf8');

// Find the line that starts with "            return 'data:image/jpeg;base64,"
const lines = src.split('\n');
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('return \'data:image/jpeg;base64,')) {
        lines[i] = '            return \'' + realBase64 + '\';';
        break;
    }
}

fs.writeFileSync('extension_scripts/tms_inject.js', lines.join('\n'));
