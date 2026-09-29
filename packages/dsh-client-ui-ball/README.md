# dsh-client-ui-ball — 共享悬浮球

给 dsh 桌面版 / Web 版加一个**可拖动、可换形象**的悬浮球。它不只是个按钮，而是一个**面板宿主**：任何 dsh 插件都可以向它注册自己的设置面板，用户点一下球就能在同一个地方调所有插件。

```
        ╭──────────────────────────╮
        │  设置                 ×  │
        ├──────────────────────────┤
        │  ◐  磨砂外观              │   ← dsh-client-ui-glass 注册的
        │  🐳 悬浮球外观            │   ← 本插件注册的
        │  ⚙  你的插件…             │   ← 以后任何插件注册的
        ╰──────────────────────────╯
                    ▲
                  (◕‿◕)   ← 鲸鱼娘，可换形象
```

**一个球，所有插件的设置入口。**

---

## 一、安装

### 方式 A：桌面版 Plugins 页面（推荐）

1. 把 `dsh-client-ui-ball` 目录放到一个长期位置，例如 `D:\dsh-plugins\dsh-client-ui-ball`。
2. 桌面版侧边栏 → **Plugins** → 添加插件 → 填绝对路径。
3. 本包含 `dsh.bundle.patch`，会被识别为 bundle 并自动启用，**下次启动自动生效**。

> `dsh plugin --profile desktop …` 会被 CLI 直接拒绝——desktop profile 由 Electron 独占管理，只能走应用内页面。

### 方式 B：手动放进 profile

```powershell
$dst = "$env:USERPROFILE\.dsh\profiles\desktop\node_modules\dsh-client-ui-ball"
New-Item -ItemType Directory -Force $dst | Out-Null
Copy-Item -Recurse -Force .\* $dst
```

然后往 `~/.dsh/profiles/desktop/cordis.patch.yml` 追加：

```yaml
- insert:
    - id: ui-ball
      name: 'dsh-client-ui-ball'
```

**为什么这样能解析到依赖**——dsh 的模块解析是**双锚点**设计：

| 路径 | 角色 |
|---|---|
| `$DSH_HOME/profiles/desktop/node_modules/` | pnpm 管理区，第三方插件的正式位置 |
| `$DSH_HOME/profiles/node_modules/` | 安装依赖镜像（指向 dsh 自身依赖闭包，含 `@deepseek-ai/cordis`、`@deepseek-ai/schemastery`） |

本包的 Host 半边 `import '@deepseek-ai/schemastery'`，从 `profiles/desktop/node_modules/dsh-client-ui-ball/` 向上走一层就命中镜像，所以能解析。

> ⚠️ 手动拷贝的目录不在 `package.json` 依赖里，下次 pnpm 整理依赖时可能被清掉。长期使用请走方式 A。

---

## 二、给插件作者：`dsh.ball` 协议

悬浮球是一个**插件管理器**。加入它只需要在 `package.json` 里声明一段：

```json
"dsh": {
  "ball": {
    "id": "my-plugin",
    "title": { "zh": "我的插件", "en": "My plugin" },
    "icon": "⚙",
    "order": 20,
    "settings": {
      "namespace": "my-plugin",
      "fields": [
        { "key": "level", "kind": "range", "min": 0, "max": 10, "step": 1,
          "label": { "zh": "等级", "en": "Level" } }
      ]
    }
  }
}
```

**这样就完了**——不用写面板、不用写配置卡片、不用注册 slot。悬浮球会：

- 把你的模块列进菜单（**即使你的客户端半边没在运行**，因为它扫的是 manifest）
- 从你声明的字段**自动生成设置表单**（`toggle` / `range` / `select` / `text` / `image`）
- 提供启用/停用与恢复默认
- 在 `Plugins` 页面上替你出配置卡片

需要自定义面板时，再在客户端半边注册一个实时面板即可（**实时面板优先**）：

```js
const ball = ctx.get('ball')
ctx.effect(() => ball.register({
  id: 'my-plugin',                    // 必须与清单里的 id 一致
  label: () => t('panel'),
  render(container, api) {
    container.append(myPanelElement())
    return () => { /* 离开面板时清理 */ }
  },
}), 'my-plugin: ball panel')
```

**完整规范见 [`PROTOCOL.md`](PROTOCOL.md)**：清单字段、五种字段类型、目录线格式、管理动作、形象包与状态推导。

