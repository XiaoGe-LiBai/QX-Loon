<div align="center">

# Loon / Reqable 脚本插件仓库

存放 Loon 插件与 Reqable 脚本的仓库

</div>

## 项目概述

### Loon 插件
通过 MITM 代理拦截 HTTP 请求/响应，实现数据抓取和响应修改：
- **快手极速版/普通版**: salt、cookie、UA、kaw 参数抓取
- **京东金融**: 积分商城状态修改
- **达美乐**: Token 抓取
- **小米汽车**: 活动详情按钮解锁

### Reqable 脚本
Python 脚本，在 Reqable 中处理 HTTP 流量：
- **小米汽车社区**: 活动详情按钮解锁 + 报名状态开放
- **爱奇艺**: 秒杀按钮点亮

---

## 快速开始

### Loon 插件安装
```bash
# 快手极速版
https://raw.githubusercontent.com/XiaoGe-LiBai/QX-Loon/main/Loon/ksjsb.plugin

# 快手普通版
https://raw.githubusercontent.com/XiaoGe-LiBai/QX-Loon/main/Loon/ks.plugin

# 达美乐Token
https://raw.githubusercontent.com/XiaoGe-LiBai/QX-Loon/main/Loon/dml_token.plugin
```

### Reqable 脚本使用
1. 将 `Reqable/脚本/` 中的 `.py` 文件导入 Reqable
2. 配置对应的 URL 匹配规则
3. 启用脚本规则

---

## 项目结构
```
QX-Loon/
├── Loon/                          # Loon 插件
│   ├── *.plugin                   # 插件配置文件
│   └── Task/                      # JavaScript 任务脚本
├── Reqable/                       # Reqable 脚本
│   ├── 脚本/                      # Python 脚本文件
│   ├── 重写/                      # 重写规则
│   └── 开发文档/                  # Reqable API 参考文档
├── 抓包/                          # 抓包分析文档
├── 抢购脚本/                      # 抢购辅助脚本
├── Photos/                        # 图标资源
└── docs/                          # 仓库规范文档
```

---

## 特点
- ✅ **轻量化**: Loon 插件仅输出到控制台，不持久化存储
- ✅ **双平台**: 覆盖 Loon（iOS）和 Reqable（跨平台）
- ✅ **统一格式**: 参数输出格式统一，便于解析
- ✅ **异常安全**: 所有脚本异常时不破坏原始数据

## 注意事项
- Loon 插件需要正确配置 MITM 和安装证书
- Reqable 脚本需要 Reqable App（桌面端）支持
- 请遵守相关法律法规和平台服务条款

---

<div align="center">

**⭐ 如果这个项目对您有帮助，请给个 Star！**

</div>
