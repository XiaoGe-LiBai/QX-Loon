<div align="center">

# 🚀 Loon-QX 脚本插件仓库

存放 Loon 与 Quantumult‑X 插件/脚本的仓库，专注数据抓取功能

</div>

## 🎯 功能概述

### 📱 快手数据抓取
- **快手极速版**: salt、cookie、UA、kaw 参数
- **快手普通版**: salt、cookie、UA、kaw 参数
- **输出格式**: `ksjsb salt=值` / `ks salt=值`

### 🍕 达美乐Token抓取
- **达美乐微信小程序**: Authorization Token
- **输出格式**: `,dlm set token#备注`

## 🚀 快速开始

### 1. 安装插件
```bash
# 快手极速版
https://raw.githubusercontent.com/XiaoGe-LiBai/QX-Loon/main/Loon/ksjsb.plugin

# 快手普通版
https://raw.githubusercontent.com/XiaoGe-LiBai/QX-Loon/main/Loon/ks.plugin

# 达美乐Token
https://raw.githubusercontent.com/XiaoGe-LiBai/QX-Loon/main/Loon/dlm_token.plugin
```

### 2. 配置 MITM
1. 开启 HTTPS 解密并安装证书
2. 添加主机名：
   ```bash
   # 快手极速版
   api3.ksapisrv.com, nebula.kuaishou.com, api.e.kuaishou.com

   # 快手普通版
   api3.gifshow.com, encourage.kuaishou.com, az4-api.ksapisrv.com

   # 达美乐
   game.dominos.com.cn
   ```

### 3. 触发抓取
- **快手**: 登录时抓取salt，进入任务页面抓取cookie/UA，触发特定功能抓取kaw
- **达美乐**: 进入微信小程序触发用户信息请求

## 📊 输出示例

所有参数输出到 Loon 控制台日志：
```
# 快手极速版
ksjsb salt=api_client_salt值
ksjsb cookie=完整cookie字符串
ksjsb ua=User-Agent字符串
ksjsb kaw=kaw参数值

# 快手普通版
ks salt=api_client_salt值
ks cookie=完整cookie字符串
ks ua=User-Agent字符串
ks kaw=kaw参数值

# 达美乐
,dlm set token值#备注信息
```

## 📁 项目结构
```
QX-Loon/
├── Loon/                    # Loon 插件
│   ├── ksjsb.plugin        # 快手极速版
│   ├── ks.plugin           # 快手普通版
│   └── dlm_token.plugin    # 达美乐Token
├── Loon/Task/              # 脚本文件
│   ├── ksjsb_*.js          # 快手极速版脚本
│   ├── ks_*.js             # 快手普通版脚本
│   └── dlm_token.js        # 达美乐脚本
└── Photos/                 # 图标资源
```

## 🔧 特点
- ✅ **无持久化存储**: 仅输出到控制台，不占用存储空间
- ✅ **统一格式**: 所有参数采用 `key=value` 格式输出
- ✅ **轻量化**: 专注核心功能，脚本简洁高效
- ✅ **易调试**: 控制台日志便于查看和复制

## ⚠️ 注意事项
- 需要正确配置 MITM 和安装证书
- 仅支持 Loon 代理工具
- 请遵守相关法律法规和平台服务条款

## 🔧 工具脚本使用说明

### storage_viewer.js - 存储数据查看器
这个脚本用于查看 Loon 中的存储数据（虽然本项目已移除持久化存储，但可用于查看其他数据）。

**使用方法：**
1. 在 Loon 中手动执行该脚本
2. 或通过快捷方式调用
3. 会输出所有相关存储数据到控制台并复制到剪贴板

### boxjs_integration.js - BoxJs 集成配置生成器
用于生成 BoxJs 可视化管理面板的配置文件。

**使用方法：**
1. 手动执行脚本
2. 复制输出的 JSON 配置
3. 在 BoxJs 中添加订阅
4. 即可在 BoxJs 中可视化管理数据

**注意：** 由于本项目已采用无持久化存储设计，这两个工具主要用于：
- 查看其他脚本的存储数据
- 学习 BoxJs 集成方法
- 调试和测试用途

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

---

<div align="center">

**⭐ 如果这个项目对您有帮助，请给个 Star！**

</div>
