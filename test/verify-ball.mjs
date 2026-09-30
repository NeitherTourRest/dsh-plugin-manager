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

// jsdom loads no external resources, so the local-mascot probe would never
// settle. This stand-in records the requested URL and lets the test decide the
// outcome, which is the only way to exercise both branches deterministically.
const probes = []
class ImageStub {
  constructor() {
    this.listeners = new Map()
    probes.push(this)
  }
  addEventListener(type, listener) {
    this.listeners.set(type, listener)
  }
  /** Resolve the probe the way a real <img> would. */
  settle(outcome) {
    this.listeners.get(outcome)?.()
  }
}
window.Image = ImageStub

// The `dsh.ball` directory the Host half would serve. It deliberately mixes a
// live module, a declared-but-disabled one, and a malformed declaration.
const directory = {
  protocol: 1,
  modules: [
    { id: 'ui-ball', package: 'dsh-client-ui-ball', title: { zh: '悬浮球外观', en: 'Ball appearance' }, icon: '🐳', order: 0, rowId: 'ui-ball', entryId: 'include:ui-ball', enabled: true, active: true },
    {
      id: 'ui-glass', package: 'dsh-client-ui-glass', title: { zh: '磨砂外观', en: 'Glass appearance' },
      icon: '◐', order: 10, rowId: 'ui-glass', entryId: 'include:ui-glass', enabled: false, active: false,
      settings: {
        namespace: 'ui-glass',
        fields: [
          { key: 'opacity', kind: 'range', min: 0, max: 100, step: 1, unit: '%', label: { zh: '不透明度', en: 'Opacity' } },
          { key: 'enabled', kind: 'toggle', label: { zh: '启用', en: 'Enabled' } },
        ],
      },
    },
    { id: 'broken', package: '@fixture/bad', title: { zh: '坏的', en: 'Broken' }, order: 20, problem: 'bad id' },
  ],
}
let directoryRequests = 0
let packRequests = 0
const packIndex = {
  states: ['idle', 'working', 'waiting', 'done'],
  packs: [{ id: 'fixture', title: { zh: '测试形象包', en: 'Fixture pack' }, states: { idle: 'idle.png', working: 'working.png' } }],
}
window.fetch = async (url) => {
  if (url === '/ui-ball/modules') {
    directoryRequests += 1
    return { ok: true, status: 200, json: async () => directory }
  }
  if (url === '/ui-ball/packs') {
    packRequests += 1
    return { ok: true, status: 200, json: async () => packIndex }
  }
  return { ok: false, status: 404, json: async () => ({}) }
}

