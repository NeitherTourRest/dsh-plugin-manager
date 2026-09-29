/**
 * Verification harness for packages/dsh-client-ui-ball.
 * Loads the hand-written browser half inside jsdom against a mocked Cordis
 * client context, and asserts the registration protocol, the ctx.ball service
 * contract, the mascot rendering, drag/click behaviour, panel hosting, the
 * Plugins-page configuration card, and full teardown.
 *
 * Run from the repository root (jsdom resolves from its node_modules):
 *   node test/verify-ball.mjs
 *
 * Repository-local test tooling: not part of the plugin package.
 */
import { readFileSync } from 'node:fs'
import { JSDOM, VirtualConsole } from 'jsdom'

const results = []
const check = (name, condition, detail) => {
  results.push({ name, ok: Boolean(condition), detail })
}

const virtualConsole = new VirtualConsole()
virtualConsole.on('jsdomError', () => {}) // jsdom's CSS parser rejects modern properties; irrelevant here.

const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
  url: 'https://ball.test/',
  runScripts: 'outside-only',
  pretendToBeVisual: true,
  virtualConsole,
})
const { window } = dom

const registrations = []
window.__ModuleLoader__ = { mode: 'queue', pendingQueue: registrations, load: r => registrations.push(r), create: () => {} }

// jsdom implements neither PointerEvent nor pointer capture; these stand-ins
// let the production handlers run unmodified.
window.HTMLElement.prototype.setPointerCapture = function () {}
window.HTMLElement.prototype.releasePointerCapture = function () {}
const pointer = (type, x, y) => {
  const event = new window.MouseEvent(type, { bubbles: true, clientX: x, clientY: y })
  Object.defineProperty(event, 'pointerId', { value: 1 })
  return event
}

// --- a React stand-in: the card only needs element construction and hooks ---
const reactStub = {
  createElement: (type, props, ...children) => ({ type, props: props ?? {}, children }),
  useState: (initial) => [typeof initial === 'function' ? initial() : initial, () => {}],
  useEffect: () => {},
  useRef: () => ({ current: null }),
}
const required = []
const fakeRequire = (specifier) => {
  required.push(specifier)
  if (specifier === 'react') return reactStub
  throw new Error(`unexpected module request: ${specifier}`)
}

window.eval(readFileSync(new URL('../packages/dsh-client-ui-ball/lib/client.js', import.meta.url), 'utf8'))

check('registers exactly one bundle', registrations.length === 1, `got ${registrations.length}`)
const registration = registrations[0]
check('registration id is the package name', registration?.id === 'dsh-client-ui-ball', String(registration?.id))
const plugin = registration.factory(fakeRequire)
check('exports apply', typeof plugin?.apply === 'function')

// --- fake settings namespace, mirroring SettingsScopeController's contract --
const setCalls = []
let scopeListener = null
const scopeValue = {}
const scope = {
  getSnapshot: () => ({ status: 'ready', value: { ...scopeValue }, revision: 1, writable: true, mode: 'host' }),
  subscribe(listener) { scopeListener = listener; return () => { scopeListener = null } },
  async set(field, value) { setCalls.push([field, value]); scopeValue[field] = value },
  async unset() {},
  async mutate() {},
}
let boundNamespace = null

// --- fake cordis context ----------------------------------------------------
const provided = new Map()
const cleanups = []
const localeDicts = []
const slotRegistrations = []
const ctx = {
  get: (name) => (name === 'settingsScope' ? { bind: (spec) => { boundNamespace = spec.namespace; return scope } } : undefined),
  provide: (name, value) => { provided.set(name, value) },
  effect(execute, label) {
    const dispose = execute()
    cleanups.push({ label, dispose })
    return () => { dispose?.() }
  },
  inject(_services, callback) { callback(ctx); return () => {} },
  locale: {
    register: (ns, dicts) => { localeDicts.push({ ns, dicts }); return () => {} },
    bind: (ns) => (key) => (localeDicts.find(d => d.ns === ns)?.dicts.zh ?? {})[key] ?? key,
  },
  slots: {
    inject: (name, callback) => { callback(); return () => {} },
    register: (declaration, component) => { slotRegistrations.push({ declaration, component }); return () => {} },
  },
}

