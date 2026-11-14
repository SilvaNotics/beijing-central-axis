# WSL 单元测试资源排错记录

记录日期：2026-11-14（Asia/Shanghai）。本轮遵照用户要求，不运行 `npm test`、直接 Vitest 命令、单个测试文件或浏览器测试来复现崩溃。

## 已取得的证据

- 当前 WSL：Linux `6.18.58.1-microsoft-standard-WSL2`，Node.js `24.20.0`，已安装 Vitest `4.1.12`。
- `os.availableParallelism()` 返回 32；`free -m` 显示内存总量 7581 MiB、swap 总量 2048 MiB。
- 原 `vite.config.ts` 仅指定 `src/**/*.test.ts`，没有 worker 或文件并行限制。已安装 Vitest 的 `resolveMaxWorkers()` 在非 watch 模式默认取可用 CPU 数减一，即此环境允许最多 31 个 worker；这不是对崩溃时实际 worker 数的测量。
- `journalctl -k -b -1` 对应启动 ID `d05ab8435a244863911363471136e1d8`。北京时间 2026-11-14 20:47:29 的日志明确记录 `Free swap = 0kB`、`Total swap = 2097152kB`、`global_oom` 和 `Out of memory: Killed process`。进程表中同时存在 `npm exec vitest`、`esbuild` 和多份 `MainThread`；其中被杀的 PID 1611 的匿名 RSS 为 511356 kB。20:47:30 日志记录系统关闭过程。
- 多个测试文件独立调用 `createLandmark()` 构建完整故宫，包括 `palaceArchitecture.test.ts`、`palaceGates.test.ts`、`palaceSideGates.test.ts`、`palaceWallCollision.test.ts` 等。并行执行会叠加这些模型的 JavaScript 对象与几何缓冲区。

这支持本次故障是测试并发导致的系统内存耗尽；无需再次让 WSL 崩溃来取得相同证据。日志没有按测试文件给出内存峰值，不能把某一个文件指认为唯一原因。

## 修复及边界

- `vite.config.ts` 固定 `pool: 'forks'`、`maxWorkers: 1`、`fileParallelism: false`、`maxConcurrency: 1`，避免按 CPU 数同时构建多个模型，也限制显式并发用例。
- 显式保留 `isolate: true`。在当前 Vitest forks 实现中，隔离任务完成后终止对应子进程，避免跨文件长期持有模型和原生缓冲区。
- worker 使用 `execArgv: ['--max-old-space-size=1024']`；`package.json` 的测试入口单独给协调主进程传同样的限制。只限制主进程不会自动给 Vitest worker 加上相同参数。
- 1024 MiB 限制的是 V8 老生代堆，**不是**整个进程 RSS，也不直接限制 Three.js 的 ArrayBuffer 或其他原生分配。因此不能据此宣称测试总内存绝不会超过 2 GiB。
- 保留所有测试文件、断言和原有 include 范围；未通过跳过模型检查或提高机器内存掩盖故障。开发、构建、章节内容和 Playwright 配置不在此次修复范围内。
- `npm test -- <文件路径或过滤条件>` 仍沿用 npm 原有参数透传方式。不要通过 CLI、环境变量或关闭隔离来绕过以上配置。

实现依据为当前安装包：`node_modules/vitest/dist/chunks/cli-api.B0Pz1_R7.js` 中的 `resolveMaxWorkers()`、`ForksPoolWorker`、任务调度与回收逻辑，以及 `node_modules/vitest/dist/chunks/reporters.d.DtoKVV2s.d.ts` 的配置契约。这些是安装依赖中的审查位置，不作为项目自有文件提交。

## 本轮验证

- 使用 `node --max-old-space-size=256 --input-type=module` 调用 Vite `resolveConfig()`，逐项核对上述七个测试配置字段、npm 测试入口和本地入口文件存在性；退出码 0。没有启动 Vitest runner，也没有导入测试文件。
- `NODE_OPTIONS=--max-old-space-size=1024 npm run build` 退出码 0：`tsc -b` 通过，Vite 转换 1648 个模块并完成生产构建，Vite 报告耗时 25.79 秒。构建仅有超过 500 kB 的 chunk 体积提示。
- 修复文件的 `git diff --check` 通过；`package-lock.json` 未改变。
- 本轮没有运行单元测试或浏览器测试。修复后的测试内存峰值和崩溃回归尚未实测，不应标为测试通过或已证实不再崩溃。
