const fs = require("fs");
const data1 = require("./data.js");
const { classify, classifySubcategory, CATEGORIES, SECTIONS } = require("./categorize.js");

const rawData = data1;
const payload = rawData.map((d, i) => {
  const category = classify(d);
  return {
    id: i + 1,
    model: d.model,
    attribution: d.attribution || null,
    subject: d.subject,
    text: d.text,
    category,
    subcategory: classifySubcategory(d, category),
  };
});

const models = [...new Set(payload.map((p) => p.model))].sort();
const categoriesPresent = CATEGORIES.filter((c) => payload.some((p) => p.category === c));
const catCounts = Object.fromEntries(categoriesPresent.map((c) => [c, payload.filter((p) => p.category === c).length]));
const sectionedCategories = SECTIONS.map((s) => ({
  title: s.title,
  categories: s.categories.filter((c) => categoriesPresent.includes(c)),
})).filter((s) => s.categories.length > 0);
// Which categories actually have subcategory tags on any of their entries (drives whether
// the UI shows a subcategory sub-grouping / filter for that category at all).
const categoriesWithSubcats = new Set(payload.filter((p) => p.subcategory).map((p) => p.category));
const subcatsByCategory = Object.fromEntries(
  categoriesPresent
    .filter((c) => categoriesWithSubcats.has(c))
    .map((c) => [c, [...new Set(payload.filter((p) => p.category === c && p.subcategory).map((p) => p.subcategory))].sort()])
);

