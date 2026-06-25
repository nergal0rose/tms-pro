// ==========================================
// 5. INIT & DOM SETUP
// ==========================================
function injectTabs() {
    if (document.getElementById('my-tms-tabs')) return;
    
    // We can inject into .main-content to make it appear right below the header
    const container = document.querySelector('.main-content, .content-wrapper, main');
    if (!container) return;

    const tabsHtml = `
        <div id="my-tms-tabs" style="display: flex; gap: 10px; margin: 15px; padding: 10px; background: #1E2329; border-radius: 8px; border: 1px solid #3b3b4f; filter: invert(1) hue-rotate(180deg);">
            <button class="tms-custom-tab tms-tab-dashboard" onclick="window.location.href='/tms/client/dashboard'">Dashboard</button>
            <button class="tms-custom-tab tms-tab-buysell" onclick="window.location.href='/tms/me/memberclientorderentry'">Buy/Sell</button>
            <button class="tms-custom-tab tms-tab-marketdepth" onclick="window.location.href='/tms/me/stockQuoteScreenComponent'">Market Depth</button>
            <button class="tms-custom-tab tms-tab-dpholdings" onclick="window.location.href='/tms/me/dp-holding'">DP Holdings</button>
            <style>
                .tms-custom-tab {
                    padding: 8px 16px;
                    color: #000000;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                    font-weight: bold;
                    transition: all 0.2s;
                }
                .tms-tab-dashboard { background: #954c06; }
                .tms-tab-dashboard:hover { background: #824305; }
                
                .tms-tab-buysell { background: #207a40; }
                .tms-tab-buysell:hover { background: #1a6334; }
                
                .tms-tab-marketdepth { background: #3298e0; }
                .tms-tab-marketdepth:hover { background: #2b84c2; }
                
                .tms-tab-dpholdings { background: #FFC107; }
                .tms-tab-dpholdings:hover { background: #FFA000; }
            </style>
        </div>
    `;

    const div = document.createElement('div');
    div.innerHTML = tabsHtml;
    container.insertBefore(div, container.firstChild);
}

function initUI() {
    injectTheme();
    scrapeDPHoldings();
    injectHoldingsWidget();
    injectTabs();
    
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
        iframe.src = 'about:blank'; 
        document.body.appendChild(iframe);
        
        const doc = iframe.contentWindow.document;
        doc.open();
        iframe.contentWindow.chrome = window.chrome;
        
        // Decoded from base64 with UTF-8 support
        const popupHtmlStr = decodeURIComponent(escape(atob(ENCODED_POPUP)));
        doc.write(popupHtmlStr);
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

function startUI() {
    setInterval(() => {
        initUI();
    }, 1500);

    initUI();
}

if (document.body) {
    startUI();
} else {
    document.addEventListener('DOMContentLoaded', startUI);
}
