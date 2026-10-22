// Test prelude: install jsdom's browser APIs onto globalThis before any source loads.
// The source writes globalThis.DOMHelper / globalThis.ValueProcessor at module load,
// and isElement() type-checks with `instanceof Element`, so Element must come from the
// same origin as document (the same JSDOM instance), or every element check would fail.
//
// Load order is defined in package.json: node --import ./test/setup.js --test test/
import { JSDOM } from 'jsdom'

const dom = new JSDOM('<!doctype html><html><body></body></html>', {
  url: 'http://localhost/',
  pretendToBeVisual: true,
})

const { window } = dom

const NAMES = [
  'window',
  'document',
  'navigator',
  'location',
  'history',
  'Element',
  'HTMLElement',
  'HTMLInputElement',
  'HTMLSelectElement',
  'HTMLTemplateElement',
  'DocumentFragment',
  'Node',
  'NodeList',
  'HTMLCollection',
  'CustomEvent',
  'Event',
  'MouseEvent',
  'MutationObserver',
  'MutationRecord',
  'getComputedStyle',
  'requestAnimationFrame',
  'cancelAnimationFrame',
]

for (const name of NAMES) {
  const value = name === 'window' ? window : window[name]
  if (value === undefined)
    continue
  try {
    Object.defineProperty(globalThis, name, {
      value,
      writable: true,
      configurable: true,
    })
  } catch {
    // A few hosts (e.g. Node's built-in navigator) may expose non-writable getters;
    // ignoring them is fine because the source does not rely on them.
  }
}

export { dom }
