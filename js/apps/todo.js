// js/apps/todo.js
// To-Do list with categories, filters, search, star, list/daily/weekly views,
// recycle bin integration, notifications, and dark/light/auto theme.

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

const TASKS_KEY = 'todo:tasks';
const CATS_KEY  = 'todo:categories';
const THEME_KEY = 'todo:themeMode';
const VIEW_KEY  = 'todo:view';
const FILTER_KEY= 'todo:filter';

let tasks = [];
let categories = [];
let themeMode = 'auto';
let view = 'list';   // 'list' | 'daily' | 'weekly'
let filter = 'all';  // 'all' | 'today' | 'week' | 'overdue' | 'starred'
let search = '';
let activeCategory = 'all';
let selectedTaskId = null;
let selectedForBulk = new Set();

function load() {
  tasks = Storage.get(TASKS_KEY, []);
  categories = Storage.get(CATS_KEY, defaultCategories());
  themeMode = Storage.get(THEME_KEY, 'auto');
  view = Storage.get(VIEW_KEY, 'list');
  filter = Storage.get(FILTER_KEY, 'all');
}

function save() {
  Storage.set(TASKS_KEY, tasks);
  Storage.set(CATS_KEY, categories);
  Storage.set(THEME_KEY, themeMode);
  Storage.set(VIEW_KEY, view);
  Storage.set(FILTER_KEY, filter);
}

function defaultCategories() {
  return [
    { id: 'personal',  name: 'Personal',  color: '#6366F1' },
    { id: 'work',      name: 'Work',      color: '#22D3EE' },
    { id: 'shopping',  name: 'Shopping',  color: '#F59E0B' },
    { id: 'health',    name: 'Health',    color: '#10B981' },
  ];
}

function applyTheme() {
  if (themeMode === 'auto') {
    document.documentElement.dataset.theme = ''; // remove override
    // Theme module controls root already; no-op
  } else {
    document.documentElement.dataset.theme = themeMode;
  }
}

/* ── Notifications ─────────────────────────────────────────────── */
const scheduled = new Set();
function clearScheduled() {
  for (const h of scheduled) Notifications.cancel(h);
  scheduled.clear();
}
function scheduleForTask(t) {
  if (!t.due || t.done) return;
  const at = new Date(t.due);
  if (at.getTime() <= Date.now()) return;
  if (at.getTime() - Date.now() > 24 * 3600 * 1000) return;
  const handle = Notifications.schedule({
    when: at,
    title: `✅ ${t.title}`,
    body: t.notes || 'Task is due',
    tag: `task-${t.id}`,
  });
  if (handle) {
    scheduled.add(handle);
    t._scheduledHandle = handle;
  }
}
function rescheduleNotifications() {
  clearScheduled();
  for (const t of tasks) scheduleForTask(t);
}

