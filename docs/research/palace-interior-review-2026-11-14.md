# 故宫殿廊分部与短墙纠错

2026-11-14 从既有来源登记和证据矩阵整理，补齐原来缺失的专题文件。本轮不新增历史结论，也不将此前会话核验写成重新联网核验。

## 采用依据

`PAL-WUYING`、`PAL-WENHUA` 为故宫博物院苏怡撰稿的武英殿、文华殿说明。既有记录支持前后殿及连接穿廊关系、主殿开间与屋顶形制。`GEO-OVERPASS`、`GEO-OSM` 提供本地 H/工字形轮廓和院墙数据；文字不提供这些轮廓的测绘认证。

## 实现与替代关系

[palaceSideHalls.ts](../../src/scene/palaceSideHalls.ts) 将前殿、后殿和穿廊分部表达；[architecture.ts](../../src/scene/architecture.ts) 为长条房屋限制檐下退距，避免按长宽比例缩小后形成大段空缺。0.18 平台、1.48 殿高与 0.88 廊高等仍为模型参数，原始 WGS84 环和快照不因此改变。

早期曾尝试按近邻自动闭合院墙断口。该解释已经由 [内墙排布纠错](palace-wall-layout-review-2026-11-14.md) 的显式院界与接墙规则取代；不能继续把旧自动补线称为当前结果。后续穿模检查见 [接头复核](palace-collision-review-2026-11-14.md) 和 [其他位置复核](palace-collision-more-review-2026-11-14.md)。

## 验证与缺口

检查定义见 [palaceSideHalls.test.ts](../../src/scene/palaceSideHalls.test.ts)，历史模型图见 [校核图册](figures/README.md)。本轮只整理资料链和静态检查，不运行测试或重新拍摄截图。现状逐房清单、穿廊宽度、檐高、墙端真实构造与原网页长期归档仍待补。软件构建状态以 [进度记录](../progress.md) 为准。
