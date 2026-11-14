# 三个独立章节的项目构建方案 · Agent 指令

本文面向北段、中段、南段组员的开发 Agent，依据当前北京中轴线主项目的代码与接入协议编写。它规定工程组织、构建和交付边界；章节主题、文案、视觉风格、交互形式及具体内容由各组员决定。

## 1. Agent 从这里开始

1. 先确认当前工作目录是**主项目**还是**组员的独立章节项目**，检查已有文件、工作区变更及已有 `AGENTS.md`。有可用项目时沿用，不重新生成覆盖。
2. 确定自己负责的 `regionId`：`north`、`central` 或 `south`。身份尚不明确时，只询问负责哪一段及已有内容要求，不猜测归属，不同时实现三段。
3. 主项目的总览已经定形。你的任务是建设一个独立章节，通过固定 URL 嵌入主项目；不要重新设计总览、重建全轴地图或调整其他组员的项目。
4. 独立工程优先使用 React + TypeScript + Vite；已有 Vue 或原生网页也可保留。接入不要求统一框架。
5. 先完成能独立运行、能构建、能嵌入的最小工程，再实现组员确定的内容。工程骨架与接入示例不能作为正式内容交付。
6. 接入前阅读主项目的 `docs/integration.md`；可访问主项目源码时，再核对 `src/data/heritage.ts`、`src/data/types.ts`、`src/lib/navigation.ts` 和 `src/components/ChapterView.tsx`。

### 让组员的 Agent 识别本方案

本项目根目录 `AGENTS.md` 已登记本文。将方案交给其他组员时，可把本文复制为其**独立章节项目根目录的 `AGENTS.md`**；若该文件已存在，就保留原文，将本文另存为 `CHAPTER_AGENT_GUIDE.md`，并追加：

```md
## 北京中轴线章节接入

本项目负责的 regionId：north（按本人分工改成 central 或 south）。
开始工程搭建、构建或交付前，先阅读根目录 CHAPTER_AGENT_GUIDE.md 并遵守接入约定。
具体内容与视觉设计以本组员要求为准。
```

不要用本方案覆盖**主项目**已有的 `AGENTS.md`。其他 Agent 若使用不同的规则入口，应在其已有规则文件中引用本文，不假设所有工具都会自动读取任意 Markdown 文件。

## 2. 分工与固定接入位置

| 组员项目 | regionId | 主项目入口 | 主项目内接收产物的位置 |
| --- | --- | --- | --- |
| 北段章节 | `north` | `#/chapter/north` | `public/chapters/north/` |
| 中段章节 | `central` | `#/chapter/central` | `public/chapters/central/` |
| 南段章节 | `south` | `#/chapter/south` | `public/chapters/south/` |

各段的默认登记值为 `./chapters/{regionId}/index.html`，例如 `./chapters/north/index.html`。保留该路径即可替换正式内容，无需改主项目路由或登记数据。浏览器 URL 中不含 `public/`。

以下是主项目已有的归属和稳定 ID，只作为章节边界与资料对应关系，不要求组员采用固定叙事顺序或页面模板：

| 分区 | 地标及主项目 ID |
| --- | --- |
| 北段 | 钟鼓楼 `bell-drum`；万宁桥 `wanning`；景山 `jingshan` |
| 中段 | 故宫 `forbidden-city`；社稷坛 `shejitan`；太庙 `taimiao`；端门 `duanmen`；外金水桥 `jinshui` |
| 南段 | 天安门 `tiananmen`；天安门广场及建筑群 `square`；正阳门 `zhengyang`；天坛 `tiantan`；先农坛 `xiannongtan`；中轴线南段道路遗存 `southern-road`；永定门 `yongdingmen` |

“社稷庙”等口语称呼不要替代登记名“社稷坛”。广场内的大会堂、国博、纪念碑、毛主席纪念堂等可由南段作者自行组织为子内容，无需为此修改主项目地标 ID。

## 3. 工具链

| 层级 | 建议与约束 |
| --- | --- |
| 运行环境 | 本项目现有环境为 Node.js `24.20.0`，通过 fnm 使用；组员使用兼容其依赖的 Node 版本，并在 README 记录实际版本。不要把主项目机器上的安装路径写入自己的配置。 |
| 包管理 | 默认 npm，提交自己的 `package-lock.json`。已有锁文件时用 `npm ci` 复现；首次创建或明确调整依赖时用 `npm install`。不要混用多个包管理器锁文件。 |
| 应用 | 新项目默认 React + TypeScript + Vite；已有 Vue + TypeScript + Vite 或原生网页保持现状即可。 |
| 主项目版本参考 | 当前 `package.json` 使用 React `^19.2.0`、Vite `^7.3.0`、TypeScript `~5.9.3`、`@vitejs/plugin-react` `^5.1.0`。这些是本仓库基线，不代表最新版本，也不是 iframe 的硬性依赖。 |
| 三维与动画 | 按内容需要选用。主项目已有 Three.js `^0.182.0`，章节不必安装 Three.js，也不必复刻主项目建模方案。 |
| 检查 | TypeScript 检查与生产构建必须可执行。存在状态、数据处理等逻辑时用 Vitest 做有意义的测试；用浏览器检查最终页面，有自动化条件时使用 Playwright。 |
| 发布形式 | 一个完整的静态构建目录，含 `index.html` 和所有运行资源；默认不需要后端、数据库或账号系统。 |

