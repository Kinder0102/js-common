import test, { describe } from 'node:test'
import assert from 'node:assert/strict'

import { PluginHost, Plugin } from '../src/js-plugin.js'
import { mount, cleanup } from './helpers/dom.js'

const tick = (ms = 20) => new Promise(resolve => setTimeout(resolve, ms))

describe('js-plugin / handshake', () => {
  test('a plugin registers itself with the host and can receive broadcasts', async t => {
    const hostRoot = mount(t, '<div></div>')
    const pluginRoot = document.createElement('div')
    const host = new PluginHost(hostRoot)
    const received = []
    pluginRoot.addEventListener('ping', event => received.push(event.detail))

    const plugin = new Plugin('demo-plugin', pluginRoot, () => { })
    host.addPlugin(pluginRoot, 400, 5)
    await host.ready()

    host.broadcast('ping', { n: 1 })
    assert.deepEqual(received, [{ n: 1 }])
    assert.ok(plugin)
  })

  test('messages queued before registration are flushed afterwards', async t => {
    const hostRoot = mount(t, '<div></div>')
    const pluginRoot = document.createElement('div')
    const received = []
    hostRoot.addEventListener('queued', event => received.push(event.detail))

    const plugin = new Plugin('queue-plugin', pluginRoot, () => { })
    plugin.broadcast('queued', 1)

    const host = new PluginHost(hostRoot)
    host.addPlugin(pluginRoot, 400, 5)
    await host.ready()

    assert.deepEqual(received, [1])
  })

  test('broadcast also reaches the host roots once registered', async t => {
    const hostRoot = mount(t, '<div></div>')
    const pluginRoot = document.createElement('div')
    const received = []
    hostRoot.addEventListener('from-plugin', event => received.push(event.detail))

    const plugin = new Plugin('host-broadcast', pluginRoot, () => { })
    const host = new PluginHost(hostRoot)
    host.addPlugin(pluginRoot, 400, 5)
    await host.ready()

    plugin.broadcast('from-plugin', 'payload')
    assert.deepEqual(received, ['payload'])
  })

  test('a promise-returning initialize defers registration', async t => {
    const hostRoot = mount(t, '<div></div>')
    const pluginRoot = document.createElement('div')
    let release
    const gate = new Promise(resolve => { release = resolve })

    const plugin = new Plugin('async-plugin', pluginRoot, () => gate)
    const host = new PluginHost(hostRoot)
    host.addPlugin(pluginRoot, 400, 5)

    let ready = false
    host.ready().then(() => { ready = true })
    await tick(30)
    assert.equal(ready, false)

    release()
    await host.ready()
    assert.equal(ready, true)
    assert.ok(plugin)
  })

  test('broadcast without any plugin is a no-op', t => {
    const hostRoot = mount(t, '<div></div>')
    const host = new PluginHost(hostRoot)
    assert.doesNotThrow(() => host.broadcast('nothing', 1))
  })
})

describe('js-plugin / timeout handling', () => {
  test('unregistered plugins time out and are dropped', async t => {
    const hostRoot = mount(t, '<div></div>')
    const orphan = document.createElement('div')
    const host = new PluginHost(hostRoot)

    const errors = []
    const originalError = console.error
    console.error = (...args) => errors.push(args.join(' '))
    try {
      host.addPlugin(orphan, 25, 5)
      await host.ready()
    } finally {
      console.error = originalError
    }

    assert.equal(errors.length, 1)
    assert.match(errors[0], /Plugin failed to register in time/)
  })

  test('ready resolves immediately when nothing is pending', async t => {
    const hostRoot = mount(t, '<div></div>')
    const host = new PluginHost(hostRoot)
    let ready = false
    host.ready().then(() => { ready = true })
    await tick(0)
    assert.equal(ready, true)
  })
})

describe('js-plugin / argument validation', () => {
  test('PluginHost requires an element root', () => {
    assert.throws(() => new PluginHost(null), /Argument 0 must be HTMLElement/)
    assert.throws(() => new PluginHost('div'), /Argument 0 must be HTMLElement/)
  })

  test('addPlugin requires an element root', t => {
    const hostRoot = mount(t, '<div></div>')
    const host = new PluginHost(hostRoot)
    assert.throws(() => host.addPlugin(null), /Argument 0 must be HTMLElement/)
  })

  test('Plugin requires a name and an element root', t => {
    const root = mount(t, '<div></div>')
    assert.throws(() => new Plugin('', root), /Argument 0 must be NonBlankString/)
    assert.throws(() => new Plugin('name', null), /Argument 1 must be HTMLElement/)
  })
})

test.afterEach(() => cleanup())
