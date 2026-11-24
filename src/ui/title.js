import { drawText, textWidth } from '../core/font.js';

// "UNDYING EARTH" on one line, drawn as live pixel text on its own small canvas.
// Because it is not a flat image, blood from the background gameplay can be added later
// with splat(): it only sticks where letters exist.

const LIGHT = '#dfe8d9';
const RED = '#ee6a4d';
const SHADOW = '#1a1426';

export function createTitle() {
  let cache = null;

  function build(t) {
    const w = textWidth('UNDYING EARTH', t) + t;
    const h = 8 * t;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const c = canvas.getContext('2d');
    drawText(c, 'UNDYING', 0, 0, LIGHT, t, 'left', SHADOW);
    drawText(c, 'EARTH', 8 * 6 * t, 0, RED, t, 'left', SHADOW);
    cache = { t, canvas, ctx: c, w, h };
  }

  return {
    draw(ctx, cx, top, t) {
      if (!cache || cache.t !== t) build(t);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(cache.canvas, Math.round(cx - cache.w / 2), top);
      return { w: cache.w, h: cache.h };
    },
    /** For later: add blood at title pixel (x, y). 'source-atop' keeps it on the letters only. */
    splat(x, y, r = 2) {
      if (!cache) return;
      const c = cache.ctx;
      c.globalCompositeOperation = 'source-atop';
      c.fillStyle = '#8a1c24';
      c.fillRect(x - r, y - r, 2 * r, 2 * r);
      c.globalCompositeOperation = 'source-over';
    },
  };
}
