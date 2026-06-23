// js/apps/calendar.js
// Calendar — month / week / day views, event CRUD, search, holidays, notifications.
// Holidays are merged at render time from data/holidays.json.

import { el, $, $$, clear, fragment, mount } from '../core/dom.js';
import { Storage } from '../core/storage.js';
import { DateUtil } from '../core/date.js';
import { Icons } from '../core/icons.js';
import { Modal } from '../core/modal.js';
import { Toast } from '../core/toast.js';
import { RecycleBin } from '../core/recycle-bin.js';
import { Notifications } from '../core/notifications.js';
import { uuid } from '../core/id.js';
import { Keyboard } from '../core/keyboard.js';
import { Sound } from '../core/sound.js';

const EVENTS_KEY = 'calendar:events';
const VIEW_KEY   = 'calendar:view';     // 'month' | 'week' | 'day'
const CURSOR_KEY = 'calendar:cursor';   // YYYY-MM-DD

let events = [];
let view = 'month';
let cursor = new Date();
let search = '';
let filter = 'all'; // 'all' | 'reminders' | 'events' | 'holidays'
let selectedEventId = null;
let holidays = [];

async function loadHolidays() {
  if (holidays.length) return holidays;
  try {
    const res = await fetch('data/holidays.json');
    holidays = await res.json();
  } catch {
    holidays = [];
  }
  return holidays;
}

function load() {
  events = Storage.get(EVENTS_KEY, []);
  view = Storage.get(VIEW_KEY, 'month');
  const c = Storage.get(CURSOR_KEY, null);
  if (c) cursor = DateUtil.fromYMD(c);
}

function save() {
  Storage.set(EVENTS_KEY, events);
  Storage.set(VIEW_KEY, view);
  Storage.set(CURSOR_KEY, DateUtil.toYMD(cursor));
}

function getActiveHolidays() {
  if (!holidays.length) return [];
  const y = cursor.getFullYear();
  return holidays.filter(h => {
    if (h.start) return h.start <= DateUtil.toYMD(new Date(y, 11, 31)) && h.end >= DateUtil.toYMD(new Date(y, 0, 1));
    return h.date.startsWith(String(y));
  });
}

function findHolidaysOnDate(date) {
  const ymd = DateUtil.toYMD(date);
  return holidays.filter(h => {
    if (h.date) return h.date === ymd;
    if (h.start && h.end) return ymd >= h.start && ymd <= h.end;
    return false;
  });
}

function getDayItems(date) {
  const ymd = DateUtil.toYMD(date);
  const e = events
    .filter(x => x.date === ymd && !x.deletedAt)
    .map(x => ({ kind: x.type === 'reminder' ? 'reminder' : 'event', data: x }));
  const h = findHolidaysOnDate(date).map(x => ({ kind: 'holiday', data: x }));
  return [...e, ...h];
}

function matchesSearch(item) {
  if (!search) return true;
  const q = search.toLowerCase();
  return (
    (item.title || '').toLowerCase().includes(q) ||
    (item.notes || '').toLowerCase().includes(q) ||
    (item.name  || '').toLowerCase().includes(q)
  );
}

function matchesFilter(item) {
  if (filter === 'all') return true;
  if (filter === 'reminders') return item.kind === 'reminder';
  if (filter === 'events') return item.kind === 'event';
  if (filter === 'holidays') return item.kind === 'holiday';
  return true;
}

/* ── Notifications: scan upcoming events in next 24h ─────────────── */
const scheduled = new Set();
function clearAllScheduled() {
  for (const h of scheduled) Notifications.cancel(h);
  scheduled.clear();
}
function scheduleForEvent(ev) {
  if (ev.deletedAt) return;
  if (ev.notified) return;
  if (!ev.startTime) return;
  const [h, m] = DateUtil.parseTime(ev.startTime);
  const at = new Date(ev.date);
  at.setHours(h, m, 0, 0);
  const offsetMs = (ev.notifyBefore || 0) * 60_000;
  const fireAt = new Date(at.getTime() - offsetMs);
  if (fireAt.getTime() <= Date.now()) return;
  if (fireAt.getTime() - Date.now() > 24 * 3600 * 1000) return; // only schedule next 24h
  const handle = Notifications.schedule({
    when: fireAt,
    title: `📌 ${ev.title}`,
    body: ev.notes || `Scheduled for ${ev.startTime}${ev.endTime ? ' – ' + ev.endTime : ''}`,
    tag: `cal-${ev.id}`,
    onClick: () => { window.focus(); location.hash = '#/calendar'; },
  });
  if (handle) {
    scheduled.add(handle);
    ev._scheduledHandle = handle;
  }
}
function rescheduleNotifications() {
  clearAllScheduled();
  for (const ev of events) scheduleForEvent(ev);
}

