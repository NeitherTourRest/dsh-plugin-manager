/**
 * Integration harness for the dsh-client-ui-ball ↔ dsh-client-ui-glass pair.
 *
 * Both browser halves are loaded into ONE document against a shared mocked
 * context, and the glass panel is driven through the ball's real `ctx.ball`
 * service. This is the only check that exercises the cross-plugin contract
 * itself: the entry shape the ball publishes, the render callback it calls,
 * and the panel the glass package builds inside the container it is handed.
 *
 * Run from the repository root (jsdom resolves from its node_modules):
 *   node test/verify-together.mjs
 *
 * Repository-local test tooling: not part of either plugin package.
 */
import { readFileSync } from 'node:fs'
import { JSDOM, VirtualConsole } from 'jsdom'

const BALL = new URL('../packages/dsh-client-ui-ball/lib/client.js', import.meta.url)
const GLASS = new URL('../packages/dsh-client-ui-glass/lib/client.js', import.meta.url)

const results = []
const check = (name, condition, detail) => {
  results.push({ name, ok: Boolean(condition), detail })
}

const virtualConsole = new VirtualConsole()
virtualConsole.on('jsdomError', () => {}) // jsdom's CSS parser rejects modern properties; irrelevant here.

const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
  url: 'https://together.test/',
  runScripts: 'outside-only',
  pretendToBeVisual: true,
  virtualConsole,
})
const { window } = dom
const doc = window.document

window.HTMLElement.prototype.setPointerCapture = function () {}
window.__ModuleLoader__ = { mode: 'queue', pendingQueue: [], load: r => { window.__ModuleLoader__.pendingQueue.push(r) }, create: () => {} }

// ── shared context pieces ───────────────────────────────────────────────────
const provided = new Map()
const localeDicts = new Map()
const layerStacks = new Map()
const cleanups = []
const pointer = (type, x, y) => {
  const event = new window.MouseEvent(type, { bubbles: true, clientX: x, clientY: y })
  Object.defineProperty(event, 'pointerId', { value: 1 })
  return event
}

const makeCtx = () => {
  const ctx = {
    get(name) {
      if (name === 'settingsScope') return { bind: () => ({
        getSnapshot: () => ({ status: 'ready', value: {}, revision: 1, writable: true, mode: 'host' }),
        subscribe: () => () => {},
        set: async () => {},
        unset: async () => {},
        mutate: async () => {},
      }) }
      if (name === 'theme') return {
        overrideTokens(source, tokens) {
          const layer = { tokens }
          layerStacks.set(source, layer)
          return () => { if (layerStacks.get(source) === layer) layerStacks.delete(source) }
        },
      }
      return undefined
    },
    provide(name, value) { provided.set(name, value) },
    effect(execute, label) { const dispose = execute(); cleanups.push({ label, dispose }); return () => { dispose?.() } },
    // Base Cordis Context members a client plugin may always use.
    on() { return () => {} },
    inject(services, callback) {
      const list = Array.isArray(services) ? services : [services]
      // Cordis runs the callback only once every named service exists. A
      // composition here has the ball and the shell's own services, but no
      // Session UI and no plugin manager, so those requests never resolve.
      const resolvable = (name) => name === 'ball' ? provided.has('ball')
        : ['locale', 'slots', 'settingsScope'].includes(name)
      if (list.some(name => !resolvable(name))) return () => {}
      // Cordis hands the resolved services over as context properties.
      callback({ ...ctx, ball: provided.get('ball'), settingsScope: ctx.get('settingsScope') })
      return () => {}
    },
    locale: {
      getSnapshot: () => ({ locale: 'zh' }),
      register: (ns, dicts) => { localeDicts.set(ns, dicts); return () => { localeDicts.delete(ns) } },
      bind: (ns) => (key) => localeDicts.get(ns)?.zh?.[key] ?? key,
    },
    slots: {
      inject: (name, callback) => { callback(); return () => {} },
      register: () => () => {},
    },
  }
  return ctx
}

const reactStub = {
  createElement: (type, props, ...children) => ({ type, props: props ?? {}, children }),
  useState: (initial) => [typeof initial === 'function' ? initial() : initial, () => {}],
  useEffect: () => {},
  useRef: () => ({ current: null }),
}

