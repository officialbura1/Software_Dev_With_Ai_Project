// js/core/sound.js
// Audio via WebAudio (oscillator). Tones for alarms, timers, ticks. Respects
// a persisted mute preference.

import { Storage } from './storage.js';

const MUTE_KEY = 'prefs:soundMuted';

let ctx = null;
let muted = false;

function getCtx() {
  if (ctx) return ctx;
  const C = window.AudioContext || window.webkitAudioContext;
  if (!C) return null;
  try {
    ctx = new C();
    return ctx;
  } catch { return null; }
}

function beep({ freq = 880, duration = 0.18, volume = 0.18, type = 'sine' } = {}) {
  if (muted) return;
  const c = getCtx();
  if (!c) return;
  if (c.state === 'suspended') c.resume().catch(() => {});

  const t = c.currentTime;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(volume, t + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
  osc.connect(gain).connect(c.destination);
  osc.start(t);
  osc.stop(t + duration + 0.02);
}

export const Sound = {
  init() {
    muted = !!Storage.get(MUTE_KEY, false);
    return this;
  },

  isMuted() { return muted; },

  setMuted(v) {
    muted = !!v;
    Storage.set(MUTE_KEY, muted);
  },

  beep,
  tick()    { beep({ freq: 1200, duration: 0.05, volume: 0.10 }); },
  alarm()   {
    beep({ freq: 880, duration: 0.20, volume: 0.20 });
    setTimeout(() => beep({ freq: 880, duration: 0.20, volume: 0.20 }), 280);
    setTimeout(() => beep({ freq: 880, duration: 0.20, volume: 0.20 }), 560);
  },
  done()    {
    beep({ freq: 660, duration: 0.10, volume: 0.18 });
    setTimeout(() => beep({ freq: 880, duration: 0.18, volume: 0.18 }), 130);
  },
  error()   { beep({ freq: 220, duration: 0.30, volume: 0.20, type: 'square' }); },
};