// js/core/date.js
// Date utilities: format, parse, IST helpers, recurring event math.

const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const MONTHS_LONG  = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS_SHORT   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const DAYS_LONG    = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

function pad(n) { return String(n).padStart(2, '0'); }

export const DateUtil = {
  pad,

  MONTHS_SHORT,
  MONTHS_LONG,
  DAYS_SHORT,
  DAYS_LONG,

  /** Create a Date in the user's local timezone from a YYYY-MM-DD string. */
  fromYMD(ymd) {
    const [y, m, d] = ymd.split('-').map(Number);
    return new Date(y, (m || 1) - 1, d || 1);
  },

  /** Format a Date as YYYY-MM-DD in local time. */
  toYMD(d) {
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  },

  /** Pretty format like "Jun 25, 2026". */
  format(d, pattern = 'MMM D, YYYY') {
    const Y = d.getFullYear();
    const M = d.getMonth();
    const D = d.getDate();
    const h = pad(d.getHours());
    const m = pad(d.getMinutes());
    const s = pad(d.getSeconds());
    const day = d.getDay();

    return pattern
      .replace(/YYYY/g, Y)
      .replace(/YY/g, String(Y).slice(-2))
      .replace(/MMMM/g, MONTHS_LONG[M])
      .replace(/MMM/g, MONTHS_SHORT[M])
      .replace(/MM/g, pad(M + 1))
      .replace(/DD/g, pad(D))
      .replace(/D/g, D)
      .replace(/dddd/g, DAYS_LONG[day])
      .replace(/ddd/g, DAYS_SHORT[day])
      .replace(/HH/g, h)
      .replace(/mm/g, m)
      .replace(/ss/g, s);
  },

  isSameDay(a, b) {
    return a.getFullYear() === b.getFullYear() &&
           a.getMonth() === b.getMonth() &&
           a.getDate() === b.getDate();
  },

  startOfDay(d) {
    const x = new Date(d); x.setHours(0, 0, 0, 0); return x;
  },
  endOfDay(d) {
    const x = new Date(d); x.setHours(23, 59, 59, 999); return x;
  },
  startOfMonth(d) {
    const x = new Date(d.getFullYear(), d.getMonth(), 1); return x;
  },
  endOfMonth(d) {
    return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
  },
  addDays(d, n) {
    const x = new Date(d); x.setDate(x.getDate() + n); return x;
  },
  addMonths(d, n) {
    const x = new Date(d); x.setMonth(x.getMonth() + n); return x;
  },
  addYears(d, n) {
    const x = new Date(d); x.setFullYear(d.getFullYear() + n); return x;
  },

  /** Returns the 6-week calendar grid for the month containing `d`. */
  monthGrid(d) {
    const first = this.startOfMonth(d);
    const startDay = first.getDay(); // 0=Sun
    const start = this.addDays(first, -startDay);
    const cells = [];
    for (let i = 0; i < 42; i++) {
      const date = this.addDays(start, i);
      cells.push({
        date,
        inMonth: date.getMonth() === d.getMonth(),
        isToday: this.isSameDay(date, new Date()),
      });
    }
    return cells;
  },

  /** Build a 7-day week starting from Sunday of `d`'s week. */
  weekRow(d) {
    const sunday = this.addDays(d, -d.getDay());
    return Array.from({ length: 7 }, (_, i) => this.addDays(sunday, i));
  },

  /** Returns a relative label: "today", "tomorrow", "yesterday", "in 3 days", or formatted date. */
  relative(d, base = new Date()) {
    const today = this.startOfDay(base);
    const target = this.startOfDay(d);
    const diff = Math.round((target - today) / 86400000);
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Tomorrow';
    if (diff === -1) return 'Yesterday';
    if (diff > 1 && diff < 7) return `In ${diff} days`;
    if (diff < -1 && diff > -7) return `${-diff} days ago`;
    return this.format(d, 'MMM D');
  },

  /** Format a Date as HH:MM. */
  formatTime(d) {
    return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  },

  /** Days from now until target — for due-date colors. */
  daysUntil(d, base = new Date()) {
    const a = this.startOfDay(base);
    const b = this.startOfDay(d);
    return Math.round((b - a) / 86400000);
  },

  /** Parse HH:MM into [h, m]. */
  parseTime(s) {
    const [h, m] = String(s || '').split(':').map(Number);
    return [h || 0, m || 0];
  },

  /** Format a timezone using Intl.DateTimeFormat. */
  formatInZone(date, zone, opts = {}) {
    try {
      return new Intl.DateTimeFormat(undefined, {
        timeZone: zone, hour: '2-digit', minute: '2-digit', second: '2-digit',
        hour12: false, ...opts,
      }).format(date);
    } catch { return '--:--:--'; }
  },

  zoneAbbr(zone, date = new Date()) {
    try {
      const parts = new Intl.DateTimeFormat(undefined, {
        timeZone: zone, timeZoneName: 'short', hour: 'numeric',
      }).formatToParts(date);
      return parts.find(p => p.type === 'timeZoneName')?.value || zone;
    } catch { return zone; }
  },

  /** Format milliseconds as HH:MM:SS or MM:SS.cs */
  ms(ms, { showHours = 'auto', showCs = false } = {}) {
    const totalCs = Math.floor(ms / 10);
    const cs = totalCs % 100;
    const totalSec = Math.floor(totalCs / 100);
    const s = totalSec % 60;
    const totalMin = Math.floor(totalSec / 60);
    const m = totalMin % 60;
    const h = Math.floor(totalMin / 60);

    const pad2 = (n) => String(n).padStart(2, '0');
    if (showHours === false || (showHours === 'auto' && h === 0)) {
      return showCs ? `${pad2(m)}:${pad2(s)}.${pad2(cs)}` : `${pad2(m)}:${pad2(s)}`;
    }
    return showCs ? `${pad2(h)}:${pad2(m)}:${pad2(s)}.${pad2(cs)}` : `${pad2(h)}:${pad2(m)}:${pad2(s)}`;
  },
};