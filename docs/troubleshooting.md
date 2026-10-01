# 排错

按**症状**查。每一条都是真实发生过的，不是假想。

---

## 改了设置没反应

**先看面板底部有没有一行灰字。** 表单在命名空间不健康时会自己说明原因（只读、服务未就绪、上次写入失败）。没有那行说明命名空间是健康的，问题在读的一侧。

| 原因 | 怎么确认 | 处理 |
|---|---|---|
| Host 半边没注册命名空间 | 面板底部显示写入失败 | 你的 Host 半边要用 `ctx.settings.register(ns, schema)` 注册**同名**命名空间 |
| schema 默认值与客户端默认值不一致 | — | 把两边改成一致。球用「等于默认值」判断「没人设过」，不一致会让默认值覆盖用户的选择 |
| 表单显示的是最小值而不是真实值 | 滑块都停在 `min` | 命名空间还没就绪，表单在显示合成默认值。检查 Host 半边是否已激活 |

---

## 重启 dsh 后失效，停用再启用就好了

**这是同一个 bug 的固定症状：客户端半边在 `apply()` 里用 `ctx.get` 拿了还没激活的服务。**

`ctx.get('theme')` 在 apply 时返回 `undefined`，并且**永远保持 undefined**——它不会在服务出现后变成可用。停用/启用会让 `apply()` 重跑一次，那时组合已经稳定，所以"好了"。

```js
// ✗ apply 时拿到 undefined 就永远是 undefined
const theme = ctx.get('theme')

// ✓ 等到服务就绪
let theme = null
ctx.inject(['theme'], (themeCtx) => {
  theme = themeCtx.theme
  repaint()
  return () => { theme = null }
})
```

本仓库在 `theme` 和 `settingsScope` 上各踩过一次。

> **注意**：注入回调**可能同步执行**。如果它引用了下面才定义的 `const`，会撞上暂时性死区。要么把注入放在定义之后，要么把回调体延后一个微任务。

---

## 菜单里同一个插件出现两行

**实时面板注册的 `id` 与清单声明的 `dsh.ball.id` 不一致。**

菜单把「目录里的声明模块」和「客户端自报的实时注册」合并。两者 id 不同就不会合并，于是同一个插件出现两次：一行来自目录（带「未加载」标记），一行来自注册。

```js
// 清单声明 "id": "ui-glass"，就要用同一个
ball.register({ id: 'ui-glass', ... })    // ✓
ball.register({ id: 'dsh-client-ui-glass', ... })  // ✗ 包名，不会合并
```

球会**按包名兜底匹配**一次，所以这个错误不会致命，但注册 id 应该与声明一致。

---

## 悬浮球不见了／只剩背景设置

**你从球自己的面板里点了「停用这个插件」。** 那个按钮停用的正是承载它的插件，按下去按钮、面板、球、以及回到这个按钮的所有路径一起消失。

现在球**不会**给自己提供这个开关。要停用它请去侧边栏 **Plugins** 页面。

如果已经停用了：Plugins 页面 → 找到 `dsh-client-ui-ball` 那一行 → 启用 → 重启 dsh。

---

## 背景／壁纸不显示

按顺序排除，**从上往下**，每一步都能独立确认：

1. **磨砂外观面板里「启用」勾了吗？** 没勾就什么都不显示。
2. **「不透明度」是多少？** 它是应用表面的透明程度。**0% 意味着表面完全不透明，会把壁纸彻底盖住**——和"不透明度 0%"的直觉相反。调到 60% 左右。
3. **壁纸选了吗？** 面板底部会显示当前壁纸的字符长度；为 0 就是空的。
4. **重启后失效、停用再启用才好？** → 见上面那条 `ctx.get` 的坑。