let threw = null
try { plugin.apply(ctx) } catch (error) { threw = error }
check('apply() does not throw', threw === null, threw?.stack ?? '')

const doc = window.document
const host = doc.querySelector('body > .dshb-host')
check('mounts the ball host under body', host !== null)
check('provides the ctx.ball service', provided.has('ball'))
const ball = provided.get('ball')

const shadow = host.shadowRoot
const fab = shadow.querySelector('.ball')
const surface = shadow.querySelector('.surface')
const art = shadow.querySelector('.art')
const menu = shadow.querySelector('.menu')
check('control surface is a shadow root', shadow !== null)
check('surface starts hidden', surface.hasAttribute('hidden'))
check('built-in mascot is rendered by default', art.innerHTML.includes('<svg') && art.dataset.kind === 'svg')
check('binds the ui-ball settings namespace', boundNamespace === 'ui-ball', String(boundNamespace))
check('registers zh and en dictionaries', localeDicts.length === 1 && 'zh' in localeDicts[0].dicts && 'en' in localeDicts[0].dicts)

// --- the service contract ---------------------------------------------------
check('service exposes register/entries/subscribe/open/close/toggle',
  ['register', 'entries', 'subscribe', 'open', 'close', 'toggle'].every(k => typeof ball[k] === 'function'))

let badEntry = null
try { ball.register({ id: 'x' }) } catch (error) { badEntry = error }
// `window.eval` runs the bundle in jsdom's realm, so its TypeError is not this
// realm's TypeError; the name is the portable assertion.
check('register rejects an entry without render()', badEntry?.name === 'TypeError', String(badEntry))
let duplicate = null
const firstDispose = ball.register({ id: 'a', label: '甲', icon: '🅰', order: 1, render: () => {} })
try { ball.register({ id: 'a', render: () => {} }) } catch (error) { duplicate = error }
check('register rejects a duplicate id', duplicate?.name === 'Error', String(duplicate))
check('entries() lists the registration', ball.entries().map(e => e.id).join() === 'a', JSON.stringify(ball.entries()))

let rendered = null
const disposeB = ball.register({
  id: 'b', label: () => '乙', icon: '🅱', order: 2,
  render(container, api) {
    rendered = { container, api }
    container.append(doc.createTextNode('panel-b'))
    return () => { container.textContent = '' }
  },
})
check('entries() sorts by order', ball.entries().map(e => e.id).join() === 'a,b', JSON.stringify(ball.entries()))

// --- opening: two entries show the menu -------------------------------------
fab.dispatchEvent(pointer('pointerdown', 900, 700))
fab.dispatchEvent(pointer('pointerup', 900, 700))
check('a press opens the surface', !surface.hasAttribute('hidden'))
check('two entries render a menu', menu.children.length === 2, String(menu.children.length))
check('menu rows carry their ids', [...menu.children].map(c => c.dataset.entry).join() === 'a,b')
check('menu rows use the resolved label', menu.children[1].textContent.includes('乙'), menu.children[1].textContent)

menu.children[1].dispatchEvent(new window.MouseEvent('click', { bubbles: true }))
check('clicking a row activates its panel', rendered !== null && rendered.container.textContent === 'panel-b')
check('the panel receives a close() callback', typeof rendered?.api?.close === 'function')
check('activating hides the menu', menu.hasAttribute('hidden'))
check('the back control appears with two entries', !shadow.querySelector('.back').hasAttribute('hidden'))

