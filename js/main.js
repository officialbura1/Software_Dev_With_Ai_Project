// js/main.js
// Entry point. Boots the shell, theme, router, services, and starts the
// recycle-bin sweeper.

import { Theme } from './core/theme.js';
import { Keyboard } from './core/keyboard.js';
import { Sound } from './core/sound.js';
import { Notifications } from './core/notifications.js';
import { RecycleBin } from './core/recycle-bin.js';
import { Debug } from './core/debug.js';
import { Router } from './router.js';
import { Sidebar } from './shell/sidebar.js';
import { BottomNav } from './shell/bottom-nav.js';
import { Header } from './shell/header.js';

import { Calendar } from './apps/calendar.js';
import { Todo } from './apps/todo.js';
import { Calculator } from './apps/calculator.js';
import { Translator } from './apps/translator.js';
import { Clock } from './apps/clock.js';
import { RecycleBinView } from './apps/recycle-bin-view.js';

import { Icons } from './core/icons.js';
import { el } from './core/dom.js';

// Boot
Theme.init();
Sound.init();
Notifications.init();
RecycleBin.startSweeper();
Debug.init();

Sidebar.init();
BottomNav.init();
Header.init();
Keyboard.init();

// Set favicon dynamically (in case browser cached old)
const link = document.querySelector('link[rel="icon"]');
if (link) link.href = 'data:image/svg+xml;utf8,' + encodeURIComponent(Icons.get('calendar'));

// Register app routes
Router.register('calendar',     (root) => Calendar.mount(root));
Router.register('todo',         (root) => Todo.mount(root));
Router.register('calculator',   (root) => Calculator.mount(root));
Router.register('translator',   (root) => Translator.mount(root));
Router.register('clock',        (root) => Clock.mount(root));
Router.register('recycle-bin',  (root) => RecycleBinView.mount(root));
Router.register('404', (root) => {
  el('div', { class: 'empty' }, [
    el('div', { class: 'empty__icon', html: Icons.get('warn') }),
    el('div', { class: 'empty__title', text: 'Page not found' }),
    el('div', { class: 'empty__msg', text: 'The route you requested does not exist.' }),
  ]);
});

// Global keyboard shortcuts
const k = (combo, fn) => Keyboard.register('global', combo, fn);
k('ctrl+k', () => document.getElementById('global-search')?.focus());
k('ctrl+/', () => Theme.toggle());
k('1', () => location.hash = '#/calendar');
k('2', () => location.hash = '#/todo');
k('3', () => location.hash = '#/calculator');
k('4', () => location.hash = '#/translator');
k('5', () => location.hash = '#/clock');
k('6', () => location.hash = '#/recycle-bin');
k('?', () => document.getElementById('btn-shortcuts')?.click());
// Chorded go-to
k('g c', () => location.hash = '#/calendar');
k('g t', () => location.hash = '#/todo');
k('g a', () => location.hash = '#/calculator');
k('g l', () => location.hash = '#/translator');
k('g k', () => location.hash = '#/clock');
k('g b', () => location.hash = '#/recycle-bin');

// Activate scope on route change
document.addEventListener('route:change', (e) => {
  const name = e.detail.name;
  Keyboard.activateScope(name === 'recycle-bin' ? 'global' : name);
});

// Boot the router last so the view container exists.
Router.init();

// Refresh header IST clock on visibility change
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    const node = document.getElementById('ist-clock-time');
    if (node) {
      // Force update
      node.dispatchEvent(new Event('tick-now'));
    }
  }
});