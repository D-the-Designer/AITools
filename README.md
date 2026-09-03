# AI Prompt Compendium — Build Project

This is the actual code behind **this specific** compendium (the one with your prompts already in it). Run it yourself any time you want to add prompts without going back through Claude.

**Want to build a brand-new, empty compendium of your own instead?** You don't need any of this — use `AI_Prompt_Compendium_Builder.html` on its own. It's a self-contained tool (no install, no Node, works offline) where anyone can add their own prompts through a form, and everything saves in their browser automatically. See the "Builder tool" section near the bottom of this file.

## Setup (one-time)

Requires [Node.js](https://nodejs.org) installed.

```
npm install
```

## Adding new prompts

1. Open `data3.js` (or start a new `data4.js` for a new batch — remember to `require()` and `.concat()` it in both `build.js` and `build_html.js` if you do).
2. Add a new entry to the array:
   ```js
   {model: "Tool name", subject: "Short label", text: `Full prompt text here`},
   ```
   Always add new entries at the **end** of the last file — this keeps everyone's Archive # numbers stable.
3. Save the file.

## Rebuilding both documents

```
node build.js
node build_html.js
```

This regenerates:
- `AI_Prompt_Compendium.docx` — the Word document (title page, clickable TOC, redaction log, category sections)
- `AI_Prompt_Compendium_Copyable.html` — the standalone browser tool (search, filter, sidebar TOC, per-prompt Copy buttons)

Both scripts write into `../outputs` by default — edit the `fs.writeFileSync(...)` path at the bottom of each file if you want them somewhere else.

## Checking your category assignments

Before rebuilding, it's worth sanity-checking how the new entries got classified:

```js
node -e "
const data1 = require('./data.js');
const data2 = require('./data2.js');
const data3 = require('./data3.js');
const data = data1.concat(data2).concat(data3);
const { classify, CATEGORIES } = require('./categorize.js');
const counts = {};
data.forEach(d => { const c = classify(d); counts[c] = (counts[c]||0)+1; });
CATEGORIES.forEach(c => console.log(c, '->', counts[c]||0));
console.log('TOTAL', data.length);
"
```

If a new entry lands somewhere unexpected, it's almost always because a keyword in `categorize.js` matched a substring it shouldn't have (e.g. "mage" inside "image" — already patched, but the pattern can recur with new keywords). Add a word-boundary regex (`/\bkeyword\b/i`) instead of a plain substring check if this happens.

## Adding a whole new category

Add the category name to the `CATEGORIES` array in `categorize.js`, then add a detection rule for it near the top of `classify()` — order matters, since the first matching rule wins.

## Files in this project

- `data.js`, `data2.js`, `data3.js` — the prompt entries, batch by batch
- `categorize.js` — the shared classifier (category list + keyword rules), used by both builders
- `build.js` — generates the Word document
- `build_html.js` — generates the HTML tool
- `AI_Prompt_Compendium_System_Spec.md` — the full written spec for this system
- `AI_Prompt_Compendium_Builder.html` — see below

## Builder tool (no code required — this is the one to share with other people)

`AI_Prompt_Compendium_Builder.html` is a completely separate, empty-by-default tool. Anyone can:

1. Open the file in any browser (double-click it, no install, no internet connection needed).
2. **See it populated with example entries on first visit** — a handful of demo prompts across a few generic categories, so the tool isn't a blank void the first time you open it. A "Clear examples & start fresh" button removes just the demo content, leaving anything you've added yourself untouched.
3. Click **+ Add Prompt** for one at a time, or **+ Bulk Add** to paste a wall of prompts (separated by blank lines or `---`) and add many at once — attribution (`Name (@handle)`) and category are auto-detected per prompt, with a review screen before anything is committed.
4. Click **Auto-suggest** to get a category guess for a single prompt (based on the same keyword logic as `categorize.js`, ported to browser JS) — or pick one manually, or type a brand new category name. There's also a **"Try example categories"** button that swaps in a more elaborate starting taxonomy (the same 17-category system used in the populated compendium) if the default generic set doesn't fit.
5. Everything is saved automatically to that browser's local storage on that device — closing the tab and reopening the file later keeps everything.
6. Use **Export** to download a `.json` backup (for safekeeping, or to move to another computer/browser), and **Import** to load one back in — either replacing everything or merging on top of what's already there. A dismissible banner nudges you to export if it's been a while since your last backup.
7. Use **Print / Save PDF** to get a clean printable version through the browser's own print dialog.
8. **Drop a reference image onto any entry** to keep a visual alongside the prompt — stored locally per-device (IndexedDB), never included when you hit Copy.

This is intentionally disconnected from the Node project above — it's meant to be handed to someone with zero setup and zero coding, so they can build their own compendium from their own prompt collection, with their own categories, independent of yours. Nothing in it talks to a server; it never leaves their machine unless they explicitly export and share the file.

