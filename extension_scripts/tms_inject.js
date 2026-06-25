(() => {
if (!window.location.hostname.includes('nepsetms.com.np')) return;
const isGhostFrame = window.name === 'tms_ghost_tab';
if (window.self !== window.top && !isGhostFrame) { console.log('Preventing recursive iframe injection'); return; }
try {
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
            width: 28px;
            height: 28px;
            border-radius: 50%;
            background: linear-gradient(135deg, #FCD535, #F8B400);
            color: #1E2329;
            font-size: 14px;
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

window.addEventListener('storage', (e) => {
    if (e.key && e.key.startsWith('nepse_ext_')) {
        const key = e.key.replace('nepse_ext_', '');
        let oldVal, newVal;
        try { oldVal = e.oldValue ? JSON.parse(e.oldValue) : undefined; } catch(err) { oldVal = e.oldValue; }
        try { newVal = e.newValue ? JSON.parse(e.newValue) : undefined; } catch(err) { newVal = e.newValue; }
        
        const changes = {};
        changes[key] = { oldValue: oldVal, newValue: newVal };
        
        if (typeof __storageListeners !== 'undefined') {
            __storageListeners.forEach(cb => {
                try { cb(changes); } catch(err) {}
            });
        }
    }
});


window.chrome.runtime = {
    sendMessage: async (msg) => {
        // Fix for content.js expecting background.js to confirm execution tab
        if (msg.action === "check_execution_tab") {
            return { isExecutionTab: true };
        }
        
        // Handle audit trail messages
        if (msg.action === "log_audit") {
            try {
                const time = new Date().toLocaleTimeString('en-US', { hour12: false });
                const logStr = '[' + time + '] ' + msg.log;
                
                let stored = [];
                try {
                    const storedRaw = localStorage.getItem('nepse_ext_auditLogs');
                    if (storedRaw) stored = JSON.parse(storedRaw);
                } catch(e) {
                    console.error("[TMS] Audit parse error:", e);
                }
                
                if (!Array.isArray(stored)) stored = [];
                
                const oldVals = [...stored];
                stored.unshift(logStr);
                if (stored.length > 50) stored.length = 50;
                
                localStorage.setItem('nepse_ext_auditLogs', JSON.stringify(stored));
                
                // Notify listeners manually so the popup updates
                const changes = {
                    auditLogs: { oldValue: oldVals, newValue: stored }
                };
                
                if (typeof __storageListeners !== 'undefined' && Array.isArray(__storageListeners)) {
                    __storageListeners.forEach(cb => {
                        try { cb(changes); } catch(err) { console.error('[TMS] Error in storage listener', err); }
                    });
                }
            } catch(e) {
                console.error('[TMS] Failed to process log_audit', e);
            }
            return { success: true };
        }

        // Pass to listeners (e.g. popup.js)
        __msgListeners.forEach(cb => cb(msg, {}, () => {}));
        return { success: true };
    },
    onMessage: {
        addListener: (cb) => { __msgListeners.push(cb); }
    },
    getURL: function(path) {
        if (path && (path.includes('empty') || path.includes('assets/empty'))) {
            return 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEAAkGBxMTEhMTExQWFhUXFxkbGRcYGR8YGRcYICAgIR8dHyAhHSgiIBolIB4gITEhJSkrLi4uHx8zODMtNygtLisBCgoKBQUFDgUFDisZExkrKysrKysrKysrKysrKysrKysrKysrKysrKysrKysrKysrKysrKysrKysrKysrKysrK//CABEIAFABIgMBIgACEQEDEQH/xAAsAAADAQEBAQAAAAAAAAAAAAACAwQAAQUHAQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAD6mhVYniRLgFYqmb0yETAOnkhw7vMPVlRSKMRFvSIxingwvYNF8QLFYfPbweCZh/H8EzsoK9JhYOMXLY0QkzGClY5k9gggAakbiiWmMEKOnn+gnA6mQJ0d4BxEPJJHBJgFAgbiQGcNZViwRSVHnejKRG4TCQyoSejLfPcAYOMGZvoiaouiQ9CcbE+cY9GGMXw6OWSWSemSc1YfApFcVQeBvXxxmSUbkZW2AhialFUhJPTllw1dxE4vcJWxYzLUG05RWdQKyGCadIdpICS7Y75/tTkF0bw8nDuqQUsXAU0dUWLmcKeMgeew5wTJyVwqGJw5dcRXGZCvSjIUzqgkUPAFhDvO5iuMaBRiJRl4/8QAHxAAAwEBAQADAQEBAAAAAAAAAgMEAQUAERMUEgYQ/9oACAEBAAECAPrbBPG8NgSpyFrpB1lHjROmCKldSqUlOqdIGuxLJ1OKqdwRrjY6pUs7ULUn/nRHaaJVs53NmnTSK4Ak8pDd+sZXud62TnrldAXXd0qVEymqoarPaPOXbhDfhGSeo5To7f1pN49FMbcQxIZGK1hZTU0rRoGjW7PfAfMonb0NeB6NOaywgcRv3zBkVQNTZXJtNw1/hsYnyypXTNBAfmSA9WEuWxqN2lObHLWkWh4Brlpf9/GI+eDGtAUzvDArrRd+JPOUDx+tJ0D8H0U0KocwxrNSWsAYXMWK8yKm8F3SN6TSPBXO1DdWuW7egv36NwEu89fN8HpvOVmrKJ1NAM2pwpB2x2R4pipj8FFm4yyUVLne2XF0w88XkylhRZu848zmTvYEx/lJLGTpXCv1PqUO1UOhNXrHjVC82zif92jdPJ4ZkKVMzIjkUFE7nuSNFKcwF598HusHQZLITw8zdQMZ5Fz0lMm7y0Qqc9DVvEcBzbqx8OTOqF6GKzP7jYlQysbCTBhH5p98nOk435EKnvTO501ZAbXy2aPotRC5ag+6yezyypfU2apFtWdQAz5w4bKSovLGmiTnLlM4UtI53Ni31ESCp1Fczd6IHQtvrDsFKQfN6dM6l40RSJJ6af8AW//EAEQQAAIBAwMBBAUHCgQGAwAAAAECEQMSIQATIjEjMkFRM0JDYXEEU2OBk9PwUmJyc4ORoaOzw4KxsuMUkqLB0fPh4vH/2gAIAQEAAz8AKqAtt1lu5b9lpVemVmnTpAravOm5qeBQfjtNCnUc02vW9SVuvIlIFPPSlkVfr0jlmVWLI2Q1MH8f1NKKRFR7lVbajVPXp7ftP36FyrWtqm6KbMEPc/u9dMppimm5ATvdmRTvE7ecGbPqpj6PQbwG29SorU2CG87n/s0SpqPerNhlqlKiUjefvOvzelcqk1L6iFQVXlSNM2Of31NAqRfaqpUNy0+CH8v/AF6k1KU33qVZmsKL5JZ8H0GUrclTaY05IDOzdngvEdqPSY9fQf5PSYLZcies9Szh7PVJysoj55XLfaln/wCfv07q5AaKnHk1Tj+z1uVAL9xKbtcEZqbU2eSDxMHhUX3xno51NRWDVAVJuqYINhIi0YUNuNlQD1zqu9OqyWB5c0isrTdSOzDAEMpItMg+sfdoFZbiVNyszbZN4UNUbHElrgMHp75FW9gWY5N3O0hLeqhTIaVXBJkScdNVEBIWVUMrBDtsysFIdWUStQHwBAIJPUDVwVjUuiorssqEVgDcwIUExIJkmI8pBUrUpNUtKtTqEEWguapqNY2cX3JGSCsdQWYyt7KrXhAjNxqNfF0gAhytNrR0lhjTl0FSGaDNrAIKkHumA2SpAM9dweA0jPTMBxTa9zcCyVeQtIOIl60+MvjphrhbSVgC8guLQ0heZgs8gM5mcweudMFotSNyIpWoU7pIgAKIkG8AT0CtU8YIIqJLPSvdyisJBdTVc3CnEUwYdWmWkhpxDiox69SWZApNS1QLTMwQufhrkzXuxQkBWjbLkKwlVgsRGJmPDoNX1F43FRTuNrIAy1FK98k8QWMeP7tNe1SqbA46SENEDcWLfXyxN3iTIxGqtPhSHFX49nUIRJA8fhU6edL1NEtTSsyrSclG7gvqSNv473zWq/5NL7V/udI1csKbXgId1TUS9P2fXRBcXXKERtu3nZp2oKKwp3NDMqCUvQ+ECn+BqpVp0mMGuIK1KljxwPl+sOmNWF271a1lbvpudpp6kWOjG8tUqFSHQ7dnBcxV/Hu04L2QsvkEd3b4d+n6Tp7XTGnzNXitvKNw/n9noo8sAvHkzeFSPZ/j2emVnazeR7F48+H93/5/WaxbxaHp7jMvV9zVRQFaqVAqMzKsMGphqeOzpUjMf6z6TpoFAC0ZQG4WB7zGgR8oRHO6FftFamlQGzH8fntU2U1bKlpBNX0iHuVPU/afiNRIpKot7RVtenG54/69Ehy0oFU9SGYY75nH1et3vW1VCsTU3uIg7e2ailTgMDaSPcAcaPZ8ai1KoWmbJJCsrm5rVYhAcTjJXIIGmVkNQBlchSGhbSqsWYMDfOI6AQT5522KGXUYV4QBVhL0W1QRPMz7vhDuGCpVNQBluJC23clMCA0Wr74nzMsN4peAKhhnIVTUKAKKZYMqrcSbmBFwjM4CimrIEphkBLtYAVFwCMJFQ3gQAFECIjTgdbdzvEybIBIaSYAAUnA6xnW5TLlSzQZEESyNIsCkDDloJ6xE8idIbaaRfIapEdXY1C5JHPJ8IXmDAkBbVupK+FVYFwm4kMZp0nYzYuYECcrJl6pq06qRROOLlblLOS11wPdAkBQOWGaMZL2gBVuksFAFrhWkgjAZhBBGemBDNUVAykOlQipADi00xgYDJaxkiPDHiKhGXBNMjC0lBdlWkzHnPXmJGeXXGltbclQ8i6CCEgiAyGZxdggx0gxpC0ADcUqSkcgh4x5HvdR4QPDQJtNJw9LbxHYIbM7b9PR1NQFLsaYuKx3A73+G5+r/AJmltXLdB7X5Q3/V63x8dVEqJSQoEstpgo72Mk9e16dzVRwzIoBAJyxSefkPR4p+l1NyhqZKvay7T04/FLVC61bbmqd4MNxefT+XU+y/L0aZUKqgM0L+e+36nzf+3osVFqVlQPyPaTTc/dn9ppnBdXmNxZVr83d+fq9F79VIpgkEqwZvU/H46ezF7pm/qEq9BiMfOdpPT7ubHZFZZVHaF4RfO3w9oezf92uNSsgmDcAwenc9lMp8Z6fXt6JpKwQNaXPIF7P8FL0mkQqzyzqt0qqT7OamiqncHNeVRrUljfelPSIzszkdxoY8F0zJLDtV4uq45+MbnstOSBCAKS1Raag02dwSy3Fluy6tNgmLvW0rIpFE0+MDFMWNgFcOxJh/+k+J0xZECuyhQUYLBtLkBgzmQFlCUYyYBGAZqOuL6bKQ2QCOUqQIJBaLiB43AYkEOy1kNUlLGvYgSk7gY4ANuGAKwTA6QS3ELa0B1JDEk2rahdGBkBZMyZIU+egy95yodYuEhUZ1sItAc5SAJkXcpxp1CLsibyGiBbJJBOIaRmRke8mD6UkKIwt4iVC3FbzjMdTIAzkQWuOA7MMEIQFgWgghsEGTIyJUjqJIdakKLyKoDqApAR+IljmSbp7s5II1a1rGGfCggoCqNbAJnreCAc4JmIgGswAYw1TmUCLSmSQC4JYknqBEfAatuUtcXZEKrVg06YYrIgAiFnPXSsSgIqBVO0XYPeykq9Q465UT7zHUygak9WmGZiFVwtyoWBuuyOJtiT4keeqainR5CCloWC6KsNL8SEWFPIkeEENadEG4FTTZrVABLIp24QsjNccVGkGMgeB0RUNJVDinhiGygPo81M1KuB9oNXUqoaCxW1j0Rqncq2aduQqU4OR9f7bVMEBizIxiyoTWHDx7T0euSKHYvKNcq38D/wCdvTSFphVRTf1vvv3OH0fhnTCmTm4kQYKc4/H+jRdQQi3qTYGONyamPjBl/gfSaF8tVchrwlOSgGYqc/4+71I1Sp0mpraq5uaLA5fmeH16YGmGplOSpULQ4ix+h61KXl09J7qlPVcMyqVhWLhre4f0PafO/rNKzWgktbL99KmSad9nlw0N0ELLLkyC1RUqeJ3e08PAR6ns9FwQlRWcOwZmQ8HsOLJmn6Qe/b+O5pCFZXuVu1VVp+m9p9toMiC1UpqRaoW78jbj5v4aKvIW6TapW82/p6aobGSnat/FvXmOdn/PqoVBRkDALuMUYy9q4sUgg9zIPTTCWKi45ZeJU1O8agEXDlGCcT00Kt9NiCnDPfLAkkggcpsjlMiOuToOosRlVipptNt6hUIInIyAtp63ZBE6SmUVSRdbklnYkBU6sSTKrk9YViTm4MXqAEs1QCpGVUkKqkSD0ObcxhmBcrj5Qy0xcKRDh22yCyU7gxuc94QhB8XmcWmTNOWW0kqCyEBmaSo8xOBPQkxkkDTvTqBAaoplMEqb2Ko6lyRGSVJZcBWYgzxSSUpqwp2wrN0pCCFFr9WukQONq0oGlKKqLcEFgV6bOQhUIFW9sXJIuMiTLA50zXFZdw3fvUBUPIGAF8FgDqSFDGBIc1CxViRKmooQEAbZdEkTYeRhsyGPQISFNzmzi0BWD3qS13mxEshMGQQIgEyy1He1gApVVwxIUkcQIiRBznGqQp9rLKqgPgwqgggMskXzAwJyY0ajlTu2uXQxCqoAIV5bkx4kjOLh5DQN1qEFqi0FIJWVewtE9LUNRo6cJ8dIAQpV58bs1Oe3F/6zTBQaThkMFXUC60vfcPZ1P3eOqwVQn/D2wLezPd8P4aRZVnqMY6spsX+3qoxUCLg3UM6W/edH1UuuiorWd5mZxfbFlm75Z8vffnQSnTASz2aqrcF01Oq20bXd8cbkqvA6n9XZ9lp0dFRURLhcRwTbTEJT/V+Pu91PSFGCus9oy4KJw/qeGl5OSGyLVpI3Hrz7Pc9L4fRx79Hcuddsrm12zZ7R/h+D7PSqJamCObY4Fev3h+00A1NZds8inCDHV9v9CNUxWU3IlvpabcLt3HWO0PZxs+X7PVUUDKqvZhe05sxs61H7P9Xo/wDEVAxhDtqqngm45qeuDO9t/wBSlqotQ3qduqvaW80pcOmavu+a0KeTVhVjvNwICd/BnpPpvmuntNG4hBdUU2ksYQk88eJOegjxzooZgliSxFPALkeKk+Q6kxpaZKUwqwbVZkYFWtYAFjUBfuzAOemJkK4pBnDU2Jh1VSKgUWBGBLGMnkImCp/OuR1DBamLqij0ZkBW5YkCDnqFAONFpuVl6PcrKUjCC+6bQj5wPZznIIfd4MbW7wBRXd7ke0OTGQZPgSR4SQCwa5lZSpC2keClCKptYsSFAHUnp10KatUrkKXUBrgSoaBcl0EEAACc+scxAuUCotzo6MsqBEkEKC0x3YPiOkmJNO0UlIqASoVrS6rbaYZwbupwfyyOgjQqI9NnAUcFYXGqkSwJqsSQ8AG7qDynGizXVgUK13xa11hSqQQUUh3ClyI4iXBluRRWAVKiNDkZQkMxpqQpmUJVgYgDlJyBpqlJakAVKtO4WAOlxW5CHECIDVMkHtFzq6kayGmoRiK7DaKgqLrmKs4W3rJOPGByVmS2ouQc5JCLAuh2NzesLuJ6GBIJmpTVqiypa4qVGYBUwfcY+rVFlZmSCwt7Sk+fc8+k0ULQsmoXa5ezt/T1QuM/J6XU+tT++1aq1K7EsjGpPOVX9Cn1Iv1zluVTus5p7Zf8cNVJYWuJUBqw799nWyPzB9p8dIwKotO1RxVqe2Px95qrRpuTUqVQtM2hgKmez8trc8fH/wAaAB7pAa7ir7jOfSPZ7PN+pV9k95rmuZyTUHVHFQdnSO3tf9tKx20KHbsVlViln+DTqvygFTxXhtmo9RhHls/eaWqYULkmmrK9PjTu5jG5mKcR9H7PSs1ZaKJUsV1qgK3IjIp/vqVNLUq0Hqoq1A9qsFLeUoHjruU/s/idMvKmOXeZfy8feapo9O6AzSpm9ECZfHhOqllWqtPpm2UsrcKZ3L6c6VXZVtZ/K71Bn+5rbpIqUTAREVBhSnjHnjw01O9bZUso4IKS01IEtDEh4YTkePloikF6kyLmjiChKkAf4Vgdc+/QqhXptcJJLCFdzxtSHGAylCSI8NPk0lLlwblckBkCkYKKYYypzjkfGNAFgFCO99V7LGsCN4oWvabQvFYlpwc6NVWQFlLQy3qSF8JsDAkDbuCtOSBEY0pqoAtZUF7ABmGTJdXBPAZpsoEGTI6YpoDUFNblUXFaLtUI6gCAXJkAzDZzEmdJTFMklUsYgNcrciogipABE4mGEQFiRoliwZiEDFysyC9QuU7qjiAVMG7pIE5pJapFRja64pgNWZAFLSMh5QgdJLj3a2VcCozIpCUi0MEpqC1qKBaEsC0ukkq06LE02DXdJGAywLnMERhgJGRGNJ8lp1C9TbCrYzqNumCqNaUBBQEKFWAB4dYA0GIBWKgufjJBQMFuuWMxHv0iWAu46irE21VKEENOO8syOQznk0sgV1hripIWICxB+uIP+DQgNTd0IWndbwDIPzPDQYcIUq1Ru5fzP/s03zf+v77VKoBTaC18MpqI77lthB98X/ZnRKcWemagtUqr8OHD92lLzbIC3LU5Opx3h4e0f92jK1CzepxapwT8vVWjTZg6r4Kt23TTTvKrbfakw1+y+mckqCrLey7lO7FSKn9SPstBFDMSaTDFI0qdlK/wTb/3NEBbMqxQJnm/0m5u9p2efPGtzcUWutSlwVl6+k6/Rej1cVqP3qa3fR6ftbQGZlkqFTnjuCf7nzutuCN5rlKsA9PlAjn5Vevovm/q1SFQVqZLVNsghRdUenT8Pqk/tI071WR0PTvK3AnHD8fS6uQIqV6a2W4Wn+hlM6tIqM1NXKBNxgQ4hWLR75AP1fDSF2qGGIDoq2gmGjEkTG4rGZ0wwVXbUMXYKSQy2nABxIZsjpoVEW4K7MTBKAAMqwRjIkoTPh+7VQJB5MApsQEoQwbibpx/HppWq00qUxuWm1grEIwN1t3h0n6o1TIVioxY5d+8pRlZ1DHlJRG8fA+eqhTbta5ma0mqqK9sQpcKXm0lbgC8UuuSdOVh3tUXI6My1QARChXOSQfGp1EyviEZl4BKiKkZsdVZsKz02yhKyUGDxny0lVadN1qlKtOXpk+IFIgsw5CAYABAOZzoopBCsfZ2wqqAQ0FoJAuA6znShqa0SqbgunBaoiDv00CkMRKmBaIdsHRZRTLUGZblYIdzzEmRxhrgVzgdfDQooVrXGpynlAqSILOiQsAdcQAaZ6nVOoEqCqoQ3LIIS4MDIb3zbgQbg3lGrmULtvT7RuL3mSCQbWE9bvGM/CKtJhCsRYjMbBc0k8QKQvGSgwIwffp1d7iHleV1S9HMWbYkdn2n/fUGnURS14QXBecfipqpavYHoOhoauJ5Wst606hN8l/zNNdcHdQffdLblSU/H7PSwXpIzrdyt74e/wCk1aYXa5YpFFdCyX9zc0QO5T29upuKxfIqDxilw5x9RqYxpFd7nYMyOq3SqWfj2uqTqoVrg9MAMGneSzv/AEnpOujceRAdQFpmo+44B78ezx1+PP3OquoGSKnOpWJP+31fp81oFTRYKtzOii24Iv8ATHZ9rH8NUqdU1CmBFNmdjF+5uU4P6yp+8/R6U76qoWWc5a8O/wCf5f7miSUBUhQlpLG/rz56ChUFRgKbd27TKbnBaX4lL3xP+X47nQ0u9c7O0syqPxHX7TVq7RDW4YtcbrUZZuZSDORicidMAoHaB3lXqFmAAIUJaxunbv5e4sZJyaqq1qrcEa9RN8i03KIBBBME4PW0QNBQBSm5CCaVMKKpUsQ0rAgGQZnw9+mgCaoNoYMyXFsyZCcegC4AOcad3cneECqLWDU1dZplGDQApAaPOQ3lpyKSsyMoFQ1HCggqoIEXTBExymZOnpqCzoFQFTwJklVCyBBYzOBgzETBDAJVYLTcJDXI8BAcm0NkWn0RkgkSTAOhxMs0POQ1rVLhSVRMgC4tx64mcTpldQjWIILl46FxiDLZCuskwMY6RU/4fPyg7qiy7bthg3JlUDq9ygeQ94YlgykN2bKz4HeCkHJwRUIIMdIJEYGmqWESBKVLXGbWB4ArgDAkePjpkRyaYiTEXO0MQXuYmYMCZkAAYIEaIp201DNcpAgKUYZmDMZifHnMm7CgC0qWWAxgM5EEiAPEyD5ZOgHapcxugAqCYRBFjkCO+7GByzjAw5oKXlyUhWLBEb8/5wbv16Id6kAeLYE4Mv6P4ClnPZe018rjFP5LHh6TVZlawJvL3Wbcp021uXWMy27dyqsZPP2nx1abVpUybizIOkdofmp9J/UP1wgNMoKRZ2uVrwU0WqQGbjTNpIR7bzHluySH8vRG/RBW9KhzbcG7mO/2fo9KEl2U21JZm7O3TW2svFl8W3Lan7XTK6qnJOfdUz/z+i+r3/R6NnB7lHJXa+pcNAKELbyB83WVCDG37Tob5/m+7TDcgKhbNy8Qn6Z9p2hf6u/oLfarXT3l8D6P+3raoinUqMxv7yrtzz8qemZjIuC8eVgv3Hp9PHaj/L2muoWnVqX2tA2+N5qVPnfxjrpRaWUsaQCMUEZZUJbqMAKo+vQ3AhWoZAqblhKkIQQtxaAeh+rQdYdQDNNhYbiXU3GQFNgYBQW9492g8kM96GnA2ybwoUz3B84DHSZxjC0w7JTCqjnvSAYBJtwbMFsxmY8ZCgB2WnHaKzXhlADGEMKLyGDSDJB6sSdKGuQ3MCxZQzAXOIzLWslpPFwSMERGoaATK1JW5Ge1mDEwQQQCCR5CY1ENTJliCylwWuVgAouBPiYloHwnRdSACsFr1ctdbABa1X690gkyJ/Kk6IRxRpBQ9ztcCEcW5EBsSQv1FvMyC1Z5qXFQu2jrLBOYCi3ixJdZJ7xYYwQxuQNPFlLjBFTAhvAkkjAELEZBENxWgBUBcFocKQhI/KB9wxB9+mWSxWxQpySoBkyS0kGAD4dYMjqFkspRHbObATTNViJMD1Ee2MHkwL5YU2ZbKiXEA1LChKC0tcepiSv8NVKYLUkqM5DsFUi1wzsyowniSpbtIxAy3dLsVZGs5OjQYdhtnh5zufNeXx0yB2RnqKwNr3bj9an8rua+UfNfzKf3Otvt6jUmVR314d88/wC3pdotUYi4gRub1QOX6dn+sT0emc2kFBMSsyfz52vO/wB0c9F73AAamwNt1N4F453RgxTqUoPzffpjtNNarmalVFPoxZefx/U1TG6WWmtSSxYAQCB2bv8AZJ/K1SrUgzhai3llwjp0qU/Z4PZna1UcBaruwt5XJt3df/p/HRplU4yzdmLbP0/ZY0tO0TRWpcbgvAChT7Oaeez2qdXw/wC+kCkCowCtm4y/fqU/8x/DVrKWDcSvJVz1HfP7T+rrcVGDhypuFSEf+n9G+lqNTaxduWbIsdKnznT0vXRqkqadRgqXm2+nfU8k9n6nzvtMxqV2hdBUzUZUdH86bpiRl+yGjuVKcVKuKQZiCIYKCe/gyAW/x6XZCVABe0haikW026gKo6or7ZOImSZ6ixcygUSqgllZRdFqywPEiyCcdZwVKrUUzRUAq9MuxImAysi80tlpMqeIjjOraqCspliLDeoCljUHBoUMCEXozNDclSQGFOmV3CLl26dRIaqFAhYJBDECGgg9WJHXSh2VSGaobWi1SDI5MQpJIFQMJ8EGcmaqVg8lroG3cFSkpCgkYklWQmTntSOgEO6FzIA71MNgi2/lxIi0wRGdJtrtqVAcVDYoCKagZSz8QCiljUPiSufHVW4p+Q1OXZQL14mUKY7yMxU+Y6DGpcqINu2GF/aCRcoInxJaZyQT11gWgMBtjL2sqDMsFBEgiYgCbhIGNBS6iU7gV+IIAtG2JGSWE5Hrj3aveqQRczFGRgoFMgGzyLITM9TMREYd2FVHlJK2sHVhbueDcmJDHETJ68Y1XBNJVDIKbJJZcytqXiAwqEqAIMQ5nMHTVFAZbZIJutUkBQC0MrRDBcCPh5gRt0zWBQniyW1GgZqSefqdrn/PXya/N1OpWhW4VEd87dPSFVJABgSJ6HX/xAAUEQEAAAAAAAAAAAAAAAAAAABg/9oACAECAQE/AD//xAAUEQEAAAAAAAAAAAAAAAAAAABg/9oACAEDAQE/AD//2Q==';
        }
        if (path && path.includes('data')) return '';
        return '';
    }
};

try { 
/**
 * NEPSE TMS Content Script
 * Final Hardened Asynchronous Pipeline with Iframe Data Matrix
 */

// ── ANTI-THROTTLE KEEPALIVE (for Silent Mode ghost tabs) ───────────────────
// Chrome aggressively throttles setInterval (to ~1/min) in background tabs.
// This lightweight keepalive prevents that by simulating minimal activity.
// It has ZERO interaction with the order logic below.
// ────────────────────────────────────────────────────────────────────────────
(function initAntiThrottle() {
  if (document.hidden) {
    // We're in a background tab — activate keepalive
    // Toggle title to signal activity and prevent deep Chrome timer throttling
    setInterval(() => {
      document.title = document.title; // no-op assignment keeps tab "active"
    }, 25000);
  }
})();

// ── BROKER DETECTION ────────────────────────────────────────────────────────
(function detectBroker() {
  const host = window.location.hostname;
  if (host.includes('nepsetms.com.np')) {
    const match = host.match(/tms(\d+)/i);
    if (match && match[1]) {
      const brokerId = match[1];
      const brokerUrl = `${window.location.protocol}//${host}`;
      chrome.runtime.sendMessage({ 
        action: "update_broker_info", 
        url: brokerUrl, 
        id: brokerId 
      });
    }
  }
})();


const SELECTORS = {
  marketStatus: '.market-status-indicator',
  buyToggle: 'label.order__options--buy, label[for="buy"]',
  sellToggle: 'label.order__options--sell, label[for="sell"]',
  lmtToggle: 'label[for="limit"], input#limit, .limit-toggle, input[value="LMT"]',
  qtyInput: 'input[formcontrolname="quantity" i], input.form-qty',
  priceInput: 'input[formcontrolname="price" i], input[formcontrolname="orderPrice" i], input#price, input.order-price',
  submitOrderBtn: 'button[type="submit"]:not(.btn-default), .btn-success, .btn-danger, .buy-btn, .sell-btn',
  symbolInput: 'input#selectSymbol, input[formcontrolname="businessSymbol" i], input[placeholder*="Symbol" i]'
};

const MAX_RETRIES = 3;
const TOLERANCE_PCT = 1.8;
let executionInterval = null;
let isExecutingLoop = false;
let liveMarketDoc = null;

const delay = ms => new Promise(res => setTimeout(res, ms));

function ensureMarketIframe() {
  let f = document.getElementById("tmsHiddenMarketWatch");
  if (!f) {
    f = document.createElement("iframe");
    f.id = "tmsHiddenMarketWatch";
    f.src = "/tms/mwDashboard"; // SameOrigin relative path
    f.style.display = "none";
    f.onload = () => {
      try {
        liveMarketDoc = f.contentDocument;
        chrome.runtime.sendMessage({ action: "log_audit", log: "Live Market Pipeline Connected" });
      } catch (e) {
        console.warn("[NEPSE Auto-Trade] Iframe blocked by CSP.", e);
      }
    };
    document.body.appendChild(f);
  } else {
    try { liveMarketDoc = f.contentDocument; } catch (e) { }
  }
}

// Initialize polling if we are currently in Execution Mode
checkAppMode();

chrome.storage.onChanged.addListener((changes) => {
  if (changes.appMode || changes.orders || changes.silentMode) {
    checkAppMode();
  }
});

async function checkAppMode() {
  const data = await chrome.storage.local.get(['appMode', 'silentMode']);

  // Handle ghost tab logic in the MAIN window only
  if (window.name !== 'tms_ghost_tab') {
      const needsGhostTab = data.appMode === 'execution' && data.silentMode;
      let ghostFrame = document.getElementById('tms_ghost_frame');
      
      if (needsGhostTab) {
          if (!ghostFrame) {
              ghostFrame = document.createElement('iframe');
              ghostFrame.id = 'tms_ghost_frame';
              ghostFrame.name = 'tms_ghost_tab';
              ghostFrame.src = '/tms/me/memberclientorderentry';
              ghostFrame.style.display = 'none';
              document.body.appendChild(ghostFrame);
              chrome.runtime.sendMessage({ action: "log_audit", log: "👻 Silent Mode: Ghost Tab initialized." });
          }
      } else {
          if (ghostFrame) {
              ghostFrame.remove();
              chrome.runtime.sendMessage({ action: "log_audit", log: "👻 Silent Mode: Ghost Tab removed." });
          }
      }
  }

  if (data.appMode === 'execution') {
      const shouldRunExecution = !data.silentMode || window.name === 'tms_ghost_tab';
      
      if (shouldRunExecution) {
          if (!executionInterval) {
            console.log("[NEPSE Auto-Trade] 🟢 Execution Mode Engaged.");
            if (window.name !== 'tms_ghost_tab') {
                chrome.runtime.sendMessage({ action: "log_audit", log: "Bot Armed. Engaging market sweep..." });
            }
            executionInterval = setInterval(processOrders, 800);
          }
      } else {
          if (executionInterval) {
            clearInterval(executionInterval);
            executionInterval = null;
          }
      }
  } else {
    if (executionInterval) {
      clearInterval(executionInterval);
      executionInterval = null;
      console.log("[NEPSE Auto-Trade] 🔴 Execution Mode Halted.");
      if (window.name !== 'tms_ghost_tab') {
          chrome.runtime.sendMessage({ action: "log_audit", log: "Bot Disarmed. Execution loop terminated." });
    
          const freshAudit = await chrome.storage.local.get(['auditLogs']);
          const lastAudit = freshAudit.auditLogs && freshAudit.auditLogs[0] ? freshAudit.auditLogs[0] : "";
          if (!lastAudit.includes("! GLOBAL STOP ACTIVATED BY USER !")) {
            chrome.runtime.sendMessage({ action: "log_audit", log: "! GLOBAL STOP ACTIVATED BY USER !" });
          }
      }
    }
  }
}

async function processOrders() {
  if (isExecutingLoop) return;
  isExecutingLoop = true;

  try {
    const freshState = await chrome.storage.local.get(['appMode']);
    if (freshState.appMode !== 'execution') return;

    // ── SILENT MODE GATE ──────────────────────────────────────────────────
    // When Silent Mode is ON, only the ghost tab should run execution.
    // All other TMS tabs the user has open are left alone (no redirect).
    try {
      const resp = await chrome.runtime.sendMessage({ action: "check_execution_tab" });
      if (resp && !resp.isExecutionTab) return; // Not the ghost tab — skip silently
    } catch (e) {
      // Background not ready yet — skip this cycle
      return;
    }
    // ──────────────────────────────────────────────────────────────────────

    if (!window.location.href.includes('orderentry')) {
      const freshAudit = await chrome.storage.local.get(['auditLogs']);
      const lastAudit = freshAudit.auditLogs && freshAudit.auditLogs[0] ? freshAudit.auditLogs[0] : "";
      if (!lastAudit.includes("Redirecting to Order")) {
        chrome.runtime.sendMessage({ action: "log_audit", log: `Auto-Routing to Order Entry Page...` });
      }
      setTimeout(() => {
        window.location.href = '/tms/me/memberclientorderentry';
      }, 1000);
      return;
    }

    ensureMarketIframe();

    if (!detectMarketOpen()) {
      const freshAudit = await chrome.storage.local.get(['auditLogs']);
      const last = freshAudit.auditLogs && freshAudit.auditLogs[0] ? freshAudit.auditLogs[0] : "";
      if (!last.includes("Market Hours Check")) {
        chrome.runtime.sendMessage({ action: "log_audit", log: `Market Hours Check Blocked (11AM to 3PM limit).` });
      }
      return;
    }

    const data = await chrome.storage.local.get(['orders']);
    if (!data.orders) return;

    const pendingOrders = data.orders.filter(o => o.status === 'pending');
    if (pendingOrders.length === 0) return;

    // Collect live rows from the hidden market iframe (if available and not CSP-blocked)
    let iframeRows = [];
    if (liveMarketDoc) {
      try { iframeRows = Array.from(liveMarketDoc.querySelectorAll('tbody tr')); } catch (e) { }
    }

    // ── PIPELINE ACTIVE CHECK ────────────────────────────────────────────
    // The iframe element may exist but be CSP-blocked (0 rows).
    // Only treat the pipeline as active when it actually has market data.
    // If the iframe is empty, fall through to the DOM-based execution path.
    const isPipelineActive = !!document.getElementById("tmsHiddenMarketWatch") && iframeRows.length > 5;
    // ────────────────────────────────────────────────────────────────────


    if (isPipelineActive) {
      // Auto-refresh the Headless Pipeline every 10 seconds
      if (!window.lastIframeRefresh || Date.now() - window.lastIframeRefresh > 10000) {
        window.lastIframeRefresh = Date.now();
        const f = document.getElementById("tmsHiddenMarketWatch");
        if (f) f.src = f.src;
        chrome.runtime.sendMessage({ action: "log_audit", log: "Pipeline streaming fresh data..." });
        return;
      }

      for (let order of pendingOrders) {
        const row = iframeRows.find(r => {
          const tds = r.querySelectorAll('td');
          return tds.length > 2 && tds[0].innerText.trim().toUpperCase() === order.symbol.toUpperCase();
        });

        if (!row) {
          chrome.runtime.sendMessage({ action: "log_audit", log: `Pipeline: No row found for ${order.symbol} in market watch.` });
          continue;
        }

        const tds = row.querySelectorAll('td');
        const ltpText = tds[1].innerText.replace(/,/g, '');
        const livePrice = parseFloat(ltpText);

        let triggered = false;
        if (order.triggerCondition === 'auto') triggered = true; // Band validation handles it
        if (order.triggerCondition === '>=' && livePrice >= order.basePrice) triggered = true;
        if (order.triggerCondition === '<=' && livePrice <= order.basePrice) triggered = true;

        const freshAudit = await chrome.storage.local.get(['auditLogs']);
        const lastAudit = freshAudit.auditLogs && freshAudit.auditLogs[0] ? freshAudit.auditLogs[0] : "";
        const targetWarn = `Pipeline | ${order.symbol} | LTP: ${livePrice} | Target: ${order.triggerCondition} ${order.basePrice}`;

        if (!triggered) {
          if (!lastAudit.includes(targetWarn)) {
            chrome.runtime.sendMessage({ action: "log_audit", log: targetWarn });
          }
          continue;
        }

        chrome.runtime.sendMessage({ action: "log_audit", log: `PIPELINE TRIGGERED! | ${order.type} ${order.symbol} | LTP: ${livePrice}` });
        await executeOrderWithRetry(order, true, livePrice);
        await delay(2000);
      }
    } else {
      for (let order of pendingOrders) {
        const recheck = await chrome.storage.local.get(['appMode']);
        if (recheck.appMode !== 'execution') break;

        await executeOrderWithRetry(order, false);
        await delay(2500);
      }
    }
  } finally {
    isExecutingLoop = false;
  }
}

function setNativeValue(element, value) {
  const valueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
  valueSetter.call(element, value);
  element.dispatchEvent(new Event('input', { bubbles: true }));
  element.dispatchEvent(new Event('change', { bubbles: true }));
  // NOTE: No blur here — blur triggers Angular re-validation which wipes the value
}

async function setAndVerify(input, value, maxTries = 5) {
  for (let i = 0; i < maxTries; i++) {
    setNativeValue(input, value);
    await delay(300);
    if (String(input.value) === String(value)) return true;
    chrome.runtime.sendMessage({ action: "log_audit", log: `Retry ${i + 1}: Angular wiped value, re-injecting ${value}...` });
  }
  return false;
}

function detectMarketOpen() {
  const now = new Date();
  const hours = now.getHours();
  // Market Hours: 11 AM to 3 PM Nepal Standard Time
  if (hours >= 11 && hours < 15) return true;
  return false;
}

function clickByExactText(nodeType, text) {
  const elements = Array.from(document.querySelectorAll(nodeType));
  const target = elements.find(el => el.innerText && el.innerText.trim().toUpperCase() === text.toUpperCase());
  if (target) {
    target.click();
    return true;
  }
  return false;
}

/**
 * Reads the Last Traded Price currently shown on the TMS order entry form.
 * Uses a multi-tier strategy:
 *  1. Known TMS LTP display selectors (most reliable — bound to the selected symbol)
 *  2. Broad DOM scan for any visible element containing "LTP" text < 60 chars
 */
async function fetchLiveLTP() {
  try {
    // Priority 1: TMS order form renders LTP in specific elements after symbol selection
    const ltpSelectors = [
      '.price-display',              // TMS order form LTP container
      '.order__form--prodtype',       // TMS Angular component wrapper
      '[class*="ltp"]',              // any element with "ltp" in class name
      '[id*="ltp"]',                 // any element with "ltp" in id
      '.stock-ltp',
      '.order-ltp',
      '.last-traded-price',
      'span[formcontrolname*="ltp" i]',
      'td.ltp-cell',
    ];
    for (const sel of ltpSelectors) {
      const el = getVisibleNode(sel);
      if (el) {
        const match = (el.innerText || el.textContent || '').match(/([\d,]+\.?\d*)/);
        if (match) {
          const val = parseFloat(match[1].replace(/,/g, ''));
          if (val > 0) return val;
        }
      }
    }

    // Priority 2: Broad scan — visible element that contains "LTP" text near a number
    const allElements = Array.from(document.querySelectorAll('label, span, div, p, strong, td'));
    let ltpNodes = allElements.filter(el => {
      const txt = el.innerText ? el.innerText.toUpperCase() : '';
      return txt.includes('LTP') && !txt.includes('NEPSE') && txt.length < 60;
    });

    if (ltpNodes.length > 0) {
      ltpNodes.sort((a, b) => a.innerText.length - b.innerText.length);
      const match = ltpNodes[0].innerText.match(/([\d,]+\.?\d*)/);
      if (match) {
        const val = parseFloat(match[1].replace(/,/g, ''));
        if (val > 0) return val;
      }
    }
  } catch (e) {
    console.error("LTP Fetch Error", e);
  }
  return null;
}

function findSymbolInputSafe() {
  // Priority 1: Angular ng-select or mat-autocomplete wrappers used by TMS
  const ngSelectInput = getVisibleNode(
    'ng-select input, .ng-select input, .ng-input input, mat-autocomplete input, [role="combobox"]'
  );
  if (ngSelectInput) return ngSelectInput;

  // Priority 2: Explicit SELECTORS from the known TMS DOM
  const explicitInput = getVisibleNode(SELECTORS.symbolInput);
  if (explicitInput) return explicitInput;

  // Priority 3: Any text input whose placeholder mentions 'symbol' or 'stock' (case-insensitive)
  const allInputs = Array.from(document.querySelectorAll('input[type="text"], input:not([type])'));
  const hintMatch = allInputs.find(n => {
    if (n.offsetWidth === 0 && n.offsetHeight === 0) return false;
    const ph = (n.placeholder || '').toLowerCase();
    const fc = (n.getAttribute('formcontrolname') || '').toLowerCase();
    const id = (n.id || '').toLowerCase();
    return ph.includes('symbol') || ph.includes('stock') || fc.includes('symbol') || id.includes('symbol');
  });
  if (hintMatch) return hintMatch;

  // Priority 4: Fallback — first visible text input that is NOT a known qty/price field
  const qtyInput = getVisibleNode(SELECTORS.qtyInput);
  const priceInput = getVisibleNode(SELECTORS.priceInput);
  const firstVisible = allInputs.find(n => {
    if (n.offsetWidth === 0 && n.offsetHeight === 0) return false;
    if (n === qtyInput || n === priceInput) return false;
    if (n.type === 'number') return false;
    return true;
  });
  return firstVisible || null;
}

function getVisibleNode(selector, parent = document) {
  const nodes = Array.from(parent.querySelectorAll(selector));
  return nodes.find(n => n.offsetWidth > 0 || n.offsetHeight > 0);
}

/**
 * After clicking the TMS submit button, a confirmation modal appears.
 * This function waits up to 3 seconds for it, then clicks the confirm button.
 * Returns true if a confirmation was found and clicked, false if no modal appeared.
 */
async function handleTMSConfirmDialog() {
  const POLL_MS = 200;
  const MAX_POLLS = 15; // up to 3 seconds

  for (let i = 0; i < MAX_POLLS; i++) {
    // Try selector-based match first
    const confirmSelectors = [
      '.modal-footer .btn-primary',
      '.modal-footer .btn-success',
      '.modal-footer .btn-danger',   // some TMS flows use red for confirm
      '.modal .btn-confirm',
      '.confirm-dialog .btn-ok',
      '[data-dismiss="modal"].btn-primary'
    ];
    for (const sel of confirmSelectors) {
      const btn = getVisibleNode(sel);
      if (btn) {
        btn.click();
        return true;
      }
    }

    // Try text-based match (handles localised "Yes" / "OK" / "Confirm")
    const textMatches = ['YES', 'CONFIRM', 'OK', 'PLACE ORDER', 'SUBMIT'];
    for (const txt of textMatches) {
      if (clickByExactText('button', txt)) return true;
    }

    await delay(POLL_MS);
  }
  return false; // No confirmation dialog appeared (some TMS flows don't show one)
}

/**
 * NEPSE TMS rejects limit orders priced outside ±3% of the current LTP.
 * This validates whether the planned targetPrice is already within the
 * exchange-allowed band — WITHOUT modifying the price.
 *
 * If inside band  → proceed to inject and submit.
 * If outside band → skip this cycle, log, and wait for LTP to drift closer.
 *
 * @param {number} targetPrice - The planned order price
 * @param {number} livePrice   - The current LTP read from the form
 * @param {number} [bandPct=3] - Allowed deviation in % (TMS default: 3%)
 * @returns {{ valid: boolean, min: number, max: number }}
 */
function isPriceInTMSBand(targetPrice, livePrice, bandPct = 3.0) {
  const factor = bandPct / 100;
  const min = parseFloat((livePrice * (1 - factor)).toFixed(2));
  const max = parseFloat((livePrice * (1 + factor)).toFixed(2));
  return {
    valid: targetPrice >= min && targetPrice <= max,
    min,
    max
  };
}

/**
 * Waits for the ng-select / Angular autocomplete dropdown to render,
 * then finds the option matching the given symbol and clicks it.
 * ng-select commits a selection on 'mousedown' — not on 'click' or keyboard.
 * Returns true if an option was found and clicked, false otherwise.
 */
async function clickDropdownOption(symbol) {
  const optionSelectors = [
    '.ng-option',                   // ng-select standard
    '.ng-dropdown-panel .ng-option', // ng-select inside a panel
    'mat-option',                   // Angular Material autocomplete
    '[role="option"]',              // Generic ARIA option role
    '.dropdown-item',               // Bootstrap-style dropdowns
    'li.autocomplete-item',         // Custom implementations
    'ul.dropdown-menu li'           // Legacy TMS custom dropdowns
  ].join(', ');

  // Poll up to 1500ms for the dropdown to appear
  const POLL_INTERVAL = 150;
  const MAX_POLLS = 10;
  for (let i = 0; i < MAX_POLLS; i++) {
    const allOptions = Array.from(document.querySelectorAll(optionSelectors))
      .filter(el => el.offsetWidth > 0 || el.offsetHeight > 0);

    if (allOptions.length > 0) {
      // Find the option whose visible text starts with or exactly matches our symbol
      const upperSym = symbol.toUpperCase();
      let target = allOptions.find(el => {
        const txt = (el.innerText || el.textContent || '').trim().toUpperCase();
        return txt === upperSym || txt.startsWith(upperSym + ' ') || txt.startsWith(upperSym + '(');
      });

      // Fallback: just click the very first visible option
      if (!target) target = allOptions[0];

      // Fire the full event sequence ng-select expects
      target.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
      await delay(80);
      target.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      await delay(80);
      target.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
      target.dispatchEvent(new MouseEvent('click', { bubbles: true }));

      chrome.runtime.sendMessage({ action: "log_audit", log: `Clicked option: "${(target.innerText || '').trim()}"` });
      return true;
    }

    await delay(POLL_INTERVAL);
  }
  return false; // No dropdown appeared
}

async function executeOrderWithRetry(order, skipDOMPriceCheck = false, pipelineLTP = null) {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const data = await chrome.storage.local.get(['orders']);
      const currentOrderState = data.orders.find(o => o.id === order.id);
      if (!currentOrderState || currentOrderState.status !== 'pending') break;

      // 1. INJECT SYMBOL FIRST
      const symbolInputObj = findSymbolInputSafe();
      if (!symbolInputObj) {
        const warningLog = `Waiting... Please open 'Order Management -> Buy/Sell' form in TMS!`;
        const freshAudit = await chrome.storage.local.get(['auditLogs']);
        const lastAudit = freshAudit.auditLogs && freshAudit.auditLogs[0] ? freshAudit.auditLogs[0] : "";
        if (!lastAudit.includes("Waiting... Please open")) chrome.runtime.sendMessage({ action: "log_audit", log: warningLog });
        return;
      }

      const freshAudit1 = await chrome.storage.local.get(['auditLogs']);
      const lastAudit1 = freshAudit1.auditLogs && freshAudit1.auditLogs[0] ? freshAudit1.auditLogs[0] : "";
      if (!lastAudit1.includes(`Injecting Symbol: ${order.symbol}`)) chrome.runtime.sendMessage({ action: "log_audit", log: `Injecting Symbol: ${order.symbol}...` });

      symbolInputObj.focus();
      // Clear the field first so Angular registers a clean new input event
      setNativeValue(symbolInputObj, '');
      await delay(150);
      setNativeValue(symbolInputObj, order.symbol);

      // Fire keyup — some Angular autocomplete components listen to this to trigger the search
      symbolInputObj.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, key: order.symbol.slice(-1) }));
      await delay(900); // Wait for Angular debounce + dropdown list to render in the DOM

      // --- STRATEGY 1: Direct DOM click on the matching dropdown option ---
      // ng-select commits selection on 'mousedown', not 'click' or keyboard Enter.
      const optionSelected = await clickDropdownOption(order.symbol);

      if (!optionSelected) {
        // --- STRATEGY 2: Keyboard fallback (ArrowDown + Enter) ---
        chrome.runtime.sendMessage({ action: "log_audit", log: `No clickable option found for ${order.symbol}, trying keyboard fallback...` });
        symbolInputObj.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowDown', keyCode: 40 }));
        await delay(400);
        symbolInputObj.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Enter', keyCode: 13 }));
      }
      await delay(500); // Let Angular commit the selection and re-render the form

      if (!skipDOMPriceCheck) {
        const freshAuditLtp = await chrome.storage.local.get(['auditLogs']);
        const lastAuditLtp = freshAuditLtp.auditLogs && freshAuditLtp.auditLogs[0] ? freshAuditLtp.auditLogs[0] : "";
        if (!lastAuditLtp.includes(`Awaiting Live Price`)) chrome.runtime.sendMessage({ action: "log_audit", log: `Awaiting Live Price from NEPSE for ${order.symbol}...` });

        await delay(2500);

        const livePrice = await fetchLiveLTP();
        if (livePrice === null) {
          const warningLtp = `Failed: Typed ${order.symbol} but couldn't find LTP text on screen!`;
          const fa = await chrome.storage.local.get(['auditLogs']);
          const la = fa.auditLogs && fa.auditLogs[0] ? fa.auditLogs[0] : "";
          if (!la.includes(warningLtp)) chrome.runtime.sendMessage({ action: "log_audit", log: warningLtp });
          return;
        }

        let triggered = false;
        if (order.triggerCondition === 'auto') triggered = true; // Band validation handles it
        if (order.triggerCondition === '>=' && livePrice >= order.basePrice) triggered = true;
        if (order.triggerCondition === '<=' && livePrice <= order.basePrice) triggered = true;

        const lastCheck = await chrome.storage.local.get(['auditLogs']);
        const laLtp = lastCheck.auditLogs && lastCheck.auditLogs[0] ? lastCheck.auditLogs[0] : "";
        const targetWaitLog = `Scanning | ${order.symbol} | LTP: ${livePrice} | Target: ${order.triggerCondition} ${order.basePrice}`;

        if (!triggered) {
          if (!laLtp.includes(targetWaitLog)) chrome.runtime.sendMessage({ action: "log_audit", log: targetWaitLog });
          return;
        }

        chrome.runtime.sendMessage({ action: "log_audit", log: `TRIGGERED! | ${order.type} ${order.symbol} | LTP: ${livePrice} | Attempt ${attempt}` });
      } else {
        chrome.runtime.sendMessage({ action: "log_audit", log: `Synchronizing order form for ${order.symbol}...` });
        await delay(2500);
      }

      // 4. CONTINUE EXECUTION (LMT, QTY, PRICE, SUBMIT)
      const lmtToggle = getVisibleNode(SELECTORS.lmtToggle);
      if (lmtToggle) lmtToggle.click();
      await delay(800);

      const togglerWrappers = Array.from(document.querySelectorAll('.xtoggler-btn-wrapper')).filter(n => n.offsetWidth > 0);
      if (togglerWrappers.length >= 2) {
        if (order.type === 'SELL') {
          togglerWrappers[0].click();
        } else {
          togglerWrappers[togglerWrappers.length - 1].click();
        }
      } else {
        clickByExactText('label', order.type) || clickByExactText('span', order.type);
      }
      await delay(800);

       // ── PRICE BAND VALIDATION (GATE) ────────────────────────────────────────
      // Read the LTP NEPSE is showing in the order form right now.
      // Only inject and submit if our targetPrice is within the user's
      // configured tolerance (≤3%) of that LTP.
      // If outside → skip this cycle and wait for LTP to drift into range.
      // We never modify the targetPrice — NEPSE will accept or reject as-is.
      //
      // When called from the Pipeline path, pipelineLTP is already known from
      // the iframe — use it directly instead of waiting for the form DOM.
      const ltpForValidation = pipelineLTP || await fetchLiveLTP();

      if (ltpForValidation) {
        const ltpSource = pipelineLTP ? 'Pipeline' : 'Form';
        const toleranceData = await chrome.storage.local.get(['priceTolerance']);
        const bandPct = toleranceData.priceTolerance || 3.0;
        const band = isPriceInTMSBand(order.targetPrice, ltpForValidation, bandPct);
        const bandLog = `Band (${ltpSource}) | ${order.symbol} | Target: ${order.targetPrice} | LTP: ${ltpForValidation} | Range: [${band.min}–${band.max}]`;

        if (!band.valid) {
          const fa = await chrome.storage.local.get(['auditLogs']);
          const la = fa.auditLogs && fa.auditLogs[0] ? fa.auditLogs[0] : '';
          if (!la.includes(bandLog)) {
            chrome.runtime.sendMessage({
              action: 'log_audit',
              log: `⏸️ Outside Band | ${order.symbol} | Target ${order.targetPrice} not in [${band.min}–${band.max}] (LTP ${ltpForValidation}). Waiting for LTP...`
            });
          }
          return; // Skip — bot retries on next processOrders tick (every 800ms)
        }

        chrome.runtime.sendMessage({
          action: 'log_audit',
          log: `✅ Band OK (${ltpSource}) | ${order.symbol} | ${order.targetPrice} ∈ [${band.min}–${band.max}] | LTP: ${ltpForValidation} → Submitting`
        });
      } else {
        // LTP not readable yet — symbol may still be loading. Abort safely.
        chrome.runtime.sendMessage({
          action: 'log_audit',
          log: `⚠️ LTP not visible for ${order.symbol} yet. Waiting for form to populate...`
        });
        return;
      }
      // ─────────────────────────────────────────────────────────────────────────

      // Price is validated — inject the exact planned target price
      const executionPrice = order.targetPrice;
      chrome.runtime.sendMessage({ action: 'log_audit', log: `Injecting Qty & Price (${executionPrice})...` });


      const qtyInput = getVisibleNode(SELECTORS.qtyInput);
      if (qtyInput) {
        qtyInput.focus();
        const qtyOk = await setAndVerify(qtyInput, order.qty);
        if (!qtyOk) chrome.runtime.sendMessage({ action: "log_audit", log: "Warning: Qty could not be confirmed after 5 attempts!" });
      } else {
        chrome.runtime.sendMessage({ action: "log_audit", log: "Failed: Could not find visible Qty text box!" });
      }

      const priceInput = getVisibleNode(SELECTORS.priceInput);
      if (priceInput) {
        priceInput.focus();
        const priceOk = await setAndVerify(priceInput, executionPrice);
        if (!priceOk) chrome.runtime.sendMessage({ action: "log_audit", log: "Warning: Price could not be confirmed after 5 attempts!" });
      } else {
        chrome.runtime.sendMessage({ action: "log_audit", log: "Failed: Could not find visible Price text box!" });
      }

      const preClickRecheck = await chrome.storage.local.get(['appMode']);
      if (preClickRecheck.appMode !== 'execution') {
        throw new Error("Halted by Kill Switch immediately before submit.");
      }

      chrome.runtime.sendMessage({ action: "log_audit", log: "Locating Final Execute Button..." });

      const qtyInputRef = getVisibleNode(SELECTORS.qtyInput);
      const activeForm = (qtyInputRef && qtyInputRef.closest('form')) || document.body;

      // PRE FLIGHT VERIFICATION ON VISIBLE NODES
      const preFlightQty = getVisibleNode(SELECTORS.qtyInput, activeForm);
      if (preFlightQty && String(preFlightQty.value) !== String(order.qty)) {
        chrome.runtime.sendMessage({ action: "log_audit", log: `Pre-Flight Anomaly: Angular wiped Qty. Correcting...` });
        preFlightQty.focus();
        const qtyFixed = await setAndVerify(preFlightQty, order.qty);
        if (!qtyFixed) {
          chrome.runtime.sendMessage({ action: "log_audit", log: `ABORT: Qty still wrong after correction. Skipping submit.` });
          return;
        }
      }

      const preFlightPrice = getVisibleNode(SELECTORS.priceInput, activeForm);
      if (preFlightPrice && String(preFlightPrice.value) !== String(executionPrice)) {
        chrome.runtime.sendMessage({ action: "log_audit", log: `Pre-Flight Anomaly: Angular wiped Price. Correcting to ${executionPrice}...` });
        preFlightPrice.focus();
        const priceFixed = await setAndVerify(preFlightPrice, executionPrice);
        if (!priceFixed) {
          chrome.runtime.sendMessage({ action: "log_audit", log: `ABORT: Price still wrong after correction. Skipping submit.` });
          return;
        }
      }

      // Trigger blur NOW — after values are confirmed, right before submit
      if (preFlightQty) preFlightQty.dispatchEvent(new Event('blur', { bubbles: true }));
      if (preFlightPrice) preFlightPrice.dispatchEvent(new Event('blur', { bubbles: true }));
      await delay(500); // let Angular's digest cycle settle after blur

      const executingBtn = getVisibleNode('button[type="submit"]:not(.btn-default)', activeForm) || getVisibleNode('.btn-success, .btn-danger', activeForm);

      if (executingBtn) {
        executingBtn.click();
        chrome.runtime.sendMessage({ action: "log_audit", log: `Clicked Submit: "${executingBtn.innerText.trim()}" — awaiting TMS confirmation...` });
      } else {
        chrome.runtime.sendMessage({ action: "log_audit", log: "Failed: Could not find visible Submit Button!" });
        return; // Cannot proceed without a submit button
      }

      // ── CONFIRMATION DIALOG ─────────────────────────────────────────
      // TMS shows an "Are you sure?" modal after submit. We must click
      // confirm or the order is never actually placed.
      const confirmed = await handleTMSConfirmDialog();
      if (confirmed) {
        chrome.runtime.sendMessage({ action: "log_audit", log: `✅ Order Confirmed by TMS dialog for ${order.symbol}.` });
      } else {
        chrome.runtime.sendMessage({ action: "log_audit", log: `ℹ️ No confirmation dialog detected — assuming order submitted directly.` });
      }
      // ────────────────────────────────────────────────────────────────

      await delay(1200); // Allow TMS to process and show success/error toast

      chrome.runtime.sendMessage({
        action: "update_order",
        orderId: order.id,
        status: "executed",
        retries: attempt
      });

      chrome.runtime.sendMessage({ action: "log_audit", log: `🟢 ORDER PLACED | ${order.symbol} | Qty: ${order.qty} | Price: ${executionPrice}` });

      console.log(`[NEPSE Auto-Trade] Order ${order.symbol} successfully processed.`);
      return;

    } catch (error) {
      console.error(`[NEPSE Auto-Trade] Execution failed for ${order.symbol} Attempt ${attempt}:`, error);

      if (attempt === MAX_RETRIES) {
        chrome.runtime.sendMessage({
          action: "update_order",
          orderId: order.id,
          status: "failed",
          retries: attempt
        });
        chrome.runtime.sendMessage({ action: "log_audit", log: `Failed Final | ${order.symbol} | ${error.message}` });
      } else {
        chrome.runtime.sendMessage({ action: "log_audit", log: `Failed Retry | ${order.symbol} | ${error.message}` });
      }

      await delay(1500);
    }
  } // end for loop
} // end executeOrderWithRetry

} catch(e) { console.error('Content Script Error', e); }
// ==========================================
// 4. DP HOLDINGS MAPPER (Background Scraper)
// ==========================================

