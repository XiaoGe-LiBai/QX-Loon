```markdown
# Loon-QX

存放 Loon (.plugin) 与 Quantumult‑X (QX) 插件/脚本的仓库，以及两者可复用的 Task/工具脚本。

目录结构（建议）
- Loon/               # Loon 的 .plugin 文件
  - plugin-template.plugin
  - example.plugin
- Quantumult-X/       # Quantumult‑X 的脚本（.js）
  - qx-template.js
  - example-qx.js
- Task/               # 共享的 JS（供两端复用）
  - example-task.js
- Photos/             # 插件图标等静态资源
- LICENSE
- .gitignore
- CONTRIBUTING.md

说明
- Loon 插件一般以 .plugin 文件形式在设备上直接运行；若目标环境不支持跨文件 import，可以把 Task 下的共享脚本合并进 .plugin，或在设备上提前加载 Task 脚本并通过 globalThis 暴露函数供插件调用。
- Quantumult‑X 的脚本示例采用通用 JS 风格，便于拷贝到 QX 的脚本目录或通过 URL 远程加载。

快手相关脚本
- 快手普通版：`Loon/ks_client_salt_main.plugin`（引用 `Task/ks_salt.js` 与 `Task/ks_cookie.js`，分别提取登录 salt 与任务接口 Cookie/UA）
- 快手极速版：`Loon/ks_client_salt.plugin`（引用 `Task/ksjsb_salt.js` 与 `Task/ksjsb_cookie.js`）

贡献
欢迎提交 PR/Issue，新增插件时请把插件放到对应目录并在 README 中补充使用说明。
```
