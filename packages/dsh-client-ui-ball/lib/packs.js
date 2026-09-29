/**
 * Mascot packs — named, multi-state artwork for the ball.
 *
 * A pack is a directory under `assets/packs/` holding a `pack.json` and one
 * image per declared state:
 *
 *     assets/packs/whale-girl/
 *       pack.json     { "title": { … }, "author": "…", "license": "…",
 *                       "states": { "idle": "idle.png", "working": "working.png" } }
 *       idle.png
 *       working.png
 *
 * The single `assets/mascot.*` file from before is still supported and is
 * offered as a pack of its own, so a one-image setup keeps working.
 *
 * Both the pack id and the state names are validated against this index before
 * any file is read, so a request can never name a path of its own.
 *
 * Plain JavaScript on purpose: this package ships without a build step. Types
 * live in JSDoc.
 */

import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

/** States a pack may declare. The ball renders `idle` when a state has no art of its own. */
export const PACK_STATES = ['idle', 'working', 'waiting', 'done']

/** Image extensions accepted for a pack's state artwork, with their content types. */
const IMAGE_TYPES = new Map([
  ['.svg', 'image/svg+xml'],
  ['.webp', 'image/webp'],
  ['.png', 'image/png'],
  ['.jpeg', 'image/jpeg'],
  ['.jpg', 'image/jpeg'],
  ['.gif', 'image/gif'],
])

/** Pack and state identifiers must look like this; anything else is rejected before touching disk. */
const IDENTIFIER = /^[a-z0-9][a-z0-9-]*$/

/**
 * Read one localized string, accepting a plain string or a `{ zh, en }` pair.
 * @param {unknown} value - the declared value.
 * @returns {{ zh: string, en: string } | undefined} the normalized pair.
 */
function readText(value) {
  if (typeof value === 'string' && value !== '') return { zh: value, en: value }
  if (typeof value !== 'object' || value === null) return undefined
  const record = /** @type {Record<string, unknown>} */ (value)
  const zh = typeof record.zh === 'string' ? record.zh : undefined
  const en = typeof record.en === 'string' ? record.en : undefined
  if (zh === undefined && en === undefined) return undefined
  return { zh: zh ?? en, en: en ?? zh }
}

/**
 * Content type for a declared artwork filename.
 * @param {string} fileName - the name declared by the pack.
 * @returns {string | undefined} the content type, or undefined when the extension is not an accepted image.
 */
function imageType(fileName) {
  const lower = fileName.toLowerCase()
  for (const [extension, type] of IMAGE_TYPES) {
    if (lower.endsWith(extension)) return type
  }
  return undefined
}

/**
 * Read every pack under `<assets>/packs`.
 *
 * A pack that cannot be read is reported with `problem` rather than dropped,
 * so the gallery can say what is wrong instead of silently losing artwork.
 *
 * @param {string} assetsDirectory - this package's `assets` directory.
 * @returns {object[]} one entry per pack directory, plus the single-file default.
 */
export function readPackIndex(assetsDirectory) {
  const packsDirectory = join(assetsDirectory, 'packs')
  let names
  try {
    names = readdirSync(packsDirectory, { withFileTypes: true })
      .filter(entry => entry.isDirectory())
      .map(entry => entry.name)
      .sort()
  } catch (error) {
    // No packs directory is the ordinary case for a single-image setup.
    if (error.code === 'ENOENT' || error.code === 'ENOTDIR') return []
    throw error
  }

  const packs = []
  for (const name of names) {
    if (!IDENTIFIER.test(name)) {
      packs.push({ id: name, title: { zh: name, en: name }, problem: 'pack directory name must be a lowercase hyphenated identifier' })
      continue
    }
    let manifest
    try {
      manifest = JSON.parse(readFileSync(join(packsDirectory, name, 'pack.json'), 'utf8'))
    } catch (error) {
      packs.push({
        id: name,
        title: { zh: name, en: name },
        problem: error.code === 'ENOENT' ? 'pack.json is missing' : 'pack.json is not valid JSON',
      })
      continue
    }
    if (typeof manifest !== 'object' || manifest === null) {
      packs.push({ id: name, title: { zh: name, en: name }, problem: 'pack.json is not an object' })
      continue
    }
    const title = readText(manifest.title) ?? { zh: name, en: name }
    /** @type {Record<string, string>} */
    const states = {}
    const declared = typeof manifest.states === 'object' && manifest.states !== null ? manifest.states : {}
    let problem
    for (const [state, fileName] of Object.entries(declared)) {
      if (!PACK_STATES.includes(state)) { problem = `unknown state "${state}"`; break }
      if (typeof fileName !== 'string' || imageType(fileName) === undefined) {
        problem = `state "${state}" is not an svg/webp/png/jpeg/gif filename`
        break
      }
      // A declared name is a file name, never a path.
      if (fileName.includes('/') || fileName.includes('\\')) { problem = `state "${state}" must be a plain file name`; break }
      states[state] = fileName
    }
    if (problem === undefined && states.idle === undefined) problem = 'a pack needs an "idle" state'
    const pack = { id: name, title, states }
    // An author is a name, not copy: it is never translated.
    if (typeof manifest.author === 'string' && manifest.author !== '') pack.author = manifest.author
    if (typeof manifest.license === 'string' && manifest.license !== '') pack.license = manifest.license
    if (problem !== undefined) pack.problem = problem
    packs.push(pack)
  }
  return packs
}

/**
 * Resolve one pack state to a file on disk.
 * @param {string} assetsDirectory - this package's `assets` directory.
 * @param {string} packId - a pack id from {@link readPackIndex}.
 * @param {string} state - a state from {@link PACK_STATES}.
 * @returns {{ path: string, contentType: string } | undefined} the file to serve, or undefined when the pack has no art for that state.
 */
export function resolvePackAsset(assetsDirectory, packId, state) {
  if (!IDENTIFIER.test(packId) || !PACK_STATES.includes(state)) return undefined
  const pack = readPackIndex(assetsDirectory).find(candidate => candidate.id === packId)
  if (pack === undefined || pack.problem !== undefined) return undefined
  const fileName = pack.states[state] ?? pack.states.idle
  if (fileName === undefined) return undefined
  const contentType = imageType(fileName)
  if (contentType === undefined) return undefined
  return { path: join(assetsDirectory, 'packs', packId, fileName), contentType }
}
