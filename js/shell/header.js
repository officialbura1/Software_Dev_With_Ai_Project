// js/shell/header.js
// Wires the header buttons (recycle-bin, shortcuts cheat-sheet, theme toggle),
// and runs the live IST clock.

import { DateUtil } from '../core/date.js';
import { Theme } from '../core/theme.js';
import { Router } from '../router.js';
import { Toast } from '../core/toast.js';
import { Keyboard } from '../core/keyboard.js';
import { Modal } from '../core/modal.js';
import { Icons } from '../core/icons.js';
import { RecycleBin } from '../core/recycle-bin.js';
import { el } from '../core/dom.js';

function tick() {
  const node = document.getElementById('ist-clock-time');
  if (node) node.textContent = DateUtil.formatInZone(new Date(), 'Asia/Kolkata');
}

function showShortcuts() {
  const list = Keyboard.list();
  const sections = {
    global: [],
    calendar: [],
    todo: [],
    calculator: [],
    translator: [],
    clock: [],
  };
  for (const { scope, combo } of list) {
    if (!sections[scope]) sections[scope] = [];
    sections[scope].push(combo);
  }

  const friendly = (combo) => combo
    .split('+')
    .map(p => p === 'cmd' ? '⌘' : p === 'ctrl' ? 'Ctrl' : p === 'shift' ? 'Shift' : p === 'alt' ? 'Alt' : p === 'escape' ? 'Esc' : p.toUpperCase())
    .join(' + ');

  const body = el('div', { class: 'shortcut-grid' });
  for (const [scope, items] of Object.entries(sections)) {
    if (!items.length) continue;
    const block = el('div', { class: 'shortcut-block' }, [
      el('h4', { class: 'shortcut-block__title', text: scope[0].toUpperCase() + scope.slice(1) }),
      el('div', { class: 'shortcut-list' },
        items.map(combo => el('div', { class: 'shortcut-row' }, [
          el('span', { class: 'kbd-group', html: combo.split(' ').map(p =>
            p.split('+').map(k =>
              `<span class="kbd">${friendly(k)}</span>`
            ).join('+')
          ).join(' then ') }),
          el('span', { class: 'shortcut-row__desc', text: describeShortcut(scope, combo) }),
        ]))
      ),
    ]);
    body.appendChild(block);
  }

  Modal.open({ title: 'Keyboard Shortcuts', body, size: 'lg' });
}

function describeShortcut(scope, combo) {
  const map = {
    'ctrl+k': 'Focus search',
    'ctrl+/': 'Toggle theme',
    '1': 'Open Calendar',
    '2': 'Open To-Do',
    '3': 'Open Calculator',
    '4': 'Open Translator',
    '5': 'Open Clock',
    '6': 'Open Recycle Bin',
    '?': 'Show this',
    'escape': 'Close modal',
    'g c': 'Go to Calendar',
    'g t': 'Go to To-Do',
    'g a': 'Open Calculator',
    'g l': 'Open Translator',
    'g k': 'Open Clock',
    'g b': 'Open Recycle Bin',
    'n': 'New item',
    '/': 'Focus search',
    'space': 'Toggle',
    's': 'Star',
    'arrowup': 'Move up',
    'arrowdown': 'Move down',
    'delete': 'Delete',
    'arrowleft': 'Previous',
    'arrowright': 'Next',
    'shift+arrowleft': 'Previous month',
    'shift+arrowright': 'Next month',
    't': 'Today',
    'r': 'Reset',
    'l': 'Lap',
    'enter': 'Equals',
    'backspace': 'Backspace',
    'ctrl+enter': 'Translate',
    'ctrl+shift+s': 'Swap languages',
    'ctrl+shift+c': 'Copy translation',
  };
  return map[combo.toLowerCase()] || '';
}

