// js/core/modal.js
// Modal manager with focus trap, backdrop click to dismiss, Esc to close,
// and two flavors: Modal.open() for arbitrary content and Modal.confirm()
// for a Promise-based yes/no.

import { el, clear, $ } from './dom.js';
import { Icons } from './icons.js';

let activeModal = null;
let lastFocused = null;

function buildModal({ title, body, footer, size }) {
  const backdrop = el('div', {
    class: 'modal-backdrop',
    onClick: (e) => { if (e.target === backdrop) close(); },
  });

  const titleEl = el('h2', { class: 'modal__title', text: title });
  const closeBtn = el('button', {
    class: 'icon-btn',
    'aria-label': 'Close',
    onClick: () => close(),
    html: Icons.get('close'),
  });

  const dialog = el('div', {
    class: `modal ${size === 'lg' ? 'modal--lg' : size === 'xl' ? 'modal--xl' : ''}`,
    role: 'dialog',
    'aria-modal': 'true',
    'aria-label': title,
  }, [
    el('header', { class: 'modal__header' }, [titleEl, closeBtn]),
    body ? el('div', { class: 'modal__body' }, body instanceof Node ? [body] : body) : null,
    footer ? el('footer', { class: 'modal__footer' }, footer instanceof Node ? [footer] : footer) : null,
  ].filter(Boolean));

  backdrop.appendChild(dialog);
  return { backdrop, dialog, titleEl, closeBtn };
}

function focusables(root) {
  return Array.from(root.querySelectorAll(
    'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
  ));
}

function trap(e) {
  if (!activeModal) return;
  if (e.key !== 'Tab') return;
  const f = focusables(activeModal.dialog);
  if (!f.length) { e.preventDefault(); return; }
  const first = f[0], last = f[f.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
}

function onKeyDown(e) {
  if (!activeModal) return;
  if (e.key === 'Escape') { e.preventDefault(); close(); return; }
  trap(e);
}

function close() {
  if (!activeModal) return;
  const { backdrop } = activeModal;
  backdrop.style.animation = 'fade-in var(--dur-fast) var(--ease-in-out) reverse both';
  setTimeout(() => {
    backdrop.remove();
    activeModal = null;
    document.removeEventListener('keydown', onKeyDown, true);
    if (lastFocused && lastFocused.focus) try { lastFocused.focus(); } catch { /* noop */ }
  }, 140);
}

export const Modal = {
  /**
   * Open a modal. Returns { close, dialog }.
   *   Modal.open({ title, body, footer, size })
   */
  open({ title = '', body = null, footer = null, size = 'md', onClose = null } = {}) {
    if (activeModal) close();

    lastFocused = document.activeElement;
    const built = buildModal({ title, body, footer, size });
    document.getElementById('modal-root').appendChild(built.backdrop);
    activeModal = { ...built, onClose };

    document.addEventListener('keydown', onKeyDown, true);

    // Initial focus: first focusable, or close button.
    requestAnimationFrame(() => {
      const f = focusables(built.dialog);
      (f[0] || built.closeBtn).focus();
    });

    return {
      dialog: built.dialog,
      titleEl: built.titleEl,
      close: () => { close(); if (onClose) onClose(); },
      setTitle(t) { built.titleEl.textContent = t; },
    };
  },

  /** Promise-based confirm. */
  confirm({
    title = 'Are you sure?',
    message = '',
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    danger = false,
  } = {}) {
    return new Promise((resolve) => {
      const body = el('p', { class: 'muted', text: message });
      const cancel = el('button', {
        class: 'btn btn--ghost',
        text: cancelText,
        onClick: () => { handle.close(); resolve(false); },
      });
      const ok = el('button', {
        class: `btn ${danger ? 'btn--danger' : 'btn--primary'}`,
        text: confirmText,
        onClick: () => { handle.close(); resolve(true); },
      });
      const handle = Modal.open({
        title,
        body: [body],
        footer: [cancel, ok],
        onClose: () => resolve(false),
      });
    });
  },

  /** Simple input prompt. */
  prompt({
    title = 'Enter value',
    label = '',
    placeholder = '',
    initialValue = '',
    confirmText = 'OK',
    cancelText = 'Cancel',
  } = {}) {
    return new Promise((resolve) => {
      const input = el('input', {
        class: 'input', type: 'text', placeholder, value: initialValue,
      });
      const body = el('div', { class: 'field' }, [
        label ? el('label', { class: 'field-label', text: label }) : null,
        input,
      ].filter(Boolean));
      const cancel = el('button', {
        class: 'btn btn--ghost',
        text: cancelText,
        onClick: () => { handle.close(); resolve(null); },
      });
      const ok = el('button', {
        class: 'btn btn--primary',
        text: confirmText,
        onClick: () => { const v = input.value.trim(); handle.close(); resolve(v); },
      });
      const handle = Modal.open({
        title, body: [body], footer: [cancel, ok],
        onClose: () => resolve(null),
      });
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); ok.click(); }
      });
      requestAnimationFrame(() => input.focus());
    });
  },
};