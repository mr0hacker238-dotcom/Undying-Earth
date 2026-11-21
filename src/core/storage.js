import { CONFIG } from '../config.js';
import { safeParse, sha256, isInt, sanitizeText } from './security.js';

export function validateState(s) {
  if (!s || typeof s !== 'object') return null;
  if (!isInt(s.night, 0, 1_000_000)) return null;
  if (!isInt(s.zombiesKilled, 0, 1_000_000_000)) return null;
  if (!Array.isArray(s.bases) || s.bases.length > CONFIG.MAX_BASES) return null;
  const bases = [];
  for (const b of s.bases) {
    if (!b || !isInt(b.zone, 0, 9_999) || !isInt(b.survivors, 0, CONFIG.MAX_SURVIVORS)) return null;
    bases.push({ zone: b.zone, survivors: b.survivors, name: sanitizeText(b.name, CONFIG.MAX_NAME_LENGTH) });
  }
  return { night: s.night, zombiesKilled: s.zombiesKilled, bases };
}

export const newState = () => ({ night: 0, zombiesKilled: 0, bases: [] });

export async function saveGame(state) {
  try {
    const clean = validateState(state);
    if (!clean) return false;
    const body = JSON.stringify({ v: CONFIG.SAVE_VERSION, t: Date.now(), state: clean });
    if (body.length > CONFIG.MAX_SAVE_BYTES) return false;
    const sum = await sha256(body + CONFIG.SAVE_SALT);
    localStorage.setItem(CONFIG.SAVE_KEY, JSON.stringify({ body, sum }));
    return true;
  } catch {
    return false;
  }
}

export async function loadGame() {
  try {
    const raw = localStorage.getItem(CONFIG.SAVE_KEY);
    if (!raw) return newState();
    const wrapper = safeParse(raw, CONFIG.MAX_SAVE_BYTES * 2);
    if (!wrapper || typeof wrapper.body !== 'string') return newState();
    if ((await sha256(wrapper.body + CONFIG.SAVE_SALT)) !== wrapper.sum) return newState();
    const data = safeParse(wrapper.body, CONFIG.MAX_SAVE_BYTES);
    if (!data || data.v !== CONFIG.SAVE_VERSION) return newState();
    return validateState(data.state) ?? newState();
  } catch {
    return newState();
  }
}
