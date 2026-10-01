# 内部怎么运作

面向要改这个仓库的人。规范在 [`PROTOCOL.md`](../packages/dsh-client-ui-ball/PROTOCOL.md)，这里是实现。

## 三个通道

管理器和插件之间只有三条通道，都走 dsh 已有的机制，没有私有约定：

```
                    ┌─────────────────────────────────────┐
   package.json     │  dsh.ball 清单                       │  静态声明
   （插件的）        └──────────────┬──────────────────────┘
                                   │ Host 扫 Loader entry，读 manifest
                    ┌──────────────▼──────────────────────┐
   GET /ui-ball/    │  模块目录（id / title / entryId /    │  Host → 浏览器
     modules        │  enabled / active / settings）        │
                    └──────────────┬──────────────────────┘
                                   │ 浏览器合并 + 渲染
                    ┌──────────────▼──────────────────────┐
   ctx.ball         │  实时面板注册（可选的富 UI）           │  插件 → 管理器
                    └─────────────────────────────────────┘
```

**为什么扫描而不是等自报**：被停用的插件，客户端半边根本不会运行。扫 manifest 才能把「装了但关着」的插件列出来并给一个启用按钮——这是它被叫做管理器而不是面板宿主的原因。

## Host 半边

`lib/index.js` 是普通 ESM，注册三条路由：

| 路由 | 作用 |
|---|---|
| `GET /ui-ball/mascot` | 单张默认形象（`assets/mascot.*`） |
| `GET /ui-ball/packs` | 形象包索引 |
| `GET /ui-ball/pack/<id>/<state>` | 某个包某个状态的图 |
| `GET /ui-ball/modules` | **模块目录** |

`lib/modules.js` 做扫描：遍历 `ctx.loader.entries()`，按 **Loader 自己的解析方式**（`loader.internal.resolveSync`，退回 `createRequire(baseUrl).resolve`）定位每个包的 manifest，读它的 `dsh.ball`。

**只读 manifest，从不 import 被声明的模块。** 一个坏插件不会拖垮目录。

`lib/packs.js` 读 `assets/packs/<id>/pack.json`。**包 id 和状态名先对着索引校验过才碰磁盘**，所以请求路径永远无法指定文件。

## 浏览器半边

`lib/client.js` 是一个手写的 `window.__ModuleLoader__.load({ id, factory })` 闭包工厂，没有构建步骤。它做四件事：

### 1. 合并两个来源

```js
models() = directory.modules  ∪  entries（ctx.ball.register 的实时注册）
```

- 目录里的声明模块 → 一条记录
- 实时注册 → 按 `id` 合并进去；**也按包名兜底匹配**（注册 id 写成包名是常见笔误，不该变成两行）
- 两边都有的：**实时面板优先展示**
- 只有声明的：照样列出，带状态标记

状态取自 **Loader 自己的视角**（`enabled` / `active`），不是「有没有实时面板」——不写面板才是常态，生成式表单就是它的面板。

### 2. 渲染两种面板

| 情况 | 渲染 |
|---|---|
| 有实时 `render` | 调它，容器是面板的 `.body` |
| 实时 `render` 什么都没画 | **回落到声明生成的表单** |
| 只有 `settings` 声明 | 生成式表单 |
| 都没有 | 说明这个模块没提供任何东西 |

「实时面板画了没有」用 `childNodes.length` 判断，**不是 `childElementCount`**——只画文字的面板是合法的。

### 3. 生成式表单

`createForm(container, { fields, settings, localize })` 按字段类型建控件。

**事件分工是这里最关键的一点：**

```js
control.addEventListener('input',  () => show(...))    // 只刷新这个控件自己的数值显示
control.addEventListener('change', () => commit(...))  // 唯一写存储的时机
```

`input` 在拖动中持续触发。在它里面回读存储会把控件弹回原位——**用户就永远拖不动**。

命名空间通过 `bindModuleSettings` 绑定。它和 `createOwnBinding` 形状相同，所以一个渲染器服务两种来源：

| 来源 | 谁在用 | 数据在哪 |
|---|---|---|
| `bindModuleSettings` | 别的模块 | 插件的 settings 命名空间 |
| `ownBinding` | **球自己** | 球自己的 local bridge |

球自己走 bridge 而不是命名空间：命名空间在无设置服务的组合里根本不存在，走它会让球的面板写进空气。

### 4. 管理动作

```js
managerApi.setPluginEnabled(entryId, enabled)   // 启用 / 停用，entryId 来自目录
```

`entryId` 是 **Loader 树 id**（`include:ui-ball`），正是 dsh 自己的 plugin manager remote 收的键。

**球永远不给自己提供这个开关**——按钮在它要停用的那个面板里，按下去连回来的路都没了。

## 设置

```
Host   ctx.settings.register(ns, schema)  →  $DSH_HOME/settings.yaml
浏览器  ctx.settingsScope.bind({ ns })     →  getSnapshot() / set / unset / mutate
```

`snapshot.value` 是 **schema 解析后的完整对象**（每个字段都有值），`snapshot.user` 是 **Host 存的原始用户层**。

球的采纳规则：**「等于 schema 默认值」= 没人设过。**

```js
if (value !== DEFAULTS[key]) 采纳它          // 有人设过，不管是谁写的
else 本地值上推                              // 本地有值就让它持久
```

按 `snapshot.user` 的字段在不在来判断是不可靠的——Host 还没回显的写入会被丢掉，表现就是「在球自己的面板里改了，球没反应」。这条规则要求 **Host schema 的默认值与客户端默认值一致**（`DEFAULT_BALL_SIZE` 那个常量就是为此存在的）。

## 形象

| 通道 | 位置 | 谁放 |
|---|---|---|
| 单张默认 | `assets/mascot.*` | 用户丢文件进去即可，路由按固定文件名找 |
| 形象包 | `assets/packs/<id>/` | 仓库自带 5 个；用户也可以自己加 |

包的 `states` 声明它有哪些帧（`idle` / `working` / `waiting` / `done`），客户端**按声明的状态列表在本地解析**该请求哪一帧，未声明的回落到 `idle`——不去请求一张不可能存在的图。

### 帧从哪来

dsh **没有** `done` / `streaming` 这类枚举。帧从 `ctx.uiSession.sessionStatus` 推：

| 帧 | 条件 |
|---|---|
| `waiting` | 有会话 `pendingInteraction !== undefined` |
| `working` | 有会话 `running === true` |
| `done` | **本插件自己锁的 `running` 下降沿**，保持 6 秒 |
| `idle` | 其余 |

> 「完成」必须自己锁：库里的 `completionUnread` **故意排除主视图会话**（`isMain` 为真时不置位），所以用户正盯着的那个会话永远不会报告"刚完成"。

## 生命周期

一个客户端插件的 `apply()` 运行时，**别的插件往往还没激活**。所以：

```js
const x = ctx.get('x')                    // ✗ apply 时可能是 undefined，且永远是
ctx.inject(['x'], (c) => { const x = c.x })  // ✓ 等到就绪
```

注入回调**可能同步执行**，引用下面才定义的 `const` 会撞暂时性死区——需要的话把回调体延后一个微任务。

这条踩过三次（`settingsScope` ×2、`theme` ×1），每次的症状都是「重启后失效、停用再启用就好了」，因为重新启用会让 `apply()` 在组合稳定后重跑。
