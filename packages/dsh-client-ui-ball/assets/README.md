# assets — 悬浮球形象

这个目录决定悬浮球的**默认形象**。本仓库自带一张 `mascot.png`（社区「鲸鱼娘」），你没有放别的图时就用它。

```
assets/
├─ mascot.png     ← 本仓库自带的默认形象（CC BY-NC-SA 4.0，见根目录 NOTICE.md）
└─ mascot.*       ← 你放的同名文件会覆盖它
```

支持的名字，按优先级从高到低：

| 文件 | 内容类型 |
|---|---|
| `mascot.svg` | `image/svg+xml` |
| `mascot.webp` | `image/webp` |
| `mascot.png` | `image/png` |
| `mascot.jpeg` / `mascot.jpg` | `image/jpeg` |
| `mascot.gif` | `image/gif` |

只认这几个固定名字，目录也固定在包内——路由不会读取任何调用方提供的路径。

## 形象包（多帧状态）

除了单张 `mascot.*`，还可以放**形象包**：每个包一个目录，按状态各一张图。

```
assets/packs/whale-girl/
  pack.json    { "title": { "zh": "鲸鱼娘", "en": "Whale girl" },
                 "author": "上善无形 / ZipZipPipe / QYQCAMIAO",
                 "license": "CC BY-NC-SA 4.0",
                 "states": { "idle": "idle.png", "working": "working.png" } }
  idle.png
  working.png
```

- 状态：`idle`（必填）/ `working` / `waiting` / `done`；未声明的状态回落到 `idle`。
- 图片只接受 `.svg` `.webp` `.png` `.jpeg` `.jpg` `.gif`。
- 装好后会出现在悬浮球配置卡片的**画廊**里，点一下即切换。

悬浮球按**会话状态**切帧：有会话在跑 → `working`；在等你审批/回答 → `waiting`；刚跑完 → `done`（保持 6 秒）；其余 → `idle`。

`.gitignore` 忽略 `assets/packs/` 下的一切，所以你放的包同样**不会进入仓库历史**。

## 换成你自己的图

把图片放进**已安装副本**的这个目录，命名 `mascot.png`（或上表里的其它名字），**刷新页面**即可：

```
<profile>/node_modules/dsh-client-ui-ball/assets/mascot.png
```

- 想改仓库源的默认形象：放进 `packages/dsh-client-ui-ball/assets/`，再跑 `scripts/install.ps1 -Force`。
- **这个目录默认被 `.gitignore` 忽略**，只放行本仓库自带的 `mascot.png` 和这份 README——
  所以你放的图**不会进入仓库历史**，不必担心把别人的素材混进你的提交。
- 想确认是否生效：打开悬浮球的「悬浮球外观」面板，形象预览会显示当前使用的图。

## 删掉自带形象 = 回到纯 MIT

`mascot.png` 是 CC BY-NC-SA 4.0（署名 / 禁止商用 / 相同方式共享），而代码是 MIT。
如果你要以**纯 MIT** 分发，或者要商用，删掉它即可：

```sh
rm packages/dsh-client-ui-ball/assets/mascot.png
```

悬浮球会回落到**内置的原创 SVG**（那只鲸鱼兜帽造型是本项目自己画的，随 MIT 分发）。
完整的分层说明与署名见根目录 [`NOTICE.md`](../../../NOTICE.md)。

## 也可以完全不用文件系统

设置面板里的**「选择图片」**会把图片压缩后存进 `$DSH_HOME/settings.yaml`，
不需要碰任何目录，也不需要重装。这个目录适合"想让默认形象就是它"的场景。

