// js/apps/calculator.js
// Calculator with a tiny recursive-descent parser, basic/scientific modes,
// history, and keyboard input. No eval().

import { el, $, $$, clear, fragment, mount } from '../core/dom.js';
import { Storage } from '../core/storage.js';
import { Icons } from '../core/icons.js';
import { Toast } from '../core/toast.js';
import { uuid } from '../core/id.js';
import { Keyboard } from '../core/keyboard.js';

const HIST_KEY = 'calculator:history';
const MODE_KEY = 'calculator:mode';
const ANGLE_KEY= 'calculator:angle';

let history = [];
let mode = 'basic';   // 'basic' | 'scientific'
let angle = 'deg';    // 'deg' | 'rad'
let expression = '';
let result = '';
let displayEl, exprEl, resultEl, historyEl;

/* ── Lexer & parser (no eval) ───────────────────────────────────── */
function tokenize(s) {
  const tokens = [];
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (/\s/.test(c)) { i++; continue; }
    if (/[0-9.]/.test(c)) {
      let j = i;
      while (j < s.length && /[0-9.]/.test(s[j])) j++;
      const num = parseFloat(s.slice(i, j));
      if (Number.isNaN(num)) throw new Error('Invalid number');
      tokens.push({ type: 'num', value: num });
      i = j; continue;
    }
    if (/[+\-*/^%()]/.test(c)) {
      tokens.push({ type: 'op', value: c });
      i++; continue;
    }
    if (/[a-z]/i.test(c)) {
      // Identifier (function name)
      let j = i;
      while (j < s.length && /[a-z]/i.test(s[j])) j++;
      tokens.push({ type: 'fn', value: s.slice(i, j).toLowerCase() });
      i = j; continue;
    }
    if (c === 'π') { tokens.push({ type: 'num', value: Math.PI }); i++; continue; }
    if (c === 'e') {
      // 'e' alone is Euler; part of identifier handled above
      if (i + 1 >= s.length || /[^a-z]/i.test(s[i+1])) {
        tokens.push({ type: 'num', value: Math.E });
        i++; continue;
      }
    }
    throw new Error('Unexpected: ' + c);
  }
  return tokens;
}

// Grammar:
//   expr   → term ((+|-) term)*
//   term   → factor ((*|/|%) factor)*
//   factor → power
//   power  → unary (^ unary)*    (right-assoc)
//   unary  → (-|+) unary | primary
//   primary→ number | fn ( expr ) | ( expr ) | constant

class Parser {
  constructor(tokens) { this.tokens = tokens; this.pos = 0; }
  peek(o = 0) { return this.tokens[this.pos + o]; }
  eat(type, value) {
    const t = this.peek();
    if (!t || t.type !== type || (value !== undefined && t.value !== value)) return null;
    this.pos++;
    return t;
  }
  parse() {
    const result = this.expr();
    if (this.pos < this.tokens.length) throw new Error('Unexpected: ' + this.peek().value);
    return result;
  }
  expr() {
    let left = this.term();
    while (this.peek() && this.peek().type === 'op' && (this.peek().value === '+' || this.peek().value === '-')) {
      const op = this.eat('op').value;
      const right = this.term();
      left = { op, left, right };
    }
    return left;
  }
  term() {
    let left = this.factor();
    while (this.peek() && this.peek().type === 'op' && (this.peek().value === '*' || this.peek().value === '/' || this.peek().value === '%')) {
      const op = this.eat('op').value;
      const right = this.factor();
      left = { op, left, right };
    }
    return left;
  }
  factor() { return this.power(); }
  power() {
    const left = this.unary();
    if (this.peek() && this.peek().type === 'op' && this.peek().value === '^') {
      this.eat('op');
      const right = this.unary();
      return { op: '^', left, right };
    }
    return left;
  }
  unary() {
    if (this.peek() && this.peek().type === 'op' && (this.peek().value === '-' || this.peek().value === '+')) {
      const op = this.eat('op').value;
      return { op: 'u' + op, operand: this.unary() };
    }
    return this.primary();
  }
  primary() {
    const t = this.peek();
    if (!t) throw new Error('Empty expression');
    if (t.type === 'num') { this.eat('num'); return t.value; }
    if (t.type === 'op' && t.value === '(') {
      this.eat('op');
      const v = this.expr();
      if (!this.eat('op', ')')) throw new Error('Missing )');
      return v;
    }
    if (t.type === 'fn') {
      const name = this.eat('fn').value;
      if (!this.eat('op', '(')) throw new Error('Expected ( after ' + name);
      const arg = this.expr();
      if (!this.eat('op', ')')) throw new Error('Missing )');
      return { fn: name, arg };
    }
    throw new Error('Unexpected: ' + (t.value || t.type));
  }
}

