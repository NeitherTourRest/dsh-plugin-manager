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
     * Built-in mascot: an original chibi whale-girl drawn for this plugin
     * (flat shapes only, so it stays legible at small sizes). It is the
     * default `image`; any other artwork replaces it through the settings.
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
        imageHint: '留空用内置鲸鱼娘；也可填图片 URL 或一个表情符号',
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
        imageHint: 'Leave empty for the built-in mascot; a URL or a single emoji also works',
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
}
.art svg, .art img { width: 100%; height: 100%; display: block; object-fit: contain; }
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
      const publish = () => { for (const listener of [...listeners]) listener() }

      /** Fold a Host section into the working copy, publishing only a real change. */
      const adopt = (section) => {
        if (typeof section !== 'object' || section === null) return
        const next = { ...state }
        let changed = false
        for (const key of Object.keys(DEFAULTS)) {
          const value = section[key]
          if (typeof value !== typeof DEFAULTS[key]) continue
          if (key === 'motion' && !MOTIONS.includes(value)) continue
          if (next[key] !== value) { next[key] = value; changed = true }
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
          if (snapshot.status === 'ready') adopt(snapshot.value)
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

      /** Panels in render order. */
      const sorted = () => [...entries.values()].sort((left, right) => left.order - right.order || left.seq - right.seq)

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

      /** Paint the mascot: built-in art, a glyph, or an image reference. */
      const paintArt = () => {
        const image = (settings.get().image ?? '').trim()
        const safe = safeUrl(image)
        // Rebuilding the art is the one expensive paint here, so it happens
        // only when the source actually moved — not on every slider tick.
        if (safe === lastImage) return
        lastImage = safe
        art.textContent = ''
        if (safe === '') {
          art.dataset.kind = 'svg'
          art.innerHTML = MASCOT_SVG
        } else if (isGlyph(safe)) {
          art.dataset.kind = 'glyph'
          art.textContent = safe
        } else {
          art.dataset.kind = 'img'
          const element = document.createElement('img')
          element.src = safe
          element.alt = ''
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
       * Show one registered panel, replacing whatever was shown.
       * @param {string} id - the panel's registration id.
       */
      const activate = (id) => {
        deactivate()
        const entry = entries.get(id)
        if (entry === undefined) return
        activeId = id
        title.textContent = labelOf(entry)
        menu.hidden = true
        empty.hidden = true
        body.hidden = false
        back.hidden = sorted().length < 2
        try {
          const dispose = entry.render(body, { close })
          disposeActive = typeof dispose === 'function' ? dispose : null
        } catch (error) {
          console.error(`[${PLUGIN_ID}] panel "${id}" failed to render`, error)
          body.textContent = String(error)
        }
      }

      /** Rebuild the entry list from the registry. */
      const renderMenu = () => {
        menu.textContent = ''
        for (const entry of sorted()) {
          const item = document.createElement('button')
          item.type = 'button'
          item.className = 'entry'
          item.dataset.entry = entry.id
          const icon = document.createElement('span')
          icon.className = 'entry__icon'
          icon.textContent = typeof entry.icon === 'string' && entry.icon !== '' ? entry.icon : '•'
          const label = document.createElement('span')
          label.className = 'entry__label'
          label.textContent = labelOf(entry)
          item.append(icon, label)
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
        /** @returns {Array<{ id: string, label: string, icon: string }>} the registered panels, in render order. */
        entries() {
          return sorted().map(entry => ({ id: entry.id, label: labelOf(entry), icon: entry.icon ?? '' }))
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

      ctx.effect(() => {
        const parent = document.body ?? document.documentElement
        document.head.append(hostStyleTag)
        parent.append(host)
        renderAppearance()
        return () => {
          hostStyleTag.remove()
          host.remove()
          window.removeEventListener('resize', onResize)
          unsubscribeSettings()
          deactivate()
          entries.clear()
          watchers.clear()
        }
      }, 'ui-ball: mascot and panel surface')

      // Provided during apply, so a plugin that injects `ball` is ordered after
      // this one regardless of composition order.
      ctx.provide(SERVICE, service)

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

        /** The mascot preview: built-in art, a glyph, or the chosen image. */
        const preview = (image) => {
          const safe = safeUrl((image ?? '').trim())
          if (safe === '') return h('i', { dangerouslySetInnerHTML: { __html: MASCOT_SVG } })
          if (isGlyph(safe)) return h('i', { 'data-kind': 'glyph' }, safe)
          return h('i', null, h('img', { src: safe, alt: '' }))
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
     * Downscale a picked image to a mascot-sized data URI. WebP keeps the alpha
     * a round mascot needs at a fraction of PNG's size, and the durable
     * settings document is YAML, so size matters.
     * @param {File} file - the file the user chose.
     * @returns {Promise<string>} the encoded image.
     */
    async function fileToDataUrl(file) {
      const bitmap = await createImageBitmap(file)
      try {
        const scale = Math.min(1, IMAGE_MAX_EDGE / Math.max(bitmap.width, bitmap.height))
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