function showRecycleBin() {
  const items = RecycleBin.list();
  const wrap = el('div', { class: 'bin-list' });

  if (!items.length) {
    wrap.appendChild(el('div', { class: 'empty' }, [
      el('div', { class: 'empty__icon', html: Icons.get('bin') }),
      el('div', { class: 'empty__title', text: 'Recycle bin is empty' }),
      el('div', { class: 'empty__msg', text: 'Deleted items from the Calendar and To-Do appear here for 30 days.' }),
    ]));
  } else {
    const header = el('div', { class: 'bin-header' }, [
      el('h3', { text: `${items.length} item${items.length === 1 ? '' : 's'}` }),
      el('button', {
        class: 'btn btn--danger btn--sm',
        text: 'Empty bin',
        onClick: async () => {
          const ok = await Modal.confirm({
            title: 'Empty recycle bin?',
            message: 'This permanently deletes all items in the bin.',
            confirmText: 'Empty',
            danger: true,
          });
          if (!ok) return;
          for (const it of items) RecycleBin.purge(it.id, it._origin);
          handle.close();
          Toast.success('Recycle bin emptied');
          showRecycleBin();
        },
      }),
    ]);
    wrap.appendChild(header);

    for (const item of items) {
      const deletedAt = item.deletedAt ? new Date(item.deletedAt) : null;
      const daysLeft = deletedAt
        ? Math.max(0, 30 - Math.floor((Date.now() - deletedAt.getTime()) / 86400000))
        : 30;

      const row = el('div', { class: 'bin-row' }, [
        el('div', { class: 'bin-row__icon', html: Icons.get(item._origin && item._origin.startsWith('todo') ? 'check' : 'calendar') }),
        el('div', { class: 'bin-row__body' }, [
          el('div', { class: 'bin-row__title', text: item.title || '(untitled)' }),
          el('div', { class: 'bin-row__meta muted text-xs' }, [
            `${item._origin || 'unknown'}`,
            deletedAt ? ` · deleted ${DateUtil.relative(deletedAt)}` : '',
            ` · ${daysLeft}d left`,
          ].join('')),
        ]),
        el('div', { class: 'bin-row__actions' }, [
          el('button', {
            class: 'btn btn--ghost btn--sm',
            text: 'Restore',
            onClick: () => {
              RecycleBin.restore(item.id, item._origin);
              Toast.success(`Restored "${item.title}"`);
              handle.close();
              showRecycleBin();
              // Tell active route to re-render
              document.dispatchEvent(new CustomEvent('data:changed', { detail: { origin: item._origin } }));
            },
          }),
          el('button', {
            class: 'btn btn--danger btn--sm',
            text: 'Delete',
            onClick: async () => {
              const ok = await Modal.confirm({
                title: 'Delete permanently?',
                message: `This will permanently delete "${item.title || 'this item'}".`,
                confirmText: 'Delete',
                danger: true,
              });
              if (!ok) return;
              RecycleBin.purge(item.id, item._origin);
              handle.close();
              showRecycleBin();
              Toast.success('Deleted permanently');
            },
          }),
        ]),
      ]);
      wrap.appendChild(row);
    }
  }

  const handle = Modal.open({
    title: 'Recycle Bin',
    body: wrap,
    size: 'lg',
  });
}

export const Header = {
  init() {
    document.getElementById('btn-theme')?.addEventListener('click', () => {
      const next = Theme.cycle();
      const label = next === 'auto' ? 'Follows device theme' : (next === 'dark' ? 'Dark theme' : 'Light theme');
      Toast.info(label);
    });

    document.getElementById('btn-recycle-bin')?.addEventListener('click', showRecycleBin);
    document.getElementById('btn-shortcuts')?.addEventListener('click', showShortcuts);

    // Live IST clock
    tick();
    setInterval(tick, 1000);

    // Global search -> focus and route based on prefix
    const search = document.getElementById('global-search');
    if (search) {
      search.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          const q = search.value.trim();
          if (!q) return;
          // Quick navigation: if query looks like a time e.g. "10:30" open clock
          // Otherwise route to whichever app has data: search runs in each app.
          if (q.length < 2) return;
          // Default: jump to calendar
          location.hash = '#/calendar';
          // Dispatch a search event so active route can filter
          setTimeout(() => {
            document.dispatchEvent(new CustomEvent('global:search', { detail: { query: q } }));
          }, 30);
        }
      });
    }

    // Header CTA: theme icon swap
    Theme.init();

    // Listen to active route to clear search
    document.addEventListener('route:active', () => {
      if (search) search.value = '';
    });

    return this;
  },
};