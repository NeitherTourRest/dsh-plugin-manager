# NOTICE — 许可分层与署名 / License layering and attribution

本仓库**不是单一许可**。代码是 MIT，悬浮球默认形象那张图另有条款。

`LICENSE`（MIT）**只覆盖代码**；美术素材按下方单独条款分发。这份 NOTICE 独立于 `LICENSE`，是为了让 GitHub 仍能正确识别出 MIT。

`LICENSE` (MIT) **covers the code only**. Artwork ships under its own terms below. This NOTICE is kept separate
from `LICENSE` so GitHub still detects the MIT license.

---

## 1. 代码 / Code

- **范围**：`packages/**/lib/**`、`packages/**/cordis.patch.yml`、`scripts/**`、`test/**`、各 `README.md`
- **许可**：**MIT**（全文见 [`LICENSE`](LICENSE)）

## 2. 美术素材 / Artwork

- **范围**：`packages/dsh-client-ui-ball/assets/mascot.png`（以及该目录下你自行放入的任何图片，见第 4 节）
- **许可**：**[CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/deed.zh)**
  —— 署名（BY）· **非商业性使用（NC）** · 相同方式共享（SA）
- **角色与署名**：
  - 角色形象来源：**上善无形**（原创 OC「溟月」）
  - DeepSeek 元素二创：**ZipZipPipe**（GPT Image 2）
  - 改进版修复：**QYQCAMIAO**
- **文件来源**：[`fornarwhal/deepseek-whale-girl-icon`](https://github.com/fornarwhal/deepseek-whale-girl-icon)
  的 `improved-1.png`（984×984 RGBA），2026-09-29 取用。
- **本仓库所做的修改**：等比缩放到 256×256，未裁剪、未调色、未改动画面内容。
  CC BY-NC-SA 4.0 要求标注修改，此即该标注。
- 该来源仓库自身声明：「本仓库图片来自网络流传，具体作者未确认；如原作者认为不妥，请联系删除。」
  本仓库沿用同一立场：**若你是权利人并认为此处使用不妥，请开 Issue，我们会立即移除。**

## 3. 分层意味着什么 / What layering means

- **代码**你可以自由地按 MIT 使用，包括商用。
- **那一张图**不可以商用，且它的演绎作品必须继续以 CC BY-NC-SA 4.0 分发。
- CC 的 ShareAlike **不会传染到代码**：图片与代码是彼此独立的作品，放在同一个仓库里属于聚合而非演绎。
  所以「代码 MIT + 素材 CC BY-NC-SA」是合法且常见的组合。
- **要以纯 MIT 分发**：删掉 `packages/dsh-client-ui-ball/assets/mascot.png` 即可。
  悬浮球会回落到内置的原创 SVG（那只鲸鱼造型是本项目自己画的，随 MIT 分发）。
- **要商用**：同上，先移除该图片。

## 4. 你放进 `assets/` 的图 / Artwork you drop in

悬浮球会读取 `packages/dsh-client-ui-ball/assets/mascot.*` 作为默认形象。
你自己放进去的图片**由你自行决定许可与署名**，本仓库不对其主张任何权利，也（默认）不把它们纳入版本控制——
`.gitignore` 只放行本仓库自带的那一张：

```
packages/*/assets/*
!packages/*/assets/README.md
!packages/*/assets/mascot.png
```

---

## 5. 相关链接 / See also

- 悬浮球 README：[`packages/dsh-client-ui-ball/README.md`](packages/dsh-client-ui-ball/README.md)
- 素材目录说明：[`packages/dsh-client-ui-ball/assets/README.md`](packages/dsh-client-ui-ball/assets/README.md)
- 同样采用分层许可的社区项目： [`dsh-whale-girl-live2d`](https://github.com/Andersen216/dsh-whale-girl-live2d)
