#!/bin/zsh
# 双击这个文件即可在本地启动演示（macOS 会在「终端」里运行它）
# 关闭窗口或按 Control + C 就停止服务。

cd "$(dirname "$0")/server" || {
  echo "找不到 server 目录，请确认这个文件放在项目根目录。"
  read -r "?按回车关闭"
  exit 1
}

# 你的 Mac 可能没装全局 Node，但 WorkBuddy 自带一份；这里逐个找
find_node() {
  if command -v node >/dev/null 2>&1; then command -v node; return; fi
  for p in \
    "$HOME/.workbuddy/binaries/node/versions/"*/bin/node \
    /opt/homebrew/bin/node \
    /usr/local/bin/node \
    "$HOME/.nvm/versions/node/"*/bin/node
  do
    [ -x "$p" ] && { echo "$p"; return; }
  done
}

NODE_BIN="$(find_node)"

if [ -z "$NODE_BIN" ]; then
  echo "没有找到 Node.js（22 或更高版本）。"
  echo ""
  echo "两个办法："
  echo "  1. 装一个：https://nodejs.org 下载 macOS 安装包"
  echo "  2. 或者直接用线上版，不需要本地环境"
  echo ""
  read -r "?按回车关闭"
  exit 1
fi

echo "使用 Node：$NODE_BIN"
"$NODE_BIN" -v
echo ""
echo "正在启动…（首次启动会自动写入虚构测试数据）"
echo ""

# 等服务起来再打开浏览器；用环境变量 HX_NO_OPEN=1 可跳过
if [ -z "$HX_NO_OPEN" ]; then
  ( sleep 1.5; open "http://127.0.0.1:8787/" ) &
fi

"$NODE_BIN" src/server.js

# 服务退出后不要立刻关窗，方便看报错
echo ""
read -r "?服务已停止。按回车关闭窗口"

