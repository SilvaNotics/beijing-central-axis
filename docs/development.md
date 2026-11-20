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

验证时检查实际站点下的首页、字体与地理数据、三个章节 iframe、独立打开和返回链接；GitHub Actions 成功只证明上传与发布完成。北段、中段与南段的实际交付和验证范围见[进度记录](progress.md)。

## 封面左栏排版

三段（北段／中段／南段）是左栏的第二视觉主体：段名 26 px、说明 12 px、编号 17 px，其余小字从 7–9 px 提到 9.5–12 px。

| 元素 | 原 | 现 |
|---|---|---|
| 段名 | 19 px | **26 px**（≤860 px 高 22 px） |
| 段名后四字 | 12 px | 13 px |
| 段下说明 | **9 px** | **12 px**（矮屏 11.5） |
| 编号 01/02/03 | 15 px | **17 px** |
| 进入 | 10 px | **11.5 px**，悬停箭头右移 3 px |
| 版头「一座城的秩序与回响」 | 9 px | 11 px |
| VOL. 01 | 8 px | 10 px |
| 一条中轴，读懂一座城 | 24 px | 25 px（矮屏 22） |
| 导语三行 | 11 px | 12 px（矮屏 11.5） |
| 循轴而行 / EXPLORE THE AXIS | 10 / **7** px | 11 / **9.5** px |
| 脚注「一段贯古今」 | 10 px | 11 px |

- **段是撑开的，但内容居中**：`.region-list{flex:1}` + `.region-row{flex:1;min-height:96px;max-height:150px}`，屏幕越高每段越高（1440×900 实测 100 px，1200×1500 实测 150 px 封顶），文字始终垂直居中；不再出现 250 px 的空带。
- 行首 2 px 铜色轨只在 hover／聚焦时出现；编号列宽 24 px、`align-self:center` 与段名同基线。
- 矮屏（≤1000 px 高）单独一档：标题 68 px、段名 26 px、段内 padding 15 px；≤860 px 高再收一档（标题 64、段名 22、padding 10），保证 1440×900 下 `scrollHeight === innerHeight`（实测 900/900）。
- 窄屏（≤900 px）不做 flex 拉伸：`.region-list{display:block}`、`.region-row{max-height:none}`，「进入」绝对定位到行右，说明允许折行。
- `BEIJING<br>CENTRAL AXIS` 改成 `<i class="english-break">`：窄屏 `display:none` 合回一行时不会粘成 `BEIJINGCENTRAL`。

## 游览播报

游览到站先读中文名、再读英文名，两段之间停 150 ms。实现只有 `src/tourVoice.ts` 一个文件，站名来源就是 `onTourStatus` 给的 `index`。

| 项 | 值 |
|---|---|
| 中文音色 | `zh-CN-YunxiNeural`，rate `+20%`、pitch `+10Hz`，句末加「！」，实测中位基频 **196 Hz**、10–90% 分位 178–246（语调跨度 68 Hz） |
| 英文音色 | `en-US-GuyNeural`，rate `+10%`、pitch `+10Hz`，实测中位基频 **178 Hz** |
| 音源 | `public/audio/tour/00-zh.mp3` … `29-en.mp3`，30 站 × 2 条，共 60 条、816 KB；讲解模式另加 30 条 `NN-brief.mp3`，合计 90 条、1.5 MB |
| 音量 | 0.92；播报时背景音乐从 0.38 压到 **0.24**，读完回原值 |
| 换站 | 旧句子 200 ms 淡出，不硬切 |
| 停顿 | 中英之间 150 ms |

