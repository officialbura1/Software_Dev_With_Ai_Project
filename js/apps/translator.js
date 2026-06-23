// js/apps/translator.js
// Translator — Google Translate-style two-pane layout with swap, TTS, copy.

import { el, $, $$, clear, fragment } from '../core/dom.js';
import { Storage } from '../core/storage.js';
import { Icons } from '../core/icons.js';
import { Toast } from '../core/toast.js';
import { Modal } from '../core/modal.js';
import { Keyboard } from '../core/keyboard.js';

const PREFS_KEY = 'translator:prefs';
const HISTORY_KEY = 'translator:history';

let prefs = { source: 'auto', target: 'en', autoDetect: true };
let history = [];
let sourceText = '';
let targetText = '';
let loading = false;
let lastError = null;
let languages = [];

async function loadLanguages() {
  if (languages.length) return languages;
  try {
    const res = await fetch('data/languages.json');
    languages = await res.json();
  } catch { languages = []; }
  return languages;
}

function load() {
  prefs = { ...prefs, ...Storage.get(PREFS_KEY, {}) };
  history = Storage.get(HISTORY_KEY, []);
}

function save() { Storage.set(PREFS_KEY, prefs); }

function findLang(code) { return languages.find(l => l.code === code); }

async function translate() {
  if (!sourceText.trim()) { targetText = ''; renderOutput(); return; }
  if (prefs.autoDetect) prefs.source = 'auto';
  loading = true;
  lastError = null;
  renderOutput();
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${encodeURIComponent(prefs.source)}&tl=${encodeURIComponent(prefs.target)}&dt=t&q=${encodeURIComponent(sourceText)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Network ' + res.status);
    const data = await res.json();
    let out = '';
    if (Array.isArray(data) && Array.isArray(data[0])) {
      for (const seg of data[0]) if (Array.isArray(seg) && seg[0]) out += seg[0];
    }
    targetText = out;
    // Persist history
    history = [{ source: sourceText, target: out, src: prefs.source, tgt: prefs.target, ts: new Date().toISOString() }, ...history].slice(0, 30);
    Storage.set(HISTORY_KEY, history);
  } catch (e) {
    lastError = 'Translation unavailable. Check your connection.';
    targetText = '';
  } finally {
    loading = false;
    renderOutput();
  }
}

function tts(text, lang) {
  if (!text || !('speechSynthesis' in window)) {
    Toast.warn('Text-to-speech not available');
    return;
  }
  try {
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    if (lang) utt.lang = lang;
    window.speechSynthesis.speak(utt);
  } catch {
    Toast.warn('Could not play audio');
  }
}

function copy(text) {
  if (!text) return;
  navigator.clipboard?.writeText(text).then(
    () => Toast.success('Copied to clipboard'),
    () => Toast.warn('Copy failed'),
  );
}

function swap() {
  if (prefs.source === 'auto') {
    Toast.info('Source is auto-detect; pick a language to swap.');
    return;
  }
  const oldSrc = prefs.source;
  prefs.source = prefs.target;
  prefs.target = oldSrc;
  const oldSrcText = sourceText;
  sourceText = targetText;
  targetText = oldSrcText;
  save();
  render();
  if (sourceText) translate();
}

function languageDropdown(value, onChange, includeAuto = false) {
  const sel = el('select', { class: 'select tr-lang-select' });
  if (includeAuto) {
    sel.appendChild(el('option', { value: 'auto', text: '🔍 Detect language' }));
  }
  for (const l of languages) {
    sel.appendChild(el('option', { value: l.code, text: l.name }));
  }
  sel.value = value;
  sel.addEventListener('change', () => onChange(sel.value));
  return sel;
}

function renderOutput() {
  const root = $('#view .view-translator');
  if (!root) return;
  const out = root.querySelector('.tr-output__text');
  const placeholder = root.querySelector('.tr-output__placeholder');
  const status = root.querySelector('.tr-output__status');
  if (!out) return;
  out.textContent = targetText;
  if (loading) {
    if (status) status.innerHTML = '<span class="spinner"></span> Translating…';
    if (placeholder) placeholder.style.display = 'none';
  } else if (lastError) {
    if (status) status.textContent = lastError;
    if (placeholder) { placeholder.style.display = ''; placeholder.textContent = 'Translation failed'; }
  } else if (!targetText) {
    if (status) status.textContent = '';
    if (placeholder) { placeholder.style.display = ''; placeholder.textContent = 'Translation appears here'; }
  } else {
    if (status) status.textContent = '';
    if (placeholder) placeholder.style.display = 'none';
  }
  // Update char count
  const cc = root.querySelector('.tr-input__count');
  if (cc) cc.textContent = `${sourceText.length} / 5000`;
}

