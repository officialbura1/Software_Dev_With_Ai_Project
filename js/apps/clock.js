// js/apps/clock.js
// World clock (IST hero + city grid), stopwatch, timer, alarms.

import { el, $, $$, clear, fragment } from '../core/dom.js';
import { Storage } from '../core/storage.js';
import { DateUtil } from '../core/date.js';
import { Icons } from '../core/icons.js';
import { Modal } from '../core/modal.js';
import { Toast } from '../core/toast.js';
import { Notifications } from '../core/notifications.js';
import { uuid } from '../core/id.js';
import { Keyboard } from '../core/keyboard.js';
import { Sound } from '../core/sound.js';

const CITIES_KEY  = 'clock:cities';
const ALARMS_KEY  = 'clock:alarms';
const STOPW_KEY   = 'clock:stopwatch';
const TIMER_KEY   = 'clock:timer';
const TAB_KEY     = 'clock:tab';

let tab = 'world';            // 'world' | 'stopwatch' | 'timer' | 'alarm'
let cities = [];
let alarms = [];
let tickHandle = null;

let stopwatch = { state: 'idle', startedAt: 0, baseline: 0, laps: [] };
let timer     = { state: 'idle', endsAt: 0, remaining: 0, original: 0, intervalId: null };

let citiesData = [];

/* ── Data ──────────────────────────────────────────────────────── */
async function loadCities() {
  if (citiesData.length) return citiesData;
  try {
    const res = await fetch('data/cities.json');
    citiesData = await res.json();
  } catch { citiesData = []; }
  return citiesData;
}

function load() {
  cities = Storage.get(CITIES_KEY, ['Asia/Kolkata','America/New_York','Europe/London','Asia/Tokyo','Australia/Sydney','Asia/Dubai']);
  alarms = Storage.get(ALARMS_KEY, []);
  const sw = Storage.get(STOPW_KEY, null);
  if (sw) stopwatch = { state: 'idle', startedAt: 0, baseline: 0, laps: [], ...sw };
  const tm = Storage.get(TIMER_KEY, null);
  if (tm) timer = { state: 'idle', endsAt: 0, remaining: 0, original: 0, intervalId: null, ...tm };
  tab = Storage.get(TAB_KEY, 'world');
}

function save() {
  Storage.set(CITIES_KEY, cities);
  Storage.set(ALARMS_KEY, alarms);
  Storage.set(STOPW_KEY, stopwatch);
  Storage.set(TIMER_KEY, timer);
  Storage.set(TAB_KEY, tab);
}

function findCity(zone) { return citiesData.find(c => c.zone === zone); }

/* ── Ticker ────────────────────────────────────────────────────── */
function startTick() {
  if (tickHandle) return;
  tickHandle = setInterval(() => {
    if (tab === 'world' || tab === 'alarm') render();
    if (tab === 'stopwatch') renderStopwatch();
    if (tab === 'timer') renderTimer();
    checkAlarms();
  }, 1000);
}
function stopTick() {
  if (tickHandle) clearInterval(tickHandle);
  tickHandle = null;
}

