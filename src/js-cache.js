import { HTML_ELEMENT } from './js-constant.js'
import { assert, isFunction, isElement, hasValue } from './js-utils.js'

export function createCache() {
  const cache = new Map()
  return {
    get: (key, initialize) => {
      if (cache.has(key)) {
        return cache.get(key)
      } else {
        const result = isFunction(initialize) ? initialize(key) : initialize
        hasValue(result) && cache.set(key, result)
        return result
      }
    },
    set: (key, value) => isFunction(value) ? cache.set(key, value(cache.get(key))) : cache.set(key, value),
  }
}

export function createInstanceMap(conditionCallback, createCallback) {
  const instanceMap = createCache()
  return {
    create: (el) => {
      assert(isElement(el), 1, HTML_ELEMENT)
      if (conditionCallback(el))
        instanceMap.get(el, createCallback)
    },
    get: el => {
      assert(isElement(el), 1, HTML_ELEMENT)
      return instanceMap.get(el)
    }
  }
}
