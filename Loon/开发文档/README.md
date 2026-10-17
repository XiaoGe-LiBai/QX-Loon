# Loon 官方开发与配置文档手册

> 本手册整理自 Loon 官方文档（[https://nsloon.app/docs/intro](https://nsloon.app/docs/intro) 与 [GitHub 官方文档库](https://github.com/Loon0x00/loon0x00.github.io)）。
> 涵盖 Loon 全部核心模块：节点协议、节点筛选、策略与策略组、分流规则、新旧版复写 (Rewrite)、新旧版脚本 (Script)、Script API、插件 (Plugin) 开发、DNS、通用配置 (General) 以及 URL Scheme 自动化。

---

## 📑 完整文档目录

### 00. 概述
- [00-概述.md](./00-概述.md) - Loon 简介、下载途径与社区支持

### 01. 节点 (Node)
- [01-节点/01-节点配置.md](./01-节点/01-节点配置.md) - 支持的代理协议配置语法（Shadowsocks, ShadowsocksR, VMess, Trojan, Snell, WireGuard, HTTP, SOCKS5 等）
- [01-节点/02-节点筛选.md](./01-节点/02-节点筛选.md) - 节点筛选机制与正则表达式匹配规则（Node Filter）

### 02. 策略 (Policy)
- [02-策略/01-策略总览.md](./02-策略/01-策略总览.md) - 策略机制与内置基础策略（DIRECT、REJECT、PROXIES 等）
- [02-策略/02-策略组.md](./02-策略/02-策略组.md) - 策略组配置语法（select、url-test、fallback、ssid、load-balance）

### 03. 规则 (Rule)
- [03-规则/01-规则总览.md](./03-规则/01-规则总览.md) - 规则匹配机制与优先级
- [03-规则/02-域名规则.md](./03-规则/02-域名规则.md) - `DOMAIN`、`DOMAIN-SUFFIX`、`DOMAIN-KEYWORD`、`DOMAIN-SET`
- [03-规则/03-IP规则.md](./03-规则/03-IP规则.md) - `IP-CIDR`、`IP-CIDR6`、`GEOIP`、`IP-ASN`
- [03-规则/04-端口规则.md](./03-规则/04-端口规则.md) - `PORT`、`DEST-PORT`、`SRC-PORT`
- [03-规则/05-协议规则.md](./03-规则/05-协议规则.md) - `PROTOCOL`（TCP/UDP）
- [03-规则/06-HTTP规则.md](./03-规则/06-HTTP规则.md) - `USER-AGENT`、`URL-REGEX`
- [03-规则/07-订阅规则.md](./03-规则/07-订阅规则.md) - `RULE-SET` 远程规则订阅与性能指标
- [03-规则/08-逻辑规则.md](./03-规则/08-逻辑规则.md) - `AND`、`OR`、`NOT` 组合多条件逻辑规则
- [03-规则/09-FINAL规则.md](./03-规则/09-FINAL规则.md) - `FINAL` 兜底策略规则

### 04. 复写 (Rewrite)
- [04-复写/01-复写(新版Rewrite).md](./04-复写/01-复写(新版Rewrite).md) - **推荐** Loon 3.5.1 (978)+ 起支持的全新 Rewrite 统一配置语法（URL重写、Header修改、Body修改、Mock响应、拒绝请求等）
- [04-复写/02-复写(旧版语法).md](./04-复写/02-复写(旧版语法).md) - 旧版单行动作语法（header-rewrite, response-body, reject 等）兼容参考

### 05. 脚本 (Script)
- [05-脚本/01-脚本(新版Script).md](./05-脚本/01-脚本(新版Script).md) - **推荐** Loon 3.5.1 (983)+ 起支持的全新统一 Script 语法（Request、Response、Cron、Network Changed、Generic）
- [05-脚本/02-Script_API.md](./05-脚本/02-Script_API.md) - **核心** Loon JavaScript 运行环境 API 完整字典（`$httpClient`、`$persistentStore`、`$notification`、`$loon` 等）
- [05-脚本/03-脚本(旧版语法).md](./05-脚本/03-脚本(旧版语法).md) - 旧版 `http-request`、`http-response`、`cron` 语法参考

### 06. 插件 (Plugin)
- [06-插件/01-插件规范与配置.md](./06-插件/01-插件规范与配置.md) - 插件文件结构、元数据指令、`[Argument]` 参数系统与组件集成

### 07. DNS
- [07-DNS/01-DNS配置.md](./07-DNS/01-DNS配置.md) - 常规 DNS、DNS over HTTPS (DoH)、DNS over TLS (DoT) 配置
- [07-DNS/02-DNS映射.md](./07-DNS/02-DNS映射.md) - 本地 Host 静态解析与泛域名映射（Hostmap）

### 08. 通用配置 (General)
- [08-通用配置/01-General通用配置.md](./08-通用配置/01-General通用配置.md) - Loon 全局通用配置选项详解（网络协议栈、Wi-Fi 访问、日志、分流模式、MITM 证书等）

### 09. URL Scheme
- [09-Scheme/01-URL_Scheme.md](./09-Scheme/01-URL_Scheme.md) - 外部应用跳转与 iOS 快捷指令（Shortcuts）自动化交互

---

## ⚡ 常用速查表

### 1. 规则执行优先级
Loon 的网络流量处理流程自上而下依次为：
1. **DNS / Hostmap** 解析
2. **复写 (Rewrite)**：在网络请求发出前或响应后介入修改
3. **分流规则 (Rule)**：按照规则列表**自上而下匹配**，一旦命中立即执行对应策略（或由逻辑规则组合决定）
4. **FINAL 规则**：所有规则未命中时的兜底策略

### 2. 配置文件 vs 插件 优先级
- **本地配置 > 远程订阅 > 插件**
- 在同类配置中，同级文件自上而下匹配生效。

### 3. 脚本开发核心对象
- `$request`: 当前拦截的请求对象（url, method, headers, body）
- `$response`: 当前拦截的响应对象（status, headers, body）
- `$done(object)`: 脚本结束并提交修改或模拟响应（必须调用）
- `$httpClient`: 发起外部异步 HTTP 请求（get / post / put / delete）
- `$persistentStore`: 本地键值持久化存储（read / write）
- `$notification`: 系统本地横幅推送通知（post）
- `$loon`: Loon 内部状态控制与节点切换

---
*文档更新时间：2026年3月*