/* ── World clock ───────────────────────────────────────────────── */
function renderWorld() {
  const root = $('#clock-world');
  if (!root) return;
  clear(root);
  const now = new Date();

  // Hero — IST
  const hero = el('div', { class: 'clock-hero' }, [
    el('div', { class: 'clock-hero__city' }, [
      el('div', { class: 'clock-hero__flag', text: '🇮🇳' }),
      el('div', { class: 'clock-hero__label' }, [
        el('div', { class: 'clock-hero__name', text: 'New Delhi' }),
        el('div', { class: 'clock-hero__country muted', text: 'India Standard Time · Asia/Kolkata' }),
      ]),
    ]),
    el('div', { class: 'clock-hero__time' }, DateUtil.formatInZone(now, 'Asia/Kolkata')),
    el('div', { class: 'clock-hero__date muted' }, DateUtil.formatInZone(now, 'Asia/Kolkata', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })),
    el('div', { class: 'clock-hero__add' }, [
      el('button', { class: 'btn btn--ghost btn--sm', onClick: addCityPrompt }, [
        el('span', { class: 'icon', html: Icons.get('plus') }),
        'Add city',
      ]),
    ]),
  ]);
  root.appendChild(hero);

  // Other cities
  const others = cities.filter(z => z !== 'Asia/Kolkata');
  if (!others.length) {
    root.appendChild(el('div', { class: 'empty', style: { padding: 'var(--space-8) var(--space-4)' } }, [
      el('div', { class: 'empty__icon', html: Icons.get('world') }),
      el('div', { class: 'empty__title', text: 'Track more time zones' }),
      el('div', { class: 'empty__msg', text: 'Add cities to see their current time alongside IST.' }),
    ]));
  } else {
    const grid = el('div', { class: 'clock-grid' });
    for (const zone of others) {
      const c = findCity(zone) || { zone, label: zone, flag: '🌐' };
      const card = el('div', { class: 'clock-card' }, [
        el('div', { class: 'clock-card__head' }, [
          el('div', { class: 'clock-card__flag', text: c.flag || '🌐' }),
          el('div', { class: 'clock-card__label' }, [
            el('div', { class: 'clock-card__city', text: c.label }),
            el('div', { class: 'clock-card__zone muted text-xs', text: DateUtil.zoneAbbr(zone) + ' · ' + zone }),
          ]),
          el('button', { class: 'icon-btn', 'aria-label': 'Remove', onClick: () => { cities = cities.filter(z => z !== zone); save(); render(); }, html: Icons.get('close') }),
        ]),
        el('div', { class: 'clock-card__time', text: DateUtil.formatInZone(now, zone) }),
        el('div', { class: 'clock-card__date muted text-xs', text: DateUtil.formatInZone(now, zone, { weekday: 'short', month: 'short', day: 'numeric' }) }),
      ]);
      grid.appendChild(card);
    }
    root.appendChild(grid);
  }
}

async function addCityPrompt() {
  await loadCities();
  if (!citiesData.length) { Toast.warn('City list unavailable'); return; }
  const options = citiesData
    .filter(c => !cities.includes(c.zone))
    .map(c => ({ value: c.zone, label: `${c.flag} ${c.label}` }));
  const wrap = el('div', { class: 'field' }, [
    el('label', { class: 'field-label', text: 'Pick a city' }),
    (() => {
      const sel = el('select', { class: 'select' }, options.map(o => el('option', { value: o.value, text: o.label })));
      return sel;
    })(),
  ]);
  let handle;
  const ok = el('button', { class: 'btn btn--primary', text: 'Add', onClick: () => {
    const z = wrap.querySelector('select').value;
    if (z && !cities.includes(z)) cities.push(z);
    save(); handle.close(); render();
  }});
  handle = Modal.open({ title: 'Add city', body: wrap, footer: [ok] });
}

/* ── Stopwatch ─────────────────────────────────────────────────── */
function elapsedMs() {
  if (stopwatch.state === 'running') return stopwatch.baseline + (Date.now() - stopwatch.startedAt);
  return stopwatch.baseline;
}

