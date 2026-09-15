# 京东 Cookie & wskey 提取与 Bncr 静默同步插件（Loon）

配合 `参考/jd-ck-apk-v2` 无界（Bncr）后台的 iOS 代理端抓取方案。

## 适用环境
- **客户端**：iOS Loon 3.x+
- **对接端**：Bncr 无界服务端（`https://bncr.xiaoge.ink/api/Doraemon/loginCallback_receive`）

## 抓取凭据
1. **pt_key + pt_pin**（临时网页/活动凭据）
2. **wskey + pin**（长期免密凭据，支持底层接口缺失 pin 时的跨会话自动记忆缝合）

## 核心文件
- `JD_GetCookie.plugin`：Loon 插件配置文件
- `jd_cookie.js`：核心提取与上报脚本（支持 HTTP/2 拆分 Cookie、凭证变更指纹去重、动态 UA 自适应与静默外发）
