// InstaUnsave-Turbo — Popup Controller

/* ── DOM refs ─────────────────────────────────────── */
const badge     = document.getElementById('badge');
const badgeText = document.getElementById('badgeText');
const alert     = document.getElementById('alert');
const alertMsg  = document.getElementById('alertMsg');
const btn       = document.getElementById('btn');
const btnText   = document.getElementById('btnText');
const logs      = document.getElementById('logs');
const statU     = document.getElementById('statUnsaved');
const statF     = document.getElementById('statFailed');
const statS     = document.getElementById('statSkipped');
const radios    = document.querySelectorAll('input[name="mode"]');

/* ── SVG icons ────────────────────────────────────── */
const ICON_PLAY = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="6 3 20 12 6 21 6 3"/></svg>`;
const ICON_STOP = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m19 13 2 2v-4a2 2 0 0 0-2-2h-8"/><path d="M9 3h10a2 2 0 0 1 2 2v7"/><path d="M3 3l18 18"/><path d="M5 5v14a1 1 0 0 0 1.63.78L12 15l4.37 4.78A1 1 0 0 0 18 19V9"/></svg>`;

/* ── State ────────────────────────────────────────── */
let tabId    = null;
let running  = false;

/* ── Helpers ──────────────────────────────────────── */
const showAlert = (msg) => {
  if (msg) { alertMsg.textContent = msg; alert.classList.remove('hidden'); }
  else      { alert.classList.add('hidden'); }
};

const setRunning = (on, mode) => {
  running = on;
  badge.className = 'badge' + (on ? ' on' : '');
  badgeText.textContent = on ? 'Running' : 'Idle';
  btn.className  = 'btn ' + (on ? 'stop' : 'run');
  btn.innerHTML  = (on ? ICON_STOP + '<span id="btnText">Stop Unsaving</span>'
                       : ICON_PLAY + '<span id="btnText">Run Turbo Unsave</span>');
  radios.forEach(r => { r.disabled = on; });
};

const renderLogs = (arr) => {
  if (!arr || !arr.length) {
    logs.innerHTML = `<div class="log-ph">${running ? 'Initializing…' : 'Waiting for execution to start…'}</div>`;
    return;
  }
  logs.innerHTML = arr.map(l => `<div class="log-row">${l}</div>`).join('');
};

const syncUI = (s) => {
  if (!s) return;
  setRunning(s.isRunning, s.activeMode);
  
  const unsaved = s.stats.unsaved || 0;
  const failed = s.stats.failed || 0;
  const skipped = s.stats.skipped || 0;

  statU.textContent = unsaved;
  statF.textContent = failed;
  statS.textContent = skipped;

  statU.classList.toggle('has-value', unsaved > 0);
  statF.classList.toggle('has-value', failed > 0);
  statS.classList.toggle('has-value', skipped > 0);

  renderLogs(s.logs);
};

const sendMsg = (msg) => new Promise((res, rej) => {
  if (!tabId) return rej(new Error("No active tab"));
  chrome.tabs.sendMessage(tabId, msg, (r) => {
    chrome.runtime.lastError ? rej(chrome.runtime.lastError) : res(r);
  });
});

const getStatus = () => sendMsg({ action: 'GET_STATUS' });

const inject = () => chrome.scripting.executeScript({ target: { tabId }, files: ['content.js'] });

/* ── Init (Called directly as script has defer attribute) ─ */
async function init() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab?.url) {
      showAlert('Open Instagram to use this extension.');
      btn.disabled = true;
      return;
    }

    tabId = tab.id;
    const url = tab.url;

    if (!url.includes('instagram.com')) {
      showAlert('Navigate to Instagram first.');
      btn.disabled = true;
      return;
    }

    if (!url.includes('/saved/')) {
      showAlert('Go to your Instagram Saved Posts page.');
      btn.disabled = true;
      return;
    }

    if (!url.includes('/saved/all-posts')) {
      showAlert("On the Saved page, click 'All Posts' collection to continue.");
      // button stays enabled so they can still see the UI
    } else {
      showAlert(null);
    }

    // Connect to content script, injecting if needed
    try {
      const status = await getStatus();
      syncUI(status);
      btn.disabled = false;
    } catch {
      try {
        await inject();
        const status = await getStatus();
        syncUI(status);
        btn.disabled = false;
      } catch (e) {
        console.error('Injection failed:', e);
        showAlert('Could not load helper script — try refreshing Instagram.');
        btn.disabled = true;
      }
    }
  } catch (e) {
    console.error('Initialization failed:', e);
    showAlert('Failed to detect tab status.');
    btn.disabled = true;
  } finally {
    if (badge.classList.contains('detecting')) {
      badge.className = 'badge';
      badgeText.textContent = 'Idle';
    }
  }
}

/* ── Message listener (live updates from content.js) ─── */
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.action === 'STATUS_UPDATE') syncUI(msg.state);
});

/* ── Button click ─────────────────────────────────── */
btn.addEventListener('click', () => {
  if (!tabId) return;

  if (running) {
    chrome.tabs.sendMessage(tabId, { action: 'STOP_UNSAVE' }, () => void chrome.runtime.lastError);
  } else {
    let mode = 'Basic';
    radios.forEach(r => { if (r.checked) mode = r.value; });
    chrome.tabs.sendMessage(tabId, { action: 'START_UNSAVE', mode }, () => {
      if (chrome.runtime.lastError) return;
      setTimeout(async () => {
        try { syncUI(await getStatus()); } catch {}
      }, 60);
    });
  }
});

// Run initialization
init();
