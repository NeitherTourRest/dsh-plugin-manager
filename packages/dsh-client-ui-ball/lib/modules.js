/**
 * Ball module directory — the Host half of the `dsh.ball` protocol.
 *
 * A plugin joins the ball by declaring `dsh.ball` in its own `package.json`:
 *
 *     "dsh": {
 *       "client": { "platform": "web" },
 *       "ball": {
 *         "id": "ui-glass",
 *         "title": { "zh": "磨砂外观", "en": "Glass" },
 *         "icon": "◐",
 *         "order": 10,
 *         "settings": { "namespace": "ui-glass", "fields": [ … ] }
 *       }
 *     }
 *
 * The declaration is what makes a plugin *discoverable*, which is the point of
 * scanning the loader rather than trusting the plugin to announce itself: a row
 * whose plugin is disabled, or whose client half failed to load, still appears
 * in the directory with its state and can be switched back on from the ball.
 *
 * The scan reads manifests only. It never imports a declared module, so a
 * broken plugin cannot break the directory.
 *
 * Plain JavaScript on purpose: this package ships without a build step. Types
 * live in JSDoc.
 */

import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

/** Field kinds the ball knows how to render. */
export const FIELD_KINDS = ['toggle', 'range', 'select', 'text', 'image']

/** Declared identifiers must look like this; anything else is rejected. */
const IDENTIFIER = /^[a-z0-9][a-z0-9-]*$/

/**
 * Read one localized string, accepting either a plain string or a
 * `{ zh, en }` pair.
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
 * Validate one declared field.
 * @param {unknown} value - the raw declaration.
 * @param {number} index - its position, used in diagnostics.
 * @returns {{ field: object } | { problem: string }} the normalized field or why it was rejected.
 */
function readField(value, index) {
  if (typeof value !== 'object' || value === null) return { problem: `field ${String(index)} is not an object` }
  const record = /** @type {Record<string, unknown>} */ (value)
  const key = record.key
  if (typeof key !== 'string' || key === '') return { problem: `field ${String(index)} has no key` }
  const kind = record.kind
  if (typeof kind !== 'string' || !FIELD_KINDS.includes(kind)) {
    return { problem: `field "${key}" has unsupported kind ${JSON.stringify(kind)}` }
  }
  const label = readText(record.label)
  if (label === undefined) return { problem: `field "${key}" has no label` }
  /** @type {Record<string, unknown>} */
  const field = { key, kind, label }
  if (record.hint !== undefined) {
    const hint = readText(record.hint)
    if (hint !== undefined) field.hint = hint
  }
  if (kind === 'range') {
    const min = record.min
    const max = record.max
    if (typeof min !== 'number' || typeof max !== 'number' || !(min < max)) {
      return { problem: `range field "${key}" needs numeric min < max` }
    }
    field.min = min
    field.max = max
    field.step = typeof record.step === 'number' && record.step > 0 ? record.step : 1
    if (typeof record.unit === 'string') field.unit = record.unit
  }
  if (kind === 'select') {
    if (!Array.isArray(record.options) || record.options.length === 0) {
      return { problem: `select field "${key}" needs a non-empty options array` }
    }
    const options = []
    for (const candidate of record.options) {
      if (typeof candidate !== 'object' || candidate === null) return { problem: `select field "${key}" has a malformed option` }
      const option = /** @type {Record<string, unknown>} */ (candidate)
      const optionLabel = readText(option.label)
      if (typeof option.value !== 'string' || optionLabel === undefined) {
        return { problem: `select field "${key}" has an option without a string value and label` }
      }
      options.push({ value: option.value, label: optionLabel })
    }
    field.options = options
  }
  return { field }
}

/**
 * Validate one `dsh.ball` declaration.
 * @param {string} packageName - the declaring package, for diagnostics.
 * @param {unknown} declaration - the raw value.
 * @returns {{ module: object } | { problem: string }} the normalized declaration or why it was rejected.
 */
