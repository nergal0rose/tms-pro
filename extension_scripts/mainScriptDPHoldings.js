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
