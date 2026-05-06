# Hynafol Scripts Trainer

A web application for practicing 1:1 cipher scripts. Hosted freely on GitHub Pages.

---

## Setup

### 1. Place files in a subfolder of your GitHub Pages repository

```
hynafol_scripts_trainer/
├── index.html
├── css/style.css
├── js/
│   ├── core.js
│   ├── screens.js
│   └── app.js
├── data/
│   ├── scripts.json
│   └── wordlist.json
└── fonts/
    └── (your .ttf or .otf files)
```

Access at: `https://yourusername.github.io/hynafol_scripts_trainer/`

### 2. Enable GitHub Pages

Repository Settings → Pages → Deploy from branch → `main` / root.

---

## Password

The password is stored as a SHA-256 hash in `data/scripts.json`.

**Generate a hash in your browser console:**
```javascript
const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('yourpassword'));
console.log([...new Uint8Array(buf)].map(b=>b.toString(16).padStart(2,'0')).join(''));
```

The default password is **`admin`**.

---

## Configuring Scripts (`data/scripts.json`)

Each entry in the `scripts` array represents one cipher font.

```json
{
  "scripts": [
    {
      "id": "myscript",
      "name": "Display Name",
      "fontFile": "myfont.ttf",
      "fontChars": "abcdefghijklmnopqrstuvwxyz",
      "symbolGroups": [
        ["a", "A"],
        ["u", "v"]
      ]
    }
  ],
  "passwordHash": "YOUR_SHA256_HASH"
}
```

### Fields

| Field | Required | Description |
|-------|----------|-------------|
| `id` | Yes | Unique identifier, no spaces |
| `name` | Yes | Display name shown in the selector |
| `fontFile` | Yes | Filename of the font, placed in `/fonts/` |
| `fontChars` | Yes | A string listing every character the font has a glyph for. Characters not in this string are excluded from all pools and keyboards. |
| `symbolGroups` | No | Array of arrays. Each inner array lists characters that render identically in this font — any answer within the same group is accepted as correct. |

### `fontChars` example

Lowercase only:
```json
"fontChars": "abcdefghijklmnopqrstuvwxyz.,!?'-"
```

Both cases plus numbers and punctuation:
```json
"fontChars": "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.,!?'-:;"
```

### `symbolGroups` examples

**Same glyph for upper and lowercase** (most common case):
```json
"symbolGroups": [
  ["a","A"],["b","B"],["c","C"],["d","D"],["e","E"],["f","F"],["g","G"],
  ["h","H"],["i","I"],["j","J"],["k","K"],["l","L"],["m","M"],["n","N"],
  ["o","O"],["p","P"],["q","Q"],["r","R"],["s","S"],["t","T"],["u","U"],
  ["v","V"],["w","W"],["x","X"],["y","Y"],["z","Z"]
]
```

**Different letters sharing a glyph** (e.g. U and V use the same symbol):
```json
"symbolGroups": [
  ["u", "v", "U", "V"],
  ["i", "j", "I", "J"]
]
```

Any answer within a group is accepted as correct for any other member. The answer advances without credit.

---

## Adding Words and Phrases (`data/wordlist.json`)

The wordlist is a JSON file with a single `words` array. Each entry is an object.

### Fields

| Field | Required | Type | Description |
|-------|----------|------|-------------|
| `text` | Yes | string | The word or phrase. Single words should be lowercase unless a proper noun. Phrases use normal capitalisation. |
| `commonality` | Yes | number 1–10 | How common or rare the entry is. 1 = most common, 10 = rarest. Controls the **Word Rarity** filter. |
| `type` | Yes | string | `"word"`, `"phrase"`, or `"paragraph"`. Determines which Max Length settings include this entry. |
| `level` | No | number 1–5 | Marks that this entry uses mostly letters from that difficulty level. When enough level-tagged entries exist, the app draws preferentially from them at that difficulty. |
| `category` | No | string | Free-form tag for your own reference. Not used by the app. |

### Commonality scale

| Value | Description | Examples |
|-------|-------------|---------|
| 1–2 | Core vocabulary | the, and, is, I, a, to |
| 3–4 | Everyday words | water, come, good, year, part |
| 5–6 | Common / general medieval | light, life, night, sword, horse |
| 7–8 | Specialised or less common | herald, cobbler, spindle, lantern |
| 9–10 | Rare or archaic | seneschal, trebuchet, gambeson, pauldron |

### Type and Max Length mapping

| `type` | Appears in Max Length settings |
|--------|-------------------------------|
| `"word"` | Single Word / Proper Noun, Short, Medium, Long |
| `"phrase"` | Short (≤3 words), Medium (2–7 words), Long (8+ words) |
| `"paragraph"` | Long only |

### Difficulty level letter groups (for `level` field)

