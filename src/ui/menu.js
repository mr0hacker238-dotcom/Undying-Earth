import { display, begin, toggleFullscreen, isFullscreen, canFullscreen } from '../core/display.js';
import { drawText, textWidth } from '../core/font.js';
import { CONFIG } from '../config.js';

// Main menu. Layout (landscape):
//   top-left   : name tag            left edge : arrow that opens "more options"
//   right side : logo, then the menu list
//   bottom-left: version text        top-right : fullscreen button (HTML, in index.html)
// Background is plain black for now; gameplay will play behind it later.

const COL = {
  text: '#c9d6c3', sel: '#ee6a4d', dim: '#59635a', note: '#8f9a8a',
  tag: '#3a2347', line: '#c9d6c3', panel: '#0e0a16', arrow: '#ff9a62',
};
const LOGO_W = 49;
const LOGO_H = 52;

const PANEL = [
  ['HOW TO PLAY', ['A QUICK GUIDE IS COMING SOON']],
  ['CREDITS', ['CREDITS ARE COMING SOON']],
  ['PRIVACY AND TERMS', ['COMING SOON']],
  ['FEEDBACK', ['COMING SOON']],
];

export function createMenu({ ctx, canvas, logo, save, session }) {
  const touch = matchMedia('(pointer: coarse)').matches;
  let screen = 'press'; // press | main | single | difficulty | settings | info
  let history = [];
  let sel = 0;
  let panelOpen = false;
  let psel = 0;
  let info = { title: '', lines: [] };
  let hits = [];

  const unit = () => (display.height >= 330 ? 3 : 2);

  // ---------- screens ----------
  function items() {
    switch (screen) {
      case 'main': return [
        { label: 'SINGLE PLAYER', go: 'single' },
        { label: 'MULTIPLAYER', disabled: true, note: 'SOON' },
        { label: 'PURCHASE', disabled: true, note: 'SOON' },
        { label: 'SETTINGS', go: 'settings' },
      ];
      case 'single': return [
        { label: 'NEW GAME', go: 'difficulty' },
        { label: 'LOAD GAME', disabled: !save.exists, note: save.exists ? `NIGHT ${save.night}` : 'NO SAVE',
          run: () => showInfo('LOAD GAME', ['THE GAME WORLD COMES IN 0.2.0']) },
        { label: 'BACK', back: true },
      ];
      case 'difficulty': return [
        { label: 'SOFT FAIL',
          run: () => showInfo('SOFT FAIL', ['IF A BASE FALLS YOU REBUILD', 'THE GAME WORLD COMES IN 0.2.0']) },
        { label: 'HARDCORE',
          run: () => showInfo('HARDCORE', ['IF A BASE FALLS THE RUN ENDS', 'THE GAME WORLD COMES IN 0.2.0']) },
        { label: 'BACK', back: true },
      ];
      case 'settings': return [
        { label: `FULLSCREEN ${isFullscreen() ? 'ON' : 'OFF'}`, disabled: !canFullscreen(),
          note: canFullscreen() ? '' : 'N/A', run: toggleFullscreen },
        { label: 'SOUND', disabled: true, note: 'SOON' },
        { label: 'BACK', back: true },
      ];
      case 'info': return [{ label: 'BACK', back: true }];
      default: return [];
    }
  }

  const firstEnabled = () => Math.max(0, items().findIndex((it) => !it.disabled));
  function go(name) { history.push(screen); screen = name; sel = firstEnabled(); }
  function back() { if (history.length) { screen = history.pop(); sel = firstEnabled(); } }
  function showInfo(title, lines) { info = { title, lines }; go('info'); }
  function openPanelItem(i) { panelOpen = false; showInfo(PANEL[i][0], PANEL[i][1]); }
  function activate(item) {
    if (!item || item.disabled) return;
    if (item.back) back();
    else if (item.go) go(item.go);
    else if (item.run) item.run();
  }

  function proceed() {
    begin(); // fullscreen + keep-awake, inside the user's first tap or key press
    // Later, with accounts: if (!session.loggedIn) show the login screen here instead.
    history = [];
    screen = 'main';
    sel = 0;
  }

  // ---------- drawing ----------
  function drawLogo(cx, top, k) {
    if (logo && logo.complete && logo.naturalWidth) {
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(logo, Math.round(cx - (LOGO_W * k) / 2), top, LOGO_W * k, LOGO_H * k);
    } else {
      drawText(ctx, CONFIG.NAME, cx, top + 20, COL.text, k + 1, 'center', '#1a1426');
    }
  }

  function drawArrow(x, y, dir, k) {
    ctx.fillStyle = COL.arrow;
    for (let r = -3; r <= 3; r++) {
      const w = 4 - Math.abs(r);
      const x0 = dir > 0 ? x : x + (4 - w) * k;
      ctx.fillRect(x0, y + (r + 3) * k, w * k, k);
    }
  }

  function drawPress(W, H, u) {
    const top = Math.round(H * 0.08);
    drawLogo(W / 2, top, u);
    const y = top + LOGO_H * u + 18;
    if (Math.floor(performance.now() / 600) % 2 === 0) {
      drawText(ctx, touch ? 'TAP ANYWHERE TO CONTINUE' : 'CLICK ANYWHERE OR PRESS ANY KEY', W / 2, y, COL.text, u, 'center');
    }
    if (display.hint) drawText(ctx, display.hint, W / 2, y + 7 * u + 12, COL.note, Math.max(1, u - 1), 'center');
  }

  function drawScreen(W, H, u) {
    const small = Math.max(1, u - 1);
    const colX = Math.round(W * 0.72);
    const colW = Math.round(W * 0.4);
    const top = Math.round(H * 0.05);
    drawLogo(colX, top, u);
    let y = top + LOGO_H * u + 12;
    const pitch = 7 * u + (u === 3 ? 16 : 14);

    if (screen === 'info') {
      drawText(ctx, info.title, colX, y, COL.text, u, 'center', '#1a1426');
      y += 7 * u + 10;
      info.lines.forEach((ln, i) => drawText(ctx, ln, colX, y + i * (7 * small + 6), COL.note, small, 'center'));
      y += info.lines.length * (7 * small + 6) + 8;
    }

    items().forEach((it, i) => {
      const rowY = y + i * pitch;
      const ty = rowY + Math.round((pitch - 7 * u) / 2);
      const color = it.disabled ? COL.dim : (i === sel && !touch ? COL.sel : COL.text);
      drawText(ctx, it.label, colX, ty, color, u, 'center');
      if (it.note) {
        drawText(ctx, it.note, colX + Math.round(textWidth(it.label, u) / 2) + 6, ty + 7 * u - 7 * small, COL.dim, small);
      }
      hits.push({ kind: 'item', i, x: colX - colW / 2, y: rowY, w: colW, h: pitch });
    });

    // name tag (top-left)
    const pad = 4;
    const tw = textWidth(session.name, small);
    const bw = tw + pad * 2 + 2;
    const bh = 7 * small + pad * 2 + 2;
    ctx.fillStyle = COL.line; ctx.fillRect(8, 8, bw, bh);
    ctx.fillStyle = COL.tag; ctx.fillRect(9, 9, bw - 2, bh - 2);
    drawText(ctx, session.name, 9 + pad, 9 + pad, COL.text, small);

    // "more options" panel + arrow (left edge)
    const pw = panelOpen ? textWidth('PRIVACY AND TERMS', small) + 28 : 0;
    if (panelOpen) {
      ctx.fillStyle = COL.panel; ctx.fillRect(0, 0, pw, H);
      ctx.fillStyle = COL.tag; ctx.fillRect(pw, 0, 1, H);
      const ppitch = 7 * small + 14;
      const ptop = Math.round(H / 2 - (PANEL.length * ppitch) / 2);
      PANEL.forEach(([label], i) => {
        const py = ptop + i * ppitch;
        drawText(ctx, label, 14, py + Math.round((ppitch - 7 * small) / 2), i === psel && !touch ? COL.sel : COL.text, small);
        hits.push({ kind: 'panel', i, x: 0, y: py, w: pw, h: ppitch });
      });
    }
    const ah = 7 * u;
    const ay = Math.round(H / 2 - ah / 2);
    drawArrow(pw + 4, ay, panelOpen ? -1 : 1, u);
    hits.push({ kind: 'arrow', x: pw, y: ay - 16, w: 4 * u + 14, h: ah + 32 });
  }

  function draw() {
    const W = display.width;
    const H = display.height;
    const u = unit();
    hits = [];
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#000000'; // black for now; gameplay will play here later
    ctx.fillRect(0, 0, W, H);
    if (screen === 'press') drawPress(W, H, u); else drawScreen(W, H, u);
    const vs = Math.max(1, u - 1);
    drawText(ctx, `V${CONFIG.VERSION}`, 8, H - 7 * vs - 8, COL.note, vs);
  }

  // ---------- input ----------
  function toLogical(e) {
    const r = canvas.getBoundingClientRect();
    return { x: ((e.clientX - r.left) * display.width) / r.width, y: ((e.clientY - r.top) * display.height) / r.height };
  }
  const hitAt = (x, y) => [...hits].reverse().find((r) => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h);

  // pointerup (not pointerdown) so touch taps count as a user gesture for fullscreen
  canvas.addEventListener('pointerup', (e) => {
    if (screen === 'press') { proceed(); return; }
    const { x, y } = toLogical(e);
    const h = hitAt(x, y);
    if (panelOpen && (!h || h.kind === 'item')) { panelOpen = false; return; }
    if (!h) return;
    if (h.kind === 'arrow') { panelOpen = !panelOpen; psel = 0; }
    else if (h.kind === 'panel') openPanelItem(h.i);
    else if (h.kind === 'item') { sel = h.i; activate(items()[h.i]); }
  });

  canvas.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse' || screen === 'press') return;
    const { x, y } = toLogical(e);
    const h = hitAt(x, y);
    if (h?.kind === 'item' && !items()[h.i].disabled) sel = h.i;
    else if (h?.kind === 'panel') psel = h.i;
  });

  addEventListener('keydown', (e) => {
    if (screen === 'press') {
      if (!e.repeat && !['Shift', 'Control', 'Alt', 'Meta', 'Escape', 'Tab'].includes(e.key)) proceed();
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

  return { draw };
}
