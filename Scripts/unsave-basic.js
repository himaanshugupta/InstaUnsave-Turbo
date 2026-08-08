(async () => {
    const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

    // Faster polling (40ms instead of 100ms) — same max timeout, so no reliability lost, just less wasted wait time
    const waitFor = async (selector, timeout = 5000, step = 40) => {
        const start = Date.now();
        while (Date.now() - start < timeout) {
            const el = document.querySelector(selector);
            if (el) return el;
            await sleep(step);
        }
        return null;
    };

    const closeViewer = async () => {
        const close = document.querySelector('svg[aria-label="Close"]');
        if (close) {
            close.closest('[role="button"]')?.click();
            // poll for it to actually vanish instead of a flat 800ms
            await waitFor('svg[aria-label="Save"], svg[aria-label="Remove"]', 0, 0).catch(() => { });
            const gone = await (async () => {
                const start = Date.now();
                while (Date.now() - start < 800) {
                    if (!document.querySelector('svg[aria-label="Close"]')) return true;
                    await sleep(40);
                }
                return false;
            })();
            return true;
        }
        return false;
    };

    const getUrls = () => [
        ...new Set(
            [...document.querySelectorAll('a[href*="/p/"], a[href*="/reel/"]')]
                .map(a => a.href)
                .filter(Boolean)
        )
    ];

    // Persistent across the whole run — no url gets retried forever
    const processed = new Set();  // successfully unsaved or confirmed already-unsaved
    const failCount = new Map();  // url -> number of failed attempts
    const MAX_RETRIES = 2;

    let total = 0;
    let failed = 0;
    let emptyRounds = 0;
    console.log("🚀 Reliable Instagram unsave started");

    while (emptyRounds < 5) {
        const urls = getUrls().filter(u => !processed.has(u));
        console.log(`📦 ${urls.length} unprocessed posts visible`);

        if (!urls.length) {
            window.scrollBy(0, window.innerHeight * 0.8);
            await sleep(1200);
            emptyRounds++;
            continue;
        }

        let processedThisRound = 0;

        for (const url of urls) {
            if (processed.has(url)) continue;

            // permanently give up on a post after MAX_RETRIES failures
            if ((failCount.get(url) || 0) >= MAX_RETRIES) {
                processed.add(url); // stop retrying, but don't count as success
                continue;
            }

            if (document.querySelector('svg[aria-label="Close"]')) {
                await closeViewer();
            }

            const link = [...document.querySelectorAll('a[href*="/p/"], a[href*="/reel/"]')]
                .find(a => a.href === url);
            if (!link) {
                console.log("⏭️ Link disappeared:", url);
                continue;
            }

            link.scrollIntoView({ behavior: "instant", block: "center" });
            await sleep(250); // was 500 — scrollIntoView is instant, this just lets layout settle

            console.log("➡️ Opening:", url);
            link.click();

            const closeIcon = await waitFor('svg[aria-label="Close"]', 5000);
            if (!closeIcon) {
                console.log("❌ Viewer didn't open:", url);
                failed++;
                failCount.set(url, (failCount.get(url) || 0) + 1);
                continue;
            }

            const remove = await waitFor('svg[aria-label="Remove"]', 5000);
            if (!remove) {
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

            const save = await waitFor('svg[aria-label="Save"]', 5000);
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
            await sleep(400); // was 700 — grid update is fast, confirmed by `save` already
        }

        window.scrollBy(0, Math.max(window.innerHeight * 0.8, 600));
        await sleep(1200);

        console.log(`📊 Progress: ${total} unsaved | ${failed} failed | ${processed.size} processed total`);

        emptyRounds = processedThisRound === 0 ? emptyRounds + 1 : 0;
    }

    console.log(`🎉 FINISHED — ${total} unsaved, ${failed} failed`);
})();