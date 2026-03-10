/**
 * PDFSuite - Code Protection
 * Copyright (c) 2025 Eebii / PDFSuite. All Rights Reserved.
 * Unauthorized copying, modification, or distribution is strictly prohibited.
 * Contact: support@eebii.com
 */

(function () {
    'use strict';

    // ── 1. Disable right-click context menu ──
    document.addEventListener('contextmenu', function (e) {
        e.preventDefault();
        return false;
    });

    // ── 2. Disable keyboard shortcuts ──
    document.addEventListener('keydown', function (e) {
        const key = e.key || e.keyCode;

        // F12 — DevTools
        if (e.keyCode === 123) { e.preventDefault(); return false; }

        // Ctrl+U — View Source
        if (e.ctrlKey && (e.keyCode === 85 || key === 'u' || key === 'U')) { e.preventDefault(); return false; }

        // Ctrl+Shift+I — Inspect Element
        if (e.ctrlKey && e.shiftKey && (e.keyCode === 73 || key === 'i' || key === 'I')) { e.preventDefault(); return false; }

        // Ctrl+Shift+J — Console
        if (e.ctrlKey && e.shiftKey && (e.keyCode === 74 || key === 'j' || key === 'J')) { e.preventDefault(); return false; }

        // Ctrl+Shift+C — Inspect mode
        if (e.ctrlKey && e.shiftKey && (e.keyCode === 67 || key === 'c' || key === 'C')) { e.preventDefault(); return false; }

        // Ctrl+S — Save page
        if (e.ctrlKey && (e.keyCode === 83 || key === 's' || key === 'S')) { e.preventDefault(); return false; }

        // Ctrl+A — Select All (prevent mass copying)
        // Note: Disabled only on body, not in inputs/textareas
        if (e.ctrlKey && (e.keyCode === 65 || key === 'a' || key === 'A')) {
            if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA' && !e.target.isContentEditable) {
                e.preventDefault();
                return false;
            }
        }
    });

    // ── 3. Disable drag-select on page body ──
    document.addEventListener('selectstart', function (e) {
        if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA' && !e.target.isContentEditable) {
            e.preventDefault();
        }
    });

    // ── 4. Detect DevTools open (size-based heuristic) ──
    let devtoolsOpen = false;
    const threshold = 160;

    function checkDevTools() {
        const widthDiff = window.outerWidth - window.innerWidth;
        const heightDiff = window.outerHeight - window.innerHeight;
        if (!devtoolsOpen && (widthDiff > threshold || heightDiff > threshold)) {
            devtoolsOpen = true;
            // Don't break the site, just log a warning
            console.clear();
            console.warn('%c⛔ STOP!', 'font-size: 48px; color: red; font-weight: bold;');
            console.warn('%cThis is a browser feature intended for developers. Unauthorized access to this site\'s code is strictly prohibited.\n\nCopyright © 2025 PDFSuite / Eebii. All Rights Reserved.\nContact: support@eebii.com', 'font-size: 14px; color: #ef4444;');
        } else if (devtoolsOpen && widthDiff <= threshold && heightDiff <= threshold) {
            devtoolsOpen = false;
        }
    }

    setInterval(checkDevTools, 1000);

    // ── 5. Console warning on open ──
    console.clear();
    console.log('%c© PDFSuite / Eebii — All Rights Reserved', 'font-weight: bold; font-size: 16px; color: #60a5fa;');
    console.log('%cThis code is proprietary. Unauthorized copying is strictly prohibited. Contact: support@eebii.com', 'color: #ef4444;');

})();
