// js/core/debug.js
// Debug helpers, exposed on window when ?debug=1 is in the URL.

import { Storage } from './storage.js';
import { RecycleBin } from './recycle-bin.js';

export const Debug = {
  init() {
    const params = new URLSearchParams(location.search);
    if (params.get('debug') !== '1') return;
    window.__dump = () => {
      const keys = Storage.list('');
      const out = {};
      for (const k of keys) {
        try {
          const v = Storage.get(k, null);
          out[k] = Array.isArray(v) ? `[${v.length} items]` : (isObject(v) ? '{…}' : v);
        } catch { out[k] = '?'; }
      }
      console.table(out);
      return out;
    };
    window.__purge = () => RecycleBin.purgeExpired();
    window.__clear = () => { if (confirm('Clear ALL localStorage?')) Storage.clearAll(); };
    window.__recalc = () => location.reload();
    console.info('Debug helpers: __dump(), __purge(), __clear(), __recalc()');
  },
};

function isObject(x) { return x && typeof x === 'object' && !Array.isArray(x); }