// A Session-status stand-in: the ball derives its frame from `running` and
// `pendingInteraction` because dsh declares no finished flag to read.
const sessionStatusListeners = new Set()
let sessionStatuses = []
const sessionStatus = {
  getSnapshot: () => new Map(sessionStatuses.map((status, index) => [`s${String(index)}`, status])),
  subscribe(listener) { sessionStatusListeners.add(listener); return () => { sessionStatusListeners.delete(listener) } },
}
const setSessionStatuses = (next) => {
  sessionStatuses = next
  for (const listener of [...sessionStatusListeners]) listener()
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
// The raw Host layer. `value` is schema-resolved and therefore carries a
// default for every field, so only a field named here may overwrite the local
// mirror — the contract the adoption logic is built on.
const scopeUser = {}
const scope = {
  getSnapshot: () => ({
    status: 'ready',
    value: { ...scopeValue },
    user: { ...scopeUser },
    revision: 1,
    writable: true,
    mode: 'host',
  }),
  subscribe(listener) { scopeListener = listener; return () => { scopeListener = null } },
  async set(field, value) { setCalls.push([field, value]); scopeValue[field] = value; scopeUser[field] = value },
  async unset() {},
  async mutate() {},
}
let boundNamespace = null
// One scope object per namespace, as the real binder produces: sharing a single
// object would let a module binding replace the ball's own settings listener.
const makeScope = (namespace) => ({
  getSnapshot: () => ({ status: 'ready', value: { ...scopeValue }, user: { ...scopeUser }, revision: 1, writable: true, mode: 'host' }),
  subscribe(listener) {
    if (namespace !== 'ui-ball') return () => {}
    scopeListener = listener
    return () => { scopeListener = null }
  },
  async set(field, value) { setCalls.push([field, value]); scopeValue[field] = value; scopeUser[field] = value },
  async unset() {},
  async mutate() {},
})
const settingsScope = {
  bind: (spec) => { boundNamespace = spec.namespace; return makeScope(spec.namespace) },
}

// --- fake cordis context ----------------------------------------------------
const provided = new Map()
const cleanups = []
const localeDicts = []
const slotRegistrations = []
const cordisListeners = []
const rowToggles = []
/** Services resolved through `ctx.inject` so far; property reads depend on it. */
const injected = new Set()
// Cordis exposes an injected service both by name and as a context property.
// `remote.pluginManager` is deliberately a getter that throws unless the service
// is resolved through injection — that is how a plugin that read it directly
// shipped a panel that opened empty.
const pluginManager = {
  setPluginEnabled: async (id, on) => { rowToggles.push([id, on]); return { ok: true } },
}
const remoteService = {
  $on: () => () => {},
  get pluginManager() {
    if (!injected.has('remote.pluginManager')) throw new Error('cannot get property "remote.pluginManager" without inject')
    return pluginManager
  },
}
const uiSessionService = {
  get sessionStatus() {
    if (!injected.has('uiSession')) throw new Error('cannot get property "uiSession" without inject')
    return sessionStatus
  },
}
const ctx = {
  get: (name) => {
    if (name === 'settingsScope') return settingsScope
    if (name === 'uiSession') return uiSessionService
    if (name === 'remote') return remoteService
    if (name === 'remote.pluginManager') return pluginManager
    if (name === 'slots') return ctx.slots
    if (name === 'locale') return ctx.locale
    return undefined
  },
  provide: (name, value) => { provided.set(name, value) },
  // The injected context exposes the service as a property as well as by name.
  remote: remoteService,
  uiSession: uiSessionService,
  effect(execute, label) {
    const dispose = execute()
    cleanups.push({ label, dispose })
    return () => { dispose?.() }
  },
  inject(services, callback) {
    const list = Array.isArray(services) ? services : [services]
    // Cordis runs the callback only once every named service exists, and the
    // context it hands over is the one where the property is readable.
    if (list.some(name => ctx.get(name) === undefined)) return () => {}
    for (const name of list) injected.add(name)
    callback(ctx)
    return () => { for (const name of list) injected.delete(name) }
  },
  // Base Cordis Context members a client plugin may always use.
  on(event, listener) { cordisListeners.push({ event, listener }); return () => {} },
  locale: {
    // The real locale service is a snapshot service: the active language is
    // read from it, not from a dictionary lookup.
    getSnapshot: () => ({ locale: 'zh' }),
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
// Report immediately: everything below assumes apply completed.
if (threw !== null) { console.log('APPLY THREW:\n' + threw.stack); process.exit(1) }

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
const panelBody = shadow.querySelector('.body')
check('control surface is a shadow root', shadow !== null)
check('surface starts hidden', surface.hasAttribute('hidden'))
check('built-in mascot is rendered before the probe settles', art.innerHTML.includes('<svg') && art.dataset.kind === 'svg')
check('binds the ui-ball settings namespace', boundNamespace === 'ui-ball', String(boundNamespace))
check('registers zh and en dictionaries', localeDicts.length === 1 && 'zh' in localeDicts[0].dicts && 'en' in localeDicts[0].dicts)

// --- the local mascot probe -------------------------------------------------
check('exactly one local mascot probe is issued', probes.length === 1, String(probes.length))
check('the probe targets the Host mascot route', probes[0]?.src === '/ui-ball/mascot', String(probes[0]?.src))

// With no asset on the Host the built-in art stays; that is the shipped default.
probes[0].settle('error')
check('a missing asset keeps the built-in art', art.dataset.kind === 'svg' && art.innerHTML.includes('<svg'))

// With an asset present it becomes the default appearance.
probes[0].settle('load')
check('a present asset becomes the default artwork',
  art.dataset.kind === 'img' && art.firstElementChild?.getAttribute('src') === '/ui-ball/mascot',
  `${art.dataset.kind} ${art.firstElementChild?.getAttribute('src')}`)

// --- the service contract ---------------------------------------------------
check('service exposes register/entries/subscribe/open/close/toggle',
  ['register', 'entries', 'subscribe', 'open', 'close', 'toggle'].every(k => typeof ball[k] === 'function'))

let badEntry = null
try { ball.register({ id: 'x' }) } catch (error) { badEntry = error }
// `window.eval` runs the bundle in jsdom's realm, so its TypeError is not this
// realm's TypeError; the name is the portable assertion.
check('register rejects an entry without render()', badEntry?.name === 'TypeError', String(badEntry))
let duplicate = null
const draw = (container) => { container.append(window.document.createElement('i')) }
const firstDispose = ball.register({ id: 'a', label: '甲', icon: '🅰', order: 1, render: draw })
try { ball.register({ id: 'a', render: draw }) } catch (error) { duplicate = error }
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
check('the ball size drives the size variable', host.style.getPropertyValue('--dshb-size') === '72px', host.style.getPropertyValue('--dshb-size'))
check('the motion setting drives the host attribute', host.dataset.motion === 'breathe', host.dataset.motion)

// A Host snapshot whose user layer overrides a field replaces the local copy.
scopeValue.size = 72
scopeValue.motion = 'sway'
scopeUser.size = 72
scopeUser.motion = 'sway'
scopeListener()
check('a field the user layer overrides is adopted', host.style.getPropertyValue('--dshb-size') === '72px', host.style.getPropertyValue('--dshb-size'))
check('the adopted motion reaches the host', host.dataset.motion === 'sway', host.dataset.motion)

// A resolved section nobody wrote must not become the source of truth.
setCalls.length = 0
delete scopeUser.size
scopeValue.size = 52
scopeListener()
check('a field absent from the user layer keeps the working copy',
  host.style.getPropertyValue('--dshb-size') === '72px', host.style.getPropertyValue('--dshb-size'))

// --- the artwork must not hijack the ball's own drag ------------------------
{
  const dragStart = new window.Event('dragstart', { bubbles: true, cancelable: true })
  ballElement.dispatchEvent(dragStart)
  check('a native dragstart on the ball is prevented', dragStart.defaultPrevented)

  // The probe settled on 'load' earlier, so the art is an <img> right now.
  const artImage = shadow.querySelector('.art img')
  check('the mascot image opts out of native dragging',
    artImage !== null && artImage.draggable === false, String(artImage?.draggable))

  const css = shadow.querySelector('style').textContent
  check('the art layer is not a pointer target', /\.art\s*\{[^}]*pointer-events:\s*none/s.test(css))
  check('images and svg opt out of user drag in CSS', /-webkit-user-drag:\s*none/.test(css))
}

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
check('requests only the react platform module', [...new Set(required)].join() === 'react', required.join())
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

// --- the declared-module directory ------------------------------------------
// The Host half's listing is asynchronous; one microtask turn is enough for the
// stubbed fetch to settle.
await new Promise(resolve => { setTimeout(resolve, 0) })

check('the directory is fetched once at mount', directoryRequests === 1, String(directoryRequests))
check('the settings scope was bound for the declared namespace', boundNamespace !== undefined)

// A module that both declares itself and registers live must appear once, with
// the live panel winning presentation and no "not loaded" marker.
const disposeLiveBall = ball.register({ id: 'ui-ball', label: '球', icon: '◉', order: 0, render: draw })

ball.open()
const rows = [...menu.children]
check('declared modules join the menu in declared order',
  rows.map(row => row.dataset.entry).join() === 'ui-ball,ui-glass,broken',
  rows.map(row => row.dataset.entry).join())
check('a module that is declared and live appears once, with no state chip',
  rows[0].querySelector('.entry__state') === null, String(rows[0].querySelector('.entry__state')?.textContent))
check('a title pair is resolved for the active language',
  rows[1].querySelector('.entry__label').textContent === '磨砂外观',
  rows[1].querySelector('.entry__label').textContent)
check('a disabled row is marked', rows[1].querySelector('.entry__state')?.textContent === '已停用',
  String(rows[1].querySelector('.entry__state')?.textContent))
check('a malformed declaration is marked', rows[2].querySelector('.entry__state')?.textContent === '声明有误',
  String(rows[2].querySelector('.entry__state')?.textContent))

// The ball registers the Plugins-page card on a declared module's behalf, which
// is what lets a protocol plugin ship no card of its own.
const moduleCards = slotRegistrations.map(entry => entry.declaration.key).filter(Boolean)
check('the ball registers a configuration card for each declared module with settings',
  moduleCards.includes('dsh-client-ui-glass#ui-glass'), moduleCards.join(' | '))
check('a live-only registration gets no card', !moduleCards.includes('undefined'), moduleCards.join(' | '))

// Activating a declared module the ball has never heard from renders the form
// from its declared fields — the point of the protocol.
rows[1].dispatchEvent(new window.MouseEvent('click', { bubbles: true }))
const fields = [...panelBody.querySelectorAll('[data-field]')]
check('the ball renders the declared settings form', fields.map(f => f.dataset.field).join() === 'opacity,enabled',
  `${fields.map(f => f.dataset.field).join()} || body: ${panelBody.textContent.slice(0, 160)}`)
check('a declared range keeps its declared bounds',
  fields[0]?.type === 'range' && fields[0]?.min === '0' && fields[0]?.max === '100',
  `${String(fields[0]?.type)} ${String(fields[0]?.min)}..${String(fields[0]?.max)}`)
check('a declared toggle renders as a checkbox', fields[1]?.type === 'checkbox', String(fields[1]?.type))

// Dragging must survive the store echo. The old wiring re-read the stored value
// on every `input`, so the control snapped back under the pointer and the
// release wrote the value it had just been reset to — nothing could be changed.
const range = fields[0]
setCalls.length = 0
range.value = '42'
range.dispatchEvent(new window.Event('input', { bubbles: true }))
check('dragging a range keeps the dragged value', range.value === '42', range.value)
check('the drag readout follows the pointer',
  range.parentElement.querySelector('output')?.textContent === '42%',
  String(range.parentElement.querySelector('output')?.textContent))
range.dispatchEvent(new window.Event('change', { bubbles: true }))
check('releasing a range writes the dragged value',
  setCalls.length === 1 && setCalls[0][0] === 'opacity' && setCalls[0][1] === 42, JSON.stringify(setCalls))
check('the form offers a reset', [...panelBody.querySelectorAll('button')].some(b => b.textContent === '恢复默认'))
check('a disabled module is offered an enable action',
  [...panelBody.querySelectorAll('button')].some(b => b.textContent === '启用这个插件'),
  [...panelBody.querySelectorAll('button')].map(b => b.textContent).join(' | '))

const enable = [...panelBody.querySelectorAll('button')].find(b => b.textContent === '启用这个插件')
enable?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }))
await new Promise(resolve => { setTimeout(resolve, 0) })
check('the enable action reaches the profile plugin manager',
  rowToggles.length === 1 && rowToggles[0][0] === 'include:ui-glass' && rowToggles[0][1] === true,
  JSON.stringify(rowToggles))