- **为什么不用 `speechSynthesis`**：系统 voice 在 Windows 上只有惠惠、云希等固定档位，音色不可选、时长不可控，headless 环境常常一个可用 voice 都没有；预生成文件才能锁死「少年男声、偏亮」这个档位。
- **选音色的依据是基频不是感觉**：`ffmpeg` 抽 16 kHz 单声道 → 40 ms 帧、20 ms 跳、自相关求基频，谱平坦度 > 0.35 判为噪声帧丢弃。云希原声中位 132 Hz、云健 111 Hz（成年低音）、云夏 340 Hz（童声），云希原声 132 Hz 是唯一落在「少年男声」区间、又不至于像变声器的档，所以底子用它。英文在 Guy/Brian/Andrew 里取 Guy `+10Hz`（178 Hz），跟中文同属偏亮的一侧。
- **不靠感觉定「有没有劲」，靠两条可量的指标**：一是转速（rate），二是句末「！」。同一句「太和殿」，云希 `+10%` 平读：1.68 s、中位 159 Hz、跨度 44 Hz（听感平、像念名单）；改成 `+20%` + 句末「！」：1.49 s、中位 186 Hz、跨度 63 Hz，音高和时长两头都活起来；pitch 再加到 `+10Hz` 是 196 Hz（定稿档），`+30Hz` 会窜到 222 Hz、男声撑不住，放弃；云健（Passion）另测中位只有 131 Hz，偏成年，也不采用。
- **站停多久跟着播报走**：`scripts/gen-tour-voice.py` 逐条量出中英时长（自己走 MPEG 帧，不依赖 ffmpeg，实测与 ffprobe 完全一致），写进 `src/data/tourVoice.json`；`holdMs()` 取「摆幅时长」与「播报时长 + 0.5 s」（0.25 s 到站静场 + 0.25 s 读完气口）的大值。名字长的站自动站久——「广场·人民英雄纪念碑」5.6 s、「南段道路·叠压遗存」6.1 s，英文不会被下一站切掉。
- **开口的时机看 `phase`，不看站序**：`TourPoint` 带 `phase: 'hold' | 'travel'`，`TourStatus` 原样透出，App 只在 `phase === 'hold'` 时开口，并且先静 250 ms 再出声。实测开口时刻 275 / 5794 / 12489 / 20947 / 32234 ms，对应到站 0 / 5517 / 12197 / 20660 / 31962 ms，每站比到站晚 270–290 ms。
- **飞行段报上一站**：镜头从上一站起飞的那一刻起，画面里还是上一站的天际线（从圜丘坛飞先农坛要横穿整座天坛）。所以 `sampleTour()` 的 `travel` 分支返回**出发站**的 `siteId / name / index`，只有落进 `hold` 才换成新站；面板名字、名牌高亮、站序都跟画面走。跳站/上一站/下一站把 `tourElapsed` 定位到 `tourStarts[i] + 1 ms`，因为 `tourStarts[i]` 那一刻还属飞行段收尾，落 1 ms 之后才进停靠段。
- **行为跟游览一致**：暂停、Esc、面板 ×、关静音（`axis:atlas-audio` = off）都立刻停读；跳站/拖动刻度会切到新站重读；继续播放时把当前站重读一遍。
- **重新生成**：站表改了先跑 `python scripts/gen-tour-voice.py`（内部 `node scripts/dump-tour-stops.mjs` 用项目自带 esbuild 把 `axisTour.ts` 与 `tourBrief.ts` 打成 ESM 再取站名和讲解稿，不引入新依赖），讲解稿只补跑 `python scripts/gen-tour-voice.py --brief`（站名的 60 条不动，免得重生成时换语气），需要 `pip install --user edge-tts` 且联网。`src/tourVoice.test.ts` 守四条：60 条站名文件齐全、每条 > 2 KB、条数等于站数 ×2、30 条 brief 文件齐全且时长表里有数；`src/data/tourBrief.test.ts` 另外守讲解稿与站名的逐条对齐。
- **授权**：音源是本项目自己用 Microsoft Edge TTS 合成后存盘的音频，仅用于课程演示与学习，不作商业用途；「关于」对话框已注明。跟 BGM（CC BY 4.0）、界面音效（CC0 / 公有领域）分开记，不混用。

### 讲解模式（可选）

面板按钮列最后一项「讲解」是个开关（圆点亮＝开，桌面右侧另带「开/关」字样），默认关，状态存 `localStorage` 的 `axis:tour-brief`，刷新后还在。它不放标题栏：面板只有 182 px 宽，挤进去会把「循轴游览」折成两行。