function escapeHtml(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function escapeAttr(s) {
  return escapeHtml(s).replace(/"/g, "&quot;");
}
function slug(s) {
  return "cat-" + s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

const FONT_FACE_PLACEHOLDER = "__OCR_A_FONT_FACE__";

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>AI Prompt Compendium — Copy Archive</title>
<style>
${FONT_FACE_PLACEHOLDER}
  :root{
    --bg: #030a03;
    --panel: #061206;
    --panel-border: #1c3d1c;
    --ink: #c8ffcf;
    --ink-dim: #4f8f52;
    --accent: #33ff33;
    --accent-dim: #1f9c22;
    --mono: "OCR A Std", "Consolas", "SF Mono", monospace;
    --ocr: "OCR A Std", "Consolas", monospace;
    --sans: "OCR A Std", "Helvetica Neue", Arial, sans-serif;
    --sidebar-w: 300px;
  }
  * { box-sizing: border-box; }
  html,body{
    margin:0; padding:0;
    background: var(--bg);
    color: var(--ink);
    font-family: var(--sans);
  }
  body{
    background-image:
      linear-gradient(180deg, rgba(51,255,51,0.06), transparent 260px),
      repeating-linear-gradient(0deg, rgba(0,0,0,0.22) 0px, rgba(0,0,0,0.22) 1px, transparent 1px, transparent 3px);
  }
  body::after{
    content: "";
    position: fixed; inset: 0; pointer-events: none; z-index: 999;
    background: radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.35) 100%);
  }
  .eyebrow, .cat-heading h2, .card-n, h1{
    text-shadow: 0 0 6px rgba(51,255,51,0.45);
  }
  header{
    position: sticky; top:0; z-index: 30;
    background: rgba(3,10,3,0.94);
    backdrop-filter: blur(6px);
    border-bottom: 1px solid var(--panel-border);
    padding: 16px 24px 14px;
    display: flex;
    align-items: center;
    gap: 16px;
  }
  .toc-toggle{
    display: none;
    background: var(--panel);
    border: 1px solid var(--panel-border);
    color: var(--ink);
    font-family: var(--mono);
    font-size: 12px;
    padding: 9px 12px;
    border-radius: 3px;
    cursor: pointer;
    flex: 0 0 auto;
  }
  .header-main{ flex: 1 1 auto; min-width: 0; }
  .eyebrow{
    font-family: var(--ocr);
    font-size: 11px;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--accent);
    margin: 0 0 6px;
  }
  h1{
    margin: 0 0 4px;
    font-size: 21px;
    font-weight: 600;
    letter-spacing: -0.01em;
  }
  .sub{
    margin: 0 0 14px;
    font-size: 12.5px;
    color: var(--ink-dim);
  }
  .controls{
    display:flex; gap:10px; flex-wrap: wrap; align-items:center;
  }
  input[type="search"]{
    flex: 1 1 280px;
    min-width: 200px;
    background: var(--panel);
    border: 1px solid var(--panel-border);
    color: var(--ink);
    padding: 9px 11px;
    border-radius: 3px;
    font-family: var(--mono);
    font-size: 13px;
    outline: none;
  }
  input[type="search"]:focus{ border-color: var(--accent-dim); }
  select{
    background: var(--panel);
    border: 1px solid var(--panel-border);
    color: var(--ink);
    padding: 9px 11px;
    border-radius: 3px;
    font-family: var(--mono);
    font-size: 12.5px;
    outline: none;
    max-width: 280px;
  }
  .count{
    font-family: var(--mono);
    font-size: 12px;
    color: var(--ink-dim);
    white-space: nowrap;
    padding-left: 4px;
  }
  .layout{
    display: flex;
    align-items: flex-start;
    max-width: 1240px;
    margin: 0 auto;
  }
  nav.toc{
    position: sticky;
    top: 89px;
    flex: 0 0 var(--sidebar-w);
    width: var(--sidebar-w);
    max-height: calc(100vh - 89px);
    overflow-y: auto;
    padding: 20px 14px 40px 24px;
    border-right: 1px solid var(--panel-border);
  }
  nav.toc::-webkit-scrollbar{ width: 8px; }
  nav.toc::-webkit-scrollbar-thumb{ background: var(--panel-border); border-radius: 4px; }
  .toc-title{
    font-family: var(--mono);
    font-size: 11px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--ink-dim);
    margin: 0 0 10px;
  }
  .toc-section-title{
    font-family: var(--ocr);
    font-size: 10.5px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--accent);
    margin: 18px 0 6px;
    padding-top: 10px;
    border-top: 1px solid var(--panel-border);
  }
  .toc-section-title:first-of-type{ margin-top: 4px; padding-top: 0; border-top: none; }
  .toc-cat{ margin-bottom: 2px; }
  .toc-cat-btn{
    width: 100%;
    display:flex; justify-content: space-between; align-items:center; gap: 8px;
    background: none;
    border: none;
    color: var(--ink);
    text-align: left;
    font-family: var(--sans);
    font-size: 12.5px;
    line-height: 1.35;
    padding: 7px 6px;
    border-radius: 3px;
    cursor: pointer;
  }
  .toc-cat-btn:hover{ background: var(--panel); }
  .toc-cat-btn .n{ color: var(--accent); font-family: var(--mono); font-size: 11px; flex: 0 0 auto; }
  .toc-cat-btn .arrow{ color: var(--ink-dim); font-size: 10px; flex: 0 0 auto; transition: transform 0.15s ease; }
  .toc-cat.open .toc-cat-btn .arrow{ transform: rotate(90deg); }
  .toc-entries{
    display: none;
    list-style: none;
    margin: 0 0 6px;
    padding: 0 0 0 10px;
    border-left: 1px solid var(--panel-border);
  }
  .toc-cat.open .toc-entries{ display: block; }
  .toc-entries li a{
    display: block;
    padding: 5px 8px;
    font-family: var(--mono);
    font-size: 11px;
    color: var(--ink-dim);
    text-decoration: none;
    line-height: 1.4;
    border-radius: 3px;
  }
  .toc-entries li a:hover{ color: var(--ink); background: var(--panel); }
  .toc-subcat-tag{ color: var(--accent); opacity: 0.8; }
  .subcat-heading{
    font-family: var(--mono); font-size: 12px; letter-spacing: 0.06em; text-transform: uppercase;
    color: var(--ink-dim); margin: 18px 0 8px; padding-bottom: 4px; border-bottom: 1px dashed var(--panel-border);
  }
  .card-style-tag{
    display: inline-block; font-family: var(--mono); font-size: 10px; color: var(--accent);
    border: 1px solid var(--accent-dim); border-radius: 3px; padding: 2px 6px; margin-top: 4px;
  }
  main{
    flex: 1 1 auto;
    min-width: 0;
    max-width: 900px;
    margin: 0 auto;
    padding: 24px 28px 100px;
  }
  .section-heading{
    font-family: var(--ocr);
    font-size: 13px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--ink-dim);
    margin: 44px 0 0;
    padding: 0 0 10px;
    border-bottom: 2px solid var(--panel-border);
  }
  main > .section-heading:first-child{ margin-top: 0; }
  .cat-heading{
    display: flex; align-items: baseline; gap: 10px;
    margin: 34px 0 4px;
    padding-top: 6px;
    scroll-margin-top: 96px;
  }
  .cat-heading:first-child{ margin-top: 0; }
  .cat-heading h2{
    margin: 0;
    font-size: 17px;
    font-weight: 600;
    letter-spacing: 0.03em;
    text-transform: uppercase;
    font-family: var(--ocr);
    color: var(--accent);
  }
  .cat-heading .cat-count{
    font-family: var(--mono);
    font-size: 11px;
    color: var(--ink-dim);
  }
  .cat-rule{
    border: none; border-top: 1px solid var(--panel-border);
    margin: 8px 0 18px;
  }
  .card{
    background: var(--panel);
    border: 1px solid var(--panel-border);
    border-radius: 4px;
    margin-bottom: 14px;
    overflow: hidden;
    scroll-margin-top: 96px;
  }
  .card-head{
    display:flex; align-items:flex-start; justify-content: space-between;
    gap: 12px;
    padding: 12px 14px 10px;
    border-bottom: 1px solid var(--panel-border);
  }
  .card-meta{ min-width: 0; }
  .card-n{
    font-family: var(--ocr);
    font-size: 10px;
    color: var(--accent);
    letter-spacing: 0.1em;
  }
  .card-model{
    font-family: var(--mono);
    font-size: 11px;
    color: var(--ink-dim);
    margin: 2px 0 4px;
  }
  .card-subject{
    font-size: 13.5px;
    line-height: 1.35;
    color: var(--ink);
  }
  .card-side{
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 8px;
    flex: 0 0 auto;
  }
  .img-slot{
    width: 56px; height: 56px;
    border: 1px dashed var(--panel-border);
    border-radius: 4px;
    display: flex; align-items: center; justify-content: center;
    cursor: pointer;
    position: relative;
    overflow: hidden;
    background: var(--bg);
    transition: border-color 0.15s ease, background 0.15s ease;
    flex: 0 0 auto;
  }
  .img-slot:hover{ border-color: var(--accent-dim); }
  .img-slot.has-image{ border-style: solid; border-color: var(--panel-border); }
  .img-slot img{ width: 100%; height: 100%; object-fit: cover; display: block; }
  .img-slot .hint{
    font-size: 8.5px; color: var(--ink-dim); font-family: var(--mono);
    text-align: center; line-height: 1.3; padding: 2px; pointer-events: none;
  }
  .img-slot.dragover{ border-color: var(--accent); background: rgba(51,255,51,0.12); }
  .img-slot .remove-btn{
    position: absolute; top: 2px; right: 2px;
    width: 16px; height: 16px; border-radius: 50%;
    background: rgba(0,0,0,0.75); color: #fff; border: none;
    font-size: 11px; line-height: 1; cursor: pointer; display: none;
    align-items: center; justify-content: center; padding: 0;
  }
  .img-slot.has-image:hover .remove-btn{ display: flex; }
  button.copy-btn{
    flex: 0 0 auto;
    background: transparent;
    border: 1px solid var(--accent-dim);
    color: var(--accent);
    font-family: var(--mono);
    font-size: 11px;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    padding: 8px 12px;
    border-radius: 3px;
    cursor: pointer;
    transition: background 0.15s ease, color 0.15s ease;
  }
  button.copy-btn:hover{ background: var(--accent-dim); color: var(--bg); }
  button.copy-btn.copied{
    background: var(--accent);
    border-color: var(--accent);
    color: var(--bg);
  }
  pre.card-text{
    margin: 0;
    padding: 14px;
    font-family: var(--mono);
    font-size: 12.5px;
    line-height: 1.55;
    color: #a8e6ac;
    white-space: pre-wrap;
    word-break: break-word;
    max-height: 340px;
    overflow-y: auto;
  }
  .card-text::-webkit-scrollbar{ width: 8px; }
  .card-text::-webkit-scrollbar-thumb{ background: var(--panel-border); border-radius: 4px; }
  .empty{
    font-family: var(--mono);
    color: var(--ink-dim);
    padding: 40px 0;
    text-align: center;
    font-size: 13px;
  }
  footer{
    max-width: 900px;
    margin: 0 auto;
    padding: 0 28px 60px;
    font-family: var(--mono);
    font-size: 11px;
    color: var(--ink-dim);
  }
  footer .credit{
    display: block;
    margin-top: 8px;
    font-family: var(--ocr);
    font-size: 11px;
    letter-spacing: 0.05em;
  }
  footer .credit a{
    color: var(--accent);
    text-decoration: none;
    border-bottom: 1px solid var(--accent-dim);
  }
  footer .credit a:hover{ border-bottom-color: var(--accent); }

  .tested-badge{
    display: inline-flex; align-items: center; gap: 4px;
    font-family: var(--mono); font-size: 10px; letter-spacing: 0.05em;
    cursor: pointer; user-select: none; padding: 4px 7px;
    border: 1px solid var(--panel-border); border-radius: 3px;
    color: var(--ink-dim); background: var(--bg);
    white-space: nowrap;
  }
  .tested-badge input{ accent-color: var(--accent); cursor: pointer; }
  .card.is-tested{ border-color: var(--accent-dim); }
  .card.is-tested .tested-badge{ color: var(--accent); border-color: var(--accent-dim); }
  .card.is-edited .card-subject::after{
    content: " (edited)"; color: var(--accent); font-size: 11px; font-style: italic;
  }
  .notes-toggle{
    background: none; border: none; color: var(--ink-dim); font-family: var(--mono);
    font-size: 10px; text-decoration: underline; cursor: pointer; padding: 0; text-align: left;
  }
  .notes-toggle:hover{ color: var(--accent); }
  .notes-area{ display: none; padding: 0 14px 12px; }
  .notes-area.open{ display: block; }
  .notes-area textarea{
    width: 100%; min-height: 54px; resize: vertical;
    background: var(--bg); border: 1px solid var(--panel-border); color: var(--ink);
    font-family: var(--mono); font-size: 11.5px; padding: 8px; border-radius: 3px; outline: none;
  }
  .notes-area textarea:focus{ border-color: var(--accent-dim); }
  .card-footer-row{
    display: flex; align-items: center; justify-content: space-between; gap: 8px;
    padding: 8px 14px; border-top: 1px solid var(--panel-border);
  }
  .card-footer-left{ display: flex; align-items: center; gap: 8px; }
  .btn-tiny{
    background: transparent; border: 1px solid var(--panel-border); color: var(--ink-dim);
    font-family: var(--mono); font-size: 10px; letter-spacing: 0.04em; text-transform: uppercase;
    padding: 5px 9px; border-radius: 3px; cursor: pointer;
  }
  .btn-tiny:hover{ border-color: var(--accent-dim); color: var(--accent); }
  .progress-pill{
    font-family: var(--mono); font-size: 11px; color: var(--ink-dim);
    border: 1px solid var(--panel-border); border-radius: 3px; padding: 6px 10px; white-space: nowrap;
  }
  .progress-pill strong{ color: var(--accent); }

  .modal-overlay{
    display: none; position: fixed; inset: 0; z-index: 60;
    background: rgba(0,0,0,0.65); align-items: flex-start; justify-content: center;
    padding: 40px 16px; overflow-y: auto;
  }
  .modal-overlay.show{ display: flex; }
  .modal-box{
    background: var(--panel); border: 1px solid var(--panel-border); border-radius: 6px;
    width: 100%; max-width: 640px; padding: 22px 24px;
  }
  .modal-box h3{ margin: 0 0 16px; font-size: 15px; color: var(--ink); font-family: var(--ocr); }
  .modal-field{ margin-bottom: 14px; }
  .modal-field label{
    display: block; font-family: var(--mono); font-size: 10.5px; text-transform: uppercase;
    letter-spacing: 0.05em; color: var(--ink-dim); margin-bottom: 6px;
  }
  .modal-field input, .modal-field textarea{
    width: 100%; background: var(--bg); border: 1px solid var(--panel-border); color: var(--ink);
    font-family: var(--mono); font-size: 12.5px; padding: 8px 10px; border-radius: 3px; outline: none;
  }
  .modal-field textarea{ min-height: 220px; resize: vertical; line-height: 1.5; }
  .modal-field input:focus, .modal-field textarea:focus{ border-color: var(--accent-dim); }
  .modal-actions{ display: flex; justify-content: space-between; align-items: center; margin-top: 16px; gap: 10px; }
  .modal-actions .right{ display: flex; gap: 8px; }

  @media (max-width: 860px){
    .toc-toggle{ display: inline-block; }
    nav.toc{
      position: fixed;
      top: 0; left: 0; bottom: 0;
      z-index: 40;
      width: min(86vw, 340px);
      max-height: 100vh;
      background: var(--bg);
      transform: translateX(-100%);
      transition: transform 0.2s ease;
      padding-top: 76px;
      box-shadow: 2px 0 24px rgba(0,0,0,0.5);
    }
    nav.toc.mobile-open{ transform: translateX(0); }
    .toc-scrim{
      display: none;
      position: fixed; inset: 0; z-index: 35;
      background: rgba(0,0,0,0.5);
    }
    .toc-scrim.show{ display: block; }
  }