### `ctx.ball` 服务契约

| 成员 | 说明 |
|---|---|
| `register(entry)` | 注册实时面板，返回精确移除本次注册的 disposer。`id` 非空字符串、`render` 必须是函数，否则抛 `TypeError`；`id` 重复抛 `Error` |
| `entries()` | 当前所有面板 `[{ id, label, icon }]`——**是声明模块与实时注册合并后的结果**，不只是 `register` 过的 |
| `subscribe(fn)` | 观察注册表变化，返回退订函数 |
| `open(id?)` / `close()` / `toggle()` | 打开指定面板 / 收起 / 切换 |

### 行为要点

- **只有一个面板时，点球直接进面板**；两个以上才显示列表。
- 面板在**切走时被销毁**（调用它的清理函数），切回来重新 `render`。不要假设面板 DOM 会一直存在。
- 声明了但没在运行的模块会带状态标记：`已停用` / `未加载` / `声明有误`。
- 面板内部建议**自己挂 Shadow DOM**（像 `dsh-client-ui-glass` 那样）：球的面板内容在球的 shadow root 里，文档级样式表**穿不进去**。

---

## 三、悬浮球自己的外观

三处都能改，值都在同一个 settings 命名空间（`ui-ball`，持久化到 `$DSH_HOME/settings.yaml`）：

1. **球面板里的「悬浮球外观」**（本插件自己注册的第一个面板）
2. **Plugins 页面 → `ui-ball` 行 → Configure 卡片**（官方统一设置入口）
3. 直接编辑 `$DSH_HOME/settings.yaml` 的 `ui-ball:` 段

| 参数 | 范围 | 说明 |
|---|---|---|
| 形象 | 画廊选择 / URL / 表情 | 见第四节。面板里有**画廊**：默认 + 每个已安装的形象包 |
| 大小 | 28–96 px | |
| 透明度 | 20–100% | |
| 动效 | 呼吸 / 摇摆 / 静止 | 尊重 `prefers-reduced-motion` |
| 面板宽度 | 240–480 px | 宿主面板的宽度 |
| 位置 | 拖动即存 | 「复位位置」回默认右下角 |

「选择图片」会把图片压到最长边 256px 的 WebP（保留透明通道），再存进设置文档。

---

## 四、形象：画廊、形象包、以及状态

### 画廊

配置卡片顶部是**形象画廊**，点一下即切换：

- **默认** —— `assets/mascot.*`（本仓库自带的就是鲸鱼娘），没有则用内置 SVG
- **每个已安装的形象包** —— 来自 `assets/packs/<id>/`
- 输入框里可以直接填 URL、`data:`，或一个短字符（当表情符号渲染）

三者写的是同一个 `image` 设置，只有一个事实来源。

### 形象包（多帧状态）

```
assets/packs/whale-girl/
  pack.json    { "title": {...}, "author": "…", "license": "…",
                 "states": { "idle": "idle.png", "working": "working.png" } }
  idle.png
  working.png
```

悬浮球按**会话状态**切帧：

| 状态 | 条件 |
|---|---|
| `waiting` | 有会话在等待你交互（审批/提问） |
| `working` | 有会话在跑 |
| `done` | 刚跑完——**本插件自己锁的下降沿**，保持 6 秒 |
| `idle` | 其余 |

> dsh 没有 `done`/`streaming` 这类枚举，而且库里的 `completionUnread` **故意排除主视图会话**（用户正盯着的那个永远不置位）。所以"完成"帧必须自己锁。

未声明的状态回落到该包的 `idle` 帧。格式只接受 svg / webp / png / jpeg / gif。

### 三种来源，优先级从高到低

1. **设置里的「形象」**（画廊选择 / URL / `data:` / 一个表情符号）
2. **`assets/mascot.*`** —— 本仓库自带 `assets/mascot.png`（社区「鲸鱼娘」），你没动过就用它
3. **内置形象** —— 本插件原创的 Q 版鲸鱼造型 SVG（蓝色鲸鱼兜帽、头顶尾鳍、喷水、腮红），flat 色块，小尺寸下依然清晰。删掉 `mascot.png` 时会回落到它

换成你自己的图：把文件放进**已安装副本**的 `assets/`（命名见 [`assets/README.md`](assets/README.md)），刷新页面。
放进去的图被 `.gitignore` 忽略，**不会进入仓库历史**。

