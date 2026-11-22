import { CONFIG } from '../config.js';

// Screen handling: sharp whole-number pixel scaling, fullscreen, landscape,
// pausing when the player leaves, and keeping the screen awake.

const root = document.documentElement;
export const display = { width: 0, height: 0, scale: 1, dpr: 1, started: false, paused: true };

const handlers = { resize: [], pause: [], resume: [] };
export const on = (event, fn) => { handlers[event]?.push(fn); };
const emit = (event) => handlers[event].forEach((fn) => fn(display));

const $ = (id) => document.getElementById(id);
const isTouch = () => matchMedia('(pointer: coarse)').matches;
const isFullscreen = () => !!(document.fullscreenElement || document.webkitFullscreenElement);
const canFullscreen = () => !!(root.requestFullscreen || root.webkitRequestFullscreen);

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
  $('rotate').hidden = !(display.started && needsRotate());
  updatePause();
  emit('resize');
}

function updatePause() {
  const shouldPause = !display.started || document.hidden || needsRotate();
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

function startPlaying() {
  display.started = true;
  $('start').hidden = true;
  if (isTouch() && canFullscreen() && !isFullscreen()) toggleFullscreen();
  resize();
}

export function initDisplay(canvasEl) {
  canvas = canvasEl;

  const fsBtn = $('fs-btn');
  if (canFullscreen()) {
    fsBtn.hidden = false;
    fsBtn.addEventListener('click', toggleFullscreen);
  } else if (isTouch()) {
    $('hint').textContent = 'For fullscreen on iPhone: tap Share, then Add to Home Screen.';
  }

  $('start-btn').addEventListener('click', startPlaying);

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
