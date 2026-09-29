/**
 * Verification harness for packages/dsh-client-ui-glass.
 * Loads the hand-written browser half inside jsdom against a mocked Cordis
 * client context, twice: once with the shared ball present and once without.
 * Asserts the registration protocol, the backdrop and theme-token layers, the
 * hosted panel, the fallback button, the Plugins-page card, and full teardown.
 *
 * Run from the repository root (jsdom resolves from its node_modules):
 *   node test/verify-glass.mjs
 *
 * Repository-local test tooling: not part of the plugin package.
 */
import { readFileSync } from 'node:fs'
import { JSDOM, VirtualConsole } from 'jsdom'

const SOURCE = new URL('../packages/dsh-client-ui-glass/lib/client.js', import.meta.url)

/** Minimal React stand-in: the card only needs element construction and hooks. */
const reactStub = {
  createElement: (type, props, ...children) => ({ type, props: props ?? {}, children }),
  useState: (initial) => [typeof initial === 'function' ? initial() : initial, () => {}],
  useEffect: () => {},
  useRef: () => ({ current: null }),
}

/**
 * Load and apply the browser half against a fresh document.
 * @param {{ withBall: boolean, platform?: string, seed?: object, hostUser?: object, hostValue?: object }} options - the composition, plus any pre-existing local mirror and Host document to start from.
 * @returns the observations the assertions read.
 */
function load({ withBall, platform, seed, hostUser, hostValue }) {
  const results = []
  const virtualConsole = new VirtualConsole()
  virtualConsole.on('jsdomError', () => {}) // jsdom's CSS parser rejects modern properties; irrelevant here.
  const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
    url: 'https://glass.test/',
    runScripts: 'outside-only',
    pretendToBeVisual: true,
    virtualConsole,
  })
  const { window } = dom
  if (platform !== undefined) window.document.documentElement.dataset.platform = platform

  const registrations = []
  window.__ModuleLoader__ = { mode: 'queue', pendingQueue: registrations, load: r => registrations.push(r), create: () => {} }
  // The local mirror of a build that stored preferences before the settings
  // namespace existed; seeding it is what makes the upgrade path testable.
  if (seed !== undefined) window.localStorage.setItem('dsh-client-ui-glass/v1', JSON.stringify(seed))

  window.HTMLElement.prototype.setPointerCapture = function () {}
  const pointer = (type, x, y) => {
    const event = new window.MouseEvent(type, { bubbles: true, clientX: x, clientY: y })
    Object.defineProperty(event, 'pointerId', { value: 1 })
    return event
  }

  const observed = {
    window,
    registrations,
    overrideCalls: [],
    layers: new Map(),
    setCalls: [],
    // `user` is the raw Host layer: the contract being exercised is that only a
    // field it names may overwrite the local mirror, because `value` carries
    // schema defaults for every field nobody ever set.
    scopeValue: { ...hostValue },
    scopeUser: { ...hostUser },
    scopeListener: null,
    boundNamespace: null,
    ballEntries: [],
    ballDisposers: [],
    slotRegistrations: [],
    localeDicts: [],
    cleanups: [],
    required: [],
    pointer,
    results,
    check: (name, condition, detail) => { results.push({ name, ok: Boolean(condition), detail }) },
  }

  const theme = {
    overrideTokens(source, tokens) {
      for (const [name, value] of Object.entries(tokens)) {
        if (typeof value === 'string') throw new TypeError(`bare string for ${name}`)
        if (typeof value?.light !== 'string' || typeof value?.dark !== 'string') throw new TypeError(`not a {light,dark} pair for ${name}`)
      }
      const layer = { source, tokens }
      observed.layers.set(source, layer)
      observed.overrideCalls.push(layer)
      return () => { if (observed.layers.get(source) === layer) observed.layers.delete(source) }
    },
  }

  const scope = {
    getSnapshot: () => ({
      status: 'ready',
      value: { ...observed.scopeValue },
      user: { ...observed.scopeUser },
      revision: 1,
      writable: true,
      mode: 'host',
    }),
    subscribe(listener) { observed.scopeListener = listener; return () => { observed.scopeListener = null } },
    async set(field, value) {
      observed.setCalls.push([field, value])
      observed.scopeValue[field] = value
      observed.scopeUser[field] = value
    },
    async unset() {},
    async mutate() {},
  }

  const ctx = {
    get: (name) => {
      if (name === 'theme') return theme
      if (name === 'settingsScope') return { bind: (spec) => { observed.boundNamespace = spec.namespace; return scope } }
      return undefined
    },
    effect(execute, label) {
      const dispose = execute()
      observed.cleanups.push({ label, dispose })
      return () => { dispose?.() }
    },
    inject(services, callback) {
      const list = Array.isArray(services) ? services : [services]
      if (list.includes('ball')) {
        if (!withBall) return () => {}
        callback({ ...ctx, ball: {
          register(entry) {
            observed.ballEntries.push(entry)
            const dispose = () => { const at = observed.ballEntries.indexOf(entry); if (at >= 0) observed.ballEntries.splice(at, 1) }
            observed.ballDisposers.push(dispose)
            return dispose
          },
        } })
        return () => {}
      }
      callback(ctx)
      return () => {}
    },
    locale: {
      register: (ns, dicts) => { observed.localeDicts.push({ ns, dicts }); return () => {} },
      bind: (ns) => (key) => (observed.localeDicts.find(d => d.ns === ns)?.dicts.zh ?? {})[key] ?? key,
    },
    slots: {
      inject: (name, callback) => { callback(); return () => {} },
      register: (declaration, component) => { observed.slotRegistrations.push({ declaration, component }); return () => {} },
    },
  }

  window.eval(readFileSync(SOURCE, 'utf8'))
  const registration = registrations[0]
  const plugin = registration.factory((specifier) => {
    observed.required.push(specifier)
    if (specifier === 'react') return reactStub
    throw new Error(`unexpected module request: ${specifier}`)
  })
  observed.plugin = plugin
  observed.ctx = ctx
  observed.applyError = null
  try { plugin.apply(ctx) } catch (error) { observed.applyError = error }
  return observed
}

