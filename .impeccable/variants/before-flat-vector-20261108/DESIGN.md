---
name: "鸿心 · 今日行动"
description: "黑白背景与彩色轻质感圆形、实时钟与亮蓝操作"
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
  control: "4px"
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

**Creative North Star: "黑白行动时钟"**

黑白背景与彩色轻质感圆形与实时钟构成首页的识别，亮蓝色集中指示操作与选中控件。各项目采用独立纯色，当前与邻项保持同一项目配色；依靠中心位置、比例、图标与文字表达焦点，只添加轻微厚度，不使用强拟物材质。

本系统从 frontend/orb-preview 的当前 app.css/app.js 提取，只约束该原型表面。日间白底黑字，夜间反转；子页保持细线表格与直接表单，延续项目独立排名和清晰返回路径。

**Key Characteristics:**

- 彩色平面项目：当前项目居中放大，邻项缩小露出；名称与图标辅助识别。
- 亮蓝用于主操作、选中标签与当前选择标记。
- 本机实时钟与日夜反转。
- 柔和圆角、细线与功能字体。

## Colors

### Primary

亮蓝（accent）用于主操作、已选标签及当前选择点；悬停使用 accent-hover。主按钮文字使用 action-text，选中标签使用白色。

**The Action Blue Rule.** 蓝色标识操作与选中控件，不为不同任务编造独立色系。

### Neutral

日间 ground/paper 为白色，ink 为近黑，muted 为辅助灰，line 为浅灰，hover 为浅灰悬停面。夜间 ground/paper 与 inverse 为近黑，ink/focus 为白色，muted、line、hover 分别使用对应 night token。焦点始终跟随高对比前景色。错误反馈采用前景色加粗并保留文字说明，不依赖额外语义颜色。

## Typography

全站使用平台系统功能字体，完整字体栈见 frontmatter，无独立装饰字体。

- **Clock**：桌面 clamp(58px, 7vw, 82px)，移动端 64px；650 字重、1.15 行高、-.04em 字距、等宽数字。
- **Intro**：桌面 24px / 移动 22px，650，-.02em 字距。
- **Headline**：子页标题桌面 32px / 移动 28px，600，-.03em 字距。
- **Title**：任务名桌面 28px / 移动 26px，650，-.02em 字距。
- **Section**：榜单标题桌面 21px / 移动 20px，600。
- **Body / Label / Hint / Caption**：15px 正文与榜单、14px 操作与状态、13px 说明、12px 表头；介绍和说明行高 1.7。
- 主按钮 650；表头 500；自己的榜单行 600、前景色。今日步数 36px，累计步数 30px，使用等宽数字。

## Layout

最大页宽 1120px，子页内容最大宽 680px，主要按钮区域最大宽 400px。桌面页内边距 28px 40px 36px；首页 100svh、最小高 680px，以纵向 flex 让圆形区域吸收余量。介绍顶部间距 30px。

600px 为移动断点：内边距 20px 22px 24px，首页 height:auto、min-height:100svh，可纵向浏览；品牌字隐藏，介绍顶部间距 28px。圆形桌面宽 clamp(210px, 29vw, 304px)，移动 220px；邻项缩放 .65，保持不透明，桌面横移 ±104% / 移动 ±91%；更远项目隐藏。圆形区最小高桌面 250px / 移动 240px。

表格全宽，数值右对齐，以细行线分组。间距以用途复用 12px、14px、16px、24px；分区上间距 34px，不推导额外比例尺。

## Elevation & Depth

当前表面完全平面化，无阴影、渐变或球体高光。层次由黑白填充反转、描边、比例及留白表达。

**The Flat Circle Rule.** 任务圆形使用轻微明暗变化的项目色填充，允许低强度明暗渐变与向下柔影，不使用强反光或高光内圈。

## Shapes

任务圆形与状态点保持圆形。圆形以各项目色为基底叠加低强度明暗，图标及名称使用该项目专用对比色，昼夜主题不改变项目颜色。头像、按钮、输入框、标签与上传区使用 12px 圆角；主要按钮16px、头像14px、上传区16px；上传图预览不加圆角。上传区一像素实线，榜单为一像素分隔线。线性 SVG 通常 24px，圆形内统一 56px，描边 1.7。

## Components

### Buttons and Tabs

主按钮全宽、最小高 54px、14px 24px 内边距，亮蓝底；悬停加深，按下下移 1px。透明导航和主题开关为 44px 级目标；开关 44px 方形、细线边界。未选标签有 line 描边，选中标签亮蓝填充，aria-pressed 表达选择。

焦点轮廓为 3px focus、外移 5px；禁用透明度 .5。圆点切换目标至少 30px × 44px，选中标记拉长至 22px。

### Fields and Upload

输入最小高 50px、12px 14px 内边距，paper 背景与 muted 描边。上传区最小高 200px、24px 内边距、ink 实线边界；悬停使用 hover。上传输入聚焦时外层显示焦点轮廓。预览图最大高 240px，仅作本地预览。

### Ranking Table

表头 12px / 500，数据 15px，行上下内边距 18px，自己的行加粗为 600。项目子页和右上统一入口共享榜单；不合并计分，累计步数只在个人资料展示。未确认项目保留文字空态。

