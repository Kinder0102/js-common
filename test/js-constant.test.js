import test, { describe } from 'node:test'
import assert from 'node:assert/strict'

import * as CONST from '../src/js-constant.js'

// js-constant values surface in assert messages and downstream type checks,
// so the literals are pinned here: changing them is a public-contract change.
describe('js-constant', () => {
  test('type tags keep their exact literal', () => {
    assert.deepEqual(
      {
        OBJECT: CONST.OBJECT,
        FUNCTION: CONST.FUNCTION,
        ARRAY: CONST.ARRAY,
        ARRAY_STRING: CONST.ARRAY_STRING,
        ARRAY_HTML_ELEMENT: CONST.ARRAY_HTML_ELEMENT,
        STRING_NON_BLANK: CONST.STRING_NON_BLANK,
      },
      {
        OBJECT: 'Object',
        FUNCTION: 'Function',
        ARRAY: 'Array',
        ARRAY_STRING: 'StringArray',
        ARRAY_HTML_ELEMENT: 'HTMLElementArray',
        STRING_NON_BLANK: 'NonBlankString',
      },
    )
  })

  test('DOM tags keep their exact literal', () => {
    assert.equal(CONST.DOCUMENT, 'document')
    assert.equal(CONST.HTML_ELEMENT, 'HTMLElement')
    assert.equal(CONST.HTML_INPUT, 'input')
    assert.equal(CONST.HTML_SELECT, 'select')
    assert.equal(CONST.HTML_CHECKBOX, 'checkbox')
    assert.equal(CONST.HTML_RADIO, 'radio')
  })

  test('error tags keep their exact literal', () => {
    assert.equal(CONST.ERROR_CONFIRM, 'CONFIRM')
    assert.equal(CONST.ERROR_VALIDATION, 'VALIDATION')
  })
})
