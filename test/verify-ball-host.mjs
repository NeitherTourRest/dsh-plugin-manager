/**
 * Host-half harness for dsh-client-ui-ball.
 *
 * Drives the local mascot route directly: it imports the real `lib/index.js`
 * through a resolution hook that supplies a schemastery stand-in (the real
 * package is a peer from the dsh installation, not from this repository), then
 * invokes the registered handler with mock request/response objects.
 *
 * This is the only check that covers the Host half's own logic — file
 * preference order, content types, the method guard, the empty-directory 404
 * that keeps the browser half's built-in art, and the HEAD path.
 *
 * Run from the repository root:
 *   node test/verify-ball-host.mjs
 */
import { rmSync, writeFileSync, mkdirSync, readFileSync, existsSync, renameSync } from 'node:fs'
import { join } from 'node:path'
import { register } from 'node:module'
import { pathToFileURL } from 'node:url'

register('./schemastery-loader.mjs', import.meta.url)

const results = []
const check = (name, condition, detail) => {
  results.push({ name, ok: Boolean(condition), detail })
}

const plugin = await import('../packages/dsh-client-ui-ball/lib/index.js')

// ── the module's declared surface ───────────────────────────────────────────
check('exports name/apply', plugin.name === 'ui-ball' && typeof plugin.apply === 'function')
check('declares the mascot route', plugin.MASCOT_ROUTE === '/ui-ball/mascot', String(plugin.MASCOT_ROUTE))
check('declares the module directory route', plugin.MODULE_ROUTE === '/ui-ball/modules', String(plugin.MODULE_ROUTE))
check('publishes the protocol version', plugin.BALL_PROTOCOL === 1, String(plugin.BALL_PROTOCOL))
check('prefers svg, then webp, then png, then jpeg, then gif',
  plugin.MASCOT_FILES.map(entry => entry[0]).join() ===
  'mascot.svg,mascot.webp,mascot.png,mascot.jpeg,mascot.jpg,mascot.gif',
  plugin.MASCOT_FILES.map(entry => entry[0]).join())
check('the mascot directory resolves beside the package',
  plugin.MASCOT_DIRECTORY.endsWith('dsh-client-ui-ball/assets/') || plugin.MASCOT_DIRECTORY.endsWith('dsh-client-ui-ball\\assets\\'),
  plugin.MASCOT_DIRECTORY)

// ── a virtual loader over the fixture packages ──────────────────────────────
// `resolveSync` maps a specifier to the fixture's entry file, which is exactly
// what the real Loader hands the scanner; the walk from there to the nearest
// manifest is the code under test.
const fixtureEntry = name => pathToFileURL(join(process.cwd(), 'test', 'fixtures', name, 'index.js')).href
const resolvable = {
  '@fixture/good': fixtureEntry('good'),
  '@fixture/bad': fixtureEntry('bad'),
  '@fixture/plain': fixtureEntry('plain'),
}
let rows = []
const loader = {
  internal: {
    version: 'v1',
    resolveSync(specifier) {
      const url = resolvable[specifier]
      if (url === undefined) throw new Error(`unresolvable: ${specifier}`)
      return { url }
    },
  },
  entries: () => rows,
}
const row = (specifier, rowId, { disabled = false, active = true } = {}) => ({
  id: `include:${rowId}`,
  options: { name: specifier, id: rowId },
  disabled,
  fiber: active ? {} : undefined,
  parent: { tree: { ctx: { baseUrl: 'file:///virtual/profile/' } } },
})

// ── capture the registrations apply() makes ─────────────────────────────────
const namespaces = []
const routes = []
const effects = []
const makeCtx = () => ({
  inject(services, callback) {
    const list = Array.isArray(services) ? services : [services]
    if (list.includes('webServer')) {
      callback({
        loader,
        effect: (body, label) => { effects.push(label); return body() },
        webServer: { register: (route) => { routes.push(route); return () => {} } },
      })
      return () => {}
    }
    callback({ settings: { register: (ns) => { namespaces.push(ns); return {} } } })
    return () => {}
  },
})

plugin.apply(makeCtx())
check('registers the ui-ball settings namespace', namespaces.join() === 'ui-ball', namespaces.join())
check('registers the mascot route and the directory route',
  routes.map(route => route.path).sort().join() === '/ui-ball/mascot,/ui-ball/modules',
  routes.map(route => route.path).join())
check('both routes are exact',
  routes.every(route => route.kind === 'exact'), routes.map(route => route.kind).join())
check('each route is owned by an effect', effects.length === 2, effects.join())

