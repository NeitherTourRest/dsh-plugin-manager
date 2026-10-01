# 做一个能被管理器识别的插件

目标：让悬浮球认出你的插件，列出它、给它生成设置表单、提供启用/停用。

**你不需要依赖本仓库的任何代码，也不需要装什么。** 只需要在你的 `package.json` 里声明一段 `dsh.ball`。

> 规范条文在 [`PROTOCOL.md`](../packages/dsh-client-ui-ball/PROTOCOL.md)。本文是上手教程；两者冲突以规范为准。

## 0. 前提

你已经有一个符合 dsh 客户端插件契约的包：

```json
{
  "name": "my-dsh-plugin",
  "type": "module",
  "exports": { ".": "./lib/index.js", "./client": "./lib/client.js" },
  "dsh": {
    "client": { "platform": "web" },
    "bundle": { "patch": "./cordis.patch.yml" }
  }
}
```

- `exports["./client"]` 指向浏览器半边，它必须用 `window.__ModuleLoader__.load({ id, factory })` 注册自己。
- `dsh.bundle.patch` 指向一个 cordis patch 文件，让这个包能被装进 profile（见 [install.md](install.md)）。

这两样跟悬浮球无关，是 dsh 客户端插件的通用要求。

## 1. 声明清单

在你的 `package.json` 的 `dsh` 对象里加一个 `ball`：

```json
"ball": {
  "id": "my-plugin",
  "title": { "zh": "我的插件", "en": "My plugin" },
  "description": { "zh": "一句话说明", "en": "One line" },
  "icon": "⚙",
  "order": 20,
  "settings": {
    "namespace": "my-plugin",
    "fields": [
      { "key": "enabled", "kind": "toggle", "label": { "zh": "启用", "en": "Enabled" } },
      { "key": "level", "kind": "range", "min": 0, "max": 10, "step": 1,
        "unit": "级", "label": { "zh": "等级", "en": "Level" } },
      { "key": "mode", "kind": "select", "label": { "zh": "模式", "en": "Mode" },
        "options": [
          { "value": "a", "label": { "zh": "甲", "en": "A" } },
          { "value": "b", "label": { "zh": "乙", "en": "B" } }
        ] },
      { "key": "note", "kind": "text", "label": { "zh": "备注", "en": "Note" } },
      { "key": "art", "kind": "image", "label": { "zh": "图片", "en": "Image" },
        "hint": { "zh": "URL，或选择本地文件", "en": "A URL, or pick a local file" } }
    ]
  }
}
```

**声明完就结束了。** 悬浮球会替你：

- 把模块列进菜单——**即使你的客户端半边没在运行**（它扫的是 manifest，不是等你自报）
- 从 `fields` **自动生成设置表单**
- 在 Plugins 页面**注册配置卡片**（key = `<包名>#<行 id>`）
- 提供**启用 / 停用**（走 dsh 自己的 plugin manager remote）与**恢复默认**

### 字段

| `kind` | 值类型 | 额外属性 |
|---|---|---|
| `toggle` | `boolean` | — |
| `range` | `number` | `min`、`max`（必填，`min < max`）、`step`（默认 1）、`unit` |
| `select` | `string` | `options: [{ value, label }]`（必填、非空） |
| `text` | `string` | — |
| `image` | `string` | 自带「选择图片」（压成 data URI）与「清除」；`hint` 当输入框占位符 |

`label` 必填；`title` / `description` / `label` / `hint` 都接受字符串或 `{ zh, en }`。

**声明有误不会让你消失。** 校验失败会让你带着 `problem` 出现在目录里，悬浮球显示「声明有误」并写明原因——而不是静默丢掉一个用户能在 profile 里看到的插件。

## 2. 让设置真的落盘

清单里的 `settings.namespace` 只是**一个名字**。要让值真的存下来，你的 **Host 半边**必须注册同名命名空间：

```js
// lib/index.js
import z from '@deepseek-ai/schemastery'

export const name = 'my-plugin'
export const MY_NAMESPACE = 'my-plugin'

export const MySettingsSchema = z.object({
  enabled: z.boolean().default(false),
  level: z.number().step(1).min(0).max(10).default(0),
  mode: z.union(['a', 'b']).default('a'),
  note: z.string().default(''),
  art: z.string().default(''),
})

export function apply(ctx) {
  ctx.inject(['settings'], (settingsCtx) => {
    settingsCtx.effect(
      () => settingsCtx.settings.register(MY_NAMESPACE, MySettingsSchema),
      'my-plugin: settings namespace',
    )
  })
}
```

> **`Schema` 的默认值必须和你在客户端用的默认值一致。** 球把「等于 schema 默认值」当作「没人设过这个字段」的标记；两边不一致会让默认值被误判成用户选择，反过来覆盖本地值。