const failures = []
const report = (label, checks) => {
  console.log(`\n── ${label} ──`)
  for (const { name, ok, detail } of checks) {
    if (!ok) failures.push(`${label}: ${name}`)
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok || detail === undefined ? '' : `\n        → ${detail}`}`)
  }
}

// ═══ Case 1: the shared ball hosts the panel ════════════════════════════════
{
  const o = load({ withBall: true, platform: 'win32' })
  const { check, window } = o
  const doc = window.document

  check('registers exactly one bundle', o.registrations.length === 1, `got ${o.registrations.length}`)
  check('registration id is the package name', o.registrations[0]?.id === 'dsh-client-ui-glass')
  check('exports apply', typeof o.plugin?.apply === 'function')
  check('apply() does not throw', o.applyError === null, o.applyError?.stack ?? '')

  check('mounts the backdrop layer under body', doc.querySelector('body > .dshw-backdrop') !== null)
  check('backdrop holds image + scrim', doc.querySelectorAll('.dshw-backdrop > *').length === 2)
  check('marks <html> enabled', doc.documentElement.hasAttribute('data-dshw-enabled'))
  check('marks <html> clear while no wallpaper is set', doc.documentElement.hasAttribute('data-dshw-clear'))
  const tagNames = [...doc.querySelectorAll('style[data-plugin="dsh-client-ui-glass"]')]
    .map(tag => tag.dataset.pluginCss).sort()
  check('injects one owned tag per sheet it actually uses (glass, settings)',
    tagNames.join() === 'dsh-client-ui-glass/glass.css,dsh-client-ui-glass/settings.css',
    tagNames.join())

  check('binds the ui-glass settings namespace', o.boundNamespace === 'ui-glass', String(o.boundNamespace))
  check('registers zh and en dictionaries', o.localeDicts.length === 1 && 'zh' in o.localeDicts[0].dicts && 'en' in o.localeDicts[0].dicts)

  // theme token layer
  const layer = o.overrideCalls.at(-1)
  check('overrides the five background aliases', Object.keys(layer.tokens).sort().join() === [
    '--dsw-alias-bg-base', '--dsw-alias-bg-layer-1', '--dsw-alias-bg-layer-2',
    '--dsw-alias-bg-overlay', '--dsw-specific-sidebar-fill',
  ].join(), Object.keys(layer.tokens).join())
  check('base mixes the light static token at the default alpha',
    layer.tokens['--dsw-alias-bg-base'].light === 'color-mix(in srgb, var(--dsw-static-neutral-bluish-00) 55%, transparent)',
    layer.tokens['--dsw-alias-bg-base'].light)
  check('base mixes the dark static token at the default alpha',
    layer.tokens['--dsw-alias-bg-base'].dark === 'color-mix(in srgb, var(--dsw-static-neutral-bluish-950) 55%, transparent)',
    layer.tokens['--dsw-alias-bg-base'].dark)
  check('a raised layer stays more opaque than the base',
    layer.tokens['--dsw-alias-bg-overlay'].light.includes('100%, transparent'))

  // ball hosting
  check('registers exactly one panel with the ball', o.ballEntries.length === 1, String(o.ballEntries.length))
  const entry = o.ballEntries[0]
  check('the ball entry is keyed by the package id', entry?.id === 'dsh-client-ui-glass', String(entry?.id))
  check('the ball entry exposes a renderer', typeof entry?.render === 'function')
  check('the ball entry resolves its label from the dictionary', entry.label() === '磨砂外观', String(entry.label()))
  check('no fallback button is mounted while the ball hosts the panel',
    doc.querySelector('.dshw-host') === null && doc.querySelector('.dshw-fab') === null)

  // the hosted panel builds its own shadow root with controls
  const slot = doc.createElement('div')
  doc.body.append(slot)
  const disposePanel = entry.render(slot, { close: () => {} })
  const panelRoot = slot.firstElementChild
  const shadow = panelRoot?.shadowRoot
  check('the panel mounts its own shadow root', shadow !== null && shadow !== undefined)
  check('the panel owns a style tag', shadow.querySelector('style')?.dataset.pluginCss === 'dsh-client-ui-glass/panel.css')
  const keys = [...shadow.querySelectorAll('[data-k]')].map(c => c.dataset.k)
  check('the panel renders every control', keys.join() === 'enabled,opacity,blur,saturate,dim,fit,wallpaper', keys.join())
  check('the panel labels come from the dictionary',
    shadow.querySelector('[data-k="opacity"]').closest('.row').firstElementChild.textContent === '不透明度')
  check('the panel renders both action rows', shadow.querySelectorAll('.actions button').length === 6,
    String(shadow.querySelectorAll('.actions button').length))

  const opacity = shadow.querySelector('[data-k="opacity"]')
  const blur = shadow.querySelector('[data-k="blur"]')
  o.setCalls.length = 0
  opacity.value = '30'
  opacity.dispatchEvent(new window.Event('input', { bubbles: true }))
  check('dragging a slider applies locally without writing', o.setCalls.length === 0, JSON.stringify(o.setCalls))
  check('the local drag re-overrides the theme layer',
    o.overrideCalls.at(-1).tokens['--dsw-alias-bg-base'].light.includes('30%, transparent'),
    o.overrideCalls.at(-1).tokens['--dsw-alias-bg-base'].light)
  opacity.dispatchEvent(new window.Event('change', { bubbles: true }))
  check('releasing the slider writes once', o.setCalls.length === 1 && o.setCalls[0][0] === 'opacity', JSON.stringify(o.setCalls))

  blur.value = '4'
  blur.dispatchEvent(new window.Event('change', { bubbles: true }))
  check('the blur reaches the stylesheet', readVar(doc, '--dshw-blur') === '4px', String(readVar(doc, '--dshw-blur')))

  const url = shadow.querySelector('[data-k="wallpaper"]')
  url.value = 'https://example.test/a b"c.jpg'
  url.dispatchEvent(new window.Event('change', { bubbles: true }))
  check('setting a wallpaper clears the clear attribute', !doc.documentElement.hasAttribute('data-dshw-clear'))
  const image = doc.querySelector('.dshw-backdrop__image')
  check('the wallpaper is stripped and applied',
    image.style.backgroundImage === 'url("https://example.test/abc.jpg")', image.style.backgroundImage)

  shadow.querySelector('[data-act="reset"]').dispatchEvent(new window.MouseEvent('click', { bubbles: true }))
  check('reset writes every field back',
    new Set(o.setCalls.map(c => c[0])).size === 9, JSON.stringify([...new Set(o.setCalls.map(c => c[0]))]))
  check('reset restores the default alpha',
    o.overrideCalls.at(-1).tokens['--dsw-alias-bg-base'].light.includes('55%, transparent'),
    o.overrideCalls.at(-1).tokens['--dsw-alias-bg-base'].light)

  disposePanel()
  check('leaving the panel removes it', slot.childElementCount === 0)

  // Plugins-page card. With the ball present the ball registers one from this
  // package's `dsh.ball` declaration, so glass must NOT register its own: the
  // slot keys on `<package>#<row id>` and a second registration would silently
  // replace the first. Glass therefore needs no React at all on this path.
  check('glass requests no module beyond the platform baseline', o.required.length === 0, o.required.join())
  check('glass leaves the configuration card to the ball', o.slotRegistrations.length === 0,
    o.slotRegistrations.map(entry => entry.declaration.key).join(' | '))

  // teardown
  for (const cleanup of o.cleanups) cleanup.dispose()
  check('teardown removes the backdrop', doc.querySelector('.dshw-backdrop') === null)
  check('teardown removes every owned style tag',
    doc.querySelectorAll('style[data-plugin="dsh-client-ui-glass"]').length === 0)
  check('teardown clears the html markers',
    !doc.documentElement.hasAttribute('data-dshw-enabled') && !doc.documentElement.hasAttribute('data-dshw-clear'))
  check('teardown disposes the theme layer', o.layers.size === 0, `live=${o.layers.size}`)

  report('with the shared ball', o.results)
}

