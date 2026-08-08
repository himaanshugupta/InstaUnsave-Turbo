(async () => {
    const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

    // Fast polling – 30ms instead of 40ms for a tiny extra speed boost.
    const waitFor = async (selector, timeout = 5000, step = 30) => {
        const start = Date.now();
        while (Date.now() - start < timeout) {
            const el = document.querySelector(selector);
            if (el) return el;
            await sleep(step);
        }
        return null;
    };

    // Close any open viewer and wait until it's really gone.
    const closeViewer = async () => {
        const close = document.querySelector('svg[aria-label="Close"]');
        if (!close) return false;
        close.closest('[role="button"]')?.click();

        // Yield to the browser, then actively wait for the close icon to vanish.
        await sleep(0);
        const gone = await (async () => {
            const start = Date.now();
            while (Date.now() - start < 800) {
                if (!document.querySelector('svg[aria-label="Close"]')) return true;
                await sleep(30);
            }
            return false;
        })();
        return gone;
    };

    // Collect all visible post/reel links.
    const getUrls = () => [
        ...new Set(
            [...document.querySelectorAll('a[href*="/p/"], a[href*="/reel/"]')]
                .map(a => a.href)
                .filter(Boolean)
        )
    ];

    // Persistent tracking so no URL is retried endlessly.
    const processed = new Set();        // successfully unsaved or already unsaved
    const failCount = new Map();       // url -> number of failed attempts
    const MAX_RETRIES = 2;

    let total = 0;
    let failed = 0;
    let emptyRounds = 0;
    console.log("🚀 Lightning-fast Instagram unsave started");

    while (emptyRounds < 5) {
        const urls = getUrls().filter(u => !processed.has(u));
        console.log(`📦 ${urls.length} unprocessed posts visible`);

        if (!urls.length) {
            window.scrollBy(0, window.innerHeight * 0.8);
            await sleep(1000);
            emptyRounds++;
            continue;
        }

        let processedThisRound = 0;

        for (const url of urls) {
            if (processed.has(url)) continue;

            // Stop retrying after MAX_RETRIES failures.
            if ((failCount.get(url) || 0) >= MAX_RETRIES) {
                processed.add(url);
                continue;
            }

            // Make sure no viewer is still open.
            if (document.querySelector('svg[aria-label="Close"]')) {
                await closeViewer();
            }

            // Locate the link element in the current DOM.
            const link = [...document.querySelectorAll('a[href*="/p/"], a[href*="/reel/"]')]
                .find(a => a.href === url);
            if (!link) {
                console.log("⏭️ Link disappeared:", url);
                continue;
            }

            link.scrollIntoView({ behavior: "instant", block: "center" });
            // Reduced settle time – modern browsers only need ~100ms.
            await sleep(150);

            console.log("➡️ Opening:", url);
            link.click();

            const closeIcon = await waitFor('svg[aria-label="Close"]', 4000);
            if (!closeIcon) {
                console.log("❌ Viewer didn't open:", url);
                failed++;
                failCount.set(url, (failCount.get(url) || 0) + 1);
                continue;
            }

            const remove = await waitFor('svg[aria-label="Remove"]', 4000);
            if (!remove) {
                // Check if already unsaved.
                const save = document.querySelector('svg[aria-label="Save"]');
                if (save) {
                    console.log("⏭️ Already unsaved:", url);
                    processed.add(url);
                } else {
                    console.log("⚠️ Remove button not found:", url);
                    failed++;
                    failCount.set(url, (failCount.get(url) || 0) + 1);
                }
                await closeViewer();
                continue;
            }

            const button = remove.closest('[role="button"]');
            if (!button) {
                console.log("❌ Remove clickable element not found:", url);
                failed++;
                failCount.set(url, (failCount.get(url) || 0) + 1);
                await closeViewer();
                continue;
            }

            button.click();

            const save = await waitFor('svg[aria-label="Save"]', 4000);
            if (!save) {
                console.log("⚠️ Unsave not confirmed:", url);
                failed++;
                failCount.set(url, (failCount.get(url) || 0) + 1);
                await closeViewer();
                continue;
            }

            total++;
            processedThisRound++;
            processed.add(url);
            console.log(`✅ UNSAVED #${total}`);

            await closeViewer();
            // Reduced post‑unsave wait – enough for the grid to update.
            await sleep(250);
        }

        // Scroll down to load more content.
        window.scrollBy(0, Math.max(window.innerHeight * 0.8, 600));
        await sleep(1000);

        console.log(`📊 Progress: ${total} unsaved | ${failed} failed | ${processed.size} processed total`);

        emptyRounds = processedThisRound === 0 ? emptyRounds + 1 : 0;
    }

    console.log(`🎉 FINISHED — ${total} unsaved, ${failed} failed`);
})();