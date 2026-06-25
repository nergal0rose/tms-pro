const fs = require('fs');
const path = require('path');
const EXT_DIR = "C:\\\\Users\\\\default.LAPTOP-FC0O7KOQ\\\\.gemini\\\\antigravity\\\\scratch\\\\nepse_tms_extension";

const contentJs = fs.readFileSync(path.join(EXT_DIR, 'content.js'), 'utf8');
const popupHtmlRaw = fs.readFileSync(path.join(EXT_DIR, 'popup.html'), 'utf8');
const popupCssRaw = fs.readFileSync(path.join(EXT_DIR, 'popup.css'), 'utf8');
const popupJsRaw = fs.readFileSync(path.join(EXT_DIR, 'popup.js'), 'utf8');

// The popup HTML needs the CSS inline and the JS inline.
let popupHtml = popupHtmlRaw
    .replace('<link rel="stylesheet" href="popup.css">', '<style>\\n' + popupCssRaw + '\\n</style>')
    .replace('<script src="popup.js"></script>', '<script>\\n' + popupJsRaw + '\\n</script>');

// We don't need a polyfill inside the popup HTML anymore because we will inject the polyfill directly into the iframe window.
const escapedPopupHtml = popupHtml
  .replace(/\\/g, '\\\\')
  .replace(/\`/g, '\\`')
  .replace(/\\$/g, '\\$');

const mainScript = `
// ==========================================
// 1. NEPSE TMS PREMIUM DARK THEME
// ==========================================
function injectTheme() {
    if(document.getElementById('tms-premium-theme')) return;
    const style = document.createElement('style');
    style.id = 'tms-premium-theme';
    style.innerHTML = \\\`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        
        body { font-family: 'Inter', system-ui, -apple-system, sans-serif !important; }

        /* Elegant CSS Invert Dark Mode */
        html.tms-dark-mode { 
            filter: invert(1) hue-rotate(180deg) brightness(0.9) contrast(0.95); 
            background: white; 
        }
        /* Reverse invert for images and videos so they look normal */
        html.tms-dark-mode img, 
        html.tms-dark-mode video, 
        html.tms-dark-mode iframe, 
        html.tms-dark-mode canvas { 
            filter: invert(1) hue-rotate(180deg); 
        }
        
        /* Extension Toggle Button */
        #nepse-ext-toggle {
            position: fixed;
            bottom: 30px;
            right: 30px;
            width: 56px;
            height: 56px;
            border-radius: 50%;
            background: linear-gradient(135deg, #FCD535, #F8B400);
            color: #1E2329;
            font-size: 28px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            box-shadow: 0 4px 15px rgba(252, 213, 53, 0.4);
            z-index: 9999999;
            border: none;
            transition: all 0.2s ease-in-out;
        }
        #nepse-ext-toggle:hover { transform: scale(1.1); box-shadow: 0 6px 20px rgba(252, 213, 53, 0.6); }
        
        /* Modal Overlay */
        #nepse-ext-overlay {
            position: fixed;
            top: 0; left: 0; width: 100vw; height: 100vh;
            background: rgba(0, 0, 0, 0.6);
            backdrop-filter: blur(5px);
            z-index: 9999998;
            display: none;
            opacity: 0;
            transition: opacity 0.3s;
        }
        
        /* Iframe Modal */
        #nepse-ext-iframe {
            position: fixed;
            top: 50%; left: 50%;
            transform: translate(-50%, -45%);
            width: 380px;
            height: 640px;
            border: none;
            border-radius: 16px;
            box-shadow: 0 15px 50px rgba(0,0,0,0.5);
            z-index: 9999999;
            display: none;
            opacity: 0;
            background: #ffffff; /* Let the iframe handle its own background */
            transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
        }

        /* Holdings Widget */
        .holdings-widget {
            background: #f8f9fa;
            border: 1px solid #dee2e6;
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 20px;
        }
        html.tms-dark-mode .holdings-widget { border-color: #333; }
        .holdings-widget h4 { margin: 0 0 12px 0; color: #d32f2f; font-size: 15px; font-weight: 600; display:flex; align-items:center; gap:8px;}
        .holdings-list { display: flex; flex-wrap: wrap; gap: 10px; }
        .holding-chip {
            background: #ffffff;
            padding: 8px 14px;
            border-radius: 20px;
            cursor: pointer;
            font-size: 13px;
            font-weight: 600;
            color: #495057;
            border: 1px solid #ced4da;
            box-shadow: 0 2px 4px rgba(0,0,0,0.05);
            transition: all 0.2s;
        }
        .holding-chip:hover {
            border-color: #FCD535;
            background: #fffcf0;
            color: #b78100;
            transform: translateY(-2px);
            box-shadow: 0 4px 8px rgba(0,0,0,0.1);
        }
    \\\`;
    if(document.head) document.head.appendChild(style);
    else document.documentElement.appendChild(style);
    
    // Enable dark mode globally
    document.documentElement.classList.add('tms-dark-mode');
}

// ==========================================
// 2. CHROME API POLYFILL (Main Content)
// ==========================================
window.chrome = window.chrome || {};

const __storageListeners = [];
const __msgListeners = [];

window.chrome.storage = {
    local: {
        get: async (keys) => {
            let data = {};
            const keyArray = Array.isArray(keys) ? keys : (typeof keys === 'string' ? [keys] : Object.keys(keys||{}));
            keyArray.forEach(k => {
                let v = localStorage.getItem('nepse_ext_' + k);
                if(v) data[k] = JSON.parse(v);
            });
            return data;
        },
        set: async (obj) => {
            let changes = {};
            for(let k in obj) {
                const oldVal = localStorage.getItem('nepse_ext_' + k);
                localStorage.setItem('nepse_ext_' + k, JSON.stringify(obj[k]));
                changes[k] = { oldValue: oldVal ? JSON.parse(oldVal) : undefined, newValue: obj[k] };
            }
            __storageListeners.forEach(cb => cb(changes));
        }
    },
    onChanged: {
        addListener: (cb) => { __storageListeners.push(cb); }
    }
};

window.chrome.runtime = {
    sendMessage: async (msg) => {
        __msgListeners.forEach(cb => cb(msg, {}, () => {}));
        return { success: true };
    },
    onMessage: {
        addListener: (cb) => { __msgListeners.push(cb); }
    }
};

// ==========================================
// 3. EXTENSION CONTENT SCRIPT INJECTION
// ==========================================
try {
    ${contentJs.replace(/\\/g, '\\\\').replace(/\`/g, '\\`').replace(/\\$/g, '\\\\$')}
} catch(e) {
    console.error("Content Script Injection Error:", e);
}


