// InstaUnsave-Turbo — Popup Controller

/* ── DOM refs ─────────────────────────────────────── */
const badge = document.getElementById('badge');
const badgeText = document.getElementById('badgeText');
const alertBox = document.getElementById('alert');
const alertMsg = document.getElementById('alertMsg');
const btn = document.getElementById('btn');
const btnText = document.getElementById('btnText');
const logs = document.getElementById('logs');
const terminal = document.getElementById('terminal');
const statU = document.getElementById('statUnsaved');
const statF = document.getElementById('statFailed');
const statS = document.getElementById('statSkipped');
const radios = document.querySelectorAll('input[name="mode"]');

/* ── Graph References ─────────────────────────────── */
const graphLine = document.getElementById('graphLine');
const graphArea = document.getElementById('graphArea');
const graphVal = document.getElementById('graphVal');
const chartGradStop1 = document.querySelector('#chartGrad stop:nth-child(1)');
const chartGradStop2 = document.querySelector('#chartGrad stop:nth-child(2)');

/* ── SVG Icons ────────────────────────────────────── */
const ICON_PLAY = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="6 3 20 12 6 21 6 3"/></svg>`;
const ICON_STOP = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m19 13 2 2v-4a2 2 0 0 0-2-2h-8"/><path d="M9 3h10a2 2 0 0 1 2 2v7"/><path d="M3 3l18 18"/><path d="M5 5v14a1 1 0 0 0 1.63.78L12 15l4.37 4.78A1 1 0 0 0 18 19V9"/></svg>`;

/* ── State ────────────────────────────────────────── */
let tabId = null;
let running = false;
const MAX_POINTS = 20;
let speedData = new Array(MAX_POINTS).fill(0);
let lastUnsavedCount = 0;
let graphInterval = null;
let animFrameId = null;

/* ── Helpers ──────────────────────────────────────── */
const showAlert = (msg) => {
  if (msg) { alertMsg.textContent = msg; alertBox.classList.remove('hidden'); }
  else { alertBox.classList.add('hidden'); }
};

/* ── Real-Time Animated Graph Logic ──────────────── */
function renderSmoothGraph(mode) {
  if (!running) {
    updateGraph(0, 1);
    return;
  }

  // Define target speeds & jitter per mode
  let baseSpeed = 3.5;
  if (mode === 'Fast') baseSpeed = 6.5;
  if (mode === 'Flash') baseSpeed = 12.0;

  // Add subtle fluctuation so the graph feels actively computing
  const jitter = (Math.random() - 0.48) * (baseSpeed * 0.3);
  const currentSpeed = Math.max(0.5, baseSpeed + jitter);

  // Dynamic max scale so the line sits nicely in the middle
  const maxScale = mode === 'Flash' ? 16 : mode === 'Fast' ? 10 : 6;

  updateGraph(currentSpeed, maxScale);
}

function updateGraph(currentSpeed, maxScale = 5) {
  if (!graphLine || !graphArea) return;

  speedData.push(currentSpeed);
  if (speedData.length > MAX_POINTS) speedData.shift();

  const width = 328;
  const height = 38;
  const step = width / (MAX_POINTS - 1);

  const points = speedData.map((val, idx) => {
    const x = idx * step;
    // Keep line from touching top border (height - 6)
    const y = height - (val / maxScale) * (height - 8);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const lineString = points.join(' ');
  const areaString = `0,${height} ${lineString} ${width},${height}`;

  graphLine.setAttribute('points', lineString);
  graphArea.setAttribute('points', areaString);
  if (graphVal) graphVal.textContent = running ? `${currentSpeed.toFixed(1)} /s` : '0.0 /s';
}

// Sync Graph Colors with current active Mode
function syncGraphTheme(mode) {
  if (!graphLine || !chartGradStop1 || !chartGradStop2) return;

  let color = 'var(--blue)';
  if (mode === 'Fast') color = 'var(--green)';
  if (mode === 'Flash') color = 'var(--orange)';

  graphLine.setAttribute('stroke', color);
  chartGradStop1.setAttribute('stop-color', color);
  chartGradStop2.setAttribute('stop-color', color);
}

const setRunning = (on, mode) => {
  running = on;
  badge.className = 'badge' + (on ? ' on' : '');
  badgeText.textContent = on ? 'Running' : 'Idle';
  btn.className = 'btn ' + (on ? 'stop' : 'run');
  btn.innerHTML = (on ? ICON_STOP + '<span id="btnText">Stop Unsaving</span>'
    : ICON_PLAY + '<span id="btnText">Run Turbo Unsave</span>');
  radios.forEach(r => { r.disabled = on; });

  // 🟢 LED toggle on terminal
  if (terminal) {
    terminal.classList.toggle('running', on);
  }

  // Graph Loop Control
  clearInterval(graphInterval);
  if (on) {
    syncGraphTheme(mode);
    // Smooth update every 350ms for an active wave look
    graphInterval = setInterval(() => renderSmoothGraph(mode), 350);
  } else {
    speedData.fill(0);
    updateGraph(0, 5);
  }
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
  
  if (s.activeMode) {
    radios.forEach(r => {
      r.checked = (r.value === s.activeMode);
    });
    syncGraphTheme(s.activeMode);
  }
  
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

/* ── Init ─────────────────────────────────────────── */
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
    } else {
      showAlert(null);
    }

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

/* ── Message Listener ─────────────────────────────── */
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.action === 'STATUS_UPDATE') syncUI(msg.state);
});

/* ── Mode Selection Theme Switcher ────────────────── */
radios.forEach(r => {
  r.addEventListener('change', () => {
    if (r.checked) syncGraphTheme(r.value);
  });
});

/* ── Button Click Handler ─────────────────────────── */
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
        try { syncUI(await getStatus()); } catch { }
      }, 60);
    });
  }
});

init();