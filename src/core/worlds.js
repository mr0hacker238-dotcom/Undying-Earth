import { CONFIG } from '../config.js';
import { safeParse, sha256, sanitizeText, isInt } from './security.js';

// The list of worlds (name, difficulty, dates). The world's own save data comes later.
// Rules: hardcore is locked forever; easy and normal can be switched between each other;
// nothing can be switched into hardcore after creation.

export const DIFFICULTIES = ['easy', 'normal', 'hardcore'];
export const DIFF_LABEL = { easy: 'EASY', normal: 'NORMAL', hardcore: 'HARDCORE' };

let cache = [];

function clean(list) {
  if (!Array.isArray(list)) return [];
  const out = [];
  for (const w of list.slice(0, CONFIG.MAX_WORLDS)) {
    if (!w || typeof w.id !== 'string' || !/^[0-9a-f]{12}$/.test(w.id)) continue;
    if (!DIFFICULTIES.includes(w.difficulty)) continue;
    if (!isInt(w.created, 0, 4e12)) continue;
    out.push({
      id: w.id,
      name: sanitizeText(w.name, CONFIG.MAX_NAME_LENGTH) || 'World',
      difficulty: w.difficulty,
      created: w.created,
      played: isInt(w.played, 0, 4e12) ? w.played : w.created,
    });
  }
  return out;
}

export async function initWorlds() {
  cache = [];
  try {
    const raw = localStorage.getItem(CONFIG.WORLDS_KEY);
    if (!raw) return;
    const wrap = safeParse(raw, CONFIG.MAX_SAVE_BYTES);
    if (!wrap || typeof wrap.body !== 'string') return;
    if ((await sha256(wrap.body + CONFIG.SAVE_SALT)) !== wrap.sum) return;
    cache = clean(safeParse(wrap.body, CONFIG.MAX_SAVE_BYTES));
  } catch {
    cache = [];
  }
}

async function persist() {
  try {
    const body = JSON.stringify(cache);
    const sum = await sha256(body + CONFIG.SAVE_SALT);
    localStorage.setItem(CONFIG.WORLDS_KEY, JSON.stringify({ body, sum }));
  } catch { /* storage full or blocked */ }
}

export const listWorlds = () => cache.slice().sort((a, b) => b.played - a.played);

export function createWorld(name, difficulty) {
  if (cache.length >= CONFIG.MAX_WORLDS || !DIFFICULTIES.includes(difficulty)) return null;
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  const id = [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
  const now = Date.now();
  const world = { id, name: sanitizeText(name, CONFIG.MAX_NAME_LENGTH) || 'World', difficulty, created: now, played: now };
  cache.push(world);
  persist();
  return world;
}

export function updateWorld(id, { name, difficulty }) {
  const w = cache.find((x) => x.id === id);
  if (!w || w.difficulty === 'hardcore') return false; // hardcore worlds are locked
  if (difficulty !== 'easy' && difficulty !== 'normal') return false; // never into hardcore
  w.name = sanitizeText(name, CONFIG.MAX_NAME_LENGTH) || w.name;
  w.difficulty = difficulty;
  persist();
  return true;
}

export function touchWorld(id) {
  const w = cache.find((x) => x.id === id);
  if (w) { w.played = Date.now(); persist(); }
}

export function deleteWorld(id) {
  cache = cache.filter((x) => x.id !== id);
  persist();
}