// ==========================================
// 4. DP HOLDINGS MAPPER
// ==========================================
function scrapeDPHoldings() {
    if (!window.location.href.includes('dp-holding')) return;
    const rows = document.querySelectorAll('kendo-grid-list table tbody tr');
    if (rows.length === 0) return;
    
    let holdings = {};
    rows.forEach(row => {
        const tds = row.querySelectorAll('td');
        if (tds.length >= 6) {
            const symbol = tds[1].innerText.trim();
            const tmsBalanceText = tds[4].innerText.replace(/,/g, '').trim(); 
            const tmsBalance = parseFloat(tmsBalanceText);
            if (symbol && !isNaN(tmsBalance) && tmsBalance > 0) {
                holdings[symbol] = tmsBalance;
            }
        }
    });
    
    if (Object.keys(holdings).length > 0) {
        localStorage.setItem('__my_dp_holdings', JSON.stringify(holdings));
    }
}

function injectHoldingsWidget() {
    if (!window.location.href.includes('memberclientorderentry')) return;
    if (document.getElementById('my-holdings-widget')) return;
    
    const orderFormArea = document.querySelector('app-order-entry-form, .order-entry-container');
    if (!orderFormArea) return;

    const rawHoldings = localStorage.getItem('__my_dp_holdings');
    if (!rawHoldings) return;
    const holdings = JSON.parse(rawHoldings);
    
    const widget = document.createElement('div');
    widget.id = 'my-holdings-widget';
    widget.className = 'holdings-widget';
    
    let html = '<h4>⚡ My Available Holdings (TMS Balance)</h4><div class="holdings-list">';
    for(let sym in holdings) {
        html += \\\`<div class="holding-chip" data-sym="\\\${sym}" data-qty="\\\${holdings[sym]}">\\\${sym}: \\\${holdings[sym]}</div>\\\`;
    }
    html += '</div>';
    widget.innerHTML = html;
    
    orderFormArea.insertBefore(widget, orderFormArea.firstChild);
    
    widget.querySelectorAll('.holding-chip').forEach(chip => {
        chip.addEventListener('click', (e) => {
            const sym = e.target.getAttribute('data-sym');
            const qty = e.target.getAttribute('data-qty');
            
            const symInput = document.querySelector('input#selectSymbol, input[formcontrolname="businessSymbol" i]');
            const qtyInput = document.querySelector('input[formcontrolname="quantity" i], input.form-qty, input#quantity');
            const sellBtn = document.querySelector('label.order__options--sell, label[for="sell"], .sell-btn');
            
            if (sellBtn) sellBtn.click();
            if (symInput) {
                symInput.value = sym;
                symInput.dispatchEvent(new Event('input', {bubbles: true}));
                symInput.dispatchEvent(new Event('change', {bubbles: true}));
            }
            if (qtyInput) {
                setTimeout(() => {
                    qtyInput.value = qty;
                    qtyInput.dispatchEvent(new Event('input', {bubbles: true}));
                }, 200);
            }
        });
    });
}


// ==========================================
// 5. INIT & DOM SETUP
// ==========================================
function initUI() {
    injectTheme();
    scrapeDPHoldings();
    injectHoldingsWidget();
    
    if (!document.getElementById('nepse-ext-toggle') && document.body) {
        const toggle = document.createElement('button');
        toggle.id = 'nepse-ext-toggle';
        toggle.innerHTML = '⚡';
        document.body.appendChild(toggle);
        
        const overlay = document.createElement('div');
        overlay.id = 'nepse-ext-overlay';
        document.body.appendChild(overlay);
        
        const iframe = document.createElement('iframe');
        iframe.id = 'nepse-ext-iframe';
        iframe.src = 'about:blank'; // Avoid CSP data URI blocks
        document.body.appendChild(iframe);
        
        // Write the popup content safely into the iframe
        const doc = iframe.contentWindow.document;
        doc.open();
        // Inject polyfill directly into iframe window
        iframe.contentWindow.chrome = window.chrome;
        doc.write(\\\`${escapedPopupHtml}\\\`);
        doc.close();
        
        const closeModals = () => {
            iframe.style.opacity = '0';
            overlay.style.opacity = '0';
            setTimeout(() => {
                iframe.style.display = 'none';
                overlay.style.display = 'none';
            }, 300);
        };
        
        const openModals = () => {
            iframe.style.display = 'block';
            overlay.style.display = 'block';
            setTimeout(() => {
                iframe.style.opacity = '1';
                overlay.style.opacity = '1';
                iframe.style.transform = 'translate(-50%, -50%)';
            }, 10);
        };
        
        toggle.addEventListener('click', () => {
            if (iframe.style.display === 'none' || iframe.style.display === '') {
                openModals();
            } else {
                closeModals();
            }
        });
        
        overlay.addEventListener('click', closeModals);
    }
}

let lastUrl = location.href; 
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    setTimeout(() => {
        scrapeDPHoldings();
        injectHoldingsWidget();
    }, 1000);
  }
}).observe(document, {subtree: true, childList: true});

setInterval(() => {
    initUI();
}, 1500);

initUI();
`;

fs.writeFileSync('C:\\\\Appilio\\\\bundle_ext.js', \`
const fs = require('fs');
const path = require('path');
const EXT_DIR = "C:\\\\\\\\Users\\\\\\\\default.LAPTOP-FC0O7KOQ\\\\\\\\.gemini\\\\\\\\antigravity\\\\\\\\scratch\\\\\\\\nepse_tms_extension";

const contentJs = fs.readFileSync(path.join(EXT_DIR, 'content.js'), 'utf8');
const popupHtmlRaw = fs.readFileSync(path.join(EXT_DIR, 'popup.html'), 'utf8');
const popupCssRaw = fs.readFileSync(path.join(EXT_DIR, 'popup.css'), 'utf8');
const popupJsRaw = fs.readFileSync(path.join(EXT_DIR, 'popup.js'), 'utf8');

let popupHtml = popupHtmlRaw
    .replace('<link rel="stylesheet" href="popup.css">', '<style>\\\\n' + popupCssRaw + '\\\\n</style>')
    .replace('<script src="popup.js"></script>', '<script>\\\\n' + popupJsRaw + '\\\\n</script>');

const escapedPopupHtml = popupHtml
  .replace(/\\\\/g, '\\\\\\\\')
  .replace(/\\\`/g, '\\\\\\`')
  .replace(/\\\\$/g, '\\\\\\\\$');

const escapedContentJs = contentJs
  .replace(/\\\\/g, '\\\\\\\\')
  .replace(/\\\`/g, '\\\\\\`')
  .replace(/\\\\$/g, '\\\\\\\\$');

const mainScript = \\\`${mainScript.replace(/\\/g, '\\\\').replace(/\`/g, '\\`').replace(/\\$/g, '\\\\$')}\\\`;

fs.writeFileSync('C:\\\\\\\\Appilio\\\\\\\\tms_inject.js', mainScript);
console.log("Successfully bundled into tms_inject.js!");
\`);
console.log("Successfully created bundle_ext.js");