- **顺序**：中文名 → 讲解 → 英文名，句间仍是 150 ms。讲解不另起开场白，就夹在两个名字中间。
- **时长**：讲解本身 2.3–4.2 s/站，但每站停靠取「摆幅时长」与「播报时长 + 0.5 s」的大值，多数站本来就被环绕占满了，所以全程只从 **212.5 s 涨到 271.2 s**，不是逐站硬加。
- **开关会重排时间表**：`createTourStops({ brief })` 决定 `narrationMs`，`SceneView` 的控制器 `brief()` 重算 `tourStops / tourStarts / totalTourMs`，然后按站名把当前站重新落一次点，讲解当场重读这一站；界面刻度（`App` 的 `tourPlan`）用同一个参数重算，两边不会错位。
- **巡检**：`node scripts/check-tour.mjs <调试端口> <地址>` 跑一遍开游、飞行提示、讲解开关、竖轴吸附、键盘、退出、竖屏布局共 26 项断言，同时收控制台报错、未捕获异常、失败请求与非 2xx 响应，全过才 exit 0。改过 `axisTour.ts` / `SceneView.tsx` / `TourProgress.tsx` 之后用它兜底，比逐条手点快。
- **交互即结束**：在画布上滚轮或按下拖动，游览直接结束（`stopForInteraction`），不再停在「已暂停」——想临时停用面板里的「暂停」。面板底下那行提示写的就是这句。
- **游览中收起底部那颗「游览」按钮**：面板的上一站／暂停／下一站已经够用，两处都放暂停会出现两个同名按钮（e2e 也因此撞过 strict 模式）。
- **讲解稿**：`src/data/tourBrief.ts`，一站十来个字，事实只用 `docs/research/evidence-matrix.md` 里已有的条目（太和殿 35 m、保和殿 29.5 m、正阳门 43.65 m、鼓楼 46.7 m、钟楼 47.9 m、万春亭三重檐四角攒尖等），不在这里新增未核过的数字。`stop` 字段与 `createTourStops()` 的站名逐条对齐，测试守着。

## 端到端测试（Playwright）

`npm run test:e2e` 会先构建再用 `e2e/` 下的 9 个 spec 跑 29 条用例（总览渲染、章节地图、章节配乐、窄屏、北段名牌、南段立绘、游览）。浏览器要单独装一次：`npx playwright install chromium`。

**本机要加 `--workers=2`**：这台机器没有 GPU、WebGL 走软件渲染，默认按核数开 8 个 worker 会互相拖垮——实测 22 过 6 挂，其中 `mobile.spec.ts` 的超时用例要跑满 1.4 分钟；降到 2 个 worker 就 29 条全过（约 5 分钟）。命令：`npx playwright test --workers=2`。

本轮因界面重做同步改过的用例（都是「改契约」不是「放宽断言」）：
- `chapter-music.spec.ts`：嵌进总览时章节不再自建 `<audio>`，改为断言 `axis:audio` 消息（`h1` 解锁后 `normal`，开故事后 `mute`）；单独打开仍按原来的读 `<audio>` 验。
- `chapter-loading.spec.ts`：媒体被 abort 后解析本就收尾成 `complete`，断言从「必须是 interactive」改为「不能卡在 loading」，边下边可用仍由 `pendingMedia > 0` 与遮罩已撤来守。
- `tour.spec.ts`：指北针的断言挪到「已暂停」之后。原来是在恢复播放之后量，可到站文案比镜头落地早一两帧，软件渲染下恢复 300 ms 时相机还在转，实测差 14–56°（用 `bearing-drift.mjs` 采过：永定门到站那 3.5 s 里方位角从 −55.8° 转到 61.8°）。现在先等方位角连采两次不动再按暂停，然后验暂停期间不论名牌位置还是指北针都不动；恢复后只验游览继续走。
- `north-labels.spec.ts`：1440 px 那条曾经红——在未改动的 `c0174a1` 上同样红，是系统 Edge 的抗锯齿差异；换回 Playwright 自带的 chromium 后全过。截图内缩从「窄屏才缩 4 px」改成一律缩 3 px（名牌是 rotate 过的，截图框四角会带上背景）。
- `south-portrait.spec.ts`：新增。南段换到下一位 NPC 时，`updatePortrait()` 原来只改 `<img src>`，新图解码要时间，这段时间浏览器接着画上一张——读者要读几句台词才「变回来」。现在换人先清 `src`、置 `hidden`，等 `decode()` 完成再挂上，票号挡住迟到的回调。用例包住 `updatePortrait`，断言它返回的那一刻立绘是空着的；退回旧写法这条会红（实测 `swap.hidden` 为 `false`）。

## 南段立绘换人

`public/chapters/south/app.js` 的 `updatePortrait()` 换人时先把 `<img>` 撤干净（清 `src`、置 `hidden`），再从 `portraitCache` 取这张图、等 `decode()` 完成才挂上；`portraitTicket` 记票号，中途又换人或退回地图，迟到的回调直接丢掉。原因：只改 `src` 的话，新图解码那段时间浏览器会继续画上一张，读者先看到的是上一位 NPC 的脸。图还没到就宁可空着，也不挂别人。

