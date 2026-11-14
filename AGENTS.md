# 项目工作约定（2026-11-07 最新）

- 用户与 Codex 讨论需求、设计、架构和思路；WorkBuddy 负责具体实现、测试与修复。默认不再调用 CodeBuddy CLI，也不让 Codex代写业务代码或持续跟跑。
- 只有用户明确重新要求 CodeBuddy 协作时才启用旧 codebuddy-collaboration 技能。
- 共同工作目录：`/Users/jiang/Documents/ChatGPT/鸿风软件开发/Hongxin-Program`。WorkBuddy 若在沙箱，必须先完成 `_collaboration/README.md` 的共享读写检查；不得把沙箱副本冒充同一个本地目录。
- 项目需求看 `docs/REQUIREMENTS.md`，客户问题看 `docs/CUSTOMER-QUESTIONS.md`，Demo看 `sports-demo/README.md` 和测试记录。旧材料仅作历史参考。
- 普通讨论简短，按需读取；新聊天接续学习时读取父目录 LEARNING.md，同一轮未变化内容不反复读。
- 用户说保存/归档/同步或明确交付时批量记录；产品资料留项目docs，教学资料留学习记录。
- 用户明确要求的文件整理、导出和协作约定维护可直接完成；不因此修改业务代码，不默认执行完整测试或外部提交。

## 2026-11-14 产品与设计依据更新

- 当前总纲：`docs/HONGFENG-MASTER-V1.0.md`；需求入口：`docs/REQUIREMENTS.md`；设计入口：`DESIGN.md`。
- 与旧材料冲突时，以新总纲为准；旧窗口、截图/OCR 必需、日榜与队伍功能、Flat Vector Design 不直接沿用为新版本要求。
- MVP 仅运动、读书、拜访及统一基础设施；重要未定规则看 `docs/CUSTOMER-QUESTIONS.md`。
- 保留既有 Codex / WorkBuddy 分工，不因总纲中的开发阶段描述自动授权 Codex 修改业务代码。

## 2026-11-14 本地 Git 协作

- 统一使用父级“鸿风软件开发”根目录仓库，不建立嵌套仓库；流程见 [../VERSION-CONTROL.md](../VERSION-CONTROL.md)。
- 开始先看状态；完成独立任务后检查差异，只提交本任务明确路径，不覆盖他人未提交改动。
- 现阶段仅本地版本记录，无远程自动同步；保持既有 Codex / WorkBuddy 分工。

## 2026-11-14 正式设计原型基线

- 用户已确认并要求归档 `design-v1.0.0`；当前界面入口为 `frontend/hongfeng-preview/README.md`，设计决策见 `docs/design/HONGFENG-DESIGN-V1.0.0.md`。旧 home-wheel/prototype 与 orb-preview 仅作历史，不自动回退其视觉和导航。
- 早起是首页右滑进入、左滑返回的独立空间，不属于运动，也不是第四个轮播项。本条覆盖总纲原文的旧界面分组。
- 本版为设计原型，无真实登录、服务端打卡或持久化；归档不表示真实业务完成，不改变后续实现分工。

## 2026-11-14 最新接续分工与里程碑

- 用户确认首版工作目前约完成20%，保存为design-v1.1.0；后续实现、测试与修复交给CodeBuddy，取代旧文中的默认WorkBuddy分工。Codex继续讨论需求、设计和思路。
- 当前交接入口：`docs/CODEBUDDY-HANDOFF.md`。当前源码仍为frontend/hongfeng-preview，旧版保留；20%是用户阶段判断，不代表真实业务验收完成。
- 本次只更新本地版本与交接，不自动调用CodeBuddy CLI、不组织双AI循环、不自动推远程或再次部署。后续发布按用户具体任务执行。

## 2026-11-15 GitHub 与其他编辑器

- 仓库：`13764190936/Hongxin-Program`，默认分支main。当前设计、业务范围与CodeBuddy分工保持不变；操作入口：docs/GITHUB-SYNC.md。
- 当前Mac父仓库使用subtree同步本子目录，不初始化嵌套仓库，不直接推送父仓库main。其他编辑器在独立目录克隆GitHub时，本文件所在目录就是仓库根目录，可正常pull/push，不依赖父级AGENTS.md或VERSION-CONTROL.md。
- 开始前检查状态并拉取他人更新，只提交本任务文件；不强制覆盖。不自动调用CLI、不自动推送或部署；按用户具体任务执行。
