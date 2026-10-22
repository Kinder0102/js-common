import test, { describe } from 'node:test'
import assert from 'node:assert/strict'

import { createCache, createInstanceMap } from '../src/js-cache.js'

describe('js-cache / createCache', () => {
  test('memoises the initializer result', () => {
    let calls = 0
    const cache = createCache()
    const first = cache.get('k', () => (calls++, { id: 1 }))
    const second = cache.get('k', () => (calls++, { id: 2 }))
    assert.equal(calls, 1)
    assert.equal(first, second)
    assert.deepEqual(first, { id: 1 })
  })

  test('accepts a plain value as initializer', () => {
    const cache = createCache()
    assert.equal(cache.get('k', 'v'), 'v')
    assert.equal(cache.get('k', 'other'), 'v')
  })

  test('nullish initializer results are not cached', () => {
    let calls = 0
    const cache = createCache()
    cache.get('k', () => (calls++, null))
    cache.get('k', () => (calls++, null))
    assert.equal(calls, 2)
  })

  test('set stores raw values', () => {
    const cache = createCache()
    cache.set('k', 1)
    assert.equal(cache.get('k'), 1)
  })

  test('set with a function receives the previous value', () => {
    const cache = createCache()
    cache.set('n', 1)
    cache.set('n', prev => prev + 1)
    assert.equal(cache.get('n'), 2)
  })

  test('set with a function on a cold key receives undefined', () => {
    // createCache.get(key) without an initializer does not write to the cache, so callers get undefined.
    const cache = createCache()
    cache.set('cold', prev => String(prev))
    assert.equal(cache.get('cold'), 'undefined')
  })

  test('keys are compared by identity, so objects work', () => {
    const key = {}
    const cache = createCache()
    cache.set(key, 'v')
    assert.equal(cache.get(key), 'v')
  })
})

describe('js-cache / createInstanceMap', () => {
  test('creates once per element while condition holds', () => {
    let created = 0
    const map = createInstanceMap(() => true, el => (created++, { el }))
    const el = document.createElement('div')
    map.create(el)
    map.create(el)
    assert.equal(created, 1)
    assert.equal(map.get(el).el, el)
  })

  test('skips creation when condition is false', () => {
    let created = 0
    const map = createInstanceMap(() => false, el => (created++, { el }))
    const el = document.createElement('div')
    map.create(el)
    assert.equal(created, 0)
    assert.equal(map.get(el), undefined)
  })

  test('separate elements get separate instances', () => {
    const map = createInstanceMap(() => true, el => ({ el }))
    const a = document.createElement('div')
    const b = document.createElement('div')
    map.create(a)
    map.create(b)
    assert.notEqual(map.get(a), map.get(b))
  })

  test('rejects non-elements with an HTMLElement assertion', () => {
    const map = createInstanceMap(() => true, () => ({}))
    assert.throws(() => map.create({}), /Argument 1 must be HTMLElement/)
    assert.throws(() => map.get(null), /Argument 1 must be HTMLElement/)
  })
})
