/**
 * Shared floating ball — browser half.
 *
 * One draggable mascot button that hosts the settings panel of every other dsh
 * plugin. A plugin contributes a panel by registering with the `ball` service
 * this plugin provides:
 *
 *     const ball = ctx.get('ball')
 *     ctx.effect(() => ball.register({
 *       id: 'my-plugin', label: '我的插件', icon: '◐', order: 10,
 *       render(container, api) {
 *         container.append(myPanel())
 *         return () => { ... }        // runs when the panel is left
 *       },
 *     }))
 *
 * Hand-written closure-factory bundle: the dsh client module system executes
 * this file only to REGISTER the factory below; every side effect lives inside
 * it and runs at materialisation. `require` may name only platform modules
 * (`react`, `react-dom`, `@deepseek-ai/cordis`, `@deepseek-ai/dsh-client-*`),
 * which is why nothing beyond React is requested.
 */

window.__ModuleLoader__.load({
  id: 'dsh-client-ui-ball',
  factory: (require) => {
    /** Plugin id: module registration key, style-tag owner, and the package half of `plugins.row.config`'s key. */
    const PLUGIN_ID = 'dsh-client-ui-ball'

    /** Loader row id this bundle's patch inserts; `plugins.row.config` keys on `<package>#<row id>`. */
    const ROW_ID = 'ui-ball'

    /** Host settings namespace registered by this package's node half. */
    const NAMESPACE = 'ui-ball'

    /** Locale dictionary namespace for this plugin's copy. */
    const LOCALE_NS = 'uiBall'

    /** Local mirror key, used when the Host settings document is unavailable. */
    const STORAGE_KEY = 'dsh-client-ui-ball/v1'

    /** Longest edge a picked mascot image is downscaled to before it is stored. */
    const IMAGE_MAX_EDGE = 256

    /** Service key this plugin provides. */
    const SERVICE = 'ball'

    /**
     * Route the Host half serves an optional local mascot on. The file lives at
     * `assets/mascot.<ext>` beside the installed package, so artwork under its
     * own licence can be dropped next to an installation instead of entering
     * this repository.
     */
    const LOCAL_MASCOT_URL = '/ui-ball/mascot'

    /**
     * Route the Host half serves the `dsh.ball` directory on. The ball lists
     * every declared module from here, including plugins whose own client half
     * is switched off.
     */
    const MODULE_DIRECTORY_URL = '/ui-ball/modules'

    /**
     * Local mascot state for this plugin run: `unknown` until the one probe
     * settles, then `present` (the asset is the default artwork) or `absent`
     * (the built-in art stays). Shared with the configuration card so the ball
     * and its preview never disagree about which artwork is showing.
     */
    let localMascot = 'unknown'

    /**
     * Built-in mascot: an original chibi whale-girl drawn for this plugin
     * (flat shapes only, so it stays legible at small sizes). It is the default
     * when neither `image` nor a local asset supplies artwork — notably, it is
     * NOT the community's "whale girl" character, whose artwork is licensed
     * CC BY-NC-SA 4.0 and deliberately not bundled here.
     */
    const MASCOT_SVG = [
      '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" focusable="false" aria-hidden="true">',
      '<path d="M32 8c0-3.4 2.4-5.6 5.2-6.4" fill="none" stroke="#a9c8ff" stroke-width="2.2" stroke-linecap="round"/>',
      '<circle cx="39.4" cy="1.6" r="2" fill="#a9c8ff"/>',
      '<path d="M30.5 9.5C26 4.6 20 2.4 15 3.6c4.2 2.8 7.2 6.4 8.4 10.4z" fill="#2f6bdd"/>',
      '<path d="M33.5 9.5C38 4.6 44 2.4 49 3.6c-4.2 2.8-7.2 6.4-8.4 10.4z" fill="#2f6bdd"/>',
      '<path d="M23 46h18c0 8-3.6 13.6-9 13.6S23 54 23 46z" fill="#dbe7ff"/>',
      '<path d="M23 46h18c0 2.1-.3 4-.9 5.6H23.9C23.3 50 23 48.1 23 46z" fill="#4b86f0"/>',
      '<path d="M32 6C17 6 6 17 6 32c0 7 3 13 7 17h38c4-4 7-10 7-17C58 17 47 6 32 6z" fill="#4b86f0"/>',
      '<path d="M32 14c-10 0-17 8-17 18 0 9 7 16 17 16s17-7 17-16c0-10-7-18-17-18z" fill="#fff4ec"/>',
      '<path d="M32 14c-10 0-17 8-17 18 2.6-6 7-9 12-8.4 3 .4 4-2.6 5-2.6s2 3 5 2.6c5-.6 9.4 2.4 12 8.4 0-10-7-18-17-18z" fill="#3a72e0"/>',
      '<ellipse cx="25.5" cy="32.5" rx="2.9" ry="3.7" fill="#22304a"/>',
      '<ellipse cx="38.5" cy="32.5" rx="2.9" ry="3.7" fill="#22304a"/>',
      '<circle cx="26.7" cy="31" r="1.1" fill="#ffffff"/>',
      '<circle cx="39.7" cy="31" r="1.1" fill="#ffffff"/>',
      '<ellipse cx="19.5" cy="37.6" rx="2.9" ry="1.8" fill="#ff9db4" opacity="0.7"/>',
      '<ellipse cx="44.5" cy="37.6" rx="2.9" ry="1.8" fill="#ff9db4" opacity="0.7"/>',
      '<path d="M30.4 38.2c.9 1.5 2.3 1.5 3.2 0" fill="none" stroke="#22304a" stroke-width="1.3" stroke-linecap="round"/>',
      '</svg>',
    ].join('')

    /** Copy for this plugin's own surfaces and for its Plugins-page card. */
    const STRINGS = {
      zh: {
        open: '打开设置面板',
        title: '设置',
        empty: '还没有插件向悬浮球注册面板。',
        summary: '悬浮球外观：形象、大小、透明度、动效',
        image: '形象',
        imageHint: '留空时用 assets/mascot.* 里的本地图，没有则用内置形象；也可填图片 URL 或一个表情符号',
        imagePick: '选择图片',
        imageClear: '恢复内置',
        size: '大小',
        opacity: '透明度',
        motion: '动效',
        motionBreathe: '呼吸',
        motionSway: '摇摆',
        motionNone: '静止',
        width: '面板宽度',
        resetPosition: '复位位置',
        back: '返回',
        close: '关闭',
      },
      en: {
        open: 'Open the settings panel',
        title: 'Settings',
        empty: 'No plugin has registered a panel yet.',
        summary: 'Ball appearance: artwork, size, opacity, motion',
        image: 'Artwork',
        imageHint: 'Empty uses assets/mascot.* beside the installed package, else the built-in art; a URL or a single emoji also works',
        imagePick: 'Choose image',
        imageClear: 'Restore built-in',
        size: 'Size',
        opacity: 'Opacity',
        motion: 'Motion',
        motionBreathe: 'Breathe',
        motionSway: 'Sway',
        motionNone: 'Still',
        width: 'Panel width',
        resetPosition: 'Reset position',
        back: 'Back',
        close: 'Close',
      },
    }

    /** Defaults mirroring the Host schema; the ball renders from these before the document loads. */
    const DEFAULTS = Object.freeze({
      image: '',
      size: 52,
      opacity: 92,
      motion: 'breathe',
      surfaceWidth: 300,
      x: -1,
      y: -1,
    })

    /** Idle animations accepted from the schema or the form. */
    const MOTIONS = ['breathe', 'sway', 'none']

    /** Bounds shared with the Host schema. */
    const SIZE_MIN = 28
    const SIZE_MAX = 96
    const OPACITY_MIN = 20
    const OPACITY_MAX = 100
    const WIDTH_MIN = 240
    const WIDTH_MAX = 480

    /** Outer sheet: only the fixed host box, so the ball can sit anywhere. */
    const HOST_CSS = '.dshb-host { position: fixed; z-index: 900; }'

    /** Shadow-root sheet: the ball, its motion, and the panel surface. */
    const PANEL_CSS = `
:host {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  font-size: 12px;
  line-height: 1.5;
  letter-spacing: normal;
  text-transform: none;
  text-align: left;
  direction: ltr;
  color: #eceef1;
}
* { box-sizing: border-box; }

.ball {
  display: grid;
  place-items: center;
  width: var(--dshb-size, 52px);
  height: var(--dshb-size, 52px);
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: radial-gradient(circle at 32% 26%, rgba(255, 255, 255, 0.94), rgba(226, 236, 255, 0.78) 58%, rgba(198, 214, 246, 0.7));
  box-shadow: 0 6px 20px rgba(15, 25, 60, 0.34), inset 0 0 0 1px rgba(255, 255, 255, 0.55);
  opacity: var(--dshb-opacity, 0.92);
  cursor: grab;
  touch-action: none;
  user-select: none;
  -webkit-user-drag: none;
  transition: box-shadow 0.18s ease;
}
.ball:hover { box-shadow: 0 9px 26px rgba(15, 25, 60, 0.42), inset 0 0 0 1px rgba(255, 255, 255, 0.7); }
.ball:active { cursor: grabbing; }
.ball:focus-visible { outline: 2px solid #6ea8fe; outline-offset: 2px; }

.art {
  display: grid;
  place-items: center;
  width: 86%;
  height: 86%;
  transform-origin: 50% 62%;
  /* The artwork is decoration. Every pointer gesture has to belong to the
     button, and a native image drag must never start: without this, dragging
     the ball rips the picture out of the page instead of moving the ball. */
  pointer-events: none;
  -webkit-user-drag: none;
  user-select: none;
}
.art svg, .art img {
  width: 100%; height: 100%; display: block; object-fit: contain;
  -webkit-user-drag: none;
  user-select: none;
}
.art[data-kind='glyph'] { font-size: calc(var(--dshb-size, 52px) * 0.5); line-height: 1; }

:host([data-motion='breathe']) .art { animation: dshb-breathe 3.4s ease-in-out infinite; }
:host([data-motion='sway']) .art { animation: dshb-sway 4.2s ease-in-out infinite; }
@keyframes dshb-breathe { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.06); } }
@keyframes dshb-sway { 0%, 100% { transform: rotate(-5deg); } 50% { transform: rotate(5deg); } }

.surface {
  position: absolute;
  width: var(--dshb-width, 300px);
  max-height: 76vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.13);
  border-radius: 14px;
  background: rgba(22, 23, 26, 0.92);
  -webkit-backdrop-filter: blur(26px) saturate(150%);
  backdrop-filter: blur(26px) saturate(150%);
  box-shadow: 0 18px 48px rgba(0, 0, 0, 0.46);
}
.surface[hidden] { display: none; }
.surface[data-side='up'][data-align='right'] { bottom: calc(100% + 10px); right: 0; }
.surface[data-side='up'][data-align='left'] { bottom: calc(100% + 10px); left: 0; }
.surface[data-side='down'][data-align='right'] { top: calc(100% + 10px); right: 0; }
.surface[data-side='down'][data-align='left'] { top: calc(100% + 10px); left: 0; }

.head { display: flex; align-items: center; gap: 6px; padding: 11px 12px 8px; }
.head b { flex: 1; font-size: 13px; font-weight: 600; }
.head button {
  width: 22px; height: 22px; flex: 0 0 auto; padding: 0; border: 0; border-radius: 6px;
  background: transparent; color: #a9adb4; font-size: 15px; line-height: 1; cursor: pointer;
}
.head button:hover { background: rgba(255, 255, 255, 0.1); color: #fff; }
.head button:focus-visible { outline: 2px solid #6ea8fe; outline-offset: 1px; }
.head button[hidden] { display: none; }

.menu { padding: 0 8px 10px; overflow-y: auto; }
.menu[hidden] { display: none; }
.entry {
  display: flex; align-items: center; gap: 9px; width: 100%; padding: 8px 9px;
  border: 0; border-radius: 9px; background: transparent; color: #eceef1;
  font-size: 12.5px; text-align: left; cursor: pointer;
}
.entry:hover { background: rgba(255, 255, 255, 0.09); }
.entry:focus-visible { outline: 2px solid #6ea8fe; outline-offset: -2px; }
.entry__icon { width: 20px; flex: 0 0 auto; text-align: center; font-size: 15px; line-height: 1; }
.entry__label { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.entry__state {
  flex: 0 0 auto; padding: 1px 6px; border-radius: 999px; font-size: 10px; line-height: 1.6;
  background: rgba(255, 255, 255, 0.1); color: #a9adb4;
}
.entry__state[data-state='problem'] { background: rgba(229, 83, 75, 0.22); color: #ffb4ae; }
.entry__state[data-state='off'] { background: rgba(255, 255, 255, 0.14); color: #d7dade; }

/* Generic settings form, rendered from a module's declared fields. */
.field { display: grid; grid-template-columns: 76px 1fr 46px; align-items: center; gap: 8px; margin: 7px 0; }
.field > span { color: #b9bdc4; }
.field output { text-align: right; color: #8f949c; font-variant-numeric: tabular-nums; }
.field input[type='range'] { width: 100%; margin: 0; accent-color: #6ea8fe; }
.field select, .field input[type='text'] {
  width: 100%; padding: 4px 6px; border: 1px solid rgba(255, 255, 255, 0.16); border-radius: 7px;
  background: rgba(255, 255, 255, 0.06); color: #eceef1; font-size: 12px;
}
.field select:focus-visible, .field input[type='text']:focus-visible { outline: 2px solid #6ea8fe; outline-offset: 1px; }

.notice { margin: 4px 0 10px; color: #a9adb4; font-size: 12px; line-height: 1.6; }

.body { padding: 0 12px 13px; overflow-y: auto; }
.body[hidden] { display: none; }
.empty { margin: 0; padding: 0 12px 14px; color: #a9adb4; font-size: 12px; }
.empty[hidden] { display: none; }

@media (prefers-reduced-motion: reduce) {
  .art, .ball { animation: none !important; }
  .ball { transition: none; }
}
`

    /**
     * Plugins-page card sheet. Plain prefixed classes styled from theme tokens:
     * no product rule matches `dshb-card*`, and the card follows the app's
     * light/dark palette instead of hardcoding a scheme.
     */
    const CARD_CSS = `
.dshb-card { display: grid; gap: 11px; max-width: 460px; font-size: 12px; }
.dshb-card__row { display: grid; grid-template-columns: 84px 1fr 56px; align-items: center; gap: 10px; }
.dshb-card__row > span { color: var(--dsw-alias-label-secondary, #6b7280); }
.dshb-card__row output { text-align: right; color: var(--dsw-alias-label-secondary, #6b7280); font-variant-numeric: tabular-nums; }
.dshb-card__row input[type='range'] { width: 100%; margin: 0; }
.dshb-card__row input[type='text'], .dshb-card__row select {
  width: 100%; padding: 5px 7px; border: 0.5px solid var(--dsw-alias-border-l2, #d1d5db);
  border-radius: 7px; background: var(--dsw-alias-bg-layer-1, #fff);
  color: var(--dsw-alias-label-primary, #111827); font: inherit;
}
.dshb-card__preview { display: flex; align-items: center; gap: 10px; grid-column: 2 / -1; }
.dshb-card__preview i {
  display: grid; place-items: center; flex: 0 0 auto; width: 42px; height: 42px; border-radius: 50%;
  background: radial-gradient(circle at 32% 26%, #ffffff, #e2ecff 60%, #c6d6f6); overflow: hidden;
}
.dshb-card__preview i svg, .dshb-card__preview i img { width: 86%; height: 86%; display: block; object-fit: contain; }
.dshb-card__preview i[data-kind='glyph'] { font-size: 22px; }
.dshb-card__hint { margin: -4px 0 0; color: var(--dsw-alias-label-secondary, #6b7280); font-size: 11px; }
.dshb-card__actions { display: flex; flex-wrap: wrap; gap: 7px; }
.dshb-card__actions button {
  padding: 6px 11px; border: 0.5px solid var(--dsw-alias-border-l2, #d1d5db); border-radius: 8px;
  background: var(--dsw-alias-bg-layer-1, #fff); color: var(--dsw-alias-label-primary, #111827);
  font: inherit; cursor: pointer;
}
.dshb-card__actions button:hover { background: var(--dsw-alias-bg-layer-2, #f3f4f6); }
.dshb-card__actions button:focus-visible { outline: 2px solid var(--dsw-alias-brand-primary, #4b86f0); outline-offset: 1px; }
`

    /** Shadow-root markup. Static text only; every value reaches the DOM through properties. */
    const MARKUP = `
<button class="ball" type="button"><span class="art"></span></button>
<div class="surface" hidden>
  <div class="head">
    <button class="back" type="button" hidden>‹</button>
    <b class="title"></b>
    <button class="close" type="button">×</button>
  </div>
  <div class="menu"></div>
  <p class="empty" hidden></p>
  <div class="body" hidden></div>
</div>
`

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
     * Whether a source is a text glyph rather than an image reference.
     * @param {string} value - the trimmed `image` setting.
     * @returns {boolean} true for a short string with no URL scheme or path separator.
     */
    function isGlyph(value) {
      return value !== '' && value.length <= 8 && !value.includes('/') && !value.includes(':')
    }

    /**
     * Remove characters that would close or escape a `url("…")` token.
     * @param {string} value - the raw image source.
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
        // JSON) falls back to the defaults instead of blocking the ball.
        stored = null
      }
      if (typeof stored !== 'object' || stored === null) return state
      for (const key of Object.keys(DEFAULTS)) {
        const value = stored[key]
        if (key === 'motion') {
          if (typeof value === 'string' && MOTIONS.includes(value)) state.motion = value
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
     * One reactive settings value over the Host namespace, with the local
     * mirror as the fallback for a client the Host does not serve.
     *
     * Reads are synchronous from the working copy so the first paint never
     * waits, and the Host document is adopted whenever a snapshot arrives.
     * `set` applies locally; `commit` also writes durably — a drag calls `set`
     * per pointer event and `commit` once on release, so pointer cadence never
     * reaches the settings wire.
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
       * client already holds locally, which is exactly what a build that stored
       * preferences locally leaves behind. So only a field the raw user layer
       * actually overrides is adopted; a local value the Host has never seen is
       * pushed up instead, making it durable and shared rather than dropped.
       *
       * @param {object} snapshot - one `settingsScope` snapshot.
       */
      const adopt = (snapshot) => {
        const section = snapshot.value
        if (typeof section !== 'object' || section === null) return
        const user = typeof snapshot.user === 'object' && snapshot.user !== null ? snapshot.user : {}
        const next = { ...state }
        let changed = false
        for (const key of Object.keys(DEFAULTS)) {
          const value = section[key]
          if (typeof value !== typeof DEFAULTS[key]) continue
          if (key === 'motion' && !MOTIONS.includes(value)) continue
          if (key in user) {
            if (next[key] !== value) { next[key] = value; changed = true }
          } else if (next[key] !== DEFAULTS[key] && !migrated.has(key)) {
            migrated.add(key)
            void scope.set(key, next[key]).catch((error) => {
              console.error(`[${PLUGIN_ID}] could not migrate local setting "${key}"`, error)
            })
          }
        }
        if (!changed) return
        state = next
        writeLocal(state)
        publish()
      }

      const service = ctx.get('settingsScope')
      if (service !== undefined) {
        scope = service.bind({ namespace: NAMESPACE })
        const sync = () => {
          const snapshot = scope.getSnapshot()
          // 'loading' leaves the local copy in place, and 'unavailable' keeps
          // it permanently — which is what makes a Host-less client still work.
          if (snapshot.status === 'ready') adopt(snapshot)
        }
        ctx.effect(() => scope.subscribe(sync), 'ui-ball: settings scope')
        sync()
      }

      const apply2 = (field, value, durable) => {
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
        set: (field, value) => { apply2(field, value, false) },
        commit: (field, value) => { apply2(field, value, true) },
      }
    }

    /**
     * Build the client plugin body.
     * @param {object} ctx - the client Cordis context.
     */
    function apply(ctx) {
      const settings = createSettings(ctx)
      // Read lazily: the locale service arrives through its own inject, and the
      // directory can render before it does.
      const localeService = ctx.get('locale')

      // Registered panels, in registration order; `order` breaks ties and a
      // monotonic sequence keeps removal from reusing an earlier position.
      const entries = new Map()
      const watchers = new Set()
      let sequence = 0
      const notify = () => { for (const watcher of [...watchers]) watcher() }

      let translate = (key) => STRINGS.zh[key] ?? key

      const hostStyleTag = document.createElement('style')
      hostStyleTag.dataset.plugin = PLUGIN_ID
      hostStyleTag.dataset.pluginCss = `${PLUGIN_ID}/host.css`
      hostStyleTag.textContent = HOST_CSS

      const host = document.createElement('div')
      host.className = 'dshb-host'
      const shadow = host.attachShadow({ mode: 'open' })
      const sheet = document.createElement('style')
      sheet.textContent = PANEL_CSS
      shadow.append(sheet)
      const template = document.createElement('template')
      template.innerHTML = MARKUP
      shadow.append(template.content)

      const ball = shadow.querySelector('.ball')
      const art = shadow.querySelector('.art')
      const surface = shadow.querySelector('.surface')
      const title = shadow.querySelector('.title')
      const back = shadow.querySelector('.back')
      const menu = shadow.querySelector('.menu')
      const body = shadow.querySelector('.body')
      const empty = shadow.querySelector('.empty')

      let activeId = null
      let disposeActive = null
      let lastImage = null
      let drag = null

      /**
       * The `dsh.ball` directory served by this package's Host half. A module
       * appears here whether or not its client half is running, which is what
       * lets the ball list and manage a plugin it has never heard from.
       */
      let directory = { protocol: 0, modules: [], loaded: false, error: null }
      const directoryListeners = new Set()
      const notifyDirectory = () => { for (const listener of [...directoryListeners]) listener() }

      /** Namespace bindings, one per declared module, created on first use. */
      const bindings = new Map()

      /**
       * Resolve a localized pair against the active language, preferring the
       * dictionary's own locale when it is a Chinese or English build.
       * @param {{ zh: string, en: string } | undefined} pair - the declared pair.
       * @param {string} fallback - used when the pair is absent.
       * @returns {string} the text to render.
       */
      const localize = (pair, fallback) => {
        if (pair === undefined) return fallback
        return localeIsEnglish() ? pair.en : pair.zh
      }

      /** @returns {boolean} whether the product is currently showing English copy. */
      const localeIsEnglish = () => {
        const id = localeService === undefined ? 'zh' : localeService.getSnapshot().locale
        return typeof id === 'string' && id.toLowerCase().startsWith('en')
      }

      /** Re-read the directory. Cheap, uncached, and safe to call after any management action. */
      const loadDirectory = async () => {
        try {
          const response = await fetch(MODULE_DIRECTORY_URL, { headers: { accept: 'application/json' } })
          if (!response.ok) throw new Error(`HTTP ${String(response.status)}`)
          const body = await response.json()
          if (typeof body !== 'object' || body === null || !Array.isArray(body.modules)) {
            throw new Error('malformed directory')
          }
          directory = { protocol: Number(body.protocol) || 0, modules: body.modules, loaded: true, error: null }
        } catch (error) {
          // A composition without the Host route simply has no directory; the
          // ball still works from live registrations alone.
          directory = { protocol: 0, modules: [], loaded: false, error: String(error) }
        }
        notifyDirectory()
      }

      /**
       * The panel list: declared modules merged with live self-registrations.
       *
       * A live registration wins on presentation — it can render anything — but
       * a declared module that never registered still appears, carrying its
       * state, so the ball can say "installed but switched off" instead of
       * showing nothing.
       *
       * @returns {object[]} records in render order.
       */
      const models = () => {
        const merged = new Map()
        for (const module of directory.modules) {
          if (typeof module?.id !== 'string') continue
          merged.set(module.id, {
            id: module.id,
            title: localize(module.title, module.id),
            icon: typeof module.icon === 'string' ? module.icon : '',
            order: Number.isFinite(module.order) ? module.order : 0,
            descriptor: module,
            live: undefined,
            problem: typeof module.problem === 'string' ? module.problem : undefined,
            seq: merged.size,
          })
        }
        for (const entry of entries.values()) {
          const known = merged.get(entry.id)
          if (known === undefined) {
            merged.set(entry.id, {
              id: entry.id,
              title: labelOf(entry),
              icon: entry.icon ?? '',
              order: entry.order,
              descriptor: undefined,
              live: entry,
              problem: undefined,
              seq: sequence,
            })
          } else {
            known.live = entry
            known.order = entry.order
            if (entry.icon !== undefined) known.icon = entry.icon
          }
        }
        return [...merged.values()].sort((left, right) => left.order - right.order || left.seq - right.seq)
      }

      /** Panels in render order. */
      const sorted = () => models()

      /**
       * Resolve an entry's label, which may be a string or a locale-bound function.
       * @param {object} entry - a registry entry.
       * @returns {string} the label to render.
       */
      const labelOf = (entry) => {
        const value = typeof entry.label === 'function' ? entry.label() : entry.label
        return typeof value === 'string' && value !== '' ? value : entry.id
      }

      /** The ball's viewport position, clamped into the viewport. */
      const position = () => {
        const state = settings.get()
        const limitX = Math.max(0, window.innerWidth - state.size)
        const limitY = Math.max(0, window.innerHeight - state.size)
        return {
          x: state.x < 0 ? Math.max(16, window.innerWidth - state.size - 18) : clamp(state.x, 0, limitX),
          y: state.y < 0 ? Math.max(16, window.innerHeight - state.size - 18) : clamp(state.y, 0, limitY),
        }
      }

      /** Place the ball and anchor the surface to whichever edges keep it on screen. */
      const place = () => {
        const spot = position()
        const size = settings.get().size
        host.style.left = `${spot.x}px`
        host.style.top = `${spot.y}px`
        host.style.right = 'auto'
        host.style.bottom = 'auto'
        surface.dataset.side = spot.y > window.innerHeight * 0.55 ? 'up' : 'down'
        surface.dataset.align = spot.x + size / 2 < window.innerWidth / 2 ? 'left' : 'right'
      }

      /** Paint the mascot: an explicit source, the local asset, or the built-in art. */
      const paintArt = () => {
        const safe = safeUrl((settings.get().image ?? '').trim())
        // The local asset is part of the paint key: the probe settling has to
        // repaint even though no setting moved.
        const key = `${safe}|${localMascot}`
        // Rebuilding the art is the one expensive paint here, so it happens
        // only when the source actually moved — not on every slider tick.
        if (key === lastImage) return
        lastImage = key
        art.textContent = ''
        if (safe === '' && localMascot !== 'present') {
          art.dataset.kind = 'svg'
          art.innerHTML = MASCOT_SVG
        } else if (safe !== '' && isGlyph(safe)) {
          art.dataset.kind = 'glyph'
          art.textContent = safe
        } else {
          art.dataset.kind = 'img'
          const element = document.createElement('img')
          element.src = safe === '' ? LOCAL_MASCOT_URL : safe
          element.alt = ''
          // An <img> is draggable by default, which would hijack the ball's own
          // drag and drop the file onto the page instead.
          element.draggable = false
          art.append(element)
        }
      }

      /** Run the active panel's disposer, if it returned one. */
      const deactivate = () => {
        if (disposeActive !== null) {
          try {
            disposeActive()
          } catch (error) {
            console.error(`[${PLUGIN_ID}] panel cleanup failed`, error)
          }
        }
        disposeActive = null
        activeId = null
        body.textContent = ''
      }

      /**
       * The profile's plugin manager Remote, when this composition has one.
       * Read lazily: the namespace is mounted by `@deepseek-ai/dsh-api-remotes`,
       * which a composition may omit.
       * @returns {object | undefined} the manager namespace.
       */
      const manager = () => {
        const remote = ctx.get('remote')
        return remote === undefined ? undefined : remote.pluginManager
      }

      /**
       * Switch one loader row on or off through the profile's plugin manager.
       * @param {string} entryId - the row's loader entry id.
       * @param {boolean} enabled - the state to write.
       */
      const setRowEnabled = async (entryId, enabled) => {
        const api = manager()
        if (api === undefined) return
        const result = await api.setPluginEnabled(entryId, enabled)
        if (result.ok !== true) {
          console.error(`[${PLUGIN_ID}] could not switch ${entryId}: ${String(result.error?.code)} ${String(result.error?.message)}`)
        }
        await loadDirectory()
      }

      /** The management bar shown above a declared module's panel. */
      const managementBar = (model) => {
        const descriptor = model.descriptor
        if (descriptor === undefined || typeof descriptor.entryId !== 'string') return null
        if (manager() === undefined) return null
        const bar = document.createElement('div')
        bar.className = 'actions'
        const off = descriptor.enabled === false
        const toggle = document.createElement('button')
        toggle.type = 'button'
        toggle.textContent = off
          ? localize({ zh: '启用这个插件', en: 'Enable this plugin' }, 'Enable')
          : localize({ zh: '停用这个插件', en: 'Disable this plugin' }, 'Disable')
        toggle.addEventListener('click', () => { void setRowEnabled(descriptor.entryId, off) })
        bar.append(toggle)
        return bar
      }

      /** Open one module's panel, or explain why it has none. */
      const activate = (id) => {
        deactivate()
        const model = sorted().find(candidate => candidate.id === id)
        if (model === undefined) return
        activeId = id
        title.textContent = model.title
        menu.hidden = true
        empty.hidden = true
        body.hidden = false
        back.hidden = sorted().length < 2

        const bar = managementBar(model)
        if (bar !== null) body.append(bar)

        const note = (text) => {
          const message = document.createElement('p')
          message.className = 'notice'
          message.textContent = text
          body.append(message)
        }

        try {
          if (model.live !== undefined && typeof model.live.render === 'function') {
            const dispose = model.live.render(body, { close })
            disposeActive = typeof dispose === 'function' ? dispose : null
            return
          }
          // No live panel, but the declaration carries a settings schema: the
          // ball renders it. This is the whole point of the protocol — a plugin
          // that ships no form code still gets a working one.
          const declaration = model.descriptor?.settings
          if (declaration !== undefined) {
            const binding = bindings.get(id) ?? bindModuleSettings(ctx, declaration)
            bindings.set(id, binding)
            const dispose = createForm(body, {
              fields: declaration.fields,
              settings: binding,
              localize,
            })
            const reset = document.createElement('div')
            reset.className = 'actions'
            disposeActive = () => { dispose(); reset.remove() }
            return
          }
          if (model.problem !== undefined) note(model.problem)
          else if (model.descriptor !== undefined) {
            note(localize({ zh: '这个模块没有声明设置项，也没有提供面板。', en: 'This module declares no settings and provides no panel.' }, 'no panel'))
          } else {
            note(translate('empty'))
          }
        } catch (error) {
          console.error(`[${PLUGIN_ID}] panel "${id}" failed to render`, error)
          body.textContent = String(error)
        }
      }

      /** Rebuild the module list from the directory merged with live registrations. */
      const renderMenu = () => {
        menu.textContent = ''
        for (const model of sorted()) {
          const item = document.createElement('button')
          item.type = 'button'
          item.className = 'entry'
          item.dataset.entry = model.id
          const icon = document.createElement('span')
          icon.className = 'entry__icon'
          icon.textContent = model.icon !== '' ? model.icon : '•'
          const label = document.createElement('span')
          label.className = 'entry__label'
          label.textContent = model.title
          item.append(icon, label)
          // A declared module the composition is not running is still listed;
          // saying so is the difference between a settings list and a manager.
          const state = model.problem !== undefined ? 'problem'
            : model.descriptor !== undefined && model.descriptor.enabled === false ? 'off'
              : model.descriptor !== undefined && model.descriptor.active === false ? 'idle'
                : model.live === undefined && model.descriptor !== undefined ? 'idle'
                  : 'on'
          if (state !== 'on') {
            const chip = document.createElement('span')
            chip.className = 'entry__state'
            chip.dataset.state = state
            chip.textContent = state === 'off'
              ? localize({ zh: '已停用', en: 'Off' }, 'Off')
              : state === 'problem'
                ? localize({ zh: '声明有误', en: 'Invalid' }, 'Invalid')
                : localize({ zh: '未加载', en: 'Not loaded' }, 'Not loaded')
            item.append(chip)
          }
          menu.append(item)
        }
      }

      /** Repaint everything the appearance settings influence. */
      const renderAppearance = () => {
        const state = settings.get()
        host.style.setProperty('--dshb-size', `${state.size}px`)
        host.style.setProperty('--dshb-opacity', String(state.opacity / 100))
        host.style.setProperty('--dshb-width', `${state.surfaceWidth}px`)
        host.dataset.motion = MOTIONS.includes(state.motion) ? state.motion : 'breathe'
        ball.title = translate('open')
        ball.setAttribute('aria-label', translate('open'))
        paintArt()
        place()
      }

      /**
       * Open the surface, optionally straight onto one panel.
       * @param {string} [id] - panel to show; omitted picks the only panel, or the list.
       */
      const open = (id) => {
        surface.hidden = false
        const list = sorted()
        if (typeof id === 'string') activate(id)
        else if (list.length === 1) activate(list[0].id)
        else {
          deactivate()
          title.textContent = translate('title')
          body.hidden = true
          menu.hidden = list.length === 0
          empty.hidden = list.length > 0
          empty.textContent = translate('empty')
          back.hidden = true
        }
        renderMenu()
        place()
      }

      /** Hide the surface and release the active panel. */
      const close = () => {
        surface.hidden = true
        deactivate()
      }

      const toggle = () => { if (surface.hidden) open(); else close() }

      // The registry is the whole cross-plugin contract. The service is a thin
      // face over it so the UI can read the same map without handing
      // contributors mutation powers they must not have.
      const service = {
        /**
         * Contribute a panel to the ball.
         * @param {{ id: string, label?: string | (() => string), icon?: string, order?: number, render: (container: HTMLElement, api: { close: () => void }) => (void | (() => void)) }} entry - the panel.
         * @returns {() => void} disposer removing exactly this registration.
         */
        register(entry) {
          if (typeof entry !== 'object' || entry === null) throw new TypeError('ctx.ball.register needs an entry object')
          if (typeof entry.id !== 'string' || entry.id === '') throw new TypeError('ctx.ball.register needs a non-empty string id')
          if (typeof entry.render !== 'function') throw new TypeError(`ctx.ball "${entry.id}" needs a render(container, api) function`)
          if (entries.has(entry.id)) throw new Error(`ctx.ball "${entry.id}" is already registered`)
          entries.set(entry.id, { ...entry, order: Number.isFinite(entry.order) ? entry.order : 0, seq: sequence++ })
          notify()
          return () => {
            if (!entries.delete(entry.id)) return
            if (activeId === entry.id) {
              deactivate()
              if (!surface.hidden) open()
            }
            notify()
          }
        },
        /**
         * Every panel the ball offers, in render order: declared modules merged
         * with live registrations, so a plugin whose client half is switched off
         * is still reported.
         * @returns {Array<{ id: string, label: string, icon: string }>} the panels.
         */
        entries() {
          return sorted().map(model => ({ id: model.id, label: model.title, icon: model.icon ?? '' }))
        },
        /**
         * Observe registry changes.
         * @param {() => void} listener - invoked after each registration change.
         * @returns {() => void} the disposer removing this listener.
         */
        subscribe(listener) {
          watchers.add(listener)
          return () => { watchers.delete(listener) }
        },
        open,
        close,
        toggle,
      }

      // A registration change repaints the list, and re-opens the list when the
      // surface is showing it. Containment keeps one broken panel from taking
      // the whole surface down.
      const onRegistryChange = () => {
        renderMenu()
        if (!surface.hidden && activeId === null) open()
      }
      watchers.add(onRegistryChange)

      ball.addEventListener('pointerdown', (event) => {
        drag = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, moved: false }
        ball.setPointerCapture(event.pointerId)
      })
      // Belt and braces beside `pointer-events: none` on the art: a native
      // dragstart anywhere in the ball would cancel the pointer gesture and
      // hand the browser a file to drop.
      ball.addEventListener('dragstart', (event) => { event.preventDefault() })
      ball.addEventListener('pointermove', (event) => {
        if (drag === null || event.pointerId !== drag.pointerId) return
        const dx = event.clientX - drag.x
        const dy = event.clientY - drag.y
        if (!drag.moved && Math.hypot(dx, dy) < 4) return
        drag.moved = true
        const spot = position()
        // Local-only while the pointer moves; the release commits once.
        settings.set('x', spot.x + dx)
        settings.set('y', spot.y + dy)
        drag.x = event.clientX
        drag.y = event.clientY
        place()
      })
      ball.addEventListener('pointerup', (event) => {
        if (drag === null || event.pointerId !== drag.pointerId) return
        const moved = drag.moved
        drag = null
        if (!moved) { toggle(); return }
        const spot = position()
        settings.commit('x', spot.x)
        settings.commit('y', spot.y)
      })

      shadow.addEventListener('click', (event) => {
        const target = event.target instanceof Element ? event.target : null
        if (target === null) return
        const entryButton = target.closest('[data-entry]')
        if (entryButton !== null) { activate(entryButton.dataset.entry); return }
        if (target.closest('.close') !== null) { close(); return }
        if (target.closest('.back') !== null) { open(); return }
      })

      const onResize = () => { place() }
      window.addEventListener('resize', onResize)
      const unsubscribeSettings = settings.subscribe(renderAppearance)
      // A directory change is a menu change; the surface repaints if it is
      // showing the list.
      directoryListeners.add(() => {
        renderMenu()
        if (!surface.hidden && activeId === null) open()
      })

      ctx.effect(() => {
        const parent = document.body ?? document.documentElement
        document.head.append(hostStyleTag)
        parent.append(host)
        renderAppearance()
        // One probe decides whether the Host serves a local mascot. The result
        // repaints the ball and the configuration card's preview; a composition
        // without the Host route simply settles on 'absent'.
        const probe = new Image()
        probe.addEventListener('load', () => { localMascot = 'present'; renderAppearance() })
        probe.addEventListener('error', () => { localMascot = 'absent'; renderAppearance() })
        probe.src = LOCAL_MASCOT_URL
        // The declared-module directory is the other half of the menu.
        void loadDirectory()
        return () => {
          hostStyleTag.remove()
          host.remove()
          window.removeEventListener('resize', onResize)
          unsubscribeSettings()
          deactivate()
          entries.clear()
          watchers.clear()
          bindings.clear()
        }
      }, 'ui-ball: mascot and panel surface')

      // Provided during apply, so a plugin that injects `ball` is ordered after
      // this one regardless of composition order.
      ctx.provide(SERVICE, service)

      // The manager announces its own changes; a reconnect may have changed the
      // composition without an announcement, so both refresh the directory.
      ctx.effect(() => {
        const remote = ctx.get('remote')
        const disposers = []
        if (remote !== undefined && typeof remote.$on === 'function') {
          disposers.push(remote.$on('plugin-manager/changed', () => { void loadDirectory() }))
        }
        disposers.push(ctx.on('connection/reset', () => { void loadDirectory() }))
        return () => { for (const dispose of disposers) dispose() }
      }, 'ui-ball: directory invalidation')

      ctx.inject(['locale'], (localeCtx) => {
        localeCtx.effect(() => localeCtx.locale.register(LOCALE_NS, STRINGS), 'ui-ball: dictionaries')
        translate = localeCtx.locale.bind(LOCALE_NS)
        renderAppearance()
        renderMenu()
        // The surface painted before the dictionary existed; repaint whatever
        // is on screen so its copy is the registered one.
        if (!surface.hidden) {
          if (activeId === null) open()
          else activate(activeId)
        }
      })

      registerConfigCard(ctx, settings)
    }

    /**
     * Synthesize the value a declared field shows before the Host answers.
     * @param {object} field - one declared field.
     * @returns {unknown} the first-paint value.
     */
    function fieldDefault(field) {
      if (field.kind === 'toggle') return false
      if (field.kind === 'range') return field.min
      if (field.kind === 'select') return field.options[0]?.value ?? ''
      return ''
    }

    /**
     * Bind one declared module's settings namespace.
     *
     * Unlike this plugin's own settings there is no local mirror and no
     * migration here: the namespace belongs to another plugin, whose own client
     * half owns its durable value. The ball only reads and writes it.
     *
     * @param {object} ctx - the client Cordis context.
     * @param {object} declaration - the module's `settings` declaration.
     * @returns {object} a reader/writer over the namespace.
     */
    function bindModuleSettings(ctx, declaration) {
      const fields = declaration.fields
      const defaults = Object.fromEntries(fields.map(field => [field.key, fieldDefault(field)]))
      const listeners = new Set()
      const service = ctx.get('settingsScope')
      const scope = service === undefined ? null : service.bind({ namespace: declaration.namespace })

      const read = () => {
        if (scope === null) return { ...defaults }
        const snapshot = scope.getSnapshot()
        const section = snapshot.status === 'ready' ? snapshot.value : undefined
        if (typeof section !== 'object' || section === null) return { ...defaults }
        const values = { ...defaults }
        for (const field of fields) {
          const value = section[field.key]
          if (typeof value === typeof defaults[field.key]) values[field.key] = value
        }
        return values
      }

      if (scope !== null) {
        ctx.effect(() => scope.subscribe(() => { for (const listener of [...listeners]) listener() }),
          `ui-ball: ${declaration.namespace} settings`)
      }

      return {
        read,
        /** @returns {boolean} whether the namespace accepts writes at all. */
        writable: () => scope !== null && scope.getSnapshot().writable === true,
        subscribe(listener) {
          listeners.add(listener)
          return () => { listeners.delete(listener) }
        },
        write(key, value) {
          if (scope === null) return
          void scope.set(key, value).catch((error) => {
            console.error(`[${PLUGIN_ID}] could not write ${declaration.namespace}.${key}`, error)
          })
        },
        reset() {
          if (scope === null) return
          void Promise.all(fields.map(field => scope.unset(field.key).catch(() => {}))).catch((error) => {
            console.error(`[${PLUGIN_ID}] could not reset ${declaration.namespace}`, error)
          })
        },
      }
    }

    /**
     * Render a settings form from a module's declared fields.
     *
     * This is what makes the protocol worth having: a plugin declares its fields
     * in `package.json` and gets the same control surface as every other ball
     * module, with no form code of its own.
     *
     * @param {HTMLElement} container - where the form is mounted.
     * @param {{ fields: object[], settings: object, localize: (pair: object | undefined, fallback: string) => string }} deps - declaration and namespace binding.
     * @returns {() => void} disposer removing the form and its subscription.
     */
    function createForm(container, deps) {
      const { fields, settings } = deps
      const controls = new Map()
      const outputs = new Map()

      for (const field of fields) {
        const row = document.createElement('label')
        row.className = 'field'
        const caption = document.createElement('span')
        caption.textContent = deps.localize(field.label, field.key)
        row.append(caption)

        let control
        if (field.kind === 'select') {
          control = document.createElement('select')
          for (const option of field.options) {
            const element = document.createElement('option')
            element.value = option.value
            element.textContent = deps.localize(option.label, option.value)
            control.append(element)
          }
        } else if (field.kind === 'toggle') {
          control = document.createElement('input')
          control.type = 'checkbox'
        } else if (field.kind === 'range') {
          control = document.createElement('input')
          control.type = 'range'
          control.min = String(field.min)
          control.max = String(field.max)
          control.step = String(field.step)
        } else {
          control = document.createElement('input')
          control.type = 'text'
          control.spellcheck = false
          if (field.kind === 'image' && typeof field.hint === 'object') {
            control.placeholder = deps.localize(field.hint, '')
          }
        }
        control.dataset.field = field.key
        row.append(control)

        const output = document.createElement('output')
        row.append(output)
        outputs.set(field.key, { output, field })

        // `input` previews locally; `change` fires once the gesture ends, which
        // is the only point that should reach the settings wire.
        control.addEventListener('input', () => { apply(field, control, false) })
        control.addEventListener('change', () => { apply(field, control, true) })

        controls.set(field.key, control)
        container.append(row)

        // An image field is a URL box plus a local picker that stores a data URI.
        if (field.kind === 'image') {
          const bar = document.createElement('div')
          bar.className = 'actions'
          const pick = document.createElement('button')
          pick.type = 'button'
          pick.textContent = deps.localize({ zh: '选择图片', en: 'Choose image' }, 'Choose image')
          const clear = document.createElement('button')
          clear.type = 'button'
          clear.textContent = deps.localize({ zh: '清除', en: 'Clear' }, 'Clear')
          bar.append(pick, clear)
          const picker = document.createElement('input')
          picker.type = 'file'
          picker.accept = 'image/*'
          picker.hidden = true
          container.append(bar, picker)
          pick.addEventListener('click', () => { picker.value = ''; picker.click() })
          clear.addEventListener('click', () => { settings.write(field.key, '') })
          picker.addEventListener('change', () => {
            const file = picker.files?.[0]
            picker.value = ''
            if (file === undefined) return
            void fileToDataUrl(file, IMAGE_MAX_EDGE)
              .then((dataUrl) => { settings.write(field.key, dataUrl) })
              .catch((error) => { console.error(`[${PLUGIN_ID}] could not read the picked image`, error) })
          })
        }
      }

      const reset = document.createElement('div')
      reset.className = 'actions'
      const resetButton = document.createElement('button')
      resetButton.type = 'button'
      resetButton.textContent = deps.localize({ zh: '恢复默认', en: 'Reset to defaults' }, 'Reset to defaults')
      resetButton.addEventListener('click', () => { settings.reset() })
      reset.append(resetButton)
      container.append(reset)

      /** @param {object} field - the field, @param {HTMLElement} control - its control, @param {boolean} durable - whether to write. */
      const apply = (field, control, durable) => {
        if (!durable) { sync(); return }
        settings.write(field.key, read(control, field))
      }

      /** Push the namespace value into every control and readout. */
      const sync = () => {
        const values = settings.read()
        for (const [key, control] of controls) {
          const value = values[key]
          if (control.type === 'checkbox') control.checked = value === true
          else if (control.type === 'range' || control.tagName === 'SELECT') control.value = String(value)
          // A text box keeps whatever is being typed: a shadow-root input
          // reports its host as document.activeElement.
          else if (container.getRootNode().activeElement !== control) control.value = String(value)
          const entry = outputs.get(key)
          if (entry === undefined) continue
          if (entry.field.kind === 'range') entry.output.textContent = `${String(value)}${entry.field.unit ?? ''}`
          else if (entry.field.kind === 'toggle') entry.output.textContent = value === true ? '✓' : ''
          else entry.output.textContent = ''
        }
      }

      const unsubscribe = settings.subscribe(sync)
      sync()

      return () => {
        unsubscribe()
        container.textContent = ''
      }
    }

    /**
     * Read one control's value in the field's own type.
     * @param {HTMLElement} control - the control.
     * @param {object} field - its declaration.
     * @returns {unknown} the value to persist.
     */
    function read(control, field) {
      if (field.kind === 'toggle') return control.checked
      if (field.kind === 'range') return Number(control.value)
      return control.value
    }

    /**
     * Register this bundle's own configuration page with the desktop Plugins
     * page. The page asks every entry for two views: a one-line summary and the
     * form. The form owns its own edits; the settings scope owns persistence.
     *
     * @param {object} ctx - the client Cordis context.
     * @param {object} settings - the settings bridge from {@link createSettings}.
     */
    function registerConfigCard(ctx, settings) {
      ctx.inject(['slots', 'locale'], (slotsCtx) => {
        const React = require('react')
        const h = React.createElement

        const cardStyleTag = document.createElement('style')
        cardStyleTag.dataset.plugin = PLUGIN_ID
        cardStyleTag.dataset.pluginCss = `${PLUGIN_ID}/card.css`
        cardStyleTag.textContent = CARD_CSS
        slotsCtx.effect(() => {
          document.head.append(cardStyleTag)
          return () => { cardStyleTag.remove() }
        }, 'ui-ball: card stylesheet')

        /** The mascot preview: the chosen image, the local asset, or the built-in art. */
        const preview = (image) => {
          const safe = safeUrl((image ?? '').trim())
          if (safe === '' && localMascot !== 'present') return h('i', { dangerouslySetInnerHTML: { __html: MASCOT_SVG } })
          if (safe !== '' && isGlyph(safe)) return h('i', { 'data-kind': 'glyph' }, safe)
          return h('i', null, h('img', { src: safe === '' ? LOCAL_MASCOT_URL : safe, alt: '', draggable: false }))
        }

        /**
         * One slider row. Dragging applies locally; releasing commits, so a
         * pointer sweep costs one settings write rather than sixty.
         */
        const sliderRow = (t, state, key, label, min, max, unit) => h('label', { className: 'dshb-card__row', key },
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
         * The configuration form. It reads the same settings bridge the ball
         * uses, so a change here shows on the ball immediately.
         * @param {{ t: (key: string) => string }} props - the page's bound translator.
         */
        function BallConfigForm(props) {
          const t = props.t
          const [state, setState] = React.useState(settings.get())
          const picker = React.useRef(null)
          React.useEffect(() => settings.subscribe(() => { setState(settings.get()) }), [])

          return h('div', { className: 'dshb-card' },
            h('div', { className: 'dshb-card__row' },
              h('span', null, t('image')),
              h('div', { className: 'dshb-card__preview' },
                preview(state.image),
                h('input', {
                  type: 'text',
                  value: state.image,
                  spellCheck: false,
                  onChange: (event) => { settings.set('image', event.target.value) },
                  onBlur: (event) => { settings.commit('image', event.target.value) },
                }))),
            h('p', { className: 'dshb-card__hint' }, t('imageHint')),
            h('div', { className: 'dshb-card__actions' },
              h('button', {
                type: 'button',
                onClick: () => {
                  const input = picker.current
                  if (input === null) return
                  input.value = ''
                  input.click()
                },
              }, t('imagePick')),
              h('button', { type: 'button', onClick: () => { settings.commit('image', '') } }, t('imageClear')),
              h('button', {
                type: 'button',
                onClick: () => { settings.commit('x', -1); settings.commit('y', -1) },
              }, t('resetPosition'))),
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
                  .then((dataUrl) => { settings.commit('image', dataUrl) })
                  .catch((error) => { console.error(`[${PLUGIN_ID}] could not read the picked image`, error) })
              },
            }),
            sliderRow(t, state, 'size', t('size'), SIZE_MIN, SIZE_MAX, 'px'),
            sliderRow(t, state, 'opacity', t('opacity'), OPACITY_MIN, OPACITY_MAX, '%'),
            sliderRow(t, state, 'surfaceWidth', t('width'), WIDTH_MIN, WIDTH_MAX, 'px'),
            h('label', { className: 'dshb-card__row' },
              h('span', null, t('motion')),
              h('select', {
                value: state.motion,
                onChange: (event) => { settings.commit('motion', event.target.value) },
              }, ...MOTIONS.map(motion => h('option', { value: motion, key: motion },
                t(motion === 'breathe' ? 'motionBreathe' : motion === 'sway' ? 'motionSway' : 'motionNone')))),
              h('output', null, '')))
        }

        slotsCtx.slots.inject('plugins.row.config', () => slotsCtx.slots.register({
          name: 'plugins.row.config',
          key: `${PLUGIN_ID}#${ROW_ID}`,
          locale: LOCALE_NS,
        }, function BallConfigCard(props) {
          if (props.view === 'summary') return props.t('summary')
          return h(BallConfigForm, { t: props.t })
        }))
      })
    }

    /**
     * Downscale a picked image to a data URI. WebP keeps the alpha a round
     * mascot needs at a fraction of PNG's size, and the durable settings
     * document is YAML, so size matters.
     * @param {File} file - the file the user chose.
     * @param {number} maxEdge - longest edge to keep, in px.
     * @returns {Promise<string>} the encoded image.
     */
    async function fileToDataUrl(file, maxEdge) {
      const bitmap = await createImageBitmap(file)
      try {
        const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height))
        const width = Math.max(1, Math.round(bitmap.width * scale))
        const height = Math.max(1, Math.round(bitmap.height * scale))
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const context = canvas.getContext('2d')
        if (context === null) throw new Error('canvas 2d context unavailable')
        context.drawImage(bitmap, 0, 0, width, height)
        const webp = canvas.toDataURL('image/webp', 0.92)
        return webp.startsWith('data:image/webp') ? webp : canvas.toDataURL('image/png')
      } finally {
        bitmap.close()
      }
    }

    return { apply }
  },
})