立绘仍然按 `1348ae9` 的约定懒加载——`chapter-loading.spec.ts` 断言进故事之前一张都不许请求。所以换到还没看过的景点时，图没到之前画面是空的：空着可以，挂错人不行。

## 名牌位置

名牌不按数据坐标点摆，而是挂在**实际画出来的那团建筑**的包围盒中心：`city.ts` 在 `place()` 里用 `Box3.setFromObject(group)` 求中心，把差值存进 `city.labelOffsets`，`SceneView` 的 `updateLabels()` 投影时叠加这个偏移。

- 原因：`heritage.ts` 的坐标偶有偏差——太庙曾用 WGS 坐标（116.4012/39.9118），比院落中心偏东偏北 **120 m**；天坛锚点在公园中心，比祈年殿—圜丘那道轴线偏西 **183 m**。名牌就会悬在空地上，看着像 bug。
- 太庙坐标已改为 GCJ-02 的院落中心 `116.39987 / 39.91138`。
- 只挪名牌和点击框，`anchors` 保持原值：详情卡标注（`palace-*`、`prayer-hall` 等）是按 anchor 的相对坐标写的，动 anchor 会把整组标注带歪。
- **正在游览的那一站贴边也不丢**：`updateLabels()` 对它不再做「出画就隐藏」，而是收进安全区（左右 14 px、上 72 px、下 84 px，用实测 `offsetWidth/offsetHeight` 算，估计值会差十来个像素），再拉一根 `.scene-leader` 细线连回它在地图上的投影点——不加引线的话，牌子被挤到边上就成了「随便浮着」。
- 其余名牌照旧：出画、被遮挡、不在当前分区就淡出，不抢画面。
- 建筑本身的绝对位置不受坐标影响（几何都是 `project(点) − project(站点)` 再整体平移），所以纠坐标只改名牌、点击框和 `focus()` 取景中心。

## 游览（南 → 北）

**交互语义**：动画面只会暂停，不会结束。

| 操作 | 结果 |
|---|---|
| 拖动画布 / 滚轮 | 暂停，镜头交给你；面板标题变「已暂停」 |
| 点地标 | 暂停 + 打开详情卡；关掉详情按「继续」能接回当前位置 |
| 面板三个按钮 | 上一站 / 暂停·继续 / 下一站（不用记快捷键也能走完全程） |
| 按钮列「讲解」 | 开/关讲解模式，每站名字后面多念一句；开着时会重排时间表并重读当前站 |
| 空格 | 暂停 / 继续 |
| ← / → | 上一站 / 下一站（跳到该站停留起点） |
| 竖轴上下拖动 | 落到最近的一站（不按像素自由定位）；刻度按真实时间排布（每站按摆幅算出的停留 + 各路段的实际路程），点第 15 个刻度就是第 15 站，悬停有站名提示 |
| Esc 或面板 × | 结束游览 |