/* ── Form ─────────────────────────────────────────────────────── */
function openTaskForm(existing) {
  const isEdit = !!existing;
  const t = existing || {
    id: uuid(),
    title: '',
    notes: '',
    category: categories[0]?.id || 'personal',
    due: '',
    starred: false,
    done: false,
    doneAt: null,
    createdAt: new Date().toISOString(),
    deletedAt: null,
  };

  const form = el('form', { class: 'form', onSubmit: (e) => { e.preventDefault(); saveBtn.click(); } }, [
    el('div', { class: 'field' }, [
      el('label', { class: 'field-label', text: 'Title' }),
      el('input', { class: 'input', type: 'text', name: 'title', required: true, value: t.title, placeholder: 'e.g. Submit project report' }),
    ]),
    el('div', { class: 'form-row' }, [
      el('div', { class: 'field' }, [
        el('label', { class: 'field-label', text: 'Due date' }),
        el('input', { class: 'input', type: 'date', name: 'dueDate', value: t.due ? DateUtil.toYMD(new Date(t.due)) : '' }),
      ]),
      el('div', { class: 'field' }, [
        el('label', { class: 'field-label', text: 'Time' }),
        el('input', { class: 'input', type: 'time', name: 'dueTime', value: t.due ? DateUtil.formatTime(new Date(t.due)) : '' }),
      ]),
    ]),
    el('div', { class: 'field' }, [
      el('label', { class: 'field-label', text: 'Category' }),
      (() => {
        const sel = el('select', { class: 'select', name: 'category' },
          categories.map(c => el('option', { value: c.id, text: c.name })));
        sel.value = t.category;
        return sel;
      })(),
    ]),
    el('div', { class: 'field' }, [
      el('label', { class: 'field-label', text: 'Notes' }),
      el('textarea', { class: 'textarea', name: 'notes', placeholder: 'Optional details…' }, [t.notes || '']),
    ]),
  ]);

  const cancel = el('button', { type: 'button', class: 'btn btn--ghost', text: 'Cancel', onClick: () => handle.close() });
  const delBtn = isEdit ? el('button', {
    type: 'button',
    class: 'btn btn--danger',
    text: 'Delete',
    onClick: async () => {
      const ok = await Modal.confirm({ title: 'Delete task?', message: 'Moves to recycle bin.', danger: true, confirmText: 'Delete' });
      if (!ok) return;
      const idx = tasks.findIndex(x => x.id === t.id);
      if (idx >= 0) {
        const [removed] = tasks.splice(idx, 1);
        RecycleBin.softDelete(TASKS_KEY, removed);
        save(); rescheduleNotifications(); handle.close();
        Toast.success('Moved to recycle bin');
        render();
      }
    },
  }) : null;
  const saveBtn = el('button', { type: 'button', class: 'btn btn--primary', text: isEdit ? 'Save' : 'Add task', onClick: () => {
    const data = new FormData(form);
    const title = data.get('title')?.toString().trim();
    if (!title) return;
    const dueDate = data.get('dueDate');
    const dueTime = data.get('dueTime');
    let due = null;
    if (dueDate) {
      const [hh, mm] = dueTime ? DateUtil.parseTime(dueTime) : [9, 0];
      due = new Date(dueDate);
      due.setHours(hh, mm, 0, 0);
    }
    const updated = {
      ...t,
      title,
      category: data.get('category'),
      notes: data.get('notes')?.toString() || '',
      due: due ? due.toISOString() : null,
    };
    if (isEdit) {
      const idx = tasks.findIndex(x => x.id === t.id);
      if (idx >= 0) tasks[idx] = updated;
      Toast.success('Task updated');
    } else {
      tasks.push(updated);
      Toast.success('Task added');
      if (due && due.getTime() > Date.now()) {
        Notifications.request();
      }
    }
    save(); rescheduleNotifications(); handle.close();
    render();
  }});

  const handle = Modal.open({
    title: isEdit ? 'Edit task' : 'New task',
    body: form,
    footer: [delBtn, cancel, saveBtn].filter(Boolean),
    size: 'md',
  });
}

/* ── Filtering ────────────────────────────────────────────────── */
function visibleTasks() {
  const now = new Date();
  return tasks.filter(t => {
    if (t.deletedAt) return false;
    if (search && !`${t.title} ${t.notes || ''}`.toLowerCase().includes(search.toLowerCase())) return false;
    if (activeCategory !== 'all' && t.category !== activeCategory) return false;
    if (filter === 'starred' && !t.starred) return false;
    if (filter === 'overdue') {
      if (t.done) return false;
      if (!t.due) return false;
      return new Date(t.due) < now;
    }
    if (filter === 'today') {
      if (t.done) return false;
      if (!t.due) return false;
      return DateUtil.isSameDay(new Date(t.due), now);
    }
    if (filter === 'week') {
      if (t.done) return false;
      if (!t.due) return false;
      const days = DateUtil.daysUntil(new Date(t.due), now);
      return days >= 0 && days <= 7;
    }
    return true;
  });
}

function categoryById(id) { return categories.find(c => c.id === id) || categories[0]; }

function duePill(t) {
  if (t.done) return el('span', { class: 'badge badge--success', text: 'Done' });
  if (!t.due) return el('span', { class: 'badge badge--muted', text: 'No due date' });
  const d = new Date(t.due);
  const days = DateUtil.daysUntil(d);
  if (days < 0)  return el('span', { class: 'badge badge--danger',  text: 'Overdue · ' + DateUtil.format(d, 'MMM D') });
  if (days === 0) return el('span', { class: 'badge badge--warning', text: 'Today · ' + DateUtil.formatTime(d) });
  if (days <= 3) return el('span', { class: 'badge badge--info',    text: DateUtil.relative(d) });
  return el('span', { class: 'badge badge--muted', text: DateUtil.relative(d) });
}