// ═══ Case 2: no ball — the plugin falls back to its own button ══════════════
{
  const o = load({ withBall: false, platform: 'win32' })
  const { check, window } = o
  const doc = window.document

  check('apply() does not throw', o.applyError === null, o.applyError?.stack ?? '')
  check('no panel is registered with a ball that is not there', o.ballEntries.length === 0)
  const host = doc.querySelector('body > .dshw-host')
  check('mounts the fallback button', host !== null)
  const shadow = host?.shadowRoot
  const fab = shadow.querySelector('.fab')
  const popover = shadow.querySelector('.popover')
  check('the fallback popover starts hidden', popover.hasAttribute('hidden'))

  fab.dispatchEvent(o.pointer('pointerdown', 900, 700))
  fab.dispatchEvent(o.pointer('pointerup', 900, 700))
  check('a press opens the fallback popover', !popover.hasAttribute('hidden'))

  const slot = shadow.querySelector('.popover__slot')
  const panelShadow = slot.firstElementChild?.shadowRoot
  check('the fallback popover carries the same panel', panelShadow !== null && panelShadow !== undefined)
  check('the fallback panel renders the same controls',
    [...panelShadow.querySelectorAll('[data-k]')].map(c => c.dataset.k).join() === 'enabled,opacity,blur,saturate,dim,fit,wallpaper')

  o.setCalls.length = 0
  fab.dispatchEvent(o.pointer('pointerdown', 900, 700))
  fab.dispatchEvent(o.pointer('pointermove', 500, 400))
  check('dragging the fallback button writes nothing', o.setCalls.length === 0, JSON.stringify(o.setCalls))
  fab.dispatchEvent(o.pointer('pointerup', 500, 400))
  check('releasing commits the fallback position',
    o.setCalls.map(c => c[0]).sort().join() === 'buttonX,buttonY', JSON.stringify(o.setCalls))

  const note = panelShadow.querySelector('.note')
  check('no caveat is shown at the default frosted state', note.hasAttribute('hidden'))
  panelShadow.querySelector('[data-act="clear"]').dispatchEvent(new window.MouseEvent('click', { bubbles: true }))
  check('the clear preset zeroes the surface alpha',
    o.overrideCalls.at(-1).tokens['--dsw-alias-bg-base'].light.includes('0%, transparent'),
    o.overrideCalls.at(-1).tokens['--dsw-alias-bg-base'].light)
  check('the clear-mode caveat is shown on an opaque window', !note.hasAttribute('hidden'),
    note.textContent.slice(0, 30))
  panelShadow.querySelector('[data-act="glass"]').dispatchEvent(new window.MouseEvent('click', { bubbles: true }))
  check('the caveat clears once the surfaces are visible again', note.hasAttribute('hidden'))

  // With no ball there is nothing to register the card from the declaration, so
  // glass supplies its own.
  check('glass registers its own card when the ball is absent', o.slotRegistrations.length === 1,
    String(o.slotRegistrations.length))
  const ownCard = o.slotRegistrations[0]
  check('the fallback card keys on <package>#<row id>',
    ownCard?.declaration.key === 'dsh-client-ui-glass#ui-glass', String(ownCard?.declaration.key))
  check('the fallback card declares the locale namespace',
    ownCard?.declaration.locale === 'uiGlass', String(ownCard?.declaration.locale))
  check('the fallback card answers the summary view with a string',
    typeof ownCard?.component({ t: o.ctx.locale.bind('uiGlass'), view: 'summary' }) === 'string')
  const ownPage = ownCard?.component({ t: o.ctx.locale.bind('uiGlass'), view: 'page' })
  check('the fallback card answers the page view with a form element',
    typeof ownPage?.type === 'function' && ownPage.type.name === 'GlassConfigForm', String(ownPage?.type?.name ?? ownPage?.type))

  for (const cleanup of o.cleanups) cleanup.dispose()
  check('teardown removes the fallback button', doc.querySelector('.dshw-host') === null)
  check('teardown disposes the theme layer', o.layers.size === 0, `live=${o.layers.size}`)

  report('without the shared ball', o.results)
}

