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
import { rmSync, writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { register } from 'node:module'

register('./schemastery-loader.mjs', import.meta.url)

const results = []
const check = (name, condition, detail) => {
  results.push({ name, ok: Boolean(condition), detail })
}

const plugin = await import('../packages/dsh-client-ui-ball/lib/index.js')

// ── the module's declared surface ───────────────────────────────────────────
check('exports name/apply', plugin.name === 'ui-ball' && typeof plugin.apply === 'function')
check('declares the mascot route', plugin.MASCOT_ROUTE === '/ui-ball/mascot', String(plugin.MASCOT_ROUTE))
check('prefers svg, then webp, then png, then jpeg, then gif',
  plugin.MASCOT_FILES.map(entry => entry[0]).join() ===
  'mascot.svg,mascot.webp,mascot.png,mascot.jpeg,mascot.jpg,mascot.gif',
  plugin.MASCOT_FILES.map(entry => entry[0]).join())
check('the mascot directory resolves beside the package',
  plugin.MASCOT_DIRECTORY.endsWith('dsh-client-ui-ball/assets/') || plugin.MASCOT_DIRECTORY.endsWith('dsh-client-ui-ball\\assets\\'),
  plugin.MASCOT_DIRECTORY)

// ── capture the registrations apply() makes ─────────────────────────────────
const namespaces = []
const routes = []
const effects = []
const makeCtx = () => ({
  inject(services, callback) {
    const list = Array.isArray(services) ? services : [services]
    if (list.includes('webServer')) {
      callback({
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
check('registers exactly one route', routes.length === 1, String(routes.length))
check('the route is exact and carries the published path',
  routes[0]?.kind === 'exact' && routes[0]?.path === '/ui-ball/mascot',
  `${routes[0]?.kind} ${routes[0]?.path}`)
check('the route is owned by an effect', effects.length === 1, effects.join())

const serve = routes[0].handler
const request = (method) => ({ method })
const response = () => {
  const res = { status: undefined, headers: undefined, body: undefined }
  res.writeHead = (status, headers) => { res.status = status; res.headers = headers ?? {} }
  res.end = (body) => { res.body = body }
  return res
}

// The package ships no artwork, so the first read is the empty-directory case.
{
  const res = response()
  await serve(request('GET'), res)
  check('no local asset answers 404', res.status === 404, String(res.status))
  check('the 404 is not cached', res.headers?.['cache-control'] === 'no-cache', String(res.headers?.['cache-control']))
}

// ── with artwork present ────────────────────────────────────────────────────
const SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8 8"/>'
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47])
mkdirSync(plugin.MASCOT_DIRECTORY, { recursive: true })
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
  // Leave the directory in place; it is the documented drop-in location.
}

// ── report ──────────────────────────────────────────────────────────────────
let failed = 0
for (const { name, ok, detail } of results) {
  if (!ok) failed += 1
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok || detail === undefined ? '' : `\n        → ${detail}`}`)
}
console.log(`\n${results.length - failed}/${results.length} checks passed`)
process.exitCode = failed === 0 ? 0 : 1
