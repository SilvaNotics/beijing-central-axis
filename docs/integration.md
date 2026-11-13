# 独立章节接入契约

主应用负责城市概览、章节入口、返回概览和独立打开；章节负责自己的内容、页面样式与内部交互。默认用 iframe 接入，不限制章节使用 React、Vue 或原生 HTML。

## 固定入口

| 分区 | 主应用路由 | 仓库中的默认文件 | `entryUrl` |
| --- | --- | --- | --- |
| 北段 | `#/chapter/north` | `public/chapters/north/index.html` | `chapters/north/index.html` |
| 中段 | `#/chapter/central` | `public/chapters/central/index.html` | `chapters/central/index.html` |
| 南段 | `#/chapter/south` | `public/chapters/south/index.html` | `chapters/south/index.html` |

`public/` 不是浏览器 URL 的一部分。正式内容可以直接替换对应文件夹，保留 `index.html` 即无需更改入口；也可以在 `src/data/heritage.ts` 修改相应分区的 `entryUrl`。

这些文件目前是明确标注的「分区接入示例」，演示独立样式、局部导览和返回边界。正式作者应替换完整目录，不要误把示例文字当作最终章节。

## 登记数据

主应用的分区记录使用以下契约。以代码中的实际类型和已存在的遗产点 ID 为准，不另建不一致的登记表。

```ts
interface Region {
  id: 'north' | 'central' | 'south';
  title: string;
  kicker: string;
  subtitle: string;
  description: string;
  color: string;
  entryUrl: string;
  siteIds: string[];
}
```

例如只替换北段的 URL：

```ts
entryUrl: 'chapters/north/index.html'
```

`siteIds` 必须引用现有遗产点。沿用稳定的 `id`，避免让已分享的哈希路由失效。相对入口由主应用按 Vite 的部署基础路径解析；不要写本机磁盘路径，也不要把根路径 `/chapters/…` 当成子目录部署的通用做法。

## 构建和复制

原生网页可直接放入分区目录。React / Vue 等构建产物按以下步骤交付：

1. 让构建资源路径相对入口。Vite 章节设置 `base: './'`，或用等效命令 `vite build --base=./`。
2. 内部路由采用 hash 模式；若采用 history 模式，章节作者必须独立提供服务器回退配置。主应用的静态部署不能替章节处理 history 路由。
3. 将章节 `dist/` **里面的文件**完整复制到对应分区文件夹，保留 assets、图片和数据文件。最终应得到 `public/chapters/north/index.html`，而不是 `…/north/dist/index.html`。
4. 用本地 HTTP 服务分别打开章节与主应用检查，再执行主应用的生产构建与预览。Vite 会把 `public/` 原样复制进主应用 `dist/`。

```ts
// 章节自己的 vite.config.ts
import { defineConfig } from 'vite';
export default defineConfig({ base: './' });
```

不要依赖主应用的 React 版本、CSS 变量或 DOM 结构；iframe 中的资源、样式与状态由章节自己管理。不要使用远程字体、CDN 脚本或必须联网的地图资源作为本地展示的前提。

## 返回主应用

主应用始终提供自己的「返回总览」入口。章节可以额外发送可选消息，但消息协议仅负责返回，不传递任意 HTML、脚本或导航 URL：

```js
// 本地同源章节：仅在点击返回按钮时调用
if (window.parent !== window) {
  window.parent.postMessage({ type: 'axis:return' }, window.location.origin);
}
```

同源示例独立打开时，普通链接 `../../../#/` 返回同一部署基础路径下的主应用。作为 iframe 打开时，按钮处理器阻止该链接的默认导航并发送消息。不要将主应用套进章节自己的 iframe。

父页面接受消息时，必须同时检查消息类型、来源窗口与精确 origin：

```ts
const entryOrigin = new URL(resolvedEntryUrl, window.location.href).origin;
function receiveMessage(event: MessageEvent) {
  if (event.source !== iframeRef.current?.contentWindow) return;
  if (event.origin !== entryOrigin) return;
  if (event.data?.type !== 'axis:return') return;
  window.location.hash = '#/';
}
```

更换当前 iframe 时同步更新 `entryOrigin` 和监听器，卸载时移除监听器。不要只检查 `event.data.type`，不要接受任意窗口发送的返回指令。发件方的 `targetOrigin` 不要用 `'*'`。

若章节托管在外部 HTTPS 站点，子页面不能把自己的 origin 当成主应用 origin。作者需在双方明确登记后，使用精确的父应用 origin 作为 `targetOrigin`；父应用仍以解析后的外部章节 origin 加 `contentWindow` 校验消息。本地同源是默认方案。

## 外部入口和失败处理

外部 URL 只接受 HTTPS。浏览器的 `X-Frame-Options` 或 CSP `frame-ancestors` 可能禁止嵌入；混合内容、访问权限和网络故障也可能使外部页面无法显示。跨域页面的实际加载结果不能仅凭 iframe 的 `load` 事件可靠判断。

章节框架应始终保留「独立打开」链接（新标签页使用 `rel="noopener noreferrer"`），让用户能直接打开已登记入口。不要通过代理抓取或修改外部页面绕过嵌入限制。受浏览器限制而不能内嵌的入口应选择独立打开，或由作者提供允许嵌入的静态产物。

## 交付检查

- 在 `/chapters/{id}/index.html` 独立打开时，内容可见、局部交互可用，无主应用依赖。
- 在主应用章节路由中，页面不套壳溢出，父层返回和独立打开可用。
- 章节内返回消息只来自当前 iframe，精确 origin 校验生效。
- 构建后本地预览没有资源 404；部署到子路径时相对资源仍正确。
- 窄屏没有横向溢出，所有功能可用键盘操作，内容有恰当标题与替代文本。
- 最终章节去掉接入示例标签，补全自己审核的资料来源、图片授权与内容说明。
