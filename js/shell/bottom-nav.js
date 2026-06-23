// js/shell/bottom-nav.js
// Mobile bottom nav — same items as sidebar but compact.

import { el } from '../core/dom.js';
import { Icons } from '../core/icons.js';

const ITEMS = [
  { id: 'calendar',   label: 'Calendar',   icon: 'calendar' },
  { id: 'todo',       label: 'Tasks',      icon: 'check' },
  { id: 'calculator', label: 'Calc',       icon: 'calc' },
  { id: 'translator', label: 'Translate',  icon: 'globe' },
  { id: 'clock',      label: 'Clock',      icon: 'clock' },
];

export const BottomNav = {
  init() {
    const root = document.getElementById('bottom-nav');
    if (!root) return;
    for (const item of ITEMS) {
      root.appendChild(
        el('button', {
          class: 'app-bottom-nav__item',
          type: 'button',
          dataset: { route: item.id },
          'aria-label': item.label,
          onClick: () => { location.hash = `#/${item.id}`; },
        }, [
          el('span', { class: 'icon', html: Icons.get(item.icon) }),
          el('span', { text: item.label }),
        ])
      );
    }

    document.addEventListener('route:active', (e) => {
      const name = e.detail.name;
      for (const btn of root.querySelectorAll('.app-bottom-nav__item')) {
        btn.classList.toggle('is-active', btn.dataset.route === name);
      }
    });
  },
};