function renderStopwatch() {
  const root = $('#clock-stopwatch');
  if (!root) return;
  clear(root);
  const e = elapsedMs();
  root.appendChild(fragment([
    el('div', { class: 'sw-display' }, [
      el('div', { class: 'sw-display__time', text: DateUtil.ms(e, { showHours: 'auto', showCs: true }) }),
      el('div', { class: 'sw-display__sub muted', text: 'Stopwatch' }),
    ]),
    el('div', { class: 'sw-controls' }, [
      el('button', {
        class: `btn ${stopwatch.state === 'running' ? 'btn--ghost' : 'btn--primary'} btn--lg`,
        onClick: toggleStopwatch,
        html: el('span', { class: 'icon', html: Icons.get(stopwatch.state === 'running' ? 'pause' : 'play') }).outerHTML + ' ' + (stopwatch.state === 'running' ? 'Pause' : 'Start'),
      }),
      el('button', {
        class: 'btn btn--ghost btn--lg',
        onClick: addLap,
        disabled: stopwatch.state !== 'running',
      }, [el('span', { class: 'icon', html: Icons.get('flag') }), 'Lap']),
      el('button', {
        class: 'btn btn--ghost btn--lg',
        onClick: resetStopwatch,
        disabled: stopwatch.state === 'idle' && !stopwatch.baseline,
      }, [el('span', { class: 'icon', html: Icons.get('reset') }), 'Reset']),
    ]),
    el('div', { class: 'sw-laps' },
      stopwatch.laps.length
        ? [
            el('h3', { class: 'sw-laps__title', text: `Laps (${stopwatch.laps.length})` }),
            ...stopwatch.laps.map((lap, i) => el('div', { class: 'sw-lap' }, [
              el('div', { class: 'sw-lap__num', text: '#' + (i + 1) }),
              el('div', { class: 'sw-lap__time', text: DateUtil.ms(lap.split, { showHours: 'auto', showCs: true }) }),
              el('div', { class: 'sw-lap__total muted', text: DateUtil.ms(lap.total, { showHours: 'auto', showCs: true }) }),
            ])),
          ]
        : [el('div', { class: 'empty', style: { padding: 'var(--space-6)' } }, [
            el('div', { class: 'empty__icon', html: Icons.get('stopwatch') }),
            el('div', { class: 'empty__title', text: 'No laps yet' }),
            el('div', { class: 'empty__msg', text: 'Press Start and Lap to record times.' }),
          ])]
    ),
  ]));
}

function toggleStopwatch() {
  if (stopwatch.state === 'running') {
    stopwatch.baseline += Date.now() - stopwatch.startedAt;
    stopwatch.state = 'paused';
    stopwatch.startedAt = 0;
  } else {
    stopwatch.startedAt = Date.now();
    stopwatch.state = 'running';
  }
  save(); render();
}
function addLap() {
  const total = elapsedMs();
  const lastTotal = stopwatch.laps.length ? stopwatch.laps[stopwatch.laps.length - 1].total : 0;
  stopwatch.laps.unshift({ total, split: total - lastTotal, ts: new Date().toISOString() });
  Sound.tick();
  save(); render();
}
function resetStopwatch() {
  stopwatch = { state: 'idle', startedAt: 0, baseline: 0, laps: [] };
  save(); render();
}