/* ── Event create / edit modal ─────────────────────────────────── */
function openEventForm(existing) {
  const isEdit = !!existing;
  const e = existing || {
    id: uuid(),
    title: '',
    date: DateUtil.toYMD(cursor),
    startTime: '09:00',
    endTime: '10:00',
    type: 'reminder',
    notes: '',
    recurring: 'none',
    notifyBefore: 15,
    notified: false,
    createdAt: new Date().toISOString(),
  };

  const form = el('form', { class: 'form', onSubmit: (ev) => { ev.preventDefault(); saveBtn.click(); } }, [
    el('div', { class: 'field' }, [
      el('label', { class: 'field-label', text: 'Title' }),
      el('input', { class: 'input', type: 'text', name: 'title', value: e.title, required: true, placeholder: 'e.g. Call dentist' }),
    ]),
    el('div', { class: 'form-row' }, [
      el('div', { class: 'field' }, [
        el('label', { class: 'field-label', text: 'Date' }),
        el('input', { class: 'input', type: 'date', name: 'date', value: e.date, required: true }),
      ]),
      el('div', { class: 'field' }, [
        el('label', { class: 'field-label', text: 'Type' }),
        (() => {
          const sel = el('select', { class: 'select', name: 'type' }, [
            el('option', { value: 'reminder', text: 'Reminder' }),
            el('option', { value: 'event', text: 'Event' }),
          ]);
          sel.value = e.type;
          return sel;
        })(),
      ]),
    ]),
    el('div', { class: 'form-row' }, [
      el('div', { class: 'field' }, [
        el('label', { class: 'field-label', text: 'Start time' }),
        el('input', { class: 'input', type: 'time', name: 'startTime', value: e.startTime }),
      ]),
      el('div', { class: 'field' }, [
        el('label', { class: 'field-label', text: 'End time' }),
        el('input', { class: 'input', type: 'time', name: 'endTime', value: e.endTime }),
      ]),
    ]),
    el('div', { class: 'form-row' }, [
      el('div', { class: 'field' }, [
        el('label', { class: 'field-label', text: 'Repeats' }),
        (() => {
          const sel = el('select', { class: 'select', name: 'recurring' }, [
            el('option', { value: 'none', text: 'Does not repeat' }),
            el('option', { value: 'daily', text: 'Daily' }),
            el('option', { value: 'weekly', text: 'Weekly' }),
            el('option', { value: 'monthly', text: 'Monthly' }),
            el('option', { value: 'yearly', text: 'Yearly' }),
          ]);
          sel.value = e.recurring;
          return sel;
        })(),
      ]),
      el('div', { class: 'field' }, [
        el('label', { class: 'field-label', text: 'Notify' }),
        (() => {
          const sel = el('select', { class: 'select', name: 'notifyBefore' }, [
            el('option', { value: '0', text: 'At time' }),
            el('option', { value: '5', text: '5 min before' }),
            el('option', { value: '15', text: '15 min before' }),
            el('option', { value: '60', text: '1 hour before' }),
            el('option', { value: '1440', text: '1 day before' }),
          ]);
          sel.value = String(e.notifyBefore || 0);
          return sel;
        })(),
      ]),
    ]),
    el('div', { class: 'field' }, [
      el('label', { class: 'field-label', text: 'Notes' }),
      el('textarea', { class: 'textarea', name: 'notes', placeholder: 'Optional details…' }, [e.notes || '']),
    ]),
  ]);

  const cancelBtn = el('button', { type: 'button', class: 'btn btn--ghost', text: 'Cancel', onClick: () => handle.close() });
  const saveBtn = el('button', { type: 'button', class: 'btn btn--primary', text: isEdit ? 'Save' : 'Create', onClick: () => {
    const data = new FormData(form);
    const updated = {
      ...e,
      title: data.get('title')?.toString().trim() || '(untitled)',
      date: data.get('date'),
      startTime: data.get('startTime'),
      endTime: data.get('endTime'),
      type: data.get('type'),
      recurring: data.get('recurring'),
      notifyBefore: Number(data.get('notifyBefore') || 0),
      notes: data.get('notes')?.toString() || '',
      notified: false,
    };
    if (isEdit) {
      const idx = events.findIndex(x => x.id === e.id);
      if (idx >= 0) events[idx] = updated;
      Toast.success('Event updated');
    } else {
      events.push(updated);
      Toast.success('Event created');
      // Request notification permission on first future event
      const [hh, mm] = DateUtil.parseTime(updated.startTime);
      const at = new Date(updated.date); at.setHours(hh, mm, 0, 0);
      if (at.getTime() > Date.now()) {
        Notifications.request().then(perm => {
          if (perm === 'denied') {
            Toast.warn('Browser notifications blocked — using in-app alerts.');
          }
        });
      }
    }
    save();
    rescheduleNotifications();
    handle.close();
    render();
  } });

  const delBtn = isEdit
    ? el('button', { type: 'button', class: 'btn btn--danger', text: 'Delete', onClick: async () => {
        const ok = await Modal.confirm({
          title: 'Delete event?',
          message: 'This moves the event to the recycle bin. You can restore it for 30 days.',
          confirmText: 'Delete',
          danger: true,
        });
        if (!ok) return;
        const idx = events.findIndex(x => x.id === e.id);
        if (idx >= 0) {
          const [removed] = events.splice(idx, 1);
          RecycleBin.softDelete(EVENTS_KEY, removed);
          save();
          rescheduleNotifications();
          handle.close();
          Toast.success('Moved to recycle bin');
          render();
        }
      }})
    : null;

  const handle = Modal.open({
    title: isEdit ? 'Edit event' : 'New event',
    body: form,
    footer: [delBtn, cancelBtn, saveBtn].filter(Boolean),
    size: 'md',
  });
}

