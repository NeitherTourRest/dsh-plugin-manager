/**
 * dsh-client-ui-glass — browser half (frosted-glass skin for the dsh GUI).
 *
 * Hand-written closure-factory bundle: the dsh client module system executes
 * this file only to REGISTER the factory below; every side effect lives inside
 * it and runs at materialisation. Reproducing that wrapper by hand is what lets
 * this package ship without a bundler.
 *
 * How the skin works, and why it is built this way:
 *
 * 1. Translucency comes from `ctx.theme.overrideTokens`, not from selectors.
 *    Feature components are styled with hashed CSS-Module class names, so no
 *    external sheet can address the frame, the sidebar, or the centre column.
 *    The theme aliases those components DO consume (`--dsw-alias-bg-base`, …)
 *    are the stable seam, and the theme service re-publishes every override
 *    token as an inline custom property on `<body>`. Each override is
 *    `color-mix(in srgb, var(--dsw-static-neutral-bluish-NN) P%, transparent)`
 *    against the untouched static palette, so the skin keeps the product's real
 *    light/dark colors and follows a theme switch with no re-application.
 *
 * 2. The wallpaper and its scrim are one fixed layer (`.dshw-backdrop`) below
 *    `#root`, the shell-owned mount point. Frosting is one `backdrop-filter` on
 *    `#root`; because both cover the viewport the backdrop is blurred exactly
 *    once — the wallpaper when one is set, and whatever the window shows behind
 *    the page when none is (macOS window vibrancy).
 *
 * 3. The panel is hosted by `ctx.ball` (dsh-client-ui-ball) when that plugin is
 *    installed, and by a private floating button otherwise. Either way the
 *    panel owns its own shadow root, so it renders identically wherever it is
 *    mounted and no product rule reaches it.
 */

