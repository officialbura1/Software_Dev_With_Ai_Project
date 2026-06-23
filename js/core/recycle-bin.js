// js/core/recycle-bin.js
// Shared soft-delete + 30-day TTL. Items moved here have deletedAt set;
// a sweeper purges anything older than 30 days.

import { Storage } from './storage.js';
import { uuid } from './id.js';

const BIN_KEY_PREFIX = 'recyclebin:';
const TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
let sweeperHandle = null;

function isObject(x) { return x && typeof x === 'object' && !Array.isArray(x); }

/** Compute the bin key for a given primary key. */
function binKey(ns, primaryKey) {
  return `${BIN_KEY_PREFIX}${ns}:${primaryKey}`;
}

/**
 * Soft-delete an item: stores a copy under `recyclebin:<ns>:<id>` and removes
 * it from the primary storage.
 *
 *   primary: storage key 'calendar:events' with array
 *   item: { id, ... }
 *   ns: 'calendar'
 */
function softDelete(primaryKey, item) {
  if (!item || !item.id) return false;
  const ns = primaryKey.split(':')[0];
  const entry = { ...item, deletedAt: new Date().toISOString(), _origin: primaryKey };
  Storage.set(binKey(ns, item.id), entry);
  // Remove from primary list
  const list = Storage.get(primaryKey, []);
  const filtered = list.filter((x) => x.id !== item.id);
  Storage.set(primaryKey, filtered);
  return true;
}

/** Restore an item from the bin back into its original primary key. */
function restore(binId, originKey) {
  const ns = originKey.split(':')[0];
  const entry = Storage.get(binKey(ns, binId), null);
  if (!entry) return false;
  const list = Storage.get(originKey, []);
  const { deletedAt: _deletedAt, _origin: _origin, ...clean } = entry;
  list.push(clean);
  Storage.set(originKey, list);
  Storage.remove(binKey(ns, binId));
  return true;
}

/** Permanently delete from bin. */
function purge(binId, originKey) {
  const ns = originKey.split(':')[0];
  return Storage.remove(binKey(ns, binId));
}

/** Returns bin entries, optionally filtered by origin key prefix. */
function list(originFilter) {
  const all = Storage.list(BIN_KEY_PREFIX).map((k) => Storage.get(k, null)).filter(Boolean);
  if (!originFilter) return all;
  return all.filter((e) => e._origin === originKey(originFilter));
}

/** Sweep expired entries. */
function purgeExpired() {
  const cutoff = Date.now() - TTL_MS;
  for (const k of Storage.list(BIN_KEY_PREFIX)) {
    const entry = Storage.get(k, null);
    if (!entry) { Storage.remove(k); continue; }
    const ts = entry.deletedAt ? Date.parse(entry.deletedAt) : 0;
    if (ts && ts < cutoff) Storage.remove(k);
  }
}

function originKey(filter) {
  // filter can be 'calendar' or 'calendar:events' — return canonical origin key
  if (filter.includes(':')) return filter;
  return `${filter}:items`;
}

/** Start the sweeper interval (call once on boot). */
function startSweeper() {
  if (sweeperHandle) return;
  purgeExpired();
  sweeperHandle = setInterval(purgeExpired, 60 * 60 * 1000); // hourly
}

/** Stop sweeper (mostly for tests). */
function stopSweeper() {
  if (sweeperHandle) clearInterval(sweeperHandle);
  sweeperHandle = null;
}

export const RecycleBin = {
  softDelete,
  restore,
  purge,
  list,
  purgeExpired,
  startSweeper,
  stopSweeper,
  TTL_MS,
  newId: uuid,
};