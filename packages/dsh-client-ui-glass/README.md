# dsh-client-ui-glass — 透明磨砂玻璃外观

给 dsh 桌面版 / Web 版换上一套**透明磨砂玻璃**外观。面板不透明度、磨砂强度、背景饱和度、背景压暗、背景画面全部实时可调。

设置面板**由共享悬浮球 [`dsh-client-ui-ball`](../dsh-client-ui-ball/README.md) 托管**（没装球时会自动降级成自己的悬浮按钮），并且接入了 **dsh 官方统一设置**：Host 端 settings 命名空间 + Plugins 页面的 Configure 卡片。

```
不透明度 ──────●──────  55%
磨砂程度 ────●────────  18px
背景饱和 ──●──────────  120%
背景压暗 ─────●───────  25%
填充方式 [铺满裁切 ▾]
背景图   [https://… 或 data:image/…]
[选择本地图片] [清除背景]
[不透明] [磨砂] [完全透明] [重置]
```

---

## 一、能做到什么，做不到什么

必须先说清楚，因为它决定了"完全透明"到底是什么效果。

| 能力 | 状态 |
|---|---|
| 磨砂玻璃质感（`backdrop-filter` 模糊背后画面） | ✅ |
| 面板不透明度可调（0–100%，含"完全透明"） | ✅ |
| 背景画面：URL / data URI / **本地图片文件** | ✅ |
| 填充方式、背景饱和度、背景压暗 | ✅ |
| 实时调节 + 官方统一设置（settings.yaml + Plugins 页卡片） | ✅ |
| 设置面板由共享悬浮球托管，与其它插件同处一个入口 | ✅ |
| macOS 上真正"看见背后桌面" | ✅ 系统窗口本身已是透明 + vibrancy，页面底色清空后即可透出 |
| Windows 上真正"看见背后窗口" | ❌ **插件做不到**，原因见下 |

**为什么 Windows 做不到。** Electron 的窗口透明（`transparent`）、亚克力/云母材质（`backgroundMaterial`）、整窗透明度（`setOpacity`）只能在 **Electron 主进程** `apps/desktop/src/main.ts` 里设置。dsh 插件运行在 Host 子进程和渲染进程里，仓库里**不存在**任何让插件触达主进程窗口的扩展点：

- `packages/**` 里没有任何 `import … from 'electron'`；
- Host 是 `ELECTRON_RUN_AS_NODE=1` 启动的独立子进程，拿不到 `BrowserWindow`；
- Host 子进程乱发 IPC 会被 `isDesktopHostEvent` 判定为非法并**直接 SIGTERM 杀掉**；
- 渲染进程只有一个只读的 `window.dshDesktop`（更新状态），没有窗口控制通道。

所以 Windows 上"完全透明"的实际含义是：**清空所有面板底色，只显示你设置的背景画面**——这正是磨砂玻璃最常用的做法。真正穿透需要另给 `apps/desktop` 打补丁，本插件不含，也不会去碰。

> 插件在 `不透明度 = 0` 且未设背景图、且平台不是 macOS 时，面板里会明确提示这一点。

---

## 二、安装

1. **先装悬浮球**（可选但推荐）：见[悬浮球说明](../dsh-client-ui-ball/README.md)。
2. 把 `dsh-client-ui-glass` 目录放到长期位置。
3. 桌面版侧边栏 → **Plugins** → 添加插件 → 填绝对路径。

两者**谁先装都行**：本包用 `ctx.inject(['ball'], …)` 等待服务，球后到也会自动接管面板，自己的降级按钮会被撤掉。

手动安装见悬浮球 README 的「方式 B」——两个包的解析规则完全一样（`profiles/desktop/node_modules` 放包，`profiles/node_modules` 镜像供依赖）。

Web 版 profile：`dsh plugin --profile web add <路径>`。

---

## 三、参数

| 参数 | 范围 | 说明 |
|---|---|---|
| 启用 | 开/关 | 关掉后注入的样式、背景层、主题层一并撤下，界面回到原样 |
| 不透明度 | 0–100% | 应用面板底色的 alpha，0% 即"完全透明" |
| 磨砂程度 | 0–40px | 加在 `#root` 上的 `backdrop-filter: blur()`，模糊整个界面背后的画面 |
| 背景饱和 | 100–200% | `backdrop-filter: saturate()` |
| 背景压暗 | 0–80% | 背景图之上的黑色蒙版，保证文字可读 |
| 填充方式 | 铺满裁切 / 完整适应 / 平铺 | `background-size: cover / contain / auto` |
| 背景图 URL | http(s)、`data:` | 直接填 |
| 选择本地图片 | — | 缩到最长边 1920px、JPEG q0.82 后转 data URI |

「不透明 / 磨砂 / 完全透明」是预设：`opacity=100` / `opacity=55` / `opacity=0 且 dim=0`。

---

## 四、统一设置（两处，同一份值）

值存在 settings 命名空间 `ui-glass`，持久化到 `$DSH_HOME/settings.yaml`。

1. **悬浮球面板**：点球 → 「磨砂外观」（实时拖动）
2. **Plugins 页面 → `ui-glass` 行 → Configure**：官方配置卡片入口

