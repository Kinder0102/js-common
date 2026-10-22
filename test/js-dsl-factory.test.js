import test, { describe } from 'node:test'
import assert from 'node:assert/strict'

import { createProperty, createTemplateHandler, createFilter } from '../src/js-dsl-factory.js'
import { mount, cleanup } from './helpers/dom.js'

describe('js-dsl-factory / createProperty', () => {
  test('objects are returned as-is', () => {
    const props = { type: ['list'], value: ['x'] }
    assert.equal(createProperty(props), props)
  })

  test('functions become a Function type with the function as value', () => {
    const fn = () => 'x'
    assert.deepEqual(createProperty(fn), { type: ['Function'], value: [fn] })
  })

  test('blank and non-string input yields the default prop shape', () => {
    const defaults = { type: [], value: [] }
    assert.deepEqual(createProperty(undefined), defaults)
    assert.deepEqual(createProperty(''), defaults)
    assert.deepEqual(createProperty(null), defaults)
  })

  test('each default prop is an independent copy', () => {
    const first = createProperty(undefined)
    first.value.push('leak')
    assert.deepEqual(createProperty(undefined), { type: [], value: [] })
  })

  test('pipe separates tokens and colon separates key from values', () => {
    assert.deepEqual(createProperty('type:list|value:a,b'), { type: ['list'], value: ['a', 'b'] })
  })

  test('tokens without a key are pushed into value', () => {
    assert.deepEqual(createProperty('a,b'), { type: [], value: ['a', 'b'] })
  })

  test('escaped colons do not split into a key', () => {
    assert.deepEqual(createProperty('a\\:b'), { type: [], value: ['a:b'] })
  })

  test('urls are pushed into value even with colons', () => {
    assert.deepEqual(createProperty('https://example.com/a.png'), {
      type: [],
      value: ['https://example.com/a.png'],
    })
  })

  test('identical strings share one cached object (characterization)', () => {
    // PROPERTY_CACHE is module-level: the same string always yields the same object,
    // so mutating the returned value pollutes later calls.
    const first = createProperty('cache-probe:one')
    first.type.push('mutated')
    assert.equal(createProperty('cache-probe:one'), first)
    assert.deepEqual(createProperty('cache-probe:one').type, ['mutated'])
    assert.deepEqual(createProperty('cache-probe:one')['cache-probe'], ['one'])
  })
})

describe('js-dsl-factory / createTemplateHandler', () => {
  test('an element is used verbatim as the template', t => {
    const el = mount(t, '<div id="tpl-el"></div>')
    const handler = createTemplateHandler(el)
    assert.equal(handler.getTemplate({}), el)
  })

  test('blank input falls back to a span carrying the stringified item', t => {
    mount(t, '<div></div>')
    const handler = createTemplateHandler('')
    assert.equal(handler.getTemplate('hi').textContent, 'hi')
    assert.equal(handler.getTemplate(0).textContent, '0')
    assert.equal(handler.getTemplate({ a: 1 }).textContent, '{"a":1}')
  })

  test('a selector string clones the matching template content', t => {
    mount(t, '<template><div class="tpl-clone">hello</div></template>')
    const handler = createTemplateHandler('.tpl-clone')
    const node = handler.getTemplate({})
    assert.equal(node.textContent, 'hello')
    assert.equal(node.getAttribute('id'), null)
  })

  test('each call returns an independent clone', t => {
    mount(t, '<template><div class="tpl-fresh"><b>x</b></div></template>')
    const handler = createTemplateHandler('.tpl-fresh')
    const first = handler.getTemplate({})
    const second = handler.getTemplate({})
    assert.notEqual(first, second)
    first.appendChild(document.createElement('i'))
    assert.equal(first.children.length, 2)
    assert.equal(second.children.length, 1)
  })

  test('id attributes are stripped from clones', t => {
    mount(t, '<template><div id="dup" class="tpl-strip">x</div></template>')
    const handler = createTemplateHandler('.tpl-strip')
    assert.equal(handler.getTemplate({}).hasAttribute('id'), false)
  })

  test('keyed selectors pick a template by item property', t => {
    mount(t, '<template><div id="tpl-a">A</div></template><template><div id="tpl-b">B</div></template>')
    const handler = createTemplateHandler('kind.a:#tpl-a|kind.b:#tpl-b')
    assert.equal(handler.getTemplate({ kind: 'b' }).textContent, 'B')
    assert.equal(handler.getTemplate({ kind: 'a' }).textContent, 'A')
  })

  test('falls back to the default span when no selector matches', t => {
    mount(t, '<template><div id="tpl-unused">Z</div></template>')
    const handler = createTemplateHandler('kind.x:#tpl-unused')
    assert.equal(handler.getTemplate({ kind: 'y' }).textContent, '{"kind":"y"}')
  })

  test('handlers are cached per template prop (characterization)', t => {
    // TEMPLATE_CACHE snapshots the templates present in document on first use,
    // so templates added later stay invisible to the same prop.
    mount(t, '<template><div class="tpl-snap">one</div></template>')
    const handler = createTemplateHandler('.tpl-snap')
    document.body.insertAdjacentHTML('beforeend', '<template><div class="tpl-snap">two</div></template>')
    assert.equal(handler.getTemplate({}).textContent, 'one')
    assert.equal(createTemplateHandler('.tpl-snap'), handler)
  })
})

