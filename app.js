'use strict';

/* ---------- Storage ----------
 * One JSON blob in localStorage:
 *   items:   [{ id, name, archived }]            (array order = display order)
 *   tags:    [{ id, name, archived }]
 *   entries: [{ id, itemId, ts, tagIds, note }]  (ts = local ISO with UTC offset)
 *   lastExport: ISO string | null
 */
const KEY = 'healthlog.v1';
// Offered on the first-launch picker; nothing is tracked until the person picks.
// Of the trigger tags, only these start selected: a short list is less daunting.
const STARTER_TAGS = ['Poor sleep', 'Stress'];
const SUGGESTED_ITEMS = ['Headache', 'Migraine', 'Heartburn', 'Nausea', 'Back pain', 'Allergies', 'Anxiety', 'Fatigue', 'Period'];
const SEED_TAGS = ['Poor sleep', 'Stress', 'Caffeine'];

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const named = name => ({ id: uid(), name, archived: false });

function load() {
  try {
    const d = JSON.parse(localStorage.getItem(KEY));
    if (d && Array.isArray(d.items)) {
      for (const it of d.items) { delete it.mode; delete it.gap; } // fields from older versions
      return d;
    }
  } catch { /* fall through to a fresh store */ }
  return { items: [], tags: [], entries: [], lastExport: null };
}
const isNewDevice = (() => { try { return !localStorage.getItem(KEY); } catch { return false; } })();
let db = load();
const save = () => localStorage.setItem(KEY, JSON.stringify(db));

const itemById = id => db.items.find(x => x.id === id);
const tagById = id => db.tags.find(x => x.id === id);
const entryById = id => db.entries.find(x => x.id === id);
const active = list => list.filter(x => !x.archived);
const byNewest = (a, b) => Date.parse(b.ts) - Date.parse(a.ts);

// Per-device UI preference (not data), so a failure here is harmless.
const UI_KEY = 'healthlog.scale';
let scale = 'week';
try { scale = localStorage.getItem(UI_KEY) || 'week'; } catch { /* keep default */ }

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
const today = () => dayNum(todayKey());

/* ---------- Episodes ----------
 * Every item's logs are grouped into runs of consecutive days, oldest first. A headache is
 * usually a run of one day; a cold sore a run of several. A missed day splits a run, which
 * the "Was it still there?" prompt on the Log screen catches.
 */
function episodesOf(it) {
  const days = new Map(); // dayNum -> { logs, tagIds }
  for (const e of db.entries) {
    if (e.itemId !== it.id) continue;
    const n = dayNum(eDay(e));
    const d = days.get(n) || { logs: 0, tagIds: new Set() };
    d.logs++;
    e.tagIds.forEach(t => d.tagIds.add(t));
    days.set(n, d);
  }
  const eps = [];
  for (const n of [...days.keys()].sort((a, b) => a - b)) {
    const d = days.get(n), last = eps.at(-1);
    if (last && n - last.end === 1) {
      last.end = n;
      last.logs += d.logs;
      d.tagIds.forEach(t => last.tagIds.add(t));
    } else eps.push({ start: n, end: n, logs: d.logs, tagIds: new Set(d.tagIds) });
  }
  return eps;
}
const epLength = ep => ep.end - ep.start + 1;
// Still open: logged today or yesterday.
const isOngoing = ep => ep && today() - ep.end <= 1;

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
  t.replaceChildren(h('span', {}, msg), actions.length ? h('div', { class: 'toast-actions' }, actions.map(([label, fn]) =>
    h('button', { onclick: () => { hideToast(); fn(); } }, label))) : null);
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(hideToast, 6000);
}
const hideToast = () => { $('#toast').hidden = true; };

/* ---------- Log view ---------- */
let lastLoggedId = null;
let gapAsk = null; // { itemId, missing: [dayNum] } when an episode log skipped a day or two