// ═══ Case 3: the settings document must not erase local values ══════════════
// The regression this guards: `settingsScope` resolves a section against its
// schema, so `value` carries a default for every field nobody ever set.
// Adopting it wholesale wiped a wallpaper that a pre-namespace build had stored
// locally — and wrote the wiped copy back, losing it from both places.
{
  const WALLPAPER = 'data:image/jpeg;base64,QUJD'
  const local = {
    enabled: true, opacity: 42, blur: 6, saturate: 140, dim: 12,
    fit: 'contain', wallpaper: WALLPAPER, buttonX: 300, buttonY: 200,
  }
  // What the Host resolves when no section was ever written.
  const schemaDefaults = {
    enabled: true, opacity: 55, blur: 18, saturate: 120, dim: 25,
    fit: 'cover', wallpaper: '', buttonX: -1, buttonY: -1,
  }

  const o = load({ withBall: false, platform: 'win32', seed: local, hostValue: schemaDefaults, hostUser: {} })
  const { check, window } = o
  const doc = window.document

  check('an untouched Host document keeps the locally stored wallpaper',
    doc.querySelector('.dshw-backdrop__image').style.backgroundImage.includes(WALLPAPER),
    doc.querySelector('.dshw-backdrop__image').style.backgroundImage)
  check('the local wallpaper is migrated up rather than dropped',
    o.setCalls.some(([field, value]) => field === 'wallpaper' && value === WALLPAPER),
    JSON.stringify(o.setCalls.map(c => c[0])))
  check('every field that diverges from the defaults is migrated',
    ['opacity', 'blur', 'saturate', 'dim', 'fit', 'wallpaper', 'buttonX', 'buttonY']
      .every(key => o.setCalls.some(([field]) => field === key)),
    JSON.stringify(o.setCalls.map(c => c[0])))
  check('the theme layer still uses the locally stored opacity',
    o.overrideCalls.at(-1).tokens['--dsw-alias-bg-base'].light.includes('42%, transparent'),
    o.overrideCalls.at(-1).tokens['--dsw-alias-bg-base'].light)
  check('an untouched document does not re-migrate on every snapshot',
    o.setCalls.length === 8, String(o.setCalls.length))
  o.scopeListener()
  check('a repeated snapshot migrates nothing further', o.setCalls.length === 8, String(o.setCalls.length))
  for (const cleanup of o.cleanups) cleanup.dispose()
  report('against an untouched settings document', o.results)
}

