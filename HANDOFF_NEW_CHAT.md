# Handoff: AI Prompt Compendium — for a new chat

**Written by:** Claude (Anthropic), for D the Designer (@D_the_Designer)
**Date of handoff:** August 2026
**Current state:** 1,006 entries, 19 categories grouped into 2 sections, two live GitHub Pages sites, kept in sync across two repos.

Read this fully before touching anything. Several parts of this system exist specifically *because* an earlier, simpler version of them broke in a way that quietly corrupted data — the fixes are non-obvious if you're just reading the code cold.

---

## 1. What this project is

Two related but independent deliverables, built from the same underlying data:

1. **D's own curated, populated compendium** of AI image/video/audio generation prompts — pulled from her Midjourney history, screenshots of X/Twitter threads from other prompt-sharing creators (with attribution), and her own original prompts for her "Orphan Sky" fiction universe and a Star Trek fan film she's producing. Ships as a Word document and a browsable, **editable**, testable HTML tool.
2. **A blank, reusable Builder** that anyone can use to build their own independent prompt archive from scratch — unrelated to D's content, fully self-contained, runs entirely client-side.

Both share a visual identity: a green-phosphor "Hazeltine CRT terminal" look (near-black background, terminal green `#33ff33` accent, scanline overlay, a real embedded OCR-A font) and both credit D the Designer with a link to her X account in the footer.

## 2. Where things live

**Two GitHub repos, kept in sync on every update** (same files pushed to both):
- `https://github.com/D-the-Designer/AITools`
- `https://github.com/D-the-Designer/prompt-compendium`

Each repo root contains:
- `index.html` — the blank Builder tool
- `compendium.html` — D's populated archive (1,006 entries)
- `README.md`, `LICENSE` (MIT)
- **`source/`** — the actual Node.js source project (`data.js`, `categorize.js`, `build.js`, `build_html.js`, `package.json`). This was added specifically so a fresh session can pull the real source from GitHub instead of reconstructing the build scripts from memory after a sandbox reset. **Always check here first** before rebuilding anything from scratch.

**GitHub Pages is live on both:**
- `https://d-the-designer.github.io/prompt-compendium/` (blank builder)
- `https://d-the-designer.github.io/prompt-compendium/compendium.html` (populated archive — this is the one D shares)
- AITools repo has the equivalent Pages URLs too

## 3. Recovering after a sandbox reset (this WILL happen — read this first)

The Claude sandbox this work runs in resets periodically, wiping the whole working directory. **This has already happened multiple times during this project.** The recovery procedure that's worked every time:

```bash
mkdir -p /home/claude/promptdoc && cd /home/claude/promptdoc

# 1. Pull the actual Node source straight from the repo (fastest, safest — do this first)
curl -sL -o data.js "https://raw.githubusercontent.com/D-the-Designer/prompt-compendium/main/source/data.js"
curl -sL -o categorize.js "https://raw.githubusercontent.com/D-the-Designer/prompt-compendium/main/source/categorize.js"
curl -sL -o build.js "https://raw.githubusercontent.com/D-the-Designer/prompt-compendium/main/source/build.js"
curl -sL -o build_html.js "https://raw.githubusercontent.com/D-the-Designer/prompt-compendium/main/source/build_html.js"
curl -sL -o package.json "https://raw.githubusercontent.com/D-the-Designer/prompt-compendium/main/source/package.json"

# 2. build_html.js also needs the OCR-A font as base64 (Public Domain, see §9) — re-fetch and re-encode it:
curl -sL -o OCRA.otf "https://raw.githubusercontent.com/opensourcedesign/fonts/master/OCR/OCRA.otf"
node -e "const fs=require('fs'); fs.writeFileSync('ocra_base64.txt', fs.readFileSync('OCRA.otf').toString('base64'));"

npm install
mkdir -p /mnt/user-data/outputs
node build.js && node build_html.js
```

