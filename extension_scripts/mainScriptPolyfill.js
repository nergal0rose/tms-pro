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
        // Fix for content.js expecting background.js to confirm execution tab
        if (msg.action === "check_execution_tab") {
            return { isExecutionTab: true };
        }
        
        // Pass to listeners (e.g. popup.js)
        __msgListeners.forEach(cb => cb(msg, {}, () => {}));
        return { success: true };
    },
    onMessage: {
        addListener: (cb) => { __msgListeners.push(cb); }
    }
};