/* ── Timer ─────────────────────────────────────────────────────── */
function renderTimer() {
  const root = $('#clock-timer');
  if (!root) return;
  clear(root);
  const now = Date.now();
  let remaining;
  if (timer.state === 'running') {
    remaining = Math.max(0, timer.endsAt - now);
    if (remaining === 0 && timer.state === 'running') finishTimer();
  } else {
    remaining = timer.remaining;
  }
  const total = timer.original || remaining || 0;
  const progress = total > 0 ? Math.max(0, Math.min(1, 1 - remaining / total)) : 0;
  const percent = Math.round(progress * 100);

  root.appendChild(fragment([
    el('div', { class: 'tm-display' }, [
      timer.state === 'idle' || timer.state === 'paused'
        ? el('div', { class: 'tm-display__inputs' }, [
            el('input', { class: 'input tm-input', type: 'number', min: 0, max: 23, id: 'tm-h', value: '0', placeholder: 'H' }),
            el('span', { class: 'tm-display__colon', text: ':' }),
            el('input', { class: 'input tm-input', type: 'number', min: 0, max: 59, id: 'tm-m', value: '5', placeholder: 'M' }),
            el('span', { class: 'tm-display__colon', text: ':' }),
            el('input', { class: 'input tm-input', type: 'number', min: 0, max: 59, id: 'tm-s', value: '0', placeholder: 'S' }),
          ])
        : el('div', { class: 'tm-display__time', text: DateUtil.ms(remaining, { showHours: 'auto' }) }),
      el('div', { class: 'tm-progress' }, [
        el('div', { class: 'tm-progress__bar', style: { width: percent + '%' } }),
      ]),
      el('div', { class: 'tm-display__sub muted', text:
        timer.state === 'running' ? 'Running…' :
        timer.state === 'paused' ? 'Paused' : 'Set a time to begin',
      }),
    ]),
    el('div', { class: 'tm-controls' }, [
      el('button', {
        class: `btn ${timer.state === 'running' ? 'btn--ghost' : 'btn--primary'} btn--lg`,
        onClick: toggleTimer,
      }, [
        el('span', { class: 'icon', html: Icons.get(timer.state === 'running' ? 'pause' : 'play') }),
        timer.state === 'running' ? 'Pause' : (timer.state === 'paused' ? 'Resume' : 'Start'),
      ]),
      el('button', { class: 'btn btn--ghost btn--lg', onClick: resetTimer }, [
        el('span', { class: 'icon', html: Icons.get('reset') }),
        'Reset',
      ]),
    ]),
  ]));
}

function toggleTimer() {
  if (timer.state === 'running') {
    timer.remaining = Math.max(0, timer.endsAt - Date.now());
    timer.state = 'paused';
    timer.endsAt = 0;
  } else {
    let ms;
    if (timer.state === 'paused') {
      ms = timer.remaining;
    } else {
      const h = Number(document.getElementById('tm-h')?.value || 0);
      const m = Number(document.getElementById('tm-m')?.value || 0);
      const s = Number(document.getElementById('tm-s')?.value || 0);
      ms = (h * 3600 + m * 60 + s) * 1000;
      if (ms <= 0) { Toast.warn('Set a duration'); return; }
      timer.original = ms;
    }
    timer.endsAt = Date.now() + ms;
    timer.remaining = ms;
    timer.state = 'running';
    Notifications.request();
  }
  save(); render();
}

function resetTimer() {
  if (timer.intervalId) clearInterval(timer.intervalId);
  timer = { state: 'idle', endsAt: 0, remaining: 0, original: 0, intervalId: null };
  save(); render();
}

function finishTimer() {
  timer.state = 'finished';
  timer.remaining = 0;
  Sound.alarm();
  Notifications.fire({
    title: '⏰ Timer done!',
    body: 'Your countdown has reached zero.',
    tag: 'timer-finished',
    requireInteraction: true,
  });
  Toast.success('Timer finished!', 'Time’s up');
  save();
  setTimeout(() => {
    if (timer.state === 'finished') resetTimer();
  }, 4000);
}

/* ── Alarms ────────────────────────────────────────────────────── */
const alarmScheduled = new Set();
function checkAlarms() {
  if (tab !== 'alarm' && tab !== 'world') return;
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const current = `${hh}:${mm}`;
  const todayYmd = DateUtil.toYMD(now);
  for (const a of alarms) {
    if (!a.enabled) continue;
    if (a.time !== current) continue;
    if (a.lastFiredDate === todayYmd) continue;
    const day = now.getDay(); // 0=Sun
    const isWeekend = day === 0 || day === 6;
    if (a.repeat === 'weekdays' && isWeekend) continue;
    if (a.repeat === 'weekends' && !isWeekend) continue;
    if (Array.isArray(a.days) && a.days.length && !a.days.includes(day)) continue;
    a.lastFiredDate = todayYmd;
    Sound.alarm();
    Notifications.fire({
      title: `⏰ ${a.label || 'Alarm'}`,
      body: `It's ${a.time}${a.repeat !== 'once' ? ' · ' + a.repeat : ''}`,
      tag: `alarm-${a.id}`,
      requireInteraction: true,
    });
  }
  save();
  if (tab === 'alarm') renderAlarms();
}

