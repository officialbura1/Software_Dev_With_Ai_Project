// js/core/dom.js
// Tiny DOM helpers — el(), $, $$, mount, clear. Used everywhere to keep the
// render code readable.

/**
 * Create an element with optional properties and children.
 *
 *   el('button', { class: 'btn', onClick: fn, type: 'button' }, [
 *     el('span', { class: 'icon' }),
 *     'Save'
 *   ])
 *
 * @param {string} tag
 * @param {Record<string, any>=} props
 * @param {Array<Node|string|null|undefined|false>=} children
 * @returns {HTMLElement}
 */
export function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);

  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;

    if (k === 'class' || k === 'className') {
      node.className = Array.isArray(v) ? v.filter(Boolean).join(' ') : String(v);
    } else if (k === 'style' && typeof v === 'object') {
      Object.assign(node.style, v);
    } else if (k === 'dataset' && typeof v === 'object') {
      for (const [dk, dv] of Object.entries(v)) node.dataset[dk] = dv;
    } else if (k === 'html') {
      node.innerHTML = String(v);
    } else if (k === 'text') {
      node.textContent = String(v);
    } else if (k.startsWith('on') && typeof v === 'function') {
      node.addEventListener(k.slice(2).toLowerCase(), v);
    } else if (k === 'ref' && typeof v === 'function') {
      v(node);
    } else if (k in node && k !== 'list') {
      try { node[k] = v; }
      catch { node.setAttribute(k, String(v)); }
    } else {
      node.setAttribute(k, String(v));
    }
  }

  appendChildren(node, children);
  return node;
}

function appendChildren(parent, children) {
  if (children == null) return;
  if (!Array.isArray(children)) children = [children];

  for (const c of children) {
    if (c == null || c === false) continue;
    if (Array.isArray(c)) { appendChildren(parent, c); continue; }
    if (c instanceof Node) parent.appendChild(c);
    else parent.appendChild(document.createTextNode(String(c)));
  }
}

export const $  = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

export function clear(node) {
  while (node && node.firstChild) node.removeChild(node.firstChild);
  return node;
}

export function mount(parent, child) {
  clear(parent);
  if (child) parent.appendChild(child);
  return parent;
}

/** Replace one element with another. */
export function replace(oldNode, newNode) {
  if (!oldNode || !oldNode.parentNode) return newNode;
  oldNode.parentNode.replaceChild(newNode, oldNode);
  return newNode;
}

/** Insert after a sibling. */
export function insertAfter(newNode, ref) {
  if (!ref || !ref.parentNode) return;
  ref.parentNode.insertBefore(newNode, ref.nextSibling);
}

/** Create a DocumentFragment from a list of nodes. */
export function fragment(children) {
  const f = document.createDocumentFragment();
  for (const c of children) {
    if (c == null || c === false) continue;
    if (Array.isArray(c)) { for (const cc of c) cc && f.appendChild(cc); continue; }
    if (c instanceof Node) f.appendChild(c);
  }
  return f;
}

/** Event delegation: attach once, dispatch on matching descendants. */
export function delegate(root, selector, type, handler) {
  root.addEventListener(type, (e) => {
    const target = e.target.closest(selector);
    if (target && root.contains(target)) handler.call(target, e, target);
  });
}