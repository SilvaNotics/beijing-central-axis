# 项目本地技能

本项目统一使用 `.agents/` 保存可审查的技能副本。技能位于 Codex 可自动发现的 `.agents/skills/`；许可证和共享参考文件也保存在本目录，无需修改全局技能。

| 技能 | 文件 | 用途 |
| --- | --- | --- |
| Frontend UI Engineering | `skills/frontend-ui-engineering/SKILL.md` | 界面结构、可访问性与响应式布局 |
| Browser Testing with DevTools | `skills/browser-testing-with-devtools/SKILL.md` | 真实浏览器检查与证据记录 |
| Git Workflow and Versioning | `skills/git-workflow-and-versioning/SKILL.md` | 小步修改与可审查版本记录 |

副本来自本机已安装的 `agent-skills` **0.6.10**：

```text
/mnt/c/Users/20448/.codex/plugins/cache/codex-plus-plugin-market-a2a1308c7804/agent-skills/0.6.10/
```

保留原技能正文及 `LICENSE.agent-skills`。前端技能引用的 `../../references/accessibility-checklist.md` 已随附在本目录的 `references/`，相对路径无需修改。没有复制与本项目无关的整套技能。

项目适配以根目录 `AGENTS.md` 和用户当前授权为准。原文中的分支名、MCP 配置、命令和工具名称为通用示例：本项目使用 `codex/axis-atlas`、现有 npm 脚本和当前可用的宿主工具。不要为执行参考示例额外安装服务，不要将通用建议变成新的确认要求。
