import { CONFIG } from './config.js';
import { loadGame } from './core/storage.js';

// Boot placeholder: proves the module chain, CSP and save loading work. Not a game yet.
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

function resize() {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.floor(innerWidth * dpr);
  canvas.height = Math.floor(innerHeight * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  draw();
}

let state = null;

function draw() {
  ctx.fillStyle = '#0b0f0d';
  ctx.fillRect(0, 0, innerWidth, innerHeight);
  ctx.fillStyle = '#c9d6c3';
  ctx.textAlign = 'center';
  ctx.font = '600 28px system-ui, sans-serif';
  ctx.fillText(CONFIG.NAME, innerWidth / 2, innerHeight / 2 - 8);
  ctx.font = '14px system-ui, sans-serif';
  ctx.fillText(`v${CONFIG.VERSION} foundation build` + (state ? ` | night ${state.night}` : ''), innerWidth / 2, innerHeight / 2 + 22);
}

addEventListener('resize', resize);
loadGame().then((s) => { state = s; resize(); });