</style>
</head>
<body>
<header>
  <button class="toc-toggle" id="tocToggle">☰ Contents</button>
  <div class="header-main">
    <p class="eyebrow">Prompt Archive · Copy Utility</p>
    <h1>AI Prompt Compendium</h1>
    <p class="sub">${payload.length} prompts across ${categoriesPresent.length} categories. Search, filter, edit, mark tested, drop reference images, and copy any prompt straight to your clipboard.</p>
    <div class="controls">
      <input type="search" id="search" placeholder="Search prompts, subjects, or models…" autocomplete="off">
      <select id="modelFilter">
        <option value="">All models / tools</option>
        ${models.map((m) => `<option value="${escapeAttr(m)}">${escapeHtml(m)}</option>`).join("\n        ")}
      </select>
      <select id="catFilter">
        <option value="">All categories</option>
        ${categoriesPresent.map((c) => `<option value="${escapeAttr(c)}">${escapeHtml(c)} (${catCounts[c]})</option>`).join("\n        ")}
      </select>
      <select id="subcatFilter">
        <option value="">All styles</option>
        ${Object.entries(subcatsByCategory).flatMap(([cat, subs]) =>
          subs.map((s) => `<option value="${escapeAttr(s)}">${escapeHtml(s)}</option>`)
        ).join("\n        ")}
      </select>
      <select id="testFilter">
        <option value="">Tested + untested</option>
        <option value="tested">Tested only</option>
        <option value="untested">Untested only</option>
      </select>
      <span class="count" id="count"></span>
      <span class="progress-pill" id="progressPill"></span>
      <button class="btn-tiny" id="exportEditsBtn">Export my notes</button>
      <button class="btn-tiny" id="importEditsBtn">Import notes</button>
      <input type="file" id="importEditsFile" accept="application/json" style="display:none">
    </div>
  </div>
