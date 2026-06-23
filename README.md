# Dashboard — Calendar · To-Do · Calculator · Translator · Clock

A self-contained productivity dashboard. Pure HTML, CSS, and JavaScript — no frameworks, no build step, no `npm install`. Open `index.html` in any modern browser.

## Apps

| App         | Features |
| ----------- | -------- |
| **Calendar** | Month / Week / Day views · event & reminder CRUD · pre-loaded Indian holidays (2024–2027) · year+month navigation · search · recycle bin (30 days) · browser notifications |
| **To-Do**   | Task management · categories · star / important · due dates with notifications · List / Daily / Weekly views · filters (Today / Week / Overdue / Starred) · search · Light / Dark / Follow-device theme · recycle bin |
| **Calculator** | Basic ↔ Scientific modes (sin, cos, tan, log, ln, √, x², xʸ, n!, π, e) · DEG / RAD · history (persistent) · keyboard input |
| **Translator** | 40+ languages · auto-detect · swap · text-to-speech · copy · translation history · public Google Translate endpoint |
| **Clock**   | World clock with **New Delhi (IST) hero** · city grid · stopwatch with laps · countdown timer · alarms (one-time / daily / weekdays / weekends) · browser notifications + sound |

## Run

```bash
# Just open the file
open index.html          # macOS
start index.html         # Windows
xdg-open index.html      # Linux

# Or, if you prefer a local server (recommended for the translator):
python3 -m http.server 8000
# → visit http://localhost:8000
```

## Features

- **Responsive**: desktop sidebar, mobile bottom-nav. Reflows at 1024 / 768 / 480 px.
- **Dark / Light theme** with `auto` (follows OS) and persisted preference.
- **Glassmorphism** on header & sidebar (with `@supports` fallback).
- **Animations** on every view transition, list add/remove, modal entry, FAB.
- **Keyboard shortcuts** — see `?` in the header for the cheat-sheet.
- **Recycle bin** — 30-day retention, automatic purge, shared by Calendar and To-Do.
- **Browser Notifications API** for reminders, alarms, and timer (with in-app fallback).
- **Sound** via WebAudio synthesis (no audio files needed) — alarms, ticks, errors.
- **localStorage** persistence for everything. No server, no accounts.
- **Reduced-motion** support (`prefers-reduced-motion: reduce`).

## Keyboard shortcuts

| Key | Action |
| --- | ------ |
| `1` … `5` | Switch to app 1–5 |
| `6` | Open Recycle Bin |
| `Ctrl/Cmd + K` | Focus global search |
| `Ctrl/Cmd + /` | Toggle theme |
| `?` | Show shortcut cheat-sheet |
| `Esc` | Close modal |
| `g c` / `g t` / `g a` / `g l` / `g k` / `g b` | Go to (c)alendar / (t)odo / (a)calculator / trans(l)ator / cloc(k) / (b)in |

Per-app: see the cheat-sheet.

## Debug helpers

Append `?debug=1` to the URL to unlock console helpers:

- `__dump()` — `console.table` of all `localStorage` keys
- `__purge()` — manually run the recycle-bin TTL sweep
- `__clear()` — wipe all `localStorage` (with confirm)
- `__recalc()` — reload the page

## Architecture

```
index.html
├── css/
│   ├── tokens.css        Design tokens (light + dark)
│   ├── base.css          Reset, typography, focus
│   ├── animations.css    @keyframes, reduced-motion
│   ├── components.css    Buttons, inputs, modals, toasts
│   ├── shell.css         Sidebar, header, bottom-nav
│   └── apps/             Per-app styles
├── js/
│   ├── main.js           Boot
│   ├── router.js         Hash router with animations
│   ├── core/             Shared utilities
│   ├── shell/            Sidebar, bottom-nav, header
│   └── apps/             Calendar, Todo, Calculator, Translator, Clock, RecycleBin
├── data/
│   ├── holidays.json     Indian holidays 2024–2027
│   ├── cities.json       World clock cities
│   └── languages.json    Translator languages
└── assets/
    └── favicon.svg
```

## Verification checklist

### Cross-app
1. Reload — hash route, theme, last view all persist.
2. Resize browser across 320 / 768 / 1024 / 1440 px — layout reflows, bottom-nav appears < 768.
3. Open DevTools → `localStorage` shows `calendar:events`, `todo:tasks`, etc.
4. DevTools → Rendering → "Emulate CSS prefers-reduced-motion: reduce" → animations clamp.
5. Tab away for 30 s and back — clocks update correctly.

### Per-app

**Calendar**
- Navigate months / years; today is highlighted.
- Create reminder for `now + 1 min` → notification fires.
- Search "diwali" finds the holiday.
- Delete event → appears in Recycle Bin; restore works; 30-day TTL purges.

**To-Do**
- Create task with due 1 min from now → notification fires.
- Toggle star → Starred filter shows it.
- Set theme to "Follow device" → toggle OS dark mode → app matches.
- Mark done → moves to Completed section.

**Calculator**
- `(2+3)*4 =` → 20
- `sin(30)` in DEG → 0.5
- `2+3=` then `*4=` → chains correctly
- History persists across reload

**Translator**
- `Hello` EN → ES yields `Hola`
- Swap languages; copy output
- Text-to-speech speaks both sides
- Auto-detect on French input

**Clock**
- IST hero updates each second
- City cards show correct offsets
- Stopwatch: laps monotonic
- Timer: 0:05 → 0 → beep + notification + banner
- Alarm at `now + 1 min` fires

## Notes

- The translator uses Google's public, no-auth `translate.googleapis.com/translate_a/single` endpoint. CORS-enabled but unofficial — if it breaks, an "unavailable" toast appears.
- All data lives in `localStorage`. Clear it from DevTools → Application → Storage to reset.
- No tracking, no external requests except the translator + Google Fonts.
