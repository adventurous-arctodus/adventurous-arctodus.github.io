// ─── HYNAFOL SCRIPTS TRAINER — Core ─────────────────────────────────────────

const App = {
  authenticated: false,
  scripts: [],
  wordlist: [],
  currentScript: null,
  currentFont: null,
  currentScreen: 'learn-reading',
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

  charCache: {},
  async hasGlyph(fontName, char) {
    if (!fontName) return false;
    const key = `${fontName}:${char}`;
    if (this.charCache[key] !== undefined) return this.charCache[key];
    const c = document.createElement('canvas');
    c.width = 40; c.height = 40;
    const ctx = c.getContext('2d');
    ctx.font = `28px "${fontName}"`;
    ctx.fillText(char, 5, 28);
    const d = ctx.getImageData(0, 0, 40, 40).data;
    let hasPixels = false;
    for (let i = 3; i < d.length; i += 4) { if (d[i] > 10) { hasPixels = true; break; } }
    this.charCache[key] = hasPixels;
    return hasPixels;
  }
};

// ─── CHARACTER SETS ──────────────────────────────────────────────────────────
const CharSets = {
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
  }
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
