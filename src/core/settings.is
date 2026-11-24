import { CONFIG } from '../config.js';
import { safeParse, isInt } from './security.js';

// Small player settings kept on the device (not sensitive).
export const settings = { margin: 0 }; // screen margin step: 0 off, 1 small, 2 medium, 3 large

try {
  const s = safeParse(localStorage.getItem(CONFIG.SETTINGS_KEY) || '', 1000);
  if (s && isInt(s.margin, 0, 3)) settings.margin = s.margin;
} catch { /* storage unavailable: use defaults */ }

export function saveSettings() {
  try { localStorage.setItem(CONFIG.SETTINGS_KEY, JSON.stringify({ margin: settings.margin })); } catch { /* ignore */ }
}
