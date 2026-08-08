// Unified Instagram Unsave-Turbo Engine Content Script

let state = {
    isRunning: false,
    activeMode: null,
    stats: { unsaved: 0, failed: 0, skipped: 0 },
    logs: [],
    stopFlag: false
};

const getStatus = () => ({
    isRunning: state.isRunning,
    activeMode: state.activeMode,
    stats: { ...state.stats },
    logs: [...state.logs]
});

const addLog = (message) => {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const formattedLog = `[${time}] ${message}`;
    state.logs.push(formattedLog);
    if (state.logs.length > 5) {
        state.logs.shift();
    }
    console.log(formattedLog);
    // Broadcast status update to extension popup (catch if popup is not active)
    chrome.runtime.sendMessage({ action: 'STATUS_UPDATE', state: getStatus() }).catch(() => {});
};

// Listen for messages from the popup UI
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'GET_STATUS') {
        sendResponse(getStatus());
    } else if (message.action === 'START_UNSAVE') {
        if (!state.isRunning) {
            startUnsaving(message.mode);
        }
        sendResponse({ success: true });
    } else if (message.action === 'STOP_UNSAVE') {
        if (state.isRunning) {
            state.stopFlag = true;
            addLog("🛑 Stop requested. Ending next cycle...");
        }
        sendResponse({ success: true });
    }
    return true; // Keep message channel open for async response
});

// Sleep utility with cancellation support
const sleep = (ms) => {
    return new Promise((resolve) => {
        const timeout = setTimeout(resolve, ms);
        // We check periodically if stopFlag is set to resolve earlier if stopped
        const checkInterval = setInterval(() => {
            if (state.stopFlag) {
                clearTimeout(timeout);
                clearInterval(checkInterval);
                resolve();
            }
        }, 15);
    });
};

// Polling waiter
const waitFor = async (selector, timeout, step, useRAF = false) => {
    const start = performance.now();
    while (performance.now() - start < timeout) {
        if (state.stopFlag) return null;
        const el = document.querySelector(selector);
        if (el) return el;
        
        if (useRAF) {
            await new Promise(r => requestAnimationFrame(r));
        } else {
            await sleep(step);
        }
    }
    return null;
};

