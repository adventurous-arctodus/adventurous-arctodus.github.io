// ─── HYNAFOL SCRIPTS TRAINER — Screens ───────────────────────────────────────

// ─── SHARED HELPERS ───────────────────────────────────────────────────────────

function difficultyBtns(prefix, defaultLevel = 5) {
  return [1,2,3,4,5].map(i =>
    `<button class="btn btn-sm btn-outline-secondary diff-btn ${i===defaultLevel?'active':''}"
      data-level="${i}" data-prefix="${prefix}"
      onclick="${prefix}.setDifficulty(${i})">Level ${i}</button>`
  ).join('');
}

function includeCheckboxes(prefix, objName) {
  return ['Lowercase','Uppercase','Numbers','Punctuation'].map(label => {
    const id = `${prefix}-inc-${label.toLowerCase()}`;
    return `<div class="form-check form-check-inline">
      <input class="form-check-input" type="checkbox" id="${id}" checked
        onchange="${objName}.buildPool(); ${objName}.nextCard();">
      <label class="form-check-label" for="${id}">${label}</label>
    </div>`;
  }).join('');
}

// Build the Reference modal split into sections
function helpModal(prefix, fontName) {
  function section(title, chars) {
    // Only include chars the font supports
    const available = chars.filter(ch => App.fontHasChar(ch));
    if (!available.length) return '';
    const cells = available.map(ch => `
      <div class="cypher-cell">
        <span class="script-char" style="font-family:'${fontName}',serif">${escapeHtml(ch)}</span>
        <span class="common-char">${escapeHtml(ch)}</span>
      </div>`).join('');
    return `<h6 class="mt-3 mb-2 text-secondary small text-uppercase letter-spacing-1">${title}</h6>
      <div class="cypher-chart mb-2">${cells}</div>`;
  }

  const uppers = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  const lowers = 'abcdefghijklmnopqrstuvwxyz'.split('');
  const nums   = '0123456789'.split('');
  const punct  = ['.',',','!','?',"'",'-',':',';','"','(',')','+','&'];

  const body = section('Uppercase', uppers)
    + section('Lowercase', lowers)
    + section('Numbers', nums)
    + section('Punctuation', punct);

  return `
    <div class="modal fade" id="${prefix}-help-modal" tabindex="-1">
      <div class="modal-dialog modal-lg modal-dialog-scrollable">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Cypher Reference</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">${body || '<p class="text-secondary">No characters available for this script.</p>'}</div>
        </div>
      </div>
    </div>`;
}

function statsRow(prefix) {
  return `<div class="d-flex gap-3 small text-secondary">
    <span>Correct: <strong id="${prefix}-correct" class="text-success">0</strong></span>
    <span>Incorrect: <strong id="${prefix}-incorrect" class="text-danger">0</strong></span>
    <span>Skipped: <strong id="${prefix}-skipped" class="text-warning">0</strong></span>
  </div>`;
}

function renderKeyboard(prefix, fontName, onClickFn) {
  const rows = CharSets.keyboardRows;
  return `<div class="virtual-keyboard mt-3">
    ${rows.map(row => {
      const keys = row.map(ch => {
        const isSpace = ch === ' ';

        // Deduplicate: skip if this character is a non-canonical member of a symbol group
        // (i.e. it maps to a different canonical — meaning another key already covers this glyph)
        if (!isSpace && App.canonicalize(ch) !== ch) return '';

        const missing = !isSpace && !App.fontHasChar(ch);

        // Space key: show the font's space glyph if available, otherwise the ␣ placeholder
        const spaceHasGlyph = isSpace && App.fontHasChar(' ');
        const display = isSpace
          ? (spaceHasGlyph ? ' ' : '␣')
          : ch;
        const displayStyle = isSpace && spaceHasGlyph
          ? `font-family:'${fontName}',serif`
          : isSpace ? '' : `font-family:'${fontName}',serif`;

        const safeChar = ch === "'" ? "\\'" : ch;
        return `<button class="key-btn${isSpace?' key-space':''}${missing?' key-missing':''}"
          ${missing ? 'disabled title="Not in this script"' : ''}
          onclick="${missing ? '' : `${onClickFn}('${safeChar}')`}">
          <span style="${displayStyle}">${display}</span>
          ${isSpace ? '<span class="key-label">space</span>' : ''}
        </button>`;
      }).join('');
      // Skip rendering empty rows (e.g. if all keys were deduplicated)
      return keys.trim() ? `<div class="keyboard-row">${keys}</div>` : '';
    }).join('')}
  </div>`;
}