> **Windows 上无法真正"看见背后窗口"。** Electron 的窗口透明、亚克力/云母材质、整窗透明度都只能在 Electron **主进程**里设置，而 dsh 插件运行在 Host 子进程和渲染进程，没有任何扩展点能触达主进程窗口。
> 所以 Windows 上「完全透明」的实际含义是**清空所有面板底色、只显示你设置的背景画面**。macOS 例外：桌面版窗口本身已透明 + vibrancy，清空后能真的透出桌面。

---

## 悬浮球不见了，但设置里显示已安装

| 原因 | 怎么确认 | 处理 |
|---|---|---|
| 包在磁盘上但 patch 块里没有它的行 | 见下 | 重跑 `./scripts/install.ps1 -Force` |
| 该行被停用了 | Plugins 页面该行的状态 | 启用并重启 |
| 位置跑到屏幕外了 | — | 在 Plugins 页面配置卡片里点「复位位置」 |

**「包装了但没加载」的确认方法：**

```powershell
$prof = "$env:USERPROFILE\.dsh\profiles\desktop"
Get-ChildItem "$prof\node_modules" -Directory | Where-Object Name -like 'dsh-client-ui-*' | Select-Object Name
Select-String -Path "$prof\cordis.patch.yml" -Pattern '^\s*-\s*insert:|id: ui-'
```

包数和 `id:` 行数应该一致。不一致就是安装时块没写全。

---

## 拖动悬浮球会把图片文件拖出来

`<img>` 默认是可拖拽的，会劫持指针手势并把图片文件丢到页面上。球已经在四处拦了它（`.art` 的 `pointer-events: none`、`-webkit-user-drag: none`、`draggable = false`、`dragstart` 的 `preventDefault`）。

**如果你自己写了面板并遇到同样问题**，照抄球的做法：给所有 `<img>` 设 `draggable = false`。

---

## 拖动滑块时它弹回去

**`input` 事件里回读了存储值。** `input` 在拖动过程中持续触发，回读会把控件重置回存储值，于是滑块每动一像素就被弹回，松手时写回的也是旧值。

```js
// `input` 只刷新这个控件自己的数值显示
control.addEventListener('input', () => show(control))
// `change` 是唯一写存储的时机
control.addEventListener('change', () => scope.set(key, read(control)))
```

---

## 声明了但菜单里显示「声明有误」

你的 `dsh.ball` 没通过校验。面板里会写明原因。常见：

| 原因 | 规则 |
|---|---|
| `id` 不合法 | 必须是小写连字符标识符：`/^[a-z0-9][a-z0-9-]*$/` |
| 缺 `title` | 必填 |
| `range` 缺 `min`/`max`，或 `min >= max` | 必填且 `min < max` |
| `select` 的 `options` 为空或元素缺 `value`/`label` | 必填、非空 |
| 字段 `key` 重复 | 每个 `key` 唯一 |

**声明有误不会让插件消失**——它会带着原因留在菜单里，因为一个用户能在 profile 里看到的插件不该因为一个笔误就静默不见。

---

## 形象包不显示

| 原因 | 怎么确认 |
|---|---|
| 目录名不是小写连字符标识符 | `assets/packs/<id>/` 的 `<id>` 要匹配 `/^[a-z0-9][a-z0-9-]*$/` |
| 没有 `pack.json` | 每个包必须有 |
| 没有 `idle` 状态 | `states.idle` 必填（其余状态未声明时回落到它） |
| 图片扩展名不支持 | 只认 `.svg` `.webp` `.png` `.jpeg` `.jpg` `.gif` |
| `pack.json` 不是合法 JSON | — |

有问题的包**会显示在画廊里并写明原因**，不会静默消失。

---

## 还是不行

开 Issue 并附上：

1. `$DSH_HOME/profiles/<profile>/cordis.patch.yml` 里那段标记块。
2. Plugins 页面里相关行的**状态**（active / failed）。
3. 浏览器控制台的报错（如果拿得到）。
4. 具体症状，以及**什么操作能让它恢复正常**——这一条往往最能定位问题。