/** Load one browser half and apply it, in composition order. */
const load = (source, id) => {
  window.eval(readFileSync(source, 'utf8'))
  const registration = window.__ModuleLoader__.pendingQueue.find(r => r.id === id)
  const plugin = registration.factory((specifier) => {
    if (specifier === 'react') return reactStub
    throw new Error(`unexpected module request: ${specifier}`)
  })
  plugin.apply(makeCtx())
  return plugin
}

load(BALL, 'dsh-client-ui-ball')
const ball = provided.get('ball')
check('the ball provides ctx.ball before glass applies', typeof ball?.register === 'function')

load(GLASS, 'dsh-client-ui-glass')

// ── the contract ────────────────────────────────────────────────────────────
const entries = ball.entries()
check('the glass panel appears in the ball registry', entries.map(e => e.id).join() === 'ui-glass',
  JSON.stringify(entries))
check('the ball resolves the glass label through the glass dictionary',
  entries[0]?.label === '磨砂外观', String(entries[0]?.label))
check('the glass fallback button is not mounted when the ball hosts it',
  doc.querySelector('.dshw-host') === null)
check('the glass backdrop layer is still installed', doc.querySelector('.dshw-backdrop') !== null)

// ── drive the panel through the ball's own surface ──────────────────────────
const ballHost = doc.querySelector('body > .dshb-host')
const ballShadow = ballHost.shadowRoot
const fab = ballShadow.querySelector('.ball')
fab.dispatchEvent(pointer('pointerdown', 900, 700))
fab.dispatchEvent(pointer('pointerup', 900, 700))
check('one registered panel opens straight onto its page',
  ballShadow.querySelector('.surface').hasAttribute('hidden') === false
  && ballShadow.querySelector('.menu').hasAttribute('hidden'))

const body = ballShadow.querySelector('.body')
const panelShadow = body.firstElementChild?.shadowRoot
check('the ball renders the glass panel into its own body', panelShadow !== null && panelShadow !== undefined)
check('the glass panel styles itself inside the ball surface',
  panelShadow.querySelector('style')?.dataset.pluginCss === 'dsh-client-ui-glass/panel.css',
  String(panelShadow.querySelector('style')?.dataset.pluginCss))
const keys = [...panelShadow.querySelectorAll('[data-k]')].map(c => c.dataset.k)
check('every glass control renders inside the ball', keys.join() === 'enabled,opacity,blur,saturate,dim,fit,wallpaper', keys.join())

// A control driven from inside the ball must reach the glass theme layer.
const opacity = panelShadow.querySelector('[data-k="opacity"]')
opacity.value = '20'
opacity.dispatchEvent(new window.Event('input', { bubbles: true }))
const layer = layerStacks.get('dsh-client-ui-glass')
check('a control inside the ball reaches the glass theme layer',
  layer?.tokens['--dsw-alias-bg-base'].light.includes('20%, transparent'),
  String(layer?.tokens['--dsw-alias-bg-base'].light))

// The ball gives the panel a close() that hides the shared surface.
const closeButton = [...ballShadow.querySelectorAll('button')].find(b => b.textContent === '×')
closeButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }))
check('the ball closes the shared surface', ballShadow.querySelector('.surface').hasAttribute('hidden'))
check('closing disposes the glass panel', body.childElementCount === 0)

// ── teardown ────────────────────────────────────────────────────────────────
for (const cleanup of cleanups) cleanup.dispose()
check('teardown removes the ball host', doc.querySelector('.dshb-host') === null)
check('teardown removes the glass backdrop', doc.querySelector('.dshw-backdrop') === null)
check('teardown releases the glass theme layer', layerStacks.size === 0, `live=${layerStacks.size}`)

let failed = 0
for (const { name, ok, detail } of results) {
  if (!ok) failed += 1
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok || detail === undefined ? '' : `\n        → ${detail}`}`)
}
console.log(`\n${results.length - failed}/${results.length} checks passed`)
process.exitCode = failed === 0 ? 0 : 1
