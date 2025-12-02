import {
  ARRAY,
  ARRAY_HTML_ELEMENT,
  STRING_NON_BLANK,
  FUNCTION,
  DOCUMENT,
  HTML_ELEMENT,
} from './js-constant.js'

import {
  assert,
  isObject,
  isArray,
  isNotBlank,
  isFunction,
  isElement,
  toArray,
  objectValues,
  split,
  startsWith
} from './js-utils.js'

export function elementIs(el, type) {
  if (!isElement(el))
    return false

  const types = toArray(type)
  return types.includes(el.tagName.toLowerCase()) || types.includes(el.type)
}

export function hasClass(el, classname) {
  return isElement(el) && isNotBlank(classname) && el.classList?.contains(classname)
}

export function addClass(el, classname) {
  assert(isElement(el), 1, HTML_ELEMENT)
  split(classname).forEach(token => el.classList?.add(token))
}

export function removeClass(el, classname) {
  assert(isElement(el), 1, HTML_ELEMENT)
  split(classname).forEach(token => el.classList?.remove(token))
}

export function querySelector(selectors, el, includeSelf = false) {
  const result = new Set()
  const root = isElement(el) ? el : document
  const includeRoot = includeSelf && root !== document

  for (const selector of toArray(selectors)) {
    if (isElement(selector)) {
      result.add(selector)
    } else if (isNotBlank(selector)) {
      try {
        includeRoot && root.matches(selector) && result.add(root)
        root.querySelectorAll(selector).forEach(elem => result.add(elem))
      } catch(_) { }
    }
  }
  return toArray(result)
}

export function getTargets(targets, el) {
  const result = new Set()

  for (const target of split(targets, ',')) {
    if (isElement(target)) {
      result.add(target)
    } else {
      const selectors = split(target, ' ')
      const handlers = {
        self: values => values,
        parent: values => values.map(elem => elem.parentElement),
        children: values => values.flatMap(elem => toArray(elem.children)),
        closest: values => {
          closest = true
          return values
        }
      }
      let closest = false
      let elems = selectors[0] in handlers ? [el] : [document]
      
      for (const selector of selectors) {
        const handler = handlers[selector] ?? (values => {
          if (closest) {
            closest = false
            return values.map(elem => elem.closest(selector))
          } else {
            return values.flatMap(elem => querySelector(selector, elem))
          }
        })
        elems = handler(elems).filter(isElement)
      }
      !closest && elems.forEach(elem => result.add(elem))
    }
  }
  return toArray(result)
}

export function showElements(elements) {
  checkElements(elements).forEach(elem => {
    removeClass(elem, 'hidden')
    elem.style.display = ''
  })
}

export function hideElements(elements) {
  checkElements(elements).forEach(elem => {
    addClass(elem, 'hidden')
    elem.style.display = 'none'
  })
}

export function enableElements(elements) {
  checkElements(elements)
    .forEach(elem => elem.removeAttribute('disabled'))
}

export function disableElements(elements) {
  checkElements(elements)
    .forEach(elem => elem.setAttribute('disabled', ''))
}

export function registerMutationObserver(callback, target) {
  const root = isElement(target) ? target : document.body
  const observer = new MutationObserver(mutations =>
    mutations.forEach(({ addedNodes }) =>
      addedNodes.forEach(callback)))
  observer.observe(root, { childList: true, subtree: true })
  return observer
}


export function registerAttributeChange(el, attrName, callback) {
  const observer = new MutationObserver(mutations => mutations.forEach(({ type, attributeName }) => {
    if (type === 'attributes' && startsWith(attributeName, attrName).exist)
      callback()
  }))
  observer.observe(el, { attributes: true })
  return observer
}

export function registerEvent(elements, eventName, callback, options) {
  assert(isArray(eventName) || isNotBlank(eventName), 2, [ARRAY, STRING_NON_BLANK])
  assert(isFunction(callback), 3, FUNCTION)

  const events = split(eventName)
  checkElements(elements).forEach(elem => {
    events.forEach(event => elem.addEventListener(event, callback, options))
  })
}

export function triggerEvent(elements, eventName, payload) {
  assert(isNotBlank(eventName), 2, STRING_NON_BLANK)
  
  const event = new CustomEvent(eventName, { detail: payload })
  checkElements(elements).forEach(elem => elem.dispatchEvent(event))
}

export function stopDefaultEvent(event) {
  event?.preventDefault?.()
  event?.stopPropagation?.()
}

function checkElements(elements) {
  let result = []
  if (isArray(elements)) {
    elements.forEach(elem => isElement(elem) && result.push(elem))
  } else if (elements === document || isElement(elements)) {
    result.push(elements)
  } else if (isObject(elements)) {
    for (const value of objectValues(elements))
      result.push(...checkElements(value))
  } else {
    assert(false, 1, [DOCUMENT, HTML_ELEMENT, ARRAY_HTML_ELEMENT])
  }
  return result
}
