import { CONFIG } from './config.js';
import { loadGame } from './core/storage.js';
import { display, initDisplay, on } from './core/display.js';
import { drawText } from './core/font.js';

// Boot screen: shows the display system working. Not a game yet.
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
let state = null;

function draw() {
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = '#0b0f0d';
  ctx.fillRect(0, 0, display.width, display.height);
  const cx = display.width / 2;
  const cy = Math.floor(display.height / 2);
  drawText(ctx, CONFIG.NAME, cx, cy - 20, '#c9d6c3', 4, 'center', '#1a1426');
  drawText(ctx, `v${CONFIG.VERSION}` + (state ? ` | night ${state.night}` : ''), cx, cy + 16, '#8f9a8a', 2, 'center');
  drawText(ctx, `${display.width}x${display.height} at ${display.scale}x`, cx, cy + 36, '#8f9a8a', 2, 'center');
}

function frame() {
  if (!display.paused) draw();
  requestAnimationFrame(frame);
}

on('resize', draw);
initDisplay(canvas);
loadGame().then((s) => { state = s; draw(); });
requestAnimationFrame(frame);
