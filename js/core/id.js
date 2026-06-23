// js/core/id.js
// UUID generator using crypto.randomUUID with a robust fallback.

export function uuid() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    try { return crypto.randomUUID(); }
    catch { /* fall through */ }
  }
  // RFC4122-ish fallback (not cryptographic, but unique enough for client IDs)
  const r = (n) => Math.floor(Math.random() * n).toString(16);
  const s = () => r(0x10000).padStart(4, '0');
  return (
    s() + s() + '-' +
    s() + '-' +
    '4' + s().slice(1) + '-' +
    ((Math.floor(Math.random() * 4) + 8).toString(16)) + s().slice(1) + '-' +
    s() + s() + s()
  );
}