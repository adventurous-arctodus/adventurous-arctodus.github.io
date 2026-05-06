// ─── HYNAFOL SCRIPTS TRAINER — Screens ───────────────────────────────────────

// ─── SHARED HELPERS ───────────────────────────────────────────────────────────

function difficultyBtns(prefix) {
  return [1,2,3,4,5].map(i =>
    `<button class="btn btn-sm btn-outline-secondary diff-btn ${i===1?'active':''}"
      data-level="${i}" data-prefix="${prefix}"
      onclick="${prefix}.setDifficulty(${i})">Level ${i}</button>`
  ).join('');
}

function includeCheckboxes(prefix) {
  return ['Lowercase','Uppercase','Numbers','Punctuation'].map(label => {
    const id = `${prefix}-inc-${label.toLowerCase()}`;
    return `<div class="form-check form-check-inline">
      <input class="form-check-input" type="checkbox" id="${id}" checked>
      <label class="form-check-label" for="${id}">${label}</label>
    </div>`;
  }).join('');
}

function helpModal(prefix, fontName) {
  const allChars = CharSets.getPool(5, true, true, true, true);
  const cells = allChars.map(ch => `
    <div class="cypher-cell">
      <span class="script-char" style="font-family:'${fontName}',serif">${ch === '<' ? '&lt;' : ch}</span>
      <span class="latin-char">${ch === ' ' ? '(space)' : escapeHtml(ch)}</span>
    </div>`).join('');

  return `
    <div class="modal fade" id="${prefix}-help-modal" tabindex="-1">
      <div class="modal-dialog modal-lg modal-dialog-scrollable">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Cypher Reference</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <div class="cypher-chart">${cells}</div>
          </div>
        </div>
      </div>
    </div>`;
}

function statsRow(prefix) {
  return `<div class="d-flex gap-3 mb-3 small text-secondary">
    <span>Correct: <strong id="${prefix}-correct" class="text-success">0</strong></span>
    <span>Incorrect: <strong id="${prefix}-incorrect" class="text-danger">0</strong></span>
    <span>Skipped: <strong id="${prefix}-skipped" class="text-warning">0</strong></span>
  </div>`;
}

function renderKeyboard(prefix, fontName, onClickFn) {
  const rows = CharSets.keyboardRows;
  return `<div class="virtual-keyboard mt-3">
    ${rows.map(row => `
      <div class="keyboard-row">
        ${row.map(ch => {
          const isSpace = ch === ' ';
          const display = isSpace ? '␣' : ch;
          const safeChar = ch === "'" ? "\\'" : ch;
          return `<button class="key-btn${isSpace?' key-space':''}"
            onclick="${onClickFn}('${safeChar}')">
            <span style="font-family:'${fontName}',serif">${display}</span>
            ${isSpace ? '<span class="key-label">space</span>' : ''}
          </button>`;
        }).join('')}
      </div>`).join('')}
  </div>`;
}