不注册命名空间会怎样？表单还在、还能点，但写不进去——表现就是「改了没反应」。见 [troubleshooting.md](troubleshooting.md#改了没反应)。

## 3. 读设置

浏览器半边用 `ctx.settingsScope` 绑定同一个命名空间：

```js
ctx.inject(['settingsScope'], (scopeCtx) => {
  const scope = scopeCtx.settingsScope.bind({ namespace: MY_NAMESPACE })
  const sync = () => {
    const snapshot = scope.getSnapshot()
    if (snapshot.status !== 'ready') return
    apply(snapshot.value)          // snapshot.value 是 schema 解析后的完整对象
    // snapshot.user 是 Host 存的原始用户层，字段「在不在」标记它是否被覆盖过
  }
  scopeCtx.effect(() => scope.subscribe(sync), 'my-plugin: settings scope')
  sync()
})
```

写回：

```js
await scope.set('level', 7)      // 单字段
await scope.unset('level')       // 恢复该字段默认
await scope.mutate([{ op: 'unset', path: [] }])   // 整个命名空间恢复默认
```

## 4.（可选）自定义面板

声明之外，你还可以在客户端半边注册一个**实时面板**。**实时面板优先于生成的表单。**

```js
ctx.inject(['ball'], (ballCtx) => {
  ballCtx.effect(() => ballCtx.ball.register({
    id: 'my-plugin',              // 必须与清单里的 dsh.ball.id 一致
    label: () => t('panel'),
    icon: '⚙',
    order: 20,
    render(container, api) {
      container.append(myPanel())
      return () => { /* 切走时清理 */ }
    },
  }), 'my-plugin: ball panel')
})
```

**`id` 必须等于清单里声明的 `dsh.ball.id`。** 写成包名不会合并，菜单里会出现两行——一行来自目录、一行来自这个注册。

不用 `ctx.inject(['ball'])` 也行（用 `ctx.get('ball')` 并容忍它不存在），这样没装球时你的插件照样工作。看你要不要这个降级。

## 5. 打包与安装

包要能被装进 profile，需要 `dsh.bundle.patch` 指向一个 cordis patch 文件：

```yaml
# cordis.patch.yml
- insert:
    - id: my-plugin
      name: 'my-dsh-plugin'
```

装法见 [install.md](install.md)。你也可以直接把自己的包放进 `<profile>/node_modules/`，再把上面那个 `insert` 块加进 profile 的 `cordis.patch.yml`。

## 6. 最容易踩的坑

> ### 客户端半边里，服务一律用 `ctx.inject`，不要用 `ctx.get`
>
> 客户端插件在 `apply()` 运行时，**别的插件往往还没激活**。这时 `ctx.get('theme')` 返回 `undefined`，而且**永远保持 undefined**——它不会在服务出现后变成可用。
>
> 症状特别有迷惑性：**刚装好时一切正常，重启 dsh 后失效；把插件停用再启用，又好了。** 因为停用/启用会让 `apply()` 重跑一次，那时组合已经稳定。
>
> ```js
> // ✗ 错：apply 时拿到 undefined 就永远是 undefined
> const theme = ctx.get('theme')
> if (theme !== undefined) theme.overrideTokens(...)
>
> // ✓ 对：等到服务就绪
> let theme = null
> ctx.inject(['theme'], (themeCtx) => {
>   theme = themeCtx.theme
>   repaint()
>   return () => { theme = null }
> })
> ```
>
> 本仓库的玻璃插件在 `theme` 和 `settingsScope` 上各踩了一次，代价是七轮排查。

其它：

- **面板内容在球的 shadow root 里**，文档级样式表穿不进去。要样式就自己挂 shadow root——[`dsh-client-ui-glass/lib/client.js`](../packages/dsh-client-ui-glass/lib/client.js) 可以直接抄。
- **面板切走即销毁**（调用你返回的清理函数），切回来重新 `render`。不要假设面板 DOM 一直存在。
- **`range` 的 `input` 事件在拖动中持续触发**。在它里面回读存储值会把控件弹回原位，用户就永远拖不动。只有 `change` 该写存储。
- **球注册的配置卡片会和你自己的冲突**。slot key 是 `<包名>#<行 id>`，同 key 的第二次注册会**替换**第一次而不是共存。所以要么让球替你注册（推荐），要么自己注册并接受覆盖。

## 参考实现

| 想看什么 | 看 |
|---|---|
| 只声明、不写任何 UI | 没有现成样例，但这就是协议的目标形态 |
| 声明 + 自带实时面板（含降级路径） | [`dsh-client-ui-glass`](../packages/dsh-client-ui-glass/lib/client.js) |
| 同时是管理器本身 | [`dsh-client-ui-ball`](../packages/dsh-client-ui-ball/lib/client.js) |
