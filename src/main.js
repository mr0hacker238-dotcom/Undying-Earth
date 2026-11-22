import { CONFIG } from './config.js';
import { loadGame } from './core/storage.js';
import { display, initDisplay, on } from './core/display.js';

// Boot screen: shows the display system working. Not a game yet.
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
let state = null;

function draw() {
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = '#0b0f0d';
  ctx.fillRect(0, 0, display.width, display.height);
  ctx.fillStyle = '#c9d6c3';
  ctx.textAlign = 'center';
  const cx = display.width / 2;
  const cy = display.height / 2;
  ctx.font = '600 20px system-ui, sans-serif';
  ctx.fillText(CONFIG.NAME, cx, cy - 6);
  ctx.font = '8px system-ui, sans-serif';
  ctx.fillText(`v${CONFIG.VERSION}` + (state ? ` | night ${state.night}` : ''), cx, cy + 8);
  ctx.fillText(`${display.width}x${display.height} at ${display.scale}x`, cx, cy + 20);
}

function frame() {
  if (!display.paused) draw();
  requestAnimationFrame(frame);
}

on('resize', draw);
initDisplay(canvas);
loadGame().then((s) => { state = s; draw(); });
requestAnimationFrame(frame);
