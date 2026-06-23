// js/core/notifications.js
// Thin wrapper around the Notifications API with permission flow and
// in-app fallback toasts. Future scheduling is done via setTimeout.

import { Storage } from './storage.js';
import { Toast } from './toast.js';

const PERM_KEY = 'prefs:notificationPermission';
const timers = new Set();

function safeStorageGet() {
  if (typeof Notification === 'undefined') return 'unsupported';
  try {
    const persisted = Storage.get(PERM_KEY, null);
    if (persisted && persisted !== Notification.permission) {
      // Browser doesn't always persist — recompute.
    }
    return Notification.permission;
  } catch { return 'denied'; }
}

export const Notifications = {
  init() {
    return this;
  },

  permission() {
    return safeStorageGet();
  },

  async request() {
    if (typeof Notification === 'undefined') return 'unsupported';
    if (Notification.permission === 'granted') return 'granted';
    if (Notification.permission === 'denied') return 'denied';
    try {
      const res = await Notification.requestPermission();
      Storage.set(PERM_KEY, res);
      return res;
    } catch {
      return 'denied';
    }
  },

  /** Fire a notification now. Falls back to in-app toast if denied/unsupported. */
  fire({ title, body, tag, icon = 'assets/favicon.svg', requireInteraction = false, onClick = null } = {}) {
    const perm = this.permission();
    if (perm === 'granted') {
      try {
        const n = new Notification(title, { body, tag, icon, requireInteraction });
        if (onClick) n.onclick = onClick;
        return { delivered: true, via: 'system' };
      } catch {
        // fall through to toast
      }
    }
    Toast.show({ title, message: body || '', type: perm === 'denied' ? 'warning' : 'info' });
    return { delivered: true, via: 'toast' };
  },

  /** Schedule a notification to fire at a future timestamp. */
  schedule({ when, title, body, tag, icon, requireInteraction = false, onClick = null } = {}) {
    const delay = when.getTime() - Date.now();
    if (delay <= 0) {
      this.fire({ title, body, tag, icon, requireInteraction, onClick });
      return null;
    }
    const handle = setTimeout(() => {
      timers.delete(handle);
      this.fire({ title, body, tag, icon, requireInteraction, onClick });
    }, Math.min(delay, 2_147_483_647)); // max setTimeout
    timers.add(handle);
    return handle;
  },

  cancel(handle) {
    if (handle && timers.has(handle)) {
      clearTimeout(handle);
      timers.delete(handle);
    }
  },

  cancelAll() {
    for (const h of timers) clearTimeout(h);
    timers.clear();
  },
};