// ─── LEARN: READING ──────────────────────────────────────────────────────────
const LearnReading = {
  pool: [], current: null, answered: false,
  stats: { correct: 0, incorrect: 0, skipped: 0 },

  render() {
    return `
      <div class="row g-4">
        <div class="col-12">
          <div class="card">
            <div class="card-header d-flex justify-content-between align-items-center">
              <h5 class="mb-0">Learn: Reading</h5>
              ${statsRow('lr')}
            </div>
            <div class="card-body">

              <div class="row g-3 mb-3">
                <div class="col-auto">
                  <label class="form-label small">Difficulty</label>
                  <div class="btn-group d-flex flex-wrap gap-1">${difficultyBtns('LearnReading')}</div>
                </div>
                <div class="col-auto">
                  <label class="form-label small">Include</label>
                  <div>${includeCheckboxes('lr')}</div>
                </div>
              </div>

              <div class="flashcard mb-3" id="lr-card">
                <span id="lr-char"></span>
              </div>

              <div id="lr-feedback" class="mb-2 small" style="min-height:1.4em;"></div>

              <input type="text" class="form-control answer-input mb-3" id="lr-input"
                placeholder="Type the Latin equivalent"
                autocomplete="off" autocorrect="off" spellcheck="false" maxlength="3"
                onkeydown="LearnReading.onKeyDown(event)">

              <div class="d-flex gap-2">
                <button class="btn btn-primary" onclick="LearnReading.submit()">Submit</button>
                <button class="btn btn-outline-secondary" onclick="LearnReading.skip()">Skip</button>
                <button class="btn btn-outline-info ms-auto" data-bs-toggle="modal"
                  data-bs-target="#lr-help-modal">Reference</button>
              </div>
            </div>
          </div>
        </div>
      </div>
      ${helpModal('lr', App.currentFont || '')}
    `;
  },

  init() {
    this.stats = { correct: 0, incorrect: 0, skipped: 0 };
    this.answered = false;
    this.buildPool();
    this.nextCard();
  },

  setDifficulty(level) {
    qsa('[data-prefix="LearnReading"]').forEach(b => b.classList.toggle('active', +b.dataset.level === level));
    this.buildPool(); this.nextCard();
  },

  buildPool() {
    const level = +(qs('[data-prefix="LearnReading"].active')?.dataset.level || 1);
    this.pool = CharSets.getPool(level,
      el('lr-inc-uppercase')?.checked ?? true,
      el('lr-inc-lowercase')?.checked ?? true,
      el('lr-inc-numbers')?.checked   ?? true,
      el('lr-inc-punctuation')?.checked ?? true
    );
    if (!this.pool.length) this.pool = ['a'];
  },

  nextCard() {
    this.answered = false;
    this.current = randomFrom(this.pool);
    const ch = el('lr-char');
    if (ch) { ch.textContent = this.current; applyFont(ch, App.currentFont); }
    const inp = el('lr-input');
    if (inp) { inp.value = ''; inp.className = 'form-control answer-input'; inp.disabled = false; inp.focus(); }
    const fb = el('lr-feedback');
    if (fb) { fb.textContent = ''; fb.className = 'small mb-2'; }
  },

  onKeyDown(e) { if (e.key === 'Enter') this.submit(); },

  submit() {
    if (this.answered || !this.current) return;
    const inp = el('lr-input');
    if (!inp || !inp.value.trim()) return;
    const isCorrect = inp.value.trim() === this.current;
    this.answered = true;
    inp.disabled = true;
    inp.classList.add(isCorrect ? 'is-correct' : 'is-incorrect');
    const fb = el('lr-feedback');
    if (fb) {
      fb.className = `small mb-2 ${isCorrect ? 'text-success' : 'text-danger'}`;
      fb.textContent = isCorrect ? '✓ Correct' : `✗ Incorrect — answer: "${this.current}"`;
    }
    if (isCorrect) {
      this.stats.correct++; if(el('lr-correct')) el('lr-correct').textContent = this.stats.correct;
      setTimeout(() => this.nextCard(), 900);
    } else {
      this.stats.incorrect++; if(el('lr-incorrect')) el('lr-incorrect').textContent = this.stats.incorrect;
    }
  },

  skip() {
    this.stats.skipped++; if(el('lr-skipped')) el('lr-skipped').textContent = this.stats.skipped;
    this.nextCard();
  }
};

