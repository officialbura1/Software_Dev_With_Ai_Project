// js/shell/sidebar.js
// Desktop sidebar nav rendering + active state.

import { el, delegate } from '../core/dom.js';
import { Icons } from '../core/icons.js';

const ITEMS = [
  { id: 'calendar',   label: 'Calendar',   icon: 'calendar', shortcut: '1' },
  { id: 'todo',       label: 'To-Do',      icon: 'check',    shortcut: '2' },
  { id: 'calculator', label: 'Calculator', icon: 'calc',     shortcut: '3' },
  { id: 'translator', label: 'Translator', icon: 'globe',    shortcut: '4' },
  { id: 'clock',      label: 'Clock',      icon: 'clock',    shortcut: '5' },
  { id: 'recycle-bin',label: 'Recycle Bin',icon: 'bin',      shortcut: '6' },
];

let activeName = 'calendar';

export const Sidebar = {
  init() {
    const root = document.getElementById('sidebar');
    if (!root) return;

    const brand = el('div', { class: 'app-sidebar__brand' }, [
      el('div', { class: 'app-sidebar__logo', text: 'D' }),
      el('div', { class: 'app-sidebar__name', text: 'Dashboard' }),
    ]);

    const nav = el('nav', { class: 'app-nav', 'aria-label': 'Primary' });
    for (const item of ITEMS) {
      nav.appendChild(
        el('button', {
          class: 'app-nav__item',
          type: 'button',
          dataset: { route: item.id },
          'aria-label': item.label,
          title: `${item.label}  (${item.shortcut})`,
          onClick: () => { location.hash = `#/${item.id}`; },
        }, [
          el('span', { class: 'icon', html: Icons.get(item.icon) }),
          el('span', { text: item.label }),
          el('span', { class: 'count', hidden: true }),
        ])
      );
    }

    const footer = el('div', { class: 'app-sidebar__footer' }, [
      el('div', { class: 'app-sidebar__shortcut', html:
        `Press <span class="kbd">?</span> for shortcuts &nbsp;·&nbsp; <span class="kbd">Ctrl</span>+<span class="kbd">/</span> theme`,
      }),
    ]);

    root.appendChild(brand);
    root.appendChild(nav);
    root.appendChild(footer);

    document.addEventListener('route:active', (e) => {
      activeName = e.detail.name;
      for (const btn of nav.querySelectorAll('.app-nav__item')) {
        btn.classList.toggle('is-active', btn.dataset.route === activeName);
      }
    });
  },

  /** Update badge counts (per nav item). */
  setCount(routeId, count) {
    const btn = document.querySelector(`.app-nav__item[data-route="${routeId}"]`);
    if (!btn) return;
    const c = btn.querySelector('.count');
    if (!c) return;
    if (count > 0) { c.textContent = count; c.hidden = false; }
    else { c.hidden = true; }
  },

  activeName() { return activeName; },
};