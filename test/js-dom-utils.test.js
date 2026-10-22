import test, { describe } from 'node:test'
import assert from 'node:assert/strict'

import {
  elementIs,
  hasClass,
  addClass,
  removeClass,
  querySelector,
  getTargets,
  showElements,
  hideElements,
  enableElements,
  disableElements,
  registerMutationObserver,
  registerAttributeChange,
  registerEvent,
  triggerEvent,
  stopDefaultEvent,
} from '../src/js-dom-utils.js'
import { mount, cleanup } from './helpers/dom.js'

const tick = (ms = 20) => new Promise(resolve => setTimeout(resolve, ms))

describe('js-dom-utils / elementIs', () => {
  test('matches by tag name', t => {
    const el = mount(t, '<div></div>')
    assert.equal(elementIs(el, 'div'), true)
    assert.equal(elementIs(el, 'span'), false)
  })

  test('matches by input type', t => {
    const el = mount(t, '<input type="checkbox">')
    assert.equal(elementIs(el, 'checkbox'), true)
    assert.equal(elementIs(el, ['div', 'checkbox']), true)
  })

  test('non-elements never match', () => {
    assert.equal(elementIs(null, 'div'), false)
    assert.equal(elementIs({ tagName: 'DIV' }, 'div'), false)
  })
})

describe('js-dom-utils / class helpers', () => {
  test('addClass splits on spaces and commas', t => {
    const el = mount(t, '<div></div>')
    addClass(el, 'a b,c')
    assert.equal(el.className, 'a b c')
  })

  test('removeClass removes each token', t => {
    const el = mount(t, '<div class="a b c"></div>')
    removeClass(el, 'a c')
    assert.equal(el.className, 'b')
  })

  test('hasClass is null-safe and blank-safe', t => {
    const el = mount(t, '<div class="a"></div>')
    assert.equal(hasClass(el, 'a'), true)
    assert.equal(hasClass(el, 'b'), false)
    assert.equal(hasClass(el, ''), false)
    assert.equal(hasClass(null, 'a'), false)
  })

  test('class helpers reject non-elements', () => {
    assert.throws(() => addClass(null, 'a'), /Argument 1 must be HTMLElement/)
    assert.throws(() => removeClass({}, 'a'), /Argument 1 must be HTMLElement/)
  })
})

describe('js-dom-utils / querySelector', () => {
  test('searches the whole document by default', t => {
    mount(t, '<div id="root"><p class="hit"></p><p class="hit"></p></div>')
    assert.equal(querySelector('.hit').length, 2)
  })

  test('scopes the search to the given element', t => {
    mount(t, '<div id="a"><p class="hit"></p></div><div id="b"><p class="hit"></p></div>')
    const root = document.querySelector('#a')
    assert.equal(querySelector('.hit', root).length, 1)
  })

  test('includeSelf adds a matching root', t => {
    mount(t, '<div class="hit"><p class="hit"></p></div>')
    const root = document.querySelector('div')
    assert.equal(querySelector('.hit', root).length, 1)
    assert.equal(querySelector('.hit', root, true).length, 2)
  })

  test('accepts elements directly and de-duplicates', t => {
    mount(t, '<p class="hit"></p>')
    const el = document.querySelector('.hit')
    assert.deepEqual(querySelector([el, '.hit']), [el])
  })

  test('invalid selectors and blanks are ignored', t => {
    mount(t, '<p class="hit"></p>')
    assert.equal(querySelector(['>>>', '', null]).length, 0)
  })
})

describe('js-dom-utils / getTargets', () => {
  test('"self" resolves to the element itself', t => {
    const el = mount(t, '<div></div>')
    assert.deepEqual(getTargets('self', el), [el])
  })

  test('"parent" resolves to the parent element', t => {
    const el = mount(t, '<div></div>')
    assert.deepEqual(getTargets('parent', el), [document.body])
  })

  test('"children" resolves to direct children', t => {
    const el = mount(t, '<div><i></i><b></b></div>')
    assert.deepEqual(getTargets('children', el), [...el.children])
  })

  test('css selectors search from the document', t => {
    mount(t, '<div><p class="hit"></p></div><p class="hit"></p>')
    assert.equal(getTargets('.hit', document.body).length, 2)
  })

  test('"closest" applies to the following selector', t => {
    mount(t, '<section class="card"><div id="leaf"></div></section>')
    const el = document.querySelector('#leaf')
    assert.deepEqual(getTargets('self closest .card', el), [document.querySelector('.card')])
  })

  test('element instances pass through and lists are splittable', t => {
    const el = mount(t, '<div><i class="x"></i></div>')
    const other = document.createElement('span')
    assert.deepEqual(getTargets(other, el), [other])
    assert.equal(getTargets('self,children', el).length, 2)
  })
})