</header>
<div class="toc-scrim" id="tocScrim"></div>
<div class="modal-overlay" id="editOverlay">
  <div class="modal-box">
    <h3 id="editModalTitle">Edit prompt</h3>
    <div class="modal-field">
      <label>Model / tool</label>
      <input type="text" id="editModel">
    </div>
    <div class="modal-field">
      <label>Subject</label>
      <input type="text" id="editSubject">
    </div>
    <div class="modal-field">
      <label>Prompt text</label>
      <textarea id="editText"></textarea>
    </div>
    <div class="modal-actions">
      <button class="btn-tiny" id="revertEditBtn">Revert to original</button>
      <div class="right">
        <button class="btn-tiny" id="cancelEditBtn">Cancel</button>
        <button class="btn-tiny" id="saveEditBtn" style="border-color: var(--accent); color: var(--accent);">Save</button>
      </div>
    </div>
  </div>
</div>
<div class="layout">
  <nav class="toc" id="toc">
    <p class="toc-title">Contents</p>
    ${sectionedCategories
      .map(
        (section) => `
    <p class="toc-section-title">${escapeHtml(section.title)}</p>
    ${section.categories
      .map(
        (c) => `
    <div class="toc-cat" data-cat="${escapeAttr(c)}">
      <button class="toc-cat-btn" data-target="${slug(c)}">
        <span>${escapeHtml(c)}</span>
        <span class="n">${catCounts[c]}</span>
        <span class="arrow">▸</span>
      </button>
      <ul class="toc-entries">
        ${payload
          .filter((p) => p.category === c)
          .map((p) => `<li><a href="#entry-${p.id}" data-id="${p.id}">#${p.id} — ${escapeHtml(p.subject.length > 56 ? p.subject.slice(0, 56).trim() + "…" : p.subject)}${p.subcategory ? ' <span class="toc-subcat-tag">[' + escapeHtml(p.subcategory) + ']</span>' : ''}</a></li>`)
          .join("\n        ")}
      </ul>
    </div>`
      )
      .join("\n    ")}`
      )
      .join("\n    ")}
  </nav>
  <main id="main"></main>