// ─── LEARN: WRITING ──────────────────────────────────────────────────────────
const LearnWriting = {
  pool: [], current: null, answered: false, typed: '',
  stats: { correct: 0, incorrect: 0, skipped: 0 },

  render() {
    const font = App.currentFont || '';
    return `
      <div class="row g-4">
        <div class="col-12">
          <div class="card">
            <div class="card-header d-flex justify-content-between align-items-center">
              <h5 class="mb-0">Learn: Writing</h5>
              ${statsRow('lw')}
            </div>
            <div class="card-body">

              <div class="row g-3 mb-3">
                <div class="col-auto">
                  <label class="form-label small">Difficulty</label>
                  <div class="btn-group d-flex flex-wrap gap-1">${difficultyBtns('LearnWriting')}</div>
                </div>
                <div class="col-auto">
                  <label class="form-label small">Include</label>
                  <div>${includeCheckboxes('lw')}</div>
                </div>
              </div>

              <div class="flashcard mb-3">
                <span id="lw-char" style="font-size:5rem;"></span>
              </div>

              <div id="lw-feedback" class="mb-2 small" style="min-height:1.4em;"></div>

              <label class="form-label small">Your answer</label>
              <div class="writing-output mb-2" id="lw-output">
                <span id="lw-typed" style="font-family:'${font}',serif"></span><span class="writing-cursor"></span>
              </div>

              <div class="d-flex gap-2 mb-2">
                <button class="btn btn-sm btn-outline-secondary" onclick="LearnWriting.backspace()">⌫ Backspace</button>
                <button class="btn btn-sm btn-outline-secondary" onclick="LearnWriting.clear()">Clear</button>
              </div>

              ${renderKeyboard('lw', font, 'LearnWriting.typeChar')}

              <div class="d-flex gap-2 mt-3">
                <button class="btn btn-primary" onclick="LearnWriting.submit()">Submit</button>
                <button class="btn btn-outline-secondary" onclick="LearnWriting.skip()">Skip</button>
                <button class="btn btn-outline-info ms-auto" data-bs-toggle="modal"
                  data-bs-target="#lw-help-modal">Reference</button>
              </div>
            </div>
          </div>
        </div>
      </div>
      ${helpModal('lw', font)}
    `;
  },

  init() {
    this.stats = { correct: 0, incorrect: 0, skipped: 0 };
    this.typed = ''; this.answered = false;
    this.buildPool(); this.nextCard();
  },

  setDifficulty(level) {
    qsa('[data-prefix="LearnWriting"]').forEach(b => b.classList.toggle('active', +b.dataset.level === level));
    this.buildPool(); this.nextCard();
  },

  buildPool() {
    const level = +(qs('[data-prefix="LearnWriting"].active')?.dataset.level || 1);
    this.pool = CharSets.getPool(level,
      el('lw-inc-uppercase')?.checked ?? true,
      el('lw-inc-lowercase')?.checked ?? true,
      el('lw-inc-numbers')?.checked   ?? true,
      el('lw-inc-punctuation')?.checked ?? true
    );
    if (!this.pool.length) this.pool = ['a'];
  },

  nextCard() {
    this.answered = false; this.typed = '';
    this.current = randomFrom(this.pool);
    const ch = el('lw-char');
    if (ch) { ch.textContent = this.current; ch.style.fontFamily = ''; }
    this.updateOutput();
    const fb = el('lw-feedback');
    if (fb) { fb.textContent = ''; fb.className = 'small mb-2'; }
  },

  typeChar(ch) { if (!this.answered) { this.typed += ch; this.updateOutput(); } },
  backspace()  { this.typed = this.typed.slice(0,-1); this.updateOutput(); },
  clear()      { this.typed = ''; this.updateOutput(); },

  updateOutput() {
    const t = el('lw-typed');
    if (t) { t.textContent = this.typed; applyFont(t, App.currentFont); }
  },

  submit() {
    if (this.answered || !this.current) return;
    const isCorrect = this.typed === this.current;
    this.answered = true;
    const fb = el('lw-feedback');
    if (fb) {
      fb.className = `small mb-2 ${isCorrect ? 'text-success' : 'text-danger'}`;
      if (isCorrect) {
        fb.textContent = '✓ Correct';
      } else {
        fb.innerHTML = `✗ Incorrect — answer: <span style="font-family:'${App.currentFont}',serif">${escapeHtml(this.current)}</span>`;
      }
    }
    if (isCorrect) {
      this.stats.correct++; if(el('lw-correct')) el('lw-correct').textContent = this.stats.correct;
      setTimeout(() => this.nextCard(), 900);
    } else {
      this.stats.incorrect++; if(el('lw-incorrect')) el('lw-incorrect').textContent = this.stats.incorrect;
    }
  },

  skip() {
    this.stats.skipped++; if(el('lw-skipped')) el('lw-skipped').textContent = this.stats.skipped;
    this.nextCard();
  }
};

