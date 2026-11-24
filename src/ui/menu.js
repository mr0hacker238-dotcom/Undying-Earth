import { display, begin, refreshLayout } from '../core/display.js';
import { drawText, textWidth } from '../core/font.js';
import { CONFIG } from '../config.js';
import { settings, saveSettings } from '../core/settings.js';
import { DIFF_LABEL, listWorlds, createWorld, updateWorld, deleteWorld, touchWorld } from '../core/worlds.js';
import { createTitle } from './title.js';

// Main menu. Layout (landscape):
//   top-left   : name tag with avatar        left edge : arrow that opens "more options"
//   right side : planet, one-line title, then the menu list
//   bottom-left: version text                top-right : fullscreen button (HTML, in index.html)
// Single Player opens a window to create, pick, edit and delete worlds.
// Everything keeps clear of the screen's safe area (camera cutout) via display.inset.

const COL = {
  text: '#c9d6c3', sel: '#ee6a4d', dim: '#59635a', note: '#8f9a8a',
  tag: '#3a2347', line: '#c9d6c3', panel: '#0e0a16', arrow: '#ff9a62', win: '#0e0a16',
};
const DIFF_COL = { easy: '#6fb85a', normal: '#c9d6c3', hardcore: '#ee6a4d' };
const DIFF_DESC = {
  easy: 'FEWER ZOMBIES. LOAD EARLIER SAVES.',
  normal: 'STANDARD ZOMBIES. LOAD EARLIER SAVES.',
  hardcore: 'NO LOADING EARLIER SAVES. LOCKED.',
};
const MARGINS = ['OFF', 'SMALL', 'MEDIUM', 'LARGE'];
const PANEL = [
  ['HOW TO PLAY', ['A QUICK GUIDE IS COMING SOON']],
  ['CREDITS', ['CREDITS ARE COMING SOON']],
  ['PRIVACY AND TERMS', ['COMING SOON']],
  ['FEEDBACK', ['COMING SOON']],
];
const AVATAR = ['00011000', '00111100', '00111100', '00011000', '01111110', '11111111', '11111111', '11111111'];
const LOCK = ['01110', '01010', '11111', '11011', '11111'];
const WINDOWS = ['worlds', 'create', 'edit', 'confirm'];
const PLANET_H = 23;
const TITLE_UNITS = 77; // width of the one-line title in font pixels, per size step

