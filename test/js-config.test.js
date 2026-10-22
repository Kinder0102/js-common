import test, { describe } from 'node:test'
import assert from 'node:assert/strict'

import { createConfig } from '../src/js-config.js'

describe('js-config / createConfig', () => {
  test('collects from the first source that has the key', () => {
    const config = createConfig({ a: 1, b: 1 }, { a: 2, c: 2 })
    assert.deepEqual(config.get(['a', 'b', 'c']), { a: 1, b: 1, c: 2 })
  })

  test('single key may be passed as a bare string', () => {
    const config = createConfig({ a: 1 })
    assert.deepEqual(config.get('a'), { a: 1 })
  })

  test('nested keys are read by dot path but named by the last segment', () => {
    const config = createConfig({ user: { name: 'kinder' } })
    assert.deepEqual(config.get('user.name'), { name: 'kinder' })
  })

  test('missing keys are omitted from the result', () => {
    const config = createConfig({ a: 1 })
    assert.deepEqual(config.get('x'), {})
    assert.deepEqual(createConfig().get('x'), {})
  })

  test('keeps falsy values that actually exist', () => {
    const config = createConfig({ zero: 0, empty: '', no: false })
    assert.deepEqual(config.get(['zero', 'empty', 'no']), { zero: 0, empty: '', no: false })
  })

  test('later sources are not consulted once a key exists', () => {
    let touched = false
    const later = new Proxy({}, {
      get() {
        touched = true
        return 1
      },
      has() {
        touched = true
        return true
      },
    })
    createConfig({ a: 1 }, later).get('a')
    assert.equal(touched, false)
  })

  test('blank keys are rejected by assert', () => {
    const config = createConfig({ a: 1 })
    assert.throws(() => config.get(['a', '  ']), /Argument 0 must be StringArray or NonBlankString/)
    assert.throws(() => config.get(''), /Argument 0 must be StringArray or NonBlankString/)
  })

  test('nullish entries are dropped by toArray', () => {
    const config = createConfig({ a: 1 })
    assert.deepEqual(config.get([null, 'a']), { a: 1 })
    assert.deepEqual(config.get(undefined), {})
  })
})
