# 中段与南段手机地图修订 · 2026-11-15

本记录只涉及界面响应式布局，不改变地标事实、地图坐标、热点位置或素材。截图为软件界面检查，不是历史或测绘证据。

- 中段：竖排题跋在窄屏转为顶部短题跋；390px 独立页的方形地图由 258px 扩大到 374px。
- 南段：默认完整显示横幅画卷；“放大查看”显示约 760px 的画卷并支持横向浏览，“查看全图”恢复完整画卷。热点最小触控区域为 44px。最初尝试默认放大导致两侧不可见，已按用户反馈改为默认全图。
- 入口 ID、iframe URL 与返回协议保持原样。

## 实际验证

环境：WSL2、Node.js 24.20.0、Playwright Chromium。

- `NODE_OPTIONS=--max-old-space-size=1024 npm run build`：通过，1648 个模块，Vite 31.30 秒；既有大分块提示保留。
- `npm test`：44 个文件、200 项通过，143.37 秒。此轮执行在最后一次南段全图/放大切换修订之前；最终切换行为由下列浏览器检查验证。
- `npx playwright test e2e/chapter-maps.spec.ts --workers=1 --reporter=line`：最终版本 4 项通过，39.3 秒。独立页面与 iframe 均覆盖 320×844、390×667、390×844、768×1024、820×844、844×390、1440×950；检查地图尺寸、无页面横向溢出、全图/放大切换、键盘横向浏览、全部 11 个景点的打开和 Escape 关闭、焦点恢复及返回总览。页面未捕获到 JavaScript 异常。
- 三个修改过的南段脚本均通过 `node --check`；`git diff --check` 通过。
- 未运行全部主应用 E2E，未验收真实 iOS/Android 或屏幕阅读器。

## 截图

- [中段独立页面，390px](central-standalone-390.png)
- [中段 iframe，390px](central-iframe-390.png)
- [南段完整画卷，390px](south-standalone-390.png)
- [南段 iframe，390px](south-iframe-390.png)

实现版本可通过 `git log -- e2e/chapter-maps.spec.ts` 定位。
