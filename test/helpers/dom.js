// Every test builds its own DOM: DOMHelper appends cloned nodes, writes
// dom-helper-filled, and leaves _removed markers plus current-index datasets,
// so a shared fixture would inevitably leak state between tests.
export function mount(first = '', second) {
  // Supports both mount(html) and mount(t, html) call styles.
  const html = typeof first === 'string' ? first : (second ?? '')
  document.body.innerHTML = html
  return document.body.firstElementChild ?? document.body
}

export function cleanup() {
  document.body.innerHTML = ''
}

// Maps the container's direct children into a readable snapshot for render assertions.
export function childrenOf(el) {
  return Array.from(el.children)
}

export function textsOf(el) {
  return Array.from(el.querySelectorAll('*'))
    .filter(el => el.children.length === 0)
    .map(el => el.textContent)
}

export function template(html) {
  const wrapper = document.createElement('div')
  wrapper.innerHTML = html
  return wrapper.querySelector('template')
}
