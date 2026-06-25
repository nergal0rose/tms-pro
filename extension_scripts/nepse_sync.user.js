// ==UserScript==
// @name         Nepse Next Candle Sync
// @namespace    http://tampermonkey.net/
// @version      2.0
// @description  Sync next candle replay between NepseTrading and NepseAlpha
// @author       Antigravity
// @match        *://*.nepsealpha.com/*
// @match        *://*.nepsetrading.com/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addValueChangeListener
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    // Identify which page we are on
    const isChartPage = window.location.href.includes('nepsetrading.com');
    const isSimulatorPage = window.location.href.includes('nepsealpha.com/twits/trading-simulator');

    if (!isChartPage && !isSimulatorPage) {
        return; // Run only on these specific domains/pages
    }

    console.log(`[Sync] Script loaded on ${window.location.hostname}. Role: ${isChartPage ? 'Chart Page' : 'Simulator Page'}`);

    // Helper to find the step-forward button recursively across main doc & same-origin iframes
    function findStepForwardButton() {
        function searchDoc(doc) {
            // 1. Search by data-name
            let el = doc.querySelector('[data-name="step-forward"], [data-name="replay-step"], [data-name*="step"]');
            if (el) return el;

            // 2. Search by title / aria-label / class name containing "step" or "forward"
            const candidates = doc.querySelectorAll('button, [role="button"], div, span, svg, a');
            for (const el of candidates) {
                const title = (el.getAttribute('title') || '').toLowerCase();
                const ariaLabel = (el.getAttribute('aria-label') || '').toLowerCase();
                const dataTitle = (el.getAttribute('data-title') || '').toLowerCase();
                const className = (el.className || '').toString().toLowerCase();

                const isStepOrForward = title.includes('step') || ariaLabel.includes('step') || dataTitle.includes('step') ||
                                        (title.includes('forward') && !title.includes('fast')) ||
                                        (ariaLabel.includes('forward') && !ariaLabel.includes('fast')) ||
                                        className.includes('step-forward') || className.includes('replay-step');

                if (isStepOrForward) {
                    // Exclude play, pause, fast forward, back buttons
                    if (title.includes('play') || ariaLabel.includes('play') || 
                        title.includes('fast') || ariaLabel.includes('fast') ||
                        title.includes('back') || ariaLabel.includes('back')) {
                        continue;
                    }
                    return el;
                }
            }

            // 3. Fallback for classes
            el = doc.querySelector('[class*="step-forward"], [class*="step_forward"]');
            if (el) return el;

            return null;
        }

        // Search top level
        let target = searchDoc(document);
        if (target) return target;

        // Search same-origin iframes
        const iframes = document.querySelectorAll('iframe');
        for (const iframe of iframes) {
            try {
                if (iframe.contentDocument) {
                    target = searchDoc(iframe.contentDocument);
                    if (target) return target;
                }
            } catch (e) {
                // Cross-origin iframe, ignore
            }
        }
        return null;
    }

    // Helper to find simulator Next Candle button
    function findSimulatorNextButton() {
        const elements = Array.from(document.querySelectorAll('button, a, div, span'));
        return elements.find(el => el.textContent.trim().toUpperCase() === 'NEXT CANDLE');
    }

    // Helper to trigger visual click effect on buttons
    function simulateClickEffect(element) {
        if (!element) return;
        const originalTransition = element.style.transition;
        const originalTransform = element.style.transform;
        element.style.transition = 'transform 0.1s ease';
        element.style.transform = 'scale(0.92)';
        setTimeout(() => {
            element.style.transform = originalTransform;
            setTimeout(() => {
                element.style.transition = originalTransition;
            }, 100);
        }, 100);
    }

    // Broadcast function
    function triggerNextCandleSync() {
        console.log('[Sync] Broadcasting NEXT_CANDLE action');
        GM_setValue('sync_next_candle', { timestamp: Date.now() });
    }

    // Listen to changes from the other tab
    GM_addValueChangeListener('sync_next_candle', (key, oldValue, newValue, remote) => {
        if (!remote) return; // Only process changes from other tabs

        console.log('[Sync] Received NEXT_CANDLE action from remote tab');

        if (isChartPage) {
            const btn = findStepForwardButton();
            if (btn) {
                console.log('[Sync] Clicking Chart Step Forward button:', btn);
                btn.click();
                simulateClickEffect(btn);
            } else {
                console.warn('[Sync] Replay Step Forward button not found on Chart page.');
            }
        }

        if (isSimulatorPage) {
            const btn = findSimulatorNextButton();
            if (btn) {
                console.log('[Sync] Clicking Simulator Next Candle button');
                btn.click(); // Programmatic click: event.isTrusted will be false, preventing infinite loops
                simulateClickEffect(btn);
            } else {
                console.warn('[Sync] "NEXT CANDLE" button not found on Simulator page.');
            }
        }
    });

    // --- Page Specific Event Listeners ---

    // Ignore keypresses in input fields
    function isInsideInput(el) {
        return el && (
            el.tagName === 'INPUT' || 
            el.tagName === 'TEXTAREA' || 
            el.isContentEditable || 
            el.getAttribute('role') === 'textbox'
        );
    }

    if (isChartPage) {
        console.log('[Sync] Chart page listeners active. Keys (N, ArrowRight) & mouse clicks on replay button will step forward & sync.');

        // 1. Listen for keydown
        window.addEventListener('keydown', (event) => {
            if (isInsideInput(document.activeElement)) return;

            if (event.key === 'n' || event.key === 'N' || event.key === 'ArrowRight') {
                console.log('[Sync] Keypress detected on Chart page');
                const btn = findStepForwardButton();
                if (btn) {
                    btn.click();
                    simulateClickEffect(btn);
                } else {
                    console.warn('[Sync] Local Replay button not found to click.');
                }
                triggerNextCandleSync();
            }
        });

        // 2. Listen for clicks on the Step Forward button to sync back
        document.addEventListener('click', (event) => {
            if (!event.isTrusted) return;

            const target = event.target.closest('button, [role="button"], div, span, svg, a');
            if (!target) return;

            const title = (target.getAttribute('title') || '').toLowerCase();
            const ariaLabel = (target.getAttribute('aria-label') || '').toLowerCase();
            const className = (target.className || '').toString().toLowerCase();

            const isStepOrForward = title.includes('step') || ariaLabel.includes('step') || className.includes('step-forward');
            
            if (isStepOrForward) {
                if (title.includes('play') || ariaLabel.includes('play') || title.includes('fast')) return;
                console.log('[Sync] User clicked Step Forward button on Chart page');
                triggerNextCandleSync();
            }
        });
    }

    if (isSimulatorPage) {
        console.log('[Sync] Simulator page listeners active. Keys (N, ArrowRight) & "NEXT CANDLE" clicks will sync.');

        // 1. Listen for keydown
        window.addEventListener('keydown', (event) => {
            if (isInsideInput(document.activeElement)) return;

            if (event.key === 'n' || event.key === 'N' || event.key === 'ArrowRight') {
                console.log('[Sync] Keypress detected on Simulator page');
                const btn = findSimulatorNextButton();
                if (btn) {
                    btn.click(); // Trigger local click
                    simulateClickEffect(btn);
                }
                triggerNextCandleSync();
            }
        });

        // 2. Listen for user click on the NEXT CANDLE button to broadcast
        document.addEventListener('click', (event) => {
            // Only trigger if it is a real user click (trusted) to avoid loop feedback
            if (!event.isTrusted) return;

            const target = event.target.closest('button, a, div, span');
            if (target && target.textContent.trim().toUpperCase() === 'NEXT CANDLE') {
                console.log('[Sync] User clicked "NEXT CANDLE" on Simulator page');
                triggerNextCandleSync();
            }
        });
    }
})();
