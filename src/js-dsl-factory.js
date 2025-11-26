import { FUNCTION } from './js-constant.js'
import {
  isURL,
  isNotBlank,
  isFunction,
  isObject,
  isBoolean,
  isTrue,
  isElement,
  hasValue,
  toArray,
  valueToString,
  objectKeys,
  objectEntries,
  split,
  findObjectValue
} from './js-utils.js'

import { querySelector } from './js-dom-utils.js'
import { createCache } from './js-cache.js'

const PROPERTY_CACHE = createCache()
const TEMPLATE_CACHE = createCache()
const FILTER_CACHE = createCache()

export const createProperty = props => {
  return toArray(props || '').map(prop => {
    if (isObject(prop)) {
      return prop
    } else if (isFunction(prop)) {
      return { type: [FUNCTION], value: [prop] }
    } else {
      return PROPERTY_CACHE.get(prop, () => {
        let result = { type: [], value: [] }
        split(prop, '|').forEach(token => {
          if (isURL(token)) {
            result.value.push(token)
          } else {
            let [key, value] = token.includes(':') ? split(token, ':') : [null, token]
            const escapedKey = key?.replace(/\\(.)/g, '$1')
            const values = split(value, ',').map(value => value.replace(/\\(.)/g, '$1'))
            isNotBlank(escapedKey) ? (result[escapedKey] = values) : result.value.push(...values)
          }
        })
        return result
      })
    }
  })
}

export const createTemplateHandler = templateProp => {
  return TEMPLATE_CACHE.get(templateProp, () => {
    let handler = {}
    if (isElement(templateProp)) {
      handler.getTemplate = item => templateProp
    } else if (!isNotBlank(templateProp)) {
      handler.getTemplate = createDefaultTemplate
    } else {
      const props = createProperty(templateProp)[0]
      const templateTags = querySelector('template').map(elem => elem.content)
      const selectors = objectEntries(props).reduce((acc, [ key, values ]) => {
        if (key.includes('.')) {
          const [enumType, enumValue] = split(key, '.')
          acc[enumType] ||= {}
          acc[enumType][enumValue] = props[key][0]
        }
        return acc
      }, {})

      handler.getTemplate = item => {
        let selector = props.value[0]
        for (const [key, values] of objectEntries(selectors)) {
          const { exist, value } = findObjectValue(item, key)
          if (exist && hasValue(values[value])) {
            selector = values[value]
            break
          }
        }
        let result = templateTags.map(tag => querySelector(selector, tag)).flat()[0]?.cloneNode?.(true)
        result ||= createDefaultTemplate(item)
        result.removeAttribute?.('id')
        return result
      }
    }
    return handler
  })
}

export const createFilter = filterProp => {
  const props = createProperty(filterProp)[0]
  const comparables = props.value.reduce((acc, prop) => {
    const comparable = Comparable.create(prop)
    acc[comparable.key] ||= []
    acc[comparable.key].push(comparable)
    return acc
  }, {})
  const keys = objectKeys(comparables)

  return {
    keys,
    filter: (key, value) => {
      return keys.includes(key) && comparables[key].reduce(
        (acc, comparable) => acc && comparable.compare(value),
        true)
    }
  }
}

function createDefaultTemplate(data) {
  const template = document.createElement('span')
  template.textContent = valueToString(data)
  return template
}

class Comparable {
  static OPERATORS = ['=~', '==', '!=', '>=', '<=', '>', '<', '=']
  static NOT_PREFIX = /^!/
  static create = prop => FILTER_CACHE.get(prop, (key) => new Comparable(key))

  #operator
  #values

  constructor(prop) {
    this.key = prop

    if (Comparable.NOT_PREFIX.test(prop)) {
      this.key = prop.slice(1)
      this.#operator = '!'
    }

    for (const operator of Comparable.OPERATORS) {
      if (!prop.includes(operator))
        continue
      
      const [key, values] = prop.split(operator)
      this.key = key
      this.#operator = operator
      this.#values = split(values).map(value => {
        if (value === 'true') {
          return true
        } else if (value === 'false') {
          return false
        } else if (!isNaN(value)) {
          return Number(value)
        } else {
          return value
        }
      })
      break
    }
  }

  compare(value) {
    if (!isNotBlank(this.#operator))
      return isBoolean(value) ? isTrue(value) : hasValue(value)
    if (this.#operator === '!')
      return isBoolean(value) ? !isTrue(value) : !hasValue(value)

    return this.#values.map(item => {
      switch (this.#operator) {
        case '!=': return value != item
        case '>=': return value >= item
        case '<=': return value <= item
        case '>': return value > item
        case '<': return value < item
        case '=~':
          try {
            return new RegExp(item, 'i').test(String(value))
          } catch (_) {
            return false
          }
        case '==':
        case '=':
          return value == item
      }
    })
    .filter(hasValue)
    .reduce((acc, item) => acc || item, false)
  }
}