function renderTaskRow(t) {
  const cat = categoryById(t.category);
  const isSelected = selectedForBulk.has(t.id);
  return el('div', {
    class: `todo-row ${t.done ? 'is-done' : ''} ${selectedTaskId === t.id ? 'is-selected' : ''} ${isSelected ? 'is-bulk-selected' : ''}`,
    dataset: { id: t.id },
  }, [
    el('button', {
      class: `todo-row__check ${t.done ? 'is-checked' : ''}`,
      'aria-label': t.done ? 'Mark as not done' : 'Mark as done',
      onClick: (e) => {
        e.stopPropagation();
        t.done = !t.done;
        t.doneAt = t.done ? new Date().toISOString() : null;
        save(); rescheduleNotifications(); render();
      },
      html: t.done ? Icons.get('check') : '',
    }),
    el('button', {
      class: `todo-row__star ${t.starred ? 'is-starred' : ''}`,
      'aria-label': 'Toggle important',
      onClick: (e) => {
        e.stopPropagation();
        t.starred = !t.starred;
        save(); render();
      },
      html: Icons.get(t.starred ? 'starFill' : 'star'),
    }),
    el('div', { class: 'todo-row__body' }, [
      el('div', { class: 'todo-row__title', text: t.title }),
      el('div', { class: 'todo-row__meta' }, [
        cat ? el('span', { class: 'tag-row__cat', dataset: { cat: cat.id }, style: { background: cat.color + '22', color: cat.color }, text: cat.name }) : null,
        duePill(t),
        t.notes ? el('span', { class: 'todo-row__notes muted text-xs', text: t.notes.slice(0, 60) + (t.notes.length > 60 ? '…' : '') }) : null,
      ].filter(Boolean)),
    ]),
    el('div', { class: 'todo-row__actions' }, [
      el('button', { class: 'icon-btn', 'aria-label': 'Edit', onClick: () => openTaskForm(t), html: Icons.get('edit') }),
      el('button', {
        class: 'icon-btn', 'aria-label': 'Delete',
        onClick: async () => {
          const ok = await Modal.confirm({ title: 'Delete task?', message: 'Moves to recycle bin.', danger: true, confirmText: 'Delete' });
          if (!ok) return;
          const idx = tasks.findIndex(x => x.id === t.id);
          if (idx >= 0) {
            const [removed] = tasks.splice(idx, 1);
            RecycleBin.softDelete(TASKS_KEY, removed);
            save(); rescheduleNotifications();
            Toast.success('Moved to recycle bin');
            render();
          }
        },
        html: Icons.get('trash'),
      }),
    ]),
  ]);
}

function renderListGroup(tasksList) {
  if (!tasksList.length) {
    return el('div', { class: 'empty' }, [
      el('div', { class: 'empty__icon', html: Icons.get('check') }),
      el('div', { class: 'empty__title', text: filter === 'starred' ? 'No starred tasks' : 'Nothing here yet' }),
      el('div', { class: 'empty__msg', text: 'Press N or tap the + button to add a task.' }),
    ]);
  }
  const wrap = el('div', { class: 'todo-rows' });
  // Group by completion
  const pending = tasksList.filter(t => !t.done);
  const done    = tasksList.filter(t =>  t.done);
  if (pending.length) {
    wrap.appendChild(el('div', { class: 'todo-section__title', text: `Active (${pending.length})` }));
    pending.sort((a, b) => {
      if (a.starred !== b.starred) return a.starred ? -1 : 1;
      if (a.due && b.due) return new Date(a.due) - new Date(b.due);
      if (a.due) return -1;
      if (b.due) return 1;
      return 0;
    });
    wrap.appendChild(fragment(pending.map(renderTaskRow)));
  }
  if (done.length) {
    wrap.appendChild(el('div', { class: 'todo-section__title', text: `Completed (${done.length})` }));
    wrap.appendChild(fragment(done.map(renderTaskRow)));
  }
  return wrap;
}

function renderDaily(tasksList) {
  // Group by day (today, tomorrow, +N, or formatted date)
  const groups = new Map();
  for (const t of tasksList) {
    if (!t.due) continue;
    const key = DateUtil.relative(new Date(t.due));
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(t);
  }
  if (!groups.size) {
    return el('div', { class: 'empty' }, [
      el('div', { class: 'empty__icon', html: Icons.get('calendar') }),
      el('div', { class: 'empty__title', text: 'No dated tasks' }),
      el('div', { class: 'empty__msg', text: 'Add a due date to see tasks grouped by day.' }),
    ]);
  }
  const wrap = el('div', { class: 'todo-daily' });
  for (const [day, list] of groups) {
    wrap.appendChild(el('div', { class: 'todo-day-group' }, [
      el('h3', { class: 'todo-day-group__title', text: day }),
      el('div', { class: 'todo-rows' }, list.map(renderTaskRow)),
    ]));
  }
  return wrap;
}