describe('js-dsl-factory / createFilter keys and equality', () => {
  test('exposes the keys referenced by comparables', () => {
    assert.deepEqual(createFilter('status==active').keys, ['status'])
  })

  test('equality matching', () => {
    const { filter } = createFilter('status==active')
    assert.equal(filter('status', 'active'), true)
    assert.equal(filter('status', 'inactive'), false)
    assert.equal(filter('unknown', 'active'), false)
  })

  test('escaped commas create an OR list', () => {
    const { filter } = createFilter('status==a\\,b')
    assert.equal(filter('status', 'a'), true)
    assert.equal(filter('status', 'b'), true)
    assert.equal(filter('status', 'c'), false)
  })

  test('repeated comparables on one key are ANDed', () => {
    const { filter } = createFilter('status==a|status==b')
    assert.equal(filter('status', 'a'), false)
  })

  test('boolean literals are parsed as booleans', () => {
    const { filter } = createFilter('enabled==true')
    assert.equal(filter('enabled', true), true)
    assert.equal(filter('enabled', false), false)
    // The string 'true' goes through ==, and true == 'true' is false (characterization).
    assert.equal(filter('enabled', 'true'), false)
  })
})

describe('js-dsl-factory / createFilter operators', () => {
  test('!= is the negation of equality', () => {
    const { filter } = createFilter('status!=active')
    assert.equal(filter('status', 'inactive'), true)
    assert.equal(filter('status', 'active'), false)
  })

  test('numeric comparisons use the parsed number', () => {
    const { filter } = createFilter('age>=18')
    assert.equal(filter('age', 18), true)
    assert.equal(filter('age', 21), true)
    assert.equal(filter('age', 17), false)
    assert.equal(filter('age', '21'), true)
  })

  test('> and < work as well', () => {
    assert.equal(createFilter('age>18').filter('age', 19), true)
    assert.equal(createFilter('age<18').filter('age', 19), false)
  })

  test('bare keys test truthiness', () => {
    const { filter } = createFilter('flag')
    assert.equal(filter('flag', true), true)
    assert.equal(filter('flag', false), false)
    assert.equal(filter('flag', 'x'), true)
    assert.equal(filter('flag', undefined), false)
  })

  test('a leading ! negates truthiness', () => {
    const { filter, keys } = createFilter('!flag')
    assert.deepEqual(keys, ['flag'])
    assert.equal(filter('flag', true), false)
    assert.equal(filter('flag', false), true)
    assert.equal(filter('flag', 'x'), false)
    assert.equal(filter('flag', undefined), true)
  })

  test('=~ matches case-insensitively and survives bad regexes', () => {
    const { filter } = createFilter('name=~^ab')
    assert.equal(filter('name', 'ABC'), true)
    assert.equal(filter('name', 'zab'), false)
    assert.equal(createFilter('name=~[').filter('name', 'anything'), false)
  })
})

test.afterEach(() => cleanup())