// A field the raw user layer names is authoritative, even against a local value.
{
  const o = load({
    withBall: false,
    platform: 'win32',
    seed: { opacity: 42 },
    hostValue: { ...{ enabled: true, opacity: 80, blur: 18, saturate: 120, dim: 25, fit: 'cover', wallpaper: '', buttonX: -1, buttonY: -1 } },
    hostUser: { opacity: 80 },
  })
  const { check } = o
  check('a field the user layer overrides wins over the local mirror',
    o.overrideCalls.at(-1).tokens['--dsw-alias-bg-base'].light.includes('80%, transparent'),
    o.overrideCalls.at(-1).tokens['--dsw-alias-bg-base'].light)
  check('an overridden field is not migrated back',
    !o.setCalls.some(([field]) => field === 'opacity'), JSON.stringify(o.setCalls))
  for (const cleanup of o.cleanups) cleanup.dispose()
  report('against a settings document with that field overridden', o.results)
}

/** Read one custom property out of the plugin's own stylesheets. */
function readVar(doc, name) {
  const css = [...doc.querySelectorAll('style[data-plugin="dsh-client-ui-glass"]')].map(tag => tag.textContent).join('')
  return new RegExp(`${name}:([^;}]+)`).exec(css)?.[1]?.trim()
}

console.log(`\n${failures.length === 0 ? 'all checks passed' : `${failures.length} FAILED:\n  ${failures.join('\n  ')}`}`)
process.exitCode = failures.length === 0 ? 0 : 1
