import test, { describe } from 'node:test'
import assert from 'node:assert/strict'

import {
  isArray,
  objectKeys,
  objectValues,
  objectEntries,
  assert as assertArg,
  hasValue,
  isBoolean,
  isTrue,
  isInteger,
  isString,
  isNotBlank,
  isFunction,
  isPromise,
  isObject,
  isElement,
  isURL,
  toArray,
  valueToString,
  stringToValue,
  split,
  startsWith,
  endsWith,
  toCamelCase,
  toKebabCase,
  findObjectValue,
  formatNumber,
  formatString,
  formatDate,
  jsonToQueryString,
  addBasePath,
  delay,
  debounce,
  throttle,
  abortable,
} from '../src/js-utils.js'

import { ARRAY, STRING_NON_BLANK } from '../src/js-constant.js'

describe('js-utils / assert', () => {
  test('passes silently on truthy condition', () => {
    assert.equal(assertArg(true), undefined)
    assert.equal(assertArg(1), undefined)
  })

  test('throws generic message when no type given', () => {
    assert.throws(() => assertArg(false), /^Error: Assertion failed$/)
    assert.throws(() => assertArg(false, 'boom'), /^Error: boom$/)
  })

  test('formats message + type list when type given', () => {
    assert.throws(
      () => assertArg(false, 0, [ARRAY, STRING_NON_BLANK]),
      /^Error: Argument 0 must be Array or NonBlankString$/,
    )
    assert.throws(() => assertArg(false, 'key', ARRAY), /^Error: Argument key must be Array$/)
  })
})

describe('js-utils / type predicates', () => {
  test('hasValue only rejects null and undefined', () => {
    assert.equal(hasValue(null), false)
    assert.equal(hasValue(undefined), false)
    assert.equal(hasValue(0), true)
    assert.equal(hasValue(''), true)
    assert.equal(hasValue(false), true)
  })

  test('isBoolean handles primitive and boxed', () => {
    assert.equal(isBoolean(true), true)
    assert.equal(isBoolean(new Boolean(false)), true)
    assert.equal(isBoolean('true'), false)
    assert.equal(isBoolean(0), false)
  })

  test('isTrue treats FALSY_VALUES as false', () => {
    for (const value of ['false', '0', 'no', 'off', '', ' FALSE ', 'No'])
      assert.equal(isTrue(value), false, `expected ${JSON.stringify(value)} falsy`)
    for (const value of ['yes', '1', 'true', 'on'])
      assert.equal(isTrue(value), true, `expected ${JSON.stringify(value)} truthy`)
    assert.equal(isTrue(true), true)
    assert.equal(isTrue(false), false)
    assert.equal(isTrue(0), false)
    assert.equal(isTrue(null), false)
    assert.equal(isTrue(undefined), false)
  })

  test('isInteger coerces strings', () => {
    assert.equal(isInteger('12'), true)
    assert.equal(isInteger(12.5), false)
    // A char / empty string becomes 0 through Number() and counts as an integer —
    // current behaviour, see KNOWN-GAPS "test gaps".
    assert.equal(isInteger(''), true)
    assert.equal(isInteger('abc'), false)
  })

  test('isString / isNotBlank / isFunction', () => {
    assert.equal(isString(''), true)
    assert.equal(isString(1), false)
    assert.equal(isNotBlank(' a '), true)
    assert.equal(isNotBlank('   '), false)
    assert.equal(isNotBlank(1), false)
    assert.equal(isFunction(() => {}), true)
    assert.equal(isFunction({}), false)
  })

  test('isPromise duck-types then + catch objects', () => {
    assert.equal(isPromise(Promise.resolve()), true)
    assert.equal(isPromise({ then() {}, catch() {} }), true)
    assert.equal(isPromise({ then() {} }), false)
    assert.equal(isPromise(null), false)
    assert.equal(isPromise(() => {}), false)
  })

  test('isObject excludes null, arrays and functions', () => {
    assert.equal(isObject({}), true)
    assert.equal(isObject([]), false)
    assert.equal(isObject(() => {}), false)
    assert.equal(isObject(null), false)
    assert.equal(isObject(new Date()), true)
  })

  test('isElement accepts Element and DocumentFragment only', () => {
    assert.equal(isElement(document.createElement('div')), true)
    assert.equal(isElement(document.createDocumentFragment()), true)
    assert.equal(isElement(document), false)
    assert.equal(isElement({}), false)
  })

  test('isURL only accepts http(s) with a host', () => {
    assert.equal(isURL('https://example.com/a?b=1'), true)
    assert.equal(isURL('http://www.example.com'), true)
    assert.equal(isURL('ftp://example.com'), false)
    assert.equal(isURL('/relative/path'), false)
    assert.equal(isURL(''), false)
  })

  test('collection re-exports behave like the originals', () => {
    assert.equal(isArray([]), true)
    assert.deepEqual(objectKeys({ a: 1 }), ['a'])
    assert.deepEqual(objectValues({ a: 1 }), [1])
    assert.deepEqual(objectEntries({ a: 1 }), [['a', 1]])
    // Non-object input returns an empty array instead of blowing up on Object.entries(null).
    assert.deepEqual(objectEntries(null), [])
    assert.deepEqual(objectEntries([]), [])
  })
})

