// js/core/storage.js
// Namespaced localStorage wrapper. JSON-encodes values, swallows parse errors,
// and exposes a `list()` helper to enumerate keys under a namespace.

const PREFIX = '';

function k(key) { return PREFIX + key; }

function safeParse(raw, fallback) {
  if (raw == null) return fallback;
  try { return JSON.parse(raw); }
  catch { return fallback; }
}

export const Storage = {
  get(key, fallback = null) {
    try { return safeParse(localStorage.getItem(k(key)), fallback); }
    catch { return fallback; }
  },

  set(key, value) {
    try { localStorage.setItem(k(key), JSON.stringify(value)); return true; }
    catch (e) {
      // Quota exceeded etc. — surface to the user.
      console.warn('Storage.set failed:', e);
      return false;
    }
  },

  remove(key) {
    try { localStorage.removeItem(k(key)); return true; }
    catch { return false; }
  },

  has(key) {
    try { return localStorage.getItem(k(key)) != null; }
    catch { return false; }
  },

  /** Iterate over keys matching a prefix. */
  list(prefix = '') {
    const out = [];
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key == null) continue;
        if (key.startsWith(prefix)) out.push(key);
      }
    } catch { /* ignore */ }
    return out;
  },

  /** Returns array of values for every key under prefix. */
  listValues(prefix) {
    return this.list(prefix).map((key) => this.get(key));
  },

  clearAll() {
    try { localStorage.clear(); }
    catch { /* ignore */ }
  },
};