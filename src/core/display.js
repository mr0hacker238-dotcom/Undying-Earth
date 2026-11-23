import { CONFIG } from '../config.js';

// Screen handling: sharp whole-number pixel scaling, fullscreen, landscape,
// pausing when the player leaves, and keeping the screen awake.

const root = document.documentElement;
export const display = { width: 0, height: 0, scale: 1, dpr: 1, started: false, paused: false, hint: '' };

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
    if (e.key === 'f' || e.key === 'F') toggleFullscreen();
  });

  resize();
}
