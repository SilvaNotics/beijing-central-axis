# 独立章节接入契约

主应用负责总览、章节入口、iframe 框架、返回与独立打开；章节负责自己的内容、样式、资源及交互。默认接收静态入口 URL，可采用 React、Vue 或原生网页。独立工程指南见 [CHAPTER_AGENT_GUIDE.md](../CHAPTER_AGENT_GUIDE.md)。

## 固定入口与分工

| region ID | 主应用路由 | 接收产物目录 | 默认 entryUrl |
| --- | --- | --- | --- |
| `north` | `#/chapter/north` | `public/chapters/north/` | `chapters/north/index.html` |
| `central` | `#/chapter/central` | `public/chapters/central/` | `chapters/central/index.html` |
| `south` | `#/chapter/south` | `public/chapters/south/` | `chapters/south/index.html` |

登记在 `src/data/heritage.ts`，类型定义在 `src/data/types.ts`。稳定地标 ID 与归属如下；这些是产品分章，不是另立的官方遗产分区。

| 分区 | 地标 ID |
| --- | --- |
| 北段 | `bell-drum`、`wanning`、`jingshan` |
| 中段 | `forbidden-city`、`shejitan`、`taimiao`、`duanmen`、`jinshui` |
| 南段 | `tiananmen`、`square`、`zhengyang`、`tiantan`、`xiannongtan`、`southern-road`、`yongdingmen` |

`public/chapters/north/` 已于 2026-11-14 接入正式「纸雕立体书地图」章节。`central/` 与 `south/` 仍为**分区接入示例**。交付这些分区的正式章节时替换对应目录，不要把示例文案、示意小地图或工程骨架标记为最终作品。北段交付说明见 [章节 README](../public/chapters/north/README.md) 和 [交付记录](../public/chapters/north/docs/handoff.md)。

## 入口登记

`Region` 保留 `id`、`title`、`kicker`、`subtitle`、`description`、`color`、`entryUrl`、`siteIds` 字段。只更换内容时保留原 ID、归属和 URL；确需更换路径时仅修改该分区 `entryUrl`。

`public/` 不出现在浏览器 URL 中。相对入口按主应用 Vite 基础路径解析，不写本机磁盘路径，不用 `/chapters/...` 假设总是部署在域名根目录。外部入口仅允许 HTTPS；实现会拒绝其他协议、反斜杠和上级目录段。

## 独立构建与复制

1. 章节资源采用相对路径。Vite 章节使用 `base: './'`，等效构建参数为 `vite build --base=./`。
2. 内部路由优先 hash。采用 history 路由时，作者必须提供章节自己的服务器回退，父应用不能代为处理。
3. 将章节 `dist/` **内部文件**完整复制到对应接收目录，最终应有 `public/chapters/north/index.html`，不要多套一层 `dist/`。
4. 同时保留 assets、图片、字体、音频、模型和数据。章节不依赖父应用的 React、CSS、DOM 或初始化状态。
5. 用 HTTP 服务独立打开，再检查父应用嵌入。主应用构建会把 `public/` 原样复制进最终 `dist/`。

本地展示不依赖远程字体、CDN 脚本或在线地图瓦片。正式章节的素材授权、事实引用与内容可访问性由作者确认。

## 返回协议

父应用始终提供返回按钮。章节自己的返回链接使用 `../../#/`：从 `/atlas/chapters/north/index.html` 返回 `/atlas/#/`，在根路径部署时也成立。此前示例的 `../../../#/` 会多退一级，已在 2026-11-14 修正。

同源 iframe 中，章节在用户点击返回时阻止链接默认导航，并发送：

```js
if (window.parent !== window) {
  window.parent.postMessage({ type: 'axis:return' }, window.location.origin);
}
```

父应用只接收当前 iframe 的 `contentWindow`、解析后的入口 origin 以及 `event.data.type === 'axis:return'` 同时匹配的消息。监听器随入口切换和组件卸载清理，见 `src/components/ChapterView.tsx`。

独立打开时保持普通链接导航；不要在章节内再套一个主应用 iframe，也不要使用 `'*'` 作为消息目标。外部 HTTPS 章节需由双方明确登记精确父应用 origin，不能将章节自己的 origin 当成父应用 origin。

## 加载与外部站点

父应用提供加载提示、重载与独立打开。iframe 的 `load` 事件无法可靠证明跨域页面可交互；外站的 CSP `frame-ancestors`、`X-Frame-Options`、访问权限或网络故障可能禁止嵌入。

外部入口不允许嵌入时，使用独立打开或由作者交付允许嵌入的静态产物，不通过代理篡改外部页面。新标签页链接保留 `rel="noopener noreferrer"`。

## 交付核对

- 章节独立打开时内容可见、内部交互可用；嵌入时无重复外壳或横向溢出。
- 父层返回、章节返回、重载和独立打开行为可用，消息来自当前 iframe。
- 根路径和子目录部署均无资源路径错误；资源齐全，不依赖开发端口。
- 窄屏布局、键盘焦点、标题、替代文本及素材授权完成核查。
- 正式版本去掉接入示例标签，并记录实际检查、构建结果和交付版本。

本表是交付要求，不代表本轮已执行浏览器检查；实际验证范围见 [进度记录](progress.md)。
