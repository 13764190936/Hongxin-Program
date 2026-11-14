#!/bin/zsh
set -e
python3 - "$(dirname "$0")/frontend/hongfeng-preview" <<'PY'
from pathlib import Path
import subprocess, sys, tempfile, time, urllib.request, urllib.error, webbrowser
root = Path(sys.argv[1]).resolve()
url = 'http://127.0.0.1:18874/'
def running():
    try:
        with urllib.request.urlopen(url, timeout=1) as response:
            data = response.read()
    except (urllib.error.URLError, TimeoutError):
        return False
    if data != (root / 'index.html').read_bytes():
        raise RuntimeError('18874端口正被另一份页面占用，请先关闭那份预览服务后再试。')
    return True
try:
    if not running():
        log = Path(tempfile.gettempdir()) / 'hongfeng-design-preview.log'
        with log.open('ab') as output:
            proc = subprocess.Popen([sys.executable, '-m', 'http.server', '18874', '--bind', '127.0.0.1', '--directory', str(root)], stdin=subprocess.DEVNULL, stdout=output, stderr=output, start_new_session=True)
        for attempt in range(30):
            time.sleep(.1)
            if running():
                break
            if proc.poll() is not None:
                raise RuntimeError(f'预览服务未能启动，详情见：{log}')
        else:
            raise RuntimeError(f'预览服务启动超时，详情见：{log}')
    webbrowser.open(url + '?release=design-v1.0.0')
    print('鸿风设计预览已打开。关闭此窗口不影响预览。重启电脑后可再次双击本文件。')
except Exception as error:
    print(f'无法打开预览：{error}')
    sys.exit(1)
PY
