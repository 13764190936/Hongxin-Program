# 鸿心 · 打卡圆钮 v3

本目录是已接受的打卡圆钮交互原型，供评审查看。它不是设计基线，不替代 `docs/design/HONGFENG-DESIGN-V1.0.0.md`。选定背景为纯白 `#FFFFFF`。日历不在本原型范围内。

- `index.html` — 单页 demo，纯 HTML/CSS，无 JS、无外网 CDN。右上角可切换「两版对比 / 版 1 / 版 2」。
- `capture.py` — 截图与录屏脚本（Playwright + 系统 Chrome + ffmpeg）。

## 重新导出

```sh
pip install playwright          # 或在 venv 中安装；无需 playwright install
python3 capture.py              # 全部：3 张 2x PNG + pulse.gif + pulse.mp4
python3 capture.py --stills     # 只截图
python3 capture.py --video      # 只录呼吸动画
```

## 画板 id

| id | 产出 |
|---|---|
| `#art-overview-warm` | `overview-warm@2x.png` |
| `#art-overview-white` | `overview-white@2x.png` |
| `#art-countdown-stages` | `countdown-stages@2x.png` |
| `#art-available` | `pulse.gif` / `pulse.mp4`（960×960，25fps，61 帧一个周期 2.4s，首末帧同相位，循环无跳帧） |

呼吸动画按钮：`.btn--available`（scale 1→1.04，外扩环透明度 0.35→0，2.4s ease-in-out infinite）。钮与环同一圆心，`python3 check_concentric.py` 可检测偏差。
进度环为内联 SVG（`stroke-dashoffset`），映射到小程序时可改为 SVG 图片或 `conic-gradient`。