function render() {
  const root = $('#view .view-translator');
  if (!root) return;
  clear(root);
  root.appendChild(fragment([
    el('div', { class: 'view__header' }, [
      el('div', {}, [
        el('h1', { class: 'view__title', text: 'Translator' }),
        el('div', { class: 'view__subtitle', text: 'Translate text between languages with voice support' }),
      ]),
      el('div', { class: 'view__actions' }, [
        el('button', { class: 'btn btn--ghost btn--sm', onClick: () => {
          if (!history.length) return;
          Modal.open({
            title: 'Translation history',
            body: el('div', { class: 'tr-history' },
              history.length
                ? history.map(h => el('div', { class: 'tr-history__row' }, [
                    el('div', { class: 'tr-history__src muted text-xs', text: `${h.src} → ${h.tgt}` }),
                    el('div', { class: 'tr-history__source', text: h.source }),
                    el('div', { class: 'tr-history__target', text: h.target }),
                    el('div', { class: 'tr-history__actions' }, [
                      el('button', { class: 'icon-btn', 'aria-label': 'Reuse', onClick: () => {
                        sourceText = h.source; targetText = h.target; prefs.source = h.src; prefs.target = h.tgt; save(); render();
                      }, html: Icons.get('arrowLeft') }),
                    ]),
                  ]))
                : [el('div', { class: 'empty' }, 'No translations yet.')]
            ),
            size: 'lg',
          });
        }}, [
          el('span', { class: 'icon', html: Icons.get('history') }),
          'History',
        ]),
      ]),
    ]),
    el('div', { class: 'tr-grid' }, [
      el('div', { class: 'tr-pane tr-input' }, [
        el('div', { class: 'tr-pane__head' }, [
          el('div', {}, [
            el('label', { class: 'field-label', text: 'From' }),
            (() => {
              const sel = languageDropdown(prefs.autoDetect ? 'auto' : prefs.source, (v) => {
                if (v === 'auto') { prefs.autoDetect = true; prefs.source = 'auto'; }
                else { prefs.autoDetect = false; prefs.source = v; }
                save();
              }, true);
              return sel;
            })(),
          ]),
          el('div', { class: 'tr-pane__actions' }, [
            el('button', { class: 'icon-btn', 'aria-label': 'Speak', onClick: () => tts(sourceText, prefs.source === 'auto' ? 'en' : prefs.source), html: Icons.get('volume') }),
            el('button', { class: 'icon-btn', 'aria-label': 'Clear', onClick: () => { sourceText = ''; targetText = ''; renderOutput(); }, html: Icons.get('close') }),
          ]),
        ]),
        el('textarea', {
          class: 'tr-pane__textarea',
          placeholder: 'Enter text to translate…',
          value: sourceText,
          maxlength: 5000,
          onInput: (e) => { sourceText = e.target.value; renderOutput(); debounceTranslate(); },
        }),
        el('div', { class: 'tr-pane__foot' }, [
          el('span', { class: 'tr-input__count muted text-xs', text: '0 / 5000' }),
          el('button', { class: 'btn btn--primary btn--sm', onClick: translate, disabled: !sourceText.trim() }, [
            el('span', { class: 'icon', html: Icons.get('globe') }),
            'Translate',
          ]),
        ]),
      ]),
      el('div', { class: 'tr-swap-col' }, [
        el('button', { class: 'tr-swap', onClick: swap, 'aria-label': 'Swap languages', html: Icons.get('swap') }),
      ]),
      el('div', { class: 'tr-pane tr-output' }, [
        el('div', { class: 'tr-pane__head' }, [
          el('div', {}, [
            el('label', { class: 'field-label', text: 'To' }),
            languageDropdown(prefs.target, (v) => { prefs.target = v; save(); if (sourceText) translate(); }),
          ]),
          el('div', { class: 'tr-pane__actions' }, [
            el('button', { class: 'icon-btn', 'aria-label': 'Speak', onClick: () => tts(targetText, prefs.target), html: Icons.get('volume') }),
            el('button', { class: 'icon-btn', 'aria-label': 'Copy', onClick: () => copy(targetText), html: Icons.get('copy') }),
          ]),
        ]),
        el('div', { class: 'tr-pane__output' }, [
          el('div', { class: 'tr-output__placeholder', text: 'Translation appears here' }),
          el('div', { class: 'tr-output__text' }),
          el('div', { class: 'tr-output__status muted text-xs' }),
        ]),
      ]),
    ]),
  ]));
  renderOutput();
}

let translateDebounce = null;
function debounceTranslate() {
  if (translateDebounce) clearTimeout(translateDebounce);
  translateDebounce = setTimeout(() => {
    if (sourceText.trim().length > 0) translate();
  }, 500);
}

function mountView(root) {
  load();
  loadLanguages();
  render();

  // Keyboard
  const k = (combo, fn) => Keyboard.register('translator', combo, fn);
  k('ctrl+enter', () => translate());
  k('ctrl+shift+s', swap);
  k('ctrl+shift+c', () => copy(targetText));
}

export const Translator = {
  mount: mountView,
};