function modeToggle(activeMode, screenObj, prefix) {
  return `<div class="d-flex gap-2 mb-3">
    <button type="button" id="${prefix}-mode-single"
      class="btn btn-sm ${activeMode==='single'?'btn-secondary':'btn-outline-secondary'}"
      onclick="${screenObj}.setMode('single')">Single Character</button>
    <button type="button" id="${prefix}-mode-phrase"
      class="btn btn-sm ${activeMode==='phrase'?'btn-secondary':'btn-outline-secondary'}"
      onclick="${screenObj}.setMode('phrase')">Words &amp; Phrases</button>
  </div>`;
}

function initTooltips() {
  // Re-init Bootstrap tooltips after render
  setTimeout(() => {
    document.querySelectorAll('[data-bs-toggle="tooltip"]').forEach(el => {
      new bootstrap.Tooltip(el, { trigger: 'hover focus' });
    });
  }, 50);
}

// ─── READING SCREEN ───────────────────────────────────────────────────────────
const Reading = {
  mode: 'phrase',   // 'single' | 'phrase'
  pool: [], current: null, answered: false, awaitingCorrection: false,
  stats: { correct: 0, incorrect: 0, skipped: 0 },

  render() {
    const font = App.currentFont || '';
    return `
      <div class="card">
        <div class="card-header d-flex justify-content-between align-items-center flex-wrap gap-2">
          <h5 class="mb-0">Reading</h5>
          ${statsRow('rd')}
        </div>
        <div class="card-body">

          ${modeToggle(this.mode, 'Reading', 'rd')}

          <!-- Always-visible options -->
          <div class="row g-3 mb-3 align-items-end">
            <div class="col-auto">
              <label class="form-label small">
                Difficulty ${infoIcon(CharSets.difficultyInfo)}
              </label>
              <div class="d-flex flex-wrap gap-1">${difficultyBtns('Reading')}</div>
            </div>

            <!-- Single character sub-options -->
            <div id="rd-single-opts" class="col-auto${this.mode==='phrase'?' d-none':''}">
              <label class="form-label small">Include</label>
              <div>${includeCheckboxes('rd', 'Reading')}</div>
            </div>

            <!-- Phrase sub-options -->
            <div id="rd-phrase-opts" class="${this.mode==='single'?'d-none':''}">
              <div class="row g-3 align-items-end">
                <div class="col-auto">
                  <label class="form-label small">
                    Max Length ${infoIcon(CharSets.maxLengthInfo)}
                  </label>
                  <select id="rd-length" class="form-select form-select-sm" onchange="Reading.buildPool(); Reading.nextCard();">
                    <option value="word">Single Word / Proper Noun</option>
                    <option value="short">Short</option>
                    <option value="medium" selected>Medium</option>
                    <option value="long">Long</option>
                  </select>
                </div>
                <div class="col-auto">
                  <label class="form-label small">
                    Word Rarity ${infoIcon(CharSets.wordRarityInfo)}
                  </label>
                  <select id="rd-commonality" class="form-select form-select-sm" onchange="Reading.buildPool(); Reading.nextCard();">
                    <option value="2">1–2 (most common)</option>
                    <option value="4">1–4</option>
                    <option value="6">1–6</option>
                    <option value="8">1–8</option>
                    <option value="10" selected>1–10 (all)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <!-- Flashcard -->
          <div class="flashcard mb-3" id="rd-card">
            <span id="rd-char" class="display-script"></span>
          </div>

          <input type="text" class="form-control answer-input mb-1" id="rd-input"
            placeholder="Type the Common equivalent"
            autocomplete="off" autocorrect="off" spellcheck="false"
            onkeydown="Reading.onKeyDown(event)">
          <div id="rd-inline-error" class="small text-danger mb-3" style="min-height:1.4em;"></div>

          <div class="d-flex gap-2">
            <button class="btn btn-primary" id="rd-submit-btn" onclick="Reading.submit()">Submit</button>
            <button class="btn btn-outline-secondary" onclick="Reading.skip()">Skip</button>
            <button class="btn btn-outline-info ms-auto" data-bs-toggle="modal"
              data-bs-target="#rd-help-modal">Reference</button>
          </div>
        </div>
      </div>
      ${helpModal('rd', font)}
    `;
  },

  init() {
    this.stats = { correct: 0, incorrect: 0, skipped: 0 };
    this.answered = false;
    this.awaitingCorrection = false;
    this.buildPool();
    this.nextCard();
    initTooltips();
  },

  setMode(mode) {
    this.mode = mode;
    this.buildPool();
    this.nextCard();
    const sOpts = el('rd-single-opts');
    const pOpts = el('rd-phrase-opts');
    if (sOpts) sOpts.classList.toggle('d-none', mode === 'phrase');
    if (pOpts) pOpts.classList.toggle('d-none', mode === 'single');
    const btnSingle = el('rd-mode-single');
    const btnPhrase = el('rd-mode-phrase');
    if (btnSingle) btnSingle.className = `btn btn-sm ${mode==='single'?'btn-secondary':'btn-outline-secondary'}`;
    if (btnPhrase) btnPhrase.className = `btn btn-sm ${mode==='phrase'?'btn-secondary':'btn-outline-secondary'}`;
  },

  setDifficulty(level) {
    qsa('[data-prefix="Reading"]').forEach(b => b.classList.toggle('active', +b.dataset.level === level));
    this.buildPool(); this.nextCard();
  },

  buildPool() {
    if (this.mode === 'single') {
      const level = +(qs('[data-prefix="Reading"].active')?.dataset.level || 1);
      let pool = CharSets.getPool(level,
        el('rd-inc-uppercase')?.checked ?? false,
        el('rd-inc-lowercase')?.checked ?? false,
        el('rd-inc-numbers')?.checked   ?? false,
        el('rd-inc-punctuation')?.checked ?? false
      );
      // Filter to only chars the font supports
      pool = pool.filter(ch => App.fontHasChar(ch));
      this.pool = pool.length ? pool : ['a'];
    } else {
      this.pool = this.getPhrasePool();
    }
  },

  getPhrasePool() {
    const maxC = +(el('rd-commonality')?.value || 6);
    const len  = el('rd-length')?.value || 'medium';
    const diff = +(qs('[data-prefix="Reading"].active')?.dataset.level || 1);

    // Word count limits per length selector (counts spaces+1)
    // Single Word: 1 word, Short: 2-3 words, Medium: 4-7 words, Long: 8+ words
    const wordCount = s => s.trim().split(/\s+/).length;
    const typeFilter = len === 'word' ? ['word'] : ['word', 'phrase'];

    let pool = App.getWords(maxC, typeFilter);

    if (len === 'word') {
      pool = pool.filter(w => w.type === 'word');
    } else if (len === 'short') {
      pool = pool.filter(w => wordCount(w.text) <= 3);
    } else if (len === 'medium') {
      pool = pool.filter(w => wordCount(w.text) >= 2 && wordCount(w.text) <= 7);
    } else { // long
      pool = pool.filter(w => wordCount(w.text) >= 8);
    }

    // Prefer words tagged for this difficulty level; fall back to full pool if too small
    const levelled = pool.filter(w => w.level === diff);
    if (levelled.length >= 3) return levelled;
    return pool.length ? pool : App.getWords(10, ['word']);
  },

  nextCard() {
    this.buildPool();
    if (!this.pool.length) return;

    this.answered = false;
    this.awaitingCorrection = false;
    const card = el('rd-card');

    if (this.mode === 'single') {
      this.current = { type: 'char', value: randomFrom(this.pool, this.current?.value) };
      const ch = el('rd-char');
      if (ch) {
        ch.textContent = this.current.value;
        applyFont(ch, App.currentFont);
        ch.className = 'display-script';
      }
      if (card) card.className = 'flashcard mb-3';
    } else {
      const item = randomFrom(this.pool, this.current?.item);
      // Words: lowercase. Phrases: capitalize first letter if font supports it.
      const raw = item.type === 'word' ? item.text.toLowerCase() : item.text;
      const { text: filtered } = App.filterText(raw);
      const displayed = item.type === 'phrase' ? capitalizeForFont(filtered) : filtered;
      this.current = { type: 'phrase', value: displayed, original: raw, item };
      const ch = el('rd-char');
      if (ch) {
        ch.textContent = displayed;
        applyFont(ch, App.currentFont);
        ch.className = 'display-script-phrase';
      }
      if (card) card.className = 'flashcard flashcard-tall mb-3';
    }

    const inp = el('rd-input');
    if (inp) { inp.value = ''; inp.className = 'form-control answer-input mb-1'; inp.disabled = false; inp.focus(); }
    if (el('rd-submit-btn')) el('rd-submit-btn').textContent = 'Submit';
    const errEl = el('rd-inline-error');
    if (errEl) errEl.textContent = '';
    scrollToCard('rd-card');
  },

  onKeyDown(e) {
    if (e.key === 'Enter') this.submit();
  },

  setInlineError(msg) {
    const el_ = el('rd-inline-error');
    if (el_) el_.textContent = msg;
  },

  submit() {
    // Correction mode — user must type the correct answer to advance
    if (this.answered && this.awaitingCorrection) {
      const inp = el('rd-input');
      if (!inp) return;
      const expected = this.current.value;
      const typed = this.current.type === 'char' ? inp.value.trim() : normalize(inp.value);
      const norm = this.current.type === 'char' ? expected : normalize(expected);
      if (!App.isAcceptable(typed, norm)) {
        // Wrong again — show error, scroll up, do NOT re-increment incorrect
        inp.value = '';
        inp.className = 'form-control answer-input mb-1 is-incorrect';
        this.setInlineError(`✗ Incorrect — the answer is "${expected}"`);
        scrollToCard('rd-card');
        inp.focus();
        return;
      }
      // Typed correctly — advance without credit, show toast
      this.awaitingCorrection = false;
      this.setInlineError('');
      if (el('rd-submit-btn')) el('rd-submit-btn').textContent = 'Submit';
      showToast('✓ Moving on', 'secondary');
      setTimeout(() => this.nextCard(), 600);
      return;
    }

    if (this.answered || !this.current) return;
    const inp = el('rd-input');
    if (!inp || !inp.value.trim()) return;

    let isCorrect, expected;
    if (this.current.type === 'char') {
      expected = this.current.value;
      isCorrect = App.isAcceptable(inp.value.trim(), expected);
    } else {
      expected = this.current.value;
      isCorrect = App.isAcceptable(normalize(inp.value), normalize(expected));
    }

    this.answered = true;

    if (isCorrect) {
      inp.disabled = true;
      inp.className = 'form-control answer-input mb-1 is-correct';
      this.awaitingCorrection = false;
      this.setInlineError('');
      const delay = this.current.type === 'char' ? 900 : 1200;
      showToast('✓ Correct', 'success', delay);
      this.stats.correct++;
      if (el('rd-correct')) el('rd-correct').textContent = this.stats.correct;
      setTimeout(() => this.nextCard(), delay);
    } else {
      this.awaitingCorrection = true;
      inp.value = '';
      inp.className = 'form-control answer-input mb-1 is-incorrect';
      inp.disabled = false;
      this.setInlineError(`✗ Incorrect — the answer is "${expected}"`);
      showToast('✗ Incorrect', 'danger');
      if (el('rd-submit-btn')) el('rd-submit-btn').textContent = 'Next';
      scrollToCard('rd-card');
      inp.focus();
      this.stats.incorrect++;
      if (el('rd-incorrect')) el('rd-incorrect').textContent = this.stats.incorrect;
    }
  },

  skip() {
    this.stats.skipped++;
    if (el('rd-skipped')) el('rd-skipped').textContent = this.stats.skipped;
    this.nextCard();
  }
};