Host 半边用 `ctx.settings.register('ui-glass', schema)` 注册命名空间，浏览器半边用 `ctx.settingsScope.bind({ namespace: 'ui-glass' })` 读写，卡片通过 `ctx.slots.register` 注册进 `plugins.row.config`（key = `dsh-client-ui-glass#ui-glass`），文案走 `ctx.locale.register` 的 zh/en 字典。

滑块拖动时**只改本地**（逐帧重绘），松手才写一次——指针节奏不会打到 settings 线路上。

---

## 五、实现要点

全部代码在 `lib/client.js` 一个文件里。

**1）半透明不是靠选择器，而是靠主题令牌。**
业务组件用 CSS Modules 哈希类名（`.frame` 实际叫 `abc123_frame`），外部样式表选不中。真正稳定的接缝是它们消费的 `--dsw-alias-*` 主题别名，而 `ctx.theme.overrideTokens(source, tokens)` 会把每个覆盖令牌以行内自定义属性写到 `<body>` 上：

```js
'--dsw-alias-bg-base': {
  light: 'color-mix(in srgb, var(--dsw-static-neutral-bluish-00) 55%, transparent)',
  dark:  'color-mix(in srgb, var(--dsw-static-neutral-bluish-950) 55%, transparent)',
}
```

引用的是**从不被覆盖的静态调色板**变量，所以既保留产品真实的明暗配色，也能跟随主题切换自动适配。覆盖 5 个令牌：`--dsw-alias-bg-base`、`-layer-1`、`-layer-2`、`-bg-overlay`、`--dsw-specific-sidebar-fill`；其中 layer/overlay 的 alpha 比 base 高 30–45 个百分点，保证菜单、气泡、嵌套卡片在花哨壁纸上依然清晰。

**2）背景画面是一层固定的 `.dshw-backdrop`，位于 `#root` 之下。**
`#root` 是 shell 自己的挂载点，所以不需要对 frame 的内部结构做任何假设。

**3）磨砂只有一处：`#root` 上的 `backdrop-filter`。**
`#root` 与背景层都铺满视口，背后画面恰好只被模糊一次——设了背景图就是那张图，没设就是窗口背后的东西（macOS 的窗口 vibrancy）。

**4）面板自带 Shadow DOM。**
面板可能被挂在球的 shadow root 里，而文档级样式表**穿不进** shadow 边界，所以面板把样式和 DOM 一起装在自己的 shadow root 中——挂在哪里都长得一样。

**5）层级。**
`#root` 是 `z-index: 1`；悬浮球控件是 `900`：高于应用内所有面板（dockkit 70 / 侧边栏 30 / frame 20），低于产品挂在 `document.body` 上的 portal（tooltip 100 / modal 1000 / toast 1100）。

---

## 六、验证

```sh
node test/verify-glass.mjs       # 59 项：两种宿主形态、主题层、面板、卡片、卸载
node test/verify-together.mjs    # 15 项：与悬浮球的真实交叉集成
```

`verify-glass.mjs` 会加载两次：一次带球、一次不带球，确保降级路径同样可用。
`verify-together.mjs` 把两个包的浏览器半边加载进同一个文档，用**真实的 `ctx.ball` 服务**驱动玻璃面板，验证跨插件契约本身。

**它验证的是行为与协议，不是视觉效果。** 磨砂强度合不合意、半透明层次好不好看，得在真机上对着自己的壁纸调。

---

## 七、上机自查

1. 右下角出现悬浮球（或本插件自己的圆按钮，若未装球）。默认是内置形象；放了 `assets/mascot.*` 就用你的图。
2. 点球 → 直接进入「磨砂外观」；装了多个插件面板时显示列表。
3. 拖「不透明度」——侧边栏、会话区、标题栏底色一起变透明/变实。
4. 拖「磨砂程度」——背后画面整体变糊/变清晰。
5. 点「选择本地图片」——立即成为背景，面板出现玻璃质感。
6. 点「完全透明」——面板底色清空，只剩背景图；Windows 上出现预期提示。
7. Plugins 页面 → `ui-glass` 行 → Configure——改动与球面板实时同步。
8. 重启桌面版——参数仍在（存在 `settings.yaml`）。
9. 在 Plugins 页面关掉插件——界面恢复原样，注入的 `<style>`、背景层、主题层全部撤除。

---

## 八、已知限制

- **Windows 无法真正穿透窗口**，原因见第一节。
- **半透明作用于主题令牌这一层**。若你把背景色写死在组件内部样式里（而非走 `--dsw-alias-bg-*`），那些地方不会变透明。
- **背景图存在设置文档里**（`ui-glass.wallpaper`）。本地图片压到 1920px / JPEG q0.82，通常几百 KB——这是"桌面版与 Web 版共享同一个值"的代价：每次设置写入都会重写这段 YAML。想要更轻，请用 URL。
- 设置按 **Host 文档**共享，不再按 origin 隔离；无 Host 的客户端（`settingsScope` 不可用）自动退回 `localStorage`，功能不降级。
- 球面板里同一时刻只有一个插件的面板可见，切走即销毁；这是球的设计，不是本插件的限制。
