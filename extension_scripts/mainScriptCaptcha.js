if (!window.location.hostname.includes('nepsetms.com.np')) throw new Error('Abort Script');
// ==========================================
// NEPSE TMS CAPTCHA SOLVER
// Deferred wrapper for the patched content-script OCR engine.
// The OCR engine (tms_ocr_eval.js) exposes window.__tmsCaptchaSolve(url)
// but needs chrome.runtime.getURL stubbed first.
// ==========================================

(function() {
    // Stub chrome.runtime.getURL - the OCR engine needs this for empty.jpg background
    if (!window.chrome) window.chrome = {};
    if (!window.chrome.runtime) window.chrome.runtime = {};

    // Base64 of the empty.jpg background image used for subtraction
    const EMPTY_DATA_URL = 'data:image/jpeg;base64,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';

    // The original chrome.runtime.getURL - map to our embedded data
    const origGetURL = window.chrome.runtime.getURL;
    window.chrome.runtime.getURL = function(path) {
        if (path && (path.includes('empty') || path.includes('assets/empty'))) {
            return EMPTY_DATA_URL;
        }
        // For data path, return empty string (bold/slim data is already inside the bundle)
        if (path && path.includes('data')) return '';
        // Fallback to original if it exists
        if (origGetURL) return origGetURL(path);
        return '';
    };

    // Angular-compatible input fill
    function setAngularValue(el, val) {
        if (!el) return;
        Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(el, val);
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
    }

    // Status display
    function updateStatus(msg, type) {
        const el = document.getElementById('tms-captcha-status');
        if (!el) return;
        el.textContent = msg;
        el.style.color = type === 'success' ? '#4caf50' : type === 'error' ? '#f44336' : '#FCD535';
        el.style.display = msg ? 'block' : 'none';
    }

    // Core solver - calls the OCR engine exposed by tms_ocr_eval.js
    async function solveCaptchaFromSrc(imgSrc) {
        const solveFn = window.__tmsCaptchaSolve;
        if (!solveFn) {
            throw new Error('OCR engine not loaded (window.__tmsCaptchaSolve missing)');
        }
        return await solveFn(imgSrc);
    }

    // Auto-solve: get captcha src, solve, fill input
    async function autoSolveCaptcha(maxRetries) {
        maxRetries = maxRetries || 3;
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                updateStatus('Attempt ' + attempt + '/' + maxRetries + '...', 'working');
                await new Promise(r => setTimeout(r, 500));

                // Find the captcha image - use the exact selector from the extension
                const img = document.querySelector('.form-control.captcha-image-dimension.col-10');
                if (!img) throw new Error('Captcha image not found');

                const imgSrc = img.getAttribute('src');
                if (!imgSrc || imgSrc.includes('captcha-image.jpg')) {
                    throw new Error('Captcha image not loaded yet');
                }

                // If imgSrc is a relative path or blob, try fetching it as a DataURL to avoid cross-origin / blob issues in the worker
                let targetSrc = imgSrc;
                try {
                    const res = await fetch(imgSrc);
                    const blob = await res.blob();
                    targetSrc = await new Promise((resolve) => {
                        const reader = new FileReader();
                        reader.onloadend = () => resolve(reader.result);
                        reader.readAsDataURL(blob);
                    });
                } catch(e) {
                    console.warn('[TMS Captcha] Failed to convert image to DataURL, using raw src:', e);
                }

                const result = await solveCaptchaFromSrc(targetSrc);

                if (result && result.value && result.value.length === 6) {
                    // Successfully solved! The OCR engine already fills #captchaEnter,
                    // but Angular may not register it. Use our own Angular-compat fill.
                    const input = document.getElementById('captchaEnter');
                    setAngularValue(input, result.value);
                    updateStatus('Solved: "' + result.value + '"', 'success');
                    console.log('[TMS Captcha] Solved: ' + result.value);
                    return result.value;
                } else {
                    const val = result ? result.value : 'null';
                    throw new Error('OCR returned invalid: "' + val + '" (type=' + (result ? result.type : '?') + ')');
                }
            } catch (err) {
                console.error('[TMS Captcha] Attempt ' + attempt + ' failed:', err);
                updateStatus('Error: ' + err.message, 'error');
                if (attempt < maxRetries) {
                    // Click reload captcha button
                    const btn = document.querySelector('a[aria-label="Reload captcha"], a[title="Reload Captcha"], .fa-refresh');
                    if (btn) {
                        btn.dispatchEvent(new Event('click'));
                        console.log('[TMS Captcha] Reloading captcha...');
                    }
                    await new Promise(r => setTimeout(r, 1500));
                }
            }
        }
        updateStatus('All attempts failed. Try manually.', 'error');
        return null;
    }

    // Set up a MutationObserver to auto-solve whenever the captcha image src changes
    function setupAutoSolve() {
        const img = document.querySelector('.form-control.captcha-image-dimension.col-10');
        if (!img) return false;

        const observer = new MutationObserver(async (mutations) => {
            const srcChange = mutations.find(m => m.attributeName === 'src');
            if (!srcChange) return;

            const newSrc = img.getAttribute('src');
            if (!newSrc || newSrc.includes('captcha-image.jpg')) return;

            console.log('[TMS Captcha] Captcha src changed, auto-solving...');
            await new Promise(r => setTimeout(r, 300)); // Brief delay for image to fully load

            const result = await solveCaptchaFromSrc(newSrc);
            if (result && result.value && result.value.length === 6) {
                const input = document.getElementById('captchaEnter');
                setAngularValue(input, result.value);
                updateStatus('Auto-solved: "' + result.value + '"', 'success');
                setTimeout(() => updateStatus('', ''), 3000);
            }
        });

        observer.observe(img, { attributes: true, attributeFilter: ['src'] });
        console.log('[TMS Captcha] Auto-solve observer active');
        return true;
    }

    // Inject UI (solve button + status)
    function injectUI() {
        if (document.getElementById('tms-captcha-solver-container')) return;
        const c = document.createElement('div');
        c.id = 'tms-captcha-solver-container';
        c.innerHTML = '<div id="tms-solve-btn" title="Auto-Solve Captcha" style="position:fixed;bottom:70px;right:20px;width:44px;height:44px;background:linear-gradient(135deg,#4caf50,#2e7d32);border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 4px 15px rgba(76,175,80,0.5);z-index:2147483647;font-size:22px;user-select:none;transition:transform .15s,opacity .15s;" >🤖</div><div id="tms-captcha-status" style="position:fixed;bottom:120px;right:10px;max-width:220px;font-size:11px;color:#4caf50;font-weight:600;z-index:2147483647;text-align:right;font-family:system-ui,sans-serif;background:rgba(0,0,0,0.7);padding:4px 8px;border-radius:6px;display:none;"></div>';
        document.body.appendChild(c);

        const solveBtn = document.getElementById('tms-solve-btn');

        solveBtn.addEventListener('mouseenter', () => solveBtn.style.transform = 'scale(1.12)');
        solveBtn.addEventListener('mouseleave', () => solveBtn.style.transform = 'scale(1)');

        solveBtn.addEventListener('click', async () => {
            solveBtn.style.opacity = '0.6';
            solveBtn.style.pointerEvents = 'none';
            try { await autoSolveCaptcha(5); }
            finally {
                solveBtn.style.opacity = '';
                solveBtn.style.pointerEvents = '';
                setTimeout(() => updateStatus('', ''), 4000);
            }
        });

        window.__autoSolveCaptcha = autoSolveCaptcha;

        // Set up auto-solve observer
        setupAutoSolve();

        // Auto-solve on first load if captcha is already visible
        const img = document.querySelector('.form-control.captcha-image-dimension.col-10');
        if (img) {
            const src = img.getAttribute('src');
            if (src && !src.includes('captcha-image.jpg')) {
                console.log('[TMS Captcha] Captcha already loaded, auto-solving...');
                setTimeout(() => autoSolveCaptcha(3), 800);
            }
        }
    }

    // Poll for login page and inject UI when ready
    setInterval(function() {
        if (window.location.href.includes('/login')) {
            if (document.body && !document.getElementById('tms-captcha-solver-container')) {
                injectUI();
            }
        } else {
            const c = document.getElementById('tms-captcha-solver-container');
            if (c) c.remove();
        }
    }, 500);

})();
