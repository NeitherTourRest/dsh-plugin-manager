# dsh-ui-plugins

给 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 桌面版 / Web 版做的两个界面插件。

> A shared floating-ball panel host and a frosted-glass skin for the dsh GUI. Both are hand-written, build-free Cordis client plugins.

```
        ╭──────────────────────────╮
        │  设置                 ×  │
        ├──────────────────────────┤
        │  ◐  磨砂外观              │  ← dsh-client-ui-glass
        │  🐳 悬浮球外观            │  ← dsh-client-ui-ball
        │  ⚙  你的插件…             │  ← ctx.ball.register(...)
        ╰──────────────────────────╯
                    ▲
                  (◕‿◕)
```

| 包 | 作用 |
|---|---|
| [`dsh-client-ui-ball`](packages/dsh-client-ui-ball/README.md) | **共享悬浮球**：可拖动、可换形象的面板宿主。提供 `ctx.ball` 服务，任何插件都能向它注册设置面板——一个球收拢所有插件的设置入口 |
| [`dsh-client-ui-glass`](packages/dsh-client-ui-glass/README.md) | **透明磨砂玻璃外观**：不透明度 / 磨砂强度 / 背景画面 / 完全透明，面板由悬浮球托管 |

两者都是**免构建**的纯 JavaScript：Host 半边是普通 ESM，浏览器半边是手写的 `window.__ModuleLoader__.load({ id, factory })` 闭包工厂——也就是 dsh 官方 tsdown 客户端预设产物遵守的同一注册协议。仓库的 `packages/client/tsdown.client.ts` 预设没有对外发布，第三方包只能自带打包器或手写这个包装，这里选择手写，因此**克隆下来就能用，不需要任何构建**。

---

## 快速开始

### 1. 安装到 profile

```powershell
# 装进桌面版（默认）
./scripts/install.ps1

# 或装进 Web 版 profile
./scripts/install.ps1 -Profile web

# 指定 Harness home（默认读 $env:DSH_HOME，再退回 ~/.dsh）
./scripts/install.ps1 -DshHome 'D:\dsh-home'
```

脚本做两件事：把两个包复制进 `<profile>/node_modules/`，并往 `<profile>/cordis.patch.yml` 追加一段带标记的 bundle 块。带标记所以**可重复执行**，`./scripts/uninstall.ps1` 能精确移除它加的东西。

<details>
<summary>为什么不用包管理器也能装上</summary>

dsh 的模块解析是**双锚点**设计：

| 路径 | 角色 |
|---|---|
| `<profile>/node_modules` | pnpm 管理区，第三方插件的正式位置 |
| `$DSH_HOME/profiles/node_modules` | 安装依赖镜像（指向 dsh 自身依赖闭包，含 `@deepseek-ai/cordis`、`@deepseek-ai/schemastery`） |

包放进第一个锚点后，它 `import '@deepseek-ai/schemastery'` 会向上走一层命中镜像，所以无需安装步骤。

桌面版 profile 由 Electron 独占，CLI 会拒绝 `dsh plugin --profile desktop`；这个脚本写的就是应用内 Plugins 页面会写的那两样东西。
</details>

### 2. 生效

dsh 会热重载 profile 的 `cordis.patch.yml`，通常**不用重启**。若没反应，重启 dsh。

### 3. 卸载

```powershell
./scripts/uninstall.ps1
```

### 也可以用桌面版 Plugins 页面

两个包都声明了 `dsh.bundle.patch`，所以在侧边栏 **Plugins → 添加插件** 里填仓库内对应包的绝对路径同样可以安装，依赖会被正确登记。插件装好后，该行会出现 **Configure** 按钮——这就是官方的插件配置入口。

---

## 给插件作者：`ctx.ball` API

这是本仓库的主要价值。任何 dsh 客户端插件都可以往悬浮球里加一个面板：

```js
export function apply(ctx) {
  const ball = ctx.get('ball')          // 可选依赖
  if (ball === undefined) return

  ctx.effect(() => ball.register({
    id: 'my-plugin',                    // 唯一 id
    label: () => t('panel'),            // 字符串，或返回字符串的函数
    icon: '⚙',
    order: 20,
    render(container, api) {
      container.append(myPanel())       // container 是球面板里的一个 div
      return () => { /* 离开面板时清理 */ }
    },
  }), 'my-plugin: ball panel')
}
```

