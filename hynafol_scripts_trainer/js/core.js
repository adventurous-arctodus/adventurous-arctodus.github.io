// ─── HYNAFOL SCRIPTS TRAINER — Core ─────────────────────────────────────────

const App = {
  authenticated: false,
  scripts: [],
  users: [],
  wordlist: [],
  currentUser: null,
  currentScript: null,
  currentFont: null,
  currentFontChars: new Set(),
  currentSymbolMap: new Map(),
  currentScreen: 'reading',
  fontCache: {},
  configHash: '',

  async checkPassword(password) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(password));
    return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
  },

  async loadConfig() {
    try {
      const [sr, wr, ur] = await Promise.all([
        fetch('data/scripts.json'),
        fetch('data/wordlist.json'),
        fetch('data/users.json')
      ]);
      const sd = await sr.json();
      const wd = await wr.json();
      const ud = await ur.json();
      this.scripts = sd.scripts;
      this.wordlist = wd.words;
      this.users = ud.users;
      return true;
    } catch (e) {
      console.error('Config load failed:', e);
      return false;
    }
  },

  getWords(maxCommonality = 10, types = ['word']) {
    const showKeep = this.currentUser?.showKeepContent ?? true;
    return this.wordlist.filter(w =>
      w.commonality <= maxCommonality &&
      types.includes(w.type) &&
      (showKeep || !w.keepContent)
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

  // Build the symbol map from a script's symbolGroups config.
  // Each character maps to its canonical form (first member of its group).
  buildSymbolMap(script) {
    const map = new Map();
    if (!script?.symbolGroups) return map;
    for (const group of script.symbolGroups) {
      if (!group.length) continue;
      const canonical = group[0];
      for (const ch of group) {
        map.set(ch, canonical);
      }
    }
    return map;
  },

  // Returns true if the current font supports this character
  fontHasChar(ch) {
    if (!this.currentFontChars.size) return true;
    return this.currentFontChars.has(ch);
  },

  // Reduce a character to its canonical form per the symbol map.
  // If two characters share a glyph they resolve to the same canonical.
  canonicalize(ch) {
    return this.currentSymbolMap.get(ch) ?? ch;
  },

  // Check whether a typed answer is acceptable for an expected answer,
  // accounting for shared symbols. Works character-by-character for single chars
  // and word-by-word/char-by-char for phrases.
  isAcceptable(typed, expected) {
    if (typed === expected) return true;
    // Canonicalize both sides and compare
    const canon = s => [...s].map(c => this.canonicalize(c)).join('');
    return canon(typed) === canon(expected);
  },

  // Filter a string to only characters supported by the font (spaces always kept).
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
  lowercase:   { 1:['e','t','a','o','i'], 2:['n','s','h','r','d'], 3:['l','c','u','m','w'], 4:['f','g','y','p','b'], 5:['v','k','j','x','q','z'] },
  uppercase:   { 1:['E','T','A','O','I'], 2:['N','S','H','R','D'], 3:['L','C','U','M','W'], 4:['F','G','Y','P','B'], 5:['V','K','J','X','Q','Z'] },
  numbers:     { 1:['1','2','3'], 2:['4','5','6'], 3:['7','8','9'], 4:['0'], 5:[] },
  punctuation: { 1:['.',','], 2:['!','?',"'"], 3:['-',':'], 4:[';','"'], 5:['(',')','+'] },

  keyboardRows: [
    ['1','2','3','4','5','6','7','8','9','0'],
    ['!','?','.',',','-',"'",':',';','(',')','+'],
    ['Q','W','E','R','T','Y','U','I','O','P'],
    ['A','S','D','F','G','H','J','K','L'],
    ['Z','X','C','V','B','N','M'],
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

  // Tooltip text — use &#10; for line breaks inside Bootstrap tooltip titles
  difficultyInfo: 'Level 1: Most common letters — E, T, A, O, I&#10;Level 2: Adds N, S, H, R, D — ~75% of English&#10;Level 3: Adds L, C, U, M, W — ~90% of English&#10;Level 4: Adds F, G, Y, P, B — nearly full alphabet&#10;Level 5: Remaining letters (V, K, J, X, Q, Z), numbers, punctuation',

  maxLengthInfo: 'Single Word: one word only&#10;Short: up to 3 words&#10;Medium: 2–7 words&#10;Long: 8 or more words',

  wordRarityInfo: '1–2: Core words (the, and, is…)&#10;3–4: Everyday words&#10;5–6: Common medieval vocabulary&#10;7–8: Specialised terms&#10;9–10: Rare or archaic words'
};

// ─── UTILS ───────────────────────────────────────────────────────────────────
function randomFrom(arr, lastValue) {
  if (arr.length <= 1) return arr[0];
  // Identify the last value by text content for objects, or direct equality for primitives
  const lastKey = lastValue?.text ?? lastValue;
  const candidates = arr.filter(item => (item?.text ?? item) !== lastKey);
  const pool = candidates.length ? candidates : arr;
  return pool[Math.floor(Math.random() * pool.length)];
}
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

// Capitalize the first character of a string for display.
// If the uppercase version of that character is in the font, use it.
// If not but the lowercase is in the font, keep lowercase.
// If neither is in the font, drop the character entirely.
function capitalizeForFont(text) {
  if (!text) return text;
  const first = text[0];
  const upper = first.toUpperCase();
  const rest = text.slice(1);
  if (upper === first) return text; // already uppercase or non-alpha
  if (App.fontHasChar(upper)) return upper + rest;
  if (App.fontHasChar(first)) return text; // keep lowercase
  // neither case in font — drop the character
  return capitalizeForFont(rest);
}

function infoIcon(text) {
  // Bootstrap tooltips support HTML via data-bs-html="true"; use <br> for line breaks
  const html = text.replace(/&#10;/g, '<br>');
  return `<span class="info-icon" tabindex="0"
    data-bs-toggle="tooltip" data-bs-placement="top" data-bs-html="true"
    title="${html}">ℹ</span>`;
}

let _toastInstance = null;
function showToast(message, type = 'success', delay = 2000) {
  const toastEl = el('hst-toast');
  const body = el('hst-toast-body');
  if (!toastEl || !body) return;
  body.textContent = message;
  const bgClass = type === 'success' ? 'text-bg-success'
    : type === 'danger' ? 'text-bg-danger'
    : 'text-bg-secondary';
  toastEl.className = `toast align-items-center border-0 ${bgClass}`;
  // Recreate instance with new delay each time
  _toastInstance = new bootstrap.Toast(toastEl, { delay });
  _toastInstance.show();
}

function scrollToCard(cardId) {
  const card = el(cardId);
  if (!card) return;
  card.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

