/**
 * Shared floating ball — node half.
 *
 * The ball itself lives in the browser half (`./client`, served from
 * `lib/client.js`). This half owns two Host-side concerns:
 *
 * 1. The durable settings namespace the desktop Plugins page and the ball's own
 *    panel both read and write.
 * 2. The local mascot route. `assets/mascot.<ext>` beside this package, when
 *    present, becomes the ball's default artwork — so artwork that carries its
 *    own licence can be dropped next to an installation without ever entering
 *    this repository's history. Absent the file, the route answers 404 and the
 *    browser half keeps its built-in art.
 *
 * Plain JavaScript on purpose: this package ships without a build step, so
 * every artifact here is what Node actually executes. Types live in JSDoc.
 */

import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import z from '@deepseek-ai/schemastery'

/** Cordis plugin name. */
export const name = 'ui-ball'

/** Settings namespace owned by this plugin. Durable sections live in `$DSH_HOME/settings.yaml`. */
export const BALL_NAMESPACE = 'ui-ball'

/** Path the local mascot route answers on; the browser half requests exactly this. */
export const MASCOT_ROUTE = '/ui-ball/mascot'

/** Directory beside this package holding an optional local mascot. */
export const MASCOT_DIRECTORY = fileURLToPath(new URL('../assets/', import.meta.url))

/**
 * Local mascot filenames in preference order, with the content type each is
 * served as. The list is fixed and the directory is derived from this package's
 * own location, so the route never reads a caller-supplied path.
 */
export const MASCOT_FILES = [
  ['mascot.svg', 'image/svg+xml'],
  ['mascot.webp', 'image/webp'],
  ['mascot.png', 'image/png'],
  ['mascot.jpeg', 'image/jpeg'],
  ['mascot.jpg', 'image/jpeg'],
  ['mascot.gif', 'image/gif'],
]

/** Ball sizes accepted by the schema, in px. */
export const BALL_SIZE_MIN = 28
export const BALL_SIZE_MAX = 96

/** Panel widths accepted by the schema, in px. */
export const SURFACE_WIDTH_MIN = 240
export const SURFACE_WIDTH_MAX = 480

/** Idle animations the ball can play. */
export const BALL_MOTIONS = ['breathe', 'sway', 'none']

/** Sentinel for "no stored position yet"; the browser places the ball in its default corner. */
export const POSITION_UNSET = -1

/**
 * Durable ball section. These field names are the settings path segments the
 * browser half writes through `ctx.settingsScope`; both halves must agree, so
 * this schema is the contract between them.
 *
 * @typedef {object} BallSettings
 * @property {string} image - An http(s)/data URL or a short glyph; empty means "use the local asset, else the built-in art".
 * @property {number} size - Rendered ball diameter in px.
 * @property {number} opacity - Ball opacity in percent.
 * @property {string} motion - Idle animation.
 * @property {number} surfaceWidth - Hosted panel width in px.
 * @property {number} x - Viewport x of the ball's top-left corner, or {@link POSITION_UNSET}.
 * @property {number} y - Viewport y of the ball's top-left corner, or {@link POSITION_UNSET}.
 */

/** Durable ball schema; also the wire envelope the browser scope validates against. */
export const BallSettingsSchema = z.object({
  image: z.string().default(''),
  size: z.number().step(1).min(BALL_SIZE_MIN).max(BALL_SIZE_MAX).default(52),
  opacity: z.number().step(1).min(20).max(100).default(92),
  motion: z.union([...BALL_MOTIONS]).default('breathe'),
  surfaceWidth: z.number().step(1).min(SURFACE_WIDTH_MIN).max(SURFACE_WIDTH_MAX).default(300),
  x: z.number().step(1).min(POSITION_UNSET).default(POSITION_UNSET),
  y: z.number().step(1).min(POSITION_UNSET).default(POSITION_UNSET),
})

/**
 * Serve the first local mascot file that exists, or 404 so the browser half
 * keeps its built-in art. `no-cache` is deliberate: replacing the file on disk
 * is the whole workflow, and a cached copy would hide it.
 * @param {import('node:http').IncomingMessage} req - the request.
 * @param {import('node:http').ServerResponse} res - the response.
 */
async function serveMascot(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { allow: 'GET, HEAD' })
    res.end()
    return
  }
  for (const [fileName, contentType] of MASCOT_FILES) {
    let body
    try {
      body = await readFile(join(MASCOT_DIRECTORY, fileName))
    } catch (error) {
      // Only a missing candidate moves on to the next name; a real read failure
      // (permissions, a directory in the way) is the operator's problem and
      // must not be disguised as "no mascot configured".
      if (error.code === 'ENOENT' || error.code === 'EISDIR') continue
      throw error
    }
    res.writeHead(200, {
      'content-type': contentType,
      'content-length': body.byteLength,
      'cache-control': 'no-cache',
    })
    res.end(req.method === 'HEAD' ? undefined : body)
    return
  }
  res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-cache' })
  res.end('no local mascot asset\n')
}

/**
 * Host plugin body: serve the ball's settings namespace and its local mascot
 * route. `ctx.inject` rather than a hard `inject` export keeps the ball usable
 * in a composition without either service — the browser half then falls back to
 * its own local store and its built-in art.
 * @param {import('@deepseek-ai/cordis').Context} ctx - host cordis context.
 */
export function apply(ctx) {
  ctx.inject(['settings'], (settingsCtx) => {
    settingsCtx.settings.register(BALL_NAMESPACE, BallSettingsSchema)
  })
  ctx.inject(['webServer'], (webCtx) => {
    webCtx.effect(
      () => webCtx.webServer.register({ kind: 'exact', path: MASCOT_ROUTE, handler: serveMascot }),
      'ui-ball: local mascot route',
    )
  })
}
