---
name: "鸿心 · 今日行动"
description: "Flat Vector Design：不透明柔和彩色圆形与统一圆角操作"
colors:
  ground: "#ffffff"
  paper: "#ffffff"
  ink: "#111111"
  muted: "#626262"
  line: "#d6d6d6"
  accent: "#175cff"
  project-early: "#f8e4ac"
  project-run: "#f6c9b8"
  project-steps: "#c3e2f4"
  project-read: "#dbd2f3"
  project-visit: "#f3d2df"
  project-early-ink: "#665020"
  project-run-ink: "#673e30"
  project-steps-ink: "#294e63"
  project-read-ink: "#4e3d70"
  project-visit-ink: "#673e52"
  focus: "#111111"
  hover: "#ededed"
  inverse: "#ffffff"
  accent-hover: "#0046dc"
  action-text: "#ffffff"
  night-ground: "#111111"
  night-ink: "#ffffff"
  night-muted: "#b5b5b5"
  night-line: "#424242"
  night-hover: "#292929"
typography:
  clock:
    fontFamily: "-apple-system, BlinkMacSystemFont, \"PingFang SC\", \"Microsoft YaHei\", sans-serif"
    fontSize: "clamp(58px, 7vw, 82px)"
    fontWeight: 650
    lineHeight: 1.15
    letterSpacing: "-.04em"
  intro:
    fontFamily: "-apple-system, BlinkMacSystemFont, \"PingFang SC\", \"Microsoft YaHei\", sans-serif"
    fontSize: "24px"
    fontWeight: 650
  headline:
    fontFamily: "-apple-system, BlinkMacSystemFont, \"PingFang SC\", \"Microsoft YaHei\", sans-serif"
    fontSize: "32px"
    fontWeight: 600
  title:
    fontFamily: "-apple-system, BlinkMacSystemFont, \"PingFang SC\", \"Microsoft YaHei\", sans-serif"
    fontSize: "28px"
    fontWeight: 650
  section:
    fontFamily: "-apple-system, BlinkMacSystemFont, \"PingFang SC\", \"Microsoft YaHei\", sans-serif"
    fontSize: "21px"
    fontWeight: 600
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, \"PingFang SC\", \"Microsoft YaHei\", sans-serif"
    fontSize: "15px"
    fontWeight: 400
  label:
    fontFamily: "-apple-system, BlinkMacSystemFont, \"PingFang SC\", \"Microsoft YaHei\", sans-serif"
    fontSize: "14px"
    fontWeight: 400
  hint:
    fontFamily: "-apple-system, BlinkMacSystemFont, \"PingFang SC\", \"Microsoft YaHei\", sans-serif"
    fontSize: "13px"
    fontWeight: 400
  caption:
    fontFamily: "-apple-system, BlinkMacSystemFont, \"PingFang SC\", \"Microsoft YaHei\", sans-serif"
    fontSize: "12px"
    fontWeight: 400
rounded:
  control: "14px"
  circle: "50%"
spacing:
  compact: "12px"
  control: "14px"
  group: "16px"
  roomy: "24px"
  section: "34px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.action-text}"
    rounded: "{rounded.control}"
    padding: "14px 24px"
    height: "54px"
  button-primary-hover:
    backgroundColor: "{colors.accent-hover}"
  button-ghost:
    rounded: "{rounded.control}"
    padding: "10px 14px"
  tab:
    rounded: "{rounded.control}"
    padding: "10px 15px"
  tab-selected:
    backgroundColor: "{colors.accent}"
    textColor: "white"
  field:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "12px 14px"
---

# Design System: 鸿心 · 今日行动

## Overview

**Creative North Star: "Flat Vector Design"**

Flat Vector Design 是当前锁定的视觉语言。任务圆形采用完全不透明的柔和彩色填充，搭配清楚的线性图标与文字；项目身份通过色彩保留，当前选择通过大小与位置突出。

本系统从 frontend/orb-preview 当前加载的 app.css 与 app.js 提取。黑白日夜背景、亮蓝任务操作和统一圆角形成稳定框架；首页以轻提示进入，子页以直接表单与独立项目榜单完成操作。玻璃变体仅为归档，不属于当前规范。

**Key Characteristics:**

- 不透明纯色与平面矢量轮廓。
- 柔和项目色在日夜主题和选择状态中保持。
- 统一 14px 控件圆角，圆形仅用于项目与状态点。
- 首页轻入口，子页蓝色操作，实时本机时钟。

## Colors

### Primary

亮蓝 accent 用于子页主操作、已选标签和当前选择点；悬停为 accent-hover，按钮文字为白色。首页不设大型蓝色进入按钮。

### Secondary

项目使用固定、不透明的柔和色：早起 project-early、跑步 project-run、步数 project-steps、阅读 project-read、拜访 project-visit。每组配有 project-*-ink 深色图标与文字。日夜切换和选中均不改变项目色。

**The Opaque Fill Rule.** 项目圆形使用不透明纯色；不使用渐变、背景模糊、高光或纹理。

### Neutral

