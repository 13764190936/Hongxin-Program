# 鸿风域名演示发布（2026-11-14）

- 地址：https://demo.jerry1325.cn/
- 当前发布：早起页v15工作区预览（大号北京时间、清晨倒计时、macOS风景与时段状态）。基线提交为c5f5ab1 / design-v1.0.0；当次发布含早起页更新，现已按用户要求归档为design-v1.1.0。
- 性质：静态设计预览，无真实用户、后端打卡、微信步数或持久化。

## 站点

公共DNS已解析至111.229.82.161；原来只新增了解析、未配置服务器虚拟主机，因此HTTP跳HTTPS后握手失败。本次新增专用域名站点，Caddy已自动取得证书，HTTP重定向HTTPS。

- 独立目录：/home/ubuntu/hongfeng-design-demo/releases/preview-20261114
- 独立容器：hongfeng-design-demo（caddy:2-alpine，8080仅容器网络，不新增主机公网端口；静态目录只读，自动恢复）。
- 网络：yan-cloud_default，经已有yan-caddy代理与终止TLS。
- 配置：/home/ubuntu/yan-cloud/Caddyfile，只追加demo.jerry1325.cn块；通过validate后热重载，原配置内容前缀完整保留。
- 备份：/home/ubuntu/hongfeng-design-demo/Caddyfile.before-demo-domain-20261114
- 旧演示hongxin-ui-demo及其他网站保留，未更新其文件。

## 验证

HTTPS证书正常校验（未跳过），首页与全部11个发布文件均HTTP200，哈希与本地发布包一致。HTTP为308跳转HTTPS。README、.env、来源清单与.git/HEAD等未发布路径返回404。公开包不包含Git历史、文档、截图、来源清单或凭据。

在内置浏览器实际打开公网首页，点击进入早起页并切换到倒计时预览正常。浏览器验证不等于微信或真机验收。原有IP演示内部HTTP200。独立只读核验亦确认首页、morning.js及Big Sur图与本地一致。

## 回滚

只移除本次新增的demo.jerry1325.cn站点块，校验并热重载Caddy，再停止独立hongfeng-design-demo容器。不要用整份旧Caddyfile覆盖可能已更新的其他站点；备份仅作对照。原演示容器与目录不受影响。

后续已按用户要求归档design-v1.1.0；未推送Git远程。
