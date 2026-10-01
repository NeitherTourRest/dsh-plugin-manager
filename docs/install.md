# 安装

## 前置

- **dsh** 已至少启动过一次，`$DSH_HOME` 下已有你要装的 profile。
- **PowerShell**（Windows 自带 5.1 即可；脚本用 7 的语法写的，5.1 上未验证）。
- 不需要 pnpm、不需要构建。

## 装什么

| 想装 | 命令 |
|---|---|
| 全都装（管理器 + 附赠插件） | `./scripts/install.ps1` |
| **只要管理器** | `./scripts/install.ps1 -Only dsh-client-ui-ball` |
| 只要某一个附赠插件 | `./scripts/install.ps1 -Only dsh-client-ui-glass` |

`-Only` 认**目录名**也认**行 id**（`ui-ball` / `ui-glass`）。可以多次执行增量装，脚本不会弄丢已装的包。

```powershell
# 装进 Web 版 profile（默认是 desktop）
./scripts/install.ps1 -Profile web

# 指定 Harness home（默认读 $env:DSH_HOME，再退回 ~/.dsh）
./scripts/install.ps1 -DshHome 'D:\dsh-home'

# 覆盖已装副本
./scripts/install.ps1 -Force
```

## 脚本做了什么

两件事，都是应用内 Plugins 页面会做的：

1. 把包复制进 `<profile>/node_modules/`。
2. 按**磁盘上实际装了哪些包**重建 `<profile>/cordis.patch.yml` 里那段带标记的 `insert` 块。

块长这样，`# >>>` / `# <<<` 标记让它可重复执行、可精确移除：

```yaml
# >>> dsh-plugin-manager >>>
- insert:
    - id: ui-ball
      name: 'dsh-client-ui-ball'
    - id: ui-glass
      name: 'dsh-client-ui-glass'
# <<< dsh-plugin-manager <<<
```

<details>
<summary>为什么不用包管理器也能装上</summary>

dsh 的模块解析是**双锚点**设计：

| 路径 | 角色 |
|---|---|
| `<profile>/node_modules` | pnpm 管理区，第三方插件的正式位置 |
| `$DSH_HOME/profiles/node_modules` | dsh 自身依赖闭包的镜像（含 `@deepseek-ai/cordis`、`@deepseek-ai/schemastery`） |

包放进第一个锚点后，它 `import '@deepseek-ai/schemastery'` 向上走一层就命中镜像，所以无需安装步骤。

桌面版 profile 由 Electron 独占，CLI 会拒绝 `dsh plugin --profile desktop`；脚本写的就是 Plugins 页面会写的那两样东西。
</details>

## 生效

| 改了什么 | 怎么生效 |
|---|---|
| `cordis.patch.yml` 的插件行（装 / 卸 / 启用 / 停用） | **重启 dsh** |
| 插件的 `lib/client.js`（浏览器半边） | **刷新页面** |
| 插件的 `lib/index.js`（Host 半边） | **重启 dsh** |

## 卸载

```powershell
./scripts/uninstall.ps1                  # 全卸
./scripts/uninstall.ps1 -Only ui-glass   # 只卸玻璃，球留着
```

只卸一个包时会**按剩下的包重写块**，其余的继续正常加载。

> 卸载**不动**你在 localStorage 里的设置。要恢复出厂：装好后在面板里点「恢复默认」，或清掉浏览器存储里 `dsh-client-ui-*` 开头的键。

## 给 AI agent 的安装说明

把下面整段丢给你的编码 agent（Claude Code / Codex / Cursor / dsh 本身都行）：

````text
把这个仓库的 dsh 插件装进本机的 dsh：https://github.com/NeitherTourRest/dsh-plugin-manager

要求：
1. 先读 README.md 的「快速开始」和 packages/dsh-client-ui-ball/PROTOCOL.md。
2. 确认 $DSH_HOME（未设置则默认 ~/.dsh），并列出 $DSH_HOME/profiles/ 下已有的 profile。
   桌面版 profile 名是 desktop。
3. 用仓库自带的脚本安装，不要手写 cordis.patch.yml：
     pwsh -File scripts/install.ps1 -Profile <profile> [-Only <包名或行id>]
   只装 dsh-client-ui-ball 即为「只要插件管理器」。
4. 脚本必须能重复执行且不产生重复的 insert 块。装完请检查
   <profile>/cordis.patch.yml 里 `- insert:` 只出现一次，且每个已装包各有一行。
5. 告诉我：装进了哪个 profile、装了哪些包、需要重启 dsh 还是刷新页面即可。

不要修改仓库里的任何文件；不要动 profile 里 cordis.patch.yml 标记块以外的内容。
````

## 也可以用桌面版 Plugins 页面

每个包都声明了 `dsh.bundle.patch`，所以在侧边栏 **Plugins → 添加插件** 里填仓库内对应包的绝对路径同样能装，依赖会被正确登记。装好后该行出现 **Configure** 按钮。

包之间没有依赖，只装其中一个完全可以。

## 验证装好了

```powershell
# 包在磁盘上
Get-ChildItem "$env:USERPROFILE\.dsh\profiles\desktop\node_modules" -Directory |
  Where-Object Name -like 'dsh-client-ui-*' | Select-Object Name

# 块只有一份，行数与包数一致
Select-String -Path "$env:USERPROFILE\.dsh\profiles\desktop\cordis.patch.yml" -Pattern '^\s*-\s*insert:'
```

装好后重启 dsh，界面上应出现一颗悬浮鲸鱼娘；点它能看到已装模块的列表。

出问题看 [troubleshooting.md](troubleshooting.md)。
