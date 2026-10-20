import { HTML_ELEMENT, HTML_INPUT, HTML_SELECT, HTML_CHECKBOX } from './js-constant.js'

import {
  assert,
  hasValue,
  isTrue,
  isNotBlank,
  isArray,
  isObject,
  isElement,
  objectEntries,
  valueToString,
  stringToValue,
  split,
  toArray,
  findObjectValue,
  formatNumber,
  formatString,
  formatDate,
  startsWith,
  endsWith,
  addBasePath,
  toCamelCase
} from './js-utils.js'

import {
  elementIs,
  hasClass,
  addClass,
  querySelector,
  showElements,
  hideElements
} from './js-dom-utils.js'

import { createDatasetHelper } from './js-dataset-helper.js'
import { createProperty, createFilter, createTemplateHandler } from './js-dsl-factory.js'
import { createCache } from './js-cache.js'
import ValueProcessor from './js-value-processor.js'

const CLASS_NAME = 'dom-helper'
const CREATE_CLASS_NAME = `${CLASS_NAME}-create`
const FILLED_CLASS_NAME = `${CLASS_NAME}-filled`
const REMOVE_CLASS_NAME = `${CLASS_NAME}-remove`
const LAST_CLASS_NAME = `${CLASS_NAME}-last`
const ATTR_IGNORE_KEYS = ['format', 'enum', 'value-type']
const ATTR_BOOLEAN_KEYS = ['disabled', 'readonly', 'required', 'checked', 'multiple', 'autofocus']
const ATTR_SEQ = 'array-seq'
const TEMPLATE_KEY = 'template'
const PARENT_KEY = 'parent'

let FIND_VALUE_HANDLERS = {
  value: (value, key) => value,
  index: (value, key, el, helper) =>
    split(helper.getValue(el.closest(`[${helper.keyToAttrName(ATTR_SEQ)}]`), ATTR_SEQ, ''))[key.split(PARENT_KEY).length - 1],
}

let SET_VALUE_HANDLERS = {
  input: (el, value) => el.type === HTML_CHECKBOX ? (el.checked = isTrue(value)) : (el.value = value),
  select: (el, value) => el.value = value,
  img: (el, value) => el.src = value,
  iframe: (el, value) => el.src = value,
  object: (el, value) => el.data = value,
  source: (el, value) => el.srcset = value,
  a: (el, value, props) => el.href = addBasePath(value, props.basePath),
  form: (el, value, props) => el.action = addBasePath(value, props.basePath),
  fallback: (el, value) => el.textContent = value
}

let PROCESSOR_HANDLERS = {
  type: {
    date: (values, _, props) => formatString(props.get('format'), values.map(value => formatDate(value, props.get('typeFormat')))),
    number: (values, _, props) => formatString(props.get('format'), processEnum(props.get('enum'), processNumber(values.reduce((a, b) => a + Number(b), 0), props.get('typeFormat')))),
    fallback: (values, _, props) => formatString(props.get('format'), processEnum(props.get('enum'), replaceString(values, props.get('typeFormat')))),
  },
}

export default class DOMHelper {

  #prefix
  #basePath
  #datasetHelper
  #valueProcessor
  #valueTypeProcessor
  #classProcessor
  #attrProcessor

  constructor(opts = {}) {
    const { prefix, basePath } = opts
    this.#prefix = prefix
    this.#basePath = basePath ?? '/'
    this.#datasetHelper = createDatasetHelper(prefix)
    
    const handlers = { ...PROCESSOR_HANDLERS }
    this.#valueProcessor = new ValueProcessor({ key: 'value', prefix, handlers })
    this.#classProcessor = new ValueProcessor({ key: 'class', prefix, handlers })
    this.#attrProcessor = new ValueProcessor({ prefix, handlers})
  }

