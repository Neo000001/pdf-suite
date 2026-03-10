/**
 * PDFSuite - Ad-Block Detection & Fair Use Gate
 * Copyright (c) 2025 Eebii / PDFSuite. All Rights Reserved.
 * Shows polite notice on first visit, countdown overlay after 2+ tool uses with ad block.
 */

(function () {
    'use strict';

    const WHITELIST_KEY = 'pdfsuite-whitelisted';
    const USAGE_KEY = 'pdfsuite-tool-uses';
    const DISMISSED_KEY = 'pdfsuite-notice-dismissed';
    const GATE_WAIT = 30; // seconds countdown

    // Don't run on homepage, about, privacy, terms, contact pages
    const path = window.location.pathname;
    const isToolPage = !['/', '/index.html', '/public/about.html', '/public/privacy.html',
        '/public/terms.html', '/public/contact.html', '/public/premium.html']
        .some(p => path.endsWith(p));

    // ── Inject all CSS ──
    const style = document.createElement('style');
    style.textContent = `
        /* ─── Corner Notice ─── */
        #abn-notice {
            position: fixed;
            bottom: 24px;
            right: 24px;
            z-index: 99998;
            background: linear-gradient(135deg, #1e293b, #0f172a);
            color: #f1f5f9;
            border: 1px solid rgba(96, 165, 250, 0.3);
            border-radius: 16px;
            padding: 1.1rem 1.4rem;
            max-width: 310px;
            box-shadow: 0 20px 50px rgba(0,0,0,0.6);
            font-family: system-ui, -apple-system, sans-serif;
            font-size: 0.875rem;
            line-height: 1.6;
            animation: abn-slideUp 0.4s cubic-bezier(0.34,1.56,0.64,1) both;
            display: flex;
            flex-direction: column;
            gap: 0.75rem;
        }
        @keyframes abn-slideUp {
            from { opacity:0; transform:translateY(30px); }
            to   { opacity:1; transform:translateY(0); }
        }
        #abn-notice .abn-title {
            font-weight: 700;
            font-size: 0.95rem;
            color: #60a5fa;
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }
        #abn-notice p {
            margin: 0;
            color: #94a3b8;
            font-size: 0.82rem;
        }
        #abn-notice .abn-btns { display: flex; gap: 0.5rem; }
        #abn-notice .abn-btn-primary {
            flex: 1;
            padding: 0.5rem;
            background: #2563eb;
            color: #fff;
            border: none;
            border-radius: 8px;
            font-size: 0.8rem;
            font-weight: 600;
            cursor: pointer;
        }
        #abn-notice .abn-btn-close {
            padding: 0.5rem 0.75rem;
            background: transparent;
            color: #64748b;
            border: 1px solid rgba(100,116,139,0.4);
            border-radius: 8px;
            font-size: 0.8rem;
            cursor: pointer;
        }

        /* ─── Full-Screen Overlay ─── */
        #abn-overlay {
            position: fixed;
            inset: 0;
            z-index: 999999;
            background: rgba(2, 6, 23, 0.94);
            backdrop-filter: blur(12px);
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: system-ui, -apple-system, sans-serif;
            animation: abn-fadeIn 0.4s ease both;
        }
        @keyframes abn-fadeIn {
            from { opacity: 0; }
            to   { opacity: 1; }
        }
        #abn-overlay-box {
            background: linear-gradient(160deg, #0f172a, #1e293b);
            border: 1px solid rgba(96,165,250,0.2);
            border-radius: 24px;
            padding: 2.5rem 2rem;
            max-width: 480px;
            width: 90%;
            text-align: center;
            box-shadow: 0 40px 80px rgba(0,0,0,0.7);
            color: #f1f5f9;
        }
        #abn-overlay-box .abn-emoji { font-size: 3rem; margin-bottom: 0.75rem; }
        #abn-overlay-box h2 {
            margin: 0 0 0.75rem;
            font-size: 1.4rem;
            color: #f8fafc;
            line-height: 1.3;
        }
        #abn-overlay-box h2 span { color: #60a5fa; }
        #abn-overlay-box p {
            color: #94a3b8;
            font-size: 0.9rem;
            line-height: 1.7;
            margin: 0 0 1.5rem;
        }
        #abn-overlay-box .abn-steps {
            display: flex;
            gap: 1rem;
            margin-bottom: 1.75rem;
            text-align: left;
            background: rgba(96,165,250,0.05);
            border: 1px solid rgba(96,165,250,0.1);
            border-radius: 12px;
            padding: 1rem;
        }
        #abn-overlay-box .abn-step {
            flex: 1;
            font-size: 0.8rem;
            color: #64748b;
        }
        #abn-overlay-box .abn-step strong { color: #94a3b8; display: block; margin-bottom: 2px; }
        #abn-overlay-box .abn-step span { font-size: 1.2rem; }
        #abn-overlay-box .abn-ov-btns {
            display: flex;
            flex-direction: column;
            gap: 0.75rem;
        }
        #abn-overlay-box .abn-ov-primary {
            width: 100%;
            padding: 0.85rem;
            background: linear-gradient(135deg, #2563eb, #1d4ed8);
            color: #fff;
            border: none;
            border-radius: 12px;
            font-size: 0.95rem;
            font-weight: 700;
            cursor: pointer;
            transition: filter 0.2s;
        }
        #abn-overlay-box .abn-ov-primary:hover { filter: brightness(1.1); }
        #abn-overlay-box .abn-countdown-wrap {
            font-size: 0.82rem;
            color: #475569;
        }
        #abn-overlay-box .abn-countdown-wrap a {
            color: #60a5fa;
            cursor: pointer;
            text-decoration: underline;
        }
        .abn-timer-ring {
            display: inline-block;
            width: 36px;
            height: 36px;
            border: 3px solid #1e3a5f;
            border-top-color: #60a5fa;
            border-radius: 50%;
            animation: abn-spin 1s linear infinite;
            vertical-align: middle;
            margin-right: 6px;
        }
        @keyframes abn-spin { to { transform: rotate(360deg); } }

        @media (max-width: 480px) {
            #abn-notice { bottom:16px; right:16px; left:16px; max-width:none; }
            #abn-overlay-box { padding: 2rem 1.25rem; }
            #abn-overlay-box .abn-steps { flex-direction: column; gap: 0.5rem; }
        }
    `;
    document.head.appendChild(style);

    // ── Helpers ──
    function getUsage() { return parseInt(sessionStorage.getItem(USAGE_KEY) || '0'); }
    function incUsage() { sessionStorage.setItem(USAGE_KEY, getUsage() + 1); }
    function isWhitelisted() { return localStorage.getItem(WHITELIST_KEY) === '1'; }
    function setWhitelisted() { localStorage.setItem(WHITELIST_KEY, '1'); }

    // ── Remove corner notice ──
    function removeNotice() {
        const n = document.getElementById('abn-notice');
        if (n) { n.style.opacity = '0'; n.style.transition = 'opacity 0.3s'; setTimeout(() => n.remove(), 300); }
    }

    // ── Show corner notice (1st visit) ──
    function showCornerNotice() {
        if (sessionStorage.getItem(DISMISSED_KEY)) return;
        if (document.getElementById('abn-notice')) return;

        const el = document.createElement('div');
        el.id = 'abn-notice';
        el.innerHTML = `
            <div class="abn-title">🙏 Support PDFSuite</div>
            <p>Looks like you're using an ad blocker.<br>All tools are <strong style="color:#f1f5f9">100% free</strong> — ads keep us running!</p>
            <div class="abn-btns">
                <button class="abn-btn-primary" onclick="window.open('https://www.wikihow.com/Disable-AdBlock#Disabling-AdBlock-on-a-Single-Page','_blank')">How to Whitelist ↗</button>
                <button class="abn-btn-close" id="abn-close">Later</button>
            </div>
        `;
        document.body.appendChild(el);
        document.getElementById('abn-close').onclick = () => {
            sessionStorage.setItem(DISMISSED_KEY, '1');
            removeNotice();
        };
    }

    // ── Show full-screen gate (2+ uses) ──
    function showGateOverlay() {
        if (document.getElementById('abn-overlay')) return;

        const overlay = document.createElement('div');
        overlay.id = 'abn-overlay';
        overlay.innerHTML = `
            <div id="abn-overlay-box">
                <div class="abn-emoji">📢</div>
                <h2>You've used <span>2 free tools</span> today!</h2>
                <p>We noticed your ad blocker is still active. Ads are our only income — they help keep all tools <strong>free forever</strong> for everyone.<br><br>Please whitelist <strong>pdfsuite.com</strong> to continue without waiting.</p>
                <div class="abn-steps">
                    <div class="abn-step"><span>🛡️</span><strong>AdBlock?</strong>Click the AdBlock icon → "Don't run on this page"</div>
                    <div class="abn-step"><span>🦁</span><strong>Brave?</strong>Click Shields icon → Toggle off for this site</div>
                </div>
                <div class="abn-ov-btns">
                    <button class="abn-ov-primary" id="abn-ov-whitelisted">✅ I've Whitelisted — Continue</button>
                    <div class="abn-countdown-wrap" id="abn-cd-wrap">
                        <span class="abn-timer-ring"></span> Or wait <strong id="abn-cd">30</strong>s to continue without whitelisting
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        // Countdown timer
        let t = GATE_WAIT;
        const cdEl = document.getElementById('abn-cd');
        const interval = setInterval(() => {
            t--;
            if (cdEl) cdEl.textContent = t;
            if (t <= 0) {
                clearInterval(interval);
                closeOverlay();
            }
        }, 1000);

        // "I've whitelisted" button
        document.getElementById('abn-ov-whitelisted').onclick = () => {
            setWhitelisted();
            clearInterval(interval);
            closeOverlay();
        };

        function closeOverlay() {
            overlay.style.opacity = '0';
            overlay.style.transition = 'opacity 0.4s';
            setTimeout(() => overlay.remove(), 400);
            removeNotice();
        }
    }

    // ── Core: detect adblock then decide what to show ──
    async function detectAndAct() {
        if (isWhitelisted()) return; // Never bother whitelisted users

        // Create a decoy ad element to test blocking
        const bait = document.createElement('div');
        bait.className = 'adsbygoogle ad ads adsbox doubleclick ad-placement';
        bait.style.cssText = 'position:absolute;top:-9999px;left:-9999px;width:1px;height:1px;';
        document.body.appendChild(bait);

        await new Promise(r => setTimeout(r, 500));

        const blocked = bait.offsetHeight === 0 ||
            bait.offsetParent === null ||
            window.getComputedStyle(bait).display === 'none' ||
            window.getComputedStyle(bait).visibility === 'hidden';

        document.body.removeChild(bait);

        if (!blocked) return; // Ads are showing — all good!

        // User has adblock — check usage
        if (isToolPage) incUsage();
        const uses = getUsage();

        if (uses >= 2 && isToolPage) {
            // 2nd+ tool use — show countdown gate
            showGateOverlay();
        } else {
            // 1st use — just polite corner notice
            showCornerNotice();
        }
    }

    // Run after page is loaded
    window.addEventListener('load', () => setTimeout(detectAndAct, 1500));

})();