describe('js-utils / toArray', () => {
  test('nullish becomes empty array', () => {
    assert.deepEqual(toArray(null), [])
    assert.deepEqual(toArray(undefined), [])
  })

  test('arrays are copied with nullish filtered out', () => {
    assert.deepEqual(toArray([1, null, 2, undefined]), [1, 2])
  })

  test('strings and elements are wrapped, not iterated', () => {
    assert.deepEqual(toArray('abc'), ['abc'])
    const el = document.createElement('div')
    assert.deepEqual(toArray(el), [el])
  })

  test('iterables and array-likes are expanded', () => {
    assert.deepEqual(toArray(new Set([1, 2])), [1, 2])
    assert.deepEqual(toArray({ length: 2, 0: 'a', 1: 'b' }), ['a', 'b'])
    assert.deepEqual(toArray(new Map([['a', 1]])), [['a', 1]])
  })

  test('applies mapFn and drops nullish results', () => {
    assert.deepEqual(toArray(new Set([1, 2]), v => (v === 2 ? null : v * 10)), [10])
  })
})

describe('js-utils / value conversion', () => {
  test('valueToString serialises objects and arrays', () => {
    assert.equal(valueToString({ a: 1 }), '{"a":1}')
    assert.equal(valueToString([1, 2]), '[1,2]')
    assert.equal(valueToString(0), '0')
    assert.equal(valueToString(false), 'false')
    assert.equal(valueToString(null), null)
  })

  test('stringToValue parses only object/array JSON', () => {
    assert.deepEqual(stringToValue('{"a":1}'), { a: 1 })
    assert.deepEqual(stringToValue('[1,2]'), [1, 2])
    assert.equal(stringToValue('1'), null)
    assert.equal(stringToValue('text'), null)
    assert.equal(stringToValue('{bad'), null)
    const passthrough = { a: 1 }
    assert.equal(stringToValue(passthrough), passthrough)
  })
})

describe('js-utils / split', () => {
  test('default delimiters are comma and space', () => {
    assert.deepEqual(split('a,b c'), ['a', 'b', 'c'])
    assert.deepEqual(split('  a ,, b  '), ['a', 'b'])
  })

  test('custom delimiter is matched literally', () => {
    assert.deepEqual(split('a.b.c', '.'), ['a', 'b', 'c'])
    assert.deepEqual(split('a::b', '::'), ['a', 'b'])
  })

  test('backslash escapes the next char and is preserved in output', () => {
    // split only splits, it does not unescape; unescaping is done by createProperty
    // (see js-dsl-factory).
    assert.deepEqual(split('a\\,b,c'), ['a\\,b', 'c'])
    assert.deepEqual(split('tail\\'), ['tail\\'])
  })

  test('non-strings are wrapped and nullish dropped', () => {
    assert.deepEqual(split(1), [1])
    assert.deepEqual(split(null), [])
    assert.deepEqual(split(['a', null, 'b']), ['a', 'b'])
  })

  test('blank string yields empty array', () => {
    assert.deepEqual(split('   '), [])
    assert.deepEqual(split(''), [])
  })
})

describe('js-utils / prefix and suffix', () => {
  test('returns existence plus the remainder', () => {
    assert.deepEqual(startsWith('dom-helper-index', 'dom-helper'), { exist: true, value: '-index' })
    assert.deepEqual(endsWith('attr-href', 'href'), { exist: true, value: 'attr-' })
    assert.deepEqual(startsWith('abc', 'x'), { exist: false, value: 'abc' })
  })

  test('equal-length strings are not treated as having the mark', () => {
    // The check is str.length > mark.length, so equal lengths return false.
    assert.deepEqual(startsWith('a', 'a'), { exist: false, value: 'a' })
    assert.deepEqual(endsWith('a', 'a'), { exist: false, value: 'a' })
  })

  test('asserts on blank mark', () => {
    assert.throws(() => startsWith('abc', ''), /must be NonBlankString/)
    assert.throws(() => endsWith('abc', '  '), /must be NonBlankString/)
  })

  test('non-string subject returns false with original value', () => {
    assert.deepEqual(startsWith(null, 'a'), { exist: false, value: null })
    assert.deepEqual(endsWith(undefined, 'a'), { exist: false, value: undefined })
  })
})