### 自带的「鲸鱼娘」是什么，以及它的许可

社区的**鲸鱼娘不是 DeepSeek 官方吉祥物**，而是一个有明确许可链的二创角色：

- 原型是画师**上善无形**用 AI 工具创作的原创 OC**「溟月」**（2025 年 6 月发布），特征是渐变蓝长发、呆毛、鲸鱼状头鳍、蓝眼、大鲸尾；
- 2026 年 4 月，B 站用户 **ZipZipPipe** 用 GPT Image 2 给它加上 DeepSeek 元素、改成深蓝白女仆装，这才是目前流传的版本；
- DeepSeek 官方只把**人格设定**做成了产品彩蛋（`【PERSONA_LOAD】CETACEA_LOLI`），**没有承认它是官方吉祥物**，也没有主张美术版权；
- **素材许可是 CC BY-NC-SA 4.0**：署名、**禁止商用**、演绎作品同协议共享（见 [36氪的梳理](https://eu.36kr.com/en/p/3947452108789632)）。

所以本仓库采用**分层许可**：**代码 MIT，`assets/mascot.png` 单独按 CC BY-NC-SA 4.0**。
CC 的 ShareAlike **不会传染到代码**——图片与代码是彼此独立的作品，同仓属于聚合而非演绎。
完整署名与条款见根目录 [`NOTICE.md`](../../NOTICE.md)。

**要以纯 MIT 分发或商用**：删掉 `assets/mascot.png` 即可，悬浮球回落到内置的原创 SVG（那只随 MIT 分发）。

> DSH 社区普遍采用同样的分层做法，例如 [dsh-whale-girl-live2d](https://github.com/Andersen216/dsh-whale-girl-live2d)（代码 MIT / 素材 CC BY-NC-SA 4.0 / 独立 NOTICE）、[dsh-deep-whale](https://github.com/Small-tailqwq/dsh-deep-whale)、[codex-deepseek-pet](https://github.com/YunYueSama/codex-deepseek-pet)。

---

## 五、实现要点

- **免构建**：浏览器半边是手写的 `window.__ModuleLoader__.load({ id, factory })` 闭包工厂——和仓库 tsdown 预设产物同一注册协议。`require` 只请求 `react`（平台基线模块），没有别的依赖。
- **服务用 `ctx.provide('ball', …)` 提供**，和 `ui-theme` 提供 `ctx.theme` 的方式一致（普通对象即可，不必继承 cordis 的 `Service`）。
- **拖动时只改本地、松手才落盘**：`settings.set()` 逐帧更新，`settings.commit()` 在 `pointerup` 写一次，指针节奏不会打到 settings 线路上。
- **暂存 + 主机文档**：读数同步取自本地副本，首屏不等异步；Host 快照到达后自动采用。`settingsScope` 不可用时（无 Host 的客户端）退回 `localStorage`，功能不降级。
- **面板内容在球的 shadow root 内**，所以每个面板自带 shadow root 是自己的事。

---

## 六、验证

```sh
node test/verify-ball.mjs        # 81 项：协议客户端、目录合并、通用表单、启用动作、形象包与状态、拖动、卸载
node test/verify-ball-host.mjs   # 67 项：清单扫描器、形象包索引与资源路由、自带素材、405/404/HEAD
node test/verify-together.mjs    # 15 项：与 dsh-client-ui-glass 的真实交叉集成
```

---

## 七、已知限制

- **面板不能跨注册存活**：切走即销毁。需要保留输入状态的插件请把草稿写进自己的 store 或设置里。
- **一次只有一个面板可见**。这是刻意的——球是"设置中心的入口"，不是窗口管理器。
- **球的层级固定为 `z-index: 900`**：高于应用内所有面板，低于产品的模态/Toast（1000/1100）。打开模态框时球会被盖住。
- **`image` 存在设置文档里**（YAML）。本地图片会先压到 256px WebP，通常几十 KB；如果换成超大 URL 不影响，但如果手填一个巨大的 data URI，会让每次设置写入都变重。
- 球的 Host 半边依赖 `@deepseek-ai/schemastery`（声明为 peerDependency）。若某个部署里 pnpm 报未满足的 peer，删掉 `package.json` 里那一行即可——解析本来就走安装镜像。