- 站表与时间表同源：`tourTimeline()` 在 `src/scene/axisTour.ts`，界面刻度和场景跳站都用它，避免两边各算一遍。
- **到站是绕点走弧，不是原地停**：停靠期拆成 0.3 s 对位静止 → 环绕 → 0.3 s 收尾静止，相机沿水平圆弧摆过该站的摆幅，只换面不换高度。俯角按站给（`ANGLE_DEGREES`）：平纸路面抬到 20°（南段道路）、18°（金水桥）、16°（永定门）、15°（广场）、14°（正阳门），殿堂仍是 12°（`TOUR_ANGLE`）——12° 下那条轴线纸带会被压成一根竖杆，看不出是路面。飞行段俯角线性过渡，不会在空中折一下。全程 212.5 s（30 站）。方位角 0° = 正南，正为东侧、负为西侧；机位坐标 `(sin az·cos12°·900, sin12°·900, cos az·cos12°·900)` 由 `SceneView` 的 `placeCamera()` 现算，不再是常量偏移。
- **角速度恒定 12°/s**（`ORBIT_SPEED`）：每站停留 `holdMs(stop) = 0.3 s + 摆幅 ÷ 12°/s + 0.3 s`，摆幅大的站自动停得久——44° 停 4.3 s、60° 停 5.6 s、90°（天坛）停 8.1 s；不绕的站固定 4.6 s，但给 5% 的推拉（`1 + 0.05·sin πu`），整段完全静止会让人以为卡住；这个时长还会与本站播报时长取大者（见「游览播报」）。缓动用正弦（`(1−cos πu)/2`），中段峰值只有均速的 1.57 倍，比五次曲线稳。
- **双向往返**：双数站顺时针、单数站逆时针，即第 i 站从 `entryAzimuth()` 摆到 `exitAzimuth()`，下一站的入场角正好等于上一站的出场角，飞行段方位角不变、只剩平移，不会在 750 ms 内甩镜头。
- **摆幅按体量分档**（`ORBIT_DEGREES`）：宫殿轴心殿堂 60°，圆形坛台（天坛）90°，社稷坛/景山/钟鼓楼 70°，门桥与默认点 44–50°，南段道路与金水桥 0°（平面纸片，直接停）。
- **怕切画框就自动退半步**：摆幅 ≥60° 的站，环绕中段 `zoom × 0.92`，其余 `× 0.95`（`orbitPullBack()`），到站再推回原位，保证地标在弧上始终完整。
- 从暂停恢复时，机位用 420 ms 缓动从你拖到的位置回到当前站点，不会瞬间跳回。
- 面板为左侧通栏竖版（182 px 宽，距场景左框 28 px，从顶部标题下沿一直拉到画面底部，约 600 px 高）：标题栏是「循轴游览 / 站序 / ×」，下面站名名牌（站名 + 英文，带分隔线，飞行段加一行「前往 …→」），中间左侧竖轴**北在上、南在下**、与真实方位一致（轴 36 px 宽、柱 3 px，整条都是热区；圆钮 15 px；刻度 11 px，每 5 站 16 px 长标，南北标在轴两端留白之外），右侧是四个细线分隔的操作行（上一站／暂停·继续／下一站／讲解），沿竖列分布，底部贴两行提示。
- **竖轴按下就吸附到最近一站**：拖动或点击只认 `tourStarts` 里离松手位置最近的那一站，不会停在两站中间（以前拖到 41% 落在第 3 站，像跳错了）。悬停时轴右侧浮出站名提示（`.tour-vrail-tip`），刻度 `title` 也带站名。
- **竖屏（≤600 px）换布局**：面板变成顶部横条（站名与英文并排、四个按钮横排一行、讲解只留圆点不写「开/关」，否则一行四个挤不下），竖轴从面板里抽出来固定在视口右侧、落在场景面板内部（`bottom: calc(38svh + 18px)`），游览时底部那排控制按钮淡出让位。420×860 下实测面板 10/140/400×152、竖轴 380/190/36×325，互不遮挡。
- 游览面板打开时，左下的图例、鼠标操作提示与「轴线全长 7.8 km」淡出（`section.scene-panel.is-touring`），避免被面板压住；退出游览即恢复。
- 游览到哪一站，模型上那站的名牌当场换成赤底铜字（`.scene-label.is-touring`），面板名字和模型对得上。
- **飞行段给出目的地**：面板站名下面多一行 11 px 小字「前往 先农坛 →」，只在 `phase === 'travel'` 出现。名字仍报上一站（见「游览播报」），这行是补上「为什么还没换名」的答案，到站即消失。
- **两个站的取景单独调过**：永定门推近到 `zoom 1.22`（原来城楼只占画面中间一小块，大半是空地），钟楼退到 `0.86`（站在鼓楼北边约 100 m 外，正对钟楼时鼓楼掉在画外，「钟鼓楼」这一处却只看见一座）。
- **站点取景逐站核对过**：`createTourStops()` 的坐标与 `public/data/buildings.json` 里对应建筑的真实轮廓中心逐站比过，30 站差值都是 0–1 单位（10 m 内）。改过的只有先农坛：祭台（`587608667`）只是一方矮台，镜头正对它时画面正中是空地、旁边那团太岁殿反倒成了主体，名牌也被外接框拉到神仓院头上。现在这一站取祭台与太岁殿的中点、`zoom` 退到 0.84 收整座坛址，名牌钉在太岁殿那一团，下一站仍是太岁殿大殿。
- 走完 30 站面板换成「游览完成」并给「再看一遍 / 结束」。
- 实现：`App` 用 `tourCommand{rev,type,value}` 下发指令，`SceneView` 依 `rev` 变化调用控制器的 `seek()` / `step()`。