当前是 WSL 时使用 WSL Bash；在 Windows 非 WSL 环境默认使用 Git Bash。先辨认环境，再执行对应命令。已有 fnm 但找不到 Node 时先初始化当前 shell 的 PATH，不为此重新安装 Node。

建议开发端口：北段 `5174`，中段 `5175`，南段 `5176`。这些只是协作分配建议，不表示服务已启动；检查占用后使用，主项目当前开发端口以实际终端输出为准。主项目的正式入口不登记这些开发端口。

## 4. 独立项目结构

建议每位组员维护一个独立工程或仓库，与主项目并列。不要把章节源码直接混进主项目的 `src/`，也不要把开发工程放进主项目 `public/`。`public/chapters/{regionId}/` 只接收可运行的静态交付物。

以下以北段 React 工程为例，其他两段替换项目名和 `regionId`；Vue 可用 `main.ts`、`App.vue` 等等效文件：

```text
axis-chapter-north/
├── AGENTS.md                 Agent 项目约束或本文的读取入口
├── CHAPTER_AGENT_GUIDE.md    保留已有 AGENTS.md 时存放本方案
├── README.md                环境、启动、构建、分区和交付说明
├── package.json
├── package-lock.json
├── index.html               独立页面入口，设置中文 lang 与页面标题
├── vite.config.ts           关键配置 base: './'
├── tsconfig.json            及所选模板需要的 TypeScript 配置
├── .gitignore
├── public/
│   ├── images/              不经构建导入的静态图片，按需建立
│   ├── models/              本地模型，按需建立
│   ├── audio/               本地音频，按需建立
│   └── fonts/               有授权的本地字体，按需建立
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── components/          可复用组件
│   ├── pages/               按需拆分的页面或章节片段
│   ├── data/                该章节自己的结构化内容和来源记录
│   ├── assets/              通过 import 引用的图片与样式资源
│   ├── styles/              本章节样式
│   ├── integration/
│   │   └── atlasReturn.ts   可选的返回主项目逻辑
│   └── scene/               仅在需要 Three.js 等场景时建立
├── docs/
│   ├── sources.md           事实依据、图片/模型来源与授权
│   └── handoff.md           接收路径、实际验证、已知限制
├── e2e/                    有浏览器自动化时建立
└── dist/                   构建生成，不手改，不作为源码维护
```

按实际规模删减目录，原生网页无需制造 React 工程。源码、资料与交付记录留在独立项目；主项目接收 `dist/` 里的静态文件。安装缓存、源码工程和 `node_modules/` 不随静态交付物复制。

建议提供以下 npm 脚本；React TypeScript 项目可沿用主项目形式：

```json
{
  "scripts": {
    "dev": "vite --host 0.0.0.0",
    "build": "tsc -b && vite build",
    "preview": "vite preview --host 0.0.0.0"
  }
}
```

Vue 项目用相应的 `vue-tsc` 检查；原生网页采用其实际可执行的构建/静态服务命令。仅在安装并配置对应工具后添加 `test`、`test:e2e` 等脚本，不交付无法运行的空壳命令。

## 5. 构建配置与资源路径

React + Vite 工程最小配置参考：

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: './',
  plugins: [react()],
});
```

Vue 使用对应插件，其余原则相同。必须满足：

- 资源可以随整个章节目录移动；不写本机磁盘路径，不使用指向站点根目录的 `/assets/...`、`/images/...` 作为通用资源路径。
- `src/assets/` 中的文件优先通过模块 `import` 或 `new URL('../assets/example.webp', import.meta.url)` 交给构建器处理。
- `public/` 下的资源在根入口页面运行时可用 `new URL('images/example.webp', document.baseURI).href` 生成 URL；采用本方案的 hash 路由时，入口文档路径不变。加载模型、音频、JSON、Worker 时同样检查 URL。
- 页面内部有路由时使用 hash 路由：React Router 用 `HashRouter`，Vue Router 用 `createWebHashHistory()`。只有确需路由时才引入库；单页状态切换无需安装路由器。
- 父应用的 `#/chapter/north` 与 iframe 文档自己的 hash 相互独立。不要写 `window.top.location.hash` 操纵父页面。
- 默认不需要服务端路由回退、跨域代理或运行时 API。依赖安装与资料搜集可以联网，最终本地展示的脚本、字体、图片、模型、数据和地图必须能从本地加载；资料来源的外链可以保留。
- 需要地理示意时可使用已整理的本地数据。不要把在线瓦片、地图密钥、CDN 脚本或运行时 AI 服务作为页面运行前提。