function renderLog() {
  const month = todayKey().slice(0, 7);
  const items = active(db.items);
  $('#grid').replaceChildren(...items.map(it => {
    // Mid-run (2+ days in a row up to today/yesterday): show the day count as a reminder.
    const last = episodesOf(it).at(-1);
    const ongoing = isOngoing(last) && epLength(last) >= 2;
    const days = new Set(db.entries.filter(e => e.itemId === it.id && e.ts.startsWith(month)).map(eDay)).size;
    const sub = ongoing ? `Day ${today() - last.start + 1} · ${last.end === today() ? 'logged today' : 'tap for today'}`
      : `${plural(days, 'day')} this month`;
    return h('button', { class: 'log-btn' + (ongoing ? ' ongoing' : ''), onclick: () => logNow(it.id) },
      h('span', {}, it.name),
      h('span', { class: 'sub' }, sub));
  }));
  $('#grid').append(addTile());
  fitGrid();
}

// Two columns until a single word (e.g. "Heartburn" at the largest text sizes) can't fit
// in a half-width button; then one column. Measured, so it adapts to names and text size.
function fitGrid() {
  const grid = $('#grid');
  grid.classList.remove('one-col');
  if (grid.offsetParent === null) return; // hidden: measure next time it's shown
  const tooNarrow = [...grid.querySelectorAll('.log-btn > span')].some(s => s.scrollWidth > s.clientWidth + 1);
  grid.classList.toggle('one-col', tooNarrow);
}
addEventListener('resize', () => { fitGrid(); fitLists(); });

// Last tile in the grid: tap to type a new item right there.
function addTile() {
  const tile = h('button', { class: 'log-btn add-tile', 'aria-label': 'Add a new item to track' }, h('span', {}, '＋ Add new'));
  tile.addEventListener('click', () => {
    const form = h('form', { class: 'log-btn add-tile add-form' },
      h('input', { name: 'name', placeholder: 'e.g. Heartburn', 'aria-label': 'New item name', autocomplete: 'off' }),
      h('div', { class: 'row' },
        h('button', { class: 'primary small' }, 'Add'),
        h('button', { type: 'button', class: 'secondary small', onclick: renderLog }, 'Cancel')));
    form.addEventListener('submit', ev => {
      ev.preventDefault();
      const v = cleanName(form.elements.name.value);
      if (!v) return form.elements.name.focus();
      const existing = db.items.find(x => x.name.toLowerCase() === v.toLowerCase());
      if (existing && !existing.archived) return toast(`“${v}” is already here`);
      if (existing) existing.archived = false; else db.items.push(named(v));
      save();
      renderAll();
      toast(`Added ${v}`);
    });
    tile.replaceWith(form);
    form.elements.name.focus();
  });
  return tile;
}

