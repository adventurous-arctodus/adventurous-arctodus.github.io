// ─── HYNAFOL SCRIPTS TRAINER — Core ─────────────────────────────────────────

const App = {
  authenticated: false,
  scripts: [],
  wordlist: [],
  currentScript: null,
  currentFont: null,
  currentFontChars: new Set(),   // Set of characters supported by the current font
  currentScreen: 'reading',
  fontCache: {},
  configHash: '',

  async checkPassword(password) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(password));
    return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
  },

  async loadConfig() {
    try {
      const [sr, wr] = await Promise.all([
        fetch('data/scripts.json'),
        fetch('data/wordlist.json')
      ]);
      const sd = await sr.json();
      const wd = await wr.json();
      this.configHash = sd.passwordHash;
      this.scripts = sd.scripts;
      this.wordlist = wd.words;
      return true;
    } catch (e) {
      console.error('Config load failed:', e);
      return false;
    }
  },

  getWords(maxCommonality = 10, types = ['word']) {
    return this.wordlist.filter(w =>
      w.commonality <= maxCommonality && types.includes(w.type)
    );
  },

  async loadFont(script) {
    if (!script?.fontFile) return null;
    if (this.fontCache[script.id]) return this.fontCache[script.id];
    const name = `ScriptFont_${script.id}`;
    try {
      const font = new FontFace(name, `url('fonts/${script.fontFile}')`);
      await font.load();
      document.fonts.add(font);
      this.fontCache[script.id] = name;
      return name;
    } catch (e) {
      console.warn(`Font load failed for ${script.name}:`, e);
      return null;
    }
  },

  // Returns true if the current font supports this character
  fontHasChar(ch) {
    if (!this.currentFontChars.size) return true; // no restriction configured
    return this.currentFontChars.has(ch);
  },

  // Filter a string to only include characters supported by the current font.
  // Returns the filtered string and a boolean indicating whether anything was removed.
  filterText(text) {
    if (!this.currentFontChars.size) return { text, filtered: false };
    let filtered = false;
    const out = [...text].map(ch => {
      if (ch === ' ' || this.currentFontChars.has(ch)) return ch;
      filtered = true;
      return null;
    }).filter(ch => ch !== null).join('');
    return { text: out, filtered };
  }
};

// ─── CHARACTER SETS ──────────────────────────────────────────────────────────
const CharSets = {
  // Letters ordered by English frequency, split into 5 levels
  lowercase:   { 1:['e','t','a','o','i'], 2:['n','s','h','r','d'], 3:['l','c','u','m','w'], 4:['f','g','y','p','b'], 5:['v','k','j','x','q','z'] },
  uppercase:   { 1:['E','T','A','O','I'], 2:['N','S','H','R','D'], 3:['L','C','U','M','W'], 4:['F','G','Y','P','B'], 5:['V','K','J','X','Q','Z'] },
  numbers:     { 1:['1','2','3'], 2:['4','5','6'], 3:['7','8','9'], 4:['0'], 5:[] },
  punctuation: { 1:['.',','], 2:['!','?',"'"], 3:['-',':'], 4:[';','"'], 5:['(',')','+'] },

  keyboardRows: [
    ['q','w','e','r','t','y','u','i','o','p'],
    ['a','s','d','f','g','h','j','k','l'],
    ['z','x','c','v','b','n','m'],
    [' ']
  ],

  getPool(level, upper, lower, nums, punct) {
    const pool = [];
    for (let l = 1; l <= level; l++) {
      if (lower) pool.push(...(this.lowercase[l]   || []));
      if (upper) pool.push(...(this.uppercase[l]   || []));
      if (nums)  pool.push(...(this.numbers[l]     || []));
      if (punct) pool.push(...(this.punctuation[l] || []));
    }
    return pool;
  },

  // Descriptions for tooltips
  difficultyInfo: [
    'Level 1: Most common letters — E, T, A, O, I (and their uppercase equivalents)',
    'Level 2: Adds N, S, H, R, D — covers ~75% of written English',
    'Level 3: Adds L, C, U, M, W — covers ~90% of written English',
    'Level 4: Adds F, G, Y, P, B — nearly the full alphabet',
    'Level 5: All remaining letters (V, K, J, X, Q, Z), numbers, and punctuation'
  ],

  maxLengthInfo: 'Single word: one word only. Short: up to ~7 characters. Medium: phrases up to ~12 characters. Long: full sentences and longer phrases.',

  maxCommonalityInfo: 'Controls how rare the words can be. 1–2 are core words (the, and, is…). Higher values unlock less common vocabulary, up to rare medieval terms at level 10.'
};

// ─── UTILS ───────────────────────────────────────────────────────────────────
function randomFrom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function el(id) { return document.getElementById(id); }
function qs(sel, ctx = document) { return ctx.querySelector(sel); }
function qsa(sel, ctx = document) { return [...ctx.querySelectorAll(sel)]; }
function applyFont(element, fontName) {
  element.style.fontFamily = fontName ? `"${fontName}", serif` : '';
}
function escapeHtml(s) {
  if (!s) return '';
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function normalize(s) { return s.toLowerCase().replace(/\s+/g,' ').trim(); }

function infoIcon(text) {
  return `<span class="info-icon" tabindex="0"
    data-bs-toggle="tooltip" data-bs-placement="top"
    title="${escapeHtml(text)}">ℹ</span>`;
}