北段本地命令示例，其他两段替换端口：

```bash
# 有锁文件的独立章节工程根目录
npm ci
npm run dev -- --port 5174 --strictPort
```

生产检查另开终端执行：

```bash
npm run build
npm run preview -- --port 4174 --strictPort
```

以上命令只适用于已配置所列 npm 脚本的章节工程，不代表已经替组员创建工程或执行验证。

## 6. iframe 边界与返回协议

主应用提供章节标题、返回总览、独立打开和重新载入；章节拥有自己的内容、样式、资源和状态。不要依赖父页面的 React 实例、DOM、CSS 变量或 Three.js 场景，也不要在章节中再嵌入整个主应用。主应用目前不会向章节传递地标选择、相机位置或进度；不要假设存在未实现的消息接口。

章节内的额外返回按钮是可选项；若实现，请保留 `data-return`，便于沿用已有浏览器检查。下面的同源链接与处理函数适用于最终目录 `chapters/{regionId}/index.html`：

```html
<a href="../../#/" data-return>返回中轴总览</a>
```

```ts
export function handleAtlasReturn(event: { preventDefault(): void }) {
  if (window.parent !== window) {
    event.preventDefault();
    window.parent.postMessage(
      { type: 'axis:return' },
      window.location.origin,
    );
  }
}
```

React 将其绑定到链接的 `onClick`；Vue 或原生网页在对应点击事件中调用。嵌入时发送现有消息，独立打开时使用普通链接。`../../#/` 按上述最终目录计算：从 `/atlas/chapters/north/index.html` 返回 `/atlas/#/`。现有接入示例 HTML 的链接使用了 `../../../#/`，子目录部署时会多退一级，正式章节不要照抄；本方案不替换那些示例页面。不能用章节在自己开发服务器根目录时的跳转结果替代最终路径验证。

主应用已检查消息类型、精确 origin 和当前 iframe 的 `contentWindow`。不要扩展成任意导航 URL 或使用 `'*'`。同源指协议、主机、端口都相同；独立开发服务器与主项目使用不同端口时，不适用此同源示例。默认在复制构建产物后的同源环境验证返回，无需为开发阶段改造主项目消息协议。

外部 HTTPS 托管属于另行协商的接入方式；需要双方明确 origin，且服务允许 iframe 嵌入。默认交付本地静态产物即可，不要求组员部署外网服务。

## 7. 界面与内容的最低要求

- 全中文主界面，正确的页面标题、标题层级及图片替代文本；所有按钮与导航可用键盘操作，焦点可见。
- 章节在 iframe 实际可用区域内排版，不假设拥有整个浏览器高度；主应用头尾会占用部分空间。需要滚动时允许章节内部正常滚动，避免固定高度裁掉正文。
- 至少检查桌面与 `390 × 844` 窄屏；窄屏可阅读、可操作，无意外横向滚动。画布按自身容器尺寸更新，非仅按父窗口尺寸计算。
- 若使用 WebGL、视频或音频，提供能力不足或加载失败时的文字/静态入口；音频由用户主动触发。长动画尊重减少动态效果的系统偏好。
- 若使用 Three.js，处理组件卸载、监听器移除、动画循环与资源释放；重载或离开章节后不持续产生重复循环。不要为章节额外常驻一套主项目全轴场景。
- 事实、年代和建筑关系保留可核对来源；图像、字体、模型保留来源和授权说明。导览示意不能标成精确测绘或历史复原。
- 正式章节的文案与内容由组员审核，交付时去掉“分区接入示例”等占位标识。不要把主项目现有示例或 Agent 自行设想的故事当成组员已确认的最终内容。

## 8. 实施顺序

