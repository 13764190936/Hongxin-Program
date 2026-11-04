#!/bin/zsh
# 鸿心运动打卡本地演示启动脚本（仅本机 127.0.0.1）
set -u

cd "$(dirname "$0")" || exit 1
mkdir -p .runtime

PORT="${PORT:-8790}"
HOST="127.0.0.1"
BASE_URL="http://${HOST}:${PORT}"
LOG_FILE=".runtime/service.log"
PID_FILE=".runtime/server.pid"

# 优先使用环境变量或 PATH 中的 node；否则用本机已知安装位置。
NODE_BIN="${NODE_BIN:-}"
if [ -z "$NODE_BIN" ]; then
  NODE_BIN="$(command -v node 2>/dev/null || true)"
fi
if [ -z "$NODE_BIN" ]; then
  for candidate in \
    "/Users/jiang/.dsh/dsh-runtimes/dsh-primary-runtime/dependencies/node/bin/node" \
    "/opt/homebrew/bin/node" \
    "/usr/local/bin/node" \
    "/usr/bin/node"; do
    if [ -x "$candidate" ]; then
      NODE_BIN="$candidate"
      break
    fi
  done
fi

if [ -z "$NODE_BIN" ] || [ ! -x "$NODE_BIN" ]; then
  echo "未找到 Node.js。请安装 Node.js 18+，或设置 NODE_BIN 指向 node 可执行文件。"
  echo "按回车关闭窗口。"
  read -r
  exit 1
fi

if curl -fsS "${BASE_URL}/api/health" >/dev/null 2>&1; then
  echo "检测到演示服务已在运行：${BASE_URL}"
  open "${BASE_URL}"
  echo "已打开浏览器。关闭此窗口不会停止已在运行的服务。"
  exit 0
fi

echo "使用 Node：$NODE_BIN"
echo "启动服务：${BASE_URL}（日志：${LOG_FILE}）"
: > "$LOG_FILE"

"$NODE_BIN" server/index.js >> "$LOG_FILE" 2>&1 &
SERVER_PID=$!
echo "$SERVER_PID" > "$PID_FILE"

cleanup() {
  if kill -0 "$SERVER_PID" 2>/dev/null; then
    echo ""
    echo "正在停止演示服务（PID ${SERVER_PID}）…"
    kill "$SERVER_PID" 2>/dev/null || true
  fi
}
trap cleanup INT TERM EXIT

READY=0
for _ in {1..60}; do
  if curl -fsS "${BASE_URL}/api/health" >/dev/null 2>&1; then
    READY=1
    break
  fi
  if ! kill -0 "$SERVER_PID" 2>/dev/null; then
    break
  fi
  sleep 0.25
done

if [ "$READY" -ne 1 ]; then
  echo "服务启动失败，日志如下："
  tail -n 40 "$LOG_FILE"
  echo "按回车关闭窗口。"
  read -r
  exit 1
fi

echo "服务已就绪，正在打开浏览器…（Ctrl-C 停止服务）"
open "${BASE_URL}"
echo "演示说明：虚构数据 · 模拟微信步数 · MOCK 识别 · 重启重置。"
echo "----------------------------------------"
tail -n +1 -f "$LOG_FILE" &
TAIL_PID=$!

trap 'kill "$TAIL_PID" 2>/dev/null; cleanup; exit 0' INT TERM
wait "$SERVER_PID"
