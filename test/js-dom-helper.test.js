import test, { describe } from 'node:test'
import assert from 'node:assert/strict'

import DOMHelper from '../src/js-dom-helper.js'
import { mount, cleanup } from './helpers/dom.js'

const helper = new DOMHelper({})

describe('js-dom-helper / single value rendering', () => {
  test('fills descendant value targets from the data object', t => {
    const root = mount(t, '<div data-value><span data-value="label"></span></div>')
    const span = root.querySelector('span')
    helper.setValueToElement(root, { label: 'hello' })
    assert.equal(span.textContent, 'hello')
    assert.equal(span.classList.contains('dom-helper-filled'), true)
  })

  test('writes plain attributes, stripping the attr- prefix', t => {
    const root = mount(t, '<div data-value><span data-attr-title="label"></span></div>')
    const span = root.querySelector('span')
    helper.setValueToElement(root, { label: 'tip' })
    assert.equal(span.getAttribute('title'), 'tip')
  })

  test('boolean attributes follow truthiness', t => {
    const root = mount(t, '<div data-value><input data-attr-disabled="flag"></div>')
    const input = root.querySelector('input')
    helper.setValueToElement(root, { flag: true })
    assert.equal(input.hasAttribute('disabled'), true)
    helper.setValueToElement(root, { flag: false })
    assert.equal(input.hasAttribute('disabled'), false)
  })

  test('splits class values into separate classes', t => {
    const root = mount(t, '<div data-value><span data-class="extra"></span></div>')
    const span = root.querySelector('span')
    helper.setValueToElement(root, { extra: 'alpha beta' })
    assert.equal(span.classList.contains('alpha'), true)
    assert.equal(span.classList.contains('beta'), true)
  })

  test('type:number aggregates the values and formats the sum', t => {
    const root = mount(t, '<div data-value><span id="sum" data-value="amount|type:number"></span></div>')
    helper.setValueToElement(root, { amount: '3' })
    assert.equal(root.querySelector('#sum').textContent, '3')
  })

  test('a prefixed helper reads the prefixed attributes', t => {
    const prefixed = new DOMHelper({ prefix: 'af' })
    const root = mount(t, '<div data-af-value><span data-af-value="label"></span></div>')
    prefixed.setValueToElement(root, { label: 'prefixed' })
    assert.equal(root.querySelector('span').textContent, 'prefixed')
  })

  test('setValueToElement requires an element', () => {
    assert.throws(() => helper.setValueToElement(null, 'x'), /Argument 1 must be HTMLElement/)
  })
})

describe('js-dom-helper / filters and visibility', () => {
  test('filter drops non matching elements from the DOM', t => {
    mount(t, '<div id="root" data-value><p id="keep" data-filter="status==active"></p><p id="drop" data-filter="status==done"></p></div>')
    helper.setValueToElement(document.getElementById('root'), { status: 'active' })
    assert.ok(document.getElementById('keep'))
    assert.equal(document.getElementById('drop'), null)
  })

  test('hidden toggles visibility with the same filter syntax', t => {
    const root = mount(t, '<div data-value><span id="hid" data-hidden="status==active"></span></div>')
    const span = root.querySelector('#hid')
    helper.setValueToElement(root, { status: 'active' })
    assert.equal(span.style.display, 'none')
    helper.setValueToElement(root, { status: 'done' })
    assert.equal(span.style.display, '')
  })

  test('keys prefixed with dom-helper-index resolve the sequence position', t => {
    mount(t, '<template><li class="row" data-value="dom-helper-index"></li></template>'
      + '<ul id="list" data-template=".row" data-array-value="label"></ul>')
    helper.setValueToElement(document.getElementById('list'), [{ label: 'a' }, { label: 'b' }])
    const texts = [...document.querySelectorAll('#list > li')].map(li => li.textContent)
    assert.deepEqual(texts, ['1', '2'])
  })
})

describe('js-dom-helper / array rendering', () => {
  test('array values are cloned from the template and tagged', t => {
    mount(t, '<template><li class="row" data-value="dom-helper-index"></li></template>'
      + '<ul id="list2" data-template=".row" data-array-value="label"></ul>')
    const list = document.getElementById('list2')
    helper.setValueToElement(list, [{ label: 'a' }, { label: 'b' }])

    const items = [...list.children]
    assert.equal(items.length, 2)
    items.forEach(item => {
      assert.equal(item.classList.contains('dom-helper-create-item'), true)
      assert.ok(item.dataset.arraySeq)
    })
    assert.deepEqual(items.map(item => item.dataset.arraySeq), ['1,', '2,'])
  })

  test('new items are inserted before the dom-helper-last marker', t => {
    mount(t, '<template><li class="row" data-value="dom-helper-index"></li></template>'
      + '<ul id="list3" data-template=".row" data-array-value="label"><li id="marker" class="dom-helper-last"></li></ul>')
    const list = document.getElementById('list3')
    helper.setValueToElement(list, [{ label: 'a' }])
    assert.equal(list.lastElementChild.id, 'marker')
    assert.equal(list.firstElementChild.textContent, '1')
  })

  test('rendering an empty array produces no items', t => {
    mount(t, '<template><li class="row" data-value="dom-helper-index"></li></template>'
      + '<ul id="list4" data-template=".row" data-array-value="label"></ul>')
    const list = document.getElementById('list4')
    helper.setValueToElement(list, [])
    assert.equal(list.children.length, 0)
  })
})

describe('js-dom-helper / clearElement', () => {
  test('removes generated items', t => {
    mount(t, '<template><li class="row" data-value="dom-helper-index"></li></template>'
      + '<ul id="list5" data-template=".row" data-array-value="label"></ul>')
    const list = document.getElementById('list5')
    helper.setValueToElement(list, [{ label: 'a' }, { label: 'b' }])
    assert.equal(list.children.length, 2)

    helper.clearElement(list)
    assert.equal(list.children.length, 0)
  })

  test('clears a filled input back to an empty value', t => {
    const input = mount(t, '<input data-value="value">')
    helper.setValueToElement(input, { value: 'abc' })
    assert.equal(input.value, 'abc')
    assert.equal(input.classList.contains('dom-helper-filled'), true)

    helper.clearElement(input)
    assert.equal(input.value, '')
  })

  test('clearElement requires an element', () => {
    assert.throws(() => helper.clearElement(null), /Argument 1 must be HTMLElement/)
  })
})

test.afterEach(() => cleanup())

// Private helpers (processEnum / replaceString / processNumber / getArray / reduceFilter)
// are not exported and can only be reached indirectly through the DOM; the enum /
// typeFormat DSL must first be pinned in an ADR before these get covered.
test.todo('unit test the private value pipeline helpers once their DSL contract is fixed')