**Before doing anything else, verify the recovered data matches what's actually live** (don't just trust the repo blindly — confirm it's current):
```bash
curl -sL "https://raw.githubusercontent.com/D-the-Designer/prompt-compendium/main/compendium.html" -o /tmp/live.html
node -e "
const fs = require('fs');
const html = fs.readFileSync('/tmp/live.html', 'utf-8');
const m = html.match(/<script id=\"prompt-data\" type=\"application\/json\">([\s\S]*?)<\/script>/);
console.log('live entries:', JSON.parse(m[1]).length);
"
```
Compare that count against what your rebuilt `data.js` produces. If `source/` in the repo is ever stale relative to `compendium.html` itself (shouldn't happen if the workflow below is followed, but check), fall back to extracting the dataset straight out of `compendium.html`'s embedded JSON and reconstructing `data.js` from that — this has been done successfully before too (see git history / prior handoff for the script pattern, it's straightforward: regex out the `<script id="prompt-data">` JSON block, map to `{model, attribution, subject, text}` objects, write as a JS module).

**GitHub API tip:** `raw.githubusercontent.com` is CDN-cached and can lag a few minutes behind a push. To verify a push actually landed, use the API with `Accept: application/vnd.github.v3.raw` instead, which isn't cached:
```bash
curl -s -H "Authorization: Bearer $TOKEN" -H "Accept: application/vnd.github.v3.raw" \
  "https://api.github.com/repos/D-the-Designer/prompt-compendium/contents/compendium.html"
```

## 4. Data schema

Every entry in `data.js` is a plain JS object:
```js
{ model: string, attribution: string|null, subject: string, text: string }
```
- **`model`** — the tool/platform, as stated by the source. `"Unspecified"` (+ parenthetical context) if unknown.
- **`attribution`** — who created/shared it, or `null` if genuinely unknown. **Never guess this.** Only set it when the source explicitly states it, or when content is unmistakably D's own (uses her established fictional-universe terms: "Orphan Sky," "CoModularism," "Erebus," "AWC," "ReDep," or her Star Trek fan-film project). If someone corrects an attribution (this has happened — a contributor was initially misnamed "Vigo Chen" and corrected to "Vigo Zhao"), fix it in place rather than adding a duplicate entry.
- **`subject`** — a short human-readable label. Hand-write these for one-at-a-time additions; auto-derive (trim to ~70–90 chars at a word boundary) only for bulk imports.
- **`text`** — the prompt, verbatim, except specific redacted tokens (§5).

At build time two more fields get computed, never stored:
- **`id`** — 1-indexed position in `data.js`. This is the permanent "Archive #" shown everywhere. **New entries always go at the very end of the array** — never insert mid-file, that renumbers everyone after the insertion point.
- **`category`** — computed by `classify()` in `categorize.js`.

## 5. Redaction policy

**Default: include everything verbatim.** Only redact when a prompt does one of these two things:

1. **Names a real, identifiable, living public figure** in a way that reads as generating a realistic fabricated scenario about them specifically. Replace with `[public figure redacted]`.
2. **Names a specific copyrighted character, vehicle, franchise-specific location, or exact-title-as-style-clone-target** as the literal subject. Replace with `[redacted IP]`.

**Do NOT redact:**
- Real names used purely as a likeness/style anchor for fictional character art ("actor X as a space wizard").
- Genre/aesthetic references to real films, artists, or franchises ("blade runner cyberpunk aesthetic," two-plus classic film titles cited together as mood reference).
- A franchise name used only as a **negative/avoid** instruction ("no Star Wars style clutter") — telling the model what *not* to look like is the opposite of an infringement request.
- Generic anatomical/physical descriptions of an alien species that don't literally name the copyrighted franchise, even if the description clearly evokes one (e.g. D's Andorian-style fan-film character spec describes blue skin, sensory stalks, etc. without ever writing "Andorian" or "Star Trek" — left unredacted on that basis).

**Every redaction gets logged** in the hardcoded `redactions` array near the top of `build.js` (`{where, what, replacement, why}`), which ships as its own page in the Word doc right after the title page.

## 6. The category system — two-tier, added recently

`categorize.js` exports `{ classify(entry), CATEGORIES, SECTIONS }`.

**`SECTIONS`** is the newest addition (added this session) — a lightweight *display* grouping, layered on top of the flat category list, with zero effect on classification logic itself:
```js
const SECTIONS = [
  { title: "Styles & Art Techniques", categories: [
      "Art Styles", "Graphic Design & Typography Systems",
      "Anime, Manga & Stylized Illustration",
      "Retrofuturism, Cassette Futurism & Used-Future Sci-Fi",
      "Reference Lists (Artists & Style Names)" ] },
  { title: "Subjects, Projects & Systems", categories: [ /* the other 14 */ ] },
];
const CATEGORIES = SECTIONS.flatMap(s => s.categories);
```
Both `build.js` and `build_html.js` render `SECTIONS` as headers grouping their categories — in the docx's TOC (quick-jump + full-contents) and as title-page dividers before each section's content, and in the HTML's sidebar TOC and main content area. If you add a new category, decide which section it belongs in and add it to the right `categories` array — don't just append to a flat list anymore.

`classify()` runs a fixed, ordered list of keyword/regex checks — **first match wins**, ordering is load-bearing. Roughly: JSON/system-prompt detection → Art Styles tag detection → GPT-workflow detection → graphic-design-technique detection → Star Trek fan-film detection → video/camera-motion detection → placeholder-template detection → reference-list detection → real-person-likeness → retrofuturism → biomechanical → fantasy → fashion → anime → horror → posters → space → product → general catch-all.

**Real bugs already found and fixed here — don't reintroduce them:**

1. **Substring collisions.** `"mage"` matches inside "i**mage**" via plain `.includes()`. Fixed with `\bmage\b` word-boundary regex. Sanity-check any new short keyword against common words like "image" before shipping.
2. **Redaction markers look like templates.** `[redacted IP]` / `[public figure redacted]` are lowercase-bracketed, so a naive placeholder-detector matches them as if they were `[SUBJECT]`-style user templates. Fixed by stripping those two strings before running the placeholder regex.
3. **Priority ordering matters.** A prompt using a named video model (Kling, Seedance, Runway) that also happens to contain one incidental `[bracket]` for something else should classify as Video, not Templates — video-motion detection runs *before* the placeholder check specifically because of this.
4. **New-category "signal" needs to be distinctive.** When "Art Styles" was created, the detection isn't keyword-based like the others — it's a literal tag (`[art style only — subject stripped]`) that gets written into the entry text itself when D asks to "strip the subject, keep only the style" from an existing prompt and repost it. Follow that same pattern for similar future asks rather than inventing fragile new keyword heuristics.

**Whenever you change a rule, re-run classification across the whole corpus and diff against the previous result before shipping:**
```js
const data = require('./data.js');
const { classify, CATEGORIES } = require('./categorize.js');
const counts = {};
data.forEach(d => { const c = classify(d); counts[c] = (counts[c]||0)+1; });
CATEGORIES.forEach(c => console.log(c, '->', counts[c]||0));
```

## 7. The two-file HTML architecture

**`compendium.html`** (D's, generated by `build_html.js`) is no longer read-only — it grew real editing/testing features this session because D is planning to test every one of the 1,006 prompts:

- **Tested checkbox** per card, with a running "X / 1006 tested" progress pill in the header
- **Notes field** per entry (click "+ notes")
- **Edit modal** — revise model/subject/text if testing reveals a prompt needs tweaking; a "Revert to original" button clears just the edit while preserving tested state and notes
- **Tested/Untested filter** dropdown
- **Copy button copies the edited version** if one exists, not the stored original
- **Export/Import my notes** buttons (JSON backup) — since all of this (tested flags, notes, edits, *and* the pre-existing per-entry reference-image drop feature) lives in **that specific browser's** `localStorage`/`IndexedDB`, keyed by the stable Archive #, layered on top of the base data at render time. It survives regeneration of the file (since IDs are stable) but does NOT sync across browsers/devices — that's what the export button is for.

All of this was verified with actual jsdom functional tests (mark tested → check progress pill updates; add notes → persists; edit → save → verify text changed and tested-state preserved; revert → verify original restored; filter → verify correct subset shown) before shipping, not just written and assumed to work.

**`index.html`** (the Builder, hand-edited directly, no build step) is the separate blank tool for other people. It has its own feature set: Add/Edit/Delete via modal, **Bulk Add** (paste-and-split with auto-attribution-detection and auto-category-suggestion), demo/starter data seeded on first visit only, two selectable starting taxonomies, export-nudge banner, and the same per-entry image-drop feature. If you touch `categorize.js`'s real classifier, remember the Builder has its own simplified JS port of the same logic for its "Auto-suggest" button — keep them in sync by hand if you make a meaningful change.

## 8. Verification pattern — do this on every change, not just big ones

1. Add/edit data → confirm it `require()`s without a syntax error.
2. Run `classify()` on the new/changed entry, and re-run the full-corpus distribution diff (§6) if `categorize.js` changed.
3. Rebuild both `.docx` and `.html`.
4. **Diff `id` and `category` between the two outputs, entry-by-entry — zero mismatches, always.** This is the single most important check in the project, since both files are generated independently from the same data.
5. For anything in the HTML's client-side JS, actually simulate the interaction (jsdom, with `fake-indexeddb` and stubbed `URL.createObjectURL`/`confirm`/`alert` where needed) rather than just reading the code. This has caught real bugs multiple times.
6. For the docx, convert to PDF and spot-check with `pdftotext`/`pdfinfo` — page count sanity, redaction markers present, new entry appears in the right place.
7. **Before pushing:** confirm the remote hasn't moved since you last recovered from it (`curl` the live `compendium.html`, check entry count matches your expectation). If your local git history doesn't share ancestry with the remote (common right after a sandbox-reset recovery, since you're starting a fresh `git init`), use `git push --force-with-lease=main:$(git rev-parse <remote>/main) <remote> main` rather than a bare `--force`, so the push fails safely if the remote changed unexpectedly instead of clobbering something.
8. **After pushing:** verify via the GitHub API with the raw-content `Accept` header (not `raw.githubusercontent.com`, which caches) that the change actually landed.

## 9. Visual identity — do not casually restyle this

- Palette, font, and layout are all controlled via CSS custom properties (`--bg`, `--panel`, `--panel-border`, `--ink`, `--ink-dim`, `--accent`, `--accent-dim`, `--mono`, `--ocr`, `--sans`) — **never hardcode a hex color or font name**, or a future palette change will miss it. This has already bitten the project once (a few `#0d0f0d` hardcoded button-hover colors survived an earlier gold→green palette swap; caught and fixed).
- Green phosphor Hazeltine CRT look: near-black bg (`#030a03`), bright terminal green accent (`#33ff33`), scanline texture + vignette via `body::after`, soft glow `text-shadow` on headers/labels.
- Font is real **OCR-A** — [John Sauter's Public Domain reproduction](https://sourceforge.net/projects/ocr-a-font/), ANSI X3.17-1977 conformant, not a lookalike. Embedded inline as base64 inside a `@font-face` rule (not linked externally) so both HTML files stay fully self-contained/offline-capable, no Google Fonts dependency. `--mono`, `--ocr`, and `--sans` all currently point to the same OCR-A stack — every piece of text in both tools uses it, not just headers.
- Footer credit: `compendium.html` says "Curated by D the Designer"; the Builder says "Tool by D the Designer" (different framing on purpose — one's her content, one's a tool for other people's content). Both link to `https://x.com/D_the_Designer`.

## 10. GitHub push workflow

No CI — pushing is manual, from a local clone, using a Personal Access Token D provides directly in chat when asked. Pattern used throughout:
```bash
cd <local clone>
git add -A
git commit -m "<description>"
git remote add origin "https://x-access-token:$TOKEN@github.com/D-the-Designer/<repo>.git"
git push origin main   # or --force-with-lease if history diverged, see §8
git remote remove origin
```
Repeat for both `AITools` and `prompt-compendium` — they should always carry identical content. **Recommend the person revoke/rotate any token once you're done with it**, since anything typed in a chat transcript should be treated as semi-exposed.

## 11. Current stats (at time of this handoff)

**1,006 entries**, 19 categories, 2 sections:

**Styles & Art Techniques** (207 entries): Art Styles (1), Graphic Design & Typography Systems (6), Anime/Manga & Stylized Illustration (29), Retrofuturism/Cassette Futurism (166), Reference Lists (5)

**Subjects, Projects & Systems** (799 entries): Structured/JSON System Prompts (21), GPT Workflows (1), Reusable Templates (19), Star Trek Fan Film (2), Video/Camera-Motion (29), Real-Person-Likeness Portraits (20), Biomechanical/Cyborg/Body-Horror (30), Fantasy/Dark-Fantasy (28), Fashion/Couture (21), Horror/Cosmic Horror (45), Posters/Propaganda (45), Space/Sci-Fi Environments (296 — by far the largest, mostly from D's own Midjourney archive), Product/Object/Tech Renders (21), Characters/Creatures General catch-all (221)

**Known attributed contributors besides D herself:** Vigo Zhao (@VigoCreativeAI, 5 entries), Gadgetify (@Gdgtify), Emily (@IamEmily2050, 2 entries), Art Muse (@art_muse), Amira Zairi (@azed_ai), Yunan Helmy A (@unxinstudio), Skipper VanderWall (@RobotCleopatra), Framer_X (@Framer_X), @floraai, @ChrisKE, Larus Canus (@MrLarus), LudovicCreator (@LudovicCreator), Israa Ali (@Israa_Ali2077), Sairah (@Sairah_0), Dana Wylie.

Redaction log currently has ~13 logged redactions — check `build.js`'s `redactions` array for the exact current list.

## 12. Open items / things D has mentioned but not asked for yet

- Possibly importing the rest of D's Midjourney archive (only 2 of what may be many more raw scraper-export files have been processed, ~2,583 raw entries → 721 kept after dedup/filter). If more files show up, revisit the dedup/filter/redaction-scan process fresh rather than assuming the same thresholds apply.
- A pass to double-check attribution completeness on the earliest batches — attribution was added as a feature partway through the project, older entries were only retroactively attributed where the source was already obviously stated.
- Smaller usability ideas discussed but not built: stats/dashboard view, free-form tags separate from category, a changelog page, exporting images alongside JSON backups.
- The Builder tool's "Auto-suggest" JS port of the classifier hasn't been updated to match the newest `categorize.js` rules (Art Styles tag, Trek fan-film keywords, broadened system-prompt detection) — worth syncing if it comes up.

---

If anything here conflicts with what you observe in the actual files, trust the files — written from the outside looking in, may drift from the code over time. D has been closely involved in every decision described here and can clarify intent quickly if you ask.
