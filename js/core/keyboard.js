// js/core/keyboard.js
// Global + scoped keyboard shortcut registry. Chords ("g t") supported with
// a 1.2s reset timer. Shortcuts are ignored while typing in inputs/textareas
// (except when the active scope explicitly opts in).

const scopes = new Map();   // scope name → { map: { combo: handler }, optInInputs: Set }
let activeScope = 'global';
let pendingChord = null;
let pendingTimer = null;
const CHORD_RESET_MS = 1200;

function normalize(e, combo) {
  const parts = combo.toLowerCase().split('+').map(p => p.trim()).filter(Boolean);
  const wantsMod = parts.includes('ctrl') || parts.includes('cmd') || parts.includes('meta');
  const wantsShift = parts.includes('shift');
  const wantsAlt = parts.includes('alt');
  const key = parts[parts.length - 1];

  const isMac = navigator.platform.toLowerCase().includes('mac');
  const modMatch = wantsMod
    ? (isMac ? e.metaKey : e.ctrlKey)
    : !(isMac ? e.metaKey : e.ctrlKey);

  return (
    modMatch &&
    e.shiftKey === wantsShift &&
    e.altKey === wantsAlt &&
    e.key.toLowerCase() === key
  );
}

function isTyping() {
  const el = document.activeElement;
  if (!el) return false;
  const tag = el.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (el.isContentEditable) return true;
  return false;
}

function dispatch(e) {
  const scopeMap = scopes.get(activeScope);
  const globalMap = scopes.get('global');
  const optIns = (scopeMap && scopeMap.optInInputs) || new Set();

  // Build the candidate list: active scope first, then global.
  const candidates = [];
  if (scopeMap) candidates.push(...Object.entries(scopeMap.map));
  if (globalMap) candidates.push(...Object.entries(globalMap.map));

  const typing = isTyping();
  for (const [combo, handler] of candidates) {
    if (!normalize(e, combo)) continue;

    if (typing) {
      // Allow if the active element's id is in the opt-in set, OR if the combo
      // explicitly contains Esc (we always want Esc to close modals).
      const id = document.activeElement && document.activeElement.id;
      const allowed = (id && optIns.has(id)) || combo.toLowerCase().includes('escape');
      if (!allowed) continue;
    }

    // Chord handling: if combo is 2 parts like "g t", handle as chord.
    const parts = combo.toLowerCase().split(' ').filter(Boolean);
    if (parts.length > 1) {
      if (pendingChord === parts[0]) {
        clearTimeout(pendingTimer);
        pendingChord = null;
        e.preventDefault();
        handler(e);
      } else if (parts[0] === e.key.toLowerCase()) {
        pendingChord = parts[0];
        clearTimeout(pendingTimer);
        pendingTimer = setTimeout(() => { pendingChord = null; }, CHORD_RESET_MS);
        e.preventDefault();
      }
      return;
    }

    e.preventDefault();
    handler(e);
    return;
  }
}

export const Keyboard = {
  init() {
    window.addEventListener('keydown', dispatch);
    return this;
  },

  /** Register a shortcut in a scope. */
  register(scope, combo, handler) {
    if (!scopes.has(scope)) scopes.set(scope, { map: {}, optInInputs: new Set() });
    scopes.get(scope).map[combo] = handler;
  },

  /** Mark an input id as accepting shortcuts even while focused. */
  optIn(scope, inputId) {
    if (!scopes.has(scope)) scopes.set(scope, { map: {}, optInInputs: new Set() });
    scopes.get(scope).optInInputs.add(inputId);
  },

  /** Activate a scope (e.g. when navigating to a new app). */
  activateScope(name) {
    activeScope = name || 'global';
  },

  /** Show a list of registered shortcuts — for the cheat-sheet modal. */
  list() {
    const out = [];
    for (const [scope, { map }] of scopes.entries()) {
      for (const combo of Object.keys(map)) {
        out.push({ scope, combo });
      }
    }
    return out;
  },
};