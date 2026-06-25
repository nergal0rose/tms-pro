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
            width: 40px;
            height: 40px;
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
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1E2329" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
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