// Main controller function
const startUnsaving = async (mode) => {
    state.isRunning = true;
    state.activeMode = mode;
    state.stopFlag = false;
    state.stats = { unsaved: 0, failed: 0, skipped: 0 };
    state.logs = [];

    // Define configuration based on mode
    let CONFIG = {
        limit: 100,
        pollStep: 40,
        viewerTimeout: 5000,
        settleTime: 250,
        postUnsaveDelay: 400,
        maxRetries: 2,
        scrollPause: 1200,
        emptyRoundLimit: 5,
        useRAF: false
    };

    if (mode === 'Fast') {
        CONFIG = {
            limit: 200,
            pollStep: 30,
            viewerTimeout: 4000,
            settleTime: 150,
            postUnsaveDelay: 250,
            maxRetries: 2,
            scrollPause: 1000,
            emptyRoundLimit: 5,
            useRAF: false
        };
    } else if (mode === 'Flash') {
        CONFIG = {
            limit: Infinity,
            pollStep: 15,
            viewerTimeout: 2500,
            settleTime: 80,
            postUnsaveDelay: 80,
            maxRetries: 1,
            scrollPause: 600,
            emptyRoundLimit: 3,
            useRAF: true
        };
    }

    addLog(`🚀 Started in ${mode} Mode (Limit: ${CONFIG.limit === Infinity ? 'Unlimited' : CONFIG.limit})`);

    const closeViewer = async () => {
        const btn = document.querySelector('svg[aria-label="Close"]')?.closest('[role="button"]');
        if (!btn) return true;
        btn.click();
        const start = performance.now();
        while (performance.now() - start < 800) {
            if (!document.querySelector('svg[aria-label="Close"]')) return true;
            if (CONFIG.useRAF) {
                await new Promise(r => requestAnimationFrame(r));
            } else {
                await sleep(CONFIG.pollStep);
            }
        }
        return false;
    };

    const getVisibleUrls = () => [
        ...new Set(
            [...document.querySelectorAll('a[href*="/p/"], a[href*="/reel/"]')]
                .map(a => a.href.split('?')[0])
                .filter(Boolean)
        )
    ];

    const processed = new Set();
    const failedAttempts = new Map();
    let emptyRounds = 0;

    try {
        while (emptyRounds < CONFIG.emptyRoundLimit) {
            if (state.stopFlag) break;

            if (state.stats.unsaved >= CONFIG.limit) {
                addLog(`🎯 Reached unsave limit of ${CONFIG.limit} posts.`);
                break;
            }

            const urls = getVisibleUrls().filter(u => !processed.has(u));

            if (!urls.length) {
                addLog("🔍 Scrolling to load more posts...");
                window.scrollBy({ top: window.innerHeight * 0.9, behavior: 'instant' });
                await sleep(CONFIG.scrollPause);
                emptyRounds++;
                continue;
            }

            let roundSuccess = 0;

            for (const url of urls) {
                if (state.stopFlag) break;
                if (state.stats.unsaved >= CONFIG.limit) break;

                if (processed.has(url)) continue;

                if ((failedAttempts.get(url) || 0) >= CONFIG.maxRetries) {
                    processed.add(url);
                    state.stats.skipped++;
                    continue;
                }

                // Close active viewer if stuck from previous attempt
                if (document.querySelector('svg[aria-label="Close"]')) {
                    await closeViewer();
                }

                // Locate item in DOM
                const link = [...document.querySelectorAll('a[href*="/p/"], a[href*="/reel/"]')]
                    .find(a => a.href.split('?')[0] === url);

                if (!link) {
                    processed.add(url);
                    continue;
                }

                link.scrollIntoView({ block: 'center', behavior: 'instant' });
                await sleep(CONFIG.settleTime);

                link.click();
                const closeIcon = await waitFor('svg[aria-label="Close"]', CONFIG.viewerTimeout, CONFIG.pollStep, CONFIG.useRAF);

                if (!closeIcon) {
                    addLog(`❌ Failed to open viewer for ${url.split('/').filter(Boolean).pop()}`);
                    failedAttempts.set(url, (failedAttempts.get(url) || 0) + 1);
                    state.stats.failed++;
                    continue;
                }

                const actionBtn = await waitFor('svg[aria-label="Remove"], svg[aria-label="Save"]', CONFIG.viewerTimeout, CONFIG.pollStep, CONFIG.useRAF);

                if (!actionBtn) {
                    addLog(`⚠️ Unsave buttons not found for ${url.split('/').filter(Boolean).pop()}`);
                    failedAttempts.set(url, (failedAttempts.get(url) || 0) + 1);
                    state.stats.failed++;
                    await closeViewer();
                    continue;
                }

                const isAlreadyUnsaved = actionBtn.getAttribute('aria-label') === 'Save';

                if (isAlreadyUnsaved) {
                    addLog(`⏭️ Already unsaved: ${url.split('/').filter(Boolean).pop()}`);
                    processed.add(url);
                    state.stats.skipped++;
                    await closeViewer();
                    continue;
                }

                // Click Remove to unsave
                actionBtn.closest('[role="button"]')?.click();

                // Confirm Action by waiting for Save button
                const confirmed = await waitFor('svg[aria-label="Save"]', 1500, CONFIG.pollStep, CONFIG.useRAF);

                if (confirmed) {
                    state.stats.unsaved++;
                    roundSuccess++;
                    addLog(`✅ Unsaved #${state.stats.unsaved} | ${url.split('/').filter(Boolean).pop()}`);
                } else {
                    addLog(`❌ Confirmation failed for ${url.split('/').filter(Boolean).pop()}`);
                    state.stats.failed++;
                    failedAttempts.set(url, (failedAttempts.get(url) || 0) + 1);
                }

                processed.add(url);
                await closeViewer();
                await sleep(CONFIG.postUnsaveDelay);
            }

            window.scrollBy({ top: Math.max(window.innerHeight * 0.9, 700), behavior: 'instant' });
            await sleep(CONFIG.scrollPause);

            emptyRounds = roundSuccess === 0 ? emptyRounds + 1 : 0;
        }

        if (state.stopFlag) {
            addLog("🛑 Unsaving stopped by user.");
        } else {
            addLog("🏁 Finished processing all visible posts!");
        }
    } catch (err) {
        addLog(`🚨 Unexpected error: ${err.message}`);
    } finally {
        state.isRunning = false;
        state.stopFlag = false;
        chrome.runtime.sendMessage({ action: 'STATUS_UPDATE', state: getStatus() }).catch(() => {});
    }
};
