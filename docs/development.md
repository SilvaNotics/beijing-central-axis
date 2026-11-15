# 开发与运行

## 环境

主应用为 React + TypeScript + Vite，使用 npm 锁文件。当前开发环境为 WSL Bash、Node.js 24.20.0，Node 由已有 fnm 提供。Vite 的 Node 最低要求为 20.19+ 或 22.12+；复现本轮构建建议使用记录的 24.20.0。

WSL 使用其自带 Bash；Windows 非 WSL 环境使用 Git Bash。找不到 Node 时先初始化已有 fnm，不要重新安装 Node：

```bash
eval "$(fnm env --shell bash)"
node --version
```

## 启动

已有锁文件时安装依赖并启动：

```bash
npm ci
npm run dev
```

仅在明确增加或调整依赖时使用 `npm install`，同时提交 `package-lock.json`。开发地址以终端实际输出为准。

## 命令

| 命令 | 作用 |
| --- | --- |
| `npm run dev` | 启动 Vite 开发服务 |
| `npm run build` | 先执行 TypeScript 项目检查，再生成 `dist/` |
| `npm run preview` | 通过本地 HTTP 服务预览 `dist/` |
| `python3 scripts/verify-docs.py` | 只核对本地文档、来源登记与数据快照，不启动测试 runner |
| `npm test` | Vitest 单元测试入口；保留下述 WSL 串行和堆限制 |
| `npm run test:e2e` | 构建后执行 Playwright；软件 WebGL 环境建议使用 `-- --workers=1` |

包中没有单独的 lint 脚本，不要将编译检查写成 ESLint 检查。单元测试与浏览器检查必须有实际输出才能标记通过。

主应用构建未包含 Playwright 配置与浏览器检查文件。可以单独检查这些文件的类型，命令不会运行浏览器或测试用例；`@types/node` 已作为开发依赖登记：

```bash
node --max-old-space-size=512 ./node_modules/typescript/bin/tsc --noEmit --target ES2022 --module ESNext --moduleResolution bundler --skipLibCheck --types node playwright.config.ts e2e/atlas.spec.ts e2e/mobile.spec.ts
```

## WSL 资源约束

2026-11-14 的内核日志记录了 Vitest 并发造成的全局 OOM。当前测试配置采用单 worker、文件串行、用例最大并发数 1 和独立 forks 隔离；主进程与 worker 的 V8 老生代堆分别限制为 1024 MiB。

不要通过 CLI、`VITEST_MAX_WORKERS` 或关闭隔离覆盖这些设置。1024 MiB 不是整个进程 RSS 上限，Three.js 原生几何缓冲区另占内存。历史证据和未验证边界见 [测试资源排错](testing-resources.md)。2026-11-14 轮次按用户当时要求未执行测试；后续实际执行结果按日期追加到 [进度记录](progress.md)，构建和静态检查不能替代测试结果。

资源紧张时可限制构建的 Node 堆：

```bash
NODE_OPTIONS=--max-old-space-size=1024 npm run build
```

## 静态部署

将 `dist/` 的完整内容交给 HTTP 静态服务，保留 `assets/`、`data/`、章节目录及全部本地资源。不要双击 `index.html` 用 `file://` 访问。主应用 `base: './'`，路由采用 hash；部署到子目录时不需要为主应用配置 history 路由回退。

默认章节位于 `chapters/{north|central|south}/index.html`，浏览器 URL 不包含 `public/`。章节静态产物也必须使用相对资源路径，详见 [接入契约](integration.md)。

本地同源构建不依赖在线瓦片、远程字体或 CDN。选择外部 HTTPS 章节时，网络、跨域和嵌入策略由该站点决定，不能再把该外部章节称为离线可用。

### GitHub Pages

站点地址：<https://silvanotics.github.io/beijing-central-axis/>。工作流位于 [`.github/workflows/pages.yml`](../.github/workflows/pages.yml)，使用 GitHub 官方 Pages Actions 发布完整 `dist/`，无需另建 `gh-pages` 分支或配置个人访问令牌。

- 仓库 **Settings → Pages → Build and deployment → Source** 选择 **GitHub Actions**；这是仓库首次启用时的一次性设置。
- 推送到 `main` 后自动构建并发布；Actions 中的 **Deploy to GitHub Pages → Run workflow** 可对 `main` 手动重发。
- 面向 `main` 的 pull request 只构建检查，不发布。需要恢复旧版时，在 `main` 撤销对应改动，由新提交触发重新发布。
- 构建使用 Node.js `24.20.0`、`npm ci`、本地资料校验和 `npm run build`（含 TypeScript 检查）。保留 1024 MiB 构建堆限制；本工作流不运行 Vitest 或 Playwright，绿色部署不代表测试套件通过。
- 主应用保留 `base: './'` 和 hash 路由；章节目录和素材随构建一起发布。可直接访问 `#/sample`、`#/chapter/north`、`#/chapter/central`、`#/chapter/south`，独立章节仍位于 `chapters/{regionId}/index.html`。
- Action 版本固定到提交 SHA；工作流只授予读取源码的权限，发布 job 单独取得 `pages: write` 和 `id-token: write`。

验证时检查实际站点下的首页、字体与地理数据、三个章节 iframe、独立打开和返回链接；GitHub Actions 成功只证明上传与发布完成。中段和南段仍为接入示例，托管不会改变其交付状态。

## 验证与交付

改动完成后记录版本、构建输出和实际检查范围。运行时画面、键盘、窄屏、iframe 返回需要浏览器验证；编译成功不能替代这些检查。本轮实际状态见 [进度与验证](progress.md)。

来源增加或模型依据改变时，按根目录 [AGENTS.md](../AGENTS.md) 同步更新来源登记、目录、证据矩阵及方法记录；原始数据改变还需刷新快照清单。