/* ── Rendering ──────────────────────────────────────────────────── */
function render() {
  const root = $('#view');
  if (!root) return;
  const viewEl = $(`#view .view-calendar`);
  if (!viewEl) return;

  // Header
  const headerEl = $('.cal-header', viewEl);
  if (headerEl) {
    clear(headerEl);
    const titleText = view === 'month'
      ? DateUtil.format(cursor, 'MMMM YYYY')
      : view === 'week'
        ? `Week of ${DateUtil.format(DateUtil.weekRow(cursor)[0], 'MMM D, YYYY')}`
        : DateUtil.format(cursor, 'dddd, MMMM D, YYYY');
    headerEl.appendChild(fragment([
      el('div', { class: 'cal-header__title-block' }, [
        el('h1', { class: 'view__title', text: titleText }),
        el('div', { class: 'view__subtitle', text: subtitle() }),
      ]),
      el('div', { class: 'cal-header__controls' }, [
        el('div', { class: 'segmented' }, ['month','week','day'].map(v =>
          el('button', {
            type: 'button',
            class: v === view ? 'is-active' : '',
            text: v[0].toUpperCase() + v.slice(1),
            onClick: () => { view = v; save(); render(); },
          })
        )),
        el('div', { class: 'cal-header__nav' }, [
          el('button', { class: 'icon-btn', 'aria-label': 'Previous', onClick: navigateBack, html: Icons.get('chevLeft') }),
          el('button', { class: 'btn btn--ghost btn--sm', text: 'Today', onClick: () => { cursor = new Date(); save(); render(); } }),
          el('button', { class: 'icon-btn', 'aria-label': 'Next', onClick: navigateForward, html: Icons.get('chevRight') }),
        ]),
      ]),
    ]));
  }

  // Filters
  const filterEl = $('.cal-filters', viewEl);
  if (filterEl) {
    clear(filterEl);
    filterEl.appendChild(fragment([
      el('input', {
        class: 'input cal-filters__search',
        type: 'search',
        placeholder: 'Search reminders, events, holidays…',
        value: search,
        onInput: (e) => { search = e.target.value; renderGrid(); },
      }),
      el('div', { class: 'tag-row' }, [
        { id: 'all', label: 'All' },
        { id: 'reminders', label: 'Reminders' },
        { id: 'events', label: 'Events' },
        { id: 'holidays', label: 'Holidays' },
      ].map(f => el('button', {
        type: 'button',
        class: `chip ${filter === f.id ? 'is-active' : ''}`,
        onClick: () => { filter = f.id; renderGrid(); },
      }, [f.label]))),
    ]));
  }

  renderGrid();
}

function subtitle() {
  const count = events.filter(e => !e.deletedAt).length;
  return `${count} event${count === 1 ? '' : 's'} scheduled`;
}

