/**
 * Shared floating ball — node half.
 *
 * The ball itself lives in the browser half (`./client`, served from
 * `lib/client.js`). This half owns exactly one Host-side concern: the durable
 * settings namespace that the desktop Plugins page and the ball's own panel
 * both read and write, so the ball's appearance survives a reload, a cleared
 * browser store, and the move between the desktop and Web surfaces.
 *
 * Plain JavaScript on purpose: this package ships without a build step, so
 * every artifact here is what Node and the browser actually execute. Types
 * live in JSDoc.
 */

import z from '@deepseek-ai/schemastery'

/** Cordis plugin name. */
export const name = 'ui-ball'

/** Settings namespace owned by this plugin. Durable sections live in `$DSH_HOME/settings.yaml`. */
export const BALL_NAMESPACE = 'ui-ball'

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
 * @property {string} image - Built-in mascot art when empty; otherwise an http(s)/data URL or a short glyph.
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
 * Host plugin body: serve the ball's settings namespace. `ctx.inject` rather
 * than a hard `inject` export keeps the ball usable in a composition without a
 * settings document — the browser half then falls back to its own local store.
 * @param {import('@deepseek-ai/cordis').Context} ctx - host cordis context.
 */
export function apply(ctx) {
  ctx.inject(['settings'], (settingsCtx) => {
    settingsCtx.settings.register(BALL_NAMESPACE, BallSettingsSchema)
  })
}