// ─── WRITING SCREEN ───────────────────────────────────────────────────────────
const Writing = {
  mode: 'phrase',   // 'single' | 'phrase'
  pool: [], current: null, answered: false, typed: '', awaitingCorrection: false,
  stats: { correct: 0, incorrect: 0, skipped: 0 },

  render() {
    const font = App.currentFont || '';
    return `
      <div class="card">
        <div class="card-header d-flex justify-content-between align-items-center flex-wrap gap-2">
          <h5 class="mb-0">Writing</h5>
          ${statsRow('wr')}
        </div>
        <div class="card-body">

          ${modeToggle(this.mode, 'Writing', 'wr')}

          <!-- Always-visible options -->
          <div class="row g-3 mb-3 align-items-end">
            <div class="col-auto">
              <label class="form-label small">
                Difficulty ${infoIcon(CharSets.difficultyInfo)}
              </label>
              <div class="d-flex flex-wrap gap-1">${difficultyBtns('Writing')}</div>
            </div>

            <!-- Single character sub-options -->
            <div id="wr-single-opts" class="col-auto${this.mode==='phrase'?' d-none':''}">
              <label class="form-label small">Include</label>
              <div>${includeCheckboxes('wr', 'Writing')}</div>
            </div>

            <!-- Phrase sub-options -->
            <div id="wr-phrase-opts" class="${this.mode==='single'?'d-none':''}">
              <div class="row g-3 align-items-end">
                <div class="col-auto">
                  <label class="form-label small">
                    Max Length ${infoIcon(CharSets.maxLengthInfo)}
                  </label>
                  <select id="wr-length" class="form-select form-select-sm" onchange="Writing.buildPool(); Writing.nextCard();">
                    <option value="word">Single Word / Proper Noun</option>
                    <option value="short">Short</option>
                    <option value="medium" selected>Medium</option>
                    <option value="long">Long</option>
                  </select>
                </div>
                <div class="col-auto">
                  <label class="form-label small">
                    Word Rarity ${infoIcon(CharSets.wordRarityInfo)}
                  </label>
                  <select id="wr-commonality" class="form-select form-select-sm" onchange="Writing.buildPool(); Writing.nextCard();">
                    <option value="2">1–2 (most common)</option>
                    <option value="4">1–4</option>
                    <option value="6">1–6</option>
                    <option value="8">1–8</option>
                    <option value="10" selected>1–10 (all)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <!-- Flashcard: show Common text, type in script -->
          <div class="flashcard mb-3" id="wr-card">
            <span id="wr-char" class="display-common"></span>
          </div>

          <label class="form-label small">Your answer</label>
          <div class="writing-output mb-1" id="wr-output">
            <span id="wr-typed" style="font-family:'${font}',serif"></span><span class="writing-cursor"></span>
          </div>
          <div id="wr-inline-error" class="small text-danger mb-2" style="min-height:1.4em;"></div>

          <div class="d-flex gap-2 mb-2">
            <button class="btn btn-sm btn-outline-secondary" onclick="Writing.backspace()">⌫ Backspace</button>
            <button class="btn btn-sm btn-outline-secondary" onclick="Writing.clear()">Clear</button>
          </div>

          ${renderKeyboard('wr', font, 'Writing.typeChar')}

          <div class="d-flex gap-2 mt-3">
            <button class="btn btn-primary" id="wr-submit-btn" onclick="Writing.submit()">Submit</button>
            <button class="btn btn-outline-secondary" onclick="Writing.skip()">Skip</button>
            <button class="btn btn-outline-info ms-auto" data-bs-toggle="modal"
              data-bs-target="#wr-help-modal">Reference</button>
          </div>
        </div>
      </div>
      ${helpModal('wr', font)}
    `;
  },

  init() {
    this.stats = { correct: 0, incorrect: 0, skipped: 0 };
    this.typed = ''; this.answered = false; this.awaitingCorrection = false;
    this.buildPool();
    this.nextCard();
    initTooltips();
  },

  setMode(mode) {
    this.mode = mode;
    this.typed = '';
    this.buildPool();
    this.nextCard();
    const sOpts = el('wr-single-opts');
    const pOpts = el('wr-phrase-opts');
    if (sOpts) sOpts.classList.toggle('d-none', mode === 'phrase');
    if (pOpts) pOpts.classList.toggle('d-none', mode === 'single');
    const btnSingle = el('wr-mode-single');
    const btnPhrase = el('wr-mode-phrase');
    if (btnSingle) btnSingle.className = `btn btn-sm ${mode==='single'?'btn-secondary':'btn-outline-secondary'}`;
    if (btnPhrase) btnPhrase.className = `btn btn-sm ${mode==='phrase'?'btn-secondary':'btn-outline-secondary'}`;
  },

  setDifficulty(level) {
    qsa('[data-prefix="Writing"]').forEach(b => b.classList.toggle('active', +b.dataset.level === level));
    this.buildPool(); this.nextCard();
  },

  buildPool() {
    if (this.mode === 'single') {
      const level = +(qs('[data-prefix="Writing"].active')?.dataset.level || 1);
      let pool = CharSets.getPool(level,
        el('wr-inc-uppercase')?.checked ?? false,
        el('wr-inc-lowercase')?.checked ?? false,
        el('wr-inc-numbers')?.checked   ?? false,
        el('wr-inc-punctuation')?.checked ?? false
      );
      pool = pool.filter(ch => App.fontHasChar(ch));
      this.pool = pool.length ? pool : ['a'];
    } else {
      this.pool = this.getPhrasePool();
    }
  },

  getPhrasePool() {
    const maxC = +(el('wr-commonality')?.value || 6);
    const len  = el('wr-length')?.value || 'medium';
    const diff = +(qs('[data-prefix="Writing"].active')?.dataset.level || 1);

    const wordCount = s => s.trim().split(/\s+/).length;
    const typeFilter = len === 'word' ? ['word'] : ['word', 'phrase'];

    let pool = App.getWords(maxC, typeFilter);

    if (len === 'word') {
      pool = pool.filter(w => w.type === 'word');
    } else if (len === 'short') {
      pool = pool.filter(w => wordCount(w.text) <= 3);
    } else if (len === 'medium') {
      pool = pool.filter(w => wordCount(w.text) >= 2 && wordCount(w.text) <= 7);
    } else { // long
      pool = pool.filter(w => wordCount(w.text) >= 8);
    }

    const levelled = pool.filter(w => w.level === diff);
    if (levelled.length >= 3) return levelled;
    return pool.length ? pool : App.getWords(10, ['word']);
  },

  nextCard() {
    this.buildPool();
    if (!this.pool.length) return;

    this.answered = false;
    this.awaitingCorrection = false;
    this.typed = '';
    const card = el('wr-card');

    if (this.mode === 'single') {
      this.current = { type: 'char', value: randomFrom(this.pool, this.current?.value) };
      const ch = el('wr-char');
      if (ch) {
        ch.textContent = this.current.value;
        ch.style.fontFamily = '';
        ch.className = 'display-common';
      }
      if (card) card.className = 'flashcard mb-3';
    } else {
      const item = randomFrom(this.pool, this.current?.item);
      const raw = item.type === 'word' ? item.text.toLowerCase() : item.text;
      // Capitalize first letter for display (Common text — no font constraint)
      const displayed = item.type === 'phrase'
        ? raw.charAt(0).toUpperCase() + raw.slice(1)
        : raw;
      this.current = { type: 'phrase', value: raw, item };
      const ch = el('wr-char');
      if (ch) {
        ch.textContent = displayed;
        ch.style.fontFamily = '';
        ch.className = 'display-common-phrase';
      }
      if (card) card.className = 'flashcard flashcard-tall mb-3';
    }

    this.updateOutput();
    if (el('wr-submit-btn')) el('wr-submit-btn').textContent = 'Submit';
    const errEl = el('wr-inline-error');
    if (errEl) errEl.innerHTML = '';
    scrollToCard('wr-card');
  },

  typeChar(ch) {
    if (this.answered && !this.awaitingCorrection) return;
    this.typed += ch;
    this.updateOutput();
  },
  backspace()  { if (!this.answered || this.awaitingCorrection) { this.typed = this.typed.slice(0, -1); this.updateOutput(); } },
  clear()      { if (!this.answered || this.awaitingCorrection) { this.typed = ''; this.updateOutput(); } },

  updateOutput() {
    const t = el('wr-typed');
    if (t) { t.textContent = this.typed; applyFont(t, App.currentFont); }
  },

  setInlineError(html) {
    const el_ = el('wr-inline-error');
    if (el_) el_.innerHTML = html;
  },

  buildErrorHtml(expected) {
    const font = App.currentFont;
    const scriptSpan = font
      ? `<span style="font-family:'${font}',serif">${escapeHtml(expected)}</span>`
      : escapeHtml(expected);
    return `✗ Incorrect — the answer is: ${scriptSpan}`;
  },

  submit() {
    // Correction mode — must type correctly to advance, no credit, no extra stat
    if (this.answered && this.awaitingCorrection) {
      const expected = this.correctionExpected;
      const isMatch = this.current.type === 'char'
        ? App.isAcceptable(this.typed, expected)
        : App.isAcceptable(normalize(this.typed), normalize(expected));
      if (!isMatch) {
        // Wrong again — clear, show error, scroll, do NOT re-increment
        this.typed = '';
        this.updateOutput();
        this.setInlineError(this.buildErrorHtml(expected));
        scrollToCard('wr-card');
        return;
      }
      // Typed correctly — advance without credit
      this.awaitingCorrection = false;
      this.setInlineError('');
      if (el('wr-submit-btn')) el('wr-submit-btn').textContent = 'Submit';
      showToast('✓ Moving on', 'secondary');
      setTimeout(() => this.nextCard(), 600);
      return;
    }

    if (this.answered || !this.current) return;

    let expected, isCorrect;
    if (this.current.type === 'char') {
      expected = this.current.value;
      isCorrect = App.isAcceptable(this.typed, expected);
    } else {
      const raw = this.current.value;
      const { text: filtered } = App.filterText(raw);
      expected = filtered;
      isCorrect = App.isAcceptable(normalize(this.typed), normalize(expected));
    }

    this.answered = true;

    if (isCorrect) {
      this.awaitingCorrection = false;
      this.setInlineError('');
      const delay = this.current.type === 'char' ? 900 : 1200;
      showToast('✓ Correct', 'success', delay);
      this.stats.correct++;
      if (el('wr-correct')) el('wr-correct').textContent = this.stats.correct;
      setTimeout(() => this.nextCard(), delay);
    } else {
      this.awaitingCorrection = true;
      this.correctionExpected = expected;
      this.typed = '';
      this.updateOutput();
      this.setInlineError(this.buildErrorHtml(expected));
      showToast('✗ Incorrect', 'danger');
      if (el('wr-submit-btn')) el('wr-submit-btn').textContent = 'Next';
      scrollToCard('wr-card');
      this.stats.incorrect++;
      if (el('wr-incorrect')) el('wr-incorrect').textContent = this.stats.incorrect;
    }
  },

  skip() {
    this.stats.skipped++;
    if (el('wr-skipped')) el('wr-skipped').textContent = this.stats.skipped;
    this.nextCard();
  }
};
