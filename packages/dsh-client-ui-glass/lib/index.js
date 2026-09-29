/**
 * Frosted-glass skin — node half.
 *
 * The skin itself lives in the browser half (`./client`, served from
 * `lib/client.js`). This half owns the durable settings namespace that the
 * desktop Plugins page and the skin's own panel both read and write.
 *
 * Plain JavaScript on purpose: this package ships without a build step, so
 * every artifact here is what Node actually executes. Types live in JSDoc.
 */

import z from '@deepseek-ai/schemastery'

/** Cordis plugin name. */
export const name = 'ui-glass'

/** Settings namespace owned by this plugin. Durable sections live in `$DSH_HOME/settings.yaml`. */
export const GLASS_NAMESPACE = 'ui-glass'

/** Wallpaper sizing modes accepted by the schema. */
export const GLASS_FITS = ['cover', 'contain', 'repeat']

/** Longest edge the browser downscales a picked wallpaper to, restated here so the document bound is visible. */
export const WALLPAPER_MAX_EDGE = 1920

/**
 * Durable skin section. These field names are the settings path segments the
 * browser half writes through `ctx.settingsScope`; both halves must agree.
 *
 * `wallpaper` accepts an http(s)/data URL. A locally picked image is stored as
 * a downscaled data URI, so this document can grow by a few hundred kilobytes —
 * the price of one shared value across the desktop and Web surfaces.
 *
 * @typedef {object} GlassSettings
 * @property {boolean} enabled - Whether the skin paints at all.
 * @property {number} opacity - Surface alpha in percent; 0 is the fully clear state.
 * @property {number} blur - Backdrop blur radius in px.
 * @property {number} saturate - Backdrop saturation in percent.
 * @property {number} dim - Black scrim alpha over the wallpaper in percent.
 * @property {string} fit - Wallpaper sizing mode.
 * @property {string} wallpaper - Wallpaper source, or empty.
 * @property {number} buttonX - Standalone button x, or -1 when the ball hosts the panel.
 * @property {number} buttonY - Standalone button y, or -1 when the ball hosts the panel.
 */

/** Durable skin schema; also the wire envelope the browser scope validates against. */
export const GlassSettingsSchema = z.object({
  enabled: z.boolean().default(true),
  opacity: z.number().step(1).min(0).max(100).default(55),
  blur: z.number().step(1).min(0).max(40).default(18),
  saturate: z.number().step(5).min(100).max(200).default(120),
  dim: z.number().step(1).min(0).max(80).default(25),
  fit: z.union([...GLASS_FITS]).default('cover'),
  wallpaper: z.string().default(''),
  buttonX: z.number().step(1).min(-1).default(-1),
  buttonY: z.number().step(1).min(-1).default(-1),
})

/**
 * Host plugin body: serve the skin's settings namespace. `ctx.inject` rather
 * than a hard `inject` export keeps the skin usable in a composition without a
 * settings document — the browser half then falls back to its own local store.
 * @param {import('@deepseek-ai/cordis').Context} ctx - host cordis context.
 */
export function apply(ctx) {
  ctx.inject(['settings'], (settingsCtx) => {
    settingsCtx.settings.register(GLASS_NAMESPACE, GlassSettingsSchema)
  })
}
