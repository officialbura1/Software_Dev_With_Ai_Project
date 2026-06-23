// js/core/theme.js
// Light / dark / auto theme manager. Reads & persists preference; in 'auto'
// mode it follows `prefers-color-scheme`.

import { Storage } from './storage.js';

const KEY = 'prefs:theme'; // 'light' | 'dark' | 'auto'
const mql = typeof window !== 'undefined' && window.matchMedia
  ? window.matchMedia('(prefers-color-scheme: dark)')
  : null;

let currentMode = 'auto';
let currentEffective = 'light';

function applyTheme(effective) {
  currentEffective = effective;
  document.documentElement.dataset.theme = effective;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', effective === 'dark' ? '#0B1020' : '#6366F1');

  // Update header icon swap
  const sun  = document.getElementById('theme-icon-sun');
  const moon = document.getElementById('theme-icon-moon');
  if (sun && moon) {
    sun.style.display  = effective === 'dark' ? 'block' : 'none';
    moon.style.display = effective === 'dark' ? 'none'  : 'block';
  }
}

function effectiveFor(mode) {
  if (mode === 'auto') return mql && mql.matches ? 'dark' : 'light';
  return mode;
}

export const Theme = {
  init() {
    const saved = Storage.get(KEY, 'auto');
    currentMode = saved === 'light' || saved === 'dark' ? saved : 'auto';
    applyTheme(effectiveFor(currentMode));

    if (mql && mql.addEventListener) {
      mql.addEventListener('change', () => {
        if (currentMode === 'auto') applyTheme('light'); // brief flicker-prevention
        applyTheme(effectiveFor(currentMode));
      });
    }
    return this;
  },

  current() { return currentEffective; },
  mode()    { return currentMode; },

  set(mode) {
    if (mode !== 'light' && mode !== 'dark' && mode !== 'auto') mode = 'auto';
    currentMode = mode;
    Storage.set(KEY, mode);
    applyTheme(effectiveFor(mode));
  },

  cycle() {
    const order = ['light', 'dark', 'auto'];
    const next = order[(order.indexOf(currentMode) + 1) % order.length];
    this.set(next);
    return next;
  },

  toggle() {
    // Quick toggle: light <-> dark (skips auto for one-click).
    const next = currentEffective === 'dark' ? 'light' : 'dark';
    this.set(next);
    return next;
  },
};