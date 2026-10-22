import test, { describe } from 'node:test'
import assert from 'node:assert/strict'

import { createDatasetHelper } from '../src/js-dataset-helper.js'
import { mount, cleanup } from './helpers/dom.js'

describe('js-dataset-helper / createDatasetHelper (no prefix)', () => {
  const helper = createDatasetHelper()

  test('keyToInputName returns the key as-is', () => {
    assert.equal(helper.keyToInputName('value'), 'value')
  })

  test('keyToAttrName adds the data- prefix', () => {
    assert.equal(helper.keyToAttrName('value'), 'data-value')
    assert.equal(helper.keyToAttrName('array-seq'), 'data-array-seq')
  })

  test('keyToDatasetName camelises dashed keys', () => {
    assert.equal(helper.keyToDatasetName('value'), 'value')
    assert.equal(helper.keyToDatasetName('array-seq'), 'arraySeq')
  })

  test('datasetNameToKey expands camelCase back to dashed keys', () => {
    assert.equal(helper.datasetNameToKey('value'), 'value')
    assert.equal(helper.datasetNameToKey('arraySeq'), 'array-seq')
  })

  test('attr name and dataset name round-trip', () => {
    const datasetName = helper.keyToDatasetName('array-seq')
    assert.equal(helper.datasetNameToKey(datasetName), 'array-seq')
  })

  test('accepts an already prefixed attribute name', () => {
    assert.equal(helper.keyToDatasetName('data-array-seq'), 'arraySeq')
  })

  test('blank keys are rejected by assert', () => {
    assert.throws(() => helper.keyToInputName(''), /Argument 1 must be NonBlankString/)
    assert.throws(() => helper.keyToAttrName(' '), /Argument 1 must be NonBlankString/)
    assert.throws(() => helper.keyToDatasetName(undefined), /Argument 1 must be NonBlankString/)
    assert.throws(() => helper.datasetNameToKey(''), /Argument 1 must be NonBlankString/)
  })
})

describe('js-dataset-helper / prefixed helper', () => {
  const helper = createDatasetHelper('af')

  test('prefix is applied to every naming form', () => {
    assert.equal(helper.keyToInputName('value'), 'af-value')
    assert.equal(helper.keyToAttrName('value'), 'data-af-value')
    assert.equal(helper.keyToDatasetName('value'), 'afValue')
    assert.equal(helper.datasetNameToKey('afValue'), 'value')
  })

  test('camelisation works with the prefix for dashed keys', () => {
    assert.equal(helper.keyToDatasetName('array-seq'), 'afArraySeq')
    assert.equal(helper.datasetNameToKey('afArraySeq'), 'array-seq')
  })

  test('already prefixed attribute names are normalised', () => {
    assert.equal(helper.keyToDatasetName('data-af-value'), 'afValue')
  })

  test('getKeys only returns matching dataset entries', t => {
    const el = mount(t, '<div data-af-value="x" data-af-value-type="y" data-other="z"></div>')
    assert.deepEqual(helper.getKeys(el, 'value'), [
      { key: 'value', name: 'value' },
      { key: 'value-type', name: 'type' },
    ])
  })

  test('getKeys without a prefix returns every dataset entry', t => {
    const el = mount(t, '<div data-af-value="x" data-other="z"></div>')
    const keys = helper.getKeys(el).map(item => item.key)
    // Note: datasetNameToKey always strips the helper prefix, even without a name prefix.
    assert.deepEqual(keys, ['value', 'other'])
  })

  test('getKeys asserts on non-elements', () => {
    assert.throws(() => helper.getKeys({}), /Argument 1 must be HTMLElement/)
  })
})

describe('js-dataset-helper / getValue and setValue', () => {
  const helper = createDatasetHelper('af')

  test('setValue writes through the prefixed dataset key', t => {
    const el = mount(t, '<div></div>')
    helper.setValue(el, 'value', 'x')
    assert.equal(el.getAttribute('data-af-value'), 'x')
    assert.equal(helper.getValue(el, 'value'), 'x')
  })

  test('getValue falls back when the attribute is absent', t => {
    const el = mount(t, '<div></div>')
    assert.equal(helper.getValue(el, 'value', 'fallback'), 'fallback')
  })

  test('getValue tolerates a null element when a default is given', () => {
    assert.equal(helper.getValue(null, 'value', 'fallback'), 'fallback')
  })

  test('getValue asserts on non-elements when no default is given', () => {
    assert.throws(() => helper.getValue(null, 'value'), /Argument 1 must be HTMLElement/)
  })

  test('empty string values are swallowed by the || default (characterization)', t => {
    // KNOWN-GAPS #9: getValue reads with `||`, so an empty string falls back to
    // defaultValue, which contradicts "attribute present but empty".
    const el = mount(t, '<div></div>')
    helper.setValue(el, 'value', '')
    assert.equal(el.getAttribute('data-af-value'), '')
    assert.equal(helper.getValue(el, 'value', 'fallback'), 'fallback')
  })

  test('"0" survives because it is a non-empty string', t => {
    const el = mount(t, '<div></div>')
    helper.setValue(el, 'value', '0')
    assert.equal(helper.getValue(el, 'value', 'fallback'), '0')
  })

  test('setValue asserts on non-elements', () => {
    assert.throws(() => helper.setValue({}, 'value', 'x'), /Argument 1 must be HTMLElement/)
  })
})

describe('js-dataset-helper / resolveValues', () => {
  const helper = createDatasetHelper('af')

  test('collects prefixed entries and strips the name prefix', t => {
    const el = mount(t, '<div data-af-value="x" data-af-value-type="y"></div>')
    assert.deepEqual(helper.resolveValues(el, 'value'), { value: 'x', type: 'y' })
  })

  test('merges caller-supplied extras', t => {
    const el = mount(t, '<div data-af-value="x"></div>')
    assert.deepEqual(helper.resolveValues(el, 'value', { extra: 1 }), { extra: 1, value: 'x' })
  })

  test('absent attributes produce no entry rather than an empty one', t => {
    const el = mount(t, '<div data-af-value-type="y"></div>')
    assert.deepEqual(helper.resolveValues(el, 'value'), { type: 'y' })
  })

  test('present but empty attributes resolve to an empty string', t => {
    const el = mount(t, '<div data-af-value="" data-af-value-type="y"></div>')
    assert.deepEqual(helper.resolveValues(el, 'value'), { value: '', type: 'y' })
  })

  test('returns the extras untouched when nothing matches', t => {
    const el = mount(t, '<div></div>')
    assert.deepEqual(helper.resolveValues(el, 'value', { extra: 1 }), { extra: 1 })
  })
})

test.afterEach(() => cleanup())
