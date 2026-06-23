// js/router.js
// Hash-based router with view-switch animation.
// Routes: #/calendar, #/todo, #/calculator, #/translator, #/clock, #/recycle-bin
// (and #/ shortcuts without slash.)

const routes = new Map(); // name → render function
let currentName = null;
let currentEl = null;
const viewRoot = () => document.getElementById('view');

function parseHash() {
  let h = location.hash.replace(/^#\/?/, '').trim().toLowerCase();
  if (!h) h = 'calendar';
  // Drop query / extras
  h = h.split('?')[0];
  return h;
}

function emit(name) {
  const handler = routes.get(name) || routes.get('404');
  if (!handler) return;

  const view = viewRoot();
  if (!view) return;

  // Trigger leave animation on the old view
  if (currentEl) {
    currentEl.classList.remove('view-enter');
    currentEl.classList.add('view-leave');
  }

  // Build new view node
  const next = document.createElement('section');
  next.className = `view view-${name}`;
  handler(next);
  next.classList.add('view-enter');

  const onEnd = () => {
    next.removeEventListener('animationend', onEnd);
    if (currentEl && currentEl.parentNode) currentEl.parentNode.removeChild(currentEl);
    currentEl = next;
    currentName = name;
    document.dispatchEvent(new CustomEvent('route:change', { detail: { name } }));
  };
  next.addEventListener('animationend', onEnd);

  view.appendChild(next);
  // Force reflow before adding enter class
  void next.offsetWidth;

  // Update page title in header
  const titleEl = document.getElementById('page-title');
  if (titleEl) titleEl.textContent = titleFor(name);

  // Update document title
  document.title = `${titleFor(name)} · Dashboard`;

  // Update nav active states
  document.dispatchEvent(new CustomEvent('route:active', { detail: { name } }));
}

function titleFor(name) {
  switch (name) {
    case 'calendar':     return 'Calendar';
    case 'todo':         return 'To-Do';
    case 'calculator':   return 'Calculator';
    case 'translator':   return 'Translator';
    case 'clock':        return 'Clock';
    case 'recycle-bin':  return 'Recycle Bin';
    default:             return 'Dashboard';
  }
}

export const Router = {
  init() {
    window.addEventListener('hashchange', () => emit(parseHash()));
    setTimeout(() => emit(parseHash()), 0);
    return this;
  },

  register(name, handler) { routes.set(name, handler); },

  /** Programmatically navigate. */
  go(name) {
    const target = name.startsWith('#') ? name : `#/${name}`;
    if (location.hash === target) {
      // Re-emit to re-render
      emit(parseHash());
    } else {
      location.hash = target;
    }
  },

  current() { return currentName; },
};