function renderAlarms() {
  const root = $('#clock-alarm');
  if (!root) return;
  clear(root);
  if (!alarms.length) {
    root.appendChild(el('div', { class: 'empty' }, [
      el('div', { class: 'empty__icon', html: Icons.get('bell') }),
      el('div', { class: 'empty__title', text: 'No alarms yet' }),
      el('div', { class: 'empty__msg', text: 'Set alarms to get notified at specific times.' }),
    ]));
  } else {
    const list = el('div', { class: 'alarm-list' });
    for (const a of alarms) {
      const row = el('div', { class: `alarm-row ${a.enabled ? '' : 'is-off'}` }, [
        el('div', { class: 'alarm-row__time', text: a.time }),
        el('div', { class: 'alarm-row__body' }, [
          el('div', { class: 'alarm-row__label', text: a.label || 'Alarm' }),
          el('div', { class: 'alarm-row__repeat muted text-xs', text:
            a.repeat === 'once' ? 'Once' :
            a.repeat === 'daily' ? 'Daily' :
            a.repeat === 'weekdays' ? 'Weekdays' :
            a.repeat === 'weekends' ? 'Weekends' :
            (a.days?.length ? a.days.map(d => DateUtil.DAYS_SHORT[d]).join(' ') : 'Custom')
          }),
        ]),
        (() => {
          const sw = el('label', { class: 'switch' }, [
            el('input', { type: 'checkbox', checked: a.enabled, onChange: (e) => { a.enabled = e.target.checked; save(); renderAlarms(); } }),
            el('span', { class: 'switch__slider' }),
          ]);
          return sw;
        })(),
        el('button', { class: 'icon-btn', 'aria-label': 'Edit', onClick: () => openAlarmForm(a), html: Icons.get('edit') }),
        el('button', { class: 'icon-btn', 'aria-label': 'Delete', onClick: async () => {
          const ok = await Modal.confirm({ title: 'Delete alarm?', message: 'This will permanently delete the alarm.', danger: true });
          if (!ok) return;
          alarms = alarms.filter(x => x.id !== a.id);
          save(); renderAlarms();
        }, html: Icons.get('trash') }),
      ]);
      list.appendChild(row);
    }
    root.appendChild(list);
  }
}

function openAlarmForm(existing) {
  const isEdit = !!existing;
  const a = existing || { id: uuid(), time: '07:30', label: '', repeat: 'daily', enabled: true, lastFiredDate: null, days: [] };
  const form = el('form', { class: 'form', onSubmit: (e) => { e.preventDefault(); saveBtn.click(); } }, [
    el('div', { class: 'form-row' }, [
      el('div', { class: 'field' }, [
        el('label', { class: 'field-label', text: 'Time' }),
        el('input', { class: 'input', type: 'time', name: 'time', value: a.time, required: true }),
      ]),
      el('div', { class: 'field' }, [
        el('label', { class: 'field-label', text: 'Repeat' }),
        (() => {
          const sel = el('select', { class: 'select', name: 'repeat' }, [
            el('option', { value: 'once', text: 'Once' }),
            el('option', { value: 'daily', text: 'Daily' }),
            el('option', { value: 'weekdays', text: 'Weekdays' }),
            el('option', { value: 'weekends', text: 'Weekends' }),
            el('option', { value: 'custom', text: 'Custom days' }),
          ]);
          sel.value = a.repeat;
          return sel;
        })(),
      ]),
    ]),
    el('div', { class: 'field' }, [
      el('label', { class: 'field-label', text: 'Label (optional)' }),
      el('input', { class: 'input', type: 'text', name: 'label', value: a.label, placeholder: 'e.g. Morning workout' }),
    ]),
  ]);
  const cancel = el('button', { type: 'button', class: 'btn btn--ghost', text: 'Cancel', onClick: () => handle.close() });
  const saveBtn = el('button', { type: 'button', class: 'btn btn--primary', text: isEdit ? 'Save' : 'Add alarm', onClick: () => {
    const data = new FormData(form);
    const updated = {
      ...a,
      time: data.get('time'),
      label: data.get('label')?.toString() || '',
      repeat: data.get('repeat'),
    };
    if (isEdit) {
      const idx = alarms.findIndex(x => x.id === a.id);
      if (idx >= 0) alarms[idx] = updated;
    } else {
      alarms.push(updated);
      Notifications.request();
    }
    save(); renderAlarms();
    Toast.success(isEdit ? 'Alarm updated' : 'Alarm added');
    handle.close();
  } });
  const handle = Modal.open({ title: isEdit ? 'Edit alarm' : 'New alarm', body: form, footer: [cancel, saveBtn] });
}