const serve = routes.find(route => route.path === plugin.MASCOT_ROUTE).handler
const serveModules = routes.find(route => route.path === plugin.MODULE_ROUTE).handler
const request = (method) => ({ method })
const response = () => {
  const res = { status: undefined, headers: undefined, body: undefined }
  res.writeHead = (status, headers) => { res.status = status; res.headers = headers ?? {} }
  res.end = (body) => { res.body = body }
  return res
}
/** Read the directory the way the browser half will. */
const directory = async () => {
  const res = response()
  await serveModules(request('GET'), res)
  return { res, json: JSON.parse(res.body.toString('utf8')) }
}

// ── the shipped mascot, then the empty-directory case ───────────────────────
const SHIPPED = join(plugin.MASCOT_DIRECTORY, 'mascot.png')
const HELD = join(plugin.MASCOT_DIRECTORY, 'mascot.png.held')
// The repository ships artwork here, and this test both reads and displaces it,
// so the original bytes are captured up front and restored in the finally block
// below no matter how the run ends.
const shippedBytes = existsSync(SHIPPED) ? readFileSync(SHIPPED) : null
check('the package ships a default mascot', shippedBytes !== null)
check('the shipped mascot is a PNG',
  shippedBytes !== null && shippedBytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  shippedBytes?.subarray(0, 8).toString('hex'))

{
  const res = response()
  await serve(request('GET'), res)
  check('the shipped mascot is served as image/png',
    res.status === 200 && res.headers['content-type'] === 'image/png', `${res.status} ${res.headers?.['content-type']}`)
  check('the shipped bytes are returned unchanged',
    shippedBytes !== null && Buffer.from(res.body).equals(shippedBytes))
  check('content-length matches the shipped file',
    shippedBytes !== null && res.headers['content-length'] === shippedBytes.byteLength,
    String(res.headers['content-length']))
  check('the response is never cached', res.headers['cache-control'] === 'no-cache',
    String(res.headers['cache-control']))
}

const SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8 8"/>'
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47])
mkdirSync(plugin.MASCOT_DIRECTORY, { recursive: true })
// `mascot.png.held` is deliberately not one of the served names, so holding the
// shipped file aside is indistinguishable from it being absent.
renameSync(SHIPPED, HELD)

{
  const res = response()
  await serve(request('GET'), res)
  check('no asset at all answers 404', res.status === 404, String(res.status))
  check('the 404 is not cached', res.headers?.['cache-control'] === 'no-cache', String(res.headers?.['cache-control']))
}

// ── with candidate artwork present ──────────────────────────────────────────
const written = []
const place = (name, body) => {
  writeFileSync(join(plugin.MASCOT_DIRECTORY, name), body)
  written.push(join(plugin.MASCOT_DIRECTORY, name))
}

try {
  place('mascot.png', PNG)
  {
    const res = response()
    await serve(request('GET'), res)
    check('a lone png is served as image/png',
      res.status === 200 && res.headers['content-type'] === 'image/png', `${res.status} ${res.headers?.['content-type']}`)
    check('the png bytes are returned unchanged', Buffer.from(res.body).equals(PNG))
    check('content-length matches the file', res.headers['content-length'] === PNG.byteLength,
      String(res.headers['content-length']))
  }

  place('mascot.svg', SVG)
  {
    const res = response()
    await serve(request('GET'), res)
    check('svg wins over a lower-priority candidate',
      res.headers?.['content-type'] === 'image/svg+xml', String(res.headers?.['content-type']))
    check('the svg text is returned', res.body.toString() === SVG, String(res.body))
  }

  {
    const res = response()
    await serve(request('HEAD'), res)
    check('HEAD answers 200 with headers', res.status === 200 && res.headers['content-length'] > 0,
      `${res.status} ${res.headers?.['content-length']}`)
    check('HEAD sends no body', res.body === undefined, String(res.body))
  }

  for (const method of ['POST', 'PUT', 'DELETE']) {
    const res = response()
    await serve(request(method), res)
    check(`${method} is rejected with 405`, res.status === 405 && res.headers.allow === 'GET, HEAD',
      `${res.status} ${res.headers?.allow}`)
  }

  // A directory named like a candidate must not be mistaken for artwork.
  rmSync(written.pop(), { force: true })
  rmSync(written.pop(), { force: true })
  mkdirSync(join(plugin.MASCOT_DIRECTORY, 'mascot.svg'), { recursive: true })
  written.push(join(plugin.MASCOT_DIRECTORY, 'mascot.svg'))
  const res = response()
  await serve(request('GET'), res)
  check('a directory named mascot.svg falls through to 404', res.status === 404, String(res.status))
} finally {
  for (const path of written) rmSync(path, { recursive: true, force: true })
  // The shipped mascot is restored, not recreated, so a failing run can never
  // leave the repository without its default artwork.
  if (existsSync(HELD)) {
    rmSync(SHIPPED, { force: true })
    renameSync(HELD, SHIPPED)
  }
}

