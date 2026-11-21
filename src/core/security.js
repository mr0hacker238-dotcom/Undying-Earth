// Defensive helpers. Treat ALL external data (saves, imports, URLs, network) as untrusted.

const BANNED_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

/** Strip control chars and HTML-significant characters, normalise unicode, cap length. */
export function sanitizeText(input, max = 40) {
  return String(input ?? '')
    .normalize('NFKC')
    .replace(/[\u0000-\u001f\u007f<>&"'`]/g, '')
    .trim()
    .slice(0, max);
}

/** JSON.parse with a size cap and prototype-pollution keys removed. Returns null on any failure. */
export function safeParse(text, maxChars = 200_000) {
  if (typeof text !== 'string' || text.length > maxChars) return null;
  try {
    return JSON.parse(text, (key, value) => (BANNED_KEYS.has(key) ? undefined : value));
  } catch {
    return null;
  }
}

export const isInt = (n, min, max) => Number.isInteger(n) && n >= min && n <= max;
export const clamp = (n, min, max) => Math.min(max, Math.max(min, Number(n) || 0));

/** SHA-256 hex digest (needs HTTPS or localhost). */
export async function sha256(text) {
  const bytes = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Simple sliding-window limiter, e.g. for radio calls or future network requests. */
export function createRateLimiter(maxCalls, windowMs) {
  let stamps = [];
  return function allow() {
    const now = performance.now();
    stamps = stamps.filter((t) => now - t < windowMs);
    if (stamps.length >= maxCalls) return false;
    stamps.push(now);
    return true;
  };
}