1. **确认归属与内容输入**：记录分区 ID、已有工程和组员确定的需求。内容暂缺时先搭工程与接入边界，不擅自锁定主题。
2. **建立可运行工程**：配置独立依赖、npm 脚本、相对资源路径，完成空白页到真实页面入口的运行与构建检查。
3. **实现章节内容**：按本组要求组织页面、数据、视觉、交互及本地素材，保持父子边界。
4. **独立验证**：检查生产构建、资源加载、窄屏、键盘及主要交互，补全资料记录。
5. **集成交付**：交付完整构建目录，由集成负责人替换对应示例目录，再验证 iframe、独立打开、返回及子路径部署。
6. **记录交付**：在 `docs/handoff.md` 记录构建命令、实际检查结果、截图位置和已知限制。未执行的检查明确标注，不用“应该可用”替代结果。

## 9. 交付格式与主项目接收

每位组员提供：

1. 可复现的独立源码工程：源码、`package.json`、锁文件、工具配置与 README。
2. 当前源码生成的完整 `dist/`，可单独打包交付；不要求将生成目录提交进源码仓库。
3. `docs/sources.md` 与 `docs/handoff.md`，后者注明 `regionId`、构建时 Node 版本、启动/构建命令、接收目录、检查记录与已知限制。

主项目接收后的正确结构，例如北段：

```text
主项目/
└── public/
    └── chapters/
        └── north/
            ├── index.html
            ├── assets/     构建产物实际生成的全部资源
            └── ...         其余本地图片、模型、音频与数据
```

复制的是 `dist/` **内部文件**，不能变成 `north/dist/index.html`，也不能只交一个依赖外部资源的 HTML。替换前先比对并保留已有正式内容；清理旧资源只限本次接收的分区目录，不删除其他分区文件。

组员默认在自己的工程完成交付；主项目集成负责人负责替换 `public/chapters/{regionId}/`。没有主项目写入授权时，不直接操作其目录。保留默认 URL 时，无需修改 `src/data/heritage.ts`；确需更改契约时先与集成负责人沟通。

接收后主项目执行：

```bash
npm run build
npm test
npm run test:e2e
npm run preview -- --port 4173 --strictPort
```

构建把 `public/` 中的章节原样复制到主项目 `dist/`。浏览器检查工具缺失或某项检查未运行时如实记录。现有主项目 E2E 主要覆盖总览和北段示例返回，不能替代三个正式章节各自的人工/自动验证。

## 10. 接入验收清单

在主项目的生产预览 origin 下，逐段验证下列路径；表中路径均相对于主应用部署根目录：

| 分区 | 独立打开 | iframe 入口 |
| --- | --- | --- |
| 北段 | `chapters/north/index.html` | `#/chapter/north` |
| 中段 | `chapters/central/index.html` | `#/chapter/central` |
| 南段 | `chapters/south/index.html` | `#/chapter/south` |

- [ ] 自己的源码可安装依赖并构建；实际执行过的命令、版本与结果已记录。
- [ ] 生产预览下独立页面可用；Network 无运行资源 404，控制台无未处理错误。
- [ ] 从主项目入口可打开对应 iframe，内容和主要交互可用；重新载入与“独立打开”可用。
- [ ] 主应用返回按钮正常；若提供章节内返回，其消息或独立链接也正常。
- [ ] 直接刷新独立页面及其内部 hash 路由能继续显示，无 history 路由 404。
- [ ] 在 `/atlas/` 等非根部署路径实际验证过资源与返回链接。可将主项目完整 `dist/` 放在临时静态服务根的 `atlas/` 目录中检查，不为此改动源码。
- [ ] 桌面、窄屏、键盘焦点和滚动正常；如有画布，容器缩放后不溢出或失真。
- [ ] 断开外网但保持本地 HTTP 服务可访问，重新加载后核心内容与资源仍可用。
- [ ] 正式内容替换了示例标识；来源与素材授权记录齐全。
- [ ] 仅交付本分区内容，没有更改主项目总览、公共协议或其他组员模块。

如需在同一主项目工作区协作，先检查当前分支和脏文件，沿用用户当前授权；不要自动切分支、重置工作区或提交他人修改。独立章节仓库自行管理版本，不照搬主项目的分支名与提交权限。

## 11. 协议来源与后续变更

本方案依据下列主项目文件整理：

- `AGENTS.md`：范围、本地资源与协作约束。
- `docs/integration.md`：章节接入、相对路径与消息协议。
- `src/data/heritage.ts`、`src/data/types.ts`：分区、地标 ID 与入口登记。
- `src/components/ChapterView.tsx`、`src/lib/navigation.ts`：实际 iframe、返回校验与 URL 解析。
- `package.json`、`vite.config.ts`：现有工具链和构建方式。

方案交到独立项目后，上述文件路径指向**主项目**，不要求复制全部主应用源码。后续若主项目协议变更，先由集成负责人同步说明；Agent 不应凭空实现新协议。当前用户对自己章节的内容与设计要求优先于本文的目录和工具建议，但接入契约的变更仍需双方一致。
