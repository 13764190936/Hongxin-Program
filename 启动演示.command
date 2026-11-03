#!/bin/zsh
# 双击这个文件即可启动演示（macOS 会在「终端」里运行它）
# 关闭窗口或按 Control + C 就停止服务。

cd "$(dirname "$0")/server" || {
  echo "找不到 server 目录，请确认这个文件放在项目根目录。"
  read -r "?按回车关闭"
  exit 1
}

if ! command -v node >/dev/null 2>&1; then
  echo "没有找到 Node.js。请先安装 Node 22 或更高版本：https://nodejs.org"
  read -r "?按回车关闭"
  exit 1
fi

echo "正在启动…（首次启动会自动写入虚构测试数据）"
echo ""

# 等服务起来再打开浏览器；用环境变量 HX_NO_OPEN=1 可跳过
if [ -z "$HX_NO_OPEN" ]; then
  ( sleep 1.5; open "http://127.0.0.1:8787/" ) &
fi

node src/server.js

# 服务退出后不要立刻关窗，方便看报错
echo ""
read -r "?服务已停止。按回车关闭窗口"
