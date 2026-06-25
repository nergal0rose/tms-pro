// Patcher: Takes the original Chrome extension content-script and patches it
// so it works in Tauri's initialization script context (runs before DOM).
//
// Changes:
// 1. Removes source map
// 2. Wraps observer.observe() in try-catch (it fails when DOM not ready)
// 3. Exposes the solve function on window.__tmsCaptchaSolve

const fs = require('fs');

const INPUT = 'C:/Users/default.LAPTOP-FC0O7KOQ/Downloads/TMSCaptcha_v0.3.1/content-script.986d7500.js';
const OUTPUT = 'C:/Appilio/nepse-tms-desktop/extension_scripts/tms_ocr_eval.js';

const src = fs.readFileSync(INPUT, 'utf8');

// Strip source map (everything after //# sourceMappingURL)
let code = src.split('//# sourceMappingURL')[0].trimEnd();

// The IIFE ends with:
//   ...observer.observe($63f...$var$target,$63f...$var$config)})();
// We need to:
//   a) Wrap observer.observe in try-catch
//   b) Expose the solve function on window

const SEARCH = '$63f4ca39ca43dc8e$var$observer.observe($63f4ca39ca43dc8e$var$target,$63f4ca39ca43dc8e$var$config)})();';

const REPLACE = [
  'try{$63f4ca39ca43dc8e$var$observer.observe($63f4ca39ca43dc8e$var$target,$63f4ca39ca43dc8e$var$config)}catch(_e){}',
  'window.__tmsCaptchaSolve=$5c9e7568c5b7c7e7$export$84eda721a09bfce4;',
  'window.__tmsHandleResult=$63f4ca39ca43dc8e$var$handle_result;',
  '})();',
].join('');

if (!code.includes(SEARCH)) {
  console.error('ERROR: Could not find observer.observe pattern!');
  process.exit(1);
}

code = code.replace(SEARCH, REPLACE);

fs.writeFileSync(OUTPUT, code);
console.log('OK - Patched tms_ocr_eval.js (' + code.length + ' bytes)');
