<div align="center">

# 🚀 Loon-QX 脚本插件仓库

[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/Platform-Loon%20%7C%20Quantumult%20X-green.svg)](https://github.com/XiaoGe-LiBai/QX-Loon)
[![Author](https://img.shields.io/badge/Author-XiaoGe--LiBai-orange.svg)](https://github.com/XiaoGe-LiBai)
[![Last Update](https://img.shields.io/github/last-commit/XiaoGe-LiBai/QX-Loon)](https://github.com/XiaoGe-LiBai/QX-Loon/commits/main)

存放 Loon (.plugin) 与 Quantumult‑X (QX) 插件/脚本的仓库，以及两者可复用的 Task/工具脚本。

[📖 快速开始](#-快速开始) • [📁 目录结构](#-目录结构) • [🛠️ 插件列表](#️-插件列表) • [🤝 贡献指南](#-贡献指南)

</div>

## ✨ 特色功能

- 🔄 **跨平台兼容**：同时支持 Loon 和 Quantumult X
- 📦 **模块化设计**：共享脚本可复用，减少代码冗余
- 🎯 **专注实用**：精选高质量插件脚本，解决实际需求
- 🛡️ **安全可靠**：代码经过严格审查，确保使用安全
- 📱 **移动优先**：专为移动端网络代理工具优化

## 🚀 快速开始

### Loon 用户

1. **安装插件**：
   ```bash
   # 复制插件链接到 Loon 配置中
   https://raw.githubusercontent.com/XiaoGe-LiBai/QX-Loon/main/Loon/[插件名称].plugin
   ```

2. **开启脚本**：
   - 在 Loon 设置中开启对应的插件
   - 根据需要配置相关参数

### Quantumult X 用户

1. **添加脚本**：
   ```javascript
   // 在 Quantumult X 配置中添加脚本引用
   https://raw.githubusercontent.com/XiaoGe-LiBai/QX-Loon/main/Task/[脚本名称].js
   ```

2. **配置重写**：
   ```ini
   # 添加对应的重写规则
   ^https:\/\/example\.com url script-response-path https://raw.githubusercontent.com/XiaoGe-LiBai/QX-Loon/main/Task/[脚本名称].js
   ```

## 📁 目录结构

```
QX-Loon/
├── 📂 Loon/                    # Loon 插件文件
│   ├── 🎯 dlm_token.plugin     # 达美乐 Token 抓取
│   ├── 🎯 ks_*.plugin          # 快手相关插件
│   └── 📄 plugin-template.plugin
├── 📂 Task/                    # 共享脚本文件
│   ├── 🎯 dlm_token.js         # 达美乐 Token 脚本
│   ├── 🎯 ks_*.js              # 快手相关脚本
│   └── 📄 example-task.js
├── 📂 Quantumult-X/            # QX 专用脚本
│   └── 📄 qx-template.js
├── 📂 Photos/                  # 插件图标等资源
├── 📄 README.md                # 项目说明文档
├── 📄 LICENSE                  # 开源协议
├── 📄 .gitignore              # Git 忽略文件
└── 📄 CONTRIBUTING.md          # 贡献指南
```

## 🛠️ 插件列表

| 插件名称 | 功能描述 | 支持平台 | 状态 |
|---------|---------|---------|------|
| [`dlm_token.plugin`](Loon/dlm_token.plugin) | 达美乐微信小程序 Token 抓取<br>输出格式: `,dlm set token#备注` | Loon | ✅ 正常 |
| [`ks_client_salt_main.plugin`](Loon/ks_client_salt_main.plugin) | 快手普通版登录 salt + Cookie/UA | Loon | ✅ 正常 |
| [`ks_client_salt.plugin`](Loon/ks_client_salt.plugin) | 快手极速版登录 salt + Cookie/UA | Loon | ✅ 正常 |

## 🤝 贡献指南

我们欢迎所有形式的贡献！

### 📝 提交方式

1. **Issue 反馈**：
   - 🐛 报告 Bug
   - 💡 功能建议
   - 📖 文档改进

2. **Pull Request**：
   - 🔧 代码优化
   - ✨ 新增功能
   - 📚 文档更新

### 📋 提交规范

- 新增插件时，请将文件放置在对应目录
- 更新 README 中的相关说明
- 确保代码经过测试且功能正常
- 遵循项目的代码风格和规范

### 🎯 贡献者

感谢所有为项目做出贡献的开发者！

<a href="https://github.com/XiaoGe-LiBai/QX-Loon/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=XiaoGe-LiBai/QX-Loon" />
</a>

## 📄 开源协议

本项目基于 [MIT License](LICENSE) 开源协议，您可以自由使用、修改和分发。

## 🙏 致谢

- 感谢 [Loon](https://github.com/Loon0x00/Loon) 和 [Quantumult X](https://github.com/crossutility/QuantumultX) 提供的强大平台
- 感谢所有贡献者和用户的支持
- 感谢开源社区的无私奉献

---

<div align="center">

**⭐ 如果这个项目对您有帮助，请给我们一个 Star！**

[🔝 回到顶部](#-loonqx-脚本插件仓库) • [📧 联系作者](mailto:your-email@example.com) • [🐛 报告问题](https://github.com/XiaoGe-LiBai/QX-Loon/issues)

</div>
