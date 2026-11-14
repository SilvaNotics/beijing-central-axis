# 项目文档

本目录按使用目的组织。项目介绍见 [根目录 README](../README.md)；工程现状以代码、结构化数据和注明版本的验证记录为准。

## 运行与开发

| 文档 | 内容 |
| --- | --- |
| [开发指南](development.md) | 环境、安装、命令、构建、静态部署与资源限制 |
| [架构与实现边界](implementation-plan.md) | 页面、路由、数据、地图、章节的职责与关键决定 |
| [独立章节接入](integration.md) | 稳定 ID、入口路径、iframe 返回协议和交付方式 |
| [章节 Agent 指南](../CHAPTER_AGENT_GUIDE.md) | 三位章节作者的独立工程组织与交付约定 |
| [进度与验证记录](progress.md) | 本轮构建、静态检查、未执行事项及版本关联 |
| [WSL 测试资源排错](testing-resources.md) | 历史 OOM 证据、串行隔离配置及内存限制边界 |

## 研究与证据

[研究总览](research/README.md)集中列出来源、快照、15 项地标取舍和专题记录。文化事实、地图几何、照片观察、模型解释和软件检查各有适用范围，不能相互替代。

- 逐地标查依据：[证据矩阵](research/evidence-matrix.md)。
- 查来源和验证状态：[来源目录](research/source-catalogue.md)、[结构化登记](research/source-register.json)。
- 查数据如何变成模型：[研究方法](research/methodology.md)、[地理数据说明](research/building-footprints.md)、[快照清单](research/data-manifest.json)。
- 查画面与限制：[模型校核图册](research/figures/README.md)。旧截图只对应各自轮次，不代表本轮重新验收。

## 文档维护

运行与命令只在开发指南维护；入口协议只在接入文档维护；当前状态只在进度记录维护。历史研究结论和失败记录保留在原专题及历史归档中，并指向替代记录。

历史入口：[初始交接](archive/progress-2026-11-13.md)、[研究总览旧编排](research/research-history.md)、[来源目录旧编排](research/source-catalogue-history.md)、[早期检索](research/sources.md)。这些文件不作为当前完成状态的汇总。