function scrapeDPHoldingsDOM(doc) {
    const rows = doc.querySelectorAll('kendo-grid-list tr, table.k-grid-table tr, .k-grid-content tr, tbody tr');
    if (rows.length === 0) return false;
    
    let holdings = {};
    rows.forEach(row => {
        const tds = row.querySelectorAll('td');
        if (tds.length >= 5) {
            let symbol = '';
            let tmsBalanceText = '';
            
            for (let i=0; i<tds.length; i++) {
               let txt = tds[i].innerText.trim();
               if (/^[A-Z]{3,6}$/.test(txt)) {
                   symbol = txt;
               }
            }
            
            if (symbol && tds.length >= 6) {
                tmsBalanceText = tds[4].innerText.replace(/,/g, '').trim(); 
                let tmsBalance = parseFloat(tmsBalanceText);
                
                if (isNaN(tmsBalance)) {
                    tmsBalanceText = tds[5].innerText.replace(/,/g, '').trim(); 
                    tmsBalance = parseFloat(tmsBalanceText);
                }
                
                if (!isNaN(tmsBalance) && tmsBalance > 0) {
                    holdings[symbol] = tmsBalance;
                }
            }
        }
    });
    
    if (Object.keys(holdings).length > 0) {
        localStorage.setItem('__my_dp_holdings', JSON.stringify(holdings));
        return true;
    }
    return false;
}

