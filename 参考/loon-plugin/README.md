# 京东 Cookie / wskey 提取与 Bncr 同步（Loon）

配合无界（Bncr）后台的 iOS 代理端抓取方案，参考 `/参考/jd-ck-apk-v2`（Android 端同源实现）。

## 文件

| 文件 | 说明 |
|---|---|
| `Loon/JD_GetCookie.plugin` | Loon 插件配置（**正式文件，安装用这个**） |
| `Loon/Task/jd_cookie.js` | 抓取与上报脚本（插件按 raw URL 远程加载） |

本目录只保留插件清单副本，脚本不再复制 —— 避免两份副本各自漂移。

## 抓取规则

```
http-request ^https:\/\/api\.m\.jd\.com\/ script-path=.../Loon/Task/jd_cookie.js, requires-body=false, timeout=60, tag=京东Cookie-pin
http-request ^https:\/\/sh\.jd\.com\/d script-path=.../Loon/Task/jd_cookie.js, requires-body=false, timeout=60, tag=京东Cookie-wskey

[MITM]
hostname = api.m.jd.com, sh.jd.com
```

| 规则 | 提供片段 |
|---|---|
| `api.m.jd.com` | `pt_key` + `pt_pin`（`functionId=basicConfig` 等接口的 Cookie 头） |
| `sh.jd.com/d` | `wskey`（登录票据，可能不含 pin） |

两条规则共用同一个脚本，脚本按 Cookie 内容自动识别，不依赖域名判断。

## 关键行为

1. **跨请求拼装**：`pin` 与 `wskey` 常分属不同请求。脚本把 `pin` 记忆到本地（12 小时有效），遇到只有 `wskey` 的请求时自动回填，拼成 `pin=xxx;wskey=xxx;`。
2. **按类型独立去重**：`pt_key` 与 `wskey` 各自记录最近一次**上报成功**的值。凭据未变 → 直接放行，0 弹窗、0 外发、0 延迟。
3. **失败自愈**：上报失败不写记录，下一次请求自然重试（不写重试循环）。
4. **动态 UA**：复用京东 App 原始请求的 User-Agent，兜底标准 iOS Safari UA。

> 注：`pt_key` 与 `wskey` 必须**分开**记指纹。若合并成单个指纹串，两者会互相覆盖，导致 iOS 上换个页面就重复上报（已踩过这个坑）。

## 上报接口

`POST https://bncr.xiaoge.ink/api/Doraemon/loginCallback_receive`

```json
{
  "wskey": "<原始 wskey，无则空串>",
  "pin": "jd_xxxx",
  "full_ck": "pt_key=...; pt_pin=...;",
  "name": "jd_xxxx",
  "source": "loon-plugin",
  "callback_id": "<鉴权令牌>"
}
```

服务端两种形态都接受：
- `full_ck` 为 `pt_key=...; pt_pin=...;` → `triggered: mask`（pin 命中 pinDB 时伪装成 system 上传）
- `full_ck` 为 `pin=...;wskey=...;` → `triggered: inline`，归一化为 `wskey=...;pin=...;`

脚本优先发 `pt_key` 形态（登录插件可直接使用），无 `pt_key` 时退回 `wskey` 形态。

## 参数

| 参数 | 默认 | 说明 |
|---|---|---|
| `silent` | `true` | `true` 完全静默；`false` 仅在凭据变更并上报成功时弹窗 1 次（点击复制凭据） |
| `upload` | `on` | `off` 时只记录、不外发 |