function logNow(itemId) {
  const e = { id: uid(), itemId, ts: isoLocal(new Date()), tagIds: [], note: '' };
  db.entries.push(e);
  save();
  navigator.vibrate?.(15);
  lastLoggedId = e.id;
  gapAsk = missedDays(itemById(itemId));
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
const dismissTagRow = () => { lastLoggedId = null; gapAsk = null; renderTagRow(); renderGapAsk(); };

// First log of today after a 1–2 day gap: those days may just have been forgotten.
// Learned per item: once it has 3+ finished episodes that typically last one day
// (headaches, a drink), it has shown it doesn't run for days, so stop asking.
function missedDays(it) {
  const t = today();
  const done = episodesOf(it).filter(ep => ep.end < t);
  if (done.length >= 3 && median(done.map(epLength)) === 1) return null;
  const mine = db.entries.filter(e => e.itemId === it.id).map(e => dayNum(eDay(e)));
  if (mine.filter(n => n === t).length > 1) return null; // already asked at today's first log
  const days = new Set(mine);
  if (days.has(t - 1)) return null;
  const missing = days.has(t - 2) ? [t - 1] : days.has(t - 3) ? [t - 2, t - 1] : null;
  return missing && { itemId: it.id, missing };
}

function renderGapAsk() {
  const card = $('#gapask');
  card.hidden = !gapAsk;
  if (!gapAsk) return;
  const it = itemById(gapAsk.itemId);
  const names = gapAsk.missing.map(n => fmtDay(numDay(n), { weekday: 'short', month: 'short', day: 'numeric' })).join(' or ');
  const close = () => { gapAsk = null; renderGapAsk(); };
  card.replaceChildren(
    h('p', {}, `No ${it.name} logged ${names}. Was it still there?`),
    h('div', { class: 'row' },
      h('button', {
        class: 'primary', onclick: () => {
          const { missing } = gapAsk;
          for (const n of missing) {
            const [y, m, d] = numDay(n).split('-').map(Number);
            db.entries.push({ id: uid(), itemId: it.id, ts: isoLocal(new Date(y, m - 1, d, 12)), tagIds: [], note: 'Filled in' });
          }
          save();
          close();
          renderAll();
          toast(`Added ${plural(missing.length, 'day')} to this ${it.name} episode`);
        },
      }, gapAsk.missing.length > 1 ? 'Yes, add them' : 'Yes, add it'),
      h('button', { class: 'secondary', onclick: close }, 'No')));
}

function removeEntry(id) {
  db.entries = db.entries.filter(e => e.id !== id);
  if (lastLoggedId === id) { lastLoggedId = null; gapAsk = null; }
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
  const ts = e ? e.ts : isoLocal(new Date());
  $('#f-date').value = ts.slice(0, 10);
  $('#f-time').value = ts.slice(11, 16);
  editTags = new Set(e ? e.tagIds : []);
  $('#f-tags').replaceChildren(...db.tags.filter(t => !t.archived || editTags.has(t.id))
    .map(t => chip(t.name, editTags.has(t.id), on => on ? editTags.add(t.id) : editTags.delete(t.id))));
  $('#f-note').value = e?.note || '';
  $('#f-delete').hidden = !e;
  $('#edit').returnValue = '';
  $('#edit').showModal();
  // The dialog focuses its first field, and on iPhone a focused picker pops open. That suits
  // adding (pick the item first) but not editing, where people should see the whole entry.
  (e ? $('#edit-title') : $('#f-item')).focus();
}

$('#edit').addEventListener('close', () => {
  if ($('#edit').returnValue !== 'save') return;
  const input = `${$('#f-date').value}T${$('#f-time').value}`;
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
let precede = { symptomId: null, window: 1 };

function renderPatterns() {
  const out = $('#patterns');
  const items = db.items.filter(it => !it.archived || db.entries.some(e => e.itemId === it.id));
  if (!db.entries.length) return out.replaceChildren(h('p', { class: 'empty' }, 'Log a few entries and patterns will show up here.'));
  const byItem = new Map(items.map(it => [it.id, db.entries.filter(e => e.itemId === it.id)]));
  out.replaceChildren(monthSummary(items, byItem), scaleSwitch(),
    ...items.map(it => itemCard(it, byItem.get(it.id))), precedeCard(items));
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
  return h('div', { class: 'card table-wrap' },
    h('table', { class: 'summary' },
      h('thead', {}, h('tr', {}, h('th', {}, ''), h('th', {}, monthName(now)), h('th', {}, monthName(prev)))),
      h('tbody', {}, items.map(it => h('tr', {},
        h('th', {}, it.name),
        h('td', {}, stat(byItem.get(it.id), thisM)),
        h('td', {}, stat(byItem.get(it.id), prevM)))))));
}

function scaleSwitch() {
  return h('div', { class: 'seg', role: 'group', 'aria-label': 'Chart period' },
    ['week', 'month', 'year'].map(s => h('button', {
      'aria-pressed': String(s === scale),
      onclick: () => {
        scale = s;
        try { localStorage.setItem(UI_KEY, s); } catch { /* not critical */ }
        renderPatterns();
      },
    }, s[0].toUpperCase() + s.slice(1))));
}

/* Chart periods for the current scale, oldest first: { from, to (dayNums, inclusive), label }. */
function periods() {
  const t = today(), [ty, tm] = todayKey().split('-').map(Number);
  if (scale === 'week') {
    const monday = t - (new Date(t * 864e5).getUTCDay() + 6) % 7;
    return Array.from({ length: 12 }, (_, i) => {
      const from = monday - (11 - i) * 7, k = numDay(from), d = +k.slice(8);
      return { from, to: from + 6, label: i === 0 || d <= 7 ? fmtDay(k, { month: 'short', day: 'numeric' }) : String(d) };
    });
  }
  if (scale === 'month') {
    return Array.from({ length: 12 }, (_, i) => {
      const m = ty * 12 + tm - 1 - (11 - i), y = Math.floor(m / 12), mo = m % 12;
      const from = Date.UTC(y, mo, 1) / 864e5, to = Date.UTC(y, mo + 1, 1) / 864e5 - 1;
      const name = fmtDay(numDay(from), { month: 'short' });
      return { from, to, label: i === 0 || mo === 0 ? `${name} ’${String(y).slice(2)}` : name };
    });
  }
  const firstYear = Math.max(ty - 9, Math.min(...db.entries.map(e => +e.ts.slice(0, 4))));
  return Array.from({ length: ty - firstYear + 1 }, (_, i) => ({
    from: Date.UTC(firstYear + i, 0, 1) / 864e5, to: Date.UTC(firstYear + i + 1, 0, 1) / 864e5 - 1, label: String(firstYear + i),
  }));
}

function itemCard(it, entries) {
  // Bars count days with the item, not taps: three inhaler puffs on one day count once.
  const days = [...new Set(entries.map(e => dayNum(eDay(e))))];
  const ps = periods();
  const counts = ps.map(p => days.filter(n => n >= p.from && n <= p.to).length);
  const max = Math.max(1, ...counts);
  const bars = h('div', { class: 'bars', role: 'img', 'aria-label': `${it.name}, days per ${scale}: ${counts.join(', ')}` },
    counts.map((c, i) => {
      const bar = h('div', { class: 'bar' });
      bar.style.height = `${(c / max) * 100}%`;
      return h('div', { class: 'col' },
        h('span', { class: 'v' }, c || ''),
        h('div', { class: 'track' }, bar),
        h('span', { class: 'x' }, ps[i].label));
    }));

  const tagCounts = new Map();
  for (const e of entries) for (const id of e.tagIds) tagCounts.set(id, (tagCounts.get(id) || 0) + 1);
  const top = [...tagCounts].filter(([id]) => tagById(id)).sort((a, b) => b[1] - a[1]).slice(0, 5);

  return h('div', { class: 'card' },
    h('h3', {}, `${it.name} · days per ${scale}`),
    bars,
    episodeSection(it),
    h('strong', {}, 'Most tagged triggers'),
    top.length
      ? h('ol', { class: 'taglist' }, top.map(([id, n]) =>
          h('li', {}, `${tagById(id).name}: ${n} (${Math.round((n / entries.length) * 100)}% of entries)`)))
      : h('p', { class: 'hint' }, 'No tags yet.'));
}

const median = xs => {
  const s = [...xs].sort((a, b) => a - b), m = s.length >> 1;
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
};

function episodeSection(it) {
  const eps = episodesOf(it);
  if (!eps.some(ep => epLength(ep) > 1)) return null; // never runs for days: nothing to show
  const last = eps.at(-1), ongoing = isOngoing(last);
  const done = ongoing ? eps.slice(0, -1) : eps; // an open episode's length isn't known yet
  const between = eps.slice(1).map((ep, i) => ep.start - eps[i].end - 1);
  const thisYear = todayKey().slice(0, 4);
  const fmt = n => { const k = numDay(n); return fmtDay(k, { month: 'short', day: 'numeric', ...(k.startsWith(thisYear) ? {} : { year: 'numeric' }) }); };

  const lines = [
    ongoing ? `Ongoing: day ${today() - last.start + 1}.` : `${plural(today() - last.end, 'day')} since the last one ended.`,
    done.length && `${plural(eps.length, 'episode')}. Typically ${plural(median(done.map(epLength)), 'day')}, longest ${plural(Math.max(...done.map(epLength)), 'day')}.`,
    between.length && `Typically ${plural(median(between), 'day')} between episodes.`,
  ].filter(Boolean);

  const recent = eps.slice(-8).reverse();
  return h('div', { class: 'episodes' },
    h('strong', {}, 'Episodes'),
    lines.map(l => h('p', { class: 'ep-stat' }, l)),
    h('ul', { class: 'ep-list' }, recent.map(ep => {
      const tags = [...ep.tagIds].map(id => tagById(id)?.name).filter(Boolean).join(', ');
      const range = ep.start === ep.end ? fmt(ep.start) : `${fmt(ep.start)} – ${fmt(ep.end)}`;
      const len = ongoing && ep === last ? `day ${today() - ep.start + 1}, ongoing` : plural(epLength(ep), 'day');
      return h('li', {}, h('span', { class: 'ep-range' }, range), ` · ${len} · ${plural(ep.logs, 'log')}`, tags && h('span', { class: 'meta' }, ` · ${tags}`));
    })),
    eps.length > recent.length && h('p', { class: 'hint' }, `…and ${eps.length - recent.length} earlier.`));
}

/* "What comes before it?": for each other item, how often it was logged in the window before
 * a symptom episode started, compared with how often it was logged before any day at all.
 * Only each episode's first day counts: what happened on day 5 of a cold sore isn't a trigger. */
function precedeCard(items) {
  const withData = items.filter(it => db.entries.some(e => e.itemId === it.id));
  if (withData.length < 2) {
    return h('div', { class: 'card' }, h('h3', {}, 'What comes before it?'),
      h('p', { class: 'hint' }, 'Log exposures like Alcohol or Bad sleep as their own items, and this will compare them against your symptom days.'));
  }
  if (!withData.some(it => it.id === precede.symptomId)) precede.symptomId = withData[0].id;

  const t = today();
  const firstDay = Math.min(...db.entries.map(e => dayNum(eDay(e))));
  const start = Math.max(firstDay, t - 364);
  const total = t - start + 1;
  const daysOf = id => new Set(db.entries.filter(e => e.itemId === id).map(e => dayNum(eDay(e))));
  const sym = itemById(precede.symptomId);
  const symptomDays = episodesOf(sym).map(ep => ep.start).filter(n => n >= start && n <= t);

  const rows = withData.filter(it => it.id !== sym.id).map(it => {
    const ex = daysOf(it.id);
    const exposed = n => { for (let k = 0; k <= precede.window; k++) if (ex.has(n - k)) return true; return false; };
    const hit = symptomDays.filter(exposed).length;
    let base = 0;
    for (let n = start; n <= t; n++) if (exposed(n)) base++;
    const pS = symptomDays.length ? hit / symptomDays.length : 0, pB = base / total;
    return { it, hit, pS, pB, lift: pB ? pS / pB : 0 };
  }).sort((a, b) => b.lift - a.lift);

  const unit = `${sym.name} episode`;
  const pct = x => `${Math.round(x * 100)}%`;
  const enough = symptomDays.length >= 5;

  return h('div', { class: 'card' },
    h('h3', {}, 'What comes before it?'),
    h('div', { class: 'controls' },
      h('select', { 'aria-label': 'Symptom', onchange: ev => { precede.symptomId = ev.target.value; renderPatterns(); } },
        withData.map(it => h('option', { value: it.id, selected: it.id === sym.id }, it.name))),
      h('select', { 'aria-label': 'Window', onchange: ev => { precede.window = +ev.target.value; renderPatterns(); } },
        [[0, 'Same day'], [1, '≤ 1 day before'], [2, '≤ 2 days before'], [3, '≤ 3 days before'], [5, '≤ 5 days before']]
          .map(([v, l]) => h('option', { value: v, selected: v === precede.window }, l)))),
    h('p', { class: 'hint' }, `${plural(symptomDays.length, unit)} over the last ${plural(total, 'day')}` +
      '. Days in a row count once, from the first day.' + (enough ? '' : ' Too few to read much into yet.')),
    rows.map(r => h('div', { class: 'precede-row' + (enough && r.hit >= 3 && r.lift >= 1.5 ? ' strong' : '') },
      h('div', {}, h('strong', {}, r.it.name), ' ', h('span', { class: 'lift' }, r.pB ? `${r.lift.toFixed(1)}×` : '–')),
      h('div', { class: 'meta' }, `Before ${pct(r.pS)} of ${unit}s (${r.hit}/${symptomDays.length}) vs ${pct(r.pB)} of all days`))),
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
    // Kept together so that, when the row is too narrow, they wrap as one group under the name.
    h('div', { class: 'row-actions' },
      h('button', { class: 'icon-btn', 'aria-label': `Move ${x.name} up`, disabled: i === 0, onclick: () => move(list, i, -1) }, '↑'),
      h('button', { class: 'icon-btn', 'aria-label': `Move ${x.name} down`, disabled: i === list.length - 1, onclick: () => move(list, i, 1) }, '↓'),
      // Hidden items leave the Log screen / trigger row; their history stays.
      h('button', { class: 'small hide-btn', 'aria-label': `${x.archived ? 'Show' : 'Hide'} ${x.name}`, onclick: () => { x.archived = !x.archived; save(); renderAll(); } },
        x.archived ? 'Show' : 'Hide')))));
}

// One line per row only while every name is fully visible; otherwise the whole list
// switches to name-above-buttons, so rows stay consistent.
function fitLists() {
  for (const el of document.querySelectorAll('.list')) {
    el.classList.remove('stacked');
    if (el.offsetParent === null) continue; // hidden: measured when Settings is shown
    const clipped = [...el.querySelectorAll('.list-row input')].some(i => i.scrollWidth > i.clientWidth + 1);
    el.classList.toggle('stacked', clipped);
  }
}

function move(list, i, d) {
  [list[i], list[i + d]] = [list[i + d], list[i]];
  save();
  renderAll();
}
function bindAdd(form, list, make) {
  form.addEventListener('submit', ev => {
    ev.preventDefault();
    const v = cleanName(form.elements.name.value);
    if (!v) return;
    if (nameTaken(list, v)) return toast(`“${v}” already exists`);
    list.push(make(v));
    save();
    form.reset();
    renderAll();
  });
}
bindAdd($('#add-item'), db.items, named);
bindAdd($('#add-tag'), db.tags, named);

function renderSettings() {
  renderList(db.items, $('#items-list'));
  renderList(db.tags, $('#tags-list'));
  fitLists();
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

function findOrCreate(list, name, make) {
  const n = cleanName(name);
  let x = list.find(x => x.name.toLowerCase() === n.toLowerCase());
  if (!x) list.push(x = make(n));
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
    const item = findOrCreate(db.items, itemName, named);
    const key = `${Date.parse(ts)}|${item.id}`;
    if (seen.has(key)) { dupes++; continue; }
    seen.add(key);
    const tagIds = (r[col.tags] || '').split(';').map(s => s.trim()).filter(Boolean).map(n => findOrCreate(db.tags, n, named).id);
    db.entries.push({ id: uid(), itemId: item.id, ts, tagIds: [...new Set(tagIds)], note: (r[col.note] || '').trim() });
    added++;
  }
  save();
  renderAll();
  finishOnboarding?.();
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
const TITLES = { log: 'Health Log', history: 'History', patterns: 'Patterns', settings: 'Settings', onboard: 'Health Log' };
function show(view) {
  for (const b of document.querySelectorAll('.tabs button')) {
    if (b.dataset.view === view) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
  }
  for (const v of Object.keys(TITLES)) $(`#view-${v}`).hidden = v !== view;
  $('#title').textContent = TITLES[view];
  if (view !== 'log') dismissTagRow(); else fitGrid();
  if (view === 'settings') fitLists();
  scrollTo(0, 0);
}
document.querySelectorAll('.tabs button').forEach(b => b.addEventListener('click', () => show(b.dataset.view)));
document.querySelectorAll('.add-past').forEach(b => b.addEventListener('click', () => openEdit(null)));
$('#tagrow-close').addEventListener('click', dismissTagRow);
$('#tagrow-edit').addEventListener('click', () => {
  show('settings');
  $('#tags-heading').scrollIntoView();
  scrollBy(0, -$('.top').offsetHeight - 8); // clear the sticky header (its height follows text size)
});

function renderAll() {
  renderLog();
  renderGapAsk();
  renderTagRow();
  renderHistory();
  renderPatterns();
  renderSettings();
}

// Coming back to the app later: refresh "this month" counts, drop the stale trigger row.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') { lastLoggedId = null; gapAsk = null; renderAll(); }
});
// Another open tab changed the data.
addEventListener('storage', ev => {
  if (ev.key === KEY) location.reload(); // simplest way to pick up the new data everywhere
});

