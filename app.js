'use strict';

/* ---------- Storage ----------
 * One JSON blob in localStorage:
 *   items:   [{ id, name, archived }]            (array order = display order)
 *   tags:    [{ id, name, archived }]
 *   entries: [{ id, itemId, ts, tagIds, note }]  (ts = local ISO with UTC offset)
 *   lastExport: ISO string | null
 */
const KEY = 'healthlog.v1';
const SEED_ITEMS = ['Headache', 'Cold sore', 'Inhaler'];
const SEED_TAGS = ['Poor sleep', 'Stress', 'Alcohol', 'Period', 'Weather change', 'Sick', 'Other'];

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const named = name => ({ id: uid(), name, archived: false });

function load() {
  try {
    const d = JSON.parse(localStorage.getItem(KEY));
    if (d && Array.isArray(d.items)) return d;
  } catch { /* fall through to a fresh store */ }
  return { items: SEED_ITEMS.map(named), tags: SEED_TAGS.map(named), entries: [], lastExport: null };
}
let db = load();
const save = () => localStorage.setItem(KEY, JSON.stringify(db));

const itemById = id => db.items.find(x => x.id === id);
const tagById = id => db.tags.find(x => x.id === id);
const entryById = id => db.entries.find(x => x.id === id);
const active = list => list.filter(x => !x.archived);
const byNewest = (a, b) => Date.parse(b.ts) - Date.parse(a.ts);

/* ---------- Dates ----------
 * Entries keep the wall-clock time they were logged in (e.g. "2026-10-06T14:32:00+01:00"),
 * so day/time are read straight from the string and travel doesn't shift history.
 */
