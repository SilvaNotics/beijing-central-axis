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
| `npm test` | Vitest 单元测试入口；当前会话按用户要求不执行 |
| `npm run test:e2e` | 构建后执行 Playwright；本轮不执行 |

包中没有单独的 lint 脚本，不要将编译检查写成 ESLint 检查。单元测试与浏览器检查必须有实际输出才能标记通过。

主应用构建未包含 Playwright 配置与浏览器检查文件。可以单独检查这些文件的类型，命令不会运行浏览器或测试用例；`@types/node` 已作为开发依赖登记：

```bash
node --max-old-space-size=512 ./node_modules/typescript/bin/tsc --noEmit --target ES2022 --module ESNext --moduleResolution bundler --skipLibCheck --types node playwright.config.ts e2e/atlas.spec.ts
```

## WSL 资源约束

2026-11-14 的内核日志记录了 Vitest 并发造成的全局 OOM。当前测试配置采用单 worker、文件串行、用例最大并发数 1 和独立 forks 隔离；主进程与 worker 的 V8 老生代堆分别限制为 1024 MiB。

不要通过 CLI、`VITEST_MAX_WORKERS` 或关闭隔离覆盖这些设置。1024 MiB 不是整个进程 RSS 上限，Three.js 原生几何缓冲区另占内存。历史证据和未验证边界见 [测试资源排错](testing-resources.md)。当前用户要求不运行测试，构建和静态检查不代表测试套件通过。

资源紧张时可限制构建的 Node 堆：

```bash
NODE_OPTIONS=--max-old-space-size=1024 npm run build
```

## 静态部署

将 `dist/` 的完整内容交给 HTTP 静态服务，保留 `assets/`、`data/`、章节目录及全部本地资源。不要双击 `index.html` 用 `file://` 访问。主应用 `base: './'`，路由采用 hash；部署到子目录时不需要为主应用配置 history 路由回退。

默认章节位于 `chapters/{north|central|south}/index.html`，浏览器 URL 不包含 `public/`。章节静态产物也必须使用相对资源路径，详见 [接入契约](integration.md)。

本地同源构建不依赖在线瓦片、远程字体或 CDN。选择外部 HTTPS 章节时，网络、跨域和嵌入策略由该站点决定，不能再把该外部章节称为离线可用。

## 验证与交付

改动完成后记录版本、构建输出和实际检查范围。运行时画面、键盘、窄屏、iframe 返回需要浏览器验证；编译成功不能替代这些检查。本轮实际状态见 [进度与验证](progress.md)。

来源增加或模型依据改变时，按根目录 [AGENTS.md](../AGENTS.md) 同步更新来源登记、目录、证据矩阵及方法记录；原始数据改变还需刷新快照清单。