function renderWeekly(tasksList) {
  const days = Array.from({ length: 7 }, (_, i) => DateUtil.addDays(DateUtil.startOfDay(new Date()), i));
  const wrap = el('div', { class: 'todo-weekly' });
  for (const d of days) {
    const dayTasks = tasksList.filter(t => t.due && DateUtil.isSameDay(new Date(t.due), d));
    wrap.appendChild(el('div', { class: 'todo-week-col' }, [
      el('div', { class: `todo-week-col__head ${DateUtil.isSameDay(d, new Date()) ? 'is-today' : ''}` }, [
        el('div', { class: 'todo-week-col__dow', text: DateUtil.format(d, 'ddd') }),
        el('div', { class: 'todo-week-col__date', text: String(d.getDate()) }),
      ]),
      el('div', { class: 'todo-week-col__body' },
        dayTasks.length
          ? dayTasks.map(renderTaskRow)
          : [el('div', { class: 'todo-week-col__empty faint text-xs', text: '—' })]
      ),
    ]));
  }
  return wrap;
}

function render() {
  const viewEl = $('#view .view-todo');
  if (!viewEl) return;
  const list = visibleTasks();

  const bodyEl = $('.todo-body', viewEl);
  if (bodyEl) {
    clear(bodyEl);
    if (view === 'list') bodyEl.appendChild(renderListGroup(list));
    else if (view === 'daily') bodyEl.appendChild(renderDaily(list));
    else bodyEl.appendChild(renderWeekly(list));
  }

  // Sidebar counts
  updateCategoryCounts();
  // Filter chip active states
  $$('.todo-filters .chip').forEach(c => c.classList.toggle('is-active', c.dataset.filter === filter));
  // Category chip active
  $$('.todo-cats .chip').forEach(c => c.classList.toggle('is-active', c.dataset.cat === activeCategory));
  // View segmented
  $$('.todo-view-segmented button').forEach(b => b.classList.toggle('is-active', b.dataset.view === view));
}

function updateCategoryCounts() {
  const root = $('#view .view-todo');
  if (!root) return;
  const all = root.querySelector('.todo-cats');
  if (!all) return;
  const counts = { all: 0 };
  for (const c of categories) counts[c.id] = 0;
  for (const t of tasks) {
    if (t.deletedAt) continue;
    counts.all++;
    counts[t.category] = (counts[t.category] || 0) + 1;
  }
  all.querySelectorAll('[data-count]').forEach(el => {
    const key = el.dataset.count;
    el.textContent = counts[key] || 0;
  });
}

