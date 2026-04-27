# 小米汽车社区活动详情按钮解锁 Loon 插件设计

## 背景与问题

目标接口：

- `https://api.community.car.miui.com/api/h5/activity/v1/detail?...`

该接口返回的 JSON 中包含按钮控制字段：

- `data.button.showEnable`
- `data.button.enable`

当这两个字段为 `false` 时，前端通常会表现为“按钮不可点击 / 不展示可用状态”。

## 目标

提供一个 Loon `.plugin`，在命中上述接口响应时，将：

- `data.button.showEnable` 强制改为 `true`
- `data.button.enable` 强制改为 `true`

并确保规则能覆盖 `activityId` 后续追加的其他 query 参数（如 `_csrf`）。

## 非目标（Out of Scope）

- 不处理/绕过账号权限、名额校验、服务端风控等服务端逻辑
- 不保证一定能“成功报名/领取”，仅修改客户端展示/按钮可用性字段
- 不引入脚本（Script API）抓包/签名/二次请求等复杂逻辑

## 方案选择

选用 **`response-body-json-jq`**（文档：`Loon/开发文档/复写.md`）实现语义级 JSON 修改：

- 优点：字段级修改更稳健，不依赖空格/换行/字段顺序；不易误伤同名字符串
- 注意：Loon 的 rewrite 配置用空格分割参数；若 jq 表达式包含空格需用 `\\x20` 表示。本方案将 jq 表达式写成无空格形式规避该问题。

## 规则设计

### URL 匹配

使用正则匹配到 Host+Path，并允许任意 query：

- `^https?:\\/\\/api\\.community\\.car\\.miui\\.com\\/api\\/h5\\/activity\\/v1\\/detail\\?.*`

### 响应体修改

使用 jq 将两个布尔字段强制置为 `true`：

- `.data.button.showEnable=true|.data.button.enable=true`

### HTTPS 解密（MITM）

要对 HTTPS 响应体生效，需要在插件的 `[MITM]` 中加入：

- `hostname = api.community.car.miui.com`

## 交付物

新增 1 个插件文件（文件名使用 ASCII，便于跨平台/仓库管理）：

- `Loon/MiCar_ActivityDetail_ButtonUnlock.plugin`

插件包含：

- 元信息（`#!name/#!desc/#!author/#!date`）
- `[rewrite]`：`response-body-json-jq`
- `[MITM]`：目标 hostname

## 验证方式

1. Loon 导入并启用插件；确认已安装并信任证书（MITM 可用）。
2. 打开小米汽车社区相关页面触发接口请求。
3. 在 Loon 抓包/日志中确认该 URL 被命中（如有 rewrite 命中日志更佳）。
4. 若可抓到响应体，确认 `data.button.showEnable` / `data.button.enable` 均为 `true`。

## 风险与回退

- 若前端还依赖其他状态字段（如 `activityStatus/signStatus/registerStatus/enableStatus`），可能仍不可用；后续可按同一方式追加 jq 修改这些字段。
- 若存在证书固定（TLS Pinning）导致 MITM 无法解密，则 rewrite 不会生效；需要在客户端侧处理固定或改用可解密环境（本设计不覆盖）。

