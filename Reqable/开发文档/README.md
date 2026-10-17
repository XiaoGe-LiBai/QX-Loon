# Reqable 官方开发与使用文档手册

> 本手册整理自 Reqable 官方文档（[https://reqable.com/zh-CN/docs/introduction/](https://reqable.com/zh-CN/docs/introduction/) 与 [GitHub 官方文档库](https://github.com/reqable/reqable-docs)）。
> 包含 Reqable 全量中文技术文档及配套的高清操作截图与架构图（采用本地相对路径持久化存储，无需外链，离线 100% 正常渲染）。

---

## 📑 完整文档目录

### 00. 介绍 (Introduction)
- [00-介绍/index.md](./00-介绍/index.md) - Reqable 整体介绍、跨平台特性、协议支持与许可声明

### 01. 开始使用 (Getting Started)
- [01-开始使用/index.md](./01-开始使用/index.md) - 开始使用总览
- [01-开始使用/installation/index.md](./01-开始使用/installation/index.md) - 安装与 CA 根证书配置指引（桌面端与移动端）
- [01-开始使用/layout/index.md](./01-开始使用/layout/index.md) - 界面结构与工作区分区详解
- [01-开始使用/tutorial-capture/index.md](./01-开始使用/tutorial-capture/index.md) - 快速上手：API 调试（抓包、检查流量、修改请求）
- [01-开始使用/tutorial-api/index.md](./01-开始使用/tutorial-api/index.md) - 快速上手：API 测试（新建请求、发送与断言）
- [01-开始使用/collaboration/index.md](./01-开始使用/collaboration/index.md) - 团队协同与工作区同步

### 02. API 调试 (Capture & Debugging)
- [02-API调试/01_list.md](./02-API调试/01_list.md) - 调试列表操作与视图控制
- [02-API调试/02_column.md](./02-API调试/02_column.md) - 列表列配置与自定义字段
- [02-API调试/03_explorer.md](./02-API调试/03_explorer.md) - 资源管理器与域名树形结构
- [02-API调试/04_tabs.md](./02-API调试/04_tabs.md) - 详情标签页操作（Header / Body / Cookie 等）
- [02-API调试/10_search.md](./02-API调试/10_search.md) - 全局搜索与高级过滤语法
- [02-API调试/11_proxy.md](./02-API调试/11_proxy.md) - 代理协议与前置代理级联设置
- [02-API调试/12_ssl.md](./02-API调试/12_ssl.md) - SSL/TLS 证书解密与自签名证书处理
- [02-API调试/13_localhost.md](./02-API调试/13_localhost.md) - 本地开发流量拦截（Localhost / 127.0.0.1）
- [02-API调试/14_sessions.md](./02-API调试/14_sessions.md) - 抓包会话保存、导出与多标签切换
- [02-API调试/20_access-control.md](./02-API调试/20_access-control.md) - 访问控制（域名/IP 黑白名单过滤）
- [02-API调试/21_gateway.md](./02-API调试/21_gateway.md) - 网关规则与流量分发
- [02-API调试/22_mirror.md](./02-API调试/22_mirror.md) - 流量镜像复制与多端比对
- [02-API调试/23_script.md](./02-API调试/23_script.md) - **【核心】Python 脚本调试**（onRequest 与 onResponse 拦截与修改）
- [02-API调试/24_addons.md](./02-API调试/24_addons.md) - 应用联动扩展与外部命令行处理
- [02-API调试/25_breakpoint.md](./02-API调试/25_breakpoint.md) - 断点调试（实时挂起与手动篡改数据）
- [02-API调试/26_rewrite.md](./02-API调试/26_rewrite.md) - **【核心】重写规则**（重定向、替换请求/响应、修改内容）
- [02-API调试/27_reverse-proxy.md](./02-API调试/27_reverse-proxy.md) - 反向代理配置与域名映射
- [02-API调试/28_diff.md](./02-API调试/28_diff.md) - 报文对比与差异高亮工具
- [02-API调试/29_network-condition.md](./02-API调试/29_network-condition.md) - 弱网模拟与限速节流（Throttling）
- [02-API调试/30_report-server.md](./02-API调试/30_report-server.md) - 实时报告生成与服务监听
- [02-API调试/31_repeat.md](./02-API调试/31_repeat.md) - 重放请求与批量压力测试
- [02-API调试/32_compose.md](./02-API调试/32_compose.md) - 快速编辑与构建全新请求
- [02-API调试/33_highlight.md](./02-API调试/33_highlight.md) - 流量高亮着色与标记
- [02-API调试/34_har.md](./02-API调试/34_har.md) - HAR 格式导入、导出与归档
- [02-API调试/35_history.md](./02-API调试/35_history.md) - 调试历史记录回溯与管理
- [02-API调试/36_turbo.md](./02-API调试/36_turbo.md) - Turbo 极速加速模式
- [02-API调试/37_view.md](./02-API调试/37_view.md) - 多视图布局切换（水平/垂直分屏）
- [02-API调试/38_proxy-terminal.md](./02-API调试/38_proxy-terminal.md) - 一键开启代理终端命令环境
- [02-API调试/40_chls.md](./02-API调试/40_chls.md) - Charles 抓包文件 (.chls) 导入支持

### 03. API 测试 (REST & API Testing)
- [03-API测试/index.md](./03-API测试/index.md) - API 测试总览
- [03-API测试/01_method.md](./03-API测试/01_method.md) - HTTP 方法支持（GET/POST/PUT/DELETE/PATCH 等）
- [03-API测试/02_header.md](./03-API测试/02_header.md) - 请求头编辑、批量操作与预设
- [03-API测试/03_body.md](./03-API测试/03_body.md) - 请求体类型（JSON, Form-Data, x-www-form-urlencoded, Raw, 二进制）
- [03-API测试/04_protocol.md](./03-API测试/04_protocol.md) - HTTP/1.1、HTTP/2、HTTP/3(QUIC) 协议指定
- [03-API测试/10_request_id.md](./03-API测试/10_request_id.md) - Request ID 链路追踪标识
- [03-API测试/11_cookie.md](./03-API测试/11_cookie.md) - Cookie 管理器与自动携带机制
- [03-API测试/12_authorization.md](./03-API测试/12_authorization.md) - 鉴权方式（Bearer Token, Basic Auth, API Key, OAuth 2.0 等）
- [03-API测试/12_proxy.md](./03-API测试/12_proxy.md) - 测试请求的前置代理控制
- [03-API测试/13_redirect.md](./03-API测试/13_redirect.md) - 301/302 重定向跟踪与禁止跟随
- [03-API测试/14_history.md](./03-API测试/14_history.md) - 请求发送历史与快照恢复
- [03-API测试/15_collection.md](./03-API测试/15_collection.md) - API 集合（Collection）导入导出（Postman/Swagger/Apifox 等）
- [03-API测试/16_envrionment.md](./03-API测试/16_envrionment.md) - 测试环境变量绑定与插值替换
- [03-API测试/17_settings.md](./03-API测试/17_settings.md) - 超时时间、SSL 校验等请求配置
- [03-API测试/20_metrics.md](./03-API测试/20_metrics.md) - 耗时性能指标分解（DNS、TCP、TLS、TTFB、Download）
- [03-API测试/21_curl.md](./03-API测试/21_curl.md) - 复制与导入 cURL 命令行

### 04. 环境变量 (Environment)
- [04-环境变量/index.md](./04-环境变量/index.md) - 环境变量工作机制
- [04-环境变量/global/index.md](./04-环境变量/global/index.md) - 全局环境变量配置
- [04-环境变量/user/index.md](./04-环境变量/user/index.md) - 用户自定义环境（测试/预发/生产）
- [04-环境变量/practice/index.md](./04-环境变量/practice/index.md) - 动态环境变量与断言联动实战

### 05. MCP 服务器 (Model Context Protocol)
- [05-MCP服务器/index.md](./05-MCP服务器/index.md) - Reqable MCP Server 与 AI 智能体集成指南

### 06. 主题与外观 (Theme)
- [06-主题与外观/index.md](./06-主题与外观/index.md) - 亮色/暗黑模式与主题配色定制

### 07. 快捷键 (Shortcuts)
- [07-快捷键/index.md](./07-快捷键/index.md) - 跨平台全套快捷键对照表

### 08. 内置工具 (Tools)
- [08-内置工具/index.md](./08-内置工具/index.md) - 内置小工具概览
- [08-内置工具/01_regex.md](./08-内置工具/01_regex.md) - 正则表达式实时测试与验证工具

### 09. 常见问题 (FAQ)
- [09-常见问题/index.md](./09-常见问题/index.md) - FAQ 导航
- [09-常见问题/ssl.md](./09-常见问题/ssl.md) - SSL/TLS 证书信任与常见报错解决
- [09-常见问题/android.md](./09-常见问题/android.md) - Android 7+ 证书注入与 VPN 抓包排查
- [09-常见问题/ios.md](./09-常见问题/ios.md) - iOS 描述文件安装与证书完全信任
- [09-常见问题/windows.md](./09-常见问题/windows.md) - Windows 系统代理与网络循环保护
- [09-常见问题/macos.md](./09-常见问题/macos.md) - macOS 钥匙串信任与权限授权
- [09-常见问题/linux.md](./09-常见问题/linux.md) - Linux 桌面与命令行代理配置

### 10. 更新日志 (Changelogs)
- [10-更新日志/index.md](./10-更新日志/index.md) - 各平台完整发布日志

---

## ⚡ 根目录常用快捷入口
- [脚本.md](./脚本.md) - Python 脚本拦截与调试综合指南
- [脚本API.md](./脚本API.md) - Reqable Python Scripting API 完整类库参数与代码示例
- [重写.md](./重写.md) - 5 种重写模式实战速查

---
*文档更新时间：2026年3月 | 包含 75 篇技术文档与 267 张本地高清配图*
