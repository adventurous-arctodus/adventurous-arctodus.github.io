// ─── HYNAFOL SCRIPTS TRAINER — App Controller ────────────────────────────────

const Screens = {
  'reading': Reading,
  'writing': Writing,
};

// ─── BOOT ─────────────────────────────────────────────────────────────────────
async function boot() {
  const ok = await App.loadConfig();
  if (!ok) {
    document.body.innerHTML = `<div class="container py-5 text-center">
      <p class="text-danger">Failed to load configuration. Ensure data/scripts.json and data/wordlist.json exist.</p>
    </div>`;
    return;
  }
  const saved = sessionStorage.getItem('hst-auth');
  if (saved === App.configHash) {
    App.authenticated = true;
    showMainApp();
  } else {
    showLogin();
  }
}

// ─── LOGIN ────────────────────────────────────────────────────────────────────
function showLogin() {
  el('login-screen').classList.remove('d-none');
  el('main-app').classList.add('d-none');
  setTimeout(() => el('login-pw')?.focus(), 100);
}

function showMainApp() {
  el('login-screen').classList.add('d-none');
  el('main-app').classList.remove('d-none');
  buildScriptSelector();
  buildNav();
  navigateTo('reading');
}

async function attemptLogin() {
  const pw = el('login-pw')?.value || '';
  if (!pw) return;
  const hash = await App.checkPassword(pw);
  if (hash === App.configHash) {
    App.authenticated = true;
    sessionStorage.setItem('hst-auth', hash);
    showMainApp();
  } else {
    el('login-error')?.classList.remove('d-none');
    el('login-pw').value = '';
    el('login-pw').focus();
  }
}

// ─── SCRIPT SELECTOR ─────────────────────────────────────────────────────────
function buildScriptSelector() {
  const sel = el('script-select');
  if (!sel) return;
  sel.innerHTML = `<option value="">— Select —</option>` +
    App.scripts.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
  sel.onchange = () => selectScript(sel.value);
}

async function selectScript(id) {
  if (!id) {
    App.currentScript = null;
    App.currentFont = null;
    App.currentFontChars = new Set();
    App.currentSymbolMap = new Map();
    setFontStatus('');
    refreshCurrentScreen();
    return;
  }
  const script = App.scripts.find(s => s.id === id);
  if (!script) return;

  App.currentScript = script;
  setFontStatus('Loading…', 'text-secondary');

  // Load fontChars set
  App.currentFontChars = script.fontChars ? new Set([...script.fontChars]) : new Set();

  // Build symbol equivalence map
  App.currentSymbolMap = App.buildSymbolMap(script);

  const fontName = await App.loadFont(script);
  App.currentFont = fontName;

  if (fontName) {
    setFontStatus('Script Loaded', 'text-success');
  } else {
    setFontStatus('Font file not found', 'text-warning');
  }

  refreshCurrentScreen();
}

function setFontStatus(text, cls = 'text-secondary') {
  const s = el('font-status');
  if (!s) return;
  s.textContent = text;
  s.className = `small text-nowrap ${cls}`;
}

// ─── NAV ──────────────────────────────────────────────────────────────────────
function buildNav() {
  const nav = el('main-nav');
  if (!nav) return;
  nav.innerHTML = [
    { id: 'reading', label: 'Reading' },
    { id: 'writing', label: 'Writing' },
  ].map(s =>
    `<button id="nav-${s.id}" class="btn btn-sm btn-outline-secondary"
      onclick="navigateTo('${s.id}')">${s.label}</button>`
  ).join('');
}

function navigateTo(screenId) {
  App.currentScreen = screenId;
  qsa('#main-nav button').forEach(b =>
    b.classList.toggle('active', b.id === `nav-${screenId}`)
  );
  const container = el('screen-container');
  if (!container) return;

  if (!App.currentScript) {
    container.innerHTML = `<p class="text-secondary">Select a script above to begin.</p>`;
    return;
  }

  const screen = Screens[screenId];
  if (!screen) return;
  container.innerHTML = screen.render();
  screen.init();
}

function refreshCurrentScreen() {
  if (App.currentScreen) navigateTo(App.currentScreen);
}

// ─── EVENTS ───────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  boot();
  el('login-btn')?.addEventListener('click', attemptLogin);
  el('login-pw')?.addEventListener('keydown', e => { if (e.key === 'Enter') attemptLogin(); });
});