describe('js-utils / case conversion', () => {
  test('toCamelCase folds kebab segments', () => {
    assert.equal(toCamelCase('array-value'), 'arrayValue')
    assert.equal(toCamelCase('dom-helper-index'), 'domHelperIndex')
    assert.equal(toCamelCase('plain'), 'plain')
    assert.equal(toCamelCase(''), '')
    assert.equal(toCamelCase(null), '')
  })

  test('toKebabCase splits on every uppercase letter', () => {
    assert.equal(toKebabCase('arrayValue'), 'array-value')
    assert.equal(toKebabCase('plain'), 'plain')
    // Consecutive uppercase letters are not merged: ABC -> a-b-c (current behaviour).
    assert.equal(toKebabCase('ABC'), 'a-b-c')
    assert.equal(toKebabCase(''), '')
  })

  test('camel and kebab round-trip for lowercase segments', () => {
    for (const key of ['array-value', 'dom-helper-index', 'base-path'])
      assert.equal(toKebabCase(toCamelCase(key)), key)
  })
})

describe('js-utils / findObjectValue', () => {
  test('walks dot paths and reports the last segment as key', () => {
    assert.deepEqual(findObjectValue({ user: { name: 'kinder' } }, 'user.name'), {
      key: 'name',
      value: 'kinder',
      exist: true,
    })
  })

  test('keeps falsy leaf values as existing', () => {
    assert.deepEqual(findObjectValue({ a: 0 }, 'a'), { key: 'a', value: 0, exist: true })
    assert.deepEqual(findObjectValue({ a: '' }, 'a'), { key: 'a', value: '', exist: true })
  })

  test('falls back to a top-level key with the same last segment', () => {
    // KNOWN-GAPS #9: when a.b.c all miss it falls back to the top-level c, so
    // same-named keys across levels resolve to the wrong value.
    assert.deepEqual(findObjectValue({ a: { b: 1 }, c: 2 }, 'a.b.c'), {
      key: 'c',
      value: 2,
      exist: true,
    })
  })

  test('missing path reports exist=false', () => {
    assert.deepEqual(findObjectValue({ a: 1 }, 'x.y'), { key: 'y', value: undefined, exist: false })
  })

  test('nullish source and blank key edge cases', () => {
    assert.deepEqual(findObjectValue(null, 'a'), { key: 'a', value: null, exist: false })
    assert.deepEqual(findObjectValue({ a: 1 }, ''), { key: '', value: { a: 1 }, exist: false })
    assert.deepEqual(findObjectValue(5, ''), { key: '', value: 5, exist: true })
  })
})

describe('js-utils / formatting', () => {
  test('formatNumber applies thousand separators and fixed decimals', () => {
    assert.equal(formatNumber(1234567.891, 2), '1,234,567.89')
    assert.equal(formatNumber(1234, 0), '1,234')
    assert.equal(formatNumber(999, 0), '999')
    assert.equal(formatNumber(1234.5, 1, 2), '12,34.5')
  })

  test('formatString interpolates object and positional args', () => {
    assert.equal(formatString('{a}-{b}', { a: 1, b: 2 }), '1-2')
    assert.equal(formatString('{0}{1}', ['x', 'y']), 'xy')
    assert.equal(formatString('{nested.name}', { nested: { name: 'k' } }), 'k')
    assert.equal(formatString('{missing}', {}), '')
    assert.equal(formatString('({a})', { a: 0 }), '(0)')
  })

  test('formatString without template serialises args', () => {
    assert.equal(formatString('', { a: 1 }), '{"a":1}')
    assert.equal(formatString(null, ['a', 'b']), 'a,b')
    assert.equal(formatString('   ', []), '')
  })

  test('formatDate supports the documented tokens', () => {
    const date = new Date(2024, 2, 5, 7, 8, 9, 10)
    assert.equal(formatDate(date, 'yyyy-MM-dd HH:mm:ss'), '2024-03-05 07:08:09')
    assert.equal(formatDate(date), '2024/03/05')
    assert.equal(formatDate(date, 'yyyy/M/d'), '2024/3/5')
    assert.equal(formatDate(date, 'q'), '1')
    assert.equal(formatDate(date, 'S'), '10')
  })

  test('formatDate accepts a timestamp string', () => {
    const date = new Date(2024, 0, 2, 3, 4, 5)
    assert.equal(formatDate(String(date.getTime()), 'yyyy-MM-dd'), '2024-01-02')
  })
})

