const fs = require('fs');
const path = require('path');
const EXT_DIR = "C:\\\\Users\\\\default.LAPTOP-FC0O7KOQ\\\\.gemini\\\\antigravity\\\\scratch\\\\nepse_tms_extension";

const contentJs = fs.readFileSync(path.join(EXT_DIR, 'content.js'), 'utf8');
const popupHtmlRaw = fs.readFileSync(path.join(EXT_DIR, 'popup.html'), 'utf8');
const popupCssRaw = fs.readFileSync(path.join(EXT_DIR, 'popup.css'), 'utf8');
const popupJsRaw = fs.readFileSync(path.join(EXT_DIR, 'popup.js'), 'utf8');

let popupHtml = popupHtmlRaw
    .replace('<link rel="stylesheet" href="popup.css">', '<style>\n' + popupCssRaw + '\n</style>')
    .replace('<script src="popup.js"></script>', '<script>\n' + popupJsRaw + '\n</script>');

const encodedPopupHtml = Buffer.from(popupHtml).toString('base64');

const filesToBundle = [
    'mainScriptPolyfill.js',
    'mainScriptInitUI.js',
    'mainScriptTheme.js',
    'mainScriptDPHoldings.js',
    'mainScriptLogin.js'
];

const mainScriptTheme = fs.readFileSync('mainScriptTheme.js', 'utf8');
const mainScriptPolyfill = fs.readFileSync('mainScriptPolyfill.js', 'utf8');
const mainScriptDPHoldings = fs.readFileSync('mainScriptDPHoldings.js', 'utf8');
const mainScriptLogin = fs.readFileSync('mainScriptLogin.js', 'utf8');
const mainScriptInitUI = fs.readFileSync('mainScriptInitUI.js', 'utf8');

const finalScript = 
  "(() => {\n" +
  "if (window.self !== window.top) { console.log('Preventing recursive iframe injection'); return; }\n" +
  "try {\n" +
  mainScriptTheme + "\n" +
  mainScriptPolyfill + "\n" +
  "try { \n" + contentJs + "\n} catch(e) { console.error('Content Script Error', e); }\n" +
  mainScriptDPHoldings + "\n" +
  mainScriptLogin + "\n" +
  "const ENCODED_POPUP = '" + encodedPopupHtml + "';\n" +
  mainScriptInitUI + "\n" +
  "} catch(e) { console.error('TMS EXT ERROR:', e); }\n" +
  "})();\n";

fs.writeFileSync('C:\\\\Appilio\\\\tms_inject.js', finalScript);
console.log("Success");
