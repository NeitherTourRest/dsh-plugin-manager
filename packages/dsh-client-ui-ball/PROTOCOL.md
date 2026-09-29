# `dsh.ball` 协议

悬浮球不是"一个放设置的地方"，而是一个**插件管理器**。任何 dsh 客户端插件只要在自己的 `package.json` 里声明 `dsh.ball`，就会被悬浮球识别：出现在它的列表里、拥有统一的设置表单、可以被启用/停用；即使这个插件自己的客户端半边没在运行也一样。

协议版本：**1**（`GET /ui-ball/modules` 的 `protocol` 字段）。

---

## 1. 插件怎么加入

在 `package.json` 里加一段 `dsh.ball`：

```json
{
  "name": "my-dsh-plugin",
  "exports": { ".": "./lib/index.js", "./client": "./lib/client.js" },
  "dsh": {
    "client": { "platform": "web" },
    "bundle": { "patch": "./cordis.patch.yml" },
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
          { "key": "level", "kind": "range", "min": 0, "max": 10, "step": 1, "unit": "级",
            "label": { "zh": "等级", "en": "Level" }, "hint": { "zh": "说明", "en": "Hint" } },
          { "key": "mode", "kind": "select", "label": { "zh": "模式", "en": "Mode" },
            "options": [
              { "value": "a", "label": { "zh": "甲", "en": "A" } },
              { "value": "b", "label": { "zh": "乙", "en": "B" } }
            ] },
          { "key": "note", "kind": "text", "label": { "zh": "备注", "en": "Note" } },
          { "key": "art", "kind": "image", "label": { "zh": "图片", "en": "Image" },
            "hint": { "zh": "URL 或选择本地文件", "en": "A URL, or pick a local file" } }
        ]
      }
    }
  }
}
```

**这样就完了。** 不需要写面板、不需要写配置卡片、不需要注册 slot。

### 字段

| 字段 | 必填 | 说明 |
|---|---|---|
| `id` | ✅ | 小写连字符标识符，在悬浮球内唯一 |
| `title` | ✅ | 字符串，或 `{ zh, en }` |
| `description` | | 同上；Plugins 页面用它当副标题 |
| `icon` | | 列表里的一个字符，缺省用 `•` |
| `order` | | 排序，小的在前；缺省 `0` |
| `settings.namespace` | | Host settings 命名空间（小写连字符）。**必须由你插件的 Host 半边用 `ctx.settings.register` 注册** |
| `settings.fields` | | 字段数组，见下 |

### 字段种类

| `kind` | 取值 | 额外属性 |
|---|---|---|
| `toggle` | `boolean` | — |
| `range` | `number` | `min`、`max`（必填，`min < max`）、`step`（默认 1）、`unit` |
| `select` | `string` | `options: [{ value, label }]`（必填、非空） |
| `text` | `string` | — |
| `image` | `string` | 自带「选择图片」（压成 data URI 后写入）和「清除」 |

`label` 必填；`hint` 可选（`image` 用它当输入框占位符）。

**声明有误不会让你消失。** 任何校验失败都会让这个模块带着 `problem` 出现在目录里，悬浮球显示「声明有误」并把原因写在面板里——而不是静默丢掉一个用户能在 profile 里看到的插件。

---

## 2. 想要自定义面板？

声明 `settings` 之外，再在客户端半边注册一个实时面板即可。**实时面板优先**：

```js
export function apply(ctx) {
  const ball = ctx.get('ball')
  if (ball === undefined) return
  ctx.effect(() => ball.register({
    id: 'my-plugin',                       // 必须与清单里的 id 一致
    label: () => t('panel'),
    icon: '⚙',
    order: 20,
    render(container, api) {
      container.append(myPanel())
      return () => { /* 离开面板时清理 */ }
    },
  }), 'my-plugin: ball panel')
}
```

- 只有 `render`、没有 `settings`：悬浮球只显示你的面板，没有通用表单。
- 两者都有：显示你的面板，通用表单仍会在 Plugins 页面的配置卡片里可用。
- **都没有**：模块照样出现在列表里，面板说明它没有提供任何东西。

`render(container, api)` 的 `api` 提供 `{ close }`。面板**切走即销毁**（调用你返回的清理函数）。

> 面板内容在悬浮球的 shadow root 里，**文档级样式表穿不进去**——需要样式就自己挂 shadow root（`dsh-client-ui-glass` 就是这么做的）。