function mountView(root) {
  load();
  applyTheme();

  // Cleanup when leaving
  const cleanup = () => {
    clearScheduled();
    document.documentElement.dataset.theme = '';
  };
  document.addEventListener('route:change', (e) => {
    if (e.detail.name !== 'todo') cleanup();
  }, { once: true });

  // Layout
  const catsSidebar = el('aside', { class: 'todo-cats' }, [
    el('div', { class: 'todo-cats__title', text: 'Categories' }),
    el('button', { class: 'chip is-active', dataset: { cat: 'all' }, onClick: () => { activeCategory = 'all'; save(); render(); } }, [
      el('span', { class: 'dot' }), 'All ',
      el('span', { dataset: { count: 'all' }, class: 'muted text-xs' }),
    ]),
    el('button', { class: 'chip', dataset: { cat: 'starred' }, onClick: () => { filter = 'starred'; save(); render(); } }, [
      el('span', { class: 'dot' }), 'Starred ',
      el('span', { dataset: { count: 'starred' }, class: 'muted text-xs' }),
    ]),
    ...categories.map(c => el('button', { class: 'chip', dataset: { cat: c.id }, onClick: () => { activeCategory = c.id; filter = 'all'; save(); render(); } }, [
      el('span', { class: 'dot', style: { background: c.color } }),
      c.name + ' ',
      el('span', { dataset: { count: c.id }, class: 'muted text-xs' }),
    ])),
    el('div', { class: 'divider' }),
    el('button', { class: 'btn btn--ghost btn--sm', onClick: addCategoryPrompt }, [
      el('span', { class: 'icon', html: Icons.get('plus') }),
      'New category',
    ]),
  ]);

  const main = el('section', { class: 'todo-main' }, [
    el('div', { class: 'view__header' }, [
      el('div', {}, [
        el('h1', { class: 'view__title', text: 'My Tasks' }),
        el('div', { class: 'view__subtitle', text: subtitle() }),
      ]),
      el('div', { class: 'view__actions' }, [
        (() => {
          const seg = el('div', { class: 'segmented todo-view-segmented' },
            ['list','daily','weekly'].map(v => el('button', {
              type: 'button', dataset: { view: v },
              text: v[0].toUpperCase() + v.slice(1),
              onClick: () => { view = v; save(); render(); },
            }))
          );
          return seg;
        })(),
        (() => {
          const sel = el('select', { class: 'select todo-theme', onChange: (e) => { themeMode = e.target.value; save(); applyTheme(); } }, [
            el('option', { value: 'light', text: 'Light' }),
            el('option', { value: 'dark',  text: 'Dark' }),
            el('option', { value: 'auto',  text: 'Follow device' }),
          ]);
          sel.value = themeMode;
          return sel;
        })(),
        el('button', { class: 'btn btn--primary', onClick: () => openTaskForm(null) }, [
          el('span', { class: 'icon', html: Icons.get('plus') }),
          'Add task',
        ]),
      ]),
    ]),
    el('div', { class: 'todo-filters' }, [
      el('div', { class: 'input-wrap' }, [
        el('span', { class: 'icon', html: Icons.get('search') }),
        el('input', {
          class: 'input', type: 'search', id: 'todo-search',
          placeholder: 'Search tasks…', value: search,
          onInput: (e) => { search = e.target.value; render(); },
        }),
      ]),
      el('div', { class: 'tag-row' },
        ['all','today','week','overdue','starred'].map(f => el('button', {
          class: 'chip', type: 'button', dataset: { filter: f },
          onClick: () => { filter = f; save(); render(); },
        }, [f[0].toUpperCase() + f.slice(1)]))
      ),
    ]),
    el('div', { class: 'todo-body' }),
  ]);

  root.appendChild(fragment([catsSidebar, main]));

  // FAB
  const fab = el('button', { class: 'fab', onClick: () => openTaskForm(null) }, [
    el('span', { class: 'icon', html: Icons.get('plus') }),
    el('span', { text: 'New task' }),
  ]);
  document.body.appendChild(fab);
  document.addEventListener('route:change', (e) => {
    if (e.detail.name !== 'todo' && fab.isConnected) fab.remove();
  }, { once: true });

  // Keyboard
  const k = (combo, fn) => Keyboard.register('todo', combo, fn);
  k('n', () => openTaskForm(null));
  k('/', () => document.getElementById('todo-search')?.focus());
  k('space', () => {
    if (!selectedTaskId) return;
    const t = tasks.find(x => x.id === selectedTaskId);
    if (t) { t.done = !t.done; t.doneAt = t.done ? new Date().toISOString() : null; save(); rescheduleNotifications(); render(); }
  });
  k('s', () => {
    if (!selectedTaskId) return;
    const t = tasks.find(x => x.id === selectedTaskId);
    if (t) { t.starred = !t.starred; save(); render(); }
  });
  k('arrowup', () => moveSelection(-1));
  k('arrowdown', () => moveSelection(1));
  k('delete', async () => {
    if (!selectedTaskId) return;
    const t = tasks.find(x => x.id === selectedTaskId);
    if (!t) return;
    const ok = await Modal.confirm({ title: 'Delete task?', message: 'Moves to recycle bin.', danger: true });
    if (!ok) return;
    const idx = tasks.findIndex(x => x.id === t.id);
    if (idx >= 0) {
      const [removed] = tasks.splice(idx, 1);
      RecycleBin.softDelete(TASKS_KEY, removed);
      save(); rescheduleNotifications(); render();
    }
  });
  Keyboard.optIn('todo', 'todo-search');

  rescheduleNotifications();
  render();
}

async function addCategoryPrompt() {
  const name = await Modal.prompt({ title: 'New category', label: 'Name', placeholder: 'e.g. Errands' });
  if (!name) return;
  const colors = ['#6366F1','#22D3EE','#10B981','#F59E0B','#EF4444','#8B5CF6','#EC4899','#14B8A6'];
  const color = colors[categories.length % colors.length];
  categories.push({ id: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'), name, color });
  save(); render();
}

function subtitle() {
  const visible = visibleTasks();
  return `${visible.length} task${visible.length === 1 ? '' : 's'}`;
}

function moveSelection(delta) {
  const list = visibleTasks();
  if (!list.length) return;
  const idx = Math.max(0, list.findIndex(t => t.id === selectedTaskId));
  const next = list[Math.min(list.length - 1, Math.max(0, idx + delta))];
  if (next) { selectedTaskId = next.id; render(); }
}

export const Todo = {
  mount: mountView,
};