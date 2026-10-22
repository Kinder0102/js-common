import test, { describe } from 'node:test'
import assert from 'node:assert/strict'

import ValueProcessor from '../src/js-value-processor.js'
import { mount, cleanup } from './helpers/dom.js'

const makeProcessor = (opts = {}) => new ValueProcessor({ key: 'value', prefix: 'af', ...opts })

describe('js-value-processor / process guards', () => {
  test('nullish and empty-array values short-circuit to undefined', t => {
    const el = mount(t, '<div></div>')
    const processor = makeProcessor()
    assert.equal(processor.process(el, undefined), undefined)
    assert.equal(processor.process(el, null), undefined)
    assert.equal(processor.process(el, []), undefined)
  })

  test('empty strings still flow through the pipelines (characterization)', t => {
    // hasValue('') is true and toArray('') has length 1, so an empty string is not short-circuited.
    const el = mount(t, '<div></div>')
    const seen = []
    const processor = makeProcessor({
      handlers: { type: { fallback: value => (seen.push(value), value) } },
    })
    assert.equal(processor.process(el, ''), '')
    assert.deepEqual(seen, [''])
  })

  test('falsy but present values are processed', t => {
    const el = mount(t, '<div></div>')
    const seen = []
    const processor = makeProcessor({
      handlers: { type: { fallback: value => (seen.push(value), value) } },
    })
    assert.equal(processor.process(el, 0), 0)
    assert.deepEqual(seen, [0])
  })

  test('returns the value untouched when no handler applies', t => {
    const el = mount(t, '<div></div>')
    assert.equal(makeProcessor().process(el, 'raw'), 'raw')
  })
})

describe('js-value-processor / type pipeline', () => {
  test('selects the handler named by the data attribute', t => {
    const el = mount(t, '<div data-af-value="type:list"></div>')
    const processor = makeProcessor({
      handlers: { type: { list: value => value.map(item => item * 2) } },
    })
    assert.deepEqual(processor.process(el, [1, 2]), [2, 4])
  })

  test('unknown handler keys fall back to the fallback handler', t => {
    const el = mount(t, '<div data-af-value="type:nope"></div>')
    const processor = makeProcessor({
      handlers: { type: { fallback: value => `fb:${value}` } },
    })
    assert.equal(processor.process(el, 'x'), 'fb:x')
  })

  test('a handler returning undefined keeps the running result', t => {
    const el = mount(t, '<div data-af-value="type:none"></div>')
    const processor = makeProcessor({
      handlers: { type: { none: () => undefined } },
    })
    assert.equal(processor.process(el, 'x'), 'x')
  })

  test('the key argument overrides the configured key', t => {
    const el = mount(t, '<div data-af-value="type:list" data-af-other="type:upper"></div>')
    const processor = makeProcessor({
      handlers: {
        type: {
          list: () => 'from-value',
          upper: value => value.toUpperCase(),
        },
      },
    })
    assert.equal(processor.process(el, 'abc', 'other'), 'ABC')
  })
})

describe('js-value-processor / pipeline ordering', () => {
  test('runs type, transform then format', t => {
    const el = mount(t, '<div data-af-value="type:a|format:b|transform:c"></div>')
    const processor = makeProcessor({
      handlers: {
        type: { a: value => `${value}-type` },
        format: { b: value => `${value}-format` },
        transform: { c: value => `${value}-transform` },
      },
    })
    // DEFAULT_PIPELINE key order is type -> transform -> format (characterization).
    assert.equal(processor.process(el, 'start'), 'start-type-transform-format')
  })

  test('custom pipelines run after the built-ins', t => {
    const el = mount(t, '<div data-af-value="type:a|extra:z"></div>')
    const processor = makeProcessor({
      handlers: {
        type: { a: value => `${value}-type` },
        extra: { z: value => `${value}-extra` },
      },
    })
    processor.addPipeline('extra')
    assert.equal(processor.process(el, 'v'), 'v-type-extra')
  })

  test('pipeline handlers receive the resolved prop value and props helper', t => {
    const el = mount(t, '<div data-af-value="type:list"></div>')
    let captured
    const processor = makeProcessor({
      handlers: {
        type: {
          list: (value, propValue, props) => {
            captured = { propValue, type: props.get('type'), missing: props.get('missing') }
            return value
          },
        },
      },
    })
    processor.process(el, 'x')
    assert.equal(captured.type, 'list')
    assert.equal(captured.missing, undefined)
  })

  test('dataset siblings become readable props', t => {
    const el = mount(t, '<div data-af-value="type:list" data-af-value-xs="sm"></div>')
    let xs
    const processor = makeProcessor({
      handlers: {
        type: { list: (value, propValue, props) => ((xs = props.get('xs')), value) },
      },
    })
    processor.process(el, 'x')
    assert.equal(xs, 'sm')
  })
})

describe('js-value-processor / registration guards', () => {
  test('addPipeline validates its arguments', async () => {
    const { default: ValueProcessorClass } = await import('../src/js-value-processor.js')
    const processor = new ValueProcessorClass({ key: 'value' })
    assert.throws(() => processor.addPipeline('', () => { }), /Argument 1 must be NonBlankString/)
    assert.throws(() => processor.addPipeline('k', 'nope'), /Argument 2 must be Function/)
    assert.doesNotThrow(() => processor.addPipeline('k', undefined))
  })

  test('addHandler validates its arguments', () => {
    const processor = makeProcessor()
    assert.throws(() => processor.addHandler('', 'k', () => { }), /Argument 1 must be NonBlankString/)
    assert.throws(() => processor.addHandler('type', '', () => { }), /Argument 2 must be NonBlankString/)
    assert.throws(() => processor.addHandler('type', 'k', 'nope'), /Argument 3 must be Function/)
  })

  test('handlers for unregistered pipelines are silently dropped (characterization)', t => {
    // addHandler only writes when pipelineKey already exists; an unknown pipeline
    // neither throws nor takes effect.
    const el = mount(t, '<div data-af-value="type:a"></div>')
    const processor = makeProcessor()
    processor.addHandler('ghost', 'a', () => 'should-not-run')
    assert.equal(processor.process(el, 'x'), 'x')
  })
})

describe('js-value-processor / module surface', () => {
  test('CONST exposes the pipeline names', () => {
    assert.deepEqual(ValueProcessor.CONST, { TYPE: 'type', FORMAT: 'format', TRANSFORM: 'transform' })
  })

  test('the class is published on globalThis', () => {
    // Written to globalThis at module load — a pre-existing browser-side side effect.
    assert.equal(globalThis.ValueProcessor, ValueProcessor)
  })
})

test.afterEach(() => cleanup())