---

## 3. Host 半边的目录

`GET /ui-ball/modules` → `application/json`，`no-cache`：

```jsonc
{
  "protocol": 1,
  "modules": [
    {
      "id": "my-plugin",
      "package": "my-dsh-plugin",
      "title": { "zh": "我的插件", "en": "My plugin" },
      "description": { "…": "…" },
      "icon": "⚙",
      "order": 20,
      "rowId": "my-plugin",              // bundle patch 里那一行的 id
      "entryId": "include:my-plugin",    // Loader 树 id —— 管理动作的键
      "enabled": true,                   // 该行是否启用
      "active": true,                    // 该行的 fiber 是否已构造
      "settings": { "namespace": "my-plugin", "fields": [ … ] }
    }
  ]
}
```

扫描方式：遍历 Loader entry，按 **Loader 自己的解析方式**定位每个包的 manifest，只读 `dsh.ball`。**只读 manifest、从不 import 被声明的模块**——所以一个坏插件不会拖垮目录。

`entryId` 就是 `remote.pluginManager.setPluginEnabled(entryId, enabled)` 收的键。

---

## 4. 统一管理

悬浮球对每个声明了 `entryId` 的模块提供：

| 动作 | 实现 |
|---|---|
| 启用 / 停用 | `ctx.remote.pluginManager.setPluginEnabled(entryId, enabled)`，成功后重拉目录 |
| 恢复默认 | `ctx.settingsScope.bind({namespace}).mutate([{ op: 'unset', path: [] }])`（空路径 = 整个 section 根） |
| 跟随 composition 变化 | `ctx.remote.$on('plugin-manager/changed', …)` 与 `ctx.on('connection/reset', …)` |

`RemoteResult` 是 `{ ok: true, value } | { ok: false, error }`——**业务失败不 reject**，读 `ok` 分支。

不可管理的行会带 `readOnlyReason`（`'management-required'` 或 `'unaddressable'`）；悬浮球不显示这些行的开关。

---

## 5. 形象包与状态

`assets/packs/<id>/` 放一个 `pack.json` 和每个状态一张图：

```
assets/packs/whale-girl/
  pack.json    { "title": { "zh": "鲸鱼娘", "en": "Whale girl" },
                 "author": "…", "license": "CC BY-NC-SA 4.0",
                 "states": { "idle": "idle.png", "working": "working.png" } }
  idle.png
  working.png
```

- 状态：`idle` / `working` / `waiting` / `done`，`idle` 必填；未声明的状态回落到 `idle`。
- 图片只接受 `.svg` `.webp` `.png` `.jpeg` `.jpg` `.gif`。
- `GET /ui-ball/packs` 返回索引；`GET /ui-ball/pack/<id>/<state>` 返回图。**pack id 与 state 都在索引里校验过才碰磁盘**，请求路径永远无法指定文件。
- 单张 `assets/mascot.*` 仍然有效，作为画廊里的「默认」项。

`image` 设置的取值：`''`（默认）· `pack:<id>` · http(s)/data URL · 一个短字符（当表情符号）。

### 状态怎么来的

dsh **没有** `done`/`streaming` 这类枚举。悬浮球从 `ctx.uiSession.sessionStatus`（`running` + `pendingInteraction`）推导：

| 状态 | 条件 |
|---|---|
| `waiting` | 有会话 `pendingInteraction !== undefined` |
| `working` | 有会话 `running === true` |
| `done` | **本插件自己锁的 `running` 下降沿**，保持 6 秒 |
| `idle` | 其余 |

> 为什么"完成"要自己锁：库里的 `completionUnread` **故意排除主视图会话**（`isMain` 为真时不置位），所以用户正盯着的那个会话永远不会报告"刚完成"。

---

## 6. 兼容与演进

- 目录带 `protocol` 版本；消费方应当忽略不认识的字段，遇到不认识的 `kind` 应当跳过该字段而不是整块失败。
- `settings` 与实时 `render` 都是可选的，两者独立。
- 包名不要求带 scope，但 `id` 必须在整个悬浮球内唯一。

## 7. 完整示例

仓库里两个包就是活样例：[`dsh-client-ui-ball`](README.md)（自己也是这个协议的一员）与 [`dsh-client-ui-glass`](../dsh-client-ui-glass/README.md)。测试用的三个 fixture 包在 [`test/fixtures/`](../../test/fixtures/)。
