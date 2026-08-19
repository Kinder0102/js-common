import { STRING_NON_BLANK, FUNCTION } from './js-constant.js'
import {
	assert,
	isArray,
	isNotBlank,
	isFunction,
	hasValue,
	objectEntries,
  toArray,
	toCamelCase,
} from './js-utils.js'
import { createProperty } from './js-dsl-factory.js'
import { createDatasetHelper } from './js-dataset-helper.js'

const CONST = {
  TYPE: 'type',
  FORMAT: 'format',
  TRANSFORM: 'transform',
}

const DEFAULT_PIPLINE = {
  [CONST.TYPE]: undefined,
	[CONST.TRANSFORM]: undefined,
	[CONST.FORMAT]: undefined,
}

export default class ValueProcessor {

	static CONST = CONST

	#key
  #datasetHelper
  #piplines
  #handlers

  constructor(opts = {}) {
  	this.#key = opts.key
    this.#datasetHelper = createDatasetHelper(opts.prefix)
    this.#piplines = { ...DEFAULT_PIPLINE, ...opts.piplines }
    this.#handlers = opts.handlers ?? {}
  }

  addPipline(piplineKey, callback) {
  	assert(isNotBlank(piplineKey), 1, STRING_NON_BLANK)
  	if (hasValue(callback))
    	assert(isFunction(callback), 2, FUNCTION)
    this.#piplines[piplineKey] = callback
  }

  addHandler(piplineKey, handlerKey, callback) {
  	assert(isNotBlank(piplineKey), 1, STRING_NON_BLANK)
    assert(isNotBlank(handlerKey), 2, STRING_NON_BLANK)
    assert(isFunction(callback), 3, FUNCTION)
    if (piplineKey in this.#piplines) {
    	this.#handlers[piplineKey] ||= {}
    	this.#handlers[piplineKey][handlerKey] = callback
    }
  }

  process(el, value, key) {
    if (!hasValue(value) || toArray(value).length === 0)
      return

  	const props = this.#createProps(el, key)
    const propValue = defaultGetHandlerKey(props)

  	let result = value
  	for (const [piplineKey, getHandlerKey = defaultGetHandlerKey] of objectEntries(this.#piplines)) {
  		const handlerKey = getHandlerKey(props[piplineKey])
      const handler = this.#handlers[piplineKey]?.[handlerKey] ?? this.#handlers[piplineKey]?.fallback
  		result = handler?.(result, propValue, props) ?? result
  	}
  	return result
  }

  #createProps(el, key) {
    const selectedKey = key ?? this.#key
  	const dslProps = createProperty(this.#datasetHelper.getValue(el, selectedKey))
  	const attrProps = this.#datasetHelper.resolveValues(el, selectedKey)

    let result = {
      ...dslProps,
      get: propName => defaultGetHandlerKey(result[propName])
    }

  	delete attrProps[toCamelCase(selectedKey)]
  	for (const [name, value] of objectEntries(attrProps)) {
  		result[name] = createProperty(value)
  	}
  	return result
  }
}

function defaultGetHandlerKey(props) {
	return isArray(props) ? props[0] : props?.value[0] ?? props
}

globalThis.ValueProcessor = ValueProcessor
