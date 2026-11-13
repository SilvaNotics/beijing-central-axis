# 北京中轴 · 城市图志

一个以北京中轴线为线索的中文交互图志：在黄昏色调的三维城市概览中浏览遗产点，阅读简短资料，再进入北段、中段、南段的独立章节。三维建筑和章节小地图都是导览示意，不是测绘成果或历史复原。

## 本地运行

需要 Node.js 20.19+ 或 22.12+；当前开发环境已通过 fnm 提供 Node.js 24.20.0。Windows 使用 Git Bash，WSL 使用其自带 Bash。若当前终端找不到 `node`，先初始化已有 fnm，再继续。

```bash
npm install
npm run dev
```

打开终端打印的本地地址。开发、构建和预览都通过 HTTP 服务访问；不要直接双击 `index.html`。构建后只要保留 `dist/` 全部文件，即可在本地静态 HTTP 服务下运行，不依赖在线地图、字体或运行时 AI 服务。

| 命令 | 用途 |
| --- | --- |
| `npm run dev` | 启动开发服务器 |
| `npm run build` | TypeScript 检查并生成 `dist/` |
| `npm run preview` | 在本地检查生产构建 |
| `npm test` | 运行单元测试 |
| `npm run test:e2e` | 运行 Playwright 浏览器检查；需要已配置的浏览器 |

浏览器检查需要本机已有 Playwright 对应浏览器；测试失败时先看错误原因，按团队当前环境配置处理。

## 浏览方式

- `#/`：城市概览与三维导览。
- `#/chapter/north`、`#/chapter/central`、`#/chapter/south`：三个独立章节入口。
- `#/site/{id}`：遗产点信息，`id` 以数据文件为准。
- `#/sample`：单独的展示样例页面。

概览使用实际经纬度关系组织场景，但模型体量、道路和水系经过简化。资料来源随数据记录，研究说明见 `docs/research/`。页面内容用于介绍与导航，不提供实时开放、票务或交通信息。

## 项目结构与协作

```text
src/data/                遗产点、参考来源与分区入口登记
src/scene/               Three.js 场景及交互
src/                     React 页面、导航与样式
public/chapters/          三个可替换的分区接入示例
.agents/                  项目使用的技能与辅助参考
AGENTS.md                项目约束、环境与协作规则
docs/implementation-plan.md  已确认的实施计划
docs/integration.md       独立章节接入契约
docs/progress.md          进度与验证记录
```

详细章节由各自作者维护。目前 `public/chapters/*/index.html` 明确标为「分区接入示例」，展示不同风格和独立运行边界。替换它们时，按照 [接入说明](docs/integration.md) 构建、复制章节产物并修改登记 URL，无需重写概览。

本项目使用本地静态资源与系统字体。浏览器关闭 WebGL 或设备能力不足时，应仍能使用文字入口与遗产列表。工作分支为 `codex/axis-atlas`；本任务无需发布或推送。