ball.open('a')
check('ball.open(id) switches panels', rendered.container.textContent === '' , 'panel-b should have been disposed')
ball.close()
check('ball.close() hides the surface', surface.hasAttribute('hidden'))

// --- a single entry opens straight onto its panel ---------------------------
firstDispose()
check('disposing a registration removes it', ball.entries().map(e => e.id).join() === 'b')
ball.open()
check('one entry opens straight onto its panel', !menu.hidden === false && rendered.container.textContent === 'panel-b')
ball.close()
disposeB()
check('the registry empties', ball.entries().length === 0)

// --- appearance settings ----------------------------------------------------
const ballElement = shadow.querySelector('.ball')
check('the ball size drives the size variable', host.style.getPropertyValue('--dshb-size') === '52px', host.style.getPropertyValue('--dshb-size'))
check('the motion setting drives the host attribute', host.dataset.motion === 'breathe', host.dataset.motion)

// A Host snapshot replaces the local copy.
scopeValue.size = 72
scopeValue.motion = 'sway'
scopeListener()
check('a Host snapshot is adopted', host.style.getPropertyValue('--dshb-size') === '72px', host.style.getPropertyValue('--dshb-size'))
check('the adopted motion reaches the host', host.dataset.motion === 'sway', host.dataset.motion)

// --- drag: local while moving, durable on release ---------------------------
setCalls.length = 0
const before = { x: host.style.left, y: host.style.top }
fab.dispatchEvent(pointer('pointerdown', 900, 700))
fab.dispatchEvent(pointer('pointermove', 500, 400))
check('dragging writes nothing to the settings wire', setCalls.length === 0, JSON.stringify(setCalls))
check('dragging tracks the pointer locally',
  host.style.left !== before.x && host.style.top !== before.y,
  `${before.x},${before.y} -> ${host.style.left},${host.style.top}`)
fab.dispatchEvent(pointer('pointerup', 500, 400))
check('releasing commits the position once', setCalls.map(c => c[0]).sort().join() === 'x,y', JSON.stringify(setCalls))
check('the committed position matches the painted one',
  `${setCalls.find(c => c[0] === 'x')[1]}px` === host.style.left,
  `${JSON.stringify(setCalls)} vs ${host.style.left}`)

// --- the Plugins-page card --------------------------------------------------
check('requires only the react platform module', required.join() === 'react', required.join())
check('registers exactly one plugins.row.config card', slotRegistrations.length === 1, String(slotRegistrations.length))
const card = slotRegistrations[0]
check('the card keys on <package>#<row id>',
  card.declaration.key === 'dsh-client-ui-ball#ui-ball', String(card.declaration.key))
check('the card declares the locale namespace', card.declaration.locale === 'uiBall', String(card.declaration.locale))
check('the summary view returns a string',
  typeof card.component({ t: ctx.locale.bind('uiBall'), view: 'summary' }) === 'string')
const page = card.component({ t: ctx.locale.bind('uiBall'), view: 'page' })
// The stub does not render, so the element's `type` is the form component.
check('the page view returns the configuration form element',
  typeof page?.type === 'function' && page.type.name === 'BallConfigForm', String(page?.type?.name ?? page?.type))

// --- teardown ---------------------------------------------------------------
check('every layer is owned by one effect', cleanups.length === 4,
  cleanups.map(c => c.label).join(' | '))
for (const entry of cleanups) entry.dispose()
check('teardown removes the ball host', doc.querySelector('.dshb-host') === null)
check('teardown removes the injected styles',
  doc.querySelectorAll('style[data-plugin="dsh-client-ui-ball"]').length === 0)
check('teardown releases the settings subscription', scopeListener === null)

let failed = 0
for (const { name, ok, detail } of results) {
  if (!ok) failed += 1
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok || detail === undefined ? '' : `\n        → ${detail}`}`)
}
console.log(`\n${results.length - failed}/${results.length} checks passed`)
process.exitCode = failed === 0 ? 0 : 1