export function readBallDeclaration(packageName, declaration) {
  if (typeof declaration !== 'object' || declaration === null) {
    return { problem: `${packageName} has a non-object dsh.ball declaration` }
  }
  const record = /** @type {Record<string, unknown>} */ (declaration)
  const id = record.id
  if (typeof id !== 'string' || !IDENTIFIER.test(id)) {
    return { problem: `${packageName} dsh.ball.id must be a lowercase hyphenated identifier` }
  }
  const title = readText(record.title)
  if (title === undefined) return { problem: `${packageName} dsh.ball.title is missing` }

  /** @type {Record<string, unknown>} */
  const module = { id, package: packageName, title }
  if (record.description !== undefined) {
    const description = readText(record.description)
    if (description !== undefined) module.description = description
  }
  if (typeof record.icon === 'string' && record.icon !== '') module.icon = record.icon
  if (typeof record.order === 'number' && Number.isFinite(record.order)) module.order = record.order

  if (record.settings !== undefined) {
    if (typeof record.settings !== 'object' || record.settings === null) {
      return { problem: `${packageName} dsh.ball.settings is not an object` }
    }
    const settings = /** @type {Record<string, unknown>} */ (record.settings)
    const namespace = settings.namespace
    if (typeof namespace !== 'string' || !IDENTIFIER.test(namespace)) {
      return { problem: `${packageName} dsh.ball.settings.namespace must be a lowercase hyphenated identifier` }
    }
    const declared = settings.fields
    if (!Array.isArray(declared)) {
      return { problem: `${packageName} dsh.ball.settings.fields must be an array` }
    }
    const fields = []
    const seen = new Set()
    for (const [index, candidate] of declared.entries()) {
      const read = readField(candidate, index)
      if ('problem' in read) return { problem: `${packageName}: ${read.problem}` }
      if (seen.has(read.field.key)) return { problem: `${packageName} declares field "${read.field.key}" twice` }
      seen.add(read.field.key)
      fields.push(read.field)
    }
    if (fields.length > 0) module.settings = { namespace, fields }
  }
  return { module }
}

/**
 * Locate a package's manifest from an entry's module specifier, mirroring the
 * resolution the Loader itself uses so a manifest is found for exactly the
 * module that was imported.
 * @param {object} loader - the cordis Loader.
 * @param {string} specifier - the entry's module specifier.
 * @param {string} baseUrl - the owning tree's resolution base.
 * @returns {string | undefined} the manifest path, or undefined when the specifier names no package.
 */
function locateManifest(loader, specifier, baseUrl) {
  if (specifier.startsWith('cordis:')) return undefined
  const internal = loader.internal
  if (internal === undefined || typeof Reflect.get(internal, 'resolveSync') !== 'function') {
    try {
      return createRequire(baseUrl).resolve(`${specifier}/package.json`)
    } catch {
      // A specifier the resolver cannot answer names no package this process
      // could have imported; there is nothing to scan.
      return undefined
    }
  }
  let moduleUrl
  try {
    moduleUrl = internal.version === 'v2'
      ? internal.resolveSync(baseUrl, { specifier, attributes: {} }).url
      : internal.resolveSync(specifier, baseUrl, {}).url
  } catch {
    return undefined
  }
  if (typeof moduleUrl !== 'string' || !moduleUrl.startsWith('file:')) return undefined
  // Walk up to the nearest manifest: a specifier may resolve to a subpath
  // entry, and only the declaring package owns a `dsh` block.
  let directory = dirname(fileURLToPath(moduleUrl))
  for (;;) {
    const candidate = join(directory, 'package.json')
    try {
      const manifest = JSON.parse(readFileSync(candidate, 'utf8'))
      if (typeof manifest.name === 'string' && manifest.name !== '') return candidate
    } catch {
      // No manifest here, or an unreadable one: keep walking toward the
      // declaring package root.
    }
    const parent = dirname(directory)
    if (parent === directory) return undefined
    directory = parent
  }
}

/**
 * Read the declaration of one loader row.
 * @param {object} loader - the cordis Loader.
 * @param {object} entry - a loader entry.
 * @returns {object | undefined} the normalized module, or undefined when the row declares no ball module.
 */
function readEntry(loader, entry) {
  const specifier = entry.options?.name
  if (typeof specifier !== 'string' || specifier === '') return undefined
  // A group row carries no module of its own.
  if (entry.options?.group) return undefined
  const baseUrl = entry.parent?.tree?.ctx?.baseUrl
  if (typeof baseUrl !== 'string') return undefined
  const manifestPath = locateManifest(loader, specifier, baseUrl)
  if (manifestPath === undefined) return undefined
  let manifest
  try {
    manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
  } catch {
    return undefined
  }
  const declaration = manifest?.dsh?.ball
  if (declaration === undefined) return undefined

  const state = {
    rowId: typeof entry.options?.id === 'string' ? entry.options.id : undefined,
    entryId: typeof entry.id === 'string' ? entry.id : undefined,
    enabled: entry.disabled !== true,
    active: entry.fiber !== undefined && entry.disabled !== true,
  }
  const read = readBallDeclaration(typeof manifest.name === 'string' ? manifest.name : specifier, declaration)
  if ('problem' in read) return { ...state, package: specifier, id: undefined, problem: read.problem }
  return { ...read.module, ...state }
}

/**
 * The current ball module directory, in declaration order.
 *
 * A row whose declaration is malformed is still listed, carrying `problem`, so
 * the ball can show it and say what is wrong instead of hiding a plugin the
 * user can see in the profile.
 *
 * @param {object} loader - the cordis Loader.
 * @returns {object[]} one entry per row that declares `dsh.ball`.
 */
export function collectBallModules(loader) {
  const modules = []
  for (const entry of loader.entries()) {
    const module = readEntry(loader, entry)
    if (module !== undefined) modules.push(module)
  }
  return modules
}