const pad = n => String(n).padStart(2, '0');
function isoLocal(d) {
  const off = -d.getTimezoneOffset(), a = Math.abs(off);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}` +
    `${off >= 0 ? '+' : '-'}${pad(Math.floor(a / 60))}:${pad(a % 60)}`;
}
const todayKey = () => isoLocal(new Date()).slice(0, 10);
const eDay = e => e.ts.slice(0, 10);
const eTime = e => e.ts.slice(11, 16);
// Whole-day numbers (days since epoch) for DST-proof day arithmetic.
const dayNum = k => Date.UTC(+k.slice(0, 4), +k.slice(5, 7) - 1, +k.slice(8, 10)) / 864e5;
const numDay = n => new Date(n * 864e5).toISOString().slice(0, 10);
const fmtDay = (k, opts) => new Date(k + 'T12:00').toLocaleDateString(undefined, opts);

/* ---------- Tiny DOM helper ---------- */
const $ = s => document.querySelector(s);
function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'value') el.value = v;
    else if (v !== false && v != null) el.setAttribute(k, v === true ? '' : v);
  }
  el.append(...kids.flat().filter(k => k != null && k !== false));
  return el;
}
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

function chip(label, pressed, onToggle) {
  return h('button', {
    type: 'button', class: 'chip', 'aria-pressed': String(pressed),
    onclick: ev => {
      const on = ev.currentTarget.getAttribute('aria-pressed') !== 'true';
      ev.currentTarget.setAttribute('aria-pressed', String(on));
      onToggle(on);
    },
  }, label);
}

/* ---------- Toast ---------- */
let toastTimer;
function toast(msg, actions = []) {
  const t = $('#toast');
  t.replaceChildren(h('span', {}, msg), ...actions.map(([label, fn]) =>
    h('button', { onclick: () => { hideToast(); fn(); } }, label)));
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(hideToast, 6000);
}
const hideToast = () => { $('#toast').hidden = true; };

/* ---------- Log view ---------- */
let lastLoggedId = null;

function renderLog() {
  const month = todayKey().slice(0, 7);
  const items = active(db.items);
  $('#grid').replaceChildren(...items.map(it => {
    const days = new Set(db.entries.filter(e => e.itemId === it.id && e.ts.startsWith(month)).map(eDay)).size;
    return h('button', { class: 'log-btn', onclick: () => logNow(it.id) },
      h('span', {}, it.name),
      h('span', { class: 'sub' }, `${plural(days, 'day')} this month`));
  }));
  if (!items.length) $('#grid').append(h('p', { class: 'empty' }, 'No items yet. Add some in Settings.'));
}

function logNow(itemId) {
  const e = { id: uid(), itemId, ts: isoLocal(new Date()), tagIds: [], note: '' };
  db.entries.push(e);
  save();
  navigator.vibrate?.(15);
  lastLoggedId = e.id;
  renderAll();
  toast(`Logged ${itemById(itemId).name} · ${eTime(e)}`, [
    ['Undo', () => removeEntry(e.id)],
    ['Edit', () => openEdit(e.id)],
  ]);
}

function renderTagRow() {
  const e = entryById(lastLoggedId);
  const tags = active(db.tags);
  $('#tagrow').hidden = !e || !tags.length;
  if ($('#tagrow').hidden) return;
  $('#tagrow-label').textContent = `Triggers for ${itemById(e.itemId).name}?`;
  $('#tagrow-chips').replaceChildren(...tags.map(t => chip(t.name, e.tagIds.includes(t.id), on => {
    e.tagIds = on ? [...e.tagIds, t.id] : e.tagIds.filter(id => id !== t.id);
    save();
  })));
}
const dismissTagRow = () => { lastLoggedId = null; renderTagRow(); };

function removeEntry(id) {
  db.entries = db.entries.filter(e => e.id !== id);
  if (lastLoggedId === id) lastLoggedId = null;
  save();
  renderAll();
}

/* ---------- Edit / add-past dialog ---------- */
let editingId = null, editTags = new Set();

function openEdit(id) {
  const e = id ? entryById(id) : null;
  editingId = id;
  $('#edit-title').textContent = e ? 'Edit entry' : 'Add past entry';
  $('#f-item').replaceChildren(...db.items.filter(it => !it.archived || it.id === e?.itemId)
    .map(it => h('option', { value: it.id, selected: it.id === e?.itemId }, it.name)));
  $('#f-ts').value = (e ? e.ts : isoLocal(new Date())).slice(0, 16);
  editTags = new Set(e ? e.tagIds : []);
  $('#f-tags').replaceChildren(...db.tags.filter(t => !t.archived || editTags.has(t.id))
    .map(t => chip(t.name, editTags.has(t.id), on => on ? editTags.add(t.id) : editTags.delete(t.id))));
  $('#f-note').value = e?.note || '';
  $('#f-delete').hidden = !e;
  $('#edit').returnValue = '';
  $('#edit').showModal();
}

$('#edit').addEventListener('close', () => {
  if ($('#edit').returnValue !== 'save') return;
  const input = $('#f-ts').value;
  const d = new Date(input);
  if (!$('#f-item').value || isNaN(d)) return;
  const e = editingId ? entryById(editingId) : { id: uid() };
  // Keep the original string (and its UTC offset) if the time wasn't touched.
  if (!e.ts || e.ts.slice(0, 16) !== input) e.ts = isoLocal(d);
  e.itemId = $('#f-item').value;
  e.tagIds = [...editTags];
  e.note = $('#f-note').value.trim();
  if (!editingId) db.entries.push(e);
  save();
  renderAll();
  toast(editingId ? 'Saved' : `Added ${itemById(e.itemId).name} · ${eDay(e)} ${eTime(e)}`);
});

$('#f-delete').addEventListener('click', () => {
  if (!confirm('Delete this entry?')) return;
  $('#edit').close();
  removeEntry(editingId);
  toast('Deleted');
});

/* ---------- History view ---------- */
let historyLimit = 200;

function renderHistory() {
  const out = $('#history');
  const sorted = [...db.entries].sort(byNewest);
  if (!sorted.length) return out.replaceChildren(h('p', { class: 'empty' }, 'Nothing logged yet.'));
  const nodes = [];
  let day = null;
  for (const e of sorted.slice(0, historyLimit)) {
    if (eDay(e) !== day) {
      day = eDay(e);
      nodes.push(h('div', { class: 'day-head' }, fmtDay(day, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })));
    }
    const tags = e.tagIds.map(id => tagById(id)?.name).filter(Boolean).join(', ');
    nodes.push(h('button', { class: 'entry', onclick: () => openEdit(e.id) },
      h('span', { class: 'time' }, eTime(e)),
      h('span', { class: 'name' }, itemById(e.itemId)?.name ?? '(deleted item)'),
      (tags || e.note) && h('span', { class: 'meta' }, [tags, e.note].filter(Boolean).join(' · '))));
  }
  if (sorted.length > historyLimit) {
    nodes.push(h('button', { class: 'secondary', onclick: () => { historyLimit += 200; renderHistory(); } },
      `Show more (${sorted.length - historyLimit} older)`));
  }
  out.replaceChildren(...nodes);
}

/* ---------- Patterns view ---------- */
const WEEKS = 12;
let precede = { symptomId: null, window: 1 };

function renderPatterns() {
  const out = $('#patterns');
  const items = db.items.filter(it => !it.archived || db.entries.some(e => e.itemId === it.id));
  if (!db.entries.length) return out.replaceChildren(h('p', { class: 'empty' }, 'Log a few entries and patterns will show up here.'));
  const byItem = new Map(items.map(it => [it.id, db.entries.filter(e => e.itemId === it.id)]));
  out.replaceChildren(monthSummary(items, byItem), ...items.map(it => itemCard(it, byItem.get(it.id))), precedeCard(items));
}

function monthSummary(items, byItem) {
  const now = new Date();
  const thisM = todayKey().slice(0, 7);
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevM = `${prev.getFullYear()}-${pad(prev.getMonth() + 1)}`;
  const monthName = d => d.toLocaleDateString(undefined, { month: 'long' });
  const stat = (entries, m) => {
    const inMonth = entries.filter(e => e.ts.startsWith(m));
    const days = new Set(inMonth.map(eDay)).size;
    return [plural(days, 'day'), inMonth.length !== days ? h('small', {}, ` (${inMonth.length} logs)`) : null];
  };
  return h('div', { class: 'card' },
    h('table', { class: 'summary' },
      h('thead', {}, h('tr', {}, h('th', {}, ''), h('th', {}, monthName(now)), h('th', {}, monthName(prev)))),
      h('tbody', {}, items.map(it => h('tr', {},
        h('th', {}, it.name),
        h('td', {}, stat(byItem.get(it.id), thisM)),
        h('td', {}, stat(byItem.get(it.id), prevM)))))));
}

function itemCard(it, entries) {
  // Weekly counts, Monday-start weeks, oldest first.
  const today = dayNum(todayKey());
  const weekStart = n => n - (new Date(n * 864e5).getUTCDay() + 6) % 7;
  const first = weekStart(today) - (WEEKS - 1) * 7;
  const counts = Array(WEEKS).fill(0);
  for (const e of entries) {
    const i = Math.floor((dayNum(eDay(e)) - first) / 7);
    if (i >= 0 && i < WEEKS) counts[i]++;
  }
  const max = Math.max(1, ...counts);
  const bars = h('div', { class: 'bars', role: 'img', 'aria-label': `${it.name} per week, last ${WEEKS} weeks: ${counts.join(', ')}` },
    counts.map((c, i) => {
      const start = numDay(first + i * 7);
      const d = +start.slice(8);
      const bar = h('div', { class: 'bar' });
      bar.style.height = `${(c / max) * 100}%`;
      return h('div', { class: 'col' },
        h('span', { class: 'v' }, c || ''),
        h('div', { class: 'track' }, bar),
        h('span', { class: 'x' }, i === 0 || d <= 7 ? fmtDay(start, { month: 'short', day: 'numeric' }) : String(d)));
    }));

  const tagCounts = new Map();
  for (const e of entries) for (const id of e.tagIds) tagCounts.set(id, (tagCounts.get(id) || 0) + 1);
  const top = [...tagCounts].filter(([id]) => tagById(id)).sort((a, b) => b[1] - a[1]).slice(0, 5);

  return h('div', { class: 'card' },
    h('h3', {}, `${it.name} · per week`),
    bars,
    h('strong', {}, 'Most tagged triggers'),
    top.length
      ? h('ol', { class: 'taglist' }, top.map(([id, n]) =>
          h('li', {}, `${tagById(id).name}: ${n} (${Math.round((n / entries.length) * 100)}% of entries)`)))
      : h('p', { class: 'hint' }, 'No tags yet.'));
}

/* "What comes before it?": for each other item, how often it was logged in the window
 * before a symptom day, compared with how often it was logged before any day at all. */
function precedeCard(items) {
  const withData = items.filter(it => db.entries.some(e => e.itemId === it.id));
  if (withData.length < 2) {
    return h('div', { class: 'card' }, h('h3', {}, 'What comes before it?'),
      h('p', { class: 'hint' }, 'Log exposures like Alcohol or Bad sleep as their own items, and this will compare them against your symptom days.'));
  }
  if (!withData.some(it => it.id === precede.symptomId)) precede.symptomId = withData[0].id;

  const today = dayNum(todayKey());
  const firstDay = Math.min(...db.entries.map(e => dayNum(eDay(e))));
  const start = Math.max(firstDay, today - 364);
  const total = today - start + 1;
  const daysOf = id => new Set(db.entries.filter(e => e.itemId === id).map(e => dayNum(eDay(e))));
  const symptomDays = [...daysOf(precede.symptomId)].filter(n => n >= start && n <= today);

  const rows = withData.filter(it => it.id !== precede.symptomId).map(it => {
    const ex = daysOf(it.id);
    const exposed = n => { for (let k = 0; k <= precede.window; k++) if (ex.has(n - k)) return true; return false; };
    const hit = symptomDays.filter(exposed).length;
    let base = 0;
    for (let n = start; n <= today; n++) if (exposed(n)) base++;
    const pS = symptomDays.length ? hit / symptomDays.length : 0, pB = base / total;
    return { it, hit, pS, pB, lift: pB ? pS / pB : 0 };
  }).sort((a, b) => b.lift - a.lift);

  const symName = itemById(precede.symptomId).name;
  const pct = x => `${Math.round(x * 100)}%`;
  const enough = symptomDays.length >= 5;

  return h('div', { class: 'card' },
    h('h3', {}, 'What comes before it?'),
    h('div', { class: 'controls' },
      h('select', { 'aria-label': 'Symptom', onchange: ev => { precede.symptomId = ev.target.value; renderPatterns(); } },
        withData.map(it => h('option', { value: it.id, selected: it.id === precede.symptomId }, it.name))),
      h('select', { 'aria-label': 'Window', onchange: ev => { precede.window = +ev.target.value; renderPatterns(); } },
        [['0', 'Same day'], ['1', '≤ 1 day before'], ['2', '≤ 2 days before']]
          .map(([v, l]) => h('option', { value: v, selected: +v === precede.window }, l)))),
    h('p', { class: 'hint' }, `${plural(symptomDays.length, `${symName} day`)} over the last ${plural(total, 'day')}.` +
      (enough ? '' : ' Too few to read much into yet.')),
    rows.map(r => h('div', { class: 'precede-row' + (enough && r.hit >= 3 && r.lift >= 1.5 ? ' strong' : '') },
      h('div', {}, h('strong', {}, r.it.name), ' ', h('span', { class: 'lift' }, r.pB ? `${r.lift.toFixed(1)}×` : '–')),
      h('div', { class: 'meta' }, `Before ${pct(r.pS)} of ${symName} days (${r.hit}/${symptomDays.length}) vs ${pct(r.pB)} of all days`))),
    h('p', { class: 'hint' }, '“2.0×” means it shows up before symptom days twice as often as on a typical day. ' +
      'Correlation, not proof, and it only works if you log the exposure every time, not just on bad days. ' +
      'Trigger tags can’t be compared this way because they’re only recorded on symptom entries.'));
}

/* ---------- Settings view ---------- */
const cleanName = s => s.replace(/;/g, ',').trim(); // ';' separates tags in the CSV
const nameTaken = (list, name, self) => list.some(x => x !== self && x.name.toLowerCase() === name.toLowerCase());

function renderList(list, el) {
  el.replaceChildren(...list.map((x, i) => h('div', { class: 'list-row' + (x.archived ? ' archived' : '') },
    h('input', {
      value: x.name, 'aria-label': 'Name',
      onchange: ev => {
        const v = cleanName(ev.target.value);
        if (v && !nameTaken(list, v, x)) { x.name = v; save(); renderAll(); } else ev.target.value = x.name;
      },
    }),
    h('button', { class: 'icon-btn', 'aria-label': 'Move up', disabled: i === 0, onclick: () => move(list, i, -1) }, '↑'),
    h('button', { class: 'icon-btn', 'aria-label': 'Move down', disabled: i === list.length - 1, onclick: () => move(list, i, 1) }, '↓'),
    h('button', { class: 'small', onclick: () => { x.archived = !x.archived; save(); renderAll(); } }, x.archived ? 'Restore' : 'Archive'))));
}
function move(list, i, d) {
  [list[i], list[i + d]] = [list[i + d], list[i]];
  save();
  renderAll();
}
function bindAdd(form, list) {
  form.addEventListener('submit', ev => {
    ev.preventDefault();
    const v = cleanName(form.elements.name.value);
    if (!v) return;
    if (nameTaken(list, v)) return toast(`“${v}” already exists`);
    list.push(named(v));
    save();
    form.reset();
    renderAll();
  });
}
bindAdd($('#add-item'), db.items);
bindAdd($('#add-tag'), db.tags);

function renderSettings() {
  renderList(db.items, $('#items-list'));
  renderList(db.tags, $('#tags-list'));
  const days = db.lastExport ? Math.floor((Date.now() - Date.parse(db.lastExport)) / 864e5) : null;
  // Nag only once there's something worth losing: 30 days since the last export,
  // or (never exported) the oldest entry is over two weeks old.
  const oldest = Math.min(...db.entries.map(e => Date.parse(e.ts)));
  const stale = db.entries.length > 0 && (days === null ? Date.now() - oldest > 14 * 864e5 : days > 30);
  $('#backup-status').textContent = days === null ? 'Never exported.' : `Last export: ${days === 0 ? 'today' : plural(days, 'day') + ' ago'}.`;
  $('#backup-status').classList.toggle('warn', stale);
  document.querySelector('[data-view="settings"]').classList.toggle('warn', stale);
}

/* ---------- CSV export / import ---------- */
const CSV_HEADER = ['timestamp', 'item', 'tags', 'note'];
const csvCell = s => /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;

async function exportCSV() {
  const rows = [...db.entries].sort((a, b) => -byNewest(a, b)).map(e => [
    e.ts, itemById(e.itemId)?.name ?? '', e.tagIds.map(id => tagById(id)?.name).filter(Boolean).join('; '), e.note || '']);
  const csv = '\ufeff' + [CSV_HEADER, ...rows].map(r => r.map(csvCell).join(',')).join('\r\n') + '\r\n';
  const file = new File([csv], `health-log-${todayKey()}.csv`, { type: 'text/csv' });
  // On phones the share sheet is the useful path (Files, AirDrop, Mail); elsewhere download.
  if (matchMedia('(pointer: coarse)').matches && navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file] }); } catch (err) { if (err.name === 'AbortError') return; download(file); }
  } else download(file);
  db.lastExport = new Date().toISOString();
  save();
  renderSettings();
}
function download(file) {
  const url = URL.createObjectURL(file);
  const a = h('a', { href: url, download: file.name });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function parseCSV(text) {
  const rows = [];
  let row = [], cell = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
    else if (c !== '\r') cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

function findOrCreate(list, name) {
  const n = cleanName(name);
  let x = list.find(x => x.name.toLowerCase() === n.toLowerCase());
  if (!x) list.push(x = named(n));
  return x;
}

function importCSV(text) {
  const [header, ...rows] = parseCSV(text.replace(/^\ufeff/, ''));
  const col = Object.fromEntries((header || []).map((name, i) => [name.trim().toLowerCase(), i]));
  if (col.timestamp == null || col.item == null) return toast('Not a Health Log CSV (needs timestamp and item columns)');
  const seen = new Set(db.entries.map(e => `${Date.parse(e.ts)}|${e.itemId}`));
  let added = 0, dupes = 0, bad = 0;
  for (const r of rows) {
    let ts = (r[col.timestamp] || '').trim();
    const itemName = cleanName(r[col.item] || '');
    if (!ts && !itemName) continue; // blank line
    // Accept "2026-10-06 14:32" (e.g. after a spreadsheet round-trip): treat as this device's local time.
    if (!/[+-]\d\d:\d\d$|Z$/.test(ts)) ts = isNaN(new Date(ts.replace(' ', 'T'))) ? '' : isoLocal(new Date(ts.replace(' ', 'T')));
    if (!ts || isNaN(Date.parse(ts)) || !itemName) { bad++; continue; }
    const item = findOrCreate(db.items, itemName);
    const key = `${Date.parse(ts)}|${item.id}`;
    if (seen.has(key)) { dupes++; continue; }
    seen.add(key);
    const tagIds = (r[col.tags] || '').split(';').map(s => s.trim()).filter(Boolean).map(n => findOrCreate(db.tags, n).id);
    db.entries.push({ id: uid(), itemId: item.id, ts, tagIds: [...new Set(tagIds)], note: (r[col.note] || '').trim() });
    added++;
  }
  save();
  renderAll();
  toast(`Imported ${added}` + (dupes ? `, ${dupes} already here` : '') + (bad ? `, ${bad} unreadable` : ''));
}

$('#export').addEventListener('click', exportCSV);
$('#import-btn').addEventListener('click', () => $('#import').click());
$('#import').addEventListener('change', async ev => {
  const f = ev.target.files[0];
  ev.target.value = '';
  if (f) importCSV(await f.text());
});

/* ---------- Navigation & wiring ---------- */
const TITLES = { log: 'Log', history: 'History', patterns: 'Patterns', settings: 'Settings' };
function show(view) {
  for (const b of document.querySelectorAll('.tabs button')) {
    if (b.dataset.view === view) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
  }
  for (const v of Object.keys(TITLES)) $(`#view-${v}`).hidden = v !== view;
  $('#title').textContent = TITLES[view];
  if (view !== 'log') dismissTagRow();
  scrollTo(0, 0);
}
document.querySelectorAll('.tabs button').forEach(b => b.addEventListener('click', () => show(b.dataset.view)));
document.querySelectorAll('.add-past').forEach(b => b.addEventListener('click', () => openEdit(null)));
$('#tagrow-close').addEventListener('click', dismissTagRow);

function renderAll() {
  renderLog();
  renderTagRow();
  renderHistory();
  renderPatterns();
  renderSettings();
}

// Coming back to the app later: refresh "this month" counts, drop the stale trigger row.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') { lastLoggedId = null; renderAll(); }
});
// Another open tab changed the data.
addEventListener('storage', ev => {
  if (ev.key === KEY) location.reload(); // simplest way to pick up the new data everywhere
});

renderAll();

// Ask the browser not to evict our data; report the result in Settings.
navigator.storage?.persist?.().then(ok => {
  $('#storage-status').textContent = ok ? 'Storage is marked persistent.' : 'Browser may clear storage under pressure: export regularly.';
}).catch(() => {});

if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => {});