describe('js-utils / url helpers', () => {
  test('jsonToQueryString repeats array entries and drops nullish', () => {
    assert.equal(jsonToQueryString({ a: 1, b: [1, 2], c: null, d: undefined }), 'a=1&b=1&b=2')
    assert.equal(jsonToQueryString({}), '')
  })

  test('addBasePath prefixes relative urls only', () => {
    assert.equal(addBasePath('/api/list', '/base'), '/base/api/list')
    assert.equal(addBasePath('api/list', '/'), 'api/list')
    assert.equal(addBasePath('https://x.com/a', '/base'), 'https://x.com/a')
    assert.equal(addBasePath('/base/api', '/base'), '/base/api')
    assert.equal(addBasePath('', '/base'), '')
    assert.equal(addBasePath(null, '/base'), null)
  })
})

describe('js-utils / async helpers', () => {
  test('delay resolves after the given time', async t => {
    t.mock.timers.enable({ apis: ['setTimeout'] })
    let done = false
    const promise = delay(50).then(() => (done = true))
    assert.equal(done, false)
    t.mock.timers.tick(50)
    await promise
    assert.equal(done, true)
  })

  test('debounce defaults to trailing only', t => {
    t.mock.timers.enable({ apis: ['setTimeout'] })
    const calls = []
    const fn = debounce(value => calls.push(value), 100)
    fn('a')
    fn('b')
    fn('c')
    assert.deepEqual(calls, [])
    t.mock.timers.tick(100)
    assert.deepEqual(calls, ['c'])
  })

  test('debounce leading:true never fires (characterization)', t => {
    // KNOWN-GAPS: timeout is assigned a truthy handle first, so `leading && !timeout`
    // is always false: the leading branch is unreachable and trailing is blocked by
    // hasCalledLeading=false — the callback never fires.
    t.mock.timers.enable({ apis: ['setTimeout'] })
    const calls = []
    const fn = debounce(value => calls.push(value), 100, { leading: true, trailing: true })
    fn('a')
    t.mock.timers.tick(100)
    assert.deepEqual(calls, [])
  })

  test('throttle fires leading call immediately', async () => {
    const calls = []
    const fn = throttle(value => calls.push(value), 20)
    fn('a')
    fn('b')
    assert.deepEqual(calls, ['a'])
    await new Promise(resolve => setTimeout(resolve, 40))
    assert.deepEqual(calls, ['a', 'b'])
  })

  test('throttle with leading:false drops the first call (characterization)', async () => {
    // KNOWN-GAPS: on the first call remaining is always negative, so with leading=false
    // the `remaining <= 0` branch only updates lastCallTime and schedules no trailing
    // timer — the first call is silently dropped.
    const calls = []
    const fn = throttle(value => calls.push(value), 20, { leading: false })
    fn('a')
    assert.deepEqual(calls, [])

    // Only a second call inside the window reaches the trailing branch.
    await new Promise(resolve => setTimeout(resolve, 2))
    fn('b')
    assert.deepEqual(calls, [])
    await new Promise(resolve => setTimeout(resolve, 60))
    assert.deepEqual(calls, ['b'])
  })

  test('abortable rejects with AbortError on abort', async () => {
    const controller = new AbortController()
    const pending = new Promise(() => {})
    const raced = abortable(() => pending, { abort: controller })
    controller.abort()
    await assert.rejects(raced, err => err.name === 'AbortError')
  })

  test('abortable rejects immediately when already aborted', async () => {
    const controller = new AbortController()
    controller.abort()
    let called = false
    const raced = abortable(() => {
      called = true
      return Promise.resolve('never')
    }, { abort: controller })
    await assert.rejects(raced, err => err.name === 'AbortError')
    assert.equal(called, false)
  })

  test('abortable resolves with the original value when not aborted', async () => {
    const controller = new AbortController()
    assert.equal(await abortable(() => Promise.resolve('ok'), { abort: controller }), 'ok')
  })
})

// The leading:true branch of throttle (first call runs immediately, calls inside
// the window are coalesced) is not covered yet; the expected semantics with both
// leading and trailing on must be decided before adding tests.
test.todo("cover the throttle leading:true branch")