export function createMenu({ ctx, canvas, planet, session, nameInput }) {
  const touch = matchMedia('(pointer: coarse)').matches;
  const title = createTitle();
  let screen = 'press'; // press | main | settings | info | worlds | create | edit | confirm
  let history = [];
  let sel = 0;
  let panelOpen = false;
  let psel = 0;
  let info = { title: '', lines: [] };
  let hits = [];
  let wsel = 0;
  let wscroll = 0;
  let listInfo = { max: 0, rowH: 1, lh: 1 };
  let form = { name: '', difficulty: 'normal', editId: null };
  let U = 2; // main text size
  let S = 1; // small text size
  let inputKey = '';

  const planetReady = () => !!(planet && planet.complete && planet.naturalWidth);
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const selWorld = () => listWorlds()[wsel];

  // ---------- screens and actions ----------
  const mainItems = () => [
    { label: 'SINGLE PLAYER', run: openWorlds },
    { label: 'MULTIPLAYER', disabled: true, note: 'SOON' },
    { label: 'PURCHASE', disabled: true, note: 'SOON' },
    { label: 'SETTINGS', go: 'settings' },
  ];

  function items() {
    switch (screen) {
      case 'main': return mainItems();
      case 'settings': return [
        { label: `SCREEN MARGIN ${MARGINS[settings.margin]}`, run: cycleMargin },
        { label: 'SOUND', disabled: true, note: 'SOON' },
        { label: 'BACK', back: true },
      ];
      case 'info': return [{ label: 'BACK', back: true }];
      default: return [];
    }
  }

  function cycleMargin() {
    settings.margin = (settings.margin + 1) % MARGINS.length;
    saveSettings();
    refreshLayout();
  }

  const firstEnabled = () => Math.max(0, items().findIndex((it) => !it.disabled));
  function go(name) { history.push(screen); screen = name; panelOpen = false; sel = firstEnabled(); }
  function back() { if (history.length) { screen = history.pop(); sel = firstEnabled(); } }
  function showInfo(t, lines) { info = { title: t, lines }; go('info'); }
  function openPanelItem(i) { panelOpen = false; showInfo(PANEL[i][0], PANEL[i][1]); }
  function activate(item) {
    if (!item || item.disabled) return;
    if (item.back) back(); else if (item.go) go(item.go); else if (item.run) item.run();
  }

  function proceed() {
    begin(); // fullscreen + keep-awake, inside the user's first tap or key press
    // Later, with accounts: if (!session.loggedIn) show the login screen here instead.
    history = [];
    screen = 'main';
    sel = 0;
  }

  function openWorlds() { wsel = 0; wscroll = 0; go('worlds'); }

  function focusName() {
    nameInput.value = form.name;
    if (!touch) requestAnimationFrame(() => { nameInput.focus(); nameInput.select?.(); });
  }
  function openCreate() {
    if (listWorlds().length >= CONFIG.MAX_WORLDS) return;
    form = { name: `World ${listWorlds().length + 1}`, difficulty: 'normal', editId: null };
    go('create');
    focusName();
  }
  function openEdit() {
    const w = selWorld();
    if (!w || w.difficulty === 'hardcore') return; // hardcore is locked
    form = { name: w.name, difficulty: w.difficulty, editId: w.id };
    go('edit');
    focusName();
  }
  function submitForm() {
    if (screen === 'create') {
      const w = createWorld(form.name, form.difficulty);
      if (!w) return;
      back();
      wsel = Math.max(0, listWorlds().findIndex((x) => x.id === w.id));
      wscroll = 0;
    } else if (screen === 'edit') {
      updateWorld(form.editId, { name: form.name, difficulty: form.difficulty });
      back();
    }
  }
  function confirmDelete() {
    const w = selWorld();
    if (w) deleteWorld(w.id);
    back();
    wsel = clamp(wsel, 0, Math.max(0, listWorlds().length - 1));
  }
  function doButton(id) {
    switch (id) {
      case 'play': { const w = selWorld(); if (w) { touchWorld(w.id); showInfo(w.name, ['THE GAME WORLD COMES IN 0.2.0']); } break; }
      case 'create': openCreate(); break;
      case 'edit': openEdit(); break;
      case 'delete': if (selWorld()) go('confirm'); break;
      case 'submit': submitForm(); break;
      case 'confirm': confirmDelete(); break;
      default: back(); // back / cancel
    }
  }

  // ---------- drawing helpers ----------
  function frame(x, y, w, h, col, t = 1) {
    ctx.fillStyle = col;
    ctx.fillRect(x, y, w, t); ctx.fillRect(x, y + h - t, w, t);
    ctx.fillRect(x, y, t, h); ctx.fillRect(x + w - t, y, t, h);
  }

  function drawArrow(x, y, dir, k) {
    ctx.fillStyle = COL.arrow;
    for (let r = -3; r <= 3; r++) {
      const w = 4 - Math.abs(r);
      ctx.fillRect(dir > 0 ? x : x + (4 - w) * k, y + (r + 3) * k, w * k, k);
    }
  }

  function drawLock(x, y, k, col) {
    ctx.fillStyle = col;
    LOCK.forEach((row, r) => { for (let c = 0; c < 5; c++) if (row[c] === '1') ctx.fillRect(x + c * k, y + r * k, k, k); });
  }

  // Planet icon, then "UNDYING EARTH" on one line (live text, so blood can stick to it later).
  function headerHeight(k, t) { return (planetReady() ? PLANET_H * k + 6 : 0) + 8 * t; }
  function drawHeader(cx, top, k, t) {
    let y = top;
    if (planetReady()) {
      ctx.imageSmoothingEnabled = false;
      const pw = planet.naturalWidth * k;
      ctx.drawImage(planet, Math.round(cx - pw / 2), y, pw, planet.naturalHeight * k);
      y += PLANET_H * k + 6;
    }
    return y + title.draw(ctx, cx, y, t).h;
  }

  function drawTag(a) {
    const pad = U + 2;
    const th = 7 * U + 2 * pad + 2;
    const av = th - 4;
    const tw = textWidth(session.name, U);
    const w = 3 + av + pad + tw + pad + 1;
    const x = a.x + 8;
    const y = a.y + 8;
    ctx.fillStyle = COL.line; ctx.fillRect(x, y, w, th);
    ctx.fillStyle = COL.tag; ctx.fillRect(x + 1, y + 1, w - 2, th - 2);
    const ax = x + 3;
    const ay = y + 2;
    ctx.fillStyle = '#241a35'; ctx.fillRect(ax, ay, av, av);
    const cell = Math.max(1, Math.floor(av / 8));
    const ox = ax + Math.floor((av - 8 * cell) / 2);
    const oy = ay + Math.floor((av - 8 * cell) / 2);
    ctx.fillStyle = COL.text;
    AVATAR.forEach((row, r) => { for (let c = 0; c < 8; c++) if (row[c] === '1') ctx.fillRect(ox + c * cell, oy + r * cell, cell, cell); });
    drawText(ctx, session.name, ax + av + pad, y + Math.floor((th - 7 * U) / 2), COL.text, U);
  }

  function drawVersion(a) {
    drawText(ctx, `V${CONFIG.VERSION}`, a.x + 8, a.y + a.h - 7 * S - 8, COL.note, S);
  }

  function drawPress(a) {
    const cx = a.x + a.w / 2;
    const t = clamp(Math.floor((a.w * 0.6) / TITLE_UNITS), 1, 5);
    const top = a.y + Math.round(a.h * 0.12);
    const y = drawHeader(cx, top, U, t) + 18;
    if (Math.floor(performance.now() / 600) % 2 === 0) {
      drawText(ctx, touch ? 'TAP ANYWHERE TO CONTINUE' : 'CLICK ANYWHERE OR PRESS ANY KEY', cx, y, COL.text, U, 'center');
    }
    if (display.hint) drawText(ctx, display.hint, cx, y + 7 * U + 12, COL.note, S, 'center');
    drawVersion(a);
  }

  function drawBase(a, list) {
    const colX = a.x + Math.round(a.w * 0.72);
    const colW = Math.round(a.w * 0.4);
    const t = Math.max(1, Math.floor((colW - 6) / TITLE_UNITS));
    const top = a.y + Math.round(a.h * 0.05);
    let y = drawHeader(colX, top, U, t) + 12;
    const pitch = 7 * U + (U === 3 ? 16 : 14);

    if (screen === 'info') {
      drawText(ctx, info.title, colX, y, COL.text, U, 'center', '#1a1426');
      y += 7 * U + 10;
      info.lines.forEach((ln, i) => drawText(ctx, ln, colX, y + i * (7 * S + 6), COL.note, S, 'center'));
      y += info.lines.length * (7 * S + 6) + 8;
    }

    list.forEach((it, i) => {
      const rowY = y + i * pitch;
      const ty = rowY + Math.round((pitch - 7 * U) / 2);
      const color = it.disabled ? COL.dim : (i === sel && !touch ? COL.sel : COL.text);
      drawText(ctx, it.label, colX, ty, color, U, 'center');
      if (it.note) drawText(ctx, it.note, colX + Math.round(textWidth(it.label, U) / 2) + 6, ty + 7 * U - 7 * S, COL.dim, S);
      hits.push({ kind: 'item', i, x: colX - colW / 2, y: rowY, w: colW, h: pitch });
    });

    drawTag(a);

    const pw = panelOpen ? a.x + textWidth('PRIVACY AND TERMS', S) + 28 : 0;
    if (panelOpen) {
      ctx.fillStyle = COL.panel; ctx.fillRect(0, 0, pw, display.height);
      ctx.fillStyle = COL.tag; ctx.fillRect(pw, 0, 1, display.height);
      const ppitch = 7 * S + 14;
      const ptop = Math.round(display.height / 2 - (PANEL.length * ppitch) / 2);
      PANEL.forEach(([label], i) => {
        const py = ptop + i * ppitch;
        drawText(ctx, label, a.x + 14, py + Math.round((ppitch - 7 * S) / 2), i === psel && !touch ? COL.sel : COL.text, S);
        hits.push({ kind: 'panel', i, x: 0, y: py, w: pw, h: ppitch });
      });
    }
    const ah = 7 * U;
    const ay = Math.round(display.height / 2 - ah / 2);
    drawArrow(panelOpen ? pw + 4 : a.x + 4, ay, panelOpen ? -1 : 1, U);
    hits.push({ kind: 'arrow', x: panelOpen ? pw : 0, y: ay - 16, w: (panelOpen ? 0 : a.x) + 4 * U + 14, h: ah + 32 });
    drawVersion(a);
  }

  // ---------- windows ----------
  function windowRect(a, wide, tall) {
    const w = Math.round(a.w * wide);
    const h = Math.round(a.h * tall);
    return { x: a.x + Math.round((a.w - w) / 2), y: a.y + Math.round((a.h - h) / 2), w, h };
  }

  function drawWindow(r, heading) {
    ctx.fillStyle = COL.win; ctx.fillRect(r.x, r.y, r.w, r.h);
    frame(r.x, r.y, r.w, r.h, COL.line, 2);
    drawText(ctx, heading, r.x + r.w / 2, r.y + 8, COL.text, U, 'center');
    return r.y + 8 + 7 * U + 10;
  }

  function button(id, label, x, y, w, h, { disabled = false, selected = false } = {}) {
    const col = disabled ? COL.dim : (selected ? COL.sel : COL.text);
    frame(x, y, w, h, col);
    drawText(ctx, label, x + w / 2, y + Math.floor((h - 7 * S) / 2), col, S, 'center');
    hits.push({ kind: 'btn', id, x, y, w, h, disabled });
  }

  function buttonRow(r, specs, rowFromBottom) {
    const bh = 7 * S + 14;
    const y = r.y + r.h - 8 - bh - rowFromBottom * (bh + 6);
    const lx = r.x + 10;
    const lw = r.w - 20;
    const bw = Math.floor((lw - 6 * (specs.length - 1)) / specs.length);
    specs.forEach((s, i) => button(s.id, s.label, lx + i * (bw + 6), y, bw, bh, s));
  }

  function drawWorlds(a) {
    const r = windowRect(a, 0.84, 0.88);
    const top = drawWindow(r, 'SINGLE PLAYER');
    const worlds = listWorlds();
    wsel = clamp(wsel, 0, Math.max(0, worlds.length - 1));
    const bh = 7 * S + 14;
    const lx = r.x + 10;
    const lw = r.w - 20;
    const ly = top;
    const lh = r.y + r.h - 8 - 2 * bh - 6 - 8 - ly;
    const rowH = 7 * U + 7 * S + 14;
    listInfo = { max: Math.max(0, worlds.length * rowH - lh), rowH, lh };
    wscroll = clamp(wscroll, 0, listInfo.max);

    if (!worlds.length) {
      drawText(ctx, 'NO WORLDS YET', lx + lw / 2, ly + Math.round(lh / 2 - 3.5 * U), COL.note, U, 'center');
    }
    ctx.save();
    ctx.beginPath(); ctx.rect(lx, ly, lw, lh); ctx.clip();
    worlds.forEach((w, i) => {
      const ry = ly + i * rowH - wscroll;
      if (ry + rowH < ly || ry > ly + lh) return;
      if (i === wsel) frame(lx, ry, lw, rowH - 2, COL.sel);
      drawText(ctx, w.name, lx + 10, ry + 6, COL.text, U);
      if (w.difficulty === 'hardcore') drawLock(lx + lw - 10 - 5 * S, ry + 6, S, COL.sel);
      const subY = ry + 6 + 7 * U + 4;
      drawText(ctx, DIFF_LABEL[w.difficulty], lx + 10, subY, DIFF_COL[w.difficulty], S);
      drawText(ctx, new Date(w.played).toISOString().slice(0, 10), lx + lw - 10, subY, COL.note, S, 'right');
      const y0 = Math.max(ry, ly);
      const y1 = Math.min(ry + rowH, ly + lh);
      if (y1 > y0) hits.push({ kind: 'world', i, x: lx, y: y0, w: lw, h: y1 - y0 });
    });
    ctx.restore();

    const w = worlds[wsel];
    buttonRow(r, [
      { id: 'edit', label: 'EDIT', disabled: !w || w.difficulty === 'hardcore' },
      { id: 'delete', label: 'DELETE', disabled: !w },
      { id: 'back', label: 'BACK' },
    ], 0);
    buttonRow(r, [
      { id: 'play', label: 'PLAY', disabled: !w, selected: !!w && !touch },
      { id: 'create', label: 'CREATE NEW WORLD', disabled: worlds.length >= CONFIG.MAX_WORLDS },
    ], 1);
  }

  function placeInput(x, y, w, h) {
    const r = canvas.getBoundingClientRect();
    const sx = r.width / display.width;
    const sy = r.height / display.height;
    const key = [x, y, w, h, r.left, r.top, sx, sy].join();
    if (key === inputKey) return;
    inputKey = key;
    const st = nameInput.style;
    st.left = `${r.left + x * sx}px`; st.top = `${r.top + y * sy}px`;
    st.width = `${w * sx}px`; st.height = `${h * sy}px`;
    st.fontSize = `${Math.max(12, h * sy * 0.5)}px`;
  }

  function drawForm(a, editing) {
    const r = windowRect(a, 0.84, 0.94);
    const top = drawWindow(r, editing ? 'EDIT WORLD' : 'CREATE NEW WORLD');
    const lx = r.x + 10;
    const lw = r.w - 20;
    drawText(ctx, 'WORLD NAME', lx, top, COL.note, S);
    const iy = top + 7 * S + 4;
    const ih = 7 * U + 10;
    placeInput(lx, iy, lw, ih);
    let y = iy + ih + 10;
    drawText(ctx, 'DIFFICULTY', lx, y, COL.note, S);
    y += 7 * S + 4;
    const rowH = 7 * U + 7 * S + 16;
    (editing ? ['easy', 'normal'] : ['easy', 'normal', 'hardcore']).forEach((d, i) => {
      const ry = y + i * rowH;
      const on = form.difficulty === d;
      frame(lx, ry, lw, rowH - 4, on ? COL.sel : COL.dim);
      drawText(ctx, DIFF_LABEL[d], lx + 10, ry + 5, DIFF_COL[d], U);
      drawText(ctx, DIFF_DESC[d], lx + 10, ry + 5 + 7 * U + 4, COL.note, S);
      hits.push({ kind: 'diff', d, x: lx, y: ry, w: lw, h: rowH - 4 });
    });
    buttonRow(r, [{ id: 'submit', label: editing ? 'SAVE' : 'CREATE', selected: !touch }, { id: 'back', label: 'CANCEL' }], 0);
  }

  function drawConfirm(a) {
    const r = windowRect(a, 0.7, 0.55);
    const top = drawWindow(r, 'DELETE WORLD?');
    const w = selWorld();
    const cx = r.x + r.w / 2;
    if (w) drawText(ctx, w.name, cx, top + 4, COL.text, U, 'center');
    drawText(ctx, 'THIS CANNOT BE UNDONE.', cx, top + 4 + 7 * U + 10, COL.note, S, 'center');
    buttonRow(r, [{ id: 'confirm', label: 'DELETE' }, { id: 'back', label: 'CANCEL', selected: !touch }], 0);
  }

  function draw() {
    const W = display.width;
    const H = display.height;
    const i = display.inset;
    U = H >= 330 ? 3 : 2;
    S = Math.max(1, U - 1);
    const a = { x: i.left, y: i.top, w: W - i.left - i.right, h: H - i.top - i.bottom };
    hits = [];
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#000000'; // black for now; gameplay will play here later
    ctx.fillRect(0, 0, W, H);

    if (screen === 'press') {
      drawPress(a);
    } else if (WINDOWS.includes(screen)) {
      drawBase(a, mainItems());
      hits = [];
      ctx.globalAlpha = 0.7; ctx.fillStyle = '#000000'; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1;
      if (screen === 'worlds') drawWorlds(a);
      else if (screen === 'confirm') drawConfirm(a);
      else drawForm(a, screen === 'edit');
    } else {
      drawBase(a, items());
    }
    nameInput.hidden = !(screen === 'create' || screen === 'edit');
  }

  // ---------- input ----------
  function toLogical(e) {
    const r = canvas.getBoundingClientRect();
    return { x: ((e.clientX - r.left) * display.width) / r.width, y: ((e.clientY - r.top) * display.height) / r.height };
  }
  const hitAt = (x, y) => [...hits].reverse().find((r) => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h);
  const ensureVisible = () => {
    const top = wsel * listInfo.rowH;
    const bottom = top + listInfo.rowH;
    if (top < wscroll) wscroll = top; else if (bottom > wscroll + listInfo.lh) wscroll = bottom - listInfo.lh;
  };

  let drag = null;
  canvas.addEventListener('pointerdown', (e) => {
    if (screen !== 'worlds') return;
    drag = { y0: toLogical(e).y, s0: wscroll, moved: false };
  });
  canvas.addEventListener('pointercancel', () => { drag = null; });
  canvas.addEventListener('pointermove', (e) => {
    const p = toLogical(e);
    if (drag) {
      const dy = drag.y0 - p.y;
      if (Math.abs(dy) > 4) drag.moved = true;
      if (drag.moved) wscroll = clamp(drag.s0 + dy, 0, listInfo.max);
      return;
    }
    if (e.pointerType !== 'mouse' || screen === 'press') return;
    const h = hitAt(p.x, p.y);
    if (h?.kind === 'item' && !items()[h.i].disabled) sel = h.i;
    else if (h?.kind === 'panel') psel = h.i;
  });
  canvas.addEventListener('wheel', (e) => {
    if (screen !== 'worlds') return;
    wscroll = clamp(wscroll + Math.sign(e.deltaY) * (listInfo.rowH / 2), 0, listInfo.max);
    e.preventDefault();
  }, { passive: false });

  // pointerup (not pointerdown) so touch taps count as a user gesture for fullscreen
  canvas.addEventListener('pointerup', (e) => {
    const moved = drag?.moved;
    drag = null;
    if (moved) return;
    if (screen === 'press') { proceed(); return; }
    const p = toLogical(e);
    const h = hitAt(p.x, p.y);
    if (panelOpen && (!h || h.kind === 'item')) { panelOpen = false; return; }
    if (!h) return;
    switch (h.kind) {
      case 'arrow': panelOpen = !panelOpen; psel = 0; break;
      case 'panel': openPanelItem(h.i); break;
      case 'item': sel = h.i; activate(items()[h.i]); break;
      case 'world': wsel = h.i; break;
      case 'diff': form.difficulty = h.d; break;
      case 'btn': if (!h.disabled) doButton(h.id); break;
      default: break;
    }
  });

  nameInput.addEventListener('input', () => { form.name = nameInput.value; });
  nameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); nameInput.blur(); submitForm(); }
    else if (e.key === 'Escape') { e.preventDefault(); nameInput.blur(); back(); }
  });

  addEventListener('keydown', (e) => {
    if (e.target?.tagName === 'INPUT') return; // typing a world name
    if (screen === 'press') {
      if (!e.repeat && !['Shift', 'Control', 'Alt', 'Meta', 'Escape', 'Tab'].includes(e.key)) proceed();
      return;
    }
    const up = ['ArrowUp', 'w', 'W'].includes(e.key);
    const down = ['ArrowDown', 's', 'S'].includes(e.key);

    if (screen === 'worlds') {
      const n = listWorlds().length;
      if (up || down) { wsel = clamp(wsel + (down ? 1 : -1), 0, Math.max(0, n - 1)); ensureVisible(); }
      else if (e.key === 'Enter') doButton('play');
      else if (e.key === 'Escape' || e.key === 'Backspace') back();
      else if (e.key === 'c' || e.key === 'C') openCreate();
      else if (e.key === 'e' || e.key === 'E') openEdit();
      else if (e.key === 'Delete') doButton('delete');
      else return;
      e.preventDefault();
      return;
    }
    if (screen === 'create' || screen === 'edit') {
      const opts = screen === 'edit' ? ['easy', 'normal'] : ['easy', 'normal', 'hardcore'];
      const i = Math.max(0, opts.indexOf(form.difficulty));
      if (up || down) form.difficulty = opts[clamp(i + (down ? 1 : -1), 0, opts.length - 1)];
      else if (e.key === 'Enter') submitForm();
      else if (e.key === 'Escape') back();
      else return;
      e.preventDefault();
      return;
    }
    if (screen === 'confirm') {
      if (e.key === 'Enter') confirmDelete(); else if (e.key === 'Escape') back(); else return;
      e.preventDefault();
      return;
    }

    const list = panelOpen ? PANEL : items();
    const move = (d) => {
      let i = panelOpen ? psel : sel;
      for (let n = 0; n < list.length; n++) {
        i = (i + d + list.length) % list.length;
        if (panelOpen || !list[i].disabled) break;
      }
      if (panelOpen) psel = i; else sel = i;
    };
    switch (e.key) {
      case 'ArrowDown': case 's': case 'S': move(1); break;
      case 'ArrowUp': case 'w': case 'W': move(-1); break;
      case 'Enter': case ' ':
        if (panelOpen) openPanelItem(psel); else activate(list[sel]);
        break;
      case 'Escape': case 'Backspace': if (panelOpen) panelOpen = false; else back(); break;
      case 'ArrowLeft': case 'a': case 'A': if (!panelOpen) { panelOpen = true; psel = 0; } break;
      case 'ArrowRight': case 'd': case 'D': panelOpen = false; break;
      default: return;
    }
    e.preventDefault();
  });

  return { draw, _hits: () => hits, _headerHeight: headerHeight };
}
