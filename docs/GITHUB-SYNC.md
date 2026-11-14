# GitHub 与编辑器接续

更新：2026-11-15。当前设计基线为 `design-v1.1.0`，首版约20%的阶段说明见 [CodeBuddy 交接](CODEBUDDY-HANDOFF.md)。

## 仓库与版本

- GitHub：https://github.com/13764190936/Hongxin-Program ，公开仓库，默认分支 `main`。
- 本次同步标签：`github-design-v1.1.0`，包含当前设计源码、图片、验证截图、需求与交接文档。原 GitHub 历史保留。
- 当前设计入口：`frontend/hongfeng-preview/`；预览：https://demo.jerry1325.cn/ 。这是设计原型，真实微信和业务数据闭环仍待建设。
- GitHub 只接收项目文件；本机父目录的学习记录和其他历史工程不在同步范围内。密钥、环境文件、数据库、依赖及临时交接文件不上传。
- GitHub 同步与网站发布分开。本次更新仓库不再次部署，也没有建立自动部署。

## 在其他编辑器打开

在 CodeBuddy 或其他支持 GitHub 的编辑器中，选择从 GitHub 打开/克隆 `13764190936/Hongxin-Program`，分支选 `main`。也可以在新的、独立目录使用：

```sh
git clone git@github.com:13764190936/Hongxin-Program.git
```

克隆后，`frontend/`、`docs/` 和 `server/` 直接位于仓库根目录，不再多套一层 `Hongxin-Program/`。先读根目录 `AGENTS.md`、本说明、`docs/CODEBUDDY-HANDOFF.md` 和当前需求。这个独立克隆不需要本机父目录的文件。

每次开始工作先检查状态、拉取最新版本；完成后仅提交本次明确文件，再正常推送到 GitHub。遇到他人新提交先合并，不能强制覆盖。不要在现有本机项目子目录里再次 clone 或 git init。不同编辑器的环境文件和依赖仍需各自配置；GitHub 不会替代运行环境。

## 继续使用当前 Mac 工作目录

本机保持一个父仓库：`/Users/jiang/Documents/ChatGPT/鸿风软件开发`；业务文件在其中的 `Hongxin-Program/`。远程名为 `github`，使用 Git subtree 映射目录。首次桥接已验证远端等于旧导入基线 `9597af8`，再保留双方提交历史完成连接。

开始或接收其他编辑器的更新时：

```sh
cd "/Users/jiang/Documents/ChatGPT/鸿风软件开发"
git status --short
git subtree pull --prefix=Hongxin-Program github main
```

先妥善处理已有改动，不能靠 reset/clean 清掉别人的工作。完成一个任务并检查差异后，只提交该任务的明确文件；需要同步时执行：

```sh
git subtree push --prefix=Hongxin-Program github main
```

上述命令只发送已提交的业务工程。父仓库 `main` 不直接推送，不设置它跟踪远端 `main`；不用 `git push --all`、`--mirror`、`--force`，也不推父仓库原有标签。本机默认普通 push 已禁用，subtree 显式推送可正常执行。

本机 `codex/github-export` 是首次桥接的导出分支，包含项目根目录布局，不是日常开发分支。继续在父仓库 `main` 工作即可。SSH 私钥仅留本机；其他电脑自行通过 GitHub 登录或配置自己的 SSH 权限。

## 同步核验

发布前核对导出树与 `Hongxin-Program/` 一致、旧远端提交为导出提交的祖先，检查只包含项目文件及相关提交说明。发布后读取 GitHub `main` 与标签，确认提交一致。本次未纳入已有未跟踪文件 `_collaboration/codebuddy-ready.txt`。