check('the directory is refetched after a management action', directoryRequests === 2, String(directoryRequests))

ball.close()

// A plugin that registers under its package name rather than the id it
// declared names the same module. This is the shape the shipped glass plugin
// had, and the menu listed it twice because of it.
const disposeGlassByName = ball.register({
  id: 'dsh-client-ui-glass', label: '磨砂外观', icon: '◐', order: 10, render: draw,
})
ball.open()
const byName = [...menu.children]
check('a panel registered under the package name merges into its declared module',
  byName.length === 3 && byName.every(row => row.dataset.entry !== 'dsh-client-ui-glass'),
  byName.map(row => row.dataset.entry).join())
ball.close()
disposeGlassByName()

// --- mascot packs and the derived frame -------------------------------------
check('the pack index is fetched once at mount', packRequests === 1, String(packRequests))
check('an idle ball reports the idle frame', host.dataset.state === 'idle', String(host.dataset.state))

const adopt = (field, value) => {
  scopeUser[field] = value
  scopeValue[field] = value
  scopeListener()
}
adopt('image', 'pack:fixture')
check('selecting a pack paints its idle frame',
  shadow.querySelector('.art img')?.getAttribute('src') === '/ui-ball/pack/fixture/idle',
  `${String(shadow.querySelector('.art img')?.getAttribute('src'))} || packs=${String(packRequests)} || ${art.innerHTML.slice(0, 120)}`)