window.__ModuleLoader__.load({
  id: 'dsh-client-ui-glass',
  factory: (require) => {
    /** Plugin id: module registration key, style-tag owner, ball entry id, and the package half of the card key. */
    const PLUGIN_ID = 'dsh-client-ui-glass'

    /** Loader row id this bundle's patch inserts; `plugins.row.config` keys on `<package>#<row id>`. */
    const ROW_ID = 'ui-glass'

    /** Host settings namespace registered by this package's node half. */
    const NAMESPACE = 'ui-glass'

    /** Locale dictionary namespace for this plugin's copy. */
    const LOCALE_NS = 'uiGlass'

    /** Local mirror key, used when the Host settings document is unavailable. */
    const STORAGE_KEY = 'dsh-client-ui-glass/v1'

    /** Longest edge a picked wallpaper is downscaled to before it is stored. */
    const WALLPAPER_MAX_EDGE = 1920

    /** Order the panel takes inside the shared ball. */
    const BALL_ORDER = 10

    /** Defaults mirroring the Host schema. */
    const DEFAULTS = Object.freeze({
      enabled: true,
      opacity: 55,
      blur: 18,
      saturate: 120,
      dim: 25,
      fit: 'cover',
      wallpaper: '',
      buttonX: -1,
      buttonY: -1,
    })

    /** Wallpaper sizing values accepted from the schema, a stored mirror, or the select. */
    const FITS = ['cover', 'contain', 'repeat']

    /** `background-size` per fit; `repeat` tiles at the image's natural size. */
    const FIT_SIZE = Object.freeze({ cover: 'cover', contain: 'contain', repeat: 'auto' })

    /** Copy for this plugin's panel and its Plugins-page card. */
    const STRINGS = {
      zh: {
        summary: '磨砂玻璃：不透明度、磨砂程度、背景画面',
        enabled: '启用',
        opacity: '不透明度',
        blur: '磨砂程度',
        saturate: '背景饱和',
        dim: '背景压暗',
        fit: '填充方式',
        fitCover: '铺满裁切',
        fitContain: '完整适应',
        fitRepeat: '平铺',
        wallpaper: '背景图 URL',
        wallpaperPlaceholder: 'https://… 或 data:image/…',
        pick: '选择本地图片',
        clearWallpaper: '清除背景',
        presetSolid: '不透明',
        presetGlass: '磨砂',
        presetClear: '完全透明',
        reset: '重置',
        panel: '磨砂外观',
      },
      en: {
        summary: 'Frosted glass: opacity, blur, wallpaper',
        enabled: 'Enabled',
        opacity: 'Opacity',
        blur: 'Frost',
        saturate: 'Saturation',
        dim: 'Dim',
        fit: 'Fit',
        fitCover: 'Cover',
        fitContain: 'Contain',
        fitRepeat: 'Tile',
        wallpaper: 'Wallpaper URL',
        wallpaperPlaceholder: 'https://… or data:image/…',
        pick: 'Choose image',
        clearWallpaper: 'Clear wallpaper',
        presetSolid: 'Opaque',
        presetGlass: 'Frosted',
        presetClear: 'Fully clear',
        reset: 'Reset',
        panel: 'Glass appearance',
      },
    }

    /**
     * One theme alias this skin makes translucent, with the static palette entry
     * each scheme mixes it from. Static palette names and values are scheme
     * invariant and are never overridden, so the reference stays valid for the
     * lifetime of the layer.
     */
    const TOKEN_LAYERS = [
      ['--dsw-alias-bg-base', '--dsw-static-neutral-bluish-00', '--dsw-static-neutral-bluish-950', 'base'],
      ['--dsw-alias-bg-layer-1', '--dsw-static-neutral-bluish-00', '--dsw-static-neutral-bluish-875', 'layer1'],
      ['--dsw-alias-bg-layer-2', '--dsw-static-neutral-bluish-00', '--dsw-static-neutral-bluish-850', 'layer2'],
      ['--dsw-alias-bg-overlay', '--dsw-static-neutral-bluish-150', '--dsw-static-neutral-bluish-700', 'overlay'],
      ['--dsw-specific-sidebar-fill', '--dsw-static-neutral-bluish-50', '--dsw-static-neutral-bluish-900', 'sidebar'],
    ]

    /** Document sheet: the backdrop layer, the frost, and the cleared paint layers. */
    const STATIC_CSS = `
/* Hidden until the skin is on, so disabling it restores the product exactly. */
.dshw-backdrop {
  display: none;
}

html[data-dshw-enabled] #root {
  position: relative;
  z-index: 1;
  -webkit-backdrop-filter: blur(var(--dshw-blur, 0px)) saturate(var(--dshw-saturate, 100%));
  backdrop-filter: blur(var(--dshw-blur, 0px)) saturate(var(--dshw-saturate, 100%));
}

/* Every opaque paint layer the product owns is replaced through the theme
   tokens; the window's own background has to go too, or it would hide the
   wallpaper and block a transparent window from showing through. */
html[data-dshw-enabled],
html[data-dshw-enabled] body {
  background-color: transparent;
}

html[data-dshw-enabled] .dshw-backdrop {
  display: block;
  position: fixed;
  inset: 0;
  z-index: 0;
  overflow: hidden;
  pointer-events: none;
  background-color: rgb(233, 236, 242);
}

body[data-ds-dark-theme] .dshw-backdrop {
  background-color: rgb(21, 21, 23);
}

/* Clear mode paints no base of its own, so the window decides what is behind
   the page: the real desktop through macOS window vibrancy, and the window's
   own default background where the window is opaque. */
html[data-dshw-clear] .dshw-backdrop {
  background-color: transparent;
}

.dshw-backdrop__image {
  position: absolute;
  inset: 0;
  background-position: center;
  background-repeat: no-repeat;
  background-size: cover;
}

.dshw-backdrop__scrim {
  position: absolute;
  inset: 0;
  background-color: var(--dshw-scrim, transparent);
}
`

    /** Standalone sheet: the fallback button and its popover, used when ctx.ball is absent. */
    const STANDALONE_CSS = `
:host {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  font-size: 12px;
  line-height: 1.5;
  letter-spacing: normal;
  text-align: left;
  color: #eceef1;
}
* { box-sizing: border-box; }
/* Above every in-frame surface (dockkit 70, app frame 20, sidebar 30) and below
   the product's body-level portals (tooltip 100, modal 1000, toast 1100). */
:host { position: fixed; z-index: 900; }

.fab {
  width: 38px; height: 38px; display: grid; place-items: center; padding: 0;
  border: 1px solid rgba(255, 255, 255, 0.16); border-radius: 50%;
  background: rgba(24, 25, 28, 0.72);
  -webkit-backdrop-filter: blur(14px) saturate(140%);
  backdrop-filter: blur(14px) saturate(140%);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.32);
  color: #e8eaed; font-size: 17px; line-height: 1; cursor: grab; touch-action: none;
  transition: background-color 0.15s ease;
}
.fab:hover { background: rgba(38, 40, 45, 0.86); }
.fab:active { cursor: grabbing; }
.fab:focus-visible { outline: 2px solid #6ea8fe; outline-offset: 2px; }

.popover {
  position: absolute; width: 292px; max-height: 76vh; display: flex; flex-direction: column;
  overflow: hidden; border: 1px solid rgba(255, 255, 255, 0.13); border-radius: 14px;
  background: rgba(22, 23, 26, 0.92);
  -webkit-backdrop-filter: blur(26px) saturate(150%);
  backdrop-filter: blur(26px) saturate(150%);
  box-shadow: 0 18px 48px rgba(0, 0, 0, 0.46);
}
.popover[hidden] { display: none; }
.popover[data-side='up'][data-align='right'] { bottom: calc(100% + 10px); right: 0; }
.popover[data-side='up'][data-align='left'] { bottom: calc(100% + 10px); left: 0; }
.popover[data-side='down'][data-align='right'] { top: calc(100% + 10px); right: 0; }
.popover[data-side='down'][data-align='left'] { top: calc(100% + 10px); left: 0; }
.popover__head { display: flex; align-items: center; justify-content: space-between; padding: 11px 12px 8px; }
.popover__head b { font-size: 13px; font-weight: 600; }
.popover__head button {
  width: 22px; height: 22px; padding: 0; border: 0; border-radius: 6px;
  background: transparent; color: #a9adb4; font-size: 15px; line-height: 1; cursor: pointer;
}
.popover__head button:hover { background: rgba(255, 255, 255, 0.1); color: #fff; }
.popover__slot { overflow-y: auto; }

@media (prefers-reduced-motion: reduce) { .fab { transition: none; } }
`

    /** Panel sheet. The panel owns a shadow root wherever it is mounted, so this travels with it. */
    const PANEL_CSS = `
:host {
  display: block;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  font-size: 12px;
  line-height: 1.5;
  letter-spacing: normal;
  text-align: left;
  color: #eceef1;
}
* { box-sizing: border-box; }

.row { display: grid; grid-template-columns: 72px 1fr 44px; align-items: center; gap: 8px; margin: 7px 0; }
.row > span { color: #b9bdc4; }
.row output { text-align: right; color: #8f949c; font-variant-numeric: tabular-nums; }
.row input[type='range'] { width: 100%; margin: 0; accent-color: #6ea8fe; }
.row select, .row input[type='text'] {
  width: 100%; padding: 4px 6px; border: 1px solid rgba(255, 255, 255, 0.16); border-radius: 7px;
  background: rgba(255, 255, 255, 0.06); color: #eceef1; font-size: 12px;
}
.row select:focus-visible, .row input[type='text']:focus-visible { outline: 2px solid #6ea8fe; outline-offset: 1px; }
.wide { grid-column: 2 / -1; }

.actions { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
.actions button {
  flex: 1 1 auto; padding: 6px 9px; border: 1px solid rgba(255, 255, 255, 0.16); border-radius: 8px;
  background: rgba(255, 255, 255, 0.07); color: #eceef1; font-size: 12px; cursor: pointer;
  transition: background-color 0.15s ease;
}
.actions button:hover { background: rgba(255, 255, 255, 0.15); }
.actions button:focus-visible { outline: 2px solid #6ea8fe; outline-offset: 1px; }
.actions button.primary { background: rgba(110, 168, 254, 0.22); border-color: rgba(110, 168, 254, 0.5); }

.note { margin: 10px 0 0; padding: 8px 9px; border-radius: 8px; background: rgba(255, 255, 255, 0.06); color: #a9adb4; font-size: 11px; }
.note[hidden] { display: none; }
.note b { color: #e7c98a; font-weight: 600; }

@media (prefers-reduced-motion: reduce) { .actions button { transition: none; } }
`

    /** Plugins-page card sheet, styled from theme tokens so it follows the app's palette. */
    const CARD_CSS = `
.dshg-card { display: grid; gap: 11px; max-width: 460px; font-size: 12px; }
.dshg-card__row { display: grid; grid-template-columns: 84px 1fr 56px; align-items: center; gap: 10px; }
.dshg-card__row > span { color: var(--dsw-alias-label-secondary, #6b7280); }
.dshg-card__row output { text-align: right; color: var(--dsw-alias-label-secondary, #6b7280); font-variant-numeric: tabular-nums; }
.dshg-card__row input[type='range'] { width: 100%; margin: 0; }
.dshg-card__row input[type='text'], .dshg-card__row select {
  width: 100%; padding: 5px 7px; border: 0.5px solid var(--dsw-alias-border-l2, #d1d5db);
  border-radius: 7px; background: var(--dsw-alias-bg-layer-1, #fff);
  color: var(--dsw-alias-label-primary, #111827); font: inherit;
}
.dshg-card__preview { display: flex; align-items: center; gap: 10px; grid-column: 2 / -1; }
.dshg-card__preview i {
  flex: 0 0 auto; width: 56px; height: 36px; border-radius: 7px; overflow: hidden;
  border: 0.5px solid var(--dsw-alias-border-l2, #d1d5db);
  background-color: var(--dsw-alias-bg-layer-2, #f3f4f6);
  background-position: center; background-repeat: no-repeat; background-size: cover;
}
.dshg-card__hint { margin: -4px 0 0; color: var(--dsw-alias-label-secondary, #6b7280); font-size: 11px; }
.dshg-card__actions { display: flex; flex-wrap: wrap; gap: 7px; }
.dshg-card__actions button {
  padding: 6px 11px; border: 0.5px solid var(--dsw-alias-border-l2, #d1d5db); border-radius: 8px;
  background: var(--dsw-alias-bg-layer-1, #fff); color: var(--dsw-alias-label-primary, #111827);
  font: inherit; cursor: pointer;
}
.dshg-card__actions button:hover { background: var(--dsw-alias-bg-layer-2, #f3f4f6); }
.dshg-card__actions button:focus-visible { outline: 2px solid var(--dsw-alias-brand-primary, #4b86f0); outline-offset: 1px; }
`

    /** Shown when the fully clear state is reachable but this window cannot show anything behind the page. */
    const NOTE_OPAQUE = '<b>当前窗口不透明。</b>面板底色已全部清空，但本机桌面版的窗口本身没有开启透明，'
      + '清空后只能看到窗口默认底色。<br>设置一张背景图即可看到完整磨砂效果；'
      + '想要真正"看见背后窗口"，需要在 Electron 主进程里给窗口加上 transparent/亚克力材质——插件无法触达那里。'

    /** Shown when the picked image does not fit in `localStorage`. */
    const NOTE_QUOTA = '<b>背景图未能保存。</b>存储空间不足，已选图片过大。请改用较小的图片，或直接填 URL。'

    /** Numeric and textual controls the panel renders, in order. */
    const FIELDS = [
      { key: 'enabled', kind: 'checkbox', label: 'enabled' },
      { key: 'opacity', kind: 'range', min: 0, max: 100, step: 1, unit: '%', label: 'opacity' },
      { key: 'blur', kind: 'range', min: 0, max: 40, step: 1, unit: 'px', label: 'blur' },
      { key: 'saturate', kind: 'range', min: 100, max: 200, step: 5, unit: '%', label: 'saturate' },
      { key: 'dim', kind: 'range', min: 0, max: 80, step: 1, unit: '%', label: 'dim' },
      {
        key: 'fit',
        kind: 'select',
        label: 'fit',
        options: [['cover', 'fitCover'], ['contain', 'fitContain'], ['repeat', 'fitRepeat']],
      },
      { key: 'wallpaper', kind: 'text', label: 'wallpaper', placeholder: 'wallpaperPlaceholder', wide: true },
    ]

    /** Action buttons the panel renders, grouped into two rows. */
    const ACTIONS = [
      { act: 'pick', label: 'pick', group: 1 },
      { act: 'clear-wallpaper', label: 'clearWallpaper', group: 1 },
      { act: 'solid', label: 'presetSolid', group: 2, primary: true },
      { act: 'glass', label: 'presetGlass', group: 2, primary: true },
      { act: 'clear', label: 'presetClear', group: 2, primary: true },
      { act: 'reset', label: 'reset', group: 2 },
    ]

    /**
     * Force a number into a range.
     * @param {number} value - the candidate value.
     * @param {number} low - inclusive lower bound.
     * @param {number} high - inclusive upper bound.
     * @returns {number} the clamped value.
     */
    function clamp(value, low, high) {
      return Math.min(Math.max(value, low), high)
    }

    /**
     * Remove characters that would close or escape a `url("…")` token.
     * @param {string} value - the raw wallpaper source.
     * @returns {string} the value with quoting, bracket, and control characters removed.
     */
    function safeUrl(value) {
      return value.replace(/["'\\()\s\u0000-\u001f]/gu, '')
    }

    /**
     * Read the local mirror, keeping only known keys of their declared type.
     * @returns {object} a complete settings object.
     */
    function readLocal() {
      const state = { ...DEFAULTS }
      let stored
      try {
        stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? 'null')
      } catch {
        // An unreadable entry (private mode, disabled storage, hand-edited
        // JSON) falls back to the defaults instead of blocking the skin.
        stored = null
      }
      if (typeof stored !== 'object' || stored === null) return state
      for (const key of Object.keys(DEFAULTS)) {
        const value = stored[key]
        if (key === 'fit') {
          if (typeof value === 'string' && FITS.includes(value)) state.fit = value
        } else if (typeof value === typeof DEFAULTS[key]) {
          state[key] = value
        }
      }
      return state
    }

    /**
     * Write the local mirror.
     * @param {object} state - the complete settings object.
     */
    function writeLocal(state) {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
      } catch {
        // A full quota costs only the mirror: the Host document, when present,
        // still carries the value.
      }
    }

    /**
     * One reactive settings value over the Host namespace, with the local mirror
     * as the fallback for a client the Host does not serve.
     *
     * Reads are synchronous from the working copy so the first paint never
     * waits, and the Host document is adopted whenever a snapshot arrives.
     * `set` applies locally; `commit` also writes durably — a slider drag calls
     * `set` per pointer event and `commit` once on release, so pointer cadence
     * never reaches the settings wire.
     *
     * @param {object} ctx - the client Cordis context.
     * @returns {{ get: () => object, subscribe: (fn: () => void) => () => void, set: (field: string, value: unknown) => void, commit: (field: string, value: unknown) => void }}
     */
    function createSettings(ctx) {
      let state = readLocal()
      let scope = null
      const listeners = new Set()
      /** Fields whose local value has already been pushed up to the Host. */
      const migrated = new Set()
      const publish = () => { for (const listener of [...listeners]) listener() }

      /**
       * Fold a Host snapshot into the working copy.
       *
       * `snapshot.value` is schema-resolved, so it carries every field even when
       * nobody ever set one. Adopting it wholesale would erase a value this
       * client already holds locally — a picked wallpaper, most expensively.
       * Only a field the raw user layer actually overrides is adopted; a local
       * value the Host has never seen is pushed up instead, making it durable and
       * shared rather than dropped.
       *
       * @param {object} snapshot - one `settingsScope` snapshot.
       */
      const adopt = (snapshot) => {
        const section = snapshot.value
        if (typeof section !== 'object' || section === null) return
        const next = { ...state }
        let changed = false
        for (const key of Object.keys(DEFAULTS)) {
          const value = section[key]
          if (typeof value !== typeof DEFAULTS[key]) continue
          if (key === 'fit' && !FITS.includes(value)) continue
          const local = next[key]
          // The schema default means nobody set the field; anything else was
          // set by someone, including the generated form writing this namespace
          // directly, and is adopted here.
          if (value !== DEFAULTS[key]) {
            if (local !== value) { next[key] = value; changed = true }
          } else if (local !== DEFAULTS[key] && !migrated.has(key)) {
            migrated.add(key)
            void scope.set(key, local).catch((error) => {
              console.error(`[${PLUGIN_ID}] could not migrate local setting "${key}"`, error)
            })
          }
        }
        if (!changed) return
        state = next
        writeLocal(state)
        publish()
      }

      // Injected, not fetched: `ctx.get` during apply runs before the settings
      // plugin has activated, so it returns undefined and the namespace stays
      // unreachable for the life of the page.
      ctx.inject(['settingsScope'], (scopeCtx) => {
        scope = scopeCtx.settingsScope.bind({ namespace: NAMESPACE })
        const sync = () => {
          const snapshot = scope.getSnapshot()
          // 'loading' leaves the local copy in place, and 'unavailable' keeps
          // it permanently — which is what makes a Host-less client still work.
          if (snapshot.status === 'ready') adopt(snapshot)
        }
        scopeCtx.effect(() => scope.subscribe(sync), 'ui-glass: settings scope')
        sync()
        return () => { scope = null }
      })

      const applyValue = (field, value, durable) => {
        state = { ...state, [field]: value }
        writeLocal(state)
        publish()
        if (!durable || scope === null) return
        void scope.set(field, value).catch((error) => { console.error(`[${PLUGIN_ID}] settings write failed`, error) })
      }

      return {
        get: () => state,
        subscribe(listener) {
          listeners.add(listener)
          return () => { listeners.delete(listener) }
        },
        set: (field, value) => { applyValue(field, value, false) },
        commit: (field, value) => { applyValue(field, value, true) },
      }
    }

    /**
     * Build the theme override layer for one surface alpha.
     * @param {number} opacity - surface alpha in percent, 0–100.
     * @returns {object} token-name → `{ light, dark }` pairs for `ctx.theme.overrideTokens`.
     */
    function buildTokenOverrides(opacity) {
      // Raised and overlay surfaces stay more opaque than the base so menus,
      // popovers, and nested cards remain readable over a busy wallpaper.
      const alpha = {
        base: opacity,
        sidebar: opacity,
        layer1: Math.min(100, opacity + 30),
        layer2: Math.min(100, opacity + 40),
        overlay: Math.min(100, opacity + 45),
      }
      const tokens = {}
      for (const [alias, lightStatic, darkStatic, key] of TOKEN_LAYERS) {
        tokens[alias] = {
          light: `color-mix(in srgb, var(${lightStatic}) ${alpha[key]}%, transparent)`,
          dark: `color-mix(in srgb, var(${darkStatic}) ${alpha[key]}%, transparent)`,
        }
      }
      return tokens
    }

    /**
     * Downscale a picked image and return it as a data URI, so the wallpaper
     * never has to be stored at its original size.
     * @param {File} file - the file the user chose.
     * @returns {Promise<string>} the encoded image.
     */
    async function fileToDataUrl(file) {
      const bitmap = await createImageBitmap(file)
      try {
        const scale = Math.min(1, WALLPAPER_MAX_EDGE / Math.max(bitmap.width, bitmap.height))
        const width = Math.max(1, Math.round(bitmap.width * scale))
        const height = Math.max(1, Math.round(bitmap.height * scale))
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const context = canvas.getContext('2d')
        if (context === null) throw new Error('canvas 2d context unavailable')
        context.drawImage(bitmap, 0, 0, width, height)
        return canvas.toDataURL('image/jpeg', 0.82)
      } finally {
        bitmap.close()
      }
    }

    /**
     * Mount the skin's controls into a container, inside a shadow root of their
     * own so the panel renders identically wherever it is hosted.
     *
     * @param {HTMLElement} container - where the panel is mounted.
     * @param {{ settings: object, translate: () => ((key: string) => string), isSeeThroughWindow: () => boolean }} deps - shared state and copy.
     * @returns {() => void} disposer removing the panel and its subscription.
     */
    function createPanel(container, deps) {
      const { settings } = deps
      const t = () => deps.translate()

      const root = document.createElement('div')
      const shadow = root.attachShadow({ mode: 'open' })
      const style = document.createElement('style')
      style.dataset.plugin = PLUGIN_ID
      style.dataset.pluginCss = `${PLUGIN_ID}/panel.css`
      style.textContent = PANEL_CSS
      shadow.append(style)

      const controls = new Map()
      const outputs = new Map()

      for (const spec of FIELDS) {
        const row = document.createElement('label')
        row.className = 'row'
        const caption = document.createElement('span')
        caption.textContent = t()(spec.label)
        row.append(caption)

        let control
        if (spec.kind === 'select') {
          control = document.createElement('select')
          for (const [value, label] of spec.options) {
            const option = document.createElement('option')
            option.value = value
            option.textContent = t()(label)
            control.append(option)
          }
        } else {
          control = document.createElement('input')
          control.type = spec.kind
          if (spec.kind === 'range') {
            control.min = String(spec.min)
            control.max = String(spec.max)
            control.step = String(spec.step)
          }
          if (spec.kind === 'text') {
            control.spellcheck = false
            control.placeholder = t()(spec.placeholder)
          }
        }
        // The wallpaper field spans the row's value and readout columns.
        if (spec.wide === true) control.className = 'wide'
        control.dataset.k = spec.key
        row.append(control)

        const output = document.createElement('output')
        row.append(output)
        outputs.set(spec.key, { output, spec })
        controls.set(spec.key, control)
        shadow.append(row)

        // `input` previews continuously; `change` fires once the gesture ends,
        // which is the only point that should reach the settings wire.
        control.addEventListener('input', () => { applyControl(spec, control, false) })
        control.addEventListener('change', () => { applyControl(spec, control, true) })
      }

      for (const group of [1, 2]) {
        const bar = document.createElement('div')
        bar.className = 'actions'
        for (const action of ACTIONS.filter(entry => entry.group === group)) {
          const button = document.createElement('button')
          button.type = 'button'
          button.dataset.act = action.act
          button.textContent = t()(action.label)
          if (action.primary === true) button.className = 'primary'
          bar.append(button)
        }
        shadow.append(bar)
      }

      const note = document.createElement('p')
      note.className = 'note'
      note.hidden = true
      shadow.append(note)

      const filePicker = document.createElement('input')
      filePicker.type = 'file'
      filePicker.accept = 'image/*'
      filePicker.hidden = true
      shadow.append(filePicker)

      let quotaExceeded = false
      let lastNote = null

      /** Whether the backdrop layer paints a wallpaper of its own. */
      const isPainted = () => safeUrl((settings.get().wallpaper ?? '').trim()) !== ''

      /** Apply one control's current value. @param {object} spec - the field spec, @param {HTMLElement} control - its control, @param {boolean} durable - whether to write. */
      const applyControl = (spec, control, durable) => {
        let value
        if (spec.kind === 'checkbox') value = control.checked
        else if (spec.kind === 'range') value = Number(control.value)
        else value = control.value
        if (durable) settings.commit(spec.key, value)
        else settings.set(spec.key, value)
      }

      /** Push the working copy into every control, readout, and the caveat note. */
      const sync = () => {
        const state = settings.get()
        for (const [key, control] of controls) {
          const value = state[key]
          if (control.type === 'checkbox') control.checked = value === true
          else if (control.type === 'range' || control.tagName === 'SELECT') control.value = String(value)
          // The text field keeps whatever the user is typing: a shadow-root
          // input reports its host as document.activeElement.
          else if (shadow.activeElement !== control) control.value = String(value)
          const entry = outputs.get(key)
          if (entry === undefined) continue
          if (entry.spec.kind === 'range') entry.output.textContent = `${value}${entry.spec.unit}`
          else if (entry.spec.kind === 'checkbox') entry.output.textContent = value === true ? '✓' : ''
          else entry.output.textContent = ''
        }
        const text = quotaExceeded ? NOTE_QUOTA
          : state.enabled === true && state.opacity === 0 && !isPainted() && !deps.isSeeThroughWindow() ? NOTE_OPAQUE
            : null
        if (text !== lastNote) {
          lastNote = text
          note.hidden = text === null
          if (text !== null) note.innerHTML = text
        }
        return state
      }

      shadow.addEventListener('click', (event) => {
        const target = event.target instanceof Element ? event.target.closest('[data-act]') : null
        if (target === null) return
        const action = target.dataset.act
        if (action === 'reset') {
          // A whole-object reset has to reach the wire field by field.
          for (const key of Object.keys(DEFAULTS)) settings.commit(key, DEFAULTS[key])
        } else if (action === 'solid') settings.commit('opacity', 100)
        else if (action === 'glass') settings.commit('opacity', DEFAULTS.opacity)
        else if (action === 'clear') {
          settings.commit('enabled', true)
          settings.commit('opacity', 0)
          settings.commit('dim', 0)
        } else if (action === 'clear-wallpaper') settings.commit('wallpaper', '')
        else if (action === 'pick') { filePicker.value = ''; filePicker.click() }
        else return
        sync()
      })

      filePicker.addEventListener('change', () => {
        const file = filePicker.files?.[0]
        filePicker.value = ''
        if (file === undefined) return
        void fileToDataUrl(file).then((dataUrl) => {
          settings.commit('wallpaper', dataUrl)
          if (settings.get().fit === 'repeat') settings.commit('fit', 'cover')
          sync()
        }).catch((error) => { console.error(`[${PLUGIN_ID}] could not read the picked image`, error) })
      })

      // Exposed so a caller can force a repaint after an out-of-band change.
      container.append(root)
      const unsubscribe = settings.subscribe(sync)
      sync()

      return () => {
        unsubscribe()
        root.remove()
      }
    }

    /**
     * Browser plugin body: install the backdrop layer, the theme token layer,
     * the panel (hosted by the ball when present), and the Plugins-page card.
     * @param {object} ctx - the client Cordis context.
     */
    function apply(ctx) {
      const settings = createSettings(ctx)

      /**
       * The theme service, once it activates.
       *
       * Injected, not fetched. `ctx.get('theme')` during apply runs before
       * ui-theme has activated, so it returns undefined and stays that way for
       * the life of the page — and the token layer is the only thing making the
       * product's surfaces translucent. Without it they paint opaque over the
       * wallpaper. That is why the skin was missing on a fresh start and
       * appeared after a disable/enable cycle, which runs apply again against a
       * composition that has settled.
       */
      let theme = null
      ctx.inject(['theme'], (themeCtx) => {
        theme = themeCtx.theme
        // The injection may resolve synchronously, before `paint` below has been
        // initialised, so the repaint is deferred by one turn.
        queueMicrotask(() => { paint() })
        return () => { theme = null }
      })

      let translate = (key) => STRINGS.zh[key] ?? key
      let disposeTokens = null
      let lastWallpaper = null
      let teardownStandalone = null

      /** Whether the host window is known to paint something behind the page. */
      const isSeeThroughWindow = () => document.documentElement.dataset.platform === 'darwin'

      const staticTag = document.createElement('style')
      staticTag.dataset.plugin = PLUGIN_ID
      staticTag.dataset.pluginCss = `${PLUGIN_ID}/glass.css`
      staticTag.textContent = STATIC_CSS

      const variableTag = document.createElement('style')
      variableTag.dataset.plugin = PLUGIN_ID
      variableTag.dataset.pluginCss = `${PLUGIN_ID}/settings.css`

      const backdrop = document.createElement('div')
      backdrop.className = 'dshw-backdrop'
      const image = document.createElement('div')
      image.className = 'dshw-backdrop__image'
      const scrim = document.createElement('div')
      scrim.className = 'dshw-backdrop__scrim'
      backdrop.append(image, scrim)

      /** Push the working copy into the document, the theme layer, and the backdrop. */
      const paint = () => {
        const state = settings.get()
        const root = document.documentElement
        root.toggleAttribute('data-dshw-enabled', state.enabled === true)
        root.toggleAttribute('data-dshw-clear', safeUrl((state.wallpaper ?? '').trim()) === '')

        // Only the small numeric properties ride the stylesheet; the wallpaper
        // is a potentially large data URI and belongs on the element, assigned
        // once per change instead of on every slider tick.
        variableTag.textContent = `:root{--dshw-blur:${state.blur}px;`
          + `--dshw-saturate:${state.saturate}%;`
          + `--dshw-scrim:rgba(0, 0, 0, ${(state.dim / 100).toFixed(3)})}`

        const wallpaper = safeUrl((state.wallpaper ?? '').trim())
        if (wallpaper !== lastWallpaper) {
          lastWallpaper = wallpaper
          image.style.backgroundImage = wallpaper === '' ? '' : `url("${wallpaper}")`
        }
        image.style.backgroundSize = FIT_SIZE[state.fit] ?? FIT_SIZE.cover
        image.style.backgroundRepeat = state.fit === 'repeat' ? 'repeat' : 'no-repeat'

        if (theme !== null) {
          // The same source replaces the whole layer, so repeated calls during a
          // drag never stack; an empty map removes the layer's effect.
          disposeTokens = theme.overrideTokens(
            PLUGIN_ID,
            state.enabled === true ? buildTokenOverrides(clamp(state.opacity, 0, 100)) : {},
          )
        }
      }

      ctx.effect(() => {
        const parent = document.body ?? document.documentElement
        document.head.append(staticTag, variableTag)
        parent.append(backdrop)
        paint()
        const unsubscribe = settings.subscribe(paint)

        // The shell owns the document it boots into and rewrites parts of it
        // after this plugin activates. That is why the skin can be missing on a
        // fresh start yet appear after a disable/enable cycle: re-activation
        // mounts into a document that has settled. Both things the skin depends
        // on can be taken away, so both are watched and put back:
        //
        //   - the layer element itself, detached when a mount point is replaced
        //   - the two flags on <html> that the sheet keys visibility on
        const restore = () => {
          if (!staticTag.isConnected) document.head.append(staticTag)
          if (!variableTag.isConnected) document.head.append(variableTag)
          if (!backdrop.isConnected) (document.body ?? document.documentElement).append(backdrop)
          const root = document.documentElement
          const state = settings.get()
          const enabled = state.enabled === true
          const clear = safeUrl((state.wallpaper ?? '').trim()) === ''
          if (root.hasAttribute('data-dshw-enabled') !== enabled || root.hasAttribute('data-dshw-clear') !== clear) {
            paint()
          }
        }
        const keeper = new MutationObserver(restore)
        keeper.observe(document.documentElement, {
          childList: true,
          subtree: true,
          attributes: true,
          attributeFilter: ['data-dshw-enabled', 'data-dshw-clear'],
        })
        // Boot churn need not produce a mutation this observer sees, so the same
        // check runs on a timer until the document has settled.
        let ticks = 0
        const bootWatch = setInterval(() => {
          restore()
          if (++ticks >= 40) clearInterval(bootWatch)
        }, 250)

        return () => {
          clearInterval(bootWatch)
          keeper.disconnect()
          staticTag.remove()
          variableTag.remove()
          backdrop.remove()
          document.documentElement.removeAttribute('data-dshw-enabled')
          document.documentElement.removeAttribute('data-dshw-clear')
          unsubscribe()
          disposeTokens?.()
          disposeTokens = null
        }
      }, 'ui-glass: backdrop and theme layers')

      ctx.inject(['locale'], (localeCtx) => {
        localeCtx.effect(() => localeCtx.locale.register(LOCALE_NS, STRINGS), 'ui-glass: dictionaries')
        translate = localeCtx.locale.bind(LOCALE_NS)
      })

      // Preferred host: the shared ball. `ctx.inject` waits for the service, so
      // composition order between this plugin and the ball does not matter —
      // but it can fire either before or after the fallback effect below, so the
      // flag decides which one owns the panel.
      let ballHost = null
      ctx.inject(['ball'], (ballCtx) => {
        ballHost = ballCtx.ball
        teardownStandalone?.()
        teardownStandalone = null
        ballCtx.effect(() => ballHost.register({
          // The ball module id, which is also this package's `dsh.ball.id`.
          // Registering under the package name instead would not match the
          // declaration, and the ball would list this plugin twice: once from
          // the directory, once from this live registration.
          id: ROW_ID,
          icon: '◐',
          order: BALL_ORDER,
          label: () => translate('panel'),
          render: (container) => createPanel(container, { settings, translate: () => translate, isSeeThroughWindow }),
        }), 'ui-glass: ball panel')
      })

      // Fallback for a composition without the ball: this plugin's own button,
      // and its own Plugins-page card. With the ball present both are redundant
      // — the ball hosts the panel and registers a card from the declaration in
      // this package's manifest — and registering the card twice would collide
      // on the same `<package>#<row id>` key.
      ctx.effect(() => {
        if (ballHost !== null) return () => {}
        const cleanup = mountStandalone({ settings, translate: () => translate, isSeeThroughWindow })
        const disposeCard = registerConfigCard(ctx, settings)
        teardownStandalone = cleanup
        return () => {
          teardownStandalone = null
          cleanup()
          disposeCard()
        }
      }, 'ui-glass: standalone button and card')
    }

    /**
     * Mount the fallback floating button and its popover, carrying the same
     * panel the ball would host.
     *
     * @param {{ settings: object, translate: () => ((key: string) => string), isSeeThroughWindow: () => boolean, paint: () => void }} deps - shared state and copy.
     * @returns {() => void} idempotent disposer.
     */
    function mountStandalone(deps) {
      const { settings } = deps
      const host = document.createElement('div')
      host.className = 'dshw-host'
      const shadow = host.attachShadow({ mode: 'open' })
      const style = document.createElement('style')
      style.dataset.plugin = PLUGIN_ID
      style.dataset.pluginCss = `${PLUGIN_ID}/standalone.css`
      style.textContent = STANDALONE_CSS
      shadow.append(style)

      const fab = document.createElement('button')
      fab.type = 'button'
      fab.className = 'fab'
      fab.textContent = '◐'
      const popover = document.createElement('div')
      popover.className = 'popover'
      popover.hidden = true
      const head = document.createElement('div')
      head.className = 'popover__head'
      const title = document.createElement('b')
      const closeButton = document.createElement('button')
      closeButton.type = 'button'
      closeButton.textContent = '×'
      head.append(title, closeButton)
      const slot = document.createElement('div')
      slot.className = 'popover__slot'
      popover.append(head, slot)
      shadow.append(fab, popover)

      const disposePanel = createPanel(slot, deps)
      let drag = null
      let disposed = false

      /** The button's viewport position, clamped into the viewport. */
      const position = () => {
        const state = settings.get()
        const limitX = Math.max(0, window.innerWidth - 38)
        const limitY = Math.max(0, window.innerHeight - 38)
        return {
          x: state.buttonX < 0 ? Math.max(18, window.innerWidth - 56) : clamp(state.buttonX, 0, limitX),
          y: state.buttonY < 0 ? Math.max(18, window.innerHeight - 56) : clamp(state.buttonY, 0, limitY),
        }
      }

      const place = () => {
        const spot = position()
        host.style.left = `${spot.x}px`
        host.style.top = `${spot.y}px`
        host.style.right = 'auto'
        host.style.bottom = 'auto'
        popover.dataset.side = spot.y > window.innerHeight * 0.55 ? 'up' : 'down'
        popover.dataset.align = spot.x + 19 < window.innerWidth / 2 ? 'left' : 'right'
      }

      title.textContent = deps.translate()('panel')
      fab.title = deps.translate()('panel')
      fab.setAttribute('aria-label', deps.translate()('panel'))

      fab.addEventListener('pointerdown', (event) => {
        drag = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, moved: false }
        fab.setPointerCapture(event.pointerId)
      })
      fab.addEventListener('pointermove', (event) => {
        if (drag === null || event.pointerId !== drag.pointerId) return
        const dx = event.clientX - drag.x
        const dy = event.clientY - drag.y
        if (!drag.moved && Math.hypot(dx, dy) < 4) return
        drag.moved = true
        const spot = position()
        // Local-only while the pointer moves; the release commits once.
        settings.set('buttonX', spot.x + dx)
        settings.set('buttonY', spot.y + dy)
        drag.x = event.clientX
        drag.y = event.clientY
        place()
      })
      fab.addEventListener('pointerup', (event) => {
        if (drag === null || event.pointerId !== drag.pointerId) return
        const moved = drag.moved
        drag = null
        if (!moved) { popover.hidden = !popover.hidden; place(); return }
        const spot = position()
        settings.commit('buttonX', spot.x)
        settings.commit('buttonY', spot.y)
      })
      closeButton.addEventListener('click', () => { popover.hidden = true })

      const onResize = () => { place() }
      window.addEventListener('resize', onResize)

      const parent = document.body ?? document.documentElement
      parent.append(host)
      place()

      return () => {
        if (disposed) return
        disposed = true
        window.removeEventListener('resize', onResize)
        disposePanel()
        host.remove()
      }
    }

    /**
     * Register this plugin's own configuration page with the desktop Plugins
     * page, for a composition that has no ball to register one from the
     * `dsh.ball` declaration. The page asks every entry for two views: a
     * one-line summary and the form. The form owns its own edits; the settings
     * scope owns persistence.
     *
     * @param {object} ctx - the client Cordis context.
     * @param {object} settings - the settings bridge from {@link createSettings}.
     * @returns {() => void} disposer withdrawing the registration.
     */
    function registerConfigCard(ctx, settings) {
      return ctx.inject(['slots', 'locale'], (slotsCtx) => {
        const React = require('react')
        const h = React.createElement

        const cardStyleTag = document.createElement('style')
        cardStyleTag.dataset.plugin = PLUGIN_ID
        cardStyleTag.dataset.pluginCss = `${PLUGIN_ID}/card.css`
        cardStyleTag.textContent = CARD_CSS
        slotsCtx.effect(() => {
          document.head.append(cardStyleTag)
          return () => { cardStyleTag.remove() }
        }, 'ui-glass: card stylesheet')

        /** A wallpaper thumbnail, painted from the current source. */
        const preview = (wallpaperValue) => {
          const safe = safeUrl((wallpaperValue ?? '').trim())
          return h('i', { style: safe === '' ? {} : { backgroundImage: `url("${safe}")` } })
        }

        /**
         * One slider row. Dragging applies locally; releasing commits, so a
         * pointer sweep costs one settings write rather than sixty.
         */
        const sliderRow = (state, key, label, min, max, unit) => h('label', { className: 'dshg-card__row', key },
          h('span', null, label),
          h('input', {
            type: 'range',
            min,
            max,
            step: 1,
            value: state[key],
            onChange: (event) => { settings.set(key, Number(event.target.value)) },
            onPointerUp: (event) => { settings.commit(key, Number(event.target.value)) },
            onKeyUp: (event) => { settings.commit(key, Number(event.target.value)) },
          }),
          h('output', null, `${state[key]}${unit}`))

        /**
         * The configuration form. It reads the same settings bridge the panel
         * uses, so a change here shows in the interface immediately.
         * @param {{ t: (key: string) => string }} props - the page's bound translator.
         */
        function GlassConfigForm(props) {
          const t = props.t
          const [state, setState] = React.useState(settings.get())
          const picker = React.useRef(null)
          React.useEffect(() => settings.subscribe(() => { setState(settings.get()) }), [])

          return h('div', { className: 'dshg-card' },
            h('div', { className: 'dshg-card__row' },
              h('span', null, t('wallpaper')),
              h('div', { className: 'dshg-card__preview' },
                preview(state.wallpaper),
                h('input', {
                  type: 'text',
                  value: state.wallpaper,
                  spellCheck: false,
                  placeholder: t('wallpaperPlaceholder'),
                  onChange: (event) => { settings.set('wallpaper', event.target.value) },
                  onBlur: (event) => { settings.commit('wallpaper', event.target.value) },
                }))),
            h('div', { className: 'dshg-card__actions' },
              h('button', {
                type: 'button',
                onClick: () => {
                  const input = picker.current
                  if (input === null) return
                  input.value = ''
                  input.click()
                },
              }, t('pick')),
              h('button', { type: 'button', onClick: () => { settings.commit('wallpaper', '') } }, t('clearWallpaper'))),
            h('input', {
              type: 'file',
              accept: 'image/*',
              hidden: true,
              ref: picker,
              onChange: (event) => {
                const input = event.target
                const file = input.files?.[0]
                input.value = ''
                if (file === undefined) return
                void fileToDataUrl(file)
                  .then((dataUrl) => { settings.commit('wallpaper', dataUrl) })
                  .catch((error) => { console.error(`[${PLUGIN_ID}] could not read the picked image`, error) })
              },
            }),
            sliderRow(state, 'opacity', t('opacity'), 0, 100, '%'),
            sliderRow(state, 'blur', t('blur'), 0, 40, 'px'),
            sliderRow(state, 'saturate', t('saturate'), 100, 200, '%'),
            sliderRow(state, 'dim', t('dim'), 0, 80, '%'),
            h('label', { className: 'dshg-card__row' },
              h('span', null, t('fit')),
              h('select', {
                value: state.fit,
                onChange: (event) => { settings.commit('fit', event.target.value) },
              },
              h('option', { value: 'cover' }, t('fitCover')),
              h('option', { value: 'contain' }, t('fitContain')),
              h('option', { value: 'repeat' }, t('fitRepeat'))),
              h('output', null, '')),
            h('div', { className: 'dshg-card__actions' },
              h('button', { type: 'button', onClick: () => { settings.commit('enabled', !state.enabled) } },
                `${t('enabled')}: ${state.enabled === true ? '✓' : '✗'}`),
              h('button', { type: 'button', onClick: () => { settings.commit('opacity', 100) } }, t('presetSolid')),
              h('button', { type: 'button', onClick: () => { settings.commit('opacity', DEFAULTS.opacity) } }, t('presetGlass')),
              h('button', {
                type: 'button',
                onClick: () => { settings.commit('enabled', true); settings.commit('opacity', 0); settings.commit('dim', 0) },
              }, t('presetClear'))))
        }

        slotsCtx.slots.inject('plugins.row.config', () => slotsCtx.slots.register({
          name: 'plugins.row.config',
          key: `${PLUGIN_ID}#${ROW_ID}`,
          locale: LOCALE_NS,
        }, function GlassConfigCard(props) {
          if (props.view === 'summary') return props.t('summary')
          return h(GlassConfigForm, { t: props.t })
        }))
      })
    }

    return { apply }
  },
})