function scrapeDPHoldings() {
    // If we are currently ON the dp-holding page, do it immediately
    if (window.location.href.includes('dp-holding')) {
        const select = document.querySelector('select[aria-label="items per page"]');
        if (select && select.value !== "40") {
            select.value = "40";
            select.dispatchEvent(new Event('change', { bubbles: true }));
            setTimeout(() => scrapeDPHoldingsDOM(document), 1000);
        } else {
            scrapeDPHoldingsDOM(document);
        }
        return;
    }

    // Otherwise, we are NOT on dp-holding. Let's do a background fetch if we are logged in.
    // Ensure we only do this once per load to prevent infinite loops or spam
    if (window.__bg_scraper_running) return;
    window.__bg_scraper_running = true;

    // Check if we are on login page, don't scrape
    if (window.location.href.includes('/login')) return;

    // Helper to run when body is ready
    function runBgScraper() {
        // Create a hidden iframe to load the DP holding page in the background
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframe.src = '/tms/edis/dp-holding';
        iframe.id = 'bg-dp-holding-scraper';
        document.body.appendChild(iframe);

        iframe.onload = () => {
            try {
                const idoc = iframe.contentDocument || iframe.contentWindow.document;
                
                let attempts = 0;
                const interval = setInterval(() => {
                    attempts++;
                    if (attempts > 60) { // Timeout after 6s
                        clearInterval(interval); 
                        if (iframe.parentNode) iframe.remove();
                        return; 
                    }

                    const select = idoc.querySelector('select[aria-label="items per page"]');
                    if (select) {
                        if (select.value !== "40") {
                            select.value = "40";
                            select.dispatchEvent(new Event('change', { bubbles: true }));
                            setTimeout(() => {
                                const success = scrapeDPHoldingsDOM(idoc);
                                if (success && window.location.href.includes('orderentry')) {
                                    const existing = document.getElementById('my-holdings-widget');
                                    if (existing) existing.remove();
                                    injectHoldingsWidget();
                                }
                                clearInterval(interval);
                                if (iframe.parentNode) iframe.remove();
                            }, 1500); // Wait for grid reload
                        } else {
                            const success = scrapeDPHoldingsDOM(idoc);
                            if (success && window.location.href.includes('orderentry')) {
                                const existing = document.getElementById('my-holdings-widget');
                                if (existing) existing.remove();
                                injectHoldingsWidget();
                            }
                            clearInterval(interval);
                            if (iframe.parentNode) iframe.remove();
                        }
                    } else {
                        // Try to scrape immediately in case there's no pager (few items)
                        const rows = idoc.querySelectorAll('kendo-grid-list tr, table.k-grid-table tr, .k-grid-content tr, tbody tr');
                        if (rows.length > 0) {
                            const success = scrapeDPHoldingsDOM(idoc);
                            if (success && window.location.href.includes('orderentry')) {
                                const existing = document.getElementById('my-holdings-widget');
                                if (existing) existing.remove();
                                injectHoldingsWidget();
                            }
                            clearInterval(interval);
                            if (iframe.parentNode) iframe.remove();
                        }
                    }
                }, 100);
            } catch(e) {
                console.error("Iframe scrape failed", e);
                if (iframe.parentNode) iframe.remove();
            }
        };
    }

    if (document.body) {
        runBgScraper();
    } else {
        document.addEventListener('DOMContentLoaded', runBgScraper);
    }
}

function injectHoldingsWidget() {
    if (!window.location.href.includes('orderentry')) return;
    if (document.getElementById('my-holdings-widget')) return;
    
    const orderFormArea = document.querySelector('app-order-entry-form, .order-entry-container, form, .card-body, .main-content');
    if (!orderFormArea) return;

    const rawHoldings = localStorage.getItem('__my_dp_holdings');
    if (!rawHoldings) return;
    const holdings = JSON.parse(rawHoldings);
    if (Object.keys(holdings).length === 0) return;
    
    const widget = document.createElement('div');
    widget.id = 'my-holdings-widget';
    widget.className = 'holdings-widget';
    
    let html = '<h4>⚡ My Available Holdings (TMS Balance)</h4><div class="holdings-list">';
    for(let sym in holdings) {
        html += `<div class="holding-chip" data-sym="${sym}" data-qty="${holdings[sym]}">${sym}: ${holdings[sym]}</div>`;
    }
    html += '</div>';
    widget.innerHTML = html;
    
    orderFormArea.insertBefore(widget, orderFormArea.firstChild);
    
    widget.querySelectorAll('.holding-chip').forEach(chip => {
        chip.addEventListener('click', async (e) => {
            const sym = e.target.getAttribute('data-sym');
            const qty = e.target.getAttribute('data-qty');
            
            const delay = ms => new Promise(res => setTimeout(res, ms));

            function getVisibleNode(selector, parent = document) {
                const nodes = Array.from(parent.querySelectorAll(selector));
                return nodes.find(n => n.offsetWidth > 0 || n.offsetHeight > 0);
            }
            
            function setNativeValue(element, value) {
                const valueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
                valueSetter.call(element, value);
                element.dispatchEvent(new Event('input', { bubbles: true }));
                element.dispatchEvent(new Event('change', { bubbles: true }));
            }

            async function clickDropdownOption(symbol) {
                const optionSelectors = [
                    '.ng-option', '.ng-dropdown-panel .ng-option', 'mat-option',
                    '[role="option"]', '.dropdown-item', 'li.autocomplete-item', 'ul.dropdown-menu li'
                ].join(', ');

                for (let i = 0; i < 30; i++) { // Poll every 50ms for up to 1.5s
                    const allOptions = Array.from(document.querySelectorAll(optionSelectors)).filter(el => el.offsetWidth > 0 || el.offsetHeight > 0);
                    if (allOptions.length > 0) {
                        const upperSym = symbol.toUpperCase();
                        let target = allOptions.find(el => {
                            const txt = (el.innerText || el.textContent || '').trim().toUpperCase();
                            return txt === upperSym || txt.startsWith(upperSym + ' ') || txt.startsWith(upperSym + '(');
                        });
                        if (!target) target = allOptions[0];

                        target.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
                        await delay(10);
                        target.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
                        await delay(10);
                        target.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
                        target.dispatchEvent(new MouseEvent('click', { bubbles: true }));
                        return true;
                    }
                    await delay(50);
                }
                return false;
            }

            function findSymbolInputSafe() {
                const ngSelectInput = getVisibleNode('ng-select input, .ng-select input, .ng-input input, mat-autocomplete input, [role="combobox"]');
                if (ngSelectInput) return ngSelectInput;
                const explicitInput = getVisibleNode('input#selectSymbol, input[formcontrolname="businessSymbol" i], input[placeholder*="Symbol" i]');
                if (explicitInput) return explicitInput;
                
                const allInputs = Array.from(document.querySelectorAll('input[type="text"], input:not([type])'));
                const hintMatch = allInputs.find(n => {
                    if (n.offsetWidth === 0 && n.offsetHeight === 0) return false;
                    const ph = (n.placeholder || '').toLowerCase();
                    const fc = (n.getAttribute('formcontrolname') || '').toLowerCase();
                    const id = (n.id || '').toLowerCase();
                    return ph.includes('symbol') || ph.includes('stock') || fc.includes('symbol') || id.includes('symbol');
                });
                if (hintMatch) return hintMatch;

                const qtyInput = getVisibleNode('input[formcontrolname="quantity" i], input.form-qty, input#quantity');
                const priceInput = getVisibleNode('input[formcontrolname="price" i], input[formcontrolname="orderPrice" i], input#price, input.order-price');
                const firstVisible = allInputs.find(n => {
                    if (n.offsetWidth === 0 && n.offsetHeight === 0) return false;
                    if (n === qtyInput || n === priceInput) return false;
                    if (n.type === 'number') return false;
                    return true;
                });
                return firstVisible || null;
            }
            
            const symbolInputObj = findSymbolInputSafe();
            const qtyInputObj = getVisibleNode('input[formcontrolname="quantity" i], input.form-qty, input#quantity');
            
            if (symbolInputObj) {
                symbolInputObj.focus();
                setNativeValue(symbolInputObj, '');
                await delay(50); // Faster clear wait
                setNativeValue(symbolInputObj, sym);
                symbolInputObj.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, key: sym.slice(-1) }));
                await delay(50); // Barely wait before aggressive polling

                const optionSelected = await clickDropdownOption(sym);
                if (!optionSelected) {
                    symbolInputObj.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowDown', keyCode: 40 }));
                    await delay(100);
                    symbolInputObj.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Enter', keyCode: 13 }));
                }
                await delay(100); // Faster commit wait
            }
            
            if (qtyInputObj) {
                qtyInputObj.focus();
                for (let i = 0; i < 5; i++) {
                    setNativeValue(qtyInputObj, qty);
                    await delay(50); // Faster quantity verify loop
                    if (String(qtyInputObj.value) === String(qty)) break;
                }
            }
        });
    });
}

// ==========================================
// 5. LOGIN AUTOFILL (Password Manager Widget)
// ==========================================

function injectLoginWidget() {
    if (!window.location.href.includes('/login')) return;

    if (window.__loginWidgetInitialized) return;
    window.__loginWidgetInitialized = true;

    function setAngularValue(element, value) {
        if (!element) return;
        const valueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
        valueSetter.call(element, value);
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
    }

    // Migrate old saved accounts format to new named format
    let savedData = {};
    try {
        savedData = JSON.parse(localStorage.getItem('__tms_saved_accounts') || '{}');
        let migrated = false;
        Object.keys(savedData).forEach(key => {
            if (typeof savedData[key] === 'string') {
                savedData[key] = { user: key, pass: savedData[key] };
                migrated = true;
            }
        });
        if (migrated) {
            localStorage.setItem('__tms_saved_accounts', JSON.stringify(savedData));
        }
    } catch(e){}

    // Attempt to pre-fill the last used profile on load
    setTimeout(() => {
        const lastProfile = localStorage.getItem('__tms_last_profile');
        if (lastProfile) {
            let saved = {};
            try { saved = JSON.parse(localStorage.getItem('__tms_saved_accounts') || '{}'); } catch(e){}
            if (saved[lastProfile]) {
                const userInp = document.querySelector('input[formcontrolname="userName"], input[name="userName"], input[type="text"]');
                const passInp = document.querySelector('input[formcontrolname="password"], input[name="password"], input[type="password"]');
                if (userInp && passInp) {
                    setAngularValue(userInp, saved[lastProfile].user);
                    setAngularValue(passInp, atob(saved[lastProfile].pass));
                }
            }
        }
    }, 1000);

    // Inject the Floating Widget
    const widgetHtml = `
        <div id="tms-pw-manager-btn" style="
            position: fixed;
            bottom: 20px;
            right: 20px;
            width: 28px;
            height: 28px;
            background: linear-gradient(135deg, #FCD535, #F8B400);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            box-shadow: 0 4px 15px rgba(252, 213, 53, 0.4);
            z-index: 9999999;
            transition: all 0.2s ease-in-out;
            border: none;
            filter: invert(1) hue-rotate(180deg);
        ">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1E2329" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
        </div>

        <div id="tms-pw-manager-panel" style="
            display: none;
            position: fixed;
            bottom: 70px;
            right: 20px;
            width: 320px;
            background: #1E2329;
            border: 1px solid #333;
            border-radius: 12px;
            padding: 20px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.8);
            z-index: 9999999;
            color: #E0E3E7;
            font-family: 'Inter', sans-serif;
            filter: invert(1) hue-rotate(180deg);
        ">
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #333; padding-bottom: 12px; margin-bottom: 15px;">
                <h3 style="margin: 0; font-size: 16px; color: #FCD535; display: flex; align-items: center; gap: 8px;">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                    Password Manager
                </h3>
            </div>
            
            <!-- Load Profile Section -->
            <div style="background: #2a2a35; padding: 12px; border-radius: 8px; margin-bottom: 15px; border: 1px solid #3b3b4f;">
                <label style="display: block; font-size: 12px; color: #848E9C; margin-bottom: 6px; font-weight: 600;">LOAD PROFILE</label>
                <select id="tms-pw-select" style="
                    width: 100%;
                    padding: 8px 12px;
                    background: #1E2329;
                    border: 1px solid #444;
                    color: white;
                    border-radius: 6px;
                    outline: none;
                    margin-bottom: 10px;
                    font-size: 13px;
                "></select>
                <div style="display: flex; gap: 8px;">
                    <button id="tms-pw-load-btn" style="
                        flex: 2;
                        padding: 8px;
                        background: #FCD535;
                        border: none;
                        border-radius: 6px;
                        color: #1E2329;
                        font-weight: bold;
                        cursor: pointer;
                        font-size: 13px;
                        transition: background 0.2s;
                    ">Load</button>
                    <button id="tms-pw-delete-btn" style="
                        flex: 1;
                        padding: 8px;
                        background: transparent;
                        border: 1px solid #d32f2f;
                        border-radius: 6px;
                        color: #d32f2f;
                        font-weight: bold;
                        cursor: pointer;
                        font-size: 13px;
                        transition: all 0.2s;
                    ">Delete</button>
                </div>
            </div>

            <!-- Save Profile Section -->
            <div style="background: #2a2a35; padding: 12px; border-radius: 8px; border: 1px solid #3b3b4f;">
                <label style="display: block; font-size: 12px; color: #848E9C; margin-bottom: 6px; font-weight: 600;">SAVE CURRENT LOGIN</label>
                <input type="text" id="tms-pw-name-inp" placeholder="Profile Name (e.g. My Account)" style="
                    width: 100%;
                    box-sizing: border-box;
                    padding: 8px 12px;
                    background: #1E2329;
                    border: 1px solid #444;
                    color: white;
                    border-radius: 6px;
                    outline: none;
                    margin-bottom: 10px;
                    font-size: 13px;
                " />
                <button id="tms-pw-save-btn" style="
                    width: 100%;
                    padding: 8px;
                    background: #3b3b4f;
                    border: 1px solid #555;
                    border-radius: 6px;
                    color: white;
                    font-weight: bold;
                    cursor: pointer;
                    font-size: 13px;
                    transition: background 0.2s;
                ">Save Profile</button>
            </div>
            
            <div id="tms-pw-status" style="margin-top: 12px; font-size: 12px; color: #FCD535; text-align: center; height: 15px; font-weight: 600;"></div>
        </div>
    `;

    const widgetContainer = document.createElement('div');
    widgetContainer.innerHTML = widgetHtml;
    document.body.appendChild(widgetContainer);

    const btn = document.getElementById('tms-pw-manager-btn');
    const panel = document.getElementById('tms-pw-manager-panel');
    const select = document.getElementById('tms-pw-select');
    const nameInp = document.getElementById('tms-pw-name-inp');
    const loadBtn = document.getElementById('tms-pw-load-btn');
    const deleteBtn = document.getElementById('tms-pw-delete-btn');
    const saveBtn = document.getElementById('tms-pw-save-btn');
    const statusMsg = document.getElementById('tms-pw-status');

    // Hover effects
    btn.addEventListener('mouseenter', () => btn.style.transform = 'scale(1.1)');
    btn.addEventListener('mouseleave', () => btn.style.transform = 'scale(1)');
    loadBtn.addEventListener('mouseenter', () => loadBtn.style.background = '#F8B400');
    loadBtn.addEventListener('mouseleave', () => loadBtn.style.background = '#FCD535');
    saveBtn.addEventListener('mouseenter', () => saveBtn.style.background = '#4b4b6f');
    saveBtn.addEventListener('mouseleave', () => saveBtn.style.background = '#3b3b4f');
    deleteBtn.addEventListener('mouseenter', () => { deleteBtn.style.background = '#d32f2f'; deleteBtn.style.color = 'white'; });
    deleteBtn.addEventListener('mouseleave', () => { deleteBtn.style.background = 'transparent'; deleteBtn.style.color = '#d32f2f'; });

    function refreshSelect() {
        let saved = {};
        try { saved = JSON.parse(localStorage.getItem('__tms_saved_accounts') || '{}'); } catch(e){}
        select.innerHTML = '';
        Object.keys(saved).forEach(profileName => {
            const opt = document.createElement('option');
            opt.value = profileName;
            opt.innerText = profileName;
            select.appendChild(opt);
        });
        if (select.options.length > 0) {
            const lastProfile = localStorage.getItem('__tms_last_profile');
            if (lastProfile && saved[lastProfile]) {
                select.value = lastProfile;
            }
        }
    }

    function showStatus(msg) {
        statusMsg.innerText = msg;
        setTimeout(() => { statusMsg.innerText = ''; }, 3000);
    }

    btn.addEventListener('click', () => {
        panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
        if (panel.style.display === 'block') refreshSelect();
    });

    saveBtn.addEventListener('click', () => {
        const userInp = document.querySelector('input[formcontrolname="userName"], input[name="userName"], input[type="text"]');
        const passInp = document.querySelector('input[formcontrolname="password"], input[name="password"], input[type="password"]');
        
        let profileName = nameInp.value.trim();
        
        if (userInp && passInp && userInp.value && passInp.value) {
            if (!profileName) {
                profileName = userInp.value; // Default to username if no name provided
            }

            let saved = {};
            try { saved = JSON.parse(localStorage.getItem('__tms_saved_accounts') || '{}'); } catch(e){}
            
            saved[profileName] = {
                user: userInp.value,
                pass: btoa(passInp.value)
            };
            
            localStorage.setItem('__tms_saved_accounts', JSON.stringify(saved));
            localStorage.setItem('__tms_last_profile', profileName);
            
            nameInp.value = ''; // clear input
            refreshSelect();
            select.value = profileName;
            showStatus("Profile Saved!");
        } else {
            showStatus("Enter Username & Password in the form first!");
        }
    });

    loadBtn.addEventListener('click', () => {
        const selectedProfile = select.value;
        if (!selectedProfile) return;
        
        let saved = {};
        try { saved = JSON.parse(localStorage.getItem('__tms_saved_accounts') || '{}'); } catch(e){}
        
        if (saved[selectedProfile]) {
            const userInp = document.querySelector('input[formcontrolname="userName"], input[name="userName"], input[type="text"]');
            const passInp = document.querySelector('input[formcontrolname="password"], input[name="password"], input[type="password"]');
            
            if (userInp && passInp) {
                setAngularValue(userInp, saved[selectedProfile].user);
                setAngularValue(passInp, atob(saved[selectedProfile].pass));
                localStorage.setItem('__tms_last_profile', selectedProfile);
                showStatus("Profile Loaded!");
            }
        }
    });

    deleteBtn.addEventListener('click', () => {
        const selectedProfile = select.value;
        if (!selectedProfile) return;
        
        let saved = {};
        try { saved = JSON.parse(localStorage.getItem('__tms_saved_accounts') || '{}'); } catch(e){}
        
        if (saved[selectedProfile]) {
            delete saved[selectedProfile];
            localStorage.setItem('__tms_saved_accounts', JSON.stringify(saved));
            
            if (localStorage.getItem('__tms_last_profile') === selectedProfile) {
                localStorage.removeItem('__tms_last_profile');
            }
            
            refreshSelect();
            showStatus("Profile Deleted!");
        }
    });
}

setInterval(() => {
    if (window.location.href.includes('/login') && !window.__loginWidgetInitialized) {
        if (document.body) injectLoginWidget();
    } else if (!window.location.href.includes('/login')) {
        window.__loginWidgetInitialized = false;
        const btn = document.getElementById('tms-pw-manager-btn');
        const panel = document.getElementById('tms-pw-manager-panel');
        if (btn) btn.remove();
        if (panel) panel.remove();
    }
}, 500);