### Clock, Theme and Task Selection

首页时钟展示本机时分，每 30 秒更新。自动模式按本机时间 06:00–17:59 日间、18:00–05:59 夜间；手动开关覆盖本次会话的自动判断，刷新后恢复自动。主题由 CSS 变量反转，不改变蓝色操作色。

中心圆点击进入、邻圆点击先选择；左右箭头、圆点、滑动及方向键提供等价切换路径。选择移动为 420ms cubic-bezier(.16,1,.3,1)，页面进出为 580ms 同曲线垂直位移；减少动态效果时取消。任务文字状态区分未体验、已体验与待开放；不将本地体验解释为真实打卡完成。

## Do's and Don'ts

### Do:

- Do 以居中放大的彩色项目圆形表达当前任务，项目名称与图标同时可见。
- Do 保留独立项目榜、个人/队伍范围与统一榜单入口。
- Do 保留文字状态、可见键盘焦点及减少动态效果支持。
- Do 明确标注本地体验、示例数据与待开放状态。

### Don't:

- Don't 恢复任务渐变、阴影、高光或旧绿色操作控件。
- Don't 用综合分或累计步数榜替换已确认的独立项目排名。
- Don't 把本地时钟或本地体验状态当作服务器业务完成证据。

未固化的内容：OCR、后端提交、积分与业务完成判定。旧版白绿渐变设计已被当前实现取代；审核截图不是随产品发布的位图素材。

## 项目配色补充
早起琥珀 #f8e4ac、跑步橙 #f6c9b8、步数青蓝 #c3e2f4、阅读紫 #dbd2f3、拜访玫红 #f3d2df。全部项目使用深色同色系图标与文字。项目颜色在日夜主题及选中/未选中时保持一致；不表达完成、失败或其他业务状态。黑白背景与亮蓝操作按钮保留。参考方向为 ChatGPT、苹果和 DeepSeek 的简洁层级与留白，未复制其品牌素材或宣称逐项复刻。

## 最新质感修订
用户要求从纯平面适度加回光影：项目圆形叠加低强度纵向亮暗，向下柔影为 0 12px 28px -16px #00000032，悬停略增强；不加镜面反射。按钮、输入框和标签12px圆角，主按钮16px、头像14px、上传区16px。主按钮仅有轻微蓝色向下柔影，表格和内容区保持平面。类别配色、黑白背景与亮蓝操作不变。此修订取代原4px方角/完全无光影约定。

最新配色修订：项目提高明度、降低饱和度，早起奶油黄、跑步浅蜜桃、步数雾蓝、阅读淡薰衣草、拜访柔粉；图标和名称使用深色同色系。每个圆形左上柔光、下方小柔影，保持黑白背景和亮蓝操作按钮。此条覆盖之前较暗的浓色项目配色。

## 液态玻璃视觉试版（待用户选定）
当前 index.html 在 app.css 后加载 glass.css：浅色项目透色、背景柔化、细亮边、局部反光和向下柔影；黑白页面、亮蓝主要操作与原有交互保留。圆形背后用轻量色带作为透光参照。使用网页 CSS 近似玻璃观感，并非苹果原生 Liquid Glass 或真实物理折射。提供减少透明效果与不支持 backdrop-filter 时的实色回退。移除 index.html 中 glass.css 的引用即可恢复上一版，不需要修改后端。此为视觉比较试版，未确定为最终风格。

最新首页交互：移除独立的蓝色进入按钮，项目下方改为项目用途说明、体验状态和轻量下滑提示；点击当前圆形、提示文字、PageDown 或首页底部向下滚动可进入。手机在圆形/信息区域向下拖动超过65px进入，横向滑动仍切换项目；短屏可从其他页面区域正常滚动。任务页上传、同步等操作按钮保留。

最新返回交互：任务页说明下方提供“在这里上滑，返回项目选择”手势区，向上滑动超过65px返回并保留当前项目。上传区、表单和排行榜仍正常滚动，不全页截获上滑。桌面在任务页顶部向上滚动或按PageUp同样返回；原返回按钮和Escape保留。手机手势需真机验证，不能把桌面滚动核查称为手机触摸验收。

最新气泡内容试版：移除项目气泡内的自绘简笔图标，以32px、600字重的项目名称居中展示，邻项随圆形整体缩放。玻璃材质、浅色分类和导航手势保持不变；导航与主题等功能图标仍保留。

用户纠正：保留项目图像，已恢复并重画统一圆润线条图标：日出、跑步路线、脚印、书本、公文包；名称16px、图标58px、描边1.45。此条取代纯文字气泡试版。

跑步图标按用户要求改为跑步人形，取代路线图标；其他项目不变。

手势方向最终修正：手指上滑进入任务子页（dy<-65），手指下滑在返回区回到首页（dy>65）；进入页面向上运动，返回向下运动。鼠标向下滚动进入/向上滚动返回沿用浏览器滚动语义。已同步服务器客户演示。

用户最新决定：取消任务页滑动返回及提示、顶部滚动返回和PageUp返回；保留点击返回首页与Escape。首页上滑进入子页面不变。

手机尺寸微调：600px以下项目气泡220→196px，图标58→48px，名称15px；邻项缩放.62、横移±103%，增加留白。桌面尺寸保留。