## 首屏加载

三维场景没有外部模型或贴图，`createCity()` 直接算出全部几何，这一段是纯 CPU，会把主线程占满几秒。为了让人看到真实进度，初始化拆成四段，段与段之间让出一帧（`requestAnimationFrame` + `setTimeout 0`）再继续，加载层才画得出来：

| 阶段 | 内容 | 本机实测 |
|---|---|---|
| 铺纸 | 地形、纸底纹理（2048 画布烘焙）、水面 | ≈1.5 s |
| 起屋 | 除宫城外的所有地标建筑体量 | ≈0.75 s |
| 立宫 | 宫城（建筑最多的一段） | ≈1.2 s |
| 收卷 | 轴线路面、几何合并烘焙、林木 | ≈1.1 s |

- 节奏由 `src/App.tsx` 的三个常量定：`LOAD_STEP_MS = 200`（每段至少留 200 ms，机器快时后两三段不会一闪而过）、`LOAD_HOLD_MS = 400`（条走满后再停一拍才揭幕）、`LOAD_FADE_MS = 260`（淡出时长）。显示进度只跟着真实阶段走，不虚构阶段，只是把快机的瞬间补齐到 200 ms。
- 实现在 `src/scene/city.ts`：`createCity()` 改为 async，接受 `onStage?: CityStageListener`，阶段常量 `CITY_STAGES` 同时供加载层渲染标签；dev 下每段打 `performance.mark('city-stage-*')`。
- `SceneView` 把进度透出去（`onLoadProgress`），`App` 的状态是 `loadStage`，覆盖层显示四段标签 + 真实进度条。
- 兜底：十秒还没算完就自动切二维地图，并留一句「三维图景较慢 · 已先切到二维，可点右上角切回」。切回三维会重建场景（再等一次），不会缓存。
- 想再快只能换路子：把几何在构建期烘焙成 glTF / 合并成少量 InstancedMesh，或缓存到 IndexedDB。目前没做。

## 界面音效

三声，跟着顶栏「声音」开关一起开关（同一个 `axis:atlas-audio` 偏好，关掉音乐就一起静音）：

| 音色 | 用在 | 素材 | 授权 |
|---|---|---|---|
| `ui-tap.mp3`（木叩，209 ms） | 默认：模式切换、游览、缩放、地标点选、关闭 | sfxmint「Restrained Short Wood Tap」 | CC0 |
| `ui-open.mp3`（低木，209 ms） | 顶栏「展卷／遗产名录／关于」——开合面板 | 同上的低八度变体（重采样到 82%） | CC0 |
| `ui-page.mp3`（翻纸，627 ms） | 进入章节：分区行「进入」、详情卡「进入…篇章」 | Wikimedia Commons「Turning a page」1.50–2.10 s 段 | 公有领域 |

- 文件在 `public/audio/ui/`，合计 11 KB。都做过高切、淡入淡出与峰值归一（峰值 0.45–0.60）。
- 播放音量 0.30 / 0.26 / 0.34，压在背景乐（总览 0.42）之下；每种音色各 3 个 `Audio` 轮转，连点不会掐断。
- 接线在 `src/uiSound.ts`：`document` 上一条 `pointerdown` 捕获阶段委托，命中 `[data-sfx]`、`button`、`a[href]`、`.flat-site` 就响；要换音色在元素上写 `data-sfx="open|page"`。
- 章节是 iframe，父层的委托进不去，章节内部的按钮仍用章节自己的音效。

## 背景音乐

总览页有一条循环配乐：`public/audio/atlas-theme.mp3`，取自北段章节已在用的《Ripples》（Kevin MacLeod，incompetech.com，CC BY 4.0），中段章节用的是同一个文件。署名写在「关于」对话框与北段章节结尾卡。

音量由 `src/components/AtlasAudio.tsx` 统一管理，`src/App.tsx` 只给目标值，切换时按 420 ms 线性淡变：

| 场景 | 目标音量 |
| --- | --- |
| 总览地图（分区聚焦、旋转、二维地图） | 0.42 |
| 由南至北游览中 | 0.38 |
| 打开地标详情 | 0.26 |
| 打开遗产名录 / 关于 | 0.16 |
| 进入任一章节（iframe） | 0.36 |
| 章节内 NPC 对话 / 讲解弹层 / 视频 | 0.10 或 0，由章节发消息决定 |

