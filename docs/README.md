# 文档

[dsh-plugin-manager](../README.md) 的文档。仓库主体是**插件管理器**（`dsh-client-ui-ball`），附赠若干适配它的插件（目前是 `dsh-client-ui-glass`）。

## 我想……

| 我想 | 看 |
|---|---|
| **装上它** | [install.md](install.md) |
| 让 **AI agent** 帮我装 | [install.md#给-ai-agent-的安装说明](install.md#给-ai-agent-的安装说明) |
| **做一个能被管理器识别的插件** | [making-a-plugin.md](making-a-plugin.md) |
| **往本仓库加一个附赠插件** | [adding-a-bundled-plugin.md](adding-a-bundled-plugin.md) |
| 知道它**内部怎么运作** | [architecture.md](architecture.md) |
| **出问题了** | [troubleshooting.md](troubleshooting.md) |
| 查 `dsh.ball` 的**规范条文** | [`PROTOCOL.md`](../packages/dsh-client-ui-ball/PROTOCOL.md) |

## 每个文件负责什么

| 文件 | 内容 | 权威性 |
|---|---|---|
| [`PROTOCOL.md`](../packages/dsh-client-ui-ball/PROTOCOL.md) | **规范**：清单字段、五种字段类型、目录线格式、管理动作、形象包、兼容规则 | 规范。与实现冲突时以它为准 |
| [install.md](install.md) | 安装、卸载、按包安装、agent 指令、验证 | 操作指南 |
| [making-a-plugin.md](making-a-plugin.md) | 第三方插件作者：从 `package.json` 到可用表单 | 教程 |
| [adding-a-bundled-plugin.md](adding-a-bundled-plugin.md) | 往本仓库加附赠插件要动哪些地方 | 贡献流程 |
| [architecture.md](architecture.md) | Host 扫描、目录路由、客户端合并、设置与形象的通道 | 实现说明 |
| [troubleshooting.md](troubleshooting.md) | 症状 → 原因 → 处理 | 排错手册 |

各包的细节在它们自己的 README 里：[ball](../packages/dsh-client-ui-ball/README.md) ·
[glass](../packages/dsh-client-ui-glass/README.md)。

## 约定

- **中文为主**，代码标识符、命令、线格式用英文原文。
- 文档描述**当前状态**，不写变更史——变更史在提交信息和 [`NOTICE.md`](../NOTICE.md) 里。
- 每个事实只有一个家；这里出现的东西不重复包 README 的细节，只链接。