// ─── TRAIN: READING ──────────────────────────────────────────────────────────
const TrainReading = {
  current: null, answered: false,
  stats: { correct: 0, incorrect: 0, skipped: 0 },

  render() {
    const font = App.currentFont || '';
    return `
      <div class="row g-4">
        <div class="col-12">
          <div class="card">
            <div class="card-header d-flex justify-content-between align-items-center">
              <h5 class="mb-0">Train: Reading</h5>
              ${statsRow('tr')}
            </div>
            <div class="card-body">

              <div class="row g-3 mb-3">
                <div class="col-auto">
                  <label class="form-label small">Difficulty</label>
                  <div class="btn-group d-flex flex-wrap gap-1">${difficultyBtns('TrainReading')}</div>
                </div>
                <div class="col-auto">
                  <label class="form-label small">Max length</label>
                  <select id="tr-length" class="form-select form-select-sm" onchange="TrainReading.nextCard()">
                    <option value="word">Single word</option>
                    <option value="short">Short phrase</option>
                    <option value="medium" selected>Medium phrase</option>
                    <option value="long">Long phrase</option>
                  </select>
                </div>
                <div class="col-auto">
                  <label class="form-label small">Max commonality</label>
                  <select id="tr-commonality" class="form-select form-select-sm" onchange="TrainReading.nextCard()">
                    <option value="2">1–2 (most common)</option>
                    <option value="4">1–4</option>
                    <option value="6" selected>1–6</option>
                    <option value="8">1–8</option>
                    <option value="10">1–10 (all)</option>
                  </select>
                </div>
              </div>

              <div class="flashcard mb-3">
                <div class="flashcard-phrase" id="tr-display" style="font-family:'${font}',serif"></div>
              </div>

              <div id="tr-feedback" class="mb-2 small" style="min-height:1.4em;"></div>

              <input type="text" class="form-control answer-input mb-3" id="tr-input"
                placeholder="Type the Latin translation"
                autocomplete="off" autocorrect="off" spellcheck="false"
                onkeydown="TrainReading.onKeyDown(event)">

              <div class="d-flex gap-2">
                <button class="btn btn-primary" onclick="TrainReading.submit()">Submit</button>
                <button class="btn btn-outline-secondary" onclick="TrainReading.skip()">Skip</button>
                <button class="btn btn-outline-info ms-auto" data-bs-toggle="modal"
                  data-bs-target="#tr-help-modal">Reference</button>
              </div>
            </div>
          </div>
        </div>
      </div>
      ${helpModal('tr', font)}
    `;
  },

  init() {
    this.stats = { correct: 0, incorrect: 0, skipped: 0 };
    this.answered = false;
    this.nextCard();
  },

  setDifficulty(level) {
    qsa('[data-prefix="TrainReading"]').forEach(b => b.classList.toggle('active', +b.dataset.level === level));
    this.nextCard();
  },

  getPool() {
    const maxC = +(el('tr-commonality')?.value || 6);
    const len  = el('tr-length')?.value || 'medium';
    const diff = +(qs('[data-prefix="TrainReading"].active')?.dataset.level || 1);
    const maxLen = [4, 7, 12, 25, 9999][diff - 1];
    let types = len === 'word' ? ['word'] : len === 'short' ? ['word','phrase'] : len === 'medium' ? ['phrase'] : ['phrase'];
    let pool = App.getWords(maxC, types).filter(w => w.text.length <= maxLen);
    return pool.length ? pool : App.getWords(10, ['word']);
  },

  expectedText(item) {
    return item.type === 'word' ? item.text.toLowerCase() : item.text;
  },

  nextCard() {
    const pool = this.getPool();
    if (!pool.length) return;
    this.current = randomFrom(pool);
    this.answered = false;
    const d = el('tr-display');
    if (d) { d.textContent = this.expectedText(this.current); applyFont(d, App.currentFont); }
    const inp = el('tr-input');
    if (inp) { inp.value = ''; inp.className = 'form-control answer-input'; inp.disabled = false; inp.focus(); }
    const fb = el('tr-feedback');
    if (fb) { fb.textContent = ''; fb.className = 'small mb-2'; }
  },

  onKeyDown(e) { if (e.key === 'Enter') this.submit(); },

  submit() {
    if (this.answered || !this.current) return;
    const inp = el('tr-input');
    if (!inp || !inp.value.trim()) return;
    const expected = this.expectedText(this.current);
    const isCorrect = normalize(inp.value) === normalize(expected);
    this.answered = true;
    inp.disabled = true;
    inp.classList.add(isCorrect ? 'is-correct' : 'is-incorrect');
    const fb = el('tr-feedback');
    if (fb) {
      fb.className = `small mb-2 ${isCorrect ? 'text-success' : 'text-danger'}`;
      fb.textContent = isCorrect ? '✓ Correct' : `✗ Incorrect — answer: "${expected}"`;
    }
    if (isCorrect) {
      this.stats.correct++; if(el('tr-correct')) el('tr-correct').textContent = this.stats.correct;
      setTimeout(() => this.nextCard(), 1200);
    } else {
      this.stats.incorrect++; if(el('tr-incorrect')) el('tr-incorrect').textContent = this.stats.incorrect;
    }
  },

  skip() {
    this.stats.skipped++; if(el('tr-skipped')) el('tr-skipped').textContent = this.stats.skipped;
    this.nextCard();
  }
};

