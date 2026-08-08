(async () => {
    // --- CONFIGURATION ---
    const CONFIG = {
        pollStep: 15,        // Faster polling (15ms vs 30ms)
        viewerTimeout: 2500, // Reduced timeout for slow loads
        settleTime: 80,      // Minimal settle time after click/scroll
        scrollPause: 600,    // Time to wait for new content to render
        maxRetries: 1,       // Fail fast; don't waste time on stubborn posts
        emptyRoundLimit: 3   // Stop sooner if no new content found
    };

    // --- UTILITIES ---
    const sleep = ms => new Promise(r => setTimeout(r, ms));

    // High-performance waiter using requestAnimationFrame fallback + timeout
    const waitFor = async (selector, timeout = CONFIG.viewerTimeout) => {
        const start = performance.now();
        while (performance.now() - start < timeout) {
            const el = document.querySelector(selector);
            if (el) return el;
            await new Promise(r => requestAnimationFrame(r)); // Sync with paint cycle
        }
        return null;
    };

    const getVisibleUrls = () => [
        ...new Set(
            [...document.querySelectorAll('a[href*="/p/"], a[href*="/reel/"]')]
                .map(a => a.href.split('?')[0]) // Normalize URLs to avoid dupes with params
                .filter(Boolean)
        )
    ];

    // Optimized close: clicks and immediately yields without extra sleep(0) overhead
    const closeViewer = async () => {
        const btn = document.querySelector('svg[aria-label="Close"]')?.closest('[role="button"]');
        if (!btn) return true;

        btn.click();
        // Wait for removal using rAF-synced polling
        const start = performance.now();
        while (performance.now() - start < 800) {
            if (!document.querySelector('svg[aria-label="Close"]')) return true;
            await new Promise(r => requestAnimationFrame(r));
        }
        return false;
    };

    // --- STATE ---
    const processed = new Set();
    const failedAttempts = new Map();
    let stats = { unsaved: 0, failed: 0, skipped: 0 };
    let emptyRounds = 0;

    console.log("⚡ LIGHTNING UNSAVE STARTED");

    // --- MAIN LOOP ---
    while (emptyRounds < CONFIG.emptyRoundLimit) {
        const urls = getVisibleUrls().filter(u => !processed.has(u));

        if (!urls.length) {
            window.scrollBy({ top: window.innerHeight * 0.9, behavior: 'instant' });
            await sleep(CONFIG.scrollPause);
            emptyRounds++;
            continue;
        }

        let roundSuccess = 0;

        for (const url of urls) {
            if (processed.has(url)) continue;
            if ((failedAttempts.get(url) || 0) >= CONFIG.maxRetries) {
                processed.add(url);
                stats.skipped++;
                continue;
            }

            // Pre-flight check: ensure viewer isn't stuck open from previous failure
            if (document.querySelector('svg[aria-label="Close"]')) await closeViewer();

            // Find element in current DOM snapshot
            const link = [...document.querySelectorAll(`a[href*="${url.split('/').slice(-2).join('/')}"`)]
                .find(a => a.href.startsWith(url));

            if (!link) {
                processed.add(url); // Element scrolled out of DOM
                continue;
            }

            // Instant scroll + minimal settle
            link.scrollIntoView({ block: 'center', behavior: 'instant' });
            await sleep(CONFIG.settleTime);

            // Open viewer
            link.click();
            const closeIcon = await waitFor('svg[aria-label="Close"]');

            if (!closeIcon) {
                failedAttempts.set(url, (failedAttempts.get(url) || 0) + 1);
                stats.failed++;
                continue;
            }

            // Check for Remove button OR already-saved state simultaneously
            const actionBtn = await waitFor('svg[aria-label="Remove"], svg[aria-label="Save"]');

            if (!actionBtn) {
                failedAttempts.set(url, (failedAttempts.get(url) || 0) + 1);
                stats.failed++;
                await closeViewer();
                continue;
            }

            const isAlreadyUnsaved = actionBtn.getAttribute('aria-label') === 'Save';

            if (isAlreadyUnsaved) {
                processed.add(url);
                stats.skipped++;
                await closeViewer();
                continue;
            }

            // Execute unsave
            actionBtn.closest('[role="button"]')?.click();

            // Confirm unsave by waiting for Save icon to appear (proves Remove was clicked)
            const confirmed = await waitFor('svg[aria-label="Save"]', 1500);

            if (confirmed) {
                stats.unsaved++;
                roundSuccess++;
                console.log(`✅ #${stats.unsaved} | ${url.split('/').pop()}`);
            } else {
                stats.failed++;
                failedAttempts.set(url, (failedAttempts.get(url) || 0) + 1);
            }

            processed.add(url);
            await closeViewer();
            // Ultra-short pause between actions to prevent rate limiting
            await sleep(CONFIG.settleTime);
        }

        // Scroll for next batch
        window.scrollBy({ top: Math.max(window.innerHeight * 0.9, 700), behavior: 'instant' });
        await sleep(CONFIG.scrollPause);

        emptyRounds = roundSuccess === 0 ? emptyRounds + 1 : 0;
        console.log(`📊 Unsaved: ${stats.unsaved} | Failed: ${stats.failed} | Skipped: ${stats.skipped}`);
    }

    console.log(`🏁 COMPLETE: ${stats.unsaved} unsaved, ${stats.failed} failed, ${stats.skipped} skipped`);
})();