</div>
<footer>Generated locally in your browser session. Nothing here is sent anywhere.<span class="credit">Curated by D the Designer · <a href="https://x.com/D_the_Designer" target="_blank" rel="noopener">@D_the_Designer</a></span></footer>

<script id="prompt-data" type="application/json">${JSON.stringify(payload)}</script>
<script id="cat-data" type="application/json">${JSON.stringify(categoriesPresent)}</script>
<script id="section-data" type="application/json">${JSON.stringify(sectionedCategories)}</script>
<script>
  const DATA = JSON.parse(document.getElementById('prompt-data').textContent);
  const CATS = JSON.parse(document.getElementById('cat-data').textContent);
  const SECTIONS_DATA = JSON.parse(document.getElementById('section-data').textContent);
  const main = document.getElementById('main');
  const searchInput = document.getElementById('search');
  const modelFilter = document.getElementById('modelFilter');
  const catFilter = document.getElementById('catFilter');
  const countEl = document.getElementById('count');
  const toc = document.getElementById('toc');
  const tocToggle = document.getElementById('tocToggle');
  const tocScrim = document.getElementById('tocScrim');

  function escapeHtml(s){
    return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }
  function slug(s){
    return 'cat-' + s.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'');
  }

  // ---- Edits / testing tracker: stored locally per browser, keyed by stable Archive #.
  // Overlaid on top of the generated data at render time so it survives re-generation of this file.
  const EDITS_KEY = 'promptCompendiumEdits.v1';
  function loadEdits(){
    try { return JSON.parse(localStorage.getItem(EDITS_KEY) || '{}'); } catch(e) { return {}; }
  }
  function saveEdits(edits){
    localStorage.setItem(EDITS_KEY, JSON.stringify(edits));
  }
  let EDITS = loadEdits();

  function displayFor(p){
    const e = EDITS[p.id] || {};
    return {
      id: p.id,
      category: p.category,
      subcategory: p.subcategory,
      attribution: p.attribution,
      model: e.model !== undefined ? e.model : p.model,
      subject: e.subject !== undefined ? e.subject : p.subject,
      text: e.text !== undefined ? e.text : p.text,
      isEdited: e.model !== undefined || e.subject !== undefined || e.text !== undefined,
      tested: !!e.tested,
      notes: e.notes || '',
    };
  }

  function updateProgressPill(){
    const testedCount = DATA.filter(p => EDITS[p.id] && EDITS[p.id].tested).length;
    document.getElementById('progressPill').innerHTML = '<strong>' + testedCount + '</strong> / ' + DATA.length + ' tested';
  }

  function render(){
    const q = searchInput.value.trim().toLowerCase();
    const model = modelFilter.value;
    const cat = catFilter.value;
    const subcat = document.getElementById('subcatFilter').value;
    const testState = document.getElementById('testFilter').value;

    const display = DATA.map(displayFor);

    const filtered = display.filter(p => {
      if (model && p.model !== model) return false;
      if (cat && p.category !== cat) return false;
      if (subcat && p.subcategory !== subcat) return false;
      if (testState === 'tested' && !p.tested) return false;
      if (testState === 'untested' && p.tested) return false;
      if (!q) return true;
      return (
        p.text.toLowerCase().includes(q) ||
        p.subject.toLowerCase().includes(q) ||
        p.model.toLowerCase().includes(q) ||
        (p.attribution && p.attribution.toLowerCase().includes(q)) ||
        p.notes.toLowerCase().includes(q)
      );
    });
    countEl.textContent = filtered.length + ' / ' + DATA.length + ' shown';
    updateProgressPill();

    if (filtered.length === 0){
      main.innerHTML = '<p class="empty">No prompts match that search.</p>';
      return;
    }

    const byCat = new Map();
    CATS.forEach(c => byCat.set(c, []));
    filtered.forEach(p => { if (!byCat.has(p.category)) byCat.set(p.category, []); byCat.get(p.category).push(p); });

    let out = '';
    SECTIONS_DATA.forEach(section => {
      const sectionItems = section.categories.map(c => (byCat.get(c) || [])).flat();
      if (sectionItems.length === 0) return;
      out += \`<div class="section-heading">\${escapeHtml(section.title)}</div>\`;
      section.categories.forEach(c => {
        const items = byCat.get(c) || [];
        if (items.length === 0) return;
        out += \`
          <div class="cat-heading" id="\${slug(c)}">
            <h2>\${escapeHtml(c)}</h2>
            <span class="cat-count">\${items.length}</span>
          </div>
          <hr class="cat-rule">
        \`;
        const hasSubcats = items.some(p => p.subcategory);
        const renderCard = p => \`
          <div class="card\${p.tested ? ' is-tested' : ''}\${p.isEdited ? ' is-edited' : ''}" id="entry-\${p.id}" data-id="\${p.id}">
            <div class="card-head">
              <div class="card-meta">
                <div class="card-n">ARCHIVE #\${p.id}</div>
                <div class="card-model">\${escapeHtml(p.model)}\${p.attribution ? ' · ' + escapeHtml(p.attribution) : ''}</div>
                <div class="card-subject">\${escapeHtml(p.subject)}</div>
                \${p.subcategory ? '<div class="card-style-tag">' + escapeHtml(p.subcategory) + '</div>' : ''}
              </div>
              <div class="card-side">
                <div class="img-slot" data-id="\${p.id}" title="Drop or click to add a reference image (not included when you copy)">
                  <span class="hint">+ image</span>
                  <button class="remove-btn" type="button" title="Remove image">×</button>
                </div>
                <button class="copy-btn" data-id="\${p.id}">Copy</button>
              </div>
            </div>
            <pre class="card-text">\${escapeHtml(p.text)}</pre>
            <div class="card-footer-row">
              <div class="card-footer-left">
                <label class="tested-badge">
                  <input type="checkbox" class="tested-check" data-id="\${p.id}" \${p.tested ? 'checked' : ''}>
                  Tested
                </label>
              <button class="notes-toggle" data-id="\${p.id}">\${p.notes ? 'Notes ✎' : '+ notes'}</button>
            </div>
            <button class="btn-tiny edit-btn" data-id="\${p.id}">Edit</button>
          </div>
          <div class="notes-area" id="notes-\${p.id}">
            <textarea class="notes-text" data-id="\${p.id}" placeholder="Test notes — what worked, what to tweak next time…">\${escapeHtml(p.notes)}</textarea>
          </div>
        </div>
      \`;
        if (!hasSubcats) {
          out += items.map(renderCard).join('');
        } else {
          const bySubcat = new Map();
          items.forEach(p => {
            const key = p.subcategory || '(unsorted)';
            if (!bySubcat.has(key)) bySubcat.set(key, []);
            bySubcat.get(key).push(p);
          });
          [...bySubcat.keys()].sort().forEach(subcat => {
            out += '<div class="subcat-heading">' + escapeHtml(subcat === '(unsorted)' ? 'Unsorted' : subcat) + '</div>';
            out += bySubcat.get(subcat).map(renderCard).join('');
          });
        }
      });
    });
    main.innerHTML = out;

    main.querySelectorAll('.copy-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.getAttribute('data-id'), 10);
        const item = DATA.find(d => d.id === id);
        if (!item) return;
        copyText(displayFor(item).text, btn);
      });
    });

    main.querySelectorAll('.tested-check').forEach(cb => {
      cb.addEventListener('change', () => {
        const id = cb.getAttribute('data-id');
        if (!EDITS[id]) EDITS[id] = {};
        EDITS[id].tested = cb.checked;
        saveEdits(EDITS);
        const card = document.getElementById('entry-' + id);
        if (card) card.classList.toggle('is-tested', cb.checked);
        updateProgressPill();
      });
    });

    main.querySelectorAll('.notes-toggle').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const area = document.getElementById('notes-' + id);
        area.classList.toggle('open');
        if (area.classList.contains('open')) area.querySelector('textarea').focus();
      });
    });

    main.querySelectorAll('.notes-text').forEach(ta => {
      ta.addEventListener('change', () => {
        const id = ta.getAttribute('data-id');
        if (!EDITS[id]) EDITS[id] = {};
        EDITS[id].notes = ta.value;
        saveEdits(EDITS);
        const btn = main.querySelector('.notes-toggle[data-id="' + id + '"]');
        if (btn) btn.textContent = ta.value ? 'Notes ✎' : '+ notes';
      });
    });

    main.querySelectorAll('.edit-btn').forEach(btn => {
      btn.addEventListener('click', () => openEditModal(parseInt(btn.getAttribute('data-id'), 10)));
    });

    wireImageSlots();
  }

  // ---- Edit modal ----
  const editOverlay = document.getElementById('editOverlay');
  const editModel = document.getElementById('editModel');
  const editSubject = document.getElementById('editSubject');
  const editText = document.getElementById('editText');
  let editingId = null;

  function openEditModal(id){
    const item = DATA.find(d => d.id === id);
    if (!item) return;
    editingId = id;
    const d = displayFor(item);
    document.getElementById('editModalTitle').textContent = 'Edit Archive #' + id;
    editModel.value = d.model;
    editSubject.value = d.subject;
    editText.value = d.text;
    editOverlay.classList.add('show');
  }
  function closeEditModal(){ editOverlay.classList.remove('show'); editingId = null; }

  document.getElementById('cancelEditBtn').addEventListener('click', closeEditModal);
  editOverlay.addEventListener('click', (e) => { if (e.target === editOverlay) closeEditModal(); });

  document.getElementById('saveEditBtn').addEventListener('click', () => {
    if (editingId === null) return;
    const item = DATA.find(d => d.id === editingId);
    if (!item) return;
    if (!EDITS[editingId]) EDITS[editingId] = {};
    editModel.value.trim() === item.model ? delete EDITS[editingId].model : EDITS[editingId].model = editModel.value.trim();
    editSubject.value.trim() === item.subject ? delete EDITS[editingId].subject : EDITS[editingId].subject = editSubject.value.trim();
    editText.value === item.text ? delete EDITS[editingId].text : EDITS[editingId].text = editText.value;
    saveEdits(EDITS);
    closeEditModal();
    render();
  });

  document.getElementById('revertEditBtn').addEventListener('click', () => {
    if (editingId === null) return;
    if (EDITS[editingId]){
      delete EDITS[editingId].model;
      delete EDITS[editingId].subject;
      delete EDITS[editingId].text;
      saveEdits(EDITS);
    }
    closeEditModal();
    render();
  });

  // ---- Export / import my test data (tested flags, notes, edits) as a portable JSON backup ----
  document.getElementById('exportEditsBtn').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(EDITS, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const stamp = new Date().toISOString().slice(0,10);
    a.href = url; a.download = 'compendium-test-notes-' + stamp + '.json';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });
  document.getElementById('importEditsBtn').addEventListener('click', () => document.getElementById('importEditsFile').click());
  document.getElementById('importEditsFile').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      let incoming;
      try { incoming = JSON.parse(reader.result); } catch(err){ alert('That file is not valid JSON.'); return; }
      const mode = confirm('Click OK to merge these notes on top of what you have, or Cancel to replace everything.');
      EDITS = mode ? Object.assign({}, EDITS, incoming) : incoming;
      saveEdits(EDITS);
      render();
      alert('Test notes imported.');
    };
    reader.readAsText(file);
    e.target.value = '';
  });

  document.getElementById('testFilter').addEventListener('change', render);
  document.getElementById('subcatFilter').addEventListener('change', render);

  function copyText(text, btn){
    const done = () => {
      const original = 'Copy';
      btn.textContent = 'Copied';
      btn.classList.add('copied');
      setTimeout(() => {
        btn.textContent = original;
        btn.classList.remove('copied');
      }, 1400);
    };
    if (navigator.clipboard && navigator.clipboard.writeText){
      navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done));
    } else {
      fallbackCopy(text, done);
    }
  }

  function fallbackCopy(text, done){
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    try { document.execCommand('copy'); } catch(e) {}
    document.body.removeChild(ta);
    done();
  }

  toc.querySelectorAll('.toc-cat-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const wrap = btn.closest('.toc-cat');
      const wasOpen = wrap.classList.contains('open');
      toc.querySelectorAll('.toc-cat.open').forEach(el => el.classList.remove('open'));
      if (!wasOpen){
        wrap.classList.add('open');
      }
      catFilter.value = '';
      searchInput.value = '';
      render();
      requestAnimationFrame(() => {
        const target = document.getElementById(btn.getAttribute('data-target'));
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      closeMobileToc();
    });
  });

  toc.querySelectorAll('.toc-entries a').forEach(a => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      catFilter.value = '';
      searchInput.value = '';
      render();
      requestAnimationFrame(() => {
        const id = a.getAttribute('data-id');
        const target = document.getElementById('entry-' + id);
        if (target){
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
          target.style.borderColor = 'var(--accent)';
          setTimeout(() => { target.style.borderColor = ''; }, 1600);
        }
      });
      closeMobileToc();
    });
  });

  function openMobileToc(){ toc.classList.add('mobile-open'); tocScrim.classList.add('show'); }
  function closeMobileToc(){ toc.classList.remove('mobile-open'); tocScrim.classList.remove('show'); }
  tocToggle.addEventListener('click', () => {
    toc.classList.contains('mobile-open') ? closeMobileToc() : openMobileToc();
  });
  tocScrim.addEventListener('click', closeMobileToc);

  const IMG_DB_NAME = 'promptCompendiumImages';
  const IMG_STORE = 'images';
  let imgDbPromise = null;
  function getImgDB(){
    if (imgDbPromise) return imgDbPromise;
    imgDbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(IMG_DB_NAME, 1);
      req.onupgradeneeded = () => { req.result.createObjectStore(IMG_STORE); };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return imgDbPromise;
  }
  async function saveImageBlob(id, blob){
    const db = await getImgDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(IMG_STORE, 'readwrite');
      tx.objectStore(IMG_STORE).put(blob, id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
  async function loadImageBlob(id){
    const db = await getImgDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(IMG_STORE, 'readonly');
      const req = tx.objectStore(IMG_STORE).get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }
  async function deleteImageBlob(id){
    const db = await getImgDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(IMG_STORE, 'readwrite');
      tx.objectStore(IMG_STORE).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  function setSlotImage(slot, blob){
    const url = URL.createObjectURL(blob);
    slot.innerHTML = '<img src="' + url + '" alt=""><button class="remove-btn" type="button" title="Remove image">×</button>';
    slot.classList.add('has-image');
  }
  function clearSlotVisual(slot){
    slot.innerHTML = '<span class="hint">+ image</span><button class="remove-btn" type="button" title="Remove image">×</button>';
    slot.classList.remove('has-image');
  }

  const hiddenFileInput = document.createElement('input');
  hiddenFileInput.type = 'file';
  hiddenFileInput.accept = 'image/*';
  hiddenFileInput.style.display = 'none';
  document.body.appendChild(hiddenFileInput);
  let activeSlotForPicker = null;

  hiddenFileInput.addEventListener('change', async () => {
    const file = hiddenFileInput.files[0];
    hiddenFileInput.value = '';
    if (!file || !activeSlotForPicker) return;
    const id = activeSlotForPicker.getAttribute('data-id');
    await saveImageBlob(id, file);
    setSlotImage(activeSlotForPicker, file);
  });

  function wireImageSlots(){
    main.querySelectorAll('.img-slot').forEach(slot => {
      const id = slot.getAttribute('data-id');

      loadImageBlob(id).then(blob => {
        if (blob) setSlotImage(slot, blob);
      }).catch(() => {});

      slot.addEventListener('click', (e) => {
        if (e.target.closest('.remove-btn')) return;
        if (slot.classList.contains('has-image')){
          const img = slot.querySelector('img');
          if (img) window.open(img.src, '_blank');
          return;
        }
        activeSlotForPicker = slot;
        hiddenFileInput.click();
      });

      slot.addEventListener('dragover', (e) => { e.preventDefault(); slot.classList.add('dragover'); });
      slot.addEventListener('dragleave', () => slot.classList.remove('dragover'));
      slot.addEventListener('drop', async (e) => {
        e.preventDefault();
        slot.classList.remove('dragover');
        const file = e.dataTransfer.files && e.dataTransfer.files[0];
        if (!file || !file.type.startsWith('image/')) return;
        await saveImageBlob(id, file);
        setSlotImage(slot, file);
      });

      slot.addEventListener('click', async (e) => {
        if (!e.target.closest('.remove-btn')) return;
        e.stopPropagation();
        await deleteImageBlob(id);
        clearSlotVisual(slot);
      });
    });
  }

  searchInput.addEventListener('input', render);
  modelFilter.addEventListener('change', render);
  catFilter.addEventListener('change', render);
  render();
</script>
</body>
</html>
`;

const fontPath = "/home/claude/promptdoc/ocra_base64.txt";
let fontFace = "";
if (fs.existsSync(fontPath)) {
  const fontBase64 = fs.readFileSync(fontPath, "utf-8").trim();
  fontFace = `  @font-face{
    font-family: 'OCR A Std';
    src: url(data:font/otf;base64,${fontBase64}) format('opentype');
    font-weight: normal;
    font-style: normal;
    font-display: swap;
  }
`;
} else {
  console.warn(`WARNING: ${fontPath} not found — building without the embedded OCR A Std font.`);
  console.warn("The page will fall back to Consolas / SF Mono / Helvetica per the --mono/--ocr/--sans stacks.");
  console.warn("Re-run with ocra_base64.txt present to restore the custom font.");
}
const finalHtml = html.replace(FONT_FACE_PLACEHOLDER, fontFace);

fs.writeFileSync("/mnt/user-data/outputs/AI_Prompt_Compendium_Copyable.html", finalHtml, "utf-8");
console.log("done, entries:", payload.length, "categories:", categoriesPresent.length);