/* ---------- Onboarding ----------
 * Shown when this device has no saved data. A link like ?track=Heartburn,Spicy+food
 * pre-selects (or adds) items, so you can send family a ready-made setup.
 */
let finishOnboarding = null; // set while the first-launch picker is showing

function onboard() {
  const sameName = (a, b) => a.toLowerCase() === b.toLowerCase();
  const pre = (new URLSearchParams(location.search).get('track') || '').split(',').map(cleanName).filter(Boolean);
  const names = [...SUGGESTED_ITEMS];
  for (const p of pre) if (!names.some(n => sameName(n, p))) names.push(p);
  const picked = new Set(names.filter(n => pre.some(p => sameName(n, p))));
  const tagNames = [...SEED_TAGS];
  const tags = new Set(STARTER_TAGS);

  const renderItems = () => {
    $('#ob-items').replaceChildren(...names.map(n => chip(n, picked.has(n), on => {
      on ? picked.add(n) : picked.delete(n);
      $('#ob-start').disabled = !picked.size;
    })));
    $('#ob-start').disabled = !picked.size;
  };
  renderItems();
  const renderTags = () => $('#ob-tags').replaceChildren(...tagNames.map(t => chip(t, tags.has(t), on => on ? tags.add(t) : tags.delete(t))));
  renderTags();
  $('#ob-tag-add').addEventListener('submit', ev => {
    ev.preventDefault();
    const v = cleanName(ev.target.elements.name.value);
    if (!v) return;
    tags.add(tagNames.find(n => sameName(n, v)) || (tagNames.push(v), v));
    ev.target.reset();
    renderTags();
  });

  $('#ob-add').addEventListener('submit', ev => {
    ev.preventDefault();
    const v = cleanName(ev.target.elements.name.value);
    if (!v) return;
    const existing = names.find(n => sameName(n, v));
    picked.add(existing || (names.push(v), v));
    ev.target.reset();
    renderItems();
  });

  // Mutate in place: the Settings add-forms hold references to these arrays.
  const addTags = () => db.tags.push(...tagNames.filter(t => tags.has(t) && !db.tags.some(x => sameName(x.name, t))).map(named));
  const done = () => {
    addTags();
    save();
    finishOnboarding = null;
    history.replaceState(null, '', location.pathname);
    document.body.classList.remove('onboarding');
    renderAll();
    show('log');
  };
  $('#ob-start').addEventListener('click', () => {
    db.items.push(...names.filter(n => picked.has(n)).map(named));
    done();
  });
  // Restoring a backup: the CSV brings its own items, so finish once it has imported something.
  $('#ob-import').addEventListener('click', () => $('#import').click());
  finishOnboarding = () => { if (db.entries.length) done(); };

  // iPhone Safari and the Home Screen app have separate storage: set up inside the installed app.
  const iOS = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const installed = navigator.standalone || matchMedia('(display-mode: standalone)').matches;
  const needsInstall = iOS && !installed;
  $('#install-hint').hidden = !needsInstall;
  $('#picker').hidden = needsInstall;
  document.body.classList.toggle('installing', needsInstall); // the card has its own heading
  $('#install-skip').addEventListener('click', () => {
    $('#install-hint').hidden = true;
    $('#picker').hidden = false;
    document.body.classList.remove('installing');
  });

  document.body.classList.add('onboarding');
  show('onboard');
}

/* ---------- Delete all data ---------- */
$('#wipe').addEventListener('click', () => {
  const n = db.entries.length;
  $('#wipe-detail').textContent = `This erases ${n} ${n === 1 ? 'entry' : 'entries'}, your items and your trigger tags. ` +
    (n && !db.lastExport ? 'You have never exported a backup. ' : '') + 'It can’t be undone; export a CSV first if you might want them back.';
  $('#wipe').hidden = true;
  $('#wipe-confirm').hidden = false;
});
$('#wipe-no').addEventListener('click', () => { $('#wipe-confirm').hidden = true; $('#wipe').hidden = false; });
$('#wipe-yes').addEventListener('click', () => {
  try { localStorage.removeItem(KEY); localStorage.removeItem(UI_KEY); } catch { /* nothing to clear */ }
  location.replace(location.pathname); // reloads into first-launch setup
});

renderAll();
if (isNewDevice) onboard();

// Ask the browser not to evict our data; report the result in Settings.
navigator.storage?.persist?.().then(ok => {
  $('#storage-status').textContent = ok ? 'Storage is marked persistent.' : 'Browser may clear storage under pressure: export regularly.';
}).catch(() => {});

if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => {});
