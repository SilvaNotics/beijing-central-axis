# 文华殿东北院落绿地与石板路校核 · 2026-11-14

基准HEAD `cc0ed8d55275c06e2b3542862e834acf157314d0`，结果来自有同期未提交变更的共享工作树，不是独立最终发布提交或比赛验收。未将其他会话的大量修改混入提交。

## 依据与表达边界

用户最新截图通过WSL实际读取：`codex-clipboard-1a76423c-2721-4423-8b0e-8f830c44b14c.png`。该截图及文字登记为`USR-PALACE-COURT-GREENERY-20261114`，仅定位模型遗漏及用户要求。复看原`USR-PALACE-WALL-PLAN-20261114`示意图，并按`GEO-OSM` / `GEO-OVERPASS`现有数据定位文华殿东北、南三所南侧空院。地图将独立way/43519305命名为“影壁”；本轮不据此认定其专门历史用途。

补分块种植、柏树示意与纵横石板路，影壁两端留绕行铺面。西界顺服务院墙折返向内收进；边缘避让建筑、院墙、河道，末端不保留细碎种植残条。原影壁两端位置、长度、独立状态保持，未补接长墙。新增院落层与四处命名花园分别生成，避免把它宣称为第五座考证花园。

`src/scene/palaceLandscape.ts`提供共享几何，`cityPlan.ts`绘制相同种植与石板；三维仍由已有`architecture.ts`接入。铺地单元2米、板缝0.12米、路宽、树种、树量及院落外边缘均为可辨识的概览参数，不是实测。绿色区域不证明实地连续草坪。没有修改原始WGS84数据、坐标转换、水面快照或数据要素计数。

联网检索文华殿/传心殿相关机构说明，没有获得这片空院逐点种植与铺装测绘，因此未将这些检索页用于证明新增几何或计入采用来源。当地真实种植分界、逐树、路宽、铺石规格、影壁功能与完整历史变化仍待补证；原参考图作者、年代及许可仍待核。

最终院落程序结果：158行种植片、19棵示意树、746块石板；这些是渲染数量，不是实地普查。

## 实际验证

- `npm test -- src/scene/palaceLandscape.test.ts src/scene/palaceWater.test.ts src/scene/palaceWaterConnections.test.ts src/scene/palaceWallLayout.test.ts --maxWorkers=1`：4文件20项通过。涵盖原四园/14桥回归、独立影壁保留、石板/种植不入建筑与河道、影壁两端可绕行、实际模型有石板网格。
- 最后去除底部细碎种植条后，单独重跑`palaceLandscape.test.ts`，4项通过。未执行全项目测试或完整E2E，不以相关检查代替全量通过。
- `npm run build`通过，1648模块；仍有原有500kB分包提示。
- Playwright使用项目实际`loadCityData()`、`createLandmark`、`createMaterials`与`bake`渲染，包含既有河道及四处显示连接。1300×1500俯视和斜视均目视检查，零页面错误；最终局部截图在移除底部种植残条后重启自己的4187服务生成。
- 主应用1280×800载入就绪11.464秒，390×844没有横向溢出；键盘聚焦“二维地图”后Enter切换成功，墙线SVG路径128441字符；页面错误、控制台警告、请求失败均0。主应用截图生成于最终去除底部细条前，局部最终图包含该小调整；不混称完全同一状态。
- 来源92条、92个唯一ID、89个非空唯一URL；数据清单13个文件的大小与SHA-256逐项核对一致。

[俯视局部](figures/palace-court-top-after.png) · [斜视局部](figures/palace-court-oblique-after.png) · [桌面页面](figures/palace-court-app-after.png) · [窄屏页面](figures/palace-court-mobile-after.png) · [二维地图](figures/palace-court-flat-after.png)。均为项目模型或页面截图，非实景照片。有限视角和净距检查不能证明整个故宫所有穿模均解决。