// ── the module directory ────────────────────────────────────────────────────
rows = [row('@fixture/good', 'good'), row('@fixture/bad', 'bad'), row('@fixture/plain', 'plain')]
{
  const { res, json } = await directory()
  check('the directory answers JSON', res.status === 200 && String(res.headers['content-type']).startsWith('application/json'),
    `${res.status} ${res.headers?.['content-type']}`)
  check('the directory is never cached', res.headers['cache-control'] === 'no-cache', String(res.headers['cache-control']))
  check('it publishes the protocol version', json.protocol === 1, String(json.protocol))
  check('it lists only rows that declare dsh.ball',
    json.modules.map(module => module.rowId).join() === 'good,bad', json.modules.map(module => module.rowId).join())

  const good = json.modules.find(module => module.rowId === 'good')
  check('a declaration is normalized with its package', good.id === 'fixture-good' && good.package === '@fixture/good')
  check('title and description arrive as locale pairs',
    good.title.zh === '完好的模块' && good.title.en === 'Well-formed module' && good.description.zh === '用于验证目录扫描')
  check('icon and order survive', good.icon === '★' && good.order === 3)
  check('the management key is the loader entry id', good.entryId === 'include:good', String(good.entryId))
  check('an active row reports enabled and active', good.enabled === true && good.active === true)

  check('the settings namespace is carried', good.settings.namespace === 'fixture-good')
  const fields = good.settings.fields
  check('every declared field kind is accepted',
    fields.map(field => `${field.key}:${field.kind}`).join() === 'enabled:toggle,level:range,mode:select,note:text,art:image',
    fields.map(field => `${field.key}:${field.kind}`).join())
  const level = fields.find(field => field.key === 'level')
  check('a range carries its bounds, step and unit',
    level.min === 0 && level.max === 10 && level.step === 2 && level.unit === '级',
    JSON.stringify(level))
  check('a plain-string label becomes both locales', fields.find(field => field.key === 'note').label.zh === 'Note')
  check('a select carries normalized options',
    fields.find(field => field.key === 'mode').options.map(option => option.value).join() === 'a,b')

  const bad = json.modules.find(module => module.rowId === 'bad')
  check('a malformed declaration is listed with its problem, not hidden',
    typeof bad.problem === 'string' && bad.problem.includes('lowercase hyphenated identifier'), String(bad.problem))
  check('a malformed declaration still reports its row', bad.rowId === 'bad' && bad.id === undefined)
}

{
  rows = [row('@fixture/good', 'good', { disabled: true, active: false })]
  const { json } = await directory()
  const disabled = json.modules[0]
  check('a disabled row is still listed', disabled !== undefined)
  check('a disabled row reports enabled=false and active=false',
    disabled?.enabled === false && disabled?.active === false, JSON.stringify(disabled))
}

{
  rows = [row('@fixture/unknown', 'unknown'), row('@fixture/plain', 'plain')]
  const { json } = await directory()
  check('rows that resolve to no package, or declare no ball block, are skipped',
    json.modules.length === 0, JSON.stringify(json.modules))
}

{
  rows = [{ id: 'group', options: { id: 'group', group: true }, parent: { tree: { ctx: {} } } }]
  const { json } = await directory()
  check('a group row is skipped', json.modules.length === 0, JSON.stringify(json.modules))
}

{
  const write = response()
  await serveModules(request('POST'), write)
  check('the directory rejects writes with 405',
    write.status === 405 && write.headers.allow === 'GET, HEAD', `${write.status} ${write.headers?.allow}`)
  const head = response()
  await serveModules(request('HEAD'), head)
  check('the directory answers HEAD without a body', head.status === 200 && head.body === undefined)
}

// ── report ──────────────────────────────────────────────────────────────────
let failed = 0
for (const { name, ok, detail } of results) {
  if (!ok) failed += 1
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok || detail === undefined ? '' : `\n        → ${detail}`}`)
}
console.log(`\n${results.length - failed}/${results.length} checks passed`)
process.exitCode = failed === 0 ? 0 : 1
