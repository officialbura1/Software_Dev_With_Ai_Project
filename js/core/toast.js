// js/core/toast.js
// Toast notifications stacked bottom-right. ARIA role="status".

import { el } from './dom.js';
import { Icons } from './icons.js';

const DEFAULT_DURATION = 3500;
let root = null;

function ensureRoot() {
  if (root) return root;
  root = document.getElementById('toast-root');
  return root;
}

function closeToast(node, duration) {
  setTimeout(() => {
    if (!node.isConnected) return;
    node.classList.add('is-leaving');
    setTimeout(() => node.remove(), 220);
  }, duration);
}

export const Toast = {
  show({ title = '', message = '', type = 'info', duration = DEFAULT_DURATION, icon = null } = {}) {
    const mount = ensureRoot();
    if (!mount) return;

    const toast = el('div', { class: `toast toast--${type}`, role: 'status' }, [
      el('span', { class: 'toast__icon', html: icon || Icons.get(suggestIcon(type)) }),
      el('div', { class: 'toast__body' }, [
        title ? el('div', { class: 'toast__title', text: title }) : null,
        message ? el('div', { class: 'toast__msg', text: message }) : null,
      ].filter(Boolean)),
      el('button', {
        class: 'toast__close icon-btn',
        'aria-label': 'Dismiss',
        onClick: () => {
          toast.classList.add('is-leaving');
          setTimeout(() => toast.remove(), 220);
        },
        html: Icons.get('close'),
      }),
    ]);

    mount.appendChild(toast);
    closeToast(toast, duration);
    return toast;
  },

  info(message, title = 'Heads up')    { return this.show({ message, title, type: 'info' }); },
  success(message, title = 'Done')      { return this.show({ message, title, type: 'success' }); },
  warn(message, title = 'Warning')      { return this.show({ message, title, type: 'warning' }); },
  error(message, title = 'Something went wrong') { return this.show({ message, title, type: 'danger', duration: 5500 }); },
};

function suggestIcon(type) {
  switch (type) {
    case 'success': return 'checkCir';
    case 'warning': return 'warn';
    case 'danger':  return 'xCir';
    case 'info':
    default:        return 'info';
  }
}