// ─── TRAIN: WRITING ──────────────────────────────────────────────────────────
const TrainWriting = {
  current: null, answered: false, typed: '',
  stats: { correct: 0, incorrect: 0, skipped: 0 },

  render() {
    const font = App.currentFont || '';
    return `
      <div class="row g-4">
        <div class="col-12">
          <div class="card">
            <div class="card-header d-flex justify-content-between align-items-center">
              <h5 class="mb-0">Train: Writing</h5>
              ${statsRow('tw')}
            </div>
            <div class="card-body">

              <div class="row g-3 mb-3">
                <div class="col-auto">
                  <label class="form-label small">Difficulty</label>
                  <div class="btn-group d-flex flex-wrap gap-1">${difficultyBtns('TrainWriting')}</div>
                </div>
                <div class="col-auto">
                  <label class="form-label small">Max length</label>
                  <select id="tw-length" class="form-select form-select-sm" onchange="TrainWriting.nextCard()">
                    <option value="word">Single word</option>
                    <option value="short">Short phrase</option>
                    <option value="medium" selected>Medium phrase</option>
                    <option value="long">Long phrase</option>
                  </select>
                </div>
                <div class="col-auto">
                  <label class="form-label small">Max commonality</label>
                  <select id="tw-commonality" class="form-select form-select-sm" onchange="TrainWriting.nextCard()">
                    <option value="2">1–2 (most common)</option>
                    <option value="4">1–4</option>
                    <option value="6" selected>1–6</option>
                    <option value="8">1–8</option>
                    <option value="10">1–10 (all)</option>
                  </select>
                </div>
              </div>

              <div class="flashcard mb-3">
                <div class="flashcard-phrase" id="tw-display"></div>
              </div>

              <div id="tw-feedback" class="mb-2 small" style="min-height:1.4em;"></div>

              <label class="form-label small">Your answer</label>
              <div class="writing-output mb-2" id="tw-output">
                <span id="tw-typed" style="font-family:'${font}',serif"></span><span class="writing-cursor"></span>
              </div>

              <div class="d-flex gap-2 mb-2">
                <button class="btn btn-sm btn-outline-secondary" onclick="TrainWriting.backspace()">⌫ Backspace</button>
                <button class="btn btn-sm btn-outline-secondary" onclick="TrainWriting.clear()">Clear</button>
              </div>

              ${renderKeyboard('tw', font, 'TrainWriting.typeChar')}

              <div class="d-flex gap-2 mt-3">
                <button class="btn btn-primary" onclick="TrainWriting.submit()">Submit</button>
                <button class="btn btn-outline-secondary" onclick="TrainWriting.skip()">Skip</button>
                <button class="btn btn-outline-info ms-auto" data-bs-toggle="modal"
                  data-bs-target="#tw-help-modal">Reference</button>
              </div>
            </div>
          </div>
        </div>
      </div>
      ${helpModal('tw', font)}
    `;
  },

  init() {
    this.stats = { correct: 0, incorrect: 0, skipped: 0 };
    this.typed = ''; this.answered = false;
    this.nextCard();
  },

  setDifficulty(level) {
    qsa('[data-prefix="TrainWriting"]').forEach(b => b.classList.toggle('active', +b.dataset.level === level));
    this.nextCard();
  },

  getPool() {
    const maxC = +(el('tw-commonality')?.value || 6);
    const len  = el('tw-length')?.value || 'medium';
    const diff = +(qs('[data-prefix="TrainWriting"].active')?.dataset.level || 1);
    const maxLen = [4, 7, 12, 25, 9999][diff - 1];
    let types = len === 'word' ? ['word'] : len === 'short' ? ['word','phrase'] : len === 'medium' ? ['phrase'] : ['phrase'];
    let pool = App.getWords(maxC, types).filter(w => w.text.length <= maxLen);
    return pool.length ? pool : App.getWords(10, ['word']);
  },

  expectedText(item) {
    return item.type === 'word' ? item.text.toLowerCase() : item.text;
  },

  nextCard() {
    const pool = this.getPool();
    if (!pool.length) return;
    this.current = randomFrom(pool);
    this.answered = false; this.typed = '';
    const d = el('tw-display');
    if (d) { d.textContent = this.expectedText(this.current); d.style.fontFamily = ''; }
    this.updateOutput();
    const fb = el('tw-feedback');
    if (fb) { fb.textContent = ''; fb.className = 'small mb-2'; }
  },

  typeChar(ch) { if (!this.answered) { this.typed += ch; this.updateOutput(); } },
  backspace()  { this.typed = this.typed.slice(0,-1); this.updateOutput(); },
  clear()      { this.typed = ''; this.updateOutput(); },

  updateOutput() {
    const t = el('tw-typed');
    if (t) { t.textContent = this.typed; applyFont(t, App.currentFont); }
  },

  submit() {
    if (this.answered || !this.current) return;
    const expected = this.expectedText(this.current);
    const isCorrect = normalize(this.typed) === normalize(expected);
    this.answered = true;
    const fb = el('tw-feedback');
    if (fb) {
      fb.className = `small mb-2 ${isCorrect ? 'text-success' : 'text-danger'}`;
      if (isCorrect) {
        fb.textContent = '✓ Correct';
      } else {
        fb.innerHTML = `✗ Incorrect — answer: <span style="font-family:'${App.currentFont}',serif">${escapeHtml(expected)}</span>`;
      }
    }
    if (isCorrect) {
      this.stats.correct++; if(el('tw-correct')) el('tw-correct').textContent = this.stats.correct;
      setTimeout(() => this.nextCard(), 1200);
    } else {
      this.stats.incorrect++; if(el('tw-incorrect')) el('tw-incorrect').textContent = this.stats.incorrect;
    }
  },

  skip() {
    this.stats.skipped++; if(el('tw-skipped')) el('tw-skipped').textContent = this.stats.skipped;
    this.nextCard();
  }
};