describe('js-dom-utils / visibility and disabled helpers', () => {
  test('hideElements toggles class and inline display', t => {
    const el = mount(t, '<div></div>')
    hideElements(el)
    assert.equal(el.classList.contains('hidden'), true)
    assert.equal(el.style.display, 'none')
  })

  test('showElements clears the hidden state', t => {
    const el = mount(t, '<div class="hidden" style="display:none"></div>')
    showElements([el])
    assert.equal(el.classList.contains('hidden'), false)
    assert.equal(el.style.display, '')
  })

  test('disable and enable toggle the attribute', t => {
    const el = mount(t, '<button></button>')
    disableElements(el)
    assert.equal(el.hasAttribute('disabled'), true)
    enableElements(el)
    assert.equal(el.hasAttribute('disabled'), false)
  })

  test('nested object maps are flattened', t => {
    const el = mount(t, '<div></div>')
    hideElements({ group: { one: el, two: [null, 'skip'] } })
    assert.equal(el.classList.contains('hidden'), true)
  })

  test('invalid input is rejected', () => {
    assert.throws(() => hideElements('div'), /Argument 1 must be document or HTMLElement or HTMLElementArray/)
    assert.throws(() => showElements(1), /Argument 1 must be document or HTMLElement or HTMLElementArray/)
  })
})

describe('js-dom-utils / observers', () => {
  test('registerMutationObserver reports added nodes', async t => {
    const root = mount(t, '<div></div>')
    const seen = []
    const observer = registerMutationObserver(node => seen.push(node.tagName), root)
    root.appendChild(document.createElement('span'))
    await tick()
    observer.disconnect()
    assert.deepEqual(seen, ['SPAN'])
  })

  test('registerMutationObserver defaults to document.body', async t => {
    mount(t, '<div></div>')
    const seen = []
    const observer = registerMutationObserver(node => seen.push(node.id))
    document.body.appendChild(Object.assign(document.createElement('p'), { id: 'added' }))
    await tick()
    observer.disconnect()
    assert.deepEqual(seen, ['added'])
  })

  test('registerAttributeChange only fires for the watched prefix', async t => {
    const el = mount(t, '<div></div>')
    let calls = 0
    const observer = registerAttributeChange(el, 'data-sync', () => calls++)
    el.setAttribute('data-sync-state', 'x')
    el.setAttribute('data-other', 'y')
    await tick()
    observer.disconnect()
    assert.equal(calls, 1)
  })
})

describe('js-dom-utils / events', () => {
  test('registerEvent binds multiple events to multiple elements', t => {
    const [a, b] = [document.createElement('i'), document.createElement('i')]
    const seen = []
    registerEvent([a, b], 'click keyup', event => seen.push(event.type))
    a.dispatchEvent(new Event('click'))
    b.dispatchEvent(new Event('keyup'))
    assert.deepEqual(seen, ['click', 'keyup'])
  })

  test('registerEvent validates its arguments', t => {
    const el = mount(t, '<div></div>')
    assert.throws(() => registerEvent(el, '', () => { }), /Argument 2 must be Array or NonBlankString/)
    assert.throws(() => registerEvent(el, 'click', 'nope'), /Argument 3 must be Function/)
  })

  test('triggerEvent dispatches a CustomEvent with detail', t => {
    const el = mount(t, '<div></div>')
    const details = []
    el.addEventListener('custom', event => details.push(event.detail))
    triggerEvent(el, 'custom', { n: 1 })
    assert.deepEqual(details, [{ n: 1 }])
    assert.throws(() => triggerEvent(el, ''), /Argument 2 must be NonBlankString/)
  })

  test('stopDefaultEvent prevents default and stops propagation', t => {
    const outer = mount(t, '<div id="outer"><button id="inner"></button></div>')
    const inner = outer.querySelector('#inner')
    let outerCalled = false
    outer.addEventListener('click', () => { outerCalled = true })
    inner.addEventListener('click', event => stopDefaultEvent(event))
    const event = new Event('click', { bubbles: true, cancelable: true })
    inner.dispatchEvent(event)
    assert.equal(event.defaultPrevented, true)
    assert.equal(outerCalled, false)
  })

  test('stopDefaultEvent tolerates empty input', () => {
    assert.equal(stopDefaultEvent(undefined), undefined)
    assert.equal(stopDefaultEvent({}), undefined)
  })
})

test.afterEach(() => cleanup())