- 三个章节不再各放一份配乐：作为总览的章节打开时（`window.parent !== window`），北段、中段的本地曲和南段的环境音都不启动，改为向父页面发 `{type:'axis:audio', state:'normal'|'duck'|'mute'}`，由这里统一播放和淡变。单独双击章节文件时仍走各自原来的实现。
- 浏览器不允许无交互自动出声，首次 `pointerdown`、`keydown` 或 `touchstart` 才起播；标签页隐藏时暂停，回来接着放，不回到开头。
- 顶栏「音乐 / 静音」按钮切换，偏好存在 `localStorage` 的 `axis:atlas-audio`。

## 启动与播放性能

总览页首次进入时要把三万余栋建筑、地面图、树木和航线一次性算出来，历史上这一段是一整块七秒左右的主线程长任务，载入过程看上去像卡死。现在的处理：

- `src/scene/city.ts` 按站让出主线程（`yieldFrame`），`src/scene/cityPlan.ts` 改成异步，分段绘制地面图并在每 250 栋建筑处让出。整块工作被切成十几段，最长一段约 1.3 s，静止帧率回到 60 fps（1440×900，D3D11）。
- `pointInPolygon`（`src/scene/geo.ts`）按环缓存外接框，查询点落在框外直接返回，省掉整圈遍历；这是地面图、树林、绿地三处构建的热点。
- 载入遮罩的进度条上叠了一条只走 `transform` 的高光（`src/styles.css`），动画由合成器执行，主线程被占住时它仍在动，页面不会看上去冻住。
- 视频统一压到 720p / CRF 26 / `+faststart`：中段社稷坛 22.7 → 4.2 MB，南段五条合计 38.8 → 22.8 MB，北段开场 4.2 → 2.2 MB（保留 1920×1080，`chapter-loading.spec.ts` 断言原始分辨率）。南段视频页播放帧率从约 5 fps 回到流畅值，首帧从 405 ms 降到 90 ms。
- 北段三张人物背景从 JPG 换 WebP，2.1 MB → 0.8 MB；南段、中段两张导览地图同样换 WebP（617 → 267 KB、442 → 335 KB）。

### 地面图预烤

`createCityPlan` 在 2048×3488 的画布上画几万笔，是首次进入最大的一块计算（约 1.6 s）。现在这张图在开发时画一次、存成图直接贴：

- `npm run bake:plan`（`scripts/bake-plan.mjs`）起一个临时 Vite 服务，用无头浏览器跑 `scripts/bake/plan.html`，把 `createCityPlan` 的两个变体（三维地面、二维导览）写成 `public/data/city-plan.webp`、`city-plan-arch.webp`，并把 `buildings.json` + `context.geojson` 的 SHA-256 前 16 位记进 `city-plan.json`。
- 运行时 `src/scene/cityPlanAsset.ts` 先读指纹：一致就用预烤图（约 50 ms 解码），不一致、文件缺失或不支持 `crypto.subtle` 就退回现场绘制，并在控制台提醒。
- **改了 `public/data/` 里的建筑或地形数据，必须重跑 `npm run bake:plan`**，否则会一直走现场绘制（画面不会错，只是慢）。

### 首帧与树林

- 场景建好后先 `renderer.compileAsync()` 编译着色器，再放开载入遮罩，首帧不再把编译时间算在用户等待里。
- 树林（`createForest`）留到首帧之后再种，约 0.3 s 内补齐；载入遮罩淡出期间基本看不出。
- 软件渲染（SwiftShader / llvmpipe）不预先编译着色器：那里编一次要好几秒，交给首帧慢慢来更划算。
- 首屏「十秒切二维」的兜底改成**十秒没有新进展**才切（`src/App.tsx`，跟随 `loadStage` 重新计时）。慢机器上不会再出现“算到一半被换掉”。

改动素材后需要重跑 `npx playwright test` 的 `chapter-loading`、`chapter-maps`、`atlas` 三组，它们对视频分辨率、地图可读性和首屏无报错有断言。

## 验证与交付

改动完成后记录版本、构建输出和实际检查范围。运行时画面、键盘、窄屏、iframe 返回需要浏览器验证；编译成功不能替代这些检查。本轮实际状态见 [进度与验证](progress.md)。

来源增加或模型依据改变时，按根目录 [AGENTS.md](../AGENTS.md) 同步更新来源登记、目录、证据矩阵及方法记录；原始数据改变还需刷新快照清单。