setSessionStatuses([{ running: true, pendingInteraction: undefined }])
check('a running session switches to the working frame',
  host.dataset.state === 'working' && shadow.querySelector('.art img')?.getAttribute('src') === '/ui-ball/pack/fixture/working',
  `${host.dataset.state} ${shadow.querySelector('.art img')?.getAttribute('src')}`)

setSessionStatuses([{ running: true, pendingInteraction: { kind: 'approval' } }])
check('a pending interaction outranks running', host.dataset.state === 'waiting', String(host.dataset.state))
check('a state with no declared art falls back to the pack idle frame',
  shadow.querySelector('.art img')?.getAttribute('src') === '/ui-ball/pack/fixture/idle',
  String(shadow.querySelector('.art img')?.getAttribute('src')))

setSessionStatuses([{ running: false, pendingInteraction: undefined }])
check('the falling edge latches the finished frame', host.dataset.state === 'done', String(host.dataset.state))

setSessionStatuses([{ running: true, pendingInteraction: undefined }])
check('running again clears the finished frame', host.dataset.state === 'working', String(host.dataset.state))

setSessionStatuses([])
check('stopping again latches the finished frame once more', host.dataset.state === 'done', String(host.dataset.state))

adopt('image', '')
check('a Host default does not erase a local choice',
  shadow.querySelector('.art img')?.getAttribute('src') === '/ui-ball/pack/fixture/idle',
  String(shadow.querySelector('.art img')?.getAttribute('src')))
adopt('image', 'https://example.test/chosen.png')
check('a Host value that carries intent is adopted',
  shadow.querySelector('.art img')?.getAttribute('src') === 'https://example.test/chosen.png',
  String(shadow.querySelector('.art img')?.getAttribute('src')))

// --- teardown ---------------------------------------------------------------
const labels = cleanups.map(cleanup => cleanup.label)
check('every layer is owned by an effect',
  ['ui-ball: settings scope', 'ui-ball: mascot and panel surface', 'ui-ball: directory invalidation',
    'ui-ball: dictionaries', 'ui-ball: card stylesheet'].every(label => labels.includes(label)),
  labels.join(' | '))
check('binding a module namespace adds its own owned subscription',
  labels.includes('ui-ball: ui-glass settings'), labels.join(' | '))
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
