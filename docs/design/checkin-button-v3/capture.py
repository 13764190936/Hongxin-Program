#!/usr/bin/env python3
"""截图 + 录屏 index.html 的画板。2x PNG、pulse.gif、pulse.mp4。

用法（需要 playwright，系统 Chrome 在 /usr/bin/google-chrome）：
  python3 capture.py            # 截图 + 录屏
  python3 capture.py --stills   # 只截图
  python3 capture.py --stills --only overview-white,countdown-stages   # 只截指定画板
  python3 capture.py --video    # 只录屏（pulse.gif / pulse.mp4，2.4s 一个周期）
"""
import argparse
import shutil
import subprocess
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent
URL = (ROOT / "index.html").as_uri()

STILLS = [
    ("art-overview-warm", "overview-warm"),
    ("art-overview-white", "overview-white"),
    ("art-countdown-stages", "countdown-stages"),
]

PULSE = "btn-available"
PERIOD_MS = 2400      # 呼吸动画周期
CYCLES = 1            # 录一个完整周期
FPS = 25
# 61 帧：第 0 帧与第 60 帧同为周期起点（t=0 与 t=2400ms），首末帧一致，循环处无跳帧
FRAMES = FPS * CYCLES * PERIOD_MS // 1000 + 1


def launch(p):
    return p.chromium.launch(
        executable_path="/usr/bin/google-chrome",
        headless=True,
        args=["--allow-file-access-from-files", "--disable-font-subpixel-positioning"],
    )


def open_page(browser, width=1184, height=900):
    context = browser.new_context(device_scale_factor=2, viewport={"width": width, "height": height})
    page = context.new_page()
    page.goto(URL, wait_until="load")
    page.evaluate("() => document.fonts.ready.then(() => true)")
    return context, page


def shoot(page, el_id, out):
    loc = page.locator(f"#{el_id}")
    loc.scroll_into_view_if_needed()
    loc.screenshot(path=str(out), type="png")
    print(f"wrote {out.name}  box={loc.bounding_box()}")


def stills(only=None):
    with sync_playwright() as p:
        browser = launch(p)
        _, page = open_page(browser)
        # 总览里的可打卡按钮停在呼吸动画的代表性一帧，避免截到随机相位
        page.evaluate(
            "(t) => document.getAnimations().forEach(a => { a.pause(); a.currentTime = t; })",
            PERIOD_MS // 4)
        for el_id, name in STILLS:
            if only and name not in only:
                continue
            shoot(page, el_id, ROOT / f"{name}@2x.png")
        browser.close()


def video(frames_dir):
    if frames_dir.exists():
        shutil.rmtree(frames_dir)
    frames_dir.mkdir(parents=True)
    with sync_playwright() as p:
        browser = launch(p)
        # 画板 480×480 纯白底，视口留出边距；只截画板区域，不截整页
        _, page = open_page(browser, width=700, height=700)
        page.emulate_media(reduced_motion="no-preference")
        # 录制时只留 #art-available 一个画板并置于页面顶部，保证整块画板都在视口内
        page.add_style_tag(content=".top, .artboard:not(#art-available) { display: none !important; }")
        page.wait_for_timeout(300)
        box = page.locator("#art-available").bounding_box()
        clip = {"x": box["x"], "y": box["y"], "width": box["width"], "height": box["height"]}
        print(f"art-available box={box} frames={FRAMES} @ {FPS}fps")
        # 暂停动画并用 Web Animations API 逐帧定位，帧间严格等间隔
        page.evaluate(
            """() => {
                const el = document.getElementById(%r);
                el.getAnimations({subtree: true}).forEach(a => a.pause());
            }""" % PULSE,
        )
        for i in range(FRAMES):
            page.evaluate(
                """([id, t]) => {
                    document.getElementById(id).getAnimations({subtree: true})
                        .forEach(a => { a.currentTime = t; });
                }""",
                [PULSE, i * PERIOD_MS / (FRAMES - 1)],
            )
            page.screenshot(path=str(frames_dir / f"f{i:03d}.png"), clip=clip)
        browser.close()
    common = ["ffmpeg", "-y", "-loglevel", "error", "-framerate", str(FPS), "-i", str(frames_dir / "f%03d.png")]
    pal = frames_dir / "palette.png"
    subprocess.run(common + ["-vf", "palettegen=max_colors=256:stats_mode=full", str(pal)], check=True)
    subprocess.run(
        common + ["-i", str(pal), "-lavfi", "paletteuse=dither=sierra2_4a:diff_mode=rectangle", "-loop", "0",
                  str(ROOT / "pulse.gif")], check=True)
    subprocess.run(
        common + ["-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "16", "-movflags", "+faststart",
                  str(ROOT / "pulse.mp4")], check=True)
    for name in ("pulse.gif", "pulse.mp4"):
        print(f"wrote {name}  {(ROOT / name).stat().st_size // 1024} KB")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--stills", action="store_true")
    ap.add_argument("--video", action="store_true")
    ap.add_argument("--frames-dir", default="/tmp/checkin-button-v3-frames")
    ap.add_argument("--only", default="", help="只截这些画板，逗号分隔，如 overview-white,countdown-stages")
    a = ap.parse_args()
    only = [s.strip() for s in a.only.split(",") if s.strip()] or None
    if a.video or not a.stills:
        video(Path(a.frames_dir))
    if a.stills or not a.video:
        stills(only)
    print("done")