function toRad(x) { return x * Math.PI / 180; }
function toDeg(x) { return x * 180 / Math.PI; }

const FNS = {
  sin:  (x, a) => Math.sin(a === 'deg' ? toRad(x) : x),
  cos:  (x, a) => Math.cos(a === 'deg' ? toRad(x) : x),
  tan:  (x, a) => Math.tan(a === 'deg' ? toRad(x) : x),
  asin: (x, a) => a === 'deg' ? toDeg(Math.asin(x)) : Math.asin(x),
  acos: (x, a) => a === 'deg' ? toDeg(Math.acos(x)) : Math.acos(x),
  atan: (x, a) => a === 'deg' ? toDeg(Math.atan(x)) : Math.atan(x),
  log:  (x) => Math.log10(x),
  ln:   (x) => Math.log(x),
  sqrt: (x) => Math.sqrt(x),
  abs:  (x) => Math.abs(x),
  exp:  (x) => Math.exp(x),
  fact: (x) => {
    if (x < 0 || x !== Math.floor(x) || x > 170) throw new Error('Invalid factorial');
    let r = 1; for (let i = 2; i <= x; i++) r *= i; return r;
  },
};

function evaluate(node) {
  if (typeof node === 'number') return node;
  if (node.op) {
    const l = evaluate(node.left);
    const r = evaluate(node.right);
    switch (node.op) {
      case '+': return l + r;
      case '-': return l - r;
      case '*': return l * r;
      case '/':
        if (r === 0) throw new Error('Division by zero');
        return l / r;
      case '%': return l % r;
      case '^': return Math.pow(l, r);
    }
  }
  if (node.op && node.op.startsWith('u')) {
    const v = evaluate(node.operand);
    return node.op === 'u-' ? -v : v;
  }
  if (node.fn) {
    const v = evaluate(node.arg);
    const fn = FNS[node.fn];
    if (!fn) throw new Error('Unknown: ' + node.fn);
    return fn(v, angle);
  }
  throw new Error('Bad node');
}

function compute(expr) {
  if (!expr.trim()) return '';
  const tree = new Parser(tokenize(expr)).parse();
  const out = evaluate(tree);
  if (typeof out !== 'number' || !isFinite(out)) {
    if (out === Infinity || out === -Infinity) throw new Error('Infinity');
    if (Number.isNaN(out)) throw new Error('NaN');
    throw new Error('Math error');
  }
  return out;
}

/* ── Input handling ─────────────────────────────────────────────── */
function show() {
  exprEl.textContent = expression || '0';
  resultEl.textContent = (result === '' ? '' : (typeof result === 'number' ? formatResult(result) : '= ' + result));
  if (result === 'Error') resultEl.classList.add('is-error');
  else resultEl.classList.remove('is-error');
}

function formatResult(n) {
  if (typeof n !== 'number') return String(n);
  if (Math.abs(n) < 1e-10 && n !== 0) return n.toExponential(6);
  if (Math.abs(n) > 1e12) return n.toExponential(6);
  // Up to 10 significant digits, trim trailing zeros.
  const s = parseFloat(n.toPrecision(12)).toString();
  return s;
}

