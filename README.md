# 鸿心徒步 · 重建项目

本仓库用于产品设计与WorkBuddy开发协作。当前阶段：流程原型v0.2已修订并完成浏览器基本走查；尚无可运行小程序、后端、数据库或上线环境。

## 最新课程行动方向（先读）

负责人已将主线调整为“课程关联每日行动打卡、多企业员工、后台统计”。

- [最新需求与后端接手说明](docs/ACTION-BACKEND-HANDOFF.md)
- [行动口径表](docs/ACTION-METRICS.md)：四项行动的判定、状态机、排行口径。**改规则先改这里**
- [最新前端预览](frontend/action-preview/index.html)：今天、课程、排行、团队、我的；含创建/加入团队UI。下载后用浏览器打开。
- [前端运行与模拟边界](frontend/action-preview/README.md)
- [后端最小闭环](server/README.md)：`cd server && npm run seed && npm start` → http://127.0.0.1:8787/ 可点、可写库
- [新方向评估](docs/REVIEW-03.md)：变化、可行性、风险与待拍板项

旧`prototype/index.html`保留历史，不能直接当作新版前端。所有新前端数据为模拟，后端尚未接入生产；现有工作进展请以DEVLOG最新编号为准。

## 从这里开始

1. [WorkBuddy接手说明](WORKBUDDY.md)
2. [开发日志](docs/DEVLOG.md) ← **想知道"改了什么、改到哪一步"，只看这个**
3. [产品需求与开发交接文档](docs/PRD.md)
4. [逐项功能与排行榜清单](docs/FEATURE_INVENTORY.md)
5. [待确认决策](docs/DECISIONS.md)
6. [第一轮交付：需求核对与技术方案](docs/DELIVERY-01.md)
7. [开发任务](docs/TASKS.md)
8. [v0.2流程修订与验证](docs/PROTOTYPE-REVIEW-02.md)
9. [页面原型](prototype/index.html)（下载后用浏览器打开）

负责人负责业务决策；产品与交互设计在文档中沉淀；WorkBuddy负责技术方案、代码实现和验证。现状、建议和待确认规则必须区分。

## 状态

- 已完成：部分用户端调研、文档基线、v0.2 HTML流程原型与浏览器基本走查。
- 未完成：全部功能覆盖、关键统计口径、其他角色和后台、小程序实现、手机实测及上线。
- 技术栈：已有建议，待验证和确认。
- 数据：仅使用虚构测试数据，不含旧系统真实用户记录。

## 协作方式

WorkBuddy可在有权限的GitHub账号下克隆本仓库，也可先打开本地目录。建议每次从main更新，在独立功能分支修改，通过PR说明改动、验证与剩余问题。

私有仓库需要WorkBuddy所使用的GitHub身份具备仓库权限；本仓库不会自动完成WorkBuddy账号连接或授权。