| Level | Letters added at this level | Full pool at this level |
|-------|----------------------------|------------------------|
| 1 | E, T, A, O, I | E T A O I |
| 2 | N, S, H, R, D | + N S H R D |
| 3 | L, C, U, M, W | + L C U M W |
| 4 | F, G, Y, P, B | + F G Y P B |
| 5 | V, K, J, X, Q, Z | All letters |

**How to classify a word or phrase by level:**

Tag an entry with the *highest* level needed to spell it. Go through each letter and find which level introduces it — the highest level among all letters in the entry is the `level` value.

Examples:
- `"eat"` — e(1), a(1), t(1) → all Level 1 → `"level": 1`
- `"stone"` — s(2), t(1), o(1), n(2), e(1) → highest is Level 2 → `"level": 2`
- `"cold"` — c(3), o(1), l(3), d(2) → highest is Level 3 → `"level": 3`
- `"bring"` — b(4), r(2), i(1), n(2), g(4) → highest is Level 4 → `"level": 4`
- `"vow"` — v(5), o(1), w(3) → highest is Level 5 → `"level": 5`
- `"the risen tide"` — all letters appear in Levels 1–2 → `"level": 2`

**Quick letter lookup:**

| Letter | Level | | Letter | Level | | Letter | Level |
|--------|-------|-|--------|-------|-|--------|-------|
| E | 1 | | N | 2 | | L | 3 |
| T | 1 | | S | 2 | | C | 3 |
| A | 1 | | H | 2 | | U | 3 |
| O | 1 | | R | 2 | | M | 3 |
| I | 1 | | D | 2 | | W | 3 |
| F | 4 | | V | 5 | | | |
| G | 4 | | K | 5 | | | |
| Y | 4 | | J | 5 | | | |
| P | 4 | | X | 5 | | | |
| B | 4 | | Q | 5 | | | |
| | | | Z | 5 | | | |

The `level` field is optional. If omitted, the entry is always eligible regardless of difficulty setting. If fewer than 3 level-tagged entries exist for the active difficulty, the app falls back to the full untagged pool automatically.

### Examples

```json
{"text": "eat", "commonality": 2, "type": "word", "level": 1},
{"text": "stone", "commonality": 4, "type": "word", "level": 2},
{"text": "send the horse", "commonality": 4, "type": "phrase", "level": 2},
{"text": "the", "commonality": 1, "type": "word"},
{"text": "The gate is open.", "commonality": 2, "type": "phrase"},
{"text": "The blacksmith worked long into the night.", "commonality": 4, "type": "phrase"},
{"text": "Aldric", "commonality": 8, "type": "word", "category": "name"},
{"text": "Caer Dwyrain", "commonality": 9, "type": "word", "category": "place"}
```

---

## Screens

### Reading
Shows a character or phrase **in the Script font**. Type the **Common** (Latin) equivalent using your keyboard.

- **Single Character mode**: one character at a time from the active difficulty pool, filtered by the Include checkboxes (Lowercase, Uppercase, Numbers, Punctuation).
- **Words & Phrases mode**: full words or phrases from the wordlist, filtered by Difficulty, Max Length, and Word Rarity.
- On an incorrect answer, the input unlocks — type the correct answer to advance. No credit is awarded.
- Enter key submits. On incorrect, Enter again confirms the correction once typed correctly.

### Writing
Shows a character or phrase **in Common**. Type the Script equivalent using the virtual on-screen keyboard.

- Same two modes as Reading.
- The virtual keyboard shows numbers, uppercase, and lowercase rows. Keys not in the script's `fontChars` are greyed out and disabled.
- On an incorrect answer, the keyboard stays active — clear and type the correct answer to advance. No credit is awarded.
- The Reference button shows a full cypher chart split into Capitals, Lowercase, Numbers, and Punctuation sections.

---

## Difficulty Levels (Single Character mode)

| Level | Letters included |
|-------|-----------------|
| 1 | E T A O I (and uppercase if enabled) |
| 2 | + N S H R D |
| 3 | + L C U M W |
| 4 | + F G Y P B |
| 5 | + V K J X Q Z, numbers, punctuation |

---

## Word Rarity vs. Frequency

Word Rarity is a **filter** — it controls the maximum rarity of words that can appear in the pool. Every word in the filtered pool has an equal chance of being selected. More common words do not appear more frequently than rare ones within the same pool.

---

## File Structure

```
hynafol_scripts_trainer/
├── index.html
├── css/
│   └── style.css          — Bootstrap dark + custom overrides
├── js/
│   ├── core.js            — App state, font loading, character sets, utilities
│   ├── screens.js         — Reading and Writing screen logic and rendering
│   └── app.js             — Login, routing, nav, script selection
├── data/
│   ├── scripts.json       — Script/font configuration and password hash
│   └── wordlist.json      — Words and phrases for practice
└── fonts/
    └── (your .ttf / .otf cipher font files)
```