const ENCODED_POPUP = 'PCFET0NUWVBFIGh0bWw+CjxodG1sIGxhbmc9ImVuIj4KCjxoZWFkPgogIDxtZXRhIGNoYXJzZXQ9IlVURi04Ij4KICA8dGl0bGU+TkVQU0UgQXV0b21hdGlvbjwvdGl0bGU+CiAgPHN0eWxlPgovKiBEeW5hbWljIEZvbnRzICYgVUkgKi8KCjpyb290IHsKICAtLWZvbnQtZmFtaWx5OiAnVHcgQ2VuIE1UJywgJ1R3IENlbiBNVCBDb25kZW5zZWQnLCBzeXN0ZW0tdWksIHNhbnMtc2VyaWY7CiAgLS1iZy1jb2xvcjogIzBmMTcyYTsKICAtLWJnLWdyYWRpZW50OiBsaW5lYXItZ3JhZGllbnQoMTM1ZGVnLCAjMGYxNzJhIDAlLCAjMWUxYjRiIDEwMCUpOwogIC0tY2FyZC1iZzogcmdiYSgzMCwgNDEsIDU5LCAwLjcpOwogIC0tdGV4dC1tYWluOiAjZjhmYWZjOwogIC0tdGV4dC1tdXRlZDogIzk0YTNiODsKICAtLWFjY2VudC1wcmltYXJ5OiAjOGI1Y2Y2OwogIC0tYWNjZW50LWhvdmVyOiAjN2MzYWVkOwogIC0tYWNjZW50LWdyYWRpZW50OiBsaW5lYXItZ3JhZGllbnQoOTBkZWcsICM4YjVjZjYsICM2MzY2ZjEpOwogIC0tdGl0bGUtZ3JhZGllbnQ6IGxpbmVhci1ncmFkaWVudCg5MGRlZywgI2MwODRmYywgIzNiODJmNik7CiAgLS1idXktY29sb3I6ICMxMGI5ODE7CiAgLS1idXktYmc6IHJnYmEoMTYsIDE4NSwgMTI5LCAwLjE1KTsKICAtLXNlbGwtY29sb3I6ICNlZjQ0NDQ7CiAgLS1zZWxsLWJnOiByZ2JhKDIzOSwgNjgsIDY4LCAwLjE1KTsKICAtLWJvcmRlci1jb2xvcjogIzMzNDE1NTsKICAtLWJvcmRlci1yYWRpdXM6IDEycHg7CiAgLS1zaGFkb3c6IDAgNHB4IDE1cHggcmdiYSgwLCAwLCAwLCAwLjMpOwogIC0tdHJhbnNpdGlvbjogYWxsIDAuMnMgZWFzZTsKfQoKLyog4pSA4pSAIFRIRU1FOiBBcXVhdGljIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgCAqLwpbZGF0YS10aGVtZT0iYXF1YXRpYyJdIHsKICAtLWZvbnQtZmFtaWx5OiAnU2Vnb2UgVUknLCAnSGVsdmV0aWNhIE5ldWUnLCBzeXN0ZW0tdWksIHNhbnMtc2VyaWY7CiAgLS1iZy1jb2xvcjogIzBhMTkyZjsKICAtLWJnLWdyYWRpZW50OiBsaW5lYXItZ3JhZGllbnQoMTM1ZGVnLCAjMGExOTJmIDAlLCAjMGQyYjQ1IDUwJSwgIzBmMzQ2MCAxMDAlKTsKICAtLWNhcmQtYmc6IHJnYmEoMTMsIDQzLCA2OSwgMC43NSk7CiAgLS10ZXh0LW1haW46ICNlMGY0ZmY7CiAgLS10ZXh0LW11dGVkOiAjN2ZiM2QzOwogIC0tYWNjZW50LXByaW1hcnk6ICMwMGI0ZDg7CiAgLS1hY2NlbnQtaG92ZXI6ICMwMDk2Yzc7CiAgLS1hY2NlbnQtZ3JhZGllbnQ6IGxpbmVhci1ncmFkaWVudCg5MGRlZywgIzAwYjRkOCwgIzAwNzdiNik7CiAgLS10aXRsZS1ncmFkaWVudDogbGluZWFyLWdyYWRpZW50KDkwZGVnLCAjNDhjYWU0LCAjMDBiNGQ4KTsKICAtLWJ1eS1jb2xvcjogIzA2ZDZhMDsKICAtLWJ1eS1iZzogcmdiYSg2LCAyMTQsIDE2MCwgMC4xNSk7CiAgLS1zZWxsLWNvbG9yOiAjZmY2YjZiOwogIC0tc2VsbC1iZzogcmdiYSgyNTUsIDEwNywgMTA3LCAwLjE1KTsKICAtLWJvcmRlci1jb2xvcjogIzFhNGE2ZTsKICAtLXNoYWRvdzogMCA0cHggMTVweCByZ2JhKDAsIDExOSwgMTgyLCAwLjIpOwp9CgovKiDilIDilIAgVEhFTUU6IERlc2VydCDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIAgKi8KW2RhdGEtdGhlbWU9ImRlc2VydCJdIHsKICAtLWZvbnQtZmFtaWx5OiAnR2VvcmdpYScsICdQYWxhdGlubyBMaW5vdHlwZScsIHNlcmlmOwogIC0tYmctY29sb3I6ICMxYTEyMGI7CiAgLS1iZy1ncmFkaWVudDogbGluZWFyLWdyYWRpZW50KDEzNWRlZywgIzFhMTIwYiAwJSwgIzJkMWIwZSA1MCUsICMzYzI0MTUgMTAwJSk7CiAgLS1jYXJkLWJnOiByZ2JhKDYwLCAzNiwgMjEsIDAuNzUpOwogIC0tdGV4dC1tYWluOiAjZmVmM2UyOwogIC0tdGV4dC1tdXRlZDogI2M0YTg4MjsKICAtLWFjY2VudC1wcmltYXJ5OiAjZTg4NzFlOwogIC0tYWNjZW50LWhvdmVyOiAjZDk3NzA2OwogIC0tYWNjZW50LWdyYWRpZW50OiBsaW5lYXItZ3JhZGllbnQoOTBkZWcsICNlODg3MWUsICNjYTY3MDIpOwogIC0tdGl0bGUtZ3JhZGllbnQ6IGxpbmVhci1ncmFkaWVudCg5MGRlZywgI2ZiYmYyNCwgI2U4ODcxZSk7CiAgLS1idXktY29sb3I6ICM4NGNjMTY7CiAgLS1idXktYmc6IHJnYmEoMTMyLCAyMDQsIDIyLCAwLjE1KTsKICAtLXNlbGwtY29sb3I6ICNlZjQ0NDQ7CiAgLS1zZWxsLWJnOiByZ2JhKDIzOSwgNjgsIDY4LCAwLjE1KTsKICAtLWJvcmRlci1jb2xvcjogIzVjM2QyZTsKICAtLXNoYWRvdzogMCA0cHggMTVweCByZ2JhKDIzMiwgMTM1LCAzMCwgMC4xNSk7Cn0KCi8qIOKUgOKUgCBUSEVNRTogRHVzayDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIAgKi8KW2RhdGEtdGhlbWU9ImR1c2siXSB7CiAgLS1mb250LWZhbWlseTogJ1RyZWJ1Y2hldCBNUycsICdMdWNpZGEgU2FucyBVbmljb2RlJywgc2Fucy1zZXJpZjsKICAtLWJnLWNvbG9yOiAjMWExMDI1OwogIC0tYmctZ3JhZGllbnQ6IGxpbmVhci1ncmFkaWVudCgxMzVkZWcsICMxYTEwMjUgMCUsICMyZDE3NDggNTAlLCAjM2ExMjU1IDEwMCUpOwogIC0tY2FyZC1iZzogcmdiYSg0NSwgMjMsIDcyLCAwLjcpOwogIC0tdGV4dC1tYWluOiAjZmNlN2YzOwogIC0tdGV4dC1tdXRlZDogI2MwODRiMDsKICAtLWFjY2VudC1wcmltYXJ5OiAjZWM0ODk5OwogIC0tYWNjZW50LWhvdmVyOiAjZGIyNzc3OwogIC0tYWNjZW50LWdyYWRpZW50OiBsaW5lYXItZ3JhZGllbnQoOTBkZWcsICNlYzQ4OTksICNhODU1ZjcpOwogIC0tdGl0bGUtZ3JhZGllbnQ6IGxpbmVhci1ncmFkaWVudCg5MGRlZywgI2Y5YThkNCwgI2MwODRmYyk7CiAgLS1idXktY29sb3I6ICMzNGQzOTk7CiAgLS1idXktYmc6IHJnYmEoNTIsIDIxMSwgMTUzLCAwLjE1KTsKICAtLXNlbGwtY29sb3I6ICNmYjcxODU7CiAgLS1zZWxsLWJnOiByZ2JhKDI1MSwgMTEzLCAxMzMsIDAuMTUpOwogIC0tYm9yZGVyLWNvbG9yOiAjNGEyMDYwOwogIC0tc2hhZG93OiAwIDRweCAxNXB4IHJnYmEoMjM2LCA3MiwgMTUzLCAwLjE1KTsKfQoKLyog4pSA4pSAIFRIRU1FOiBOaWdodCBHcmVlbiDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIAgKi8KW2RhdGEtdGhlbWU9Im5pZ2h0Z3JlZW4iXSB7CiAgLS1mb250LWZhbWlseTogJ0NvbnNvbGFzJywgJ0NvdXJpZXIgTmV3JywgbW9ub3NwYWNlOwogIC0tYmctY29sb3I6ICMwYTFhMGE7CiAgLS1iZy1ncmFkaWVudDogbGluZWFyLWdyYWRpZW50KDEzNWRlZywgIzBhMWEwYSAwJSwgIzBkMjgxOCA1MCUsICMwZjM1MjAgMTAwJSk7CiAgLS1jYXJkLWJnOiByZ2JhKDEzLCA0MCwgMjQsIDAuNzUpOwogIC0tdGV4dC1tYWluOiAjZGNmY2U3OwogIC0tdGV4dC1tdXRlZDogIzZlZTdhMDsKICAtLWFjY2VudC1wcmltYXJ5OiAjMjJjNTVlOwogIC0tYWNjZW50LWhvdmVyOiAjMTZhMzRhOwogIC0tYWNjZW50LWdyYWRpZW50OiBsaW5lYXItZ3JhZGllbnQoOTBkZWcsICMyMmM1NWUsICMxNTgwM2QpOwogIC0tdGl0bGUtZ3JhZGllbnQ6IGxpbmVhci1ncmFkaWVudCg5MGRlZywgIzRhZGU4MCwgIzIyYzU1ZSk7CiAgLS1idXktY29sb3I6ICM0YWRlODA7CiAgLS1idXktYmc6IHJnYmEoNzQsIDIyMiwgMTI4LCAwLjE1KTsKICAtLXNlbGwtY29sb3I6ICNmODcxNzE7CiAgLS1zZWxsLWJnOiByZ2JhKDI0OCwgMTEzLCAxMTMsIDAuMTUpOwogIC0tYm9yZGVyLWNvbG9yOiAjMWE0YTJlOwogIC0tc2hhZG93OiAwIDRweCAxNXB4IHJnYmEoMzQsIDE5NywgOTQsIDAuMTUpOwp9CgpodG1sIHsgCiAgZm9udC1zaXplOiAxNHB4OyAKICBiYWNrZ3JvdW5kLWNvbG9yOiB2YXIoLS1iZy1jb2xvcik7IC8qIEZhbGxiYWNrIGZvciBmdWxsLXRhYiBtb2RlICovCiAgbWluLWhlaWdodDogMTAwdmg7Cn0KaHRtbFtkYXRhLWZvbnQtc2l6ZT0ic21hbGwiXSB7IGZvbnQtc2l6ZTogMTJweDsgfQpodG1sW2RhdGEtZm9udC1zaXplPSJsYXJnZSJdIHsgZm9udC1zaXplOiAxNnB4OyB9CgoqIHsKICBib3gtc2l6aW5nOiBib3JkZXItYm94OwogIG1hcmdpbjogMDsKICBwYWRkaW5nOiAwOwogIGZvbnQtZmFtaWx5OiB2YXIoLS1mb250LWZhbWlseSwgJ1R3IENlbiBNVCcsIHN5c3RlbS11aSwgc2Fucy1zZXJpZik7Cn0KCmJvZHkgewogIGJhY2tncm91bmQ6IHZhcigtLWJnLWdyYWRpZW50KTsKICBjb2xvcjogdmFyKC0tdGV4dC1tYWluKTsKICB3aWR0aDogMTAwJTsKICBtYXgtd2lkdGg6IDQ0MHB4OwogIG1hcmdpbjogMCBhdXRvOwogIG1pbi1oZWlnaHQ6IDUyMHB4OwogIG92ZXJmbG93LXg6IGhpZGRlbjsKICB0cmFuc2l0aW9uOiBiYWNrZ3JvdW5kIDAuNHMgZWFzZTsKfQoKLmNvbnRhaW5lciB7CiAgcGFkZGluZzogMThweDsKICBkaXNwbGF5OiBmbGV4OwogIGZsZXgtZGlyZWN0aW9uOiBjb2x1bW47CiAgZ2FwOiAyMHB4Owp9CgpoZWFkZXIgewogIGRpc3BsYXk6IGZsZXg7CiAganVzdGlmeS1jb250ZW50OiBzcGFjZS1iZXR3ZWVuOwogIGFsaWduLWl0ZW1zOiBjZW50ZXI7CiAgYm9yZGVyLWJvdHRvbTogMXB4IHNvbGlkIHJnYmEoMjU1LCAyNTUsIDI1NSwgMC4xKTsKICBwYWRkaW5nLWJvdHRvbTogMTRweDsKfQoKaDEgewogIGZvbnQtc2l6ZTogMS4ycmVtOwogIGZvbnQtd2VpZ2h0OiA3MDA7CiAgYmFja2dyb3VuZDogdmFyKC0tdGl0bGUtZ3JhZGllbnQpOwogIC13ZWJraXQtYmFja2dyb3VuZC1jbGlwOiB0ZXh0OwogIGJhY2tncm91bmQtY2xpcDogdGV4dDsKICAtd2Via2l0LXRleHQtZmlsbC1jb2xvcjogdHJhbnNwYXJlbnQ7CiAgbGV0dGVyLXNwYWNpbmc6IC0wLjAyZW07Cn0KCmgzIHsKICBmb250LXNpemU6IDAuOTVyZW07CiAgZm9udC13ZWlnaHQ6IDYwMDsKICBjb2xvcjogdmFyKC0tdGV4dC1tYWluKTsKICBtYXJnaW4tYm90dG9tOiAxMnB4Owp9CgovKiBUb2dnbGUgU3dpdGNoICovCi5tb2RlLXRvZ2dsZSB7CiAgZGlzcGxheTogZmxleDsKICBhbGlnbi1pdGVtczogY2VudGVyOwogIGdhcDogMTBweDsKICBmb250LXNpemU6IDAuODVyZW07CiAgZm9udC13ZWlnaHQ6IDUwMDsKICBjb2xvcjogdmFyKC0tdGV4dC1tdXRlZCk7Cn0KCi5zd2l0Y2ggewogIHBvc2l0aW9uOiByZWxhdGl2ZTsKICBkaXNwbGF5OiBpbmxpbmUtYmxvY2s7CiAgd2lkdGg6IDM2cHg7CiAgaGVpZ2h0OiAyMHB4Owp9Cgouc3dpdGNoIGlucHV0IHsKICBvcGFjaXR5OiAwOwogIHdpZHRoOiAwOwogIGhlaWdodDogMDsKfQoKLnNsaWRlciB7CiAgcG9zaXRpb246IGFic29sdXRlOwogIGN1cnNvcjogcG9pbnRlcjsKICB0b3A6IDA7CiAgbGVmdDogMDsKICByaWdodDogMDsKICBib3R0b206IDA7CiAgYmFja2dyb3VuZC1jb2xvcjogdmFyKC0tYm9yZGVyLWNvbG9yKTsKICB0cmFuc2l0aW9uOiAuNHM7CiAgYm9yZGVyLXJhZGl1czogMzRweDsKfQoKLnNsaWRlcjpiZWZvcmUgewogIHBvc2l0aW9uOiBhYnNvbHV0ZTsKICBjb250ZW50OiAiIjsKICBoZWlnaHQ6IDE0cHg7CiAgd2lkdGg6IDE0cHg7CiAgbGVmdDogM3B4OwogIGJvdHRvbTogM3B4OwogIGJhY2tncm91bmQtY29sb3I6IHdoaXRlOwogIHRyYW5zaXRpb246IC40czsKICBib3JkZXItcmFkaXVzOiA1MCU7Cn0KCmlucHV0OmNoZWNrZWQgKyAuc2xpZGVyIHsKICBiYWNrZ3JvdW5kOiB2YXIoLS1hY2NlbnQtZ3JhZGllbnQpOwp9CgppbnB1dDpjaGVja2VkICsgLnNsaWRlcjpiZWZvcmUgewogIHRyYW5zZm9ybTogdHJhbnNsYXRlWCgxNnB4KTsKfQoKLyogRm9ybXMgKi8KLm9yZGVyLWZvcm0gewogIGJhY2tncm91bmQ6IHZhcigtLWNhcmQtYmcpOwogIHBhZGRpbmc6IDE2cHg7CiAgYm9yZGVyLXJhZGl1czogdmFyKC0tYm9yZGVyLXJhZGl1cyk7CiAgYm9yZGVyOiAxcHggc29saWQgcmdiYSgyNTUsIDI1NSwgMjU1LCAwLjA1KTsKICBiYWNrZHJvcC1maWx0ZXI6IGJsdXIoMTBweCk7CiAgYm94LXNoYWRvdzogdmFyKC0tc2hhZG93KTsKfQoKLmlucHV0LWdyb3VwIHsKICBkaXNwbGF5OiBmbGV4OwogIGdhcDogMTBweDsKICBtYXJnaW4tYm90dG9tOiAxMnB4Owp9CgppbnB1dCwgc2VsZWN0IHsKICB3aWR0aDogMTAwJTsKICBiYWNrZ3JvdW5kOiByZ2JhKDE1LCAyMywgNDIsIDAuNik7CiAgYm9yZGVyOiAxcHggc29saWQgdmFyKC0tYm9yZGVyLWNvbG9yKTsKICBjb2xvcjogdmFyKC0tdGV4dC1tYWluKTsKICBwYWRkaW5nOiAxMHB4IDEycHg7CiAgYm9yZGVyLXJhZGl1czogOHB4OwogIGZvbnQtc2l6ZTogMC44NXJlbTsKICBvdXRsaW5lOiBub25lOwogIHRyYW5zaXRpb246IHZhcigtLXRyYW5zaXRpb24pOwp9CgppbnB1dDpmb2N1cywgc2VsZWN0OmZvY3VzIHsKICBib3JkZXItY29sb3I6IHZhcigtLWFjY2VudC1wcmltYXJ5KTsKICBib3gtc2hhZG93OiAwIDAgMCAycHggcmdiYSgxMzksIDkyLCAyNDYsIDAuMik7Cn0KCmlucHV0OjpwbGFjZWhvbGRlciB7CiAgY29sb3I6IHZhcigtLXRleHQtbXV0ZWQpOwp9CgovKiDilIDilIAgQ29tcGFjdCBGb3JtIENvbnRyb2xzIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgCAqLwouZm9ybS1zdWItcm93IHsKICBkaXNwbGF5OiBmbGV4OwogIGZsZXgtZGlyZWN0aW9uOiBjb2x1bW47CiAgZ2FwOiA0cHg7CiAgbWFyZ2luLWJvdHRvbTogMTJweDsKICBwYWRkaW5nOiA4cHggMTBweDsKICBiYWNrZ3JvdW5kOiByZ2JhKDE1LCAyMywgNDIsIDAuMzUpOwogIGJvcmRlci1yYWRpdXM6IDhweDsKICBib3JkZXI6IDFweCBzb2xpZCByZ2JhKDI1NSwgMjU1LCAyNTUsIDAuMDQpOwp9CgouaW5saW5lLWNvbnRyb2wgewogIGRpc3BsYXk6IGZsZXg7CiAgYWxpZ24taXRlbXM6IGNlbnRlcjsKICBnYXA6IDZweDsKfQoKLmlubGluZS1jb250cm9sIGxhYmVsIHsKICBmb250LXNpemU6IDAuNzhyZW07CiAgY29sb3I6IHZhcigtLXRleHQtbXV0ZWQpOwogIHdoaXRlLXNwYWNlOiBub3dyYXA7CiAgd2lkdGg6IGF1dG87CiAgcGFkZGluZzogMDsKICBiYWNrZ3JvdW5kOiBub25lOwogIGJvcmRlcjogbm9uZTsKfQoKLmNvbXBhY3QtaW5wdXQgewogIHdpZHRoOiA1NnB4ICFpbXBvcnRhbnQ7CiAgZmxleDogMCAwIDU2cHggIWltcG9ydGFudDsKICBwYWRkaW5nOiA2cHggOHB4ICFpbXBvcnRhbnQ7CiAgZm9udC1zaXplOiAwLjgycmVtICFpbXBvcnRhbnQ7CiAgdGV4dC1hbGlnbjogY2VudGVyOwp9CgouY29tcGFjdC1zZWxlY3QgewogIHdpZHRoOiBhdXRvICFpbXBvcnRhbnQ7CiAgZmxleDogMCAwIGF1dG8gIWltcG9ydGFudDsKICBwYWRkaW5nOiA2cHggOHB4ICFpbXBvcnRhbnQ7CiAgZm9udC1zaXplOiAwLjgycmVtICFpbXBvcnRhbnQ7CiAgbWluLXdpZHRoOiA2NHB4Owp9CgoudW5pdCB7CiAgZm9udC1zaXplOiAwLjc4cmVtOwogIGNvbG9yOiB2YXIoLS10ZXh0LW11dGVkKTsKICBmbGV4LXNocmluazogMDsKfQoKLmhlbHBlci10ZXh0IHsKICBmb250LXNpemU6IDAuNzJyZW07CiAgY29sb3I6IHZhcigtLXRleHQtbXV0ZWQpOwogIGxpbmUtaGVpZ2h0OiAxLjM7CiAgcGFkZGluZzogMCAycHg7Cn0KCi5oZWxwZXItdGV4dCBzdHJvbmcgewogIGNvbG9yOiB2YXIoLS1hY2NlbnQtcHJpbWFyeSk7CiAgZm9udC13ZWlnaHQ6IDYwMDsKfQoKLmJ0bi1wcmltYXJ5IHsKICB3aWR0aDogMTAwJTsKICBiYWNrZ3JvdW5kOiB2YXIoLS1hY2NlbnQtZ3JhZGllbnQpOwogIGNvbG9yOiB3aGl0ZTsKICBib3JkZXI6IG5vbmU7CiAgcGFkZGluZzogMTJweDsKICBib3JkZXItcmFkaXVzOiA4cHg7CiAgZm9udC13ZWlnaHQ6IDYwMDsKICBmb250LXNpemU6IDAuOXJlbTsKICBjdXJzb3I6IHBvaW50ZXI7CiAgdHJhbnNpdGlvbjogdmFyKC0tdHJhbnNpdGlvbik7CiAgYm94LXNoYWRvdzogMCAycHggOHB4IHJnYmEoMTM5LCA5MiwgMjQ2LCAwLjQpOwp9CgouYnRuLXByaW1hcnk6aG92ZXIgewogIHRyYW5zZm9ybTogdHJhbnNsYXRlWSgtMXB4KTsKICBib3gtc2hhZG93OiAwIDRweCAxMnB4IHJnYmEoMTM5LCA5MiwgMjQ2LCAwLjYpOwp9CgouYnRuLXByaW1hcnk6YWN0aXZlIHsKICB0cmFuc2Zvcm06IHRyYW5zbGF0ZVkoMXB4KTsKfQoKLmJ0bi1kYW5nZXIgewogIGJhY2tncm91bmQ6IGxpbmVhci1ncmFkaWVudCg5MGRlZywgI2VmNDQ0NCwgI2RjMjYyNik7CiAgY29sb3I6IHdoaXRlOwogIGJvcmRlcjogbm9uZTsKICBwYWRkaW5nOiA2cHggMTJweDsKICBib3JkZXItcmFkaXVzOiA2cHg7CiAgZm9udC13ZWlnaHQ6IDcwMDsKICBmb250LXNpemU6IDAuOHJlbTsKICBjdXJzb3I6IHBvaW50ZXI7CiAgYm94LXNoYWRvdzogMCAwIDEwcHggcmdiYSgyMzksIDY4LCA2OCwgMC40KTsKfQouYnRuLWRhbmdlcjpob3ZlciB7CiAgYmFja2dyb3VuZDogI2I5MWMxYzsKfQoKLmhpZGRlbiB7CiAgZGlzcGxheTogbm9uZSAhaW1wb3J0YW50Owp9CgouZXJyb3ItbXNnIHsKICBjb2xvcjogdmFyKC0tc2VsbC1jb2xvcik7CiAgZm9udC1zaXplOiAwLjhyZW07CiAgbWFyZ2luLXRvcDogOHB4OwogIHRleHQtYWxpZ246IGNlbnRlcjsKfQoKLyogT3JkZXIgTGlzdCAqLwojb3JkZXJzLWNvbnRhaW5lciB7CiAgZGlzcGxheTogZmxleDsKICBmbGV4LWRpcmVjdGlvbjogY29sdW1uOwogIGdhcDogMTBweDsKICBtYXgtaGVpZ2h0OiAyMDBweDsKICBvdmVyZmxvdy15OiBhdXRvOwogIHBhZGRpbmctcmlnaHQ6IDRweDsKfQoKI29yZGVycy1jb250YWluZXI6Oi13ZWJraXQtc2Nyb2xsYmFyIHsKICB3aWR0aDogNHB4Owp9Cgojb3JkZXJzLWNvbnRhaW5lcjo6LXdlYmtpdC1zY3JvbGxiYXItdHJhY2sgewogIGJhY2tncm91bmQ6IHRyYW5zcGFyZW50Owp9Cgojb3JkZXJzLWNvbnRhaW5lcjo6LXdlYmtpdC1zY3JvbGxiYXItdGh1bWIgewogIGJhY2tncm91bmQ6IHZhcigtLWJvcmRlci1jb2xvcik7CiAgYm9yZGVyLXJhZGl1czogNHB4Owp9Cgoub3JkZXItY2FyZCB7CiAgYmFja2dyb3VuZDogdmFyKC0tY2FyZC1iZyk7CiAgYm9yZGVyOiAxcHggc29saWQgcmdiYSgyNTUsIDI1NSwgMjU1LCAwLjA1KTsKICBib3JkZXItbGVmdDogNHB4IHNvbGlkIHZhcigtLWJvcmRlci1jb2xvcik7CiAgcGFkZGluZzogMTJweCAxNHB4OwogIGJvcmRlci1yYWRpdXM6IHZhcigtLWJvcmRlci1yYWRpdXMpOwogIGRpc3BsYXk6IGZsZXg7CiAganVzdGlmeS1jb250ZW50OiBzcGFjZS1iZXR3ZWVuOwogIGFsaWduLWl0ZW1zOiBjZW50ZXI7CiAgdHJhbnNpdGlvbjogdmFyKC0tdHJhbnNpdGlvbik7CiAgYm94LXNoYWRvdzogMCAycHggNnB4IHJnYmEoMCwwLDAsMC4yKTsKfQoKLm9yZGVyLWNhcmQ6aG92ZXIgewogIHRyYW5zZm9ybTogdHJhbnNsYXRlWCgycHgpOwogIGJhY2tncm91bmQ6IHJnYmEoMzAsIDQxLCA1OSwgMC45KTsKfQoKLm9yZGVyLWNhcmQuYnV5IHsKICBib3JkZXItbGVmdC1jb2xvcjogdmFyKC0tYnV5LWNvbG9yKTsKfQoKLm9yZGVyLWNhcmQuc2VsbCB7CiAgYm9yZGVyLWxlZnQtY29sb3I6IHZhcigtLXNlbGwtY29sb3IpOwp9Cgoub3JkZXItY2FyZC5leGVjdXRlZCB7CiAgb3BhY2l0eTogMC42OwogIGJvcmRlci1sZWZ0LWNvbG9yOiB2YXIoLS10ZXh0LW11dGVkKTsKfQoKLm9yZGVyLWluZm8gewogIGRpc3BsYXk6IGZsZXg7CiAgZmxleC1kaXJlY3Rpb246IGNvbHVtbjsKICBnYXA6IDRweDsKfQoKLm9yZGVyLXRpdGxlIHsKICBmb250LXdlaWdodDogNzAwOwogIGZvbnQtc2l6ZTogMC45NXJlbTsKICBkaXNwbGF5OiBmbGV4OwogIGFsaWduLWl0ZW1zOiBjZW50ZXI7CiAgZ2FwOiA4cHg7Cn0KCi5iYWRnZSB7CiAgZm9udC1zaXplOiAwLjY1cmVtOwogIHBhZGRpbmc6IDJweCA2cHg7CiAgYm9yZGVyLXJhZGl1czogNHB4OwogIGZvbnQtd2VpZ2h0OiA2MDA7Cn0KCi5iYWRnZS5idXkgewogIGJhY2tncm91bmQ6IHZhcigtLWJ1eS1iZyk7CiAgY29sb3I6IHZhcigtLWJ1eS1jb2xvcik7Cn0KCi5iYWRnZS5zZWxsIHsKICBiYWNrZ3JvdW5kOiB2YXIoLS1zZWxsLWJnKTsKICBjb2xvcjogdmFyKC0tc2VsbC1jb2xvcik7Cn0KCi5vcmRlci1kZXRhaWxzIHsKICBmb250LXNpemU6IDAuOHJlbTsKICBjb2xvcjogdmFyKC0tdGV4dC1tdXRlZCk7Cn0KCi5vcmRlci1kZXRhaWxzIHNwYW4gewogIGNvbG9yOiB2YXIoLS10ZXh0LW1haW4pOwogIGZvbnQtd2VpZ2h0OiA2MDA7Cn0KCi5kZWxldGUtYnRuIHsKICBiYWNrZ3JvdW5kOiB0cmFuc3BhcmVudDsKICBib3JkZXI6IG5vbmU7CiAgY29sb3I6IHZhcigtLXRleHQtbXV0ZWQpOwogIGN1cnNvcjogcG9pbnRlcjsKICBwYWRkaW5nOiA0cHg7CiAgYm9yZGVyLXJhZGl1czogNHB4OwogIHRyYW5zaXRpb246IHZhcigtLXRyYW5zaXRpb24pOwp9CgouZGVsZXRlLWJ0bjpob3ZlciB7CiAgY29sb3I6IHZhcigtLXNlbGwtY29sb3IpOwogIGJhY2tncm91bmQ6IHJnYmEoMjM5LCA2OCwgNjgsIDAuMSk7Cn0KCi8qIEFuaW1hdGlvbnMgKi8KQGtleWZyYW1lcyBzbGlkZUluIHsKICBmcm9tIHsgb3BhY2l0eTogMDsgdHJhbnNmb3JtOiB0cmFuc2xhdGVZKDEwcHgpOyB9CiAgdG8geyBvcGFjaXR5OiAxOyB0cmFuc2Zvcm06IHRyYW5zbGF0ZVkoMCk7IH0KfQoKLm9yZGVyLWNhcmQgewogIGFuaW1hdGlvbjogc2xpZGVJbiAwLjNzIGVhc2UgZm9yd2FyZHM7Cn0KCi8qIERpc2FibGVkIEZvcm0gU3RhdGUgKi8KLmV4ZWN1dGlvbi1tb2RlIHsKICBvcGFjaXR5OiAwLjU7CiAgcG9pbnRlci1ldmVudHM6IG5vbmU7Cn0KCi8qIENhcmQgYWN0aW9uIGJ1dHRvbnMgKGVkaXQgKyBkZWxldGUpICovCi5jYXJkLWFjdGlvbnMgewogIGRpc3BsYXk6IGZsZXg7CiAgZmxleC1kaXJlY3Rpb246IGNvbHVtbjsKICBnYXA6IDZweDsKICBmbGV4LXNocmluazogMDsKfQoKLmVkaXQtYnRuIHsKICBiYWNrZ3JvdW5kOiB0cmFuc3BhcmVudDsKICBib3JkZXI6IG5vbmU7CiAgY29sb3I6IHZhcigtLXRleHQtbXV0ZWQpOwogIGN1cnNvcjogcG9pbnRlcjsKICBwYWRkaW5nOiA0cHg7CiAgYm9yZGVyLXJhZGl1czogNHB4OwogIGZvbnQtc2l6ZTogMC44NXJlbTsKICB0cmFuc2l0aW9uOiB2YXIoLS10cmFuc2l0aW9uKTsKICBsaW5lLWhlaWdodDogMTsKfQoKLmVkaXQtYnRuOmhvdmVyIHsKICBjb2xvcjogI2Y1OWUwYjsKICBiYWNrZ3JvdW5kOiByZ2JhKDI0NSwgMTU4LCAxMSwgMC4xMik7Cn0KCi8qIEhpZ2hsaWdodCB0aGUgY2FyZCBjdXJyZW50bHkgYmVpbmcgZWRpdGVkICovCi5vcmRlci1jYXJkLmVkaXRpbmcgewogIGJvcmRlci1sZWZ0LWNvbG9yOiAjZjU5ZTBiICFpbXBvcnRhbnQ7CiAgYmFja2dyb3VuZDogcmdiYSgyNDUsIDE1OCwgMTEsIDAuMDYpICFpbXBvcnRhbnQ7CiAgYm94LXNoYWRvdzogMCAwIDAgMXB4IHJnYmEoMjQ1LCAxNTgsIDExLCAwLjI1KTsKfQoKLyogQ2FuY2VsIEVkaXQgYnV0dG9uICovCi5idG4tY2FuY2VsIHsKICB3aWR0aDogMTAwJTsKICBiYWNrZ3JvdW5kOiB0cmFuc3BhcmVudDsKICBib3JkZXI6IDFweCBzb2xpZCB2YXIoLS1ib3JkZXItY29sb3IpOwogIGNvbG9yOiB2YXIoLS10ZXh0LW11dGVkKTsKICBwYWRkaW5nOiA5cHg7CiAgYm9yZGVyLXJhZGl1czogOHB4OwogIGZvbnQtd2VpZ2h0OiA2MDA7CiAgZm9udC1zaXplOiAwLjg1cmVtOwogIGN1cnNvcjogcG9pbnRlcjsKICBtYXJnaW4tdG9wOiA4cHg7CiAgdHJhbnNpdGlvbjogdmFyKC0tdHJhbnNpdGlvbik7Cn0KCi5idG4tY2FuY2VsOmhvdmVyIHsKICBib3JkZXItY29sb3I6ICNmNTllMGI7CiAgY29sb3I6ICNmNTllMGI7CiAgYmFja2dyb3VuZDogcmdiYSgyNDUsIDE1OCwgMTEsIDAuMDgpOwp9CgovKiDilIDilIAgU2lsZW50IE1vZGUgU2VjdGlvbiDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIAgKi8KLnNpbGVudC1tb2RlLXNlY3Rpb24gewogIGJhY2tncm91bmQ6IHZhcigtLWNhcmQtYmcpOwogIGJvcmRlcjogMXB4IHNvbGlkIHJnYmEoMjU1LCAyNTUsIDI1NSwgMC4wNSk7CiAgYm9yZGVyLXJhZGl1czogdmFyKC0tYm9yZGVyLXJhZGl1cyk7CiAgcGFkZGluZzogMTJweCAxNHB4OwogIGJhY2tkcm9wLWZpbHRlcjogYmx1cigxMHB4KTsKICBib3gtc2hhZG93OiB2YXIoLS1zaGFkb3cpOwp9Cgouc2lsZW50LXRvZ2dsZS1yb3cgewogIGRpc3BsYXk6IGZsZXg7CiAganVzdGlmeS1jb250ZW50OiBzcGFjZS1iZXR3ZWVuOwogIGFsaWduLWl0ZW1zOiBjZW50ZXI7Cn0KCi5zaWxlbnQtbGFiZWwtZ3JvdXAgewogIGRpc3BsYXk6IGZsZXg7CiAgYWxpZ24taXRlbXM6IGNlbnRlcjsKICBnYXA6IDEwcHg7Cn0KCi5zaWxlbnQtaWNvbiB7CiAgZm9udC1zaXplOiAxLjRyZW07Cn0KCi5zaWxlbnQtdGl0bGUgewogIGZvbnQtd2VpZ2h0OiA2MDA7CiAgZm9udC1zaXplOiAwLjlyZW07CiAgY29sb3I6IHZhcigtLXRleHQtbWFpbik7CiAgZGlzcGxheTogYmxvY2s7Cn0KCi5zaWxlbnQtZGVzYyB7CiAgZm9udC1zaXplOiAwLjcycmVtOwogIGNvbG9yOiB2YXIoLS10ZXh0LW11dGVkKTsKICBkaXNwbGF5OiBibG9jazsKICBtYXJnaW4tdG9wOiAxcHg7Cn0KCi5zaWxlbnQtc3RhdHVzIHsKICBkaXNwbGF5OiBmbGV4OwogIGFsaWduLWl0ZW1zOiBjZW50ZXI7CiAgZ2FwOiA4cHg7CiAgbWFyZ2luLXRvcDogMTBweDsKICBwYWRkaW5nLXRvcDogOHB4OwogIGJvcmRlci10b3A6IDFweCBzb2xpZCByZ2JhKDI1NSwgMjU1LCAyNTUsIDAuMDYpOwogIGZvbnQtc2l6ZTogMC44cmVtOwogIGNvbG9yOiB2YXIoLS10ZXh0LW11dGVkKTsKfQoKLmdob3N0LWRvdCB7CiAgd2lkdGg6IDhweDsKICBoZWlnaHQ6IDhweDsKICBib3JkZXItcmFkaXVzOiA1MCU7CiAgYmFja2dyb3VuZDogdmFyKC0tdGV4dC1tdXRlZCk7CiAgZGlzcGxheTogaW5saW5lLWJsb2NrOwogIGZsZXgtc2hyaW5rOiAwOwp9CgouZ2hvc3QtZG90LmFjdGl2ZSB7CiAgYmFja2dyb3VuZDogIzEwYjk4MTsKICBib3gtc2hhZG93OiAwIDAgNnB4IHJnYmEoMTYsIDE4NSwgMTI5LCAwLjYpOwogIGFuaW1hdGlvbjogZ2hvc3RQdWxzZSAxLjVzIGVhc2UtaW4tb3V0IGluZmluaXRlOwp9CgpAa2V5ZnJhbWVzIGdob3N0UHVsc2UgewogIDAlLCAxMDAlIHsgYm94LXNoYWRvdzogMCAwIDRweCByZ2JhKDE2LCAxODUsIDEyOSwgMC40KTsgfQogIDUwJSB7IGJveC1zaGFkb3c6IDAgMCAxMHB4IHJnYmEoMTYsIDE4NSwgMTI5LCAwLjgpOyB9Cn0KCi8qIOKUgOKUgCBUaGVtZSBQaWNrZXIg4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAICovCi50aGVtZS1waWNrZXIgewogIHdpZHRoOiBhdXRvOwogIG1pbi13aWR0aDogMDsKICBtYXgtd2lkdGg6IDEyMHB4OwogIHBhZGRpbmc6IDVweCA4cHg7CiAgZm9udC1zaXplOiAwLjcycmVtOwogIGJhY2tncm91bmQ6IHJnYmEoMTUsIDIzLCA0MiwgMC42KTsKICBib3JkZXI6IDFweCBzb2xpZCB2YXIoLS1ib3JkZXItY29sb3IpOwogIGNvbG9yOiB2YXIoLS10ZXh0LW1haW4pOwogIGJvcmRlci1yYWRpdXM6IDZweDsKICBjdXJzb3I6IHBvaW50ZXI7CiAgb3V0bGluZTogbm9uZTsKICB0cmFuc2l0aW9uOiB2YXIoLS10cmFuc2l0aW9uKTsKICBmbGV4LXNocmluazogMDsKfQoKLnRoZW1lLXBpY2tlcjpmb2N1cyB7CiAgYm9yZGVyLWNvbG9yOiB2YXIoLS1hY2NlbnQtcHJpbWFyeSk7CiAgYm94LXNoYWRvdzogMCAwIDAgMnB4IHJnYmEoMTM5LCA5MiwgMjQ2LCAwLjIpOwp9CgoudGhlbWUtcGlja2VyIG9wdGlvbiB7CiAgYmFja2dyb3VuZDogdmFyKC0tYmctY29sb3IpOwogIGNvbG9yOiB2YXIoLS10ZXh0LW1haW4pOwp9Cgouc2V0dGluZ3MtcGFuZWwgewogIGJhY2tncm91bmQ6IHZhcigtLWNhcmQtYmcpOwogIGJvcmRlcjogMXB4IHNvbGlkIHJnYmEoMjU1LCAyNTUsIDI1NSwgMC4wNSk7CiAgYm9yZGVyLXJhZGl1czogdmFyKC0tYm9yZGVyLXJhZGl1cyk7CiAgcGFkZGluZzogMTRweDsKICBtYXJnaW4tYm90dG9tOiAyMHB4OwogIGJhY2tkcm9wLWZpbHRlcjogYmx1cigxMHB4KTsKICBib3gtc2hhZG93OiB2YXIoLS1zaGFkb3cpOwp9Ci5zZXR0aW5ncy1wYW5lbCAudGhlbWUtcGlja2VyIHsKICBtYXgtd2lkdGg6IG5vbmU7CiAgZmxleDogMTsKfQoKLyog4pSA4pSAIFRvbGVyYW5jZSBTbGlkZXIg4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAICovCi50b2xlcmFuY2Utc2V0dGluZyB7CiAgbWFyZ2luLXRvcDogMTJweDsKICBwYWRkaW5nLXRvcDogMTJweDsKICBib3JkZXItdG9wOiAxcHggc29saWQgcmdiYSgyNTUsIDI1NSwgMjU1LCAwLjA2KTsKfQoKLnRvbGVyYW5jZS1oZWFkZXIgewogIGRpc3BsYXk6IGZsZXg7CiAganVzdGlmeS1jb250ZW50OiBzcGFjZS1iZXR3ZWVuOwogIGFsaWduLWl0ZW1zOiBjZW50ZXI7CiAgbWFyZ2luLWJvdHRvbTogNnB4Owp9CgoudG9sZXJhbmNlLWhlYWRlciBsYWJlbCB7CiAgZm9udC1zaXplOiAwLjgycmVtOwogIGZvbnQtd2VpZ2h0OiA2MDA7CiAgY29sb3I6IHZhcigtLXRleHQtbWFpbik7Cn0KCi50b2xlcmFuY2UtdmFsdWUgewogIGZvbnQtc2l6ZTogMC44MnJlbTsKICBmb250LXdlaWdodDogNzAwOwogIGNvbG9yOiB2YXIoLS1hY2NlbnQtcHJpbWFyeSk7CiAgYmFja2dyb3VuZDogcmdiYSgxMzksIDkyLCAyNDYsIDAuMTUpOwogIHBhZGRpbmc6IDJweCA4cHg7CiAgYm9yZGVyLXJhZGl1czogNHB4Owp9CgoudG9sZXJhbmNlLXNsaWRlciB7CiAgLXdlYmtpdC1hcHBlYXJhbmNlOiBub25lOwogIGFwcGVhcmFuY2U6IG5vbmU7CiAgd2lkdGg6IDEwMCU7CiAgaGVpZ2h0OiA2cHg7CiAgYm9yZGVyLXJhZGl1czogM3B4OwogIGJhY2tncm91bmQ6IHZhcigtLWJvcmRlci1jb2xvcik7CiAgb3V0bGluZTogbm9uZTsKICBtYXJnaW46IDhweCAwIDZweDsKICBwYWRkaW5nOiAwOwogIGJvcmRlcjogbm9uZTsKfQoKLnRvbGVyYW5jZS1zbGlkZXI6Oi13ZWJraXQtc2xpZGVyLXRodW1iIHsKICAtd2Via2l0LWFwcGVhcmFuY2U6IG5vbmU7CiAgYXBwZWFyYW5jZTogbm9uZTsKICB3aWR0aDogMTZweDsKICBoZWlnaHQ6IDE2cHg7CiAgYm9yZGVyLXJhZGl1czogNTAlOwogIGJhY2tncm91bmQ6IHZhcigtLWFjY2VudC1wcmltYXJ5KTsKICBjdXJzb3I6IHBvaW50ZXI7CiAgYm94LXNoYWRvdzogMCAwIDZweCByZ2JhKDEzOSwgOTIsIDI0NiwgMC41KTsKICB0cmFuc2l0aW9uOiBib3gtc2hhZG93IDAuMnMgZWFzZTsKfQoKLnRvbGVyYW5jZS1zbGlkZXI6Oi13ZWJraXQtc2xpZGVyLXRodW1iOmhvdmVyIHsKICBib3gtc2hhZG93OiAwIDAgMTBweCByZ2JhKDEzOSwgOTIsIDI0NiwgMC44KTsKfQoKLyogTWFrZSBoZWFkZXIgd3JhcCBuaWNlbHkgd2l0aCB0aGUgdGhlbWUgcGlja2VyICovCmhlYWRlciB7CiAgZmxleC13cmFwOiB3cmFwOwogIGdhcDogOHB4Owp9CgovKiDilIDilIAgQnJva2VyIEJhZGdlIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgCAqLwouYnJva2VyLWJhZGdlIHsKICBmb250LXNpemU6IDAuNzJyZW07CiAgZm9udC13ZWlnaHQ6IDcwMDsKICB2ZXJ0aWNhbC1hbGlnbjogbWlkZGxlOwogIHBhZGRpbmc6IDNweCA4cHg7CiAgYm9yZGVyLXJhZGl1czogNnB4OwogIG1hcmdpbi1sZWZ0OiAxMHB4OwogIGNvbG9yOiAjZmZmZmZmICFpbXBvcnRhbnQ7CiAgLXdlYmtpdC10ZXh0LWZpbGwtY29sb3I6ICNmZmZmZmYgIWltcG9ydGFudDsgLyogQ3JpdGljYWwgb3ZlcnJpZGUgZm9yIGgxIGdyYWRpZW50IHRleHQgKi8KICB0ZXh0LXRyYW5zZm9ybTogdXBwZXJjYXNlOwogIGxldHRlci1zcGFjaW5nOiAwLjA1ZW07CiAgYm94LXNoYWRvdzogMCAycHggOHB4IHJnYmEoMCwgMCwgMCwgMC40KTsKICBib3JkZXI6IDFweCBzb2xpZCByZ2JhKDI1NSwgMjU1LCAyNTUsIDAuMik7CiAgZGlzcGxheTogaW5saW5lLWJsb2NrOwp9CgouYnJva2VyLWJhZGdlLmFjdGl2ZSB7CiAgYmFja2dyb3VuZDogdmFyKC0tYWNjZW50LWdyYWRpZW50KTsKfQoKLmJyb2tlci1iYWRnZS53YWl0aW5nIHsKICBiYWNrZ3JvdW5kOiByZ2JhKDc1LCA4NSwgOTksIDAuOSk7CiAgYW5pbWF0aW9uOiBiYWRnZVB1bHNlIDJzIGVhc2UtaW4tb3V0IGluZmluaXRlOwp9CgpAa2V5ZnJhbWVzIGJhZGdlUHVsc2UgewogIDAlLCAxMDAlIHsgb3BhY2l0eTogMC43OyB9CiAgNTAlIHsgb3BhY2l0eTogMTsgfQp9Cgo8L3N0eWxlPgo8L2hlYWQ+Cgo8Ym9keT4KICA8ZGl2IGNsYXNzPSJjb250YWluZXIiPgogICAgPGhlYWRlcj4KICAgICAgPGgxPlRNUyBQcm8gPHNwYW4gaWQ9ImJyb2tlci1pZC1iYWRnZSIgY2xhc3M9ImJyb2tlci1iYWRnZSB3YWl0aW5nIj5XYWl0aW5nIGZvciBUTVMuLi48L3NwYW4+PC9oMT4KICAgICAgPGJ1dHRvbiBpZD0ic2V0dGluZ3MtYnRuIiB0aXRsZT0iU2V0dGluZ3MiCiAgICAgICAgc3R5bGU9ImJhY2tncm91bmQ6bm9uZTtib3JkZXI6bm9uZTtjdXJzb3I6cG9pbnRlcjtmb250LXNpemU6MS4ycmVtO2NvbG9yOnZhcigtLXRleHQtbWFpbik7Ij7impnvuI88L2J1dHRvbj4KICAgICAgPGRpdiBjbGFzcz0ibW9kZS10b2dnbGUiPgogICAgICAgIDxsYWJlbCBjbGFzcz0ic3dpdGNoIj4KICAgICAgICAgIDxpbnB1dCB0eXBlPSJjaGVja2JveCIgaWQ9Im1vZGUtc3dpdGNoIj4KICAgICAgICAgIDxzcGFuIGNsYXNzPSJzbGlkZXIgcm91bmQiPjwvc3Bhbj4KICAgICAgICA8L2xhYmVsPgogICAgICAgIDxzcGFuIGlkPSJtb2RlLWxhYmVsIj5QbGFubmluZyBNb2RlPC9zcGFuPgogICAgICA8L2Rpdj4KICAgICAgPGJ1dHRvbiBpZD0ia2lsbC1zd2l0Y2giIGNsYXNzPSJidG4tZGFuZ2VyIGhpZGRlbiI+U1RPUCBBTEw8L2J1dHRvbj4KICAgIDwvaGVhZGVyPgoKICAgIDxtYWluPgogICAgICA8IS0tIFNldHRpbmdzIFBhbmVsIC0tPgogICAgICA8c2VjdGlvbiBpZD0ic2V0dGluZ3Mtc2VjdGlvbiIgY2xhc3M9InNldHRpbmdzLXBhbmVsIGhpZGRlbiI+CiAgICAgICAgPGgzPlNldHRpbmdzPC9oMz4KICAgICAgICA8ZGl2IGNsYXNzPSJpbnB1dC1ncm91cCI+CiAgICAgICAgICA8c2VsZWN0IGlkPSJ0aGVtZS1zZWxlY3QiIGNsYXNzPSJ0aGVtZS1waWNrZXIiPgogICAgICAgICAgICA8b3B0aW9uIHZhbHVlPSJkZWZhdWx0Ij7wn5+jIERlZmF1bHQgKFR3IENlbiBNVCk8L29wdGlvbj4KICAgICAgICAgICAgPG9wdGlvbiB2YWx1ZT0iYXF1YXRpYyI+8J+UtSBBcXVhdGljIChTZWdvZSBVSSk8L29wdGlvbj4KICAgICAgICAgICAgPG9wdGlvbiB2YWx1ZT0iZGVzZXJ0Ij7wn5+gIERlc2VydCAoR2VvcmdpYSk8L29wdGlvbj4KICAgICAgICAgICAgPG9wdGlvbiB2YWx1ZT0iZHVzayI+8J+MuCBEdXNrIChUcmVidWNoZXQpPC9vcHRpb24+CiAgICAgICAgICAgIDxvcHRpb24gdmFsdWU9Im5pZ2h0Z3JlZW4iPvCfn6IgTmlnaHQgR3JlZW4gKENvbnNvbGFzKTwvb3B0aW9uPgogICAgICAgICAgPC9zZWxlY3Q+CiAgICAgICAgICA8c2VsZWN0IGlkPSJmb250LXNpemUtc2VsZWN0IiBjbGFzcz0idGhlbWUtcGlja2VyIj4KICAgICAgICAgICAgPG9wdGlvbiB2YWx1ZT0ibWVkaXVtIj5BYSBNZWRpdW0gVGV4dDwvb3B0aW9uPgogICAgICAgICAgICA8b3B0aW9uIHZhbHVlPSJzbWFsbCI+YWEgU21hbGwgVGV4dDwvb3B0aW9uPgogICAgICAgICAgICA8b3B0aW9uIHZhbHVlPSJsYXJnZSI+QUEgTGFyZ2UgVGV4dDwvb3B0aW9uPgogICAgICAgICAgPC9zZWxlY3Q+CiAgICAgICAgPC9kaXY+CiAgICAgICAgPGRpdiBjbGFzcz0idG9sZXJhbmNlLXNldHRpbmciPgogICAgICAgICAgPGRpdiBjbGFzcz0idG9sZXJhbmNlLWhlYWRlciI+CiAgICAgICAgICAgIDxsYWJlbD5QcmljZSBUb2xlcmFuY2U8L2xhYmVsPgogICAgICAgICAgICA8c3BhbiBpZD0idG9sZXJhbmNlLWRpc3BsYXkiIGNsYXNzPSJ0b2xlcmFuY2UtdmFsdWUiPsKxMyU8L3NwYW4+CiAgICAgICAgICA8L2Rpdj4KICAgICAgICAgIDxpbnB1dCB0eXBlPSJyYW5nZSIgaWQ9InRvbGVyYW5jZS1yYW5nZSIgbWluPSIwLjUiIG1heD0iMyIgc3RlcD0iMC4xIiB2YWx1ZT0iMyIgY2xhc3M9InRvbGVyYW5jZS1zbGlkZXIiPgogICAgICAgICAgPHNwYW4gY2xhc3M9ImhlbHBlci10ZXh0Ij5Cb3Qgb25seSBzdWJtaXRzIGlmIHByaWNlIGlzIHdpdGhpbiB0aGlzIHJhbmdlIG9mIExUUC4gTWF4IMKxMyUgKE5FUFNFIGxpbWl0KS48L3NwYW4+CiAgICAgICAgPC9kaXY+CiAgICAgICAgPGRpdiBjbGFzcz0idG9sZXJhbmNlLXNldHRpbmciPgogICAgICAgICAgPGRpdiBjbGFzcz0idG9sZXJhbmNlLWhlYWRlciI+CiAgICAgICAgICAgIDxsYWJlbD5BZHZhbmNlZCBUcmlnZ2VyczwvbGFiZWw+CiAgICAgICAgICAgIDxsYWJlbCBjbGFzcz0ic3dpdGNoIiBzdHlsZT0ibWFyZ2luOjA7Ij4KICAgICAgICAgICAgICA8aW5wdXQgdHlwZT0iY2hlY2tib3giIGlkPSJhZHZhbmNlZC10cmlnZ2VycyI+CiAgICAgICAgICAgICAgPHNwYW4gY2xhc3M9InNsaWRlciByb3VuZCI+PC9zcGFuPgogICAgICAgICAgICA8L2xhYmVsPgogICAgICAgICAgPC9kaXY+CiAgICAgICAgICA8c3BhbiBjbGFzcz0iaGVscGVyLXRleHQiPlNob3cg4omlIC8g4omkIGNvbmRpdGlvbiBvcHRpb25zIGZvciBkaXJlY3Rpb25hbCBvcmRlcnMuPC9zcGFuPgogICAgICAgIDwvZGl2PgogICAgICA8L3NlY3Rpb24+CgogICAgICA8IS0tIFNpbGVudCBNb2RlIFRvZ2dsZSAtLT4KICAgICAgPHNlY3Rpb24gY2xhc3M9InNpbGVudC1tb2RlLXNlY3Rpb24iIGlkPSJzaWxlbnQtc2VjdGlvbiI+CiAgICAgICAgPGRpdiBjbGFzcz0ic2lsZW50LXRvZ2dsZS1yb3ciPgogICAgICAgICAgPGRpdiBjbGFzcz0ic2lsZW50LWxhYmVsLWdyb3VwIj4KICAgICAgICAgICAgPHNwYW4gY2xhc3M9InNpbGVudC1pY29uIj7wn5G7PC9zcGFuPgogICAgICAgICAgICA8ZGl2PgogICAgICAgICAgICAgIDxzcGFuIGNsYXNzPSJzaWxlbnQtdGl0bGUiPlNpbGVudCBNb2RlPC9zcGFuPgogICAgICAgICAgICAgIDxzcGFuIGNsYXNzPSJzaWxlbnQtZGVzYyI+QXV0by1vcGVuIGJhY2tncm91bmQgdGFiIGZvciBleGVjdXRpb248L3NwYW4+CiAgICAgICAgICAgIDwvZGl2PgogICAgICAgICAgPC9kaXY+CiAgICAgICAgICA8bGFiZWwgY2xhc3M9InN3aXRjaCI+CiAgICAgICAgICAgIDxpbnB1dCB0eXBlPSJjaGVja2JveCIgaWQ9InNpbGVudC1zd2l0Y2giPgogICAgICAgICAgICA8c3BhbiBjbGFzcz0ic2xpZGVyIHJvdW5kIj48L3NwYW4+CiAgICAgICAgICA8L2xhYmVsPgogICAgICAgIDwvZGl2PgogICAgICAgIDxkaXYgY2xhc3M9InNpbGVudC1zdGF0dXMgaGlkZGVuIiBpZD0ic2lsZW50LXN0YXR1cyI+CiAgICAgICAgICA8c3BhbiBjbGFzcz0iZ2hvc3QtZG90IiBpZD0iZ2hvc3QtZG90Ij48L3NwYW4+CiAgICAgICAgICA8c3BhbiBpZD0iZ2hvc3QtbGFiZWwiPkdob3N0IFRhYiBJbmFjdGl2ZTwvc3Bhbj4KICAgICAgICA8L2Rpdj4KICAgICAgPC9zZWN0aW9uPgoKICAgICAgPHNlY3Rpb24gY2xhc3M9Im9yZGVyLWZvcm0iIGlkPSJmb3JtLXNlY3Rpb24iPgogICAgICAgIDxoMyBpZD0iZm9ybS10aXRsZSI+QWRkIE5ldyBPcmRlciAoPHNwYW4gaWQ9Im9yZGVyLWNvdW50Ij4wPC9zcGFuPi8xMCk8L2gzPgogICAgICAgIDxmb3JtIGlkPSJhZGQtb3JkZXItZm9ybSI+CiAgICAgICAgICA8IS0tIFJvdyAxOiBTeW1ib2wsIFF0eSwgQnV5L1NlbGwgLS0+CiAgICAgICAgICA8ZGl2IGNsYXNzPSJpbnB1dC1ncm91cCI+CiAgICAgICAgICAgIDxpbnB1dCB0eXBlPSJ0ZXh0IiBpZD0ic3ltYm9sIiBwbGFjZWhvbGRlcj0iU3ltYm9sIiBsaXN0PSJzeW1ib2wtbGlzdCIgcmVxdWlyZWQgYXV0b2NvbXBsZXRlPSJvZmYiCiAgICAgICAgICAgICAgc3R5bGU9InRleHQtdHJhbnNmb3JtOnVwcGVyY2FzZSI+CiAgICAgICAgICAgIDxkYXRhbGlzdCBpZD0ic3ltYm9sLWxpc3QiPjwvZGF0YWxpc3Q+CiAgICAgICAgICAgIDxpbnB1dCB0eXBlPSJudW1iZXIiIGlkPSJxdHkiIHBsYWNlaG9sZGVyPSJRdHkiIHJlcXVpcmVkIG1pbj0iMTAiIHN0eWxlPSJ3aWR0aDo4MHB4O2ZsZXg6MCAwIDgwcHg7Ij4KICAgICAgICAgICAgPHNlbGVjdCBpZD0idHlwZSIgc3R5bGU9IndpZHRoOjcycHg7ZmxleDowIDAgNzJweDsiPgogICAgICAgICAgICAgIDxvcHRpb24gdmFsdWU9IkJVWSI+QlVZPC9vcHRpb24+CiAgICAgICAgICAgICAgPG9wdGlvbiB2YWx1ZT0iU0VMTCI+U0VMTDwvb3B0aW9uPgogICAgICAgICAgICA8L3NlbGVjdD4KICAgICAgICAgIDwvZGl2PgoKICAgICAgICAgIDwhLS0gUm93IDI6IFRyaWdnZXIgUHJpY2UgKCsgb3B0aW9uYWwgY29uZGl0aW9uIGluIGFkdmFuY2VkIG1vZGUpIC0tPgogICAgICAgICAgPGRpdiBjbGFzcz0iaW5wdXQtZ3JvdXAiPgogICAgICAgICAgICA8aW5wdXQgdHlwZT0ibnVtYmVyIiBpZD0iYmFzZS1wcmljZSIgcGxhY2Vob2xkZXI9IlRhcmdldCBQcmljZSIgcmVxdWlyZWQgc3RlcD0iMC4xIiBzdHlsZT0iZmxleDoxOyI+CiAgICAgICAgICAgIDxzZWxlY3QgaWQ9InRyaWdnZXItY29uZGl0aW9uIiBjbGFzcz0iYWR2YW5jZWQtb25seSIgc3R5bGU9ImZsZXg6MCAwIDEzMHB4O2Rpc3BsYXk6bm9uZTsiPgogICAgICAgICAgICAgIDxvcHRpb24gdmFsdWU9ImF1dG8iIHNlbGVjdGVkPkF1dG8gKEJhbmQpPC9vcHRpb24+CiAgICAgICAgICAgICAgPG9wdGlvbiB2YWx1ZT0iPj0iPmlmIExUUCDiiaUgUHJpY2U8L29wdGlvbj4KICAgICAgICAgICAgICA8b3B0aW9uIHZhbHVlPSI8PSI+aWYgTFRQIOKJpCBQcmljZTwvb3B0aW9uPgogICAgICAgICAgICA8L3NlbGVjdD4KICAgICAgICAgIDwvZGl2PgogICAgICAgICAgPHNwYW4gY2xhc3M9ImhlbHBlci10ZXh0IiBzdHlsZT0iZGlzcGxheTpibG9jazttYXJnaW4tYm90dG9tOjEycHg7Ij5QbGFjZXMgb3JkZXIgd2hlbiB0aGlzIHByaWNlIGlzIHdpdGhpbiB5b3VyIHRvbGVyYW5jZSByYW5nZSBvZiBMVFAuPC9zcGFuPgoKICAgICAgICAgIDxidXR0b24gdHlwZT0ic3VibWl0IiBpZD0iYWRkLW9yZGVyLWJ0biIgY2xhc3M9ImJ0bi1wcmltYXJ5Ij5BZGQgT3JkZXI8L2J1dHRvbj4KICAgICAgICAgIDxidXR0b24gdHlwZT0iYnV0dG9uIiBpZD0iY2FuY2VsLWVkaXQtYnRuIiBjbGFzcz0iYnRuLWNhbmNlbCBoaWRkZW4iPuKclSBDYW5jZWwgRWRpdDwvYnV0dG9uPgogICAgICAgIDwvZm9ybT4KICAgICAgICA8ZGl2IGlkPSJmb3JtLWVycm9yIiBjbGFzcz0iZXJyb3ItbXNnIGhpZGRlbiI+PC9kaXY+CiAgICAgIDwvc2VjdGlvbj4KCiAgICAgIDxzZWN0aW9uIGNsYXNzPSJvcmRlci1saXN0Ij4KICAgICAgICA8aDM+UGxhbm5lZCBPcmRlcnM8L2gzPgogICAgICAgIDxkaXYgaWQ9Im9yZGVycy1jb250YWluZXIiPgogICAgICAgICAgPCEtLSBPcmRlciBjYXJkcyBpbmplY3RlZCBoZXJlIC0tPgogICAgICAgIDwvZGl2PgogICAgICA8L3NlY3Rpb24+CgogICAgICA8c2VjdGlvbiBjbGFzcz0iYXVkaXQtbG9nIGhpZGRlbiIgaWQ9ImF1ZGl0LXNlY3Rpb24iIHN0eWxlPSJtYXJnaW4tdG9wOiAxNXB4OyI+CiAgICAgICAgPGRpdiBzdHlsZT0iZGlzcGxheTpmbGV4OyBqdXN0aWZ5LWNvbnRlbnQ6c3BhY2UtYmV0d2VlbjsgYWxpZ24taXRlbXM6Y2VudGVyOyBtYXJnaW4tYm90dG9tOjEycHg7Ij4KICAgICAgICAgIDxoMyBzdHlsZT0ibWFyZ2luOjA7Ij5MaXZlIEF1ZGl0IFRyYWlsPC9oMz4KICAgICAgICAgIDxidXR0b24gaWQ9InRvZ2dsZS1hdWRpdC1zaXplIiBzdHlsZT0iYmFja2dyb3VuZDpub25lO2JvcmRlcjpub25lO2NvbG9yOnZhcigtLXRleHQtbXV0ZWQpO2N1cnNvcjpwb2ludGVyO2ZvbnQtc2l6ZToxcmVtO3BhZGRpbmc6NHB4O3RyYW5zaXRpb246dHJhbnNmb3JtIDAuMnMgZWFzZTsiIHRpdGxlPSJUb2dnbGUgQXVkaXQgVHJhaWwiPuKWsjwvYnV0dG9uPgogICAgICAgIDwvZGl2PgogICAgICAgIDxkaXYgaWQ9ImF1ZGl0LWNvbnRhaW5lciIKICAgICAgICAgIHN0eWxlPSJiYWNrZ3JvdW5kOiMwMDA7Y29sb3I6IzBmMDtmb250LWZhbWlseTptb25vc3BhY2U7Zm9udC1zaXplOjExcHg7cGFkZGluZzo4cHg7aGVpZ2h0OjEyMHB4O21pbi1oZWlnaHQ6ODBweDtyZXNpemU6dmVydGljYWw7b3ZlcmZsb3cteTphdXRvO2JvcmRlci1yYWRpdXM6NnB4O2JvcmRlcjogMXB4IHNvbGlkIHJnYmEoMjU1LDI1NSwyNTUsMC4wNSk7dHJhbnNpdGlvbjogaGVpZ2h0IDAuM3MgZWFzZTsiPgogICAgICAgIDwvZGl2PgogICAgICA8L3NlY3Rpb24+CiAgICA8L21haW4+CiAgPC9kaXY+CiAgPHNjcmlwdD4KZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignRE9NQ29udGVudExvYWRlZCcsIGFzeW5jICgpID0+IHsKICBjb25zdCBmb3JtID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2FkZC1vcmRlci1mb3JtJyk7CiAgY29uc3Qgc3ltYm9sSW5wdXQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnc3ltYm9sJyk7CiAgY29uc3QgcXR5SW5wdXQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncXR5Jyk7CiAgY29uc3QgdHlwZVNlbGVjdCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCd0eXBlJyk7CiAgY29uc3QgYmFzZVByaWNlSW5wdXQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFzZS1wcmljZScpOwogIGNvbnN0IHRyaWdnZXJDb25kU2VsZWN0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3RyaWdnZXItY29uZGl0aW9uJyk7CiAgY29uc3QgZXJyb3JNc2cgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnZm9ybS1lcnJvcicpOwogIGNvbnN0IGNvbnRhaW5lciA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdvcmRlcnMtY29udGFpbmVyJyk7CiAgY29uc3QgY291bnRTcGFuID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ29yZGVyLWNvdW50Jyk7CgogIGNvbnN0IGtpbGxTd2l0Y2ggPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgna2lsbC1zd2l0Y2gnKTsKICBjb25zdCBhdWRpdFNlY3Rpb24gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYXVkaXQtc2VjdGlvbicpOwogIGNvbnN0IGF1ZGl0Q29udGFpbmVyID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2F1ZGl0LWNvbnRhaW5lcicpOwoKICAvLyBTaWxlbnQgTW9kZSBlbGVtZW50cwogIGNvbnN0IHNpbGVudFN3aXRjaCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdzaWxlbnQtc3dpdGNoJyk7CiAgY29uc3Qgc2lsZW50U3RhdHVzID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3NpbGVudC1zdGF0dXMnKTsKICBjb25zdCBnaG9zdERvdCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdnaG9zdC1kb3QnKTsKICBjb25zdCBnaG9zdExhYmVsID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2dob3N0LWxhYmVsJyk7CgogIC8vIFNldHRpbmdzIGVsZW1lbnRzCiAgY29uc3QgdGhlbWVTZWxlY3QgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgndGhlbWUtc2VsZWN0Jyk7CiAgY29uc3QgZm9udFNpemVTZWxlY3QgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnZm9udC1zaXplLXNlbGVjdCcpOwogIGNvbnN0IHNldHRpbmdzQnRuID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3NldHRpbmdzLWJ0bicpOwogIGNvbnN0IHNldHRpbmdzU2VjdGlvbiA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdzZXR0aW5ncy1zZWN0aW9uJyk7CiAgY29uc3QgYnJva2VyQmFkZ2UgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYnJva2VyLWlkLWJhZGdlJyk7CgogIGNvbnN0IHN5bWJvbExpc3QgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnc3ltYm9sLWxpc3QnKTsKICBjb25zdCBORVBTRV9TWU1CT0xTX01BUCA9IHsgIkFEQkwiOiAiQWdyaWN1bHR1cmUgRGV2ZWxvcG1lbnQgQmFuayBMaW1pdGVkIiwgIkNaQklMIjogIkNpdGl6ZW4gQmFuayBJbnRlcm5hdGlvbmFsIExpbWl0ZWQiLCAiRUJMIjogIkV2ZXJlc3QgQmFuayBMaW1pdGVkIiwgIkdCSU1FIjogIkdsb2JhbCBJTUUgQmFuayBMaW1pdGVkIiwgIkhCTCI6ICJIaW1hbGF5YW4gQmFuayBMaW1pdGVkIiwgIktCTCI6ICJLdW1hcmkgQmFuayBMaW1pdGVkIiwgIk1CTCI6ICJNYWNoaGFwdWNoY2hocmUgQmFuayBMaW1pdGVkIiwgIk5BQklMIjogIk5hYmlsIEJhbmsgTGltaXRlZCIsICJOQkwiOiAiTmVwYWwgQmFuayBMaW1pdGVkIiwgIk5JQ0EiOiAiTklDIEFzaWEgQmFuayBMdGQuIiwgIk5NQiI6ICJOTUIgQmFuayBMaW1pdGVkIiwgIlBDQkwiOiAiUHJpbWUgQ29tbWVyY2lhbCBCYW5rIEx0ZC4iLCAiU0FOSU1BIjogIlNhbmltYSBCYW5rIExpbWl0ZWQiLCAiU0JJIjogIk5lcGFsIFNCSSBCYW5rIExpbWl0ZWQiLCAiU0JMIjogIlNpZGRoYXJ0aGEgQmFuayBMaW1pdGVkIiwgIlNDQiI6ICJTdGFuZGFyZCBDaGFydGVyZWQgQmFuayBMaW1pdGVkIiwgIlBSVlUiOiAiUHJhYmh1IEJhbmsgTGltaXRlZCIsICJOSU1CIjogIk5lcGFsIEludmVzdG1lbnQgTWVnYSBCYW5rIExpbWl0ZWQiLCAiTFNMIjogIkxheG1pIFN1bnJpc2UgQmFuayBMaW1pdGVkIiwgIkNPUkJMIjogIkNvcnBvcmF0ZSBEZXZlbG9wbWVudCBCYW5rIExpbWl0ZWQiLCAiRURCTCI6ICJFeGNlbCBEZXZlbG9wbWVudCBCYW5rIEx0ZC4iLCAiR0JCTCI6ICJHYXJpbWEgQmlrYXMgQmFuayBMaW1pdGVkIiwgIkpCQkwiOiAiSnlvdGkgQmlrYXMgQmFuayBMaW1pdGVkIiwgIk1EQiI6ICJNaXRlcmkgRGV2ZWxvcG1lbnQgQmFuayBMaW1pdGVkIiwgIk1OQkJMIjogIk11a3RpbmF0aCBCaWthcyBCYW5rIEx0ZC4iLCAiTkFCQkMiOiAiTmFyYXlhbmkgRGV2ZWxvcG1lbnQgQmFuayBMaW1pdGVkIiwgIlNBREJMIjogIlNoYW5ncmlsYSBEZXZlbG9wbWVudCBCYW5rIEx0ZC4iLCAiU0hJTkUiOiAiU2hpbmUgUmVzdW5nYSBEZXZlbG9wbWVudCBCYW5rIEx0ZC4iLCAiU0lORFUiOiAiU2luZGh1IEJpa2FzaCBCYW5rIEx0ZCIsICJHUkRCTCI6ICJHcmVlbiBEZXZlbG9wbWVudCBCYW5rIEx0ZC4iLCAiU0FCQkwiOiAiU2FsYXBhIEJpa2FzIEJhbmsgTGltaXRlZCIsICJNTEJMIjogIk1haGFsYXhtaSBCaWthcyBCYW5rIEx0ZC4iLCAiTEJCTCI6ICJMdW1iaW5pIEJpa2FzIEJhbmsgTHRkLiIsICJLU0JCTCI6ICJLYW1hbmEgU2V3YSBCaWthcyBCYW5rIExpbWl0ZWQiLCAiQ0ZDTCI6ICJDZW50cmFsIEZpbmFuY2UgQ28uIEx0ZC4iLCAiR0ZDTCI6ICJHb29kd2lsbCBGaW5hbmNlIENvLiBMdGQuIiwgIkdNRklMIjogIkd1aGVzaG93b3JpIE1lcmNoYW50IEJhbmsgJiBGaW5hbmNlIENvLiBMdGQuIiwgIklDRkMiOiAiSUNGQyBGaW5hbmNlIExpbWl0ZWQiLCAiSkZMIjogIkphbmFraSBGaW5hbmNlIEx0ZC4iLCAiTUZJTCI6ICJNYW5qdXNocmVlIEZpbmFuY2UgTHRkLiIsICJNUEZMIjogIk11bHRpcHVycG9zZSBGaW5hbmNlIENvbXBhbnkgTGltaXRlZCIsICJORlMiOiAiTmVwYWwgRmluYW5jZSBMdGQuIiwgIlBGTCI6ICJQb2toYXJhIEZpbmFuY2UgTHRkLiIsICJQUk9GTCI6ICJQcm9ncmVzc2l2ZSBGaW5hbmNlIExpbWl0ZWQiLCAiU0lGQyI6ICJTaHJlZSBJbnZlc3RtZW50IEZpbmFuY2UgQ28uIEx0ZC4iLCAiUkxGTCI6ICJSZWxpYW5jZSBGaW5hbmNlIEx0ZC4iLCAiR1VGTCI6ICJHdXJraGFzIEZpbmFuY2UgTHRkLiIsICJCRkMiOiAiQmVzdCBGaW5hbmNlIENvbXBhbnkgTHRkLiIsICJTRkNMIjogIlNhbXJpZGRoaSBGaW5hbmNlIENvbXBhbnkgTGltaXRlZCIsICJPSEwiOiAiT3JpZW50YWwgSG90ZWxzIExpbWl0ZWQiLCAiU0hMIjogIlNvYWx0ZWUgSG90ZWwgTGltaXRlZCIsICJUUkgiOiAiVGFyYWdhb24gUmVnZW5jeSBIb3RlbCBMaW1pdGVkIiwgIkNHSCI6ICJDaGFuZHJhZ2lyaSBIaWxscyBMaW1pdGVkIiwgIktETCI6ICJLYWxpbmNob3drIERhcnNoYW4gTGltaXRlZCIsICJDSVRZIjogIkNpdHkgSG90ZWwgTGltaXRlZCIsICJCQU5ESVBVUiI6ICJCYW5kaXB1ciBDYWJsZWNhciBhbmQgVG91cmlzbSBMaW1pdGVkIiwgIkhGSU4iOiAiSG90ZWwgRm9yZXN0IElubiBMaW1pdGVkIiwgIkFIUEMiOiAiQXJ1biBWYWxsZXkgSHlkcm9wb3dlciBEZXZlbG9wbWVudCBDby4gTHRkLiIsICJCUENMIjogIkJ1dHdhbCBQb3dlciBDb21wYW55IExpbWl0ZWQiLCAiQ0hDTCI6ICJDaGlsaW1lIEh5ZHJvcG93ZXIgQ29tcGFueSBMaW1pdGVkIiwgIk5IUEMiOiAiTmF0aW9uYWwgSHlkcm8gUG93ZXIgQ29tcGFueSBMaW1pdGVkIiwgIlNIUEMiOiAiU2FuaW1hIE1haSBIeWRyb3Bvd2VyIEx0ZC4iLCAiSFVSSkEiOiAiSGltYWxheWEgVXJqYSBCaWthcyBDb21wYW55IExpbWl0ZWQiLCAiQUtQTCI6ICJBcnVuIEthYmVsaSBQb3dlciBMdGQuIiwgIkJBUlVOIjogIkJhcnVuIEh5ZHJvcG93ZXIgQ28uIEx0ZC4iLCAiQVBJIjogIkFwaSBQb3dlciBDb21wYW55IEx0ZC4iLCAiTkdQTCI6ICJOZ2FkaSBHcm91cCBQb3dlciBMdGQuIiwgIk1ITCI6ICJNYW5kYWtpbmkgSHlkcm9wb3dlciBMaW1pdGVkIiwgIk5ZQURJIjogIk55YWRpIEh5ZHJvcG93ZXIgTGltaXRlZCIsICJTSkNMIjogIlNBTkpFTiBKQUxBVklESFlVVCBDT01QQU5ZIExJTUlURUQiLCAiUkhQTCI6ICJSQVNVV0FHQURISSBIWURST1BPV0VSIENPTVBBTlkgTElNSVRFRCIsICJVTUhMIjogIlVuaXRlZCBNb2RpIEh5ZHJvcG93ZXIgTHRkLiIsICJET1JESSI6ICJEb3JkaSBLaG9sYSBKYWwgQmlkeXV0IENvbXBhbnkgTGltaXRlZCIsICJQSENMIjogIlBlb3BsZXMgSHlkcm9wb3dlciBDb21wYW55IExpbWl0ZWQiLCAiUFBMIjogIlBlb3BsZSdzIFBvd2VyIExpbWl0ZWQiLCAiVVBDTCI6ICJVTklWRVJTQUwgUE9XRVIgQ09NUEFOWSBMVEQiLCAiU1BMIjogIlNodXZhbSBQb3dlciBDb21wYW55IExpbWl0ZWQiLCAiU1BETCI6ICJTeW5lcmd5IFBvd2VyIERldmVsb3BtZW50IEx0ZC4iLCAiTUtKQyI6ICJNYWlsdW5nIEtob2xhIEphbCBWaWRoeXV0IENvbXBhbnkgIExpbWl0ZWQiLCAiU0FIQVMiOiAiU2FoYXMgVXJqYSBMaW1pdGVkIiwgIktLSEMiOiAiS2hhbmlraG9sYSBIeWRyb3Bvd2VyIENvLiBMdGQuIiwgIkhQUEwiOiAiSGltYWxheWFuIFBvd2VyIFBhcnRuZXIgTHRkLiIsICJESFBMIjogIkRpYnlhc2h3b3JpIEh5ZHJvcG93ZXIgTHRkLiIsICJCSFBMIjogIkJhcmFoaSBIeWRyb3Bvd2VyIFB1YmxpYyBMaW1pdGVkIiwgIk1ITkwiOiAiTW91bnRhaW4gSHlkcm8gTmVwYWwgTGltaXRlZCIsICJDSEwiOiAiQ2hoeWFuZ2RpIEh5ZHJvcG93ZXIgTHRkLiIsICJVU0hMIjogIlVwcGVyIFN5YW5nZSAgSHlkcm9wb3dlciBMaW1pdGVkIiwgIlNQSEwiOiAiU2F5YXBhdHJpIEh5ZHJvcG93ZXIgTGltaXRlZCIsICJOSERMIjogIk5lcGFsIEh5ZHJvIERldmVsb3BlcnMgTHRkLiIsICJSQURISSI6ICJSYWRoaSBCaWR5dXQgQ29tcGFueSBMdGQiLCAiQk5IQyI6ICJCdWRkaGFiaHVtaSBOZXBhbCBIeWRyb3Bvd2VyIENvbXBhbnkgTGltaXRlZCIsICJSSEdDTCI6ICJSYXB0aSBIeWRybyBhbmQgR2VuZXJhbCBDb25zdHJ1Y3Rpb24gTGltaXRlZCIsICJLUENMIjogIkthbGlrYSBwb3dlciBDb21wYW55IEx0ZCIsICJUQU1PUiI6ICJTYW5pbWEgTWlkZGxlIFRhbW9yIEh5ZHJvcG93ZXIgTGltaXRlZCIsICJHSEwiOiAiR2hhbGVtZGkgSHlkcm8gTGltaXRlZCIsICJFSFBMIjogIkVhc3Rlcm4gSHlkcm9wb3dlciBMaW1pdGVkIiwgIk1LSEMiOiAiTWF5YSBLaG9sYSBIeWRyb3Bvd2VyIENvbXBhbnkgTGltaXRlZCIsICJCRURDIjogIkJodWdvbCBFbmVyZ3kgRGV2ZWxvcG1lbnQgQ29tcGFueSBMaW1pdGVkIiwgIlBNSFBMIjogIlBhbmNoYWthbnlhIE1haSBIeWRyb3Bvd2VyIEx0ZCIsICJLQlNIIjogIkt1dGhlbGkgQnVraGFyaSBTbWFsbCBIeWRyb3Bvd2VyIExpbWl0ZWQiLCAiR0xIIjogIkdyZWVubGlmZSBIeWRyb3Bvd2VyIExpbWl0ZWQiLCAiVVNIRUMiOiAiVXBwZXIgU29sdSBIeWRybyBFbGVjdHJpYyBDb21wYW55IExpbWl0ZWQiLCAiQUtKQ0wiOiAiQW5raHUgS2hvbGEgSmFsdmlkaHl1dCBDb21wYW55IEx0ZCIsICJMRUMiOiAiTGliZXJ0eSBFbmVyZ3kgQ29tcGFueSBMaW1pdGVkIiwgIlRQQyI6ICJUZXJoYXRodW0gUG93ZXIgQ29tcGFueSBMaW1pdGVkIiwgIlNIRUwiOiAiU2luZ2F0aSBIeWRybyBFbmVyZ3kgTGltaXRlZCIsICJQUENMIjogIlBhbmNodGhhciBQb3dlciBDb21wYW55IExpbWl0ZWQiLCAiVFNITCI6ICJUaHJlZSBTdGFyIEh5ZHJvcG93ZXIgTGltaXRlZCIsICJTU0hMIjogIlNoaXZhIFNocmVlIEh5ZHJvcG93ZXIgTGltaXRlZCIsICJKT1NISSI6ICJKb3NoaSBIeWRyb3Bvd2VyIERldmVsb3BtZW50IENvbXBhbnkgTHRkIiwgIlRWQ0wiOiAiVHJpc2h1bGkgSmFsIFZpZGh5dXQgQ29tcGFueSBMaW1pdGVkIiwgIlVOSFBMIjogIlVuaW9uIEh5ZHJvcG93ZXIgTGltaXRlZCIsICJTUEMiOiAiU2FtbGluZyBQb3dlciBDb21wYW55IExpbWl0ZWQiLCAiU0dIQyI6ICJTd2V0LUdhbmdhIEh5ZHJvcG93ZXIgJiBDb25zdHJ1Y3Rpb24gTGltaXRlZCIsICJBSEwiOiAiQXNpYW4gSHlkcm9wb3dlciBMaW1pdGVkIiwgIkJIREMiOiAiQmluZHlhYmFzaW5pIEh5ZHJvcG93ZXIgRGV2ZWxvcG1lbnQgQ29tcGFueSBMaW1pdGVkIiwgIkhESFBDIjogIkhpbWFsIERvbGFraGEgSHlkcm9wb3dlciBDb21wYW55IExpbWl0ZWQiLCAiTUhDTCI6ICJNb2x1bmcgSHlkcm9wb3dlciBDb21wYW55IExpbWl0ZWQiLCAiU01IIjogIlN1cGVyIE1haSBIeWRyb3Bvd2VyIExpbWl0ZWQiLCAiUkZQTCI6ICJSaXZlciBGYWxscyBQb3dlciBMaW1pdGVkIiwgIk1FTiI6ICJNb3VudGFpbiBFbmVyZ3kgTmVwYWwgTGltaXRlZCIsICJVSEVXQSI6ICJVcHBlciBIZXdha2hvbGEgSHlkcm9wb3dlciBDb21wYW55IExpbWl0ZWQiLCAiSEhMIjogIkhpbWFsYXlhbiBIeWRyb3Bvd2VyIExpbWl0ZWQiLCAiVU1SSCI6ICJVbml0ZWQgSURJIE1hcmRpIFJCIEh5ZHJvcG93ZXIgTGltaXRlZC4iLCAiU0lLTEVTIjogIlNpa2xlcyBIeWRyb3Bvd2VyIExpbWl0ZWQiLCAiTUVMIjogIk1vZGkgRW5lcmd5IExpbWl0ZWQiLCAiTUFLQVIiOiAiTWFrYXIgSml0dW1heWEgU3VyaSBIeWRyb3Bvd2VyIExpbWl0ZWQiLCAiREhFTCI6ICJEYXJhbWtob2xhIEh5ZHJvIEVuZXJneSBMaW1pdGVkIiwgIlNNSkMiOiAiU2FnYXJtYXRoYSBKYWxhYmlkaHl1dCBDb21wYW55IExpbWl0ZWQiLCAiTUtITCI6ICJNYWkgS2hvbGEgSHlkcm9wb3dlciBMaW1pdGVkIiwgIkNLSEwiOiAiQ2hpcmtod2EgSHlkcm9wb3dlciBMaW1pdGVkIiwgIk1NS0pMIjogIk1hdGhpbGxvIE1haWx1biBLaG9sYSBKYWx2aWRoeXV0IExpbWl0ZWQiLCAiRE9MVEkiOiAiRG9sdGkgUG93ZXIgQ29tcGFueSBMaW1pdGVkIiwgIkJITCI6ICJCYWxlcGhpIEh5ZHJvcG93ZXIgTGltaXRlZCIsICJHVkwiOiAiR3JlZW4gVmVudHVyZXMgTGltaXRlZCIsICJNU0hMIjogIk1pZC1Tb2x1IEh5ZHJvcG93ZXIgTGltaXRlZCIsICJCVU5HQUwiOiAiQnVuZ2FsIEh5ZHJvIExpbWl0ZWQiLCAiUklESSI6ICJSaWRpIFBvd2VyIENvbXBhbnkgTGltaXRlZCIsICJISU1TVEFSIjogIkhpbSBTdGFyIFVyamEgQ29tcGFueSBMaW1pdGVkIiwgIk1FSEwiOiAiTWFuYWthbWFuYSBFbmdpbmVlcmluZyBIeWRyb3Bvd2VyIExpbWl0ZWQiLCAiSUhMIjogIkluZ3dhIEh5ZHJvcG93ZXIgTGltaXRlZCIsICJTTUhMIjogIlN1cGVyIE1hZGkgSHlkcm9wb3dlciBMaW1pdGVkIiwgIk1DSEwiOiAiTWVuY2hoaXlhbSBIeWRyb3Bvd2VyIExpbWl0ZWQiLCAiQkhDTCI6ICJCaWthc2ggSHlkcm9wb3dlciBDb21wYW55IExpbWl0ZWQiLCAiU0FOVkkiOiAiU2FudmkgRW5lcmd5IExpbWl0ZWQiLCAiUkFXQSI6ICJSYXdhIEVuZXJneSBEZXZlbG9wbWVudCBMaW1pdGVkIiwgIlVMSEMiOiAiVXBwZXIgTG9ob3JlIEtob2xhIEh5ZHJvcG93ZXIgQ29tcGFueSBMaW1pdGVkIiwgIkJHV1QiOiAiQmhhZ2F3YXRpIEh5ZHJvcG93ZXIgRGV2ZWxvcG1lbnQgQ29tcGFueSBMdGQuIiwgIk1BTkRVIjogIk1hbmR1IEh5ZHJvcG93ZXIgTHRkLiIsICJNQUJFTCI6ICJNYWJpbHVuZyBFbmVyZ3kgTGltaXRlZCIsICJWTFVDTCI6ICJWaXNpb24gTHVtYmluaSBVcmphIENvbXBhbnkgTGltaXRlZCIsICJTS0hMIjogIlN1cGVyIEtodWRpIEh5ZHJvcG93ZXIgTGltaXRlZCIsICJCSkhMIjogIkJodWp1bmcgSHlkcm9wb3dlciBMaW1pdGVkIiwgIlNLSEVMIjogIlN1cnlha3VuZGEgSHlkcm8gRWxlY3RyaWMgTGltaXRlZCIsICJSTEVMIjogIlJpZGdlIExpbmUgRW5lcmd5IExpbWl0ZWQiLCAiU09ITCI6ICJTb2x1IEh5ZHJvcG93ZXIgTGltaXRlZCIsICJDSVQiOiAiQ2l0aXplbiBJbnZlc3RtZW50IFRydXN0IiwgIkhBVEhZIjogIkhhdGh3YXkgSW52ZXN0bWVudCBOZXBhbCBMaW1pdGVkIiwgIkhJRENMIjogIkh5ZG9yZWxlY3RyaWNpdHkgSW52ZXN0bWVudCBhbmQgRGV2ZWxvcG1lbnQgQ29tcGFueSBMdGQiLCAiTklGUkEiOiAiTmVwYWwgSW5mcmFzdHJ1Y3R1cmUgQmFuayBMaW1pdGVkIiwgIkVOTCI6ICJFbWVyZ2luZyBOZXBhbCBMaW1pdGVkIiwgIk5STiI6ICJOUk4gSW5mcmFzdHJ1Y3R1cmUgYW5kIERldmVsb3BtZW50IExpbWl0ZWQiLCAiQ0hEQyI6ICJDRURCIEhvbGRpbmdzIExpbWl0ZWQiLCAiQUxJQ0wiOiAiQXNpYW4gTGlmZSBJbnN1cmFuY2UgQ28uIExpbWl0ZWQiLCAiTElDTiI6ICJMaWZlIEluc3VyYW5jZSBDby4gTmVwYWwiLCAiTkxJQyI6ICJOZXBhbCBMaWZlIEluc3VyYW5jZSBDby4gTHRkLiIsICJOTElDTCI6ICJOYXRpb25hbCBMaWZlIEluc3VyYW5jZSBDby4gTHRkLiIsICJDTEkiOiAiQ2l0aXplbiBMaWZlIEluc3VyYW5jZSBDb21wYW55IExpbWl0ZWQiLCAiUk5MSSI6ICJSZWxpYWJsZSBOZXBhbCBMaWZlIEluc3VyYW5jZSBMaW1pdGVkIiwgIklMSSI6ICJJTUUgTGlmZSBJbnN1cmFuY2UgQ29tcGFueSBMaW1pdGVkIiwgIlNOTEkiOiAiU3VuIE5lcGFsIExpZmUgSW5zdXJhbmNlIENvbXBhbnkgTGltaXRlZCIsICJTSkxJQyI6ICJTdXJ5YUp5b3RpIExpZmUgSW5zdXJhbmNlIENvbXBhbnkgTGltaXRlZCIsICJTUkxJIjogIlNhbmltYSBSZWxpYW5jZSBMaWZlIEluc3VyYW5jZSBMaW1pdGVkIiwgIkhMSSI6ICJIaW1hbGF5YW4gTGlmZSBJbnN1cmFuY2UgTGltaXRlZCIsICJQTUxJIjogIlByYWJodSBNYWhhbGF4bWkgTGlmZSBJbnN1cmFuY2UgTGltaXRlZCIsICJHTUxJIjogIkd1YXJkaWFuIE1pY3JvLUxpZmUgSW5zdXJhbmNlIExpbWl0ZWQiLCAiQ1JFU1QiOiAiQ3Jlc3QgTWljcm8gTGlmZSBJbnN1cmFuY2UgTHRkLiIsICJCTkwiOiAiQm90dGxlcnMgTmVwYWwgKEJhbGFqdSkgTGltaXRlZCIsICJCTlQiOiAiQm90dGxlcnMgTmVwYWwgKFRlcmFpKSBMaW1pdGVkIiwgIkhETCI6ICJIaW1hbGF5YW4gRGlzdGlsbGVyeSBMaW1pdGVkIiwgIk5MTyI6ICJOZXBhbCBMdWJlIE9pbCBMaW1pdGVkIiwgIlVOTCI6ICJVbmlsZXZlciBOZXBhbCBMaW1pdGVkIiwgIlNISVZNIjogIlNISVZBTSBDRU1FTlRTIExURCIsICJTQVJCVE0iOiAiU2FyYm90dGFtIENlbWVudCBMaW1pdGVkIiwgIlJTTUwiOiAiUmVsaWFuY2UgU3Bpbm5pbmcgTWlsbHMgTGltaXRlZCIsICJTT05BIjogIlNvbmFwdXIgTWluZXJhbHMgYW5kIE9pbCBMaW1pdGVkIiwgIk9NUEwiOiAiT20gTWVnYXNocmVlIFBoYXJtYWNldXRpY2FscyBMaW1pdGVkIiwgIkdDSUwiOiAiR2hvcmFoaSBDZW1lbnQgSW5kdXN0cnkgTGltaXRlZCIsICJTQUdBUiI6ICJTYWdhciBEaXN0aWxsZXJ5IExpbWl0ZWQiLCAiU0FJTCI6ICJTaHJlZW5hZ2FyIEFncml0ZWNoIEluZHVzdHJpZXMgTGltaXRlZCIsICJTWVBOTCI6ICJTWSBQYW5lbCBOZXBhbCBMaW1pdGVkIiwgIkNCQkwiOiAiQ2hoaW1layBMYWdodWJpdHRhIEJpdHRpeWEgU2Fuc3RoYSBMaW1pdGVkIiwgIkREQkwiOiAiRGVwcm9zYyBMYWdodWJpdHRhIEJpdHRpeWEgU2Fuc3RoYSBMaW1pdGVkIiwgIkZNREJMIjogIkZpcnN0IE1pY3JvIEZpbmFuY2UgTGFnaHViaXR0YSBCaXR0aXlhIFNhbnN0aGEgTGltaXRlZCIsICJLTUNEQiI6ICJLYWxpa2EgTGFnaHViaXR0YSBCaXR0aXlhIFNhbnN0aGEgTGltaXRlZCIsICJOVUJMIjogIk5pcmRoYW4gVXR0aGFuIExhZ2h1Yml0dGEgQml0dGl5YSBTYW5zdGhhIExpbWl0ZWQiLCAiU0tCQkwiOiAiU2FuYSBLaXNhbiBCaWthcyBMYWdodWJpdHRhIEJpdHRpeWEgc2Fuc3RoYSBMaW1pdGVkLiIsICJTTEJCTCI6ICJTd2Fyb2pnYXIgTGFnaHViaXR0YSBCaXR0aXlhIFNhbnN0aGEgTHRkLiIsICJTV0JCTCI6ICJTd2FiYWxhbWJhbiBMYWdodWJpdHRhIEJpdHRpeWEgU2Fuc3RoYSBMaW1pdGVkIiwgIk1MQkJMIjogIk1pdGhpbGEgTGFnaHViaXR0YSBCaXR0aXlhIFNhbnN0aGEgTHRkLiIsICJMTEJTIjogIkxheG1pIExhZ2h1Yml0dGEgQml0dGl5YSBTYW5zdGhhIEx0ZC4iLCAiSlNMQkIiOiAiSmFuYXV0dGhhbiBTYW11ZGF5aWMgTGFnaHViaXR0YSBCaXR0aXlhIFNhbnN0aGEgTGltaXRlZCIsICJWTEJTIjogIlZpamF5YSBsYWdodWJpdHRhIEJpdHRpeWEgU2Fuc3RoYSBMdGQuIiwgIlJTREMiOiAiUlNEQyBMYWdodWJpdHRhIEJpdHRpeWEgU2Fuc3RoYSBMdGQuIiwgIk5NQk1GIjogIk5NQiBMYWdodWJpdHRhIEJpdHRpeWEgU2Fuc3RoYSBMdGQuIiwgIk1FUk8iOiAiTWVyb21pY3JvZmluYW5jZSBMYWdodWJpdHRhIEJpdHRpeWEgU2Fuc3RoYSBMdGQuIiwgIkFMQlNMIjogIkFzaGEgTGFnaHViaXR0YSBCaXR0aXlhIFNhbnN0aGEgTGltaXRlZCIsICJOTUZCUyI6ICJOYXRpb25hbCBMYWdodWJpdHRhIEJpdHRpeWEgU2Fuc3RoYSBMaW1pdGVkIiwgIkdNRkJTIjogIkdhbmFwYXRpIE1pY3JvZmluYW5jZSBCaXR0aXlhIFNhbnN0aGEgTHRkIiwgIkhMQlNMIjogIkhpbWFsYXlhbiBMYWdodWJpdHRhIEJpdHRpeWEgU2Fuc3RoYSBMaW1pdGVkIiwgIklMQlMiOiAiSW5maW5pdHkgTGFnaHViaXR0YSBCaXR0aXlhIFNhbnN0aGEgTGltaXRlZCIsICJGT1dBRCI6ICJGb3J3YXJkIE1pY3JvZmluYW5jZSBMYWdodWJpdHRhIEJpdHRpeWEgU2Fuc3RoYSBMdGQuIiwgIlNNQVRBIjogIlNhbWF0YSBHaGFyZWx1IExhZ2h1Yml0dGEgQml0dGl5YSBTYW5zdGhhIExpbWl0ZWQiLCAiTVNMQiI6ICJNYWh1bGkgTGFnaHViaXR0YSBCaXR0aXlhIFNhbnN0aGEgTHRkLiIsICJHSUxCIjogIkdsb2JhbCBJTUUgTGFnaHViaXR0YSBCaXR0aXlhIFNhbnN0aGEgTHRkLiIsICJTTUIiOiAiU3VwcG9ydCBMYWdodWJpdHRhIEJpdHRpeWEgU2Fuc3RoYSBMaW1pdGVkIiwgIkdCTEJTIjogIkdyYW1lZW4gQmlrYXMgTGFnaHViaXR0YSBCaXR0aXlhIFNhbnN0aGEgTHRkLiIsICJORVNETyI6ICJORVNETyBTYW1icmlkaGEgTGFnaHViaXR0YSBCaXR0aXllIFNhbnN0aGEgTGltaXRlZCIsICJNTEJTTCI6ICJNYWhpbGEgTGFnaHViaXR0YSBCaXR0aXlhIFNhbnN0aGEgTGltaXRlZCIsICJHTEJTTCI6ICJHdXJhbnMgTGFnaHViaXR0YSBCaXR0aXlhIFNhbnN0aGEgTGltaXRlZCIsICJOSUNMQlNMIjogIk5JQyBBc2lhIExhZ2h1Yml0dGEgQmlpdGl5YSBTYW5zdGhhIExpbWl0ZWQiLCAiU0xCU0wiOiAiU2FtdWRheWlrIExhZ2h1Yml0dGEgQml0dGl5YSBTYW5zdGhhIExpbWl0ZWQiLCAiVU5MQiI6ICJVbmlxdWUgTmVwYWwgTGFnaHViaXR0YSBCaXR0aXlhIFNhbnN0aGEgTGltaXRlZCIsICJTV0FTVElLIjogIlN3YXN0aWsgTGFnaHViaXR0YSBCaXR0aXlhIFNhbnN0aGEgTGltaXRlZCIsICJKQkxCIjogIkplZXZhbiBCaWthcyBMYWdodWJpdHRhIEJpdHRpeWEgU2Fuc3RoYSBMaW1pdGVkIiwgIlNITEIiOiAiU2hyaWphbnNoaWwgTGFnaHViaXR0YSBCaXR0aXlhIFNhbnN0aGEgTGltaXRlZCIsICJVTEJTTCI6ICJVcGFrYXIgTGFnaHViaXR0YSBCaXR0aXlhIFNhbnN0aGEgTGltaXRlZCIsICJTTUZCUyI6ICJTd2FiaGltYWFuIExhZ2h1Yml0dGEgQml0dGl5YSBTYW5zdGhhIEx0ZCIsICJXTkxCIjogIldFQU4gTmVwYWwgTGFnaHViaXR0YSBCaXR0aXlhIFNhbnN0aGEgTGltaXRlZCIsICJTQU1BSiI6ICJTYW1haiBMYWdodWJpdHR5YSBCaXR0aXlhIFNhbnN0aGEgTGltaXRlZCIsICJETEJTIjogIkRoYXVsYWdpcmkgTGFnaHViaXR0YSBCaXR0aXlhIFNhbnN0aGEgTGltaXRlZCIsICJBTkxCIjogIkFhdG1hbmlyYmhhciBMYWdodWJpdHRhIEJpdHRpeWEgU2Fuc3RoYSBMaW1pdGVkIiwgIk1MQlMiOiAiTWFudXNoaSBMYWdodWJpdHRhIEJpdHRpeWEgU2Fuc3RoYSBMaW1pdGVkIiwgIkFWWUFOIjogIkF2aXlhbiBMYWdodWJpdHRhIEJpdHRpeWEgU2Fuc3RoYSBMaW1pdGVkIiwgIkFDTEJTTCI6ICJBYXJhbWJoYSBDaGF1dGFyaSBMYWdodWJpdHRhIEJpdHRpeWEgU2Fuc3RoYSBMaW1pdGVkIiwgIlVTTEIiOiAiVW5uYXRpIFNhaGFrYXJ5YSBMYWdodWJpdHRhIEJpdHRpeWEgU2Fuc3RoYSBMaW1pdGVkIiwgIkNZQ0wiOiAiQ1lDIE5lcGFsIExhZ2h1Yml0dGEgQml0dGl5YSBTYW5zdGhhIExpbWl0ZWQiLCAiU1dNRiI6ICJTdXJ5b2RheWEgV29taSBMYWdodWJpdHRhIEJpdHRpeWEgU2Fuc3RoYSBMaW1pdGVkIiwgIk5NTEJCTCI6ICJOZXJ1ZGUgTWlybWlyZSBMYWdodWJpdHRhIEJpdHRpeWEgU2Fuc3RoYSBMaW1pdGVkIiwgIk1BVFJJIjogIk1hdHJpYmh1bWkgTGFnaHViaXR0YSBCaXR0aXlhIFNhbnN0aGEgTGltaXRlZCIsICJTTVBEQSI6ICJTYW1wYWRhIExhZ2h1Yml0dGEgQml0dGl5YSBTYW5zdGhhIExpbWl0ZWQiLCAiTklDTCI6ICJOZXBhbCBJbnN1cmFuY2UgQ28uIEx0ZC4iLCAiTklMIjogIk5lY28gSW5zdXJhbmNlIENvLiBMdGQuIiwgIk5MRyI6ICJOTEcgSW5zdXJhbmNlIENvbXBhbnkgTHRkLiIsICJTSUNMIjogIlNoaWtoYXIgSW5zdXJhbmNlIENvLiBMdGQuIiwgIlBSSU4iOiAiUHJhYmh1IEluc3VyYW5jZSBMdGQuIiwgIlJCQ0wiOiAiUmFzdHJpeWEgQmVlbWEgQ29tcGFueSBMaW1pdGVkIiwgIklHSSI6ICJJR0kgUHJ1ZGVudGlhbCBJbnN1cmFuY2UgQ29tcGFueSBMaW1pdGVkIiwgIkhFSSI6ICJIaW1hbGF5YW4gRXZlcmVzdCBJbnN1cmFuY2UgTGltaXRlZCIsICJTR0lDIjogIlNhbmltYSBHSUMgSW5zdXJhbmNlIExpbWl0ZWQiLCAiU1BJTCI6ICJTaWRkaGFydGhhIFByZW1pZXIgSW5zdXJhbmNlIExpbWl0ZWQiLCAiU0FMSUNPIjogIlNhZ2FybWF0aGEgTHVtYmluaSBJbnN1cmFuY2UgQ28uIExpbWl0ZWQiLCAiVUFJTCI6ICJVbml0ZWQgQWpvZCBJbnN1cmFuY2UgTGltaXRlZCIsICJOTUlDIjogIk5lcGFsIE1pY3JvIEluc3VyYW5jZSBDby4gTHRkLiIsICJOVEMiOiAiTmVwYWwgRG9vcnNhbmNoYXIgQ29tYXBhbnkgTGltaXRlZCIsICJOUklDIjogIk5lcGFsIFJlLUluc3VyYW5jZSBDb21wYW55IExpbWl0ZWQiLCAiSFJMIjogIkhpbWFsYXlhbiBSZWluc3VyYW5jZSBMaW1pdGVkIiwgIk1LQ0wiOiAiTXVrdGluYXRoIEtyaXNoaSBDb21wYW55IExpbWl0ZWQiLCAiVFRMIjogIlRyYWRlIFRvd2VyIExpbWl0ZWQiLCAiSkhBUEEiOiAiSmhhcGEgRW5lcmd5IExpbWl0ZWQiLCAiTlJNIjogIk5lcGFsIFJlcHVibGljIE1lZGlhIExpbWl0ZWQiLCAiUFVSRSI6ICJQdXJlIEVuZXJneSBMdGQuIiwgIk5XQ0wiOiAiTmVwYWwgV2FyZWhvdXNpbmcgQ29tcGFueSBMaW1pdGVkIiwgIkJCQyI6ICJCaXNoYWwgQmF6YXIgQ29tcGFueSBMaW1pdGVkIiwgIlNUQyI6ICJTYWx0IFRyYWRpbmcgQ29ycG9yYXRpb24iIH07CgogIE9iamVjdC5lbnRyaWVzKE5FUFNFX1NZTUJPTFNfTUFQKS5mb3JFYWNoKChbc3ltLCBuYW1lXSkgPT4gewogICAgY29uc3Qgb3B0ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnb3B0aW9uJyk7CiAgICBvcHQudmFsdWUgPSBuYW1lID8gYCR7c3ltfSAoJHtuYW1lfSlgIDogc3ltOwogICAgc3ltYm9sTGlzdC5hcHBlbmRDaGlsZChvcHQpOwogIH0pOwoKICAvLyBUb2xlcmFuY2UgU2xpZGVyCiAgY29uc3QgdG9sZXJhbmNlUmFuZ2UgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgndG9sZXJhbmNlLXJhbmdlJyk7CiAgY29uc3QgdG9sZXJhbmNlRGlzcGxheSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCd0b2xlcmFuY2UtZGlzcGxheScpOwoKICB0b2xlcmFuY2VSYW5nZS5hZGRFdmVudExpc3RlbmVyKCdpbnB1dCcsIGFzeW5jICgpID0+IHsKICAgIGNvbnN0IHZhbCA9IHBhcnNlRmxvYXQodG9sZXJhbmNlUmFuZ2UudmFsdWUpOwogICAgdG9sZXJhbmNlRGlzcGxheS50ZXh0Q29udGVudCA9ICfCsScgKyB2YWwgKyAnJSc7CiAgICBhd2FpdCBjaHJvbWUuc3RvcmFnZS5sb2NhbC5zZXQoeyBwcmljZVRvbGVyYW5jZTogdmFsIH0pOwogIH0pOwoKICAvLyBBZHZhbmNlZCBUcmlnZ2VycyB0b2dnbGUKICBjb25zdCBhZHZhbmNlZFRyaWdnZXJzVG9nZ2xlID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2FkdmFuY2VkLXRyaWdnZXJzJyk7CiAgY29uc3QgdHJpZ2dlckNvbmRTZWxlY3RFbCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCd0cmlnZ2VyLWNvbmRpdGlvbicpOwoKICBhZHZhbmNlZFRyaWdnZXJzVG9nZ2xlLmFkZEV2ZW50TGlzdGVuZXIoJ2NoYW5nZScsIGFzeW5jICgpID0+IHsKICAgIGNvbnN0IGlzQWR2YW5jZWQgPSBhZHZhbmNlZFRyaWdnZXJzVG9nZ2xlLmNoZWNrZWQ7CiAgICB0cmlnZ2VyQ29uZFNlbGVjdEVsLnN0eWxlLmRpc3BsYXkgPSBpc0FkdmFuY2VkID8gJ2Jsb2NrJyA6ICdub25lJzsKICAgIGlmICghaXNBZHZhbmNlZCkgdHJpZ2dlckNvbmRTZWxlY3RFbC52YWx1ZSA9ICdhdXRvJzsKICAgIGF3YWl0IGNocm9tZS5zdG9yYWdlLmxvY2FsLnNldCh7IGFkdmFuY2VkVHJpZ2dlcnM6IGlzQWR2YW5jZWQgfSk7CiAgfSk7CgogIGNvbnN0IG1vZGVTd2l0Y2ggPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnbW9kZS1zd2l0Y2gnKTsKICBjb25zdCBtb2RlTGFiZWwgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnbW9kZS1sYWJlbCcpOwogIGNvbnN0IGZvcm1TZWN0aW9uID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2Zvcm0tc2VjdGlvbicpOwoKICBjb25zdCBhZGRPcmRlckJ0biA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdhZGQtb3JkZXItYnRuJyk7CiAgY29uc3QgZm9ybVRpdGxlID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2Zvcm0tdGl0bGUnKTsKICBjb25zdCBjYW5jZWxFZGl0QnRuID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2NhbmNlbC1lZGl0LWJ0bicpOwoKICBsZXQgb3JkZXJzID0gW107CiAgbGV0IGVkaXRpbmdPcmRlcklkID0gbnVsbDsgLy8gbnVsbCA9IGFkZGluZyBuZXc7IHN0cmluZyA9IGVkaXRpbmcgZXhpc3RpbmcgaWQKCiAgLy8gTG9hZCBleGlzdGluZyBkYXRhCiAgY29uc3QgZGF0YSA9IGF3YWl0IGNocm9tZS5zdG9yYWdlLmxvY2FsLmdldChbJ29yZGVycycsICdhcHBNb2RlJywgJ2F1ZGl0TG9ncycsICdzaWxlbnRNb2RlJywgJ2dob3N0VGFiQWN0aXZlJywgJ3NlbGVjdGVkVGhlbWUnLCAnZm9udFNpemUnLCAnYnJva2VySWQnLCAncHJpY2VUb2xlcmFuY2UnLCAnYWR2YW5jZWRUcmlnZ2VycyddKTsKICBpZiAoZGF0YS5vcmRlcnMpIHsKICAgIG9yZGVycyA9IGRhdGEub3JkZXJzOwogIH0KICByZW5kZXJMb2dzKGRhdGEuYXVkaXRMb2dzIHx8IFtdKTsKCiAgLy8gTG9hZCBUaGVtZQogIGlmIChkYXRhLnNlbGVjdGVkVGhlbWUpIHsKICAgIGFwcGx5VGhlbWUoZGF0YS5zZWxlY3RlZFRoZW1lKTsKICAgIHRoZW1lU2VsZWN0LnZhbHVlID0gZGF0YS5zZWxlY3RlZFRoZW1lOwogIH0KCiAgLy8gTG9hZCBGb250IFNpemUKICBpZiAoZGF0YS5mb250U2l6ZSkgewogICAgYXBwbHlGb250U2l6ZShkYXRhLmZvbnRTaXplKTsKICAgIGZvbnRTaXplU2VsZWN0LnZhbHVlID0gZGF0YS5mb250U2l6ZTsKICB9CgogIC8vIExvYWQgUHJpY2UgVG9sZXJhbmNlCiAgaWYgKGRhdGEucHJpY2VUb2xlcmFuY2UpIHsKICAgIHRvbGVyYW5jZVJhbmdlLnZhbHVlID0gZGF0YS5wcmljZVRvbGVyYW5jZTsKICAgIHRvbGVyYW5jZURpc3BsYXkudGV4dENvbnRlbnQgPSAnwrEnICsgZGF0YS5wcmljZVRvbGVyYW5jZSArICclJzsKICB9CgogIC8vIExvYWQgQWR2YW5jZWQgVHJpZ2dlcnMKICBpZiAoZGF0YS5hZHZhbmNlZFRyaWdnZXJzKSB7CiAgICBhZHZhbmNlZFRyaWdnZXJzVG9nZ2xlLmNoZWNrZWQgPSB0cnVlOwogICAgdHJpZ2dlckNvbmRTZWxlY3RFbC5zdHlsZS5kaXNwbGF5ID0gJ2Jsb2NrJzsKICB9CgogIC8vIExvYWQgU2lsZW50IE1vZGUgc3RhdGUKICBpZiAoZGF0YS5zaWxlbnRNb2RlKSB7CiAgICBzaWxlbnRTd2l0Y2guY2hlY2tlZCA9IHRydWU7CiAgfQogIHVwZGF0ZUdob3N0U3RhdHVzKGRhdGEuZ2hvc3RUYWJBY3RpdmUgfHwgZmFsc2UpOwogIHVwZGF0ZUJyb2tlckJhZGdlKGRhdGEuYnJva2VySWQpOwoKICBpZiAoZGF0YS5hcHBNb2RlID09PSAnZXhlY3V0aW9uJykgewogICAgbW9kZVN3aXRjaC5jaGVja2VkID0gdHJ1ZTsKICAgIHNldEV4ZWN1dGlvbk1vZGUodHJ1ZSk7CiAgfSBlbHNlIHsKICAgIHNldEV4ZWN1dGlvbk1vZGUoZmFsc2UpOwogIH0KCiAgcmVuZGVyT3JkZXJzKCk7CgogIC8vIFN0b3JhZ2UgTGlzdGVuZXIgZm9yIExpdmUgU3luYyBEYXNoYm9hcmQKICBjaHJvbWUuc3RvcmFnZS5vbkNoYW5nZWQuYWRkTGlzdGVuZXIoKGNoYW5nZXMpID0+IHsKICAgIGlmIChjaGFuZ2VzLm9yZGVycykgewogICAgICBvcmRlcnMgPSBjaGFuZ2VzLm9yZGVycy5uZXdWYWx1ZSB8fCBbXTsKICAgICAgcmVuZGVyT3JkZXJzKCk7CiAgICB9CiAgICBpZiAoY2hhbmdlcy5hdWRpdExvZ3MpIHsKICAgICAgcmVuZGVyTG9ncyhjaGFuZ2VzLmF1ZGl0TG9ncy5uZXdWYWx1ZSB8fCBbXSk7CiAgICB9CiAgICBpZiAoY2hhbmdlcy5hcHBNb2RlKSB7CiAgICAgIGNvbnN0IGlzRXhlYyA9IGNoYW5nZXMuYXBwTW9kZS5uZXdWYWx1ZSA9PT0gJ2V4ZWN1dGlvbic7CiAgICAgIG1vZGVTd2l0Y2guY2hlY2tlZCA9IGlzRXhlYzsKICAgICAgc2V0RXhlY3V0aW9uTW9kZShpc0V4ZWMpOwogICAgfQogICAgaWYgKGNoYW5nZXMuc2lsZW50TW9kZSkgewogICAgICBzaWxlbnRTd2l0Y2guY2hlY2tlZCA9IGNoYW5nZXMuc2lsZW50TW9kZS5uZXdWYWx1ZTsKICAgIH0KICAgIGlmIChjaGFuZ2VzLmdob3N0VGFiQWN0aXZlKSB7CiAgICAgIHVwZGF0ZUdob3N0U3RhdHVzKGNoYW5nZXMuZ2hvc3RUYWJBY3RpdmUubmV3VmFsdWUpOwogICAgfQogICAgaWYgKGNoYW5nZXMuYnJva2VySWQpIHsKICAgICAgdXBkYXRlQnJva2VyQmFkZ2UoY2hhbmdlcy5icm9rZXJJZC5uZXdWYWx1ZSk7CiAgICB9CiAgfSk7CgogIC8vIE1vZGUgVG9nZ2xlIG1hbnVhbGx5IGJ5IHVzZXIKICBtb2RlU3dpdGNoLmFkZEV2ZW50TGlzdGVuZXIoJ2NoYW5nZScsIGFzeW5jIChlKSA9PiB7CiAgICBjb25zdCBpc0V4ZWMgPSBlLnRhcmdldC5jaGVja2VkOwogICAgYXdhaXQgY2hyb21lLnN0b3JhZ2UubG9jYWwuc2V0KHsgYXBwTW9kZTogaXNFeGVjID8gJ2V4ZWN1dGlvbicgOiAncGxhbm5pbmcnIH0pOwogICAgc2V0RXhlY3V0aW9uTW9kZShpc0V4ZWMpOwogIH0pOwoKICAvLyBHbG9iYWwgS2lsbCBTd2l0Y2gKICBraWxsU3dpdGNoLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgYXN5bmMgKCkgPT4gewogICAgYXdhaXQgY2hyb21lLnN0b3JhZ2UubG9jYWwuc2V0KHsgYXBwTW9kZTogJ3BsYW5uaW5nJyB9KTsKICAgIGNocm9tZS5ydW50aW1lLnNlbmRNZXNzYWdlKHsgYWN0aW9uOiAibG9nX2F1ZGl0IiwgbG9nOiBgISBHTE9CQUwgU1RPUCBBQ1RJVkFURUQgQlkgVVNFUiAhYCB9KTsKICB9KTsKCiAgLy8gU2lsZW50IE1vZGUgVG9nZ2xlCiAgc2lsZW50U3dpdGNoLmFkZEV2ZW50TGlzdGVuZXIoJ2NoYW5nZScsIGFzeW5jIChlKSA9PiB7CiAgICBhd2FpdCBjaHJvbWUuc3RvcmFnZS5sb2NhbC5zZXQoeyBzaWxlbnRNb2RlOiBlLnRhcmdldC5jaGVja2VkIH0pOwogIH0pOwoKICAvLyBUaGVtZSBTZWxlY3RvcgogIHRoZW1lU2VsZWN0LmFkZEV2ZW50TGlzdGVuZXIoJ2NoYW5nZScsIGFzeW5jIChlKSA9PiB7CiAgICBjb25zdCB0aGVtZSA9IGUudGFyZ2V0LnZhbHVlOwogICAgYXBwbHlUaGVtZSh0aGVtZSk7CiAgICBhd2FpdCBjaHJvbWUuc3RvcmFnZS5sb2NhbC5zZXQoeyBzZWxlY3RlZFRoZW1lOiB0aGVtZSB9KTsKICB9KTsKCiAgLy8gRm9udCBTaXplIFNlbGVjdG9yCiAgZm9udFNpemVTZWxlY3QuYWRkRXZlbnRMaXN0ZW5lcignY2hhbmdlJywgYXN5bmMgKGUpID0+IHsKICAgIGNvbnN0IHNpemUgPSBlLnRhcmdldC52YWx1ZTsKICAgIGFwcGx5Rm9udFNpemUoc2l6ZSk7CiAgICBhd2FpdCBjaHJvbWUuc3RvcmFnZS5sb2NhbC5zZXQoeyBmb250U2l6ZTogc2l6ZSB9KTsKICB9KTsKCiAgLy8gU2V0dGluZ3MgVG9nZ2xlCiAgc2V0dGluZ3NCdG4uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiB7CiAgICBzZXR0aW5nc1NlY3Rpb24uY2xhc3NMaXN0LnRvZ2dsZSgnaGlkZGVuJyk7CiAgfSk7CgogIC8vIEF1ZGl0IEV4cGFuZC9Db2xsYXBzZQogIGNvbnN0IHRvZ2dsZUF1ZGl0U2l6ZUJ0biA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCd0b2dnbGUtYXVkaXQtc2l6ZScpOwogIGxldCBpc0F1ZGl0VmlzaWJsZSA9IHRydWU7CiAgdG9nZ2xlQXVkaXRTaXplQnRuLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKCkgPT4gewogICAgaXNBdWRpdFZpc2libGUgPSAhaXNBdWRpdFZpc2libGU7CiAgICBpZiAoaXNBdWRpdFZpc2libGUpIHsKICAgICAgYXVkaXRDb250YWluZXIuc3R5bGUuZGlzcGxheSA9ICdibG9jayc7CiAgICAgIHRvZ2dsZUF1ZGl0U2l6ZUJ0bi5zdHlsZS50cmFuc2Zvcm0gPSAncm90YXRlKDBkZWcpJzsKICAgIH0gZWxzZSB7CiAgICAgIGF1ZGl0Q29udGFpbmVyLnN0eWxlLmRpc3BsYXkgPSAnbm9uZSc7CiAgICAgIHRvZ2dsZUF1ZGl0U2l6ZUJ0bi5zdHlsZS50cmFuc2Zvcm0gPSAncm90YXRlKDE4MGRlZyknOwogICAgfQogIH0pOwoKICBmdW5jdGlvbiBhcHBseVRoZW1lKHRoZW1lKSB7CiAgICBpZiAodGhlbWUgPT09ICdkZWZhdWx0JykgewogICAgICBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQucmVtb3ZlQXR0cmlidXRlKCdkYXRhLXRoZW1lJyk7CiAgICB9IGVsc2UgewogICAgICBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuc2V0QXR0cmlidXRlKCdkYXRhLXRoZW1lJywgdGhlbWUpOwogICAgfQogIH0KCiAgZnVuY3Rpb24gYXBwbHlGb250U2l6ZShzaXplKSB7CiAgICBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuc2V0QXR0cmlidXRlKCdkYXRhLWZvbnQtc2l6ZScsIHNpemUpOwogIH0KCiAgZnVuY3Rpb24gdXBkYXRlQnJva2VyQmFkZ2UoaWQpIHsKICAgIGlmIChpZCkgewogICAgICBicm9rZXJCYWRnZS50ZXh0Q29udGVudCA9IGBCcm9rZXIgJHtpZH1gOwogICAgICBicm9rZXJCYWRnZS5zdHlsZS5kaXNwbGF5ID0gJ2lubGluZS1ibG9jayc7CiAgICAgIGJyb2tlckJhZGdlLmNsYXNzTGlzdC5hZGQoJ2FjdGl2ZScpOwogICAgICBicm9rZXJCYWRnZS5jbGFzc0xpc3QucmVtb3ZlKCd3YWl0aW5nJyk7CiAgICB9IGVsc2UgewogICAgICBicm9rZXJCYWRnZS50ZXh0Q29udGVudCA9IGBXYWl0aW5nIGZvciBUTVMuLi5gOwogICAgICBicm9rZXJCYWRnZS5zdHlsZS5kaXNwbGF5ID0gJ2lubGluZS1ibG9jayc7CiAgICAgIGJyb2tlckJhZGdlLmNsYXNzTGlzdC5hZGQoJ3dhaXRpbmcnKTsKICAgICAgYnJva2VyQmFkZ2UuY2xhc3NMaXN0LnJlbW92ZSgnYWN0aXZlJyk7CiAgICB9CiAgfQoKICBmdW5jdGlvbiB1cGRhdGVHaG9zdFN0YXR1cyhpc0FjdGl2ZSkgewogICAgaWYgKHNpbGVudFN3aXRjaC5jaGVja2VkKSB7CiAgICAgIHNpbGVudFN0YXR1cy5jbGFzc0xpc3QucmVtb3ZlKCdoaWRkZW4nKTsKICAgICAgaWYgKGlzQWN0aXZlKSB7CiAgICAgICAgZ2hvc3REb3QuY2xhc3NOYW1lID0gJ2dob3N0LWRvdCBhY3RpdmUnOwogICAgICAgIGdob3N0TGFiZWwudGV4dENvbnRlbnQgPSAnR2hvc3QgVGFiIEFjdGl2ZSc7CiAgICAgICAgZ2hvc3RMYWJlbC5zdHlsZS5jb2xvciA9ICcjMTBiOTgxJzsKICAgICAgfSBlbHNlIHsKICAgICAgICBnaG9zdERvdC5jbGFzc05hbWUgPSAnZ2hvc3QtZG90JzsKICAgICAgICBnaG9zdExhYmVsLnRleHRDb250ZW50ID0gJ0dob3N0IFRhYiBJbmFjdGl2ZSc7CiAgICAgICAgZ2hvc3RMYWJlbC5zdHlsZS5jb2xvciA9ICd2YXIoLS10ZXh0LW11dGVkKSc7CiAgICAgIH0KICAgIH0gZWxzZSB7CiAgICAgIHNpbGVudFN0YXR1cy5jbGFzc0xpc3QuYWRkKCdoaWRkZW4nKTsKICAgIH0KICB9CgogIGZ1bmN0aW9uIHJlbmRlckxvZ3MobG9ncykgewogICAgYXVkaXRDb250YWluZXIuaW5uZXJIVE1MID0gbG9ncy5qb2luKCc8YnIvPjxici8+Jyk7CiAgfQoKICBmdW5jdGlvbiBzZXRFeGVjdXRpb25Nb2RlKGlzRXhlYykgewogICAgaWYgKGlzRXhlYykgewogICAgICBtb2RlTGFiZWwudGV4dENvbnRlbnQgPSAnRXhlY3V0aW9uIE1vZGUgQWN0aXZlJzsKICAgICAgbW9kZUxhYmVsLnN0eWxlLmNvbG9yID0gJyMxMGI5ODEnOwogICAgICBkb2N1bWVudC5ib2R5LnN0eWxlLmJvcmRlclRvcCA9ICc0cHggc29saWQgIzEwYjk4MSc7CiAgICAgIGtpbGxTd2l0Y2guY2xhc3NMaXN0LnJlbW92ZSgnaGlkZGVuJyk7CiAgICAgIGF1ZGl0U2VjdGlvbi5jbGFzc0xpc3QucmVtb3ZlKCdoaWRkZW4nKTsKICAgIH0gZWxzZSB7CiAgICAgIG1vZGVMYWJlbC50ZXh0Q29udGVudCA9ICdQbGFubmluZyBNb2RlJzsKICAgICAgbW9kZUxhYmVsLnN0eWxlLmNvbG9yID0gJ3ZhcigtLXRleHQtbXV0ZWQpJzsKICAgICAgZG9jdW1lbnQuYm9keS5zdHlsZS5ib3JkZXJUb3AgPSAnNHB4IHNvbGlkIHZhcigtLWFjY2VudC1wcmltYXJ5KSc7CiAgICAgIGtpbGxTd2l0Y2guY2xhc3NMaXN0LmFkZCgnaGlkZGVuJyk7CiAgICB9CiAgfQoKICAvLyDilIDilIAgRURJVCBNT0RFIEhFTFBFUlMg4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSACiAgZnVuY3Rpb24gZW50ZXJFZGl0TW9kZShvcmRlcikgewogICAgZWRpdGluZ09yZGVySWQgPSBvcmRlci5pZDsKCiAgICAvLyBQb3B1bGF0ZSBhbGwgZm9ybSBmaWVsZHMgZnJvbSB0aGUgb3JkZXIKICAgIHN5bWJvbElucHV0LnZhbHVlID0gb3JkZXIuc3ltYm9sOwogICAgcXR5SW5wdXQudmFsdWUgPSBvcmRlci5xdHk7CiAgICB0eXBlU2VsZWN0LnZhbHVlID0gb3JkZXIudHlwZTsKICAgIGJhc2VQcmljZUlucHV0LnZhbHVlID0gb3JkZXIuYmFzZVByaWNlOwogICAgdHJpZ2dlckNvbmRTZWxlY3QudmFsdWUgPSBvcmRlci50cmlnZ2VyQ29uZGl0aW9uOwoKICAgIC8vIFVwZGF0ZSBmb3JtIFVJIHRvIGVkaXQgc3RhdGUKICAgIGZvcm1UaXRsZS50ZXh0Q29udGVudCA9IGBFZGl0aW5nIE9yZGVyIOKAlCAke29yZGVyLnN5bWJvbH1gOwogICAgYWRkT3JkZXJCdG4udGV4dENvbnRlbnQgPSAnVXBkYXRlIE9yZGVyJzsKICAgIGFkZE9yZGVyQnRuLnN0eWxlLmJhY2tncm91bmQgPSAnbGluZWFyLWdyYWRpZW50KDkwZGVnLCAjZjU5ZTBiLCAjZDk3NzA2KSc7CiAgICBjYW5jZWxFZGl0QnRuLmNsYXNzTGlzdC5yZW1vdmUoJ2hpZGRlbicpOwogICAgc3ltYm9sSW5wdXQuZm9jdXMoKTsKCiAgICAvLyBTY3JvbGwgZm9ybSBpbnRvIHZpZXcKICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdmb3JtLXNlY3Rpb24nKS5zY3JvbGxJbnRvVmlldyh7IGJlaGF2aW9yOiAnc21vb3RoJyB9KTsKICB9CgogIGZ1bmN0aW9uIGNhbmNlbEVkaXRNb2RlKCkgewogICAgZWRpdGluZ09yZGVySWQgPSBudWxsOwogICAgZm9ybS5yZXNldCgpOwogICAgZm9ybVRpdGxlLnRleHRDb250ZW50ID0gJ0FkZCBOZXcgT3JkZXInOwogICAgYWRkT3JkZXJCdG4udGV4dENvbnRlbnQgPSAnQWRkIE9yZGVyJzsKICAgIGFkZE9yZGVyQnRuLnN0eWxlLmJhY2tncm91bmQgPSAnJzsKICAgIGNhbmNlbEVkaXRCdG4uY2xhc3NMaXN0LmFkZCgnaGlkZGVuJyk7CiAgICBlcnJvck1zZy5jbGFzc0xpc3QuYWRkKCdoaWRkZW4nKTsKICB9CgogIGNhbmNlbEVkaXRCdG4uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBjYW5jZWxFZGl0TW9kZSk7CiAgLy8g4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSACgogIC8vIEhhbmRsZSBPcmRlciBBZGQgLyBVcGRhdGUKICBmb3JtLmFkZEV2ZW50TGlzdGVuZXIoJ3N1Ym1pdCcsIGFzeW5jIChlKSA9PiB7CiAgICBlLnByZXZlbnREZWZhdWx0KCk7CiAgICBlcnJvck1zZy5jbGFzc0xpc3QuYWRkKCdoaWRkZW4nKTsKCiAgICBjb25zdCBiYXNlUHJpY2UgPSBwYXJzZUZsb2F0KGJhc2VQcmljZUlucHV0LnZhbHVlKTsKICAgIGNvbnN0IHRyaWdnZXJDb25kaXRpb24gPSB0cmlnZ2VyQ29uZFNlbGVjdC52YWx1ZTsKICAgIGNvbnN0IGNvbXB1dGVkVGFyZ2V0ID0gYmFzZVByaWNlOwoKICAgIGxldCBwYXJzZWRTeW1ib2wgPSBzeW1ib2xJbnB1dC52YWx1ZS50b1VwcGVyQ2FzZSgpLnRyaW0oKTsKICAgIGlmIChwYXJzZWRTeW1ib2wuaW5jbHVkZXMoJyAoJykpIHsKICAgICAgcGFyc2VkU3ltYm9sID0gcGFyc2VkU3ltYm9sLnNwbGl0KCcgKCcpWzBdOwogICAgfQoKICAgIGlmIChlZGl0aW5nT3JkZXJJZCkgewogICAgICAvLyDilIDilIAgVVBEQVRFIGV4aXN0aW5nIG9yZGVyIGluLXBsYWNlIOKUgOKUgAogICAgICBjb25zdCBpZHggPSBvcmRlcnMuZmluZEluZGV4KG8gPT4gby5pZCA9PT0gZWRpdGluZ09yZGVySWQpOwogICAgICBpZiAoaWR4ID4gLTEpIHsKICAgICAgICBvcmRlcnNbaWR4XSA9IHsKICAgICAgICAgIC4uLm9yZGVyc1tpZHhdLCAgICAgICAgICAgLy8ga2VlcCBpZCwgc3RhdHVzLCByZXRyaWVzCiAgICAgICAgICBzeW1ib2w6IHBhcnNlZFN5bWJvbCwKICAgICAgICAgIHF0eTogcGFyc2VJbnQocXR5SW5wdXQudmFsdWUpLAogICAgICAgICAgdHlwZTogdHlwZVNlbGVjdC52YWx1ZSwKICAgICAgICAgIGJhc2VQcmljZTogYmFzZVByaWNlLAogICAgICAgICAgdHJpZ2dlckNvbmRpdGlvbjogdHJpZ2dlckNvbmRpdGlvbiwKICAgICAgICAgIHRhcmdldFByaWNlOiBwYXJzZUZsb2F0KGNvbXB1dGVkVGFyZ2V0LnRvRml4ZWQoMikpCiAgICAgICAgfTsKICAgICAgICBhd2FpdCBjaHJvbWUuc3RvcmFnZS5sb2NhbC5zZXQoeyBvcmRlcnMgfSk7CiAgICAgICAgY2FuY2VsRWRpdE1vZGUoKTsKICAgICAgICByZW5kZXJPcmRlcnMoKTsKICAgICAgfQogICAgfSBlbHNlIHsKICAgICAgLy8g4pSA4pSAIEFERCBuZXcgb3JkZXIg4pSA4pSACiAgICAgIGlmIChvcmRlcnMubGVuZ3RoID49IDEwKSB7CiAgICAgICAgZXJyb3JNc2cudGV4dENvbnRlbnQgPSAnTWF4aW11bSAxMCBvcmRlcnMgYWxsb3dlZCBpbiBwbGFubmluZy4nOwogICAgICAgIGVycm9yTXNnLmNsYXNzTGlzdC5yZW1vdmUoJ2hpZGRlbicpOwogICAgICAgIHJldHVybjsKICAgICAgfQoKICAgICAgY29uc3QgbmV3T3JkZXIgPSB7CiAgICAgICAgaWQ6IERhdGUubm93KCkudG9TdHJpbmcoKSwKICAgICAgICBzeW1ib2w6IHBhcnNlZFN5bWJvbCwKICAgICAgICBxdHk6IHBhcnNlSW50KHF0eUlucHV0LnZhbHVlKSwKICAgICAgICB0eXBlOiB0eXBlU2VsZWN0LnZhbHVlLAogICAgICAgIGJhc2VQcmljZTogYmFzZVByaWNlLAogICAgICAgIHRyaWdnZXJDb25kaXRpb246IHRyaWdnZXJDb25kaXRpb24sCiAgICAgICAgdGFyZ2V0UHJpY2U6IHBhcnNlRmxvYXQoY29tcHV0ZWRUYXJnZXQudG9GaXhlZCgyKSksCiAgICAgICAgc3RhdHVzOiAncGVuZGluZycsCiAgICAgICAgcmV0cmllczogMAogICAgICB9OwoKICAgICAgb3JkZXJzLnB1c2gobmV3T3JkZXIpOwogICAgICBhd2FpdCBjaHJvbWUuc3RvcmFnZS5sb2NhbC5zZXQoeyBvcmRlcnMgfSk7CgogICAgICAvLyBSZXNldCBmb3JtCiAgICAgIHN5bWJvbElucHV0LnZhbHVlID0gJyc7CiAgICAgIHF0eUlucHV0LnZhbHVlID0gJyc7CiAgICAgIGJhc2VQcmljZUlucHV0LnZhbHVlID0gJyc7CgogICAgICByZW5kZXJPcmRlcnMoKTsKICAgIH0KICB9KTsKCiAgLy8gUmVuZGVyIE9yZGVycwogIGZ1bmN0aW9uIHJlbmRlck9yZGVycygpIHsKICAgIGNvbnRhaW5lci5pbm5lckhUTUwgPSAnJzsKICAgIGNvdW50U3Bhbi50ZXh0Q29udGVudCA9IG9yZGVycy5sZW5ndGg7CgogICAgb3JkZXJzLmZvckVhY2gob3JkZXIgPT4gewogICAgICBjb25zdCBjYXJkID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7CiAgICAgIGNvbnN0IGlzRWRpdGluZyA9IG9yZGVyLmlkID09PSBlZGl0aW5nT3JkZXJJZDsKICAgICAgY2FyZC5jbGFzc05hbWUgPSBgb3JkZXItY2FyZCAke29yZGVyLnR5cGUudG9Mb3dlckNhc2UoKX0gJHtvcmRlci5zdGF0dXMgIT09ICdwZW5kaW5nJyA/ICdleGVjdXRlZCcgOiAnJ30gJHtpc0VkaXRpbmcgPyAnZWRpdGluZycgOiAnJ31gOwoKICAgICAgbGV0IHN0YXR1c0ljb24gPSAn4o+zJzsKICAgICAgaWYgKG9yZGVyLnN0YXR1cyA9PT0gJ2V4ZWN1dGVkJykgc3RhdHVzSWNvbiA9ICfinIUnOwogICAgICBpZiAob3JkZXIuc3RhdHVzID09PSAnZmFpbGVkJykgc3RhdHVzSWNvbiA9ICfinYwnOwoKICAgICAgY2FyZC5pbm5lckhUTUwgPSBgCiAgICAgICAgPGRpdiBjbGFzcz0ib3JkZXItaW5mbyI+CiAgICAgICAgICA8ZGl2IGNsYXNzPSJvcmRlci10aXRsZSI+CiAgICAgICAgICAgICR7b3JkZXIuc3ltYm9sfSA8c3BhbiBjbGFzcz0iYmFkZ2UgJHtvcmRlci50eXBlLnRvTG93ZXJDYXNlKCl9Ij4ke29yZGVyLnR5cGV9PC9zcGFuPiA8c3BhbiBjbGFzcz0iYmFkZ2UiIHN0eWxlPSJiYWNrZ3JvdW5kOnZhcigtLWJvcmRlci1jb2xvcik7Y29sb3I6I2ZmZiI+VGFyZ2V0OiDgpLDgpYIgJHtvcmRlci50YXJnZXRQcmljZX08L3NwYW4+CiAgICAgICAgICA8L2Rpdj4KICAgICAgICAgIDxkaXYgY2xhc3M9Im9yZGVyLWRldGFpbHMiPgogICAgICAgICAgICBRdHk6IDxzcGFuPiR7b3JkZXIucXR5fTwvc3Bhbj4gfCBUcmlnZ2VyOiA8c3Bhbj4ke29yZGVyLnRyaWdnZXJDb25kaXRpb24gPT09ICdhdXRvJyA/ICdCYW5kIEF1dG8nIDogJ0xUUCAnICsgb3JkZXIudHJpZ2dlckNvbmRpdGlvbiArICcgJyArIG9yZGVyLmJhc2VQcmljZX08L3NwYW4+IHwgPHNwYW4+JHtzdGF0dXNJY29ufTwvc3Bhbj4KICAgICAgICAgIDwvZGl2PgogICAgICAgIDwvZGl2PgogICAgICAgICR7b3JkZXIuc3RhdHVzID09PSAncGVuZGluZycgPyBgCiAgICAgICAgICA8ZGl2IGNsYXNzPSJjYXJkLWFjdGlvbnMiPgogICAgICAgICAgICA8YnV0dG9uIGNsYXNzPSJlZGl0LWJ0biIgZGF0YS1pZD0iJHtvcmRlci5pZH0iIHRpdGxlPSJFZGl0IG9yZGVyIj7inI/vuI88L2J1dHRvbj4KICAgICAgICAgICAgPGJ1dHRvbiBjbGFzcz0iZGVsZXRlLWJ0biIgZGF0YS1pZD0iJHtvcmRlci5pZH0iIHRpdGxlPSJEZWxldGUgb3JkZXIiPuKcljwvYnV0dG9uPgogICAgICAgICAgPC9kaXY+CiAgICAgICAgYCA6ICcnfQogICAgICBgOwoKICAgICAgY29udGFpbmVyLmFwcGVuZENoaWxkKGNhcmQpOwogICAgfSk7CgogICAgLy8gRWRpdCBsaXN0ZW5lcnMKICAgIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJy5lZGl0LWJ0bicpLmZvckVhY2goYnRuID0+IHsKICAgICAgYnRuLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKGUpID0+IHsKICAgICAgICBjb25zdCBpZCA9IGUuY3VycmVudFRhcmdldC5nZXRBdHRyaWJ1dGUoJ2RhdGEtaWQnKTsKICAgICAgICBjb25zdCBvcmRlciA9IG9yZGVycy5maW5kKG8gPT4gby5pZCA9PT0gaWQpOwogICAgICAgIGlmIChvcmRlcikgZW50ZXJFZGl0TW9kZShvcmRlcik7CiAgICAgIH0pOwogICAgfSk7CgogICAgLy8gRGVsZXRlIGxpc3RlbmVycwogICAgZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgnLmRlbGV0ZS1idG4nKS5mb3JFYWNoKGJ0biA9PiB7CiAgICAgIGJ0bi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGFzeW5jIChlKSA9PiB7CiAgICAgICAgY29uc3QgaWQgPSBlLmN1cnJlbnRUYXJnZXQuZ2V0QXR0cmlidXRlKCdkYXRhLWlkJyk7CiAgICAgICAgaWYgKGVkaXRpbmdPcmRlcklkID09PSBpZCkgY2FuY2VsRWRpdE1vZGUoKTsKICAgICAgICBvcmRlcnMgPSBvcmRlcnMuZmlsdGVyKG8gPT4gby5pZCAhPT0gaWQpOwogICAgICAgIGF3YWl0IGNocm9tZS5zdG9yYWdlLmxvY2FsLnNldCh7IG9yZGVycyB9KTsKICAgICAgICByZW5kZXJPcmRlcnMoKTsKICAgICAgfSk7CiAgICB9KTsKICB9Cn0pOwoKPC9zY3JpcHQ+CjwvYm9keT4KCjwvaHRtbD4=';
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
    
    if (!document.getElementById('nepse-switch-broker') && document.body && window.location.pathname.toLowerCase().includes('/login')) {
        const switchBtn = document.createElement('button');
        switchBtn.id = 'nepse-switch-broker';
        switchBtn.innerHTML = 'Switch Broker';
        switchBtn.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 8px 16px;
            background: linear-gradient(135deg, #FCD535, #F8B400);
            color: #1E2329;
            border: none;
            border-radius: 8px;
            font-weight: 600;
            font-size: 14px;
            cursor: pointer;
            z-index: 9999999;
            box-shadow: 0 4px 15px rgba(252, 213, 53, 0.4);
            transition: all 0.2s;
            font-family: 'Inter', sans-serif;
        `;
        switchBtn.onmouseover = () => switchBtn.style.transform = 'scale(1.05)';
        switchBtn.onmouseout = () => switchBtn.style.transform = 'scale(1)';
        
        switchBtn.onclick = () => {
            const localUrl = window.navigator.userAgent.includes('Windows') ? 'http://tauri.localhost/?switch=1' : 'tauri://localhost/?switch=1';
            window.location.href = localUrl;
        };
        
        document.body.appendChild(switchBtn);
    }
    
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

if (!isGhostFrame) {
    if (document.body) {
        startUI();
    } else {
        document.addEventListener('DOMContentLoaded', startUI);
    }
}

} catch(e) { console.error('TMS EXT ERROR:', e); }
})();