完整契约见 [`dsh-client-ui-ball` 的 README](packages/dsh-client-ui-ball/README.md#二给插件作者ctxball-api)。

**要点：**

- 只有一个面板时点球**直接进面板**，多个才显示列表。
- 面板**切走即销毁**（调用你返回的清理函数），切回来重新 `render`。
- 球的面板内容在球的 shadow root 里，**文档级样式表穿不进去**——面板请自带 shadow root（`dsh-client-ui-glass` 就是这么做的，可以直接抄）。
- 用 `ctx.inject(['ball'], …)` 而不是 `ctx.get` 可以等待服务，装包顺序就无所谓。

---

## 统一设置

两个包都接入 dsh 官方设置体系，而不是自建存储：

| 层 | 用的东西 |
|---|---|
| Host 半边 | `ctx.settings.register(ns, schema)` → 持久化到 `$DSH_HOME/settings.yaml` |
| 浏览器半边 | `ctx.settingsScope.bind({ namespace })`，服务不可用时退回 `localStorage` |
| Plugins 页面 | `ctx.slots.register` 进 `plugins.row.config`，key = `<包名>#<行id>` |
| 文案 | `ctx.locale.register(ns, { zh, en })`，卡片通过 `t` 取词 |

滑块与拖动都是**只改本地、松手落盘一次**，指针节奏不会打到 settings 线路上。

---

## 开发与测试

没有构建步骤——`lib/` 里就是实际执行的代码。改完直接重新安装即可（或从 profile 里的副本改）。

```sh
npm install     # 只为测试装 jsdom
npm test        # 三个 jsdom 验证脚本
```

| 脚本 | 覆盖 |
|---|---|
| `test/verify-ball.mjs` | 51 项：注册协议、`ctx.ball` 服务契约、形象渲染与本地素材探测、拖动、面板托管、配置卡片、卸载 |
| `test/verify-ball-host.mjs` | 21 项：**Host 半边的本地素材路由**——文件优先级、content-type、405 方法守卫、空目录 404、HEAD 不带 body |
| `test/verify-glass.mjs` | 59 项：**带球 / 不带球两种宿主形态**、主题令牌层、背景层、面板交互、配置卡片、卸载 |
| `test/verify-together.mjs` | 15 项：把两个包加载进同一个文档，用**真实的 `ctx.ball` 服务**驱动玻璃面板——验证跨插件契约本身 |

共 146 项。它们验证**行为与协议**，不验证视觉观感。磨砂强度合不合意得在真机上对着自己的壁纸调。

---

## 兼容性

- 需要 dsh 的客户端插件契约：`dsh.client.platform`、`exports["./client"]`、`window.__ModuleLoader__` 注册协议。
- 半透明依赖 `color-mix()` 与 `backdrop-filter`（Chromium 111+；桌面版 Electron 44 满足）。
- 分别在 **dsh 桌面版（打包版，Windows）** 上实测安装并热加载成功：两个 Host 行 active、两个客户端半边 active、两张 `plugins.row.config` 卡片注册成功。

---

## 已知限制

**Windows 上无法真正"看见背后窗口"。** Electron 的窗口透明（`transparent`）、亚克力/云母材质（`backgroundMaterial`）、整窗透明度（`setOpacity`）只能在 **Electron 主进程**里设置。dsh 插件运行在 Host 子进程和渲染进程，仓库里不存在任何让插件触达主进程窗口的扩展点：`packages/**` 没有 `import … from 'electron'`；Host 是 `ELECTRON_RUN_AS_NODE=1` 的独立子进程；Host 乱发 IPC 会被判定非法并直接 SIGTERM；渲染进程只有一个只读的 `window.dshDesktop`。

所以 Windows 上「完全透明」的实际含义是**清空所有面板底色、只显示你设置的背景画面**——这正是磨砂玻璃的常规做法。macOS 例外：桌面版窗口本身已是 `backgroundColor: '#00000000'` + vibrancy，清空后能真的透出桌面。

**这些是外部包，不是 dsh 官方包。** 协议层完全合规（用的全是文档化契约），但不遵守 dsh 仓库对一等包的部分规范：包名不是 `@deepseek-ai/dsh-client-*`、UI 走 Shadow DOM 而非 slot、样式不走 CSS Modules。要合入官方仓库需要按那套规范重做。

其它限制见各包 README 的「已知限制」一节。

---

## 许可

代码 [MIT](LICENSE)。

两个插件与 DeepSeek 官方无隶属关系。

**关于「鲸鱼娘」：** 社区的鲸鱼娘形象是一个有明确许可链的二创角色（原型为画师上山无星的「明月」，素材 **CC BY-NC-SA 4.0**：署名 / 禁止商用 / 相同方式共享），与本仓库的 MIT **直接冲突**。因此本仓库**不分发**该素材，也不照着它重绘。

要使用它，把它放进悬浮球的本地素材目录即可——那个目录在 `.gitignore` 里，**素材永远不进仓库历史**：

```
<profile>/node_modules/dsh-client-ui-ball/assets/mascot.png
```

细节与许可链说明见 [`dsh-client-ui-ball/README.md`](packages/dsh-client-ui-ball/README.md#四形象内置图本地素材以及鲸鱼娘) 与 [`assets/README.md`](packages/dsh-client-ui-ball/assets/README.md)。

悬浮球内置的 Q 版鲸鱼造型 SVG 是**为本项目原创绘制**的，不是 DeepSeek 官方素材，也不是上述角色。