function navigateBack() {
  if (view === 'month') cursor = DateUtil.addMonths(cursor, -1);
  else if (view === 'week') cursor = DateUtil.addDays(cursor, -7);
  else cursor = DateUtil.addDays(cursor, -1);
  save(); render();
}
function navigateForward() {
  if (view === 'month') cursor = DateUtil.addMonths(cursor, 1);
  else if (view === 'week') cursor = DateUtil.addDays(cursor, 7);
  else cursor = DateUtil.addDays(cursor, 1);
  save(); render();
}

function renderGrid() {
  const viewEl = $('#view .view-calendar');
  const gridEl = $('.cal-grid', viewEl);
  if (!gridEl) return;
  clear(gridEl);

  if (view === 'month') {
    gridEl.className = 'cal-grid cal-grid--month';
    gridEl.appendChild(fragment(['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d =>
      el('div', { class: 'cal-month__dow' }, [d])
    )));
    const cells = DateUtil.monthGrid(cursor);
    for (const cell of cells) {
      const items = getDayItems(cell.date).filter(matchesSearch).filter(matchesFilter);
      const visible = items.slice(0, 3);
      const more = items.length - visible.length;
      const cellEl = el('button', {
        type: 'button',
        class: `cal-month__cell ${cell.inMonth ? '' : 'is-out'} ${cell.isToday ? 'is-today' : ''}`,
        onClick: () => { cursor = cell.date; view = 'day'; save(); render(); },
      }, [
        el('div', { class: 'cal-month__date' }, [
          el('span', { text: String(cell.date.getDate()) }),
        ]),
        el('div', { class: 'cal-month__items' }, visible.map(it => {
          const isHol = it.kind === 'holiday';
          return el('div', { class: `cal-pill cal-pill--${isHol ? 'holiday' : it.kind}` }, [
            isHol ? '' : (it.data.startTime ? el('span', { class: 'cal-pill__time', text: it.data.startTime }) : ''),
            el('span', { class: 'cal-pill__title', text: isHol ? it.data.name : it.data.title }),
          ]);
        }).concat(more > 0 ? [el('div', { class: 'cal-pill cal-pill--more', text: `+${more} more` })] : [])),
      ]);
      gridEl.appendChild(cellEl);
    }
  }
  else if (view === 'week') {
    gridEl.className = 'cal-grid cal-grid--week';
    const days = DateUtil.weekRow(cursor);
    gridEl.appendChild(el('div', { class: 'cal-week__time' }));
    for (const d of days) {
      gridEl.appendChild(el('div', { class: `cal-week__day ${DateUtil.isSameDay(d, new Date()) ? 'is-today' : ''}` }, [
        el('div', { class: 'cal-week__dow', text: DateUtil.format(d, 'ddd') }),
        el('div', { class: 'cal-week__date', text: String(d.getDate()) }),
      ]));
    }
    for (let hour = 0; hour < 24; hour++) {
      gridEl.appendChild(el('div', { class: 'cal-week__hour', text: String(hour).padStart(2, '0') + ':00' }));
      for (let i = 0; i < 7; i++) {
        const cellDate = days[i];
        const items = getDayItems(cellDate).filter(x => x.kind !== 'holiday' && matchesFilter(x) && matchesSearch(x));
        const hourItems = items.filter(it => {
          if (!it.data.startTime) return hour === 9;
          const [h] = DateUtil.parseTime(it.data.startTime);
          return h === hour;
        });
        const cell = el('div', { class: 'cal-week__cell' },
          hourItems.map(it => el('div', { class: `cal-week__event cal-pill--${it.kind}` }, [
            el('span', { class: 'cal-pill__title', text: it.data.title }),
          ]))
        );
        cell.addEventListener('click', () => { cursor = cellDate; view = 'day'; save(); render(); });
        gridEl.appendChild(cell);
      }
    }
  }
  else { // day
    gridEl.className = 'cal-grid cal-grid--day';
    const dayItems = getDayItems(cursor).filter(matchesSearch).filter(matchesFilter);
    gridEl.appendChild(el('div', { class: 'cal-day__date-block' }, [
      el('div', { class: 'cal-day__weekday', text: DateUtil.format(cursor, 'dddd') }),
      el('div', { class: 'cal-day__date', text: DateUtil.format(cursor, 'MMMM D, YYYY') }),
    ]));
    const list = el('div', { class: 'cal-day__list' });
    if (!dayItems.length) {
      list.appendChild(el('div', { class: 'empty' }, [
        el('div', { class: 'empty__icon', html: Icons.get('calendar') }),
        el('div', { class: 'empty__title', text: 'Nothing scheduled' }),
        el('div', { class: 'empty__msg', text: 'Tap + to add a reminder or event.' }),
      ]));
    } else {
      dayItems.sort((a, b) => {
        const aT = a.data.startTime || '99:99';
        const bT = b.data.startTime || '99:99';
        return aT.localeCompare(bT);
      });
      for (const it of dayItems) {
        const isHol = it.kind === 'holiday';
        const row = el('div', { class: `cal-day__row cal-day__row--${it.kind} ${selectedEventId === it.data.id ? 'is-selected' : ''}` }, [
          el('div', { class: 'cal-day__time' }, [
            isHol
              ? el('span', { class: 'badge badge--info', text: 'Holiday' })
              : (it.data.startTime
                ? el('span', { class: 'cal-day__time-text', text: it.data.startTime + (it.data.endTime ? ' – ' + it.data.endTime : '') })
                : el('span', { class: 'cal-day__time-text', text: 'All day' })),
          ]),
          el('div', { class: 'cal-day__body' }, [
            el('div', { class: 'cal-day__title', text: isHol ? it.data.name : it.data.title }),
            it.data.notes ? el('div', { class: 'cal-day__notes muted', text: it.data.notes }) : null,
            !isHol && it.data.recurring !== 'none' ? el('div', { class: 'badge', text: 'Repeats ' + it.data.recurring }) : null,
          ]),
          !isHol ? el('div', { class: 'cal-day__actions' }, [
            el('button', { class: 'icon-btn', 'aria-label': 'Edit', onClick: () => openEventForm(it.data), html: Icons.get('edit') }),
            el('button', { class: 'icon-btn', 'aria-label': 'Delete', onClick: async () => {
              const ok = await Modal.confirm({ title: 'Delete event?', message: 'Moves to recycle bin.', danger: true, confirmText: 'Delete' });
              if (!ok) return;
              const idx = events.findIndex(x => x.id === it.data.id);
              if (idx >= 0) {
                const [removed] = events.splice(idx, 1);
                RecycleBin.softDelete(EVENTS_KEY, removed);
                save();
                rescheduleNotifications();
                Toast.success('Moved to recycle bin');
                render();
              }
            }, html: Icons.get('trash') }),
          ]) : null,
        ].filter(Boolean));
        list.appendChild(row);
      }
    }
    gridEl.appendChild(list);
  }
}