function pushValue(v) {
  if (result !== '' && /[0-9.(]$/.test(expression) === false) {
    // After equals, start fresh if user types a number
    if (/^[0-9.]$/.test(v)) { expression = ''; result = ''; }
  }
  expression += v;
  if (result !== '' && /^[+\-*/^%]$/.test(v)) { result = ''; }
  show();
  tryLive();
}

function tryLive() {
  // Best-effort live preview without throwing
  try {
    const v = compute(expression);
    if (typeof v === 'number' && isFinite(v)) {
      resultEl.textContent = '= ' + formatResult(v);
      result = v;
    } else {
      result = '';
      resultEl.textContent = '';
    }
  } catch { result = ''; resultEl.textContent = ''; }
}

function backspace() {
  if (expression.length) {
    expression = expression.slice(0, -1);
    show();
    tryLive();
  }
}

function clearAll() {
  expression = '';
  result = '';
  show();
}

function evaluateNow() {
  try {
    const v = compute(expression);
    if (typeof v !== 'number' || !isFinite(v)) throw new Error('Math error');
    // Save history
    const entry = { id: uuid(), expression, result: v, ts: new Date().toISOString() };
    history = [entry, ...history].slice(0, 100);
    Storage.set(HIST_KEY, history);
    expression = formatResult(v);
    result = '';
    show();
    renderHistory();
    Toast.success('Calculated');
  } catch (e) {
    result = 'Error';
    show();
    Sound?.error?.();
  }
}

function load() {
  history = Storage.get(HIST_KEY, []);
  mode = Storage.get(MODE_KEY, 'basic');
  angle = Storage.get(ANGLE_KEY, 'deg');
}

function setMode(m) {
  mode = m;
  Storage.set(MODE_KEY, mode);
  renderButtons();
}

function setAngle(a) {
  angle = a;
  Storage.set(ANGLE_KEY, angle);
  renderButtons();
}

function btn(label, action, kind = 'num') {
  return el('button', {
    type: 'button',
    class: `calc-btn calc-btn--${kind}`,
    onClick: action,
  }, [label]);
}

function renderButtons() {
  const wrap = $('.calc-keys', $('#view .view-calculator'));
  if (!wrap) return;
  clear(wrap);
  const isSci = mode === 'scientific';

  const rows = isSci ? [
    // Scientific top
    [{ label: 'sin',  fn: 'sin', kind: 'fn' }, { label: 'cos',  fn: 'cos', kind: 'fn' }, { label: 'tan', fn: 'tan', kind: 'fn' }, { label: angle === 'deg' ? 'DEG' : 'RAD', action: () => setAngle(angle === 'deg' ? 'rad' : 'deg'), kind: 'mod' }],
    [{ label: 'asin', fn: 'asin', kind: 'fn' }, { label: 'acos', fn: 'acos', kind: 'fn' }, { label: 'atan', fn: 'atan', kind: 'fn' }, { label: 'π', action: () => pushValue('π'), kind: 'const' }],
    [{ label: 'log', fn: 'log', kind: 'fn' }, { label: 'ln', fn: 'ln', kind: 'fn' }, { label: '√', fn: 'sqrt', kind: 'fn' }, { label: 'e', action: () => pushValue('e'), kind: 'const' }],
    [{ label: 'x²',  action: () => pushValue('^2'), kind: 'fn' }, { label: 'xʸ', action: () => pushValue('^'), kind: 'fn' }, { label: '|x|', fn: 'abs', kind: 'fn' }, { label: 'n!', fn: 'fact', kind: 'fn' }],
    // Numpad
    [{ label: 'AC', action: clearAll, kind: 'util' }, { label: '⌫', action: backspace, kind: 'util' }, { label: '(', action: () => pushValue('('), kind: 'util' }, { label: ')', action: () => pushValue(')'), kind: 'util' }, { label: '÷', action: () => pushValue('/'), kind: 'op' }],
    [{ label: '7', action: () => pushValue('7') }, { label: '8', action: () => pushValue('8') }, { label: '9', action: () => pushValue('9') }, { label: '%', action: () => pushValue('%'), kind: 'op' }],
    [{ label: '4', action: () => pushValue('4') }, { label: '5', action: () => pushValue('5') }, { label: '6', action: () => pushValue('6') }, { label: '×', action: () => pushValue('*'), kind: 'op' }],
    [{ label: '1', action: () => pushValue('1') }, { label: '2', action: () => pushValue('2') }, { label: '3', action: () => pushValue('3') }, { label: '−', action: () => pushValue('-'), kind: 'op' }],
    [{ label: '0', action: () => pushValue('0'), span: 2 }, { label: '.', action: () => pushValue('.') }, { label: '+', action: () => pushValue('+'), kind: 'op' }],
    [{ label: '=', action: evaluateNow, kind: 'eq', span: 5 }],
  ] : [
    [{ label: 'AC', action: clearAll, kind: 'util' }, { label: '⌫', action: backspace, kind: 'util' }, { label: '%', action: () => pushValue('%'), kind: 'op' }, { label: '÷', action: () => pushValue('/'), kind: 'op' }],
    [{ label: '7', action: () => pushValue('7') }, { label: '8', action: () => pushValue('8') }, { label: '9', action: () => pushValue('9') }, { label: '×', action: () => pushValue('*'), kind: 'op' }],
    [{ label: '4', action: () => pushValue('4') }, { label: '5', action: () => pushValue('5') }, { label: '6', action: () => pushValue('6') }, { label: '−', action: () => pushValue('-'), kind: 'op' }],
    [{ label: '1', action: () => pushValue('1') }, { label: '2', action: () => pushValue('2') }, { label: '3', action: () => pushValue('3') }, { label: '+', action: () => pushValue('+'), kind: 'op' }],
    [{ label: '0', action: () => pushValue('0'), span: 2 }, { label: '.', action: () => pushValue('.') }, { label: '=', action: evaluateNow, kind: 'eq' }],
  ];

  for (const row of rows) {
    const r = el('div', { class: 'calc-row' });
    for (const b of row) {
      const node = b.fn
        ? el('button', { type: 'button', class: 'calc-btn calc-btn--fn', onClick: () => pushValue(b.fn + '(') }, [b.label])
        : btn(b.label, b.action, b.kind || 'num');
      if (b.span) node.style.gridColumn = `span ${b.span}`;
      r.appendChild(node);
    }
    wrap.appendChild(r);
  }
}

function renderHistory() {
  if (!historyEl) return;
  clear(historyEl);
  if (!history.length) {
    historyEl.appendChild(el('div', { class: 'empty' }, [
      el('div', { class: 'empty__icon', html: Icons.get('history') }),
      el('div', { class: 'empty__title', text: 'No history yet' }),
      el('div', { class: 'empty__msg', text: 'Calculations you make will appear here.' }),
    ]));
    return;
  }
  for (const h of history) {
    const row = el('button', {
      type: 'button',
      class: 'calc-history__item',
      onClick: () => { expression = h.expression; result = ''; show(); tryLive(); },
    }, [
      el('div', { class: 'calc-history__expr muted', text: h.expression }),
      el('div', { class: 'calc-history__result', text: '= ' + formatResult(h.result) }),
    ]);
    historyEl.appendChild(row);
  }
}

function mountView(root) {
  load();
  root.appendChild(fragment([
    el('div', { class: 'view__header' }, [
      el('div', {}, [
        el('h1', { class: 'view__title', text: 'Calculator' }),
        el('div', { class: 'view__subtitle', text: 'Basic & scientific operations with history' }),
      ]),
      el('div', { class: 'view__actions' }, [
        el('div', { class: 'segmented' }, [
          el('button', { type: 'button', text: 'Basic', class: mode === 'basic' ? 'is-active' : '', onClick: () => setMode('basic') }),
          el('button', { type: 'button', text: 'Scientific', class: mode === 'scientific' ? 'is-active' : '', onClick: () => setMode('scientific') }),
        ]),
        el('button', {
          class: 'btn btn--ghost btn--sm',
          onClick: async () => {
            if (!history.length) return;
            const ok = await Modal.confirm({ title: 'Clear history?', message: 'This permanently clears all calculation history.', danger: true, confirmText: 'Clear' });
            if (!ok) return;
            history = []; Storage.set(HIST_KEY, history); renderHistory();
            Toast.success('History cleared');
          },
        }, [el('span', { class: 'icon', html: Icons.get('trash') }), 'Clear']),
      ]),
    ]),
    el('div', { class: 'calc-grid' }, [
      el('div', { class: 'calc-main' }, [
        el('div', { class: 'calc-display' }, [
          el('div', { class: 'calc-display__expr', ref: (n) => (exprEl = n) }),
          el('div', { class: 'calc-display__result', ref: (n) => (resultEl = n) }),
        ]),
        el('div', { class: 'calc-keys' }),
      ]),
      el('aside', { class: 'calc-history', ref: (n) => (historyEl = n) }),
    ]),
  ]));

  // Pre-bind display vars that are referenced by initial renders
  displayEl = $('.calc-display', root);
  show();
  renderButtons();
  renderHistory();

  // Keyboard: opt in to allow digits even when an input is focused elsewhere,
  // but only when the calculator view is active. We attach a keydown to the
  // document for our scope.
  const k = (combo, fn) => Keyboard.register('calculator', combo, fn);
  k('escape', clearAll);
  k('enter', evaluateNow);
  k('backspace', backspace);
  for (const c of '0123456789.+-*/%()') {
    k(c, () => pushValue(c));
  }
}

import { Modal } from '../core/modal.js';
import { Sound } from '../core/sound.js';

export const Calculator = {
  mount: mountView,
};