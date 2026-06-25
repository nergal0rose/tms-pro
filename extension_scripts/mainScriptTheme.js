// ==========================================
// 1. NEPSE TMS PREMIUM DARK THEME
// ==========================================
function injectTheme() {
    if(document.getElementById('tms-premium-theme')) return;
    const style = document.createElement('style');
    style.id = 'tms-premium-theme';
    style.innerHTML = `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        
        body { font-family: 'Inter', system-ui, -apple-system, sans-serif !important; }

        html.tms-dark-mode { 
            filter: invert(1) hue-rotate(180deg) brightness(0.9) contrast(0.95); 
            background: white; 
        }
        html.tms-dark-mode img, 
        html.tms-dark-mode video, 
        html.tms-dark-mode iframe, 
        html.tms-dark-mode canvas { 
            filter: invert(1) hue-rotate(180deg); 
        }
        
        #nepse-ext-toggle {
            position: fixed;
            bottom: 20px;
            right: 70px;
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background: linear-gradient(135deg, #FCD535, #F8B400);
            color: #1E2329;
            font-size: 20px;
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
            background: #ffffff;
            transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
        }

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
    `;
    if(document.head) document.head.appendChild(style);
    else document.documentElement.appendChild(style);
    
    document.documentElement.classList.add('tms-dark-mode');
}