  setValueToElement(el, value, opts = {}) {
    assert(isElement(el), 1, HTML_ELEMENT)

    const { template, group = 'item' } = opts
    const { getValue } = this.#datasetHelper
    const templateProp = template || getValue(el, TEMPLATE_KEY)

    if (isArray(value) || isNotBlank(templateProp)) {
      let result = this.#setArrayToElement(el, toArray(value), templateProp)
      const { empty: [empty] = [] } = createProperty(getValue(el, TEMPLATE_KEY))
      if (result.length === 0 && isNotBlank(empty))
        result = this.#setArrayToElement?.(el, [{}], empty)
      result.forEach(elem => addClass(elem, `${CREATE_CLASS_NAME}-${group}`))
    } else {
      this.#setValueToElement(el, value)
    }
  }

  clearElement(el, group = 'item') {
    const createClassName = `${CREATE_CLASS_NAME}-${group}`
    assert(isElement(el), 1, HTML_ELEMENT)
    querySelector(`.${REMOVE_CLASS_NAME}`, el, true).forEach(elem => elem.remove())
    if (hasClass(el, createClassName)) {
      hasClass(el, createClassName) && el?.remove?.()
    } else {
      querySelector(`.${createClassName}`, el, true).forEach(create => create.remove())
      querySelector(`.${FILLED_CLASS_NAME}`, el, true).forEach(fill => this.#setValue(fill, ''))
    }
  }

  #setValueToElement(el, value) {
    if (!hasValue(value))
      return

    this.#setDisplay(el, value)
    const { getKeys, keyToAttrName } = this.#datasetHelper
    const attrKey = 'attr'
    const attrElems = querySelector('*', el, true)
    attrElems.forEach(elem => getKeys(elem, attrKey)
      .filter(({ key }) => !ATTR_IGNORE_KEYS.some(attr => endsWith(key, attr).exist))
      .forEach(({ key }) => this.#fillElement(elem, value, key, this.#setAttr.bind(this))))

    const classKey = 'class'
    const classElems = querySelector(`[${keyToAttrName(classKey)}]`, el, true)
    classElems.forEach(elem => this.#fillElement(elem, value, classKey, this.#setClass.bind(this)))

    const valueKey = 'value'
    const valueElems = querySelector(`[${keyToAttrName(valueKey)}]`, el, true)
    valueElems.forEach(elem => this.#fillElement(elem, value, valueKey, this.#setValue.bind(this)))
  }

  #setArrayToElement(el, arr, template) {
    const result = []
    const { getValue, setValue } = this.#datasetHelper
    const templateProp = template || getValue(el, TEMPLATE_KEY)
    const valueName = getValue(el, 'array-value')
    const attrSeqSelector = this.#datasetHelper.keyToAttrName(ATTR_SEQ)

    getArray(arr, getValue(el, 'array-index')).forEach(data => {
      const { value } = findObjectValue(data, valueName)
      let child
      if (isArray(value)) {
        child = document.createDocumentFragment()
        this.#setArrayToElement(child, value, templateProp)
      } else if (!hasValue(templateProp) && elementIs(el, [HTML_INPUT, HTML_SELECT])) {
        el.value = value
      } else {
        child = createTemplateHandler(templateProp).getTemplate(value)
        const seqPath = getValue(el.closest(`[${attrSeqSelector}]`), ATTR_SEQ, '')
        const currentIndex = querySelector(`:scope > [${attrSeqSelector}]`, el).length
        setValue(child, ATTR_SEQ, `${currentIndex + 1},${seqPath}`)
        this.setValueToElement(child, value)
      }

      if (isElement(child) && !child._removed) {
        const lastItem = querySelector(`.${LAST_CLASS_NAME}`, el)[0]
        isElement(lastItem) ? lastItem.before(child) : el.append(child)
        result.push(child)
      }
    })
    return result
  }

  #setDisplay(el, data) {
    const { keyToAttrName, getValue } = this.#datasetHelper

    const hiddenKey = 'hidden'
    querySelector(`[${keyToAttrName(hiddenKey)}]`, el, true).forEach(elem =>
      reduceFilter(data, getValue(elem, hiddenKey)) ? hideElements(elem) : showElements(elem))

    const filterKey = 'filter'
    querySelector(`[${keyToAttrName(filterKey)}]`, el, true).forEach(elem => {
      if (!reduceFilter(data, getValue(elem, filterKey))) {
        elem.remove()
        elem._removed = true
      }
    })
  }

  #fillElement(el, obj, datasetName, fillHandler) {
    const attrValue = this.#datasetHelper.getValue(el, datasetName, '')
    const { value: keys, name: attr } = createProperty(attrValue)
    const arrayValues = []
    const values = []

    keys.forEach(key => {
      const { exist: isStartWith, value: type } = startsWith(key, `${CLASS_NAME}`)
      const { exist, value } = isStartWith
        ? (() => {
          const [_, handler] = objectEntries(FIND_VALUE_HANDLERS).find(([name]) => type.includes(name)) || []
          const value = handler?.(obj, key, el, this.#datasetHelper)
          return { exist: hasValue(value), value }
        })()
        : findObjectValue(obj, key)

      if (!exist) {
      } else if (isArray(value)) {
        arrayValues.push(value)
      } else {
        values.push(valueToString(value))
      }
    })
    fillHandler(el, values, arrayValues, attr?.[0] ?? datasetName)
  }

  #setClass(el, value, arrayValues) {
    split(this.#classProcessor.process(el, value))
      .filter(isNotBlank)
      .forEach(value => addClass(el, value))
  }

  #setAttr(el, value, arrayValues, attrName) {
    let tag = attrName.replace('attr-', '')
    const valueFormat = this.#attrProcessor.process(el, value, attrName)
    if (hasValue(valueFormat)) {
      !tag.includes('data-') && (tag = toCamelCase(tag))
      if (ATTR_BOOLEAN_KEYS.includes(tag)) {
        isTrue(valueFormat) ? el.setAttribute(tag, true) : el.removeAttribute(tag)
      } else {
        el.setAttribute(tag, valueFormat)
      }
    }
  }

  #setValue(el, value, arrayValues) {
    if (arrayValues?.length > 0) {
      arrayValues.forEach(value => this.#setArrayToElement(el, value))
    } else {
      addClass(el, FILLED_CLASS_NAME)
      const valueFormat = this.#valueProcessor.process(el, toArray(value))
      const handler = SET_VALUE_HANDLERS[el.tagName?.toLowerCase()] || SET_VALUE_HANDLERS.fallback
      if (hasValue(valueFormat))
        handler(el, valueFormat, { basePath: this.#basePath })
    }
  }
}

function getArray(arr, index) {
  if (!isArray(arr))
    return []
  if (hasValue(index)) {
    return toArray((index === 'first') ? arr[0] : (index === 'last') ? arr[arr.length - 1] : arr[index])
  } else {
    return arr
  }
}

function reduceFilter(data, props) {
  const filter = createFilter(props)
  return filter.keys.reduce((isValid, key) => {
    const { value } = findObjectValue(data, key)
    return isValid && filter.filter(key, value)
  }, true)
}

function replaceString(inputs, typeFormat) {
  const format = createProperty(typeFormat)
  const value = format.value[0]
  const pattern = new RegExp(format.pattern?.[0] ?? /\.\w+$/, 'gi')
  return toArray(inputs).map(input => isNotBlank(value) ? input.replace(pattern, value) : input)
}

function processNumber(input, typeFormat) {
  const format = createProperty(typeFormat)
  format['*']?.forEach(value => input *= Number(value))
  format['/']?.forEach(value => input /= Number(value))
  format['+']?.forEach(value => input += Number(value))
  format['-']?.forEach(value => input -= Number(value))
  return formatNumber(input, format['.']?.[0])
}

function processEnum(enumProps, args = []) {
  let enums = {}
  if (isNotBlank(enumProps)) {
    if (isObject(window[enumProps])) {
      enums = window[enumProps]
    } else {
      const el = querySelector(enumProps)[0]
      if (isElement(el)) {
        if (hasValue(el.options)) {
          toArray(el.options).forEach(({ value, text }) => (enums[value] = text))
        } else {
          enums = stringToValue(el.value)
        }
      } else {
        enums = createProperty(enumProps)
      }
    }
  } else if (isObject(enumProps)) {
    enums = enumProps
  } else {
    return args
  }
  
  return toArray(args).map(key => toArray(enums[key] ?? enums.default ?? key)[0])
}

globalThis.DOMHelper = DOMHelper

