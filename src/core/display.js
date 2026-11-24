import { CONFIG } from '../config.js';
import { settings } from './settings.js';

// Screen handling: sharp whole-number pixel scaling, fullscreen, landscape,
// pausing when the player leaves, and keeping the screen awake.

const root = document.documentElement;
export const display = { width: 0, height: 0, scale: 1, dpr: 1, started: false, paused: false, hint: '',
  // Space to keep clear on each side (camera cutout, rounded corners, player's margin setting), in game pixels.
  inset: { top: 0, right: 0, bottom: 0, left: 0 } };

const handlers = { resize: [], pause: [], resume: [] };
export const on = (event, fn) => { handlers[event]?.push(fn); };
const emit = (event) => handlers[event].forEach((fn) => fn(display));

const $ = (id) => document.getElementById(id);
const isTouch = () => matchMedia('(pointer: coarse)').matches;
export const isFullscreen = () => !!(document.fullscreenElement || document.webkitFullscreenElement);
export const canFullscreen = () => !!(root.requestFullscreen || root.webkitRequestFullscreen);

let canvas = null;
let wake = null;

function needsRotate() {
  return isTouch() && innerHeight > innerWidth;
}

function resize() {
  const dpr = window.devicePixelRatio || 1;
  const devW = Math.floor(innerWidth * dpr);
  const devH = Math.floor(innerHeight * dpr);
  const scale = Math.max(1, Math.floor(devH / CONFIG.VIRTUAL_HEIGHT));
  display.dpr = dpr;
  display.scale = scale;
  display.width = Math.ceil(devW / scale);
  display.height = Math.ceil(devH / scale);
  canvas.width = display.width;
  canvas.height = display.height;
  canvas.style.width = `${(display.width * scale) / dpr}px`;
  canvas.style.height = `${(display.height * scale) / dpr}px`;
  const cs = getComputedStyle($('safe'));
  const px = (v) => parseFloat(v) || 0;
  const toGame = (cssPx) => Math.ceil((cssPx * dpr) / scale);
  const extra = settings.margin * 16; // player's Screen margin setting, in screen px, left and right
  display.inset = {
    top: toGame(px(cs.paddingTop)),
    bottom: toGame(px(cs.paddingBottom)),
    left: toGame(px(cs.paddingLeft) + extra),
    right: toGame(px(cs.paddingRight) + extra),
  };
  $('rotate').hidden = !needsRotate();
  updatePause();
  emit('resize');
}

function updatePause() {
  const shouldPause = document.hidden || needsRotate();
  if (shouldPause === display.paused) return;
  display.paused = shouldPause;
  if (shouldPause) emit('pause');
  else { acquireWake(); emit('resume'); }
}

async function acquireWake() {
  try {
    if ('wakeLock' in navigator && !wake) {
      wake = await navigator.wakeLock.request('screen');
      wake.addEventListener('release', () => { wake = null; });
    }
  } catch { /* not supported or denied: fine */ }
}

async function lockLandscape() {
  try { await screen.orientation?.lock?.('landscape'); } catch { /* only some browsers allow it */ }
}

export async function toggleFullscreen() {
  try {
    if (isFullscreen()) {
      await (document.exitFullscreen || document.webkitExitFullscreen).call(document);
    } else if (canFullscreen()) {
      await (root.requestFullscreen || root.webkitRequestFullscreen).call(root);
      await lockLandscape();
    }
  } catch { /* the browser refused: ignore */ }
}

/** Re-measure the layout (e.g. after the Screen margin setting changes). */
export function refreshLayout() { if (canvas) resize(); }

/** Call from the first tap / key press ("click anywhere to continue"). */
export function begin() {
  if (display.started) return;
  display.started = true;
  if (isTouch() && canFullscreen() && !isFullscreen()) toggleFullscreen();
  acquireWake();
}

export function initDisplay(canvasEl) {
  canvas = canvasEl;

  const fsBtn = $('fs-btn');
  if (canFullscreen()) {
    fsBtn.hidden = false;
    fsBtn.addEventListener('click', toggleFullscreen);
  } else if (isTouch()) {
    display.hint = 'ADD TO HOME SCREEN FOR FULLSCREEN';
  }

  addEventListener('resize', resize);
  addEventListener('orientationchange', resize);
  document.addEventListener('visibilitychange', updatePause);
  document.addEventListener('fullscreenchange', resize);
  document.addEventListener('webkitfullscreenchange', resize);

  // Keep the page from acting like a web page.
  addEventListener('contextmenu', (e) => e.preventDefault());
  addEventListener('dblclick', (e) => e.preventDefault());
  addEventListener('gesturestart', (e) => e.preventDefault());
  addEventListener('keydown', (e) => {
    if (e.target?.tagName === 'INPUT') return; // typing a world name
    if (e.key === 'f' || e.key === 'F') toggleFullscreen();
  });

  resize();
}
