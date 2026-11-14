# 乾清宫前白石平台纠错 · 2026-11-14

用户截图指出乾清宫前方应为白色平台。通过WSL路径读取并保留忽略目录工作副本，只作为模型问题反馈，不当作实景或历史图像。原截图显示殿前不规则月台及向南长甬路都被渲染为金色瓦面。

## 依据及建模决定

- **官方文字**：新增并通过Exa读取故宫博物院周苏琴撰稿的 `PAL-QIANQING`（2026-11-14）。支持乾清宫坐落单层汉白玉台基、殿前月台、正中丹陛接高台甬路与乾清门相连。此项不沿用仅支持整体高度的 `PAL-PLAN` 冒充月台材料证据。
- **地图几何**：沿用 `GEO-OSM` / `GEO-OVERPASS` 本地way/638981261（月台）和638807694（甬路）原轮廓、坐标；未刷新地图快照。普通 `building=yes` 标签不能单独证明存在有顶房屋。
- **错误原因**：两块未进入平台显示白名单，进入通用房屋分支，因而生成了金顶及木构。
- **修改**：[palaceMassing.ts](../../src/scene/palaceMassing.ts)增加两块白石平台；[architecture.ts](../../src/scene/architecture.ts)复用石台生成，甬路前后开放；[palacePlatforms.ts](../../src/scene/palacePlatforms.ts)对与甬路的共边裁去月台横栏。二维矢量/地面底图已有共用分类，随白名单同步，不另改章节合同。
- **显示解释**：平台与甬路采用0.20单位顶面以接续现有乾清宫基座，栏杆、层缝和0.002单位共边容差均为概览参数。地图height标签不作台高实测依据。未改变乾清宫殿身的金色双檐；未添加未经核对的铜龟、铜鹤等陈设。投影、地理快照、计数及哈希不变。

## 验证与缺口

本项截图为本项目模型，非现实照片或最终比赛验收。[图册](figures/README.md#2026-11-14--乾清宫前白石平台)保留修改前后局部视图。当前为 `cc0ed8d` 基线加共享未提交工作，不合并提交他人的改动；最终比赛提交号、精确台阶/栏杆节点、逐点高度及原图许可仍待补。


### 实际检查结果

- `npm test -- src/scene/palaceMassing.test.ts src/scene/palacePlatforms.test.ts src/scene/palaceArchitecture.test.ts src/scene/palaceFootprintClipping.test.ts --maxWorkers=1`：4文件35项通过，14.78秒。新增检查先复现两块屋面误分类和交界横栏，再修改实现；未放宽原检查。
- `npm run build`通过，1647模块，Vite阶段34.81秒；保留既有超过500kB分块提示。
- 已目视检查修改前、修改后斜视及近俯视，白石月台接长甬路，交界无横栏，隔离渲染pageerror为0。
- 86条来源ID及非空URL唯一，均有目录条目；12个快照文件大小/哈希一致；`git diff --check`通过。本轮未跑全套单测和E2E。

源码指纹（共享工作树，非独立发布提交）：

- `src/scene/palaceMassing.ts`：`18beacac603087fd0f0f160d8f0e2af7d8f131060f9a30ab50cfd0f870f696d1`
- `src/scene/palacePlatforms.ts`：`56f03f60fb9b827887ecce8ab22af794102b51cc407017235beeac1acc8d153a`
- `src/scene/architecture.ts`：`932c2d624f1117e3240b9f40d76041fdfa781cdece9f18a3e1b173c1a3507fe1`

实际主应用1440×1000及390×844检查：故宫详情ready约11.6秒，无页面错误、控制台错误/警告、失败请求及窄屏横向溢出；键盘Enter切二维地图成功，墙线路径有效。