日间白底、近黑前景，灰色说明与细分隔线；夜间用 night 系列反转背景与前景。焦点使用高对比前景色，错误反馈为加粗文字。所有实际色值以 frontmatter 为准。

## Typography

使用系统功能字体栈，中文优先 PingFang SC / Microsoft YaHei。

- 时钟：clamp(58px, 7vw, 82px)，移动端 64px，650 字重、1.15 行高、-.04em 字距、等宽数字。
- 首页标题：桌面 24px / 移动 22px，650；任务标题 28px / 26px，650。
- 子页标题：32px / 28px，600；分区标题 21px / 20px，600。
- 正文与榜单 15px，操作与状态 14px，说明 13px，表头和轻入口 12px。介绍、提示行高 1.7。
- 圆内项目名桌面 16px / 移动 15px，600，.02em 字距。主按钮 650；本人榜单行 600、前景色。今日步数 36px，累计步数 30px。

## Layout

最大页宽 1120px，子页内容宽 680px，首页操作提示区域最大宽 400px。桌面页边距 28px 40px 36px，首页 100svh、最小高 680px；圆形区域 flex 占据余量。

移动断点 600px：页边距 20px 22px 24px，首页 height:auto、min-height:100svh；品牌字隐藏。项目圆桌面宽 clamp(210px,29vw,304px)，移动 196px。桌面邻项缩放 .65、位移 ±104%；移动缩放 .62、位移 ±103%；更远项隐藏，邻项始终不透明。圆形区最小高桌面 250px / 移动 240px。

首页依次为头像/主题与榜单入口、标题与时钟、项目圆、任务状态、任务说明、轻入口及切换控件。子页全宽表格，数值右对齐。重复间距为 12px、14px、16px、24px，分区间距 34px。

## Elevation & Depth

整体为平面纯色。项目圆仅保留轻微下偏柔影：默认 `0 6px 18px -12px #00000026`，悬停 `0 8px 20px -12px #00000032`。没有内圈高光、立体球面或玻璃材质；按钮、输入、上传区与表格不使用阴影。

**The Quiet Offset Rule.** 仅项目圆形使用轻微下偏柔影；控件与表格不增加材质和悬浮层次。

## Shapes

所有主要控件统一 14px 圆角，包含头像、按钮、主题开关、标签、输入与上传区。项目圆为圆形，无描边和内外伪元素；上传预览图无圆角。表格与输入使用一像素 line 分隔或边界。

项目图标使用统一内联 SVG：24 单位视框、1.7 描边、圆端点与圆连接；桌面 58px / 移动 48px，跑步是可识别的奔跑人形。圆内图标文字间距桌面 16px / 移动 13px。普通导航图标通常 24px，主题开关 20px。

## Components

### Entry and Task Circles

项目圆采用纯色、图标和项目名。中心圆点击进入；邻圆点击先选择。左右箭头、圆点、水平滑动及方向键切换任务。首页上滑、轻提示按钮或 PageDown 进入项目。返回通过返回按钮或 Escape，不设返回滑动手势。

### Buttons and Tabs

子页主按钮亮蓝全宽，最小高 54px，内边距 14px 24px，悬停加深、按下下移 1px。透明导航为 44px 级目标；主题开关为 44px 方形。未选标签有 line 描边，选中亮蓝填充，通过 aria-pressed 表示。焦点为 3px focus、外移 5px；禁用透明度 .5。

### Fields, Upload and Rankings

输入最小高 50px、12px 14px 内边距；上传区最小高 200px、24px 内边距，paper 底和 line 实线边界。上传输入聚焦时外层显示轮廓。图像仅本地预览，最高 240px。

榜单表头 12px / 500，正文 15px，行上下内边距 18px。本人行加粗但不另设卡片。项目独立排名，个人/队伍可切换；累计步数只在个人资料展示。未确定规则显示空态。

### Time, Theme and Motion

时钟展示本机时分，每 30 秒更新。06:00–17:59 自动日间，其余为夜间；手动选择在本次会话覆盖自动，刷新恢复自动。项目色与亮蓝操作色保持不变。

圆形切换为 420ms cubic-bezier(.16,1,.3,1)，页面进出为 580ms 同曲线的垂直位移；减少动态效果时取消。状态文案明确未体验、已体验与待开放，不将本地体验作为业务完成证明。

## Do's and Don'ts

### Do:

- Do 用大小与位置表示当前任务，并保留项目色和文字。
- Do 对按钮、标签、头像、输入和上传区统一使用 14px 圆角。
- Do 保留独立项目榜、文字状态、键盘焦点及减少动态效果支持。
- Do 区分本地体验、示例数据与真实业务完成。

### Don't:

- Don't 恢复玻璃模糊、半透明材质、渐变、高光或纹理。
- Don't 在首页恢复大型蓝色进入按钮；蓝色主操作用于子页任务。
- Don't 添加返回滑动手势或综合分排名。

范围：仅当前前端交互原型，无真实微信、OCR、用户系统或后端提交。归档变体与审核截图不是当前发布样式或位图资产。未将业务规则或不可达的历史返回手势代码固化为设计规则。
