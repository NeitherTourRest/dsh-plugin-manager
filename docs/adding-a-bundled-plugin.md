# 往本仓库加一个附赠插件

仓库主体是**插件管理器**。附赠插件是围绕它的、可单独安装的包。加一个要走完下面所有步骤——**漏掉任何一步都会表现成"插件坏了"**。

## 0. 先确认它该放这里

放在这里的插件应该：**声明 `dsh.ball`**（这样球能识别它），并且**不依赖管理器**（没有球时要么降级工作，要么安静地什么都不做）。

如果你的插件跟悬浮球毫无关系，它不属于这个仓库。

## 1. 建包

```
packages/dsh-client-ui-<name>/
  package.json
  cordis.patch.yml
  lib/index.js         Host 半边（普通 ESM）
  lib/client.js        浏览器半边（手写 __ModuleLoader__ 包装）
  README.md
  assets/              可选：素材
```

**免构建**：`lib/` 里就是实际执行的代码，没有打包步骤。浏览器半边用 `window.__ModuleLoader__.load({ id, factory })` 手写注册，`factory` 只允许 `require` 平台白名单里的模块（`react`、`react/jsx-runtime`、`@deepseek-ai/cordis`、`@deepseek-ai/dsh-client-*` 等）。

新包从 `dsh-client-ui-glass` 抄最快——它同时演示了声明式设置**和**自定义面板（含无球时的降级路径）。

## 2. `package.json` 四件套

```json
{
  "name": "dsh-client-ui-<name>",
  "type": "module",
  "main": "lib/index.js",
  "exports": {
    ".": "./lib/index.js",
    "./client": "./lib/client.js",
    "./package.json": "./package.json"
  },
  "files": ["lib", "cordis.patch.yml", "assets", "README.md"],
  "dsh": {
    "client": { "platform": "web" },
    "bundle": { "patch": "./cordis.patch.yml" },
    "ball": {
      "id": "<name>",
      "title": { "zh": "…", "en": "…" },
      "icon": "…",
      "order": 20,
      "settings": { "namespace": "<name>", "fields": [ … ] }
    }
  },
  "peerDependencies": { "@deepseek-ai/schemastery": "*" },
  "license": "MIT"
}
```

| 键 | 少了会怎样 |
|---|---|
| `exports["./client"]` | dsh 不认它是客户端插件 |
| `dsh.client.platform` | 同上 |
| `dsh.bundle.patch` | 桌面版 Plugins 页面装不上 |
| `dsh.ball` | 球不认识它——**这正是接入协议的那一步** |
| `peerDependencies` 里的 `schemastery` | Host 半边 `import` 它在 profile 里解析不到 |

`dsh.ball.id` 要和客户端半边 `ball.register` 用的 id **一致**，否则菜单里会出现两行。

## 3. 两个半边

| | 文件 | 跑在哪 | 用 `ctx.get` 还是 `ctx.inject` |
|---|---|---|---|
| Host | `lib/index.js` | dsh Host 子进程 | **`ctx.inject`**，`apply` 时服务往往还没起 |
| 浏览器 | `lib/client.js` | 渲染进程 | **`ctx.inject`**，同上 |

Host 半边至少要做一件事：`ctx.settings.register(<namespace>, schema)`，否则清单里的设置项写了不落盘。

**schema 的默认值必须和客户端默认值一致**——球用「等于默认值」判断「没人设过」。

## 4. 接进安装脚本

`scripts/install.ps1` 和 `scripts/uninstall.ps1` 各有一份 `$available` 表，两边都要加：

```powershell
$available = @(
  @{ Name = 'dsh-client-ui-ball'; Row = 'ui-ball' },
  @{ Name = 'dsh-client-ui-glass'; Row = 'ui-glass' },
  @{ Name = 'dsh-client-ui-<name>'; Row = '<name>' }   # ← 加这里
)
```

漏了会怎样：包能被复制，但 patch 块里没有它的行 → **装了却永远不加载**。

`install.ps1` 的 `$packages` 不用改，它从 `$available` 和 `-Only` 推出来。

## 5. `cordis.patch.yml`

```yaml
- insert:
    - id: <name>
      name: 'dsh-client-ui-<name>'
```

## 6. 测试

每个包一份 `test/verify-<name>.mjs`，纯 jsdom，不依赖 dsh 本体。**照抄 `test/verify-glass.mjs` 的结构**：

- 用一个假 `ctx`（`get` / `inject` / `effect` / `provide` / `slots` / `locale`）加载 bundle。
- **假 `ctx` 必须模拟 Cordis 的真实语义**，否则测试会骗你：
  - `inject` 只在**所有**服务就绪时才回调；
  - 别人声明的服务属性**未 inject 就抛错**（`remote.pluginManager` 这类）。
- 测行为，不测视觉。

然后在根 `package.json` 的 `test` 脚本里串上，并把它加进 [README](../README.md#开发与测试) 的覆盖表。

> **清理逻辑只删自己建的东西。** 曾经有一个 harness 图省事 `rmSync` 了整个 `assets/packs/`，而那里后来住进了仓库自带的形象包——每跑一次测试就删一次。fixture 用单独目录，目录本身仅在"本轮创建过且已空"时才删。

## 7. 文档

- `packages/dsh-client-ui-<name>/README.md`：这个包做什么、有哪些设置、已知限制。
- 根 `README.md` 的「仓库里有什么」表格加一行，**并标明能否单独安装**。
- 如果引入了新的素材授权，更新 [`NOTICE.md`](../NOTICE.md) 的许可分层。

## 8. 检查清单

- [ ] `package.json` 四件套齐全，`dsh.ball.id` 与客户端注册 id 一致
- [ ] Host 半边注册了同名 settings 命名空间，默认值与客户端一致
- [ ] 两个半边都用 `ctx.inject` 取服务
- [ ] 两个脚本的 `$available` 都加了
- [ ] `cordis.patch.yml` 有对应行
- [ ] `test/verify-<name>.mjs` 通过，且假 ctx 模拟了 Cordis 语义
- [ ] 根 `package.json` 的 `test` 串上了，README 覆盖表更新了
- [ ] 包 README 写了，根 README 表格加了一行
- [ ] `./scripts/install.ps1 -Only dsh-client-ui-<name>` **单独装能跑**（这是本仓库的核心承诺）
- [ ] `./scripts/uninstall.ps1 -Only <name>` 之后其余插件仍正常

最后两项是重点。**每个包都必须能单独安装、单独卸载**——管理器不依赖任何插件，插件也不依赖管理器。
