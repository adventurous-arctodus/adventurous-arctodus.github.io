# Scripts — Cipher Practice Application

A medieval-themed web application for practicing 1:1 cipher scripts. Hosted freely on GitHub Pages.

---

## Setup

### 1. Fork / Clone this Repository

```bash
git clone https://github.com/yourusername/scripts
cd scripts
```

### 2. Enable GitHub Pages

In your repository settings → Pages → Deploy from branch → `main` / root.

Your app will be live at `https://yourusername.github.io/scripts/`

---

## Adding Your Cipher Fonts

Place `.ttf` or `.otf` font files in the `/fonts/` directory.

Then register them in `data/scripts.json`:

```json
{
  "scripts": [
    {
      "id": "myscript",
      "name": "My Cipher",
      "fontFile": "mycipher.ttf",
      "description": "A description of this script",
      "public": false
    }
  ],
  "passwordHash": "YOUR_SHA256_HASH_HERE"
}
```

**Important:** The cipher font must be a **1:1 cypher** — meaning each standard Latin character (a-z, A-Z, 0-9, punctuation) maps to a unique glyph in the same Unicode position. The font is loaded and each key on the virtual keyboard renders using the font, so the mapping is entirely font-driven.

---

## Setting the Password

The password is stored as a **SHA-256 hash** in `data/scripts.json`.

To generate a hash for your password:

**In your browser console:**
```javascript
const msg = 'yourpassword';
const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(msg));
console.log([...new Uint8Array(buf)].map(b=>b.toString(16).padStart(2,'0')).join(''));
```

**Or using Node.js:**
```bash
node -e "const crypto=require('crypto');console.log(crypto.createHash('sha256').update('yourpassword').digest('hex'))"
```

The default password is **`admin`** (hash: `8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918`)

---

## Public vs Private Scripts

- `"public": true` — visible to guests (no password)
- `"public": false` — only visible after entering the password

---

## Adding Words & Phrases

Edit `data/wordlist.json`. Each entry:

```json
{
  "text": "the word or phrase",
  "commonality": 3,
  "type": "word"
}
```

| Field | Values | Notes |
|-------|--------|-------|
| `text` | Any string | Single words or full phrases |
| `commonality` | 1–10 | 1 = most common, 10 = rarest |
| `type` | `"word"`, `"phrase"`, `"paragraph"` | Controls which length filters include it |

**Commonality Guide:**
- 1–2: Core vocabulary (the, and, I, is…)
- 3–4: Everyday words
- 5–6: Common medieval vocabulary
- 7–8: Specialized terms (knight, trebuchet…)
- 9–10: Rare or archaic words

**Adding proper names or custom words:**
```json
{"text": "Aldric", "commonality": 8, "type": "word", "category": "name"},
{"text": "Caer Dwyrain", "commonality": 9, "type": "word", "category": "place"}
```

The `category` field is optional and for your reference only.

---

## Screen Guide

| Screen | What you do | Input method |
|--------|-------------|--------------|
| **Learn: Reading** | See a character in the Script → type its Latin equivalent | Physical keyboard |
| **Learn: Writing** | See a Latin character → type its Script equivalent | Virtual on-screen keyboard |
| **Train: Reading** | See a word/phrase in the Script → type in Latin | Physical keyboard |
| **Train: Writing** | See a Latin word/phrase → type in Script | Virtual on-screen keyboard |

### Difficulty Levels (Learn screens)
The 26 letters are divided by English letter frequency:
- **Level 1**: e, t, a, o, i (most common)
- **Level 2**: n, s, h, r, d
- **Level 3**: l, c, u, m, w
- **Level 4**: f, g, y, p, b
- **Level 5**: v, k, j, x, q, z + numbers + punctuation

### Max Commonality (Train screens)
Controls which words are included. "Very Common" shows only the most frequent words; "All Words" includes everything in your wordlist.

---

## File Structure

```
scripts/
├── index.html           ← Main app
├── css/
│   └── style.css        ← All styles
├── js/
│   ├── core.js          ← App state, font loading, CharSets
│   ├── screens.js       ← All four practice screens
│   └── app.js           ← Routing, login, nav
├── data/
│   ├── scripts.json     ← Script configuration & password hash
│   └── wordlist.json    ← Words and phrases for practice
├── fonts/               ← Place your .ttf or .otf files here
│   └── (your fonts)
└── README.md
```

---

## Notes

- **No server required.** Everything runs in the browser. GitHub Pages serves static files perfectly.
- **Session-based auth.** The password check is client-side (SHA-256). This is appropriate for keeping casual observers out of private scripts — it is not intended as high-security access control.
- **Font glyphs.** If a character has no glyph in the font, the browser will render a fallback. In Train mode, missing glyphs are treated as "skip this character" — you don't need to type them.
- **Adding more scripts.** Just add the font file and a new entry in `scripts.json`. No code changes needed.
