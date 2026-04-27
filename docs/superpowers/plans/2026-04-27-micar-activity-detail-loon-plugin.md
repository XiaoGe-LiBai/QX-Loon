# 小米汽车社区活动详情按钮解锁 Loon 插件 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 生成一个 Loon 插件，对 `https://api.community.car.miui.com/api/h5/activity/v1/detail?...` 的响应 JSON 中 `data.button.showEnable` 与 `data.button.enable` 强制改为 `true`。

**Architecture:** 使用 Loon `[rewrite]` 的 `response-body-json-jq` 对响应体做字段级改写；在 `[MITM]` 中加入目标域名以确保 HTTPS 解密后可修改响应体。

**Tech Stack:** Loon Rewrite（`response-body-json-jq`）、MITM、URL 正则匹配。

---

### Task 1: 新增 Loon 插件文件

**Files:**
- Create: `Loon/MiCar_ActivityDetail_ButtonUnlock.plugin`

- [ ] **Step 1: 写入插件内容（最小可用）**

用如下内容创建插件文件：

```ini
#!name = 小米汽车社区-活动详情按钮解锁
#!desc = 将活动详情接口返回的 data.button.showEnable/enable 强制改为 true（仅影响展示/按钮可用性）
#!author = XiaoGe-LiBai
#!date = 2026-04-27

[rewrite]
^https?:\/\/api\.community\.car\.miui\.com\/api\/h5\/activity\/v1\/detail\?.* response-body-json-jq '.data.button.showEnable=true|.data.button.enable=true'

[MITM]
hostname = api.community.car.miui.com
```

- [ ] **Step 2: 本地静态校验（避免低级错误）**

运行：

```powershell
rg -n "api\\.community\\.car\\.miui\\.com" Loon/MiCar_ActivityDetail_ButtonUnlock.plugin
rg -n "response-body-json-jq" Loon/MiCar_ActivityDetail_ButtonUnlock.plugin
```

预期：

- 能看到 1 条 URL 匹配规则
- 能看到 1 条 `response-body-json-jq` 规则
- `[MITM]` 下 `hostname` 包含 `api.community.car.miui.com`

- [ ] **Step 3:（人工）设备验证步骤**

1. 在 Loon 中导入并启用该插件。
2. 确认已安装并信任 MitM 证书，且已开启 MitM。
3. 打开小米汽车社区相关页面，触发 `.../api/h5/activity/v1/detail?...` 请求。
4. 若可查看响应体，确认 `data.button.showEnable` / `data.button.enable` 为 `true`。

> 说明：该插件只修改客户端展示字段，不保证一定能完成报名/领取（若服务端仍校验名额/登录/风控，会继续拦截）。

---

### Task 2: Git 提交（仅提交本次新增文件）

**Files:**
- Create: `Loon/MiCar_ActivityDetail_ButtonUnlock.plugin`
- Create: `docs/superpowers/plans/2026-04-27-micar-activity-detail-loon-plugin.md`

- [ ] **Step 1: 确认待提交文件**

运行：

```powershell
git status --porcelain=v1
```

预期：至少包含本次新增的 plan 与 plugin 文件；若仓库已有其他未提交改动，确保不要误加入本次提交。

- [ ] **Step 2: 仅暂存本次新增文件**

运行：

```powershell
git add docs/superpowers/plans/2026-04-27-micar-activity-detail-loon-plugin.md
git add Loon/MiCar_ActivityDetail_ButtonUnlock.plugin
```

- [ ] **Step 3: 提交**

运行：

```powershell
git commit -m "feat: add MiCar activity detail button unlock Loon plugin"
```