/* ── Tabs / render ────────────────────────────────────────────── */
function setTab(t) {
  tab = t;
  save();
  $$('.clock-tab').forEach(b => b.classList.toggle('is-active', b.dataset.tab === t));
  for (const id of ['clock-world','clock-stopwatch','clock-timer','clock-alarm']) {
    const elx = document.getElementById(id);
    if (!elx) continue;
    elx.style.display = (id === `clock-${t}`) ? '' : 'none';
  }
  render();
}

function render() {
  if (tab === 'world') renderWorld();
  else if (tab === 'stopwatch') renderStopwatch();
  else if (tab === 'timer') renderTimer();
  else if (tab === 'alarm') renderAlarms();
}

function mountView(root) {
  load();
  loadCities();

  // Cleanup on leave
  const cleanup = () => stopTick();
  document.addEventListener('route:change', (e) => { if (e.detail.name !== 'clock') cleanup(); }, { once: true });

  root.appendChild(fragment([
    el('div', { class: 'view__header' }, [
      el('div', {}, [
        el('h1', { class: 'view__title', text: 'Clock' }),
        el('div', { class: 'view__subtitle', text: 'World time · stopwatch · timer · alarms' }),
      ]),
      el('div', { class: 'view__actions' }, [
        el('div', { class: 'segmented' }, [
          el('button', { class: 'clock-tab', type: 'button', dataset: { tab: 'world' },     text: 'World',     onClick: () => setTab('world') }),
          el('button', { class: 'clock-tab', type: 'button', dataset: { tab: 'stopwatch' }, text: 'Stopwatch', onClick: () => setTab('stopwatch') }),
          el('button', { class: 'clock-tab', type: 'button', dataset: { tab: 'timer' },     text: 'Timer',     onClick: () => setTab('timer') }),
          el('button', { class: 'clock-tab', type: 'button', dataset: { tab: 'alarm' },     text: 'Alarms',    onClick: () => setTab('alarm') }),
        ]),
        el('button', { class: 'btn btn--primary', onClick: () => openAlarmForm(null) }, [
          el('span', { class: 'icon', html: Icons.get('plus') }),
          'Add alarm',
        ]),
      ]),
    ]),
    el('div', { id: 'clock-world' }),
    el('div', { id: 'clock-stopwatch', style: 'display:none' }),
    el('div', { id: 'clock-timer',     style: 'display:none' }),
    el('div', { id: 'clock-alarm',     style: 'display:none' }),
  ]));

  setTab(tab);
  startTick();

  // Keyboard
  const k = (combo, fn) => Keyboard.register('clock', combo, fn);
  k('r', () => {
    if (tab === 'stopwatch') resetStopwatch();
    else if (tab === 'timer') resetTimer();
  });
  k('l', () => { if (tab === 'stopwatch') addLap(); });
  k('n', () => { if (tab === 'alarm') openAlarmForm(null); });
  k(' ', () => {
    if (tab === 'stopwatch') toggleStopwatch();
    else if (tab === 'timer') toggleTimer();
  });
}

export const Clock = {
  mount: mountView,
};