function mountView(root) {
  load();
  loadHolidays();

  root.appendChild(fragment([
    el('div', { class: 'cal-header' }),
    el('div', { class: 'cal-filters' }),
    el('div', { class: 'cal-grid' }),
  ]));

  // FAB
  const fab = el('button', {
    class: 'fab',
    onClick: () => openEventForm(null),
  }, [
    el('span', { class: 'icon', html: Icons.get('plus') }),
    el('span', { text: 'New event' }),
  ]);
  document.body.appendChild(fab);

  // Cleanup FAB on leave
  document.addEventListener('route:change', (e) => {
    if (e.detail.name !== 'calendar' && fab.isConnected) fab.remove();
  }, { once: true });

  // Keyboard shortcuts
  const k = (combo, fn) => Keyboard.register('calendar', combo, fn);
  k('n', () => openEventForm(null));
  k('t', () => { cursor = new Date(); save(); render(); });
  k('arrowleft',  navigateBack);
  k('arrowright', navigateForward);
  k('shift+arrowleft',  () => { cursor = DateUtil.addMonths(cursor, -1); save(); render(); });
  k('shift+arrowright', () => { cursor = DateUtil.addMonths(cursor,  1); save(); render(); });
  k('1', () => { view = 'day';   save(); render(); });
  k('2', () => { view = 'week';  save(); render(); });
  k('3', () => { view = 'month'; save(); render(); });
  k('delete', async () => {
    if (!selectedEventId) return;
    const ev = events.find(x => x.id === selectedEventId);
    if (!ev) return;
    const ok = await Modal.confirm({ title: 'Delete event?', message: 'Moves to recycle bin.', danger: true });
    if (!ok) return;
    const idx = events.findIndex(x => x.id === ev.id);
    if (idx >= 0) {
      const [removed] = events.splice(idx, 1);
      RecycleBin.softDelete(EVENTS_KEY, removed);
      save(); rescheduleNotifications(); render();
    }
  });

  rescheduleNotifications();
  render();
}

export const Calendar = {
  mount: mountView,
};