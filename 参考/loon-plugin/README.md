# 京东 Cookie / wskey 提取与 Bncr 同步（Loon）

配合无界（Bncr）后台的 iOS 代理端抓取方案，参考 `/参考/jd-ck-apk-v2`（Android 端同源实现）。

## 文件

| 文件 | 说明 |
|---|---|
| `Loon/JD_GetCookie.plugin` | Loon 插件配置（**正式文件，安装用这个**） |
| `Loon/Task/jd_cookie.js` | 抓取与上报脚本（插件按 raw URL 远程加载） |

本目录只保留插件清单副本，脚本不再复制 —— 避免两份副本各自漂移。

## 插件配置

```ini
[Rule]
# 见下方「为什么不走代理」——这一条是上报能否成功的关键
DOMAIN-SUFFIX,xiaoge.ink,DIRECT

[Script]
http-request ^https?:\/\/api\.m\.jd\.com\/ script-path=.../Loon/Task/jd_cookie.js, requires-body=false, timeout=60, tag=京东Cookie-pin
http-request ^https?:\/\/sh\.jd\.com\/d script-path=.../Loon/Task/jd_cookie.js, requires-body=false, timeout=60, tag=京东Cookie-wskey

[MITM]
hostname = api.m.jd.com, sh.jd.com
```

| 规则 | 提供片段 |
|---|---|
| `api.m.jd.com` | `pt_key` + `pt_pin`（`functionId=basicConfig` 等接口的 Cookie 头） |
| `sh.jd.com/d` | `wskey`（登录票据，可能不含 pin） |

两条规则共用同一个脚本，脚本按 Cookie 内容自动识别，不依赖域名判断。

## 关键行为

1. **上报成功即弹窗，点击通知复制凭据**。同一凭据只弹一次（按类型独立去重），不刷屏。
2. **分隔符无关的 Cookie 解析** —— 见下方「踩坑记录」，这是最容易静默失效的一环。
3. **跨请求拼装**：`pin` 与 `wskey` 常分属不同请求。脚本把 `pin` 记忆到本地（12 小时有效），遇到只有 `wskey` 的请求时自动回填。
4. **按类型独立去重**：`pt_key` 与 `wskey` 各自记录最近一次**上报成功**的值。凭据未变 → 直接放行，0 弹窗、0 外发、0 延迟。
5. **失败自愈**：上报失败不写记录，下一次请求自然重试（不写重试循环）。
6. **动态 UA**：复用京东 App 原始请求的 User-Agent，兜底标准 iOS Safari UA。

## 为什么不走代理（关键坑）

`bncr.xiaoge.ink` 同时挂着两条解析记录：

| 类型 | 地址 | 归属 |
|---|---|---|
| A | `111.229.205.209` | 腾讯云（境内） |
| AAAA | `2001:da8:230:1401:...` | **CERNET 教育网** |

走代理节点时，节点解析常优先取 **AAAA → 教育网 IPv6**，而境外/商用节点**路由不到教育网地址** → 连接直接卡死。

**实测现象**（这个现象本身就是最好的判据）：

| 状态 | 访问 `bncr.xiaoge.ink` |
|---|---|
| Loon **关** | ✅ 正常，能进后台 |
| Loon **开**（默认走代理） | ❌ 访问不到 |

所以插件的 `[Rule]` 把该域名强制 `DIRECT`。

> 注意：脚本上报走 Loon 的 `$httpClient`，**同样遵守分流规则**。这个域名没强制直连时，上报会静默失败 —— 服务器什么都收不到。
> 若以后把服务迁到能被代理节点正常访问的机房，这条 `[Rule]` 可以去掉。

## 踩坑记录

### 1. Cookie 分隔符（曾导致完全不上传）

JD App 在 HTTP/2 下把 Cookie 拆成**十几个同名 cookie 头**。实测 `api.m.jd.com` 一次请求 19 个，`pt_key` 排在第 **15** 个，不是第一个：

```
cookie: sdtoken=...            ← 第 1 个
cookie: __jda=...
...
cookie: pt_key=app_open...     ← 第 15 个
cookie: pt_pin=jd_4f5ff4a37c697
```

代理合并同名头时，分隔符可能是 `; ` / `, `（RFC 7230 §3.2.2）/ 换行。若正则写死 `(?:^|;\s*)pt_key=`，则**只有 `; ` 能命中**，其余全部抓不到 → `pin` 也抓不到 → 脚本静默退出，零日志、零上传。

现在解析层对三种分隔符都不敏感，并且 5 种 header 形态（数组值 / `cookie#N` 分片键 / `;` / `,` / 换行）都有回归测试覆盖。

### 2. 指纹不能合并

`pt_key` 与 `wskey` 必须**分开**记去重指纹。合并成单个指纹串时两者会互相覆盖（先存 `KEY_A|`，再被 `|WSKEY_B` 覆盖，回头 `KEY_A|` 又被判为"变更"），表现为换个页面就重复上报。

### 3. 规则里不要写 `argument=`

`[Argument]` 声明后 `$argument` 是**对象**（`$argument.name`），且 `switch` 控件默认值是 `false` —— 若把 `upload` 做成 switch，默认就会关掉上报。因此规则不写 `argument=`，行为由脚本内默认值决定（`silent=false` / `upload=on` / `debug=off`）。需要临时排查时再手动加。

## 通知与排查

### 正常情况：上报成功弹窗

```
标题:   🎉 京东凭据已同步
副标题: jd_4f5ff4a37c697 (pt_key)
正文:   已发送至对接服务器，点击可复制
```

**点击通知即把完整凭据复制到剪贴板。** 同一凭据只弹一次。

设 `silent=true` 可完全静默。

### 异常情况：诊断通知（每版本一次）

未抓到凭据 / 跳过 / 上报失败时，弹诊断通知说明原因：

```
标题:   京东脚本诊断 v2026-09-16.5
副标题: api.m.jd.com | Cookie 键 1 个
正文:   pt_key ✓  pt_pin ✓  wskey ✗
        字段(19): sdtoken, __jda, __jdb, __jdc
        ❌ 上报失败：HTTP 200，返回的是 HTML 而非接口 JSON（疑似被网关劫持或走了错误线路）: ...
```

| 表现 | 结论 | 下一步 |
|---|---|---|
| **压根没弹任何通知** | 脚本没跑起来 | 问题在 MITM / 规则 / 远程脚本加载，**不在脚本** |
| `这条请求不带 CK，属正常` | 命中了，该请求本来就没带凭据 | 继续用京东 App 逛几下 |
| `凭据未变，已抑制重复上报` | 提取与去重都正常 | 已经上报过，无需处理 |
| `❌ 上报失败：...返回的是 HTML 而非接口 JSON` | 上报出网被拦或被改线 | 先查上面那条 `DOMAIN-SUFFIX ... DIRECT` 是否生效 |
| `❌ 上报失败：网络错误: ...` | 出网失败 | 检查 Loon 分流规则 |
| 弹了但 `pt_key ✗` 且**字段(n)** 的 n 很小 | 代理只交出了部分同名 cookie 头 | 需要换拦截目标或改抓取策略 |

> 诊断通知里只列**字段名**，不含任何凭据值。

### 看日志

日志每条都带版本号（`[京东凭据 v2026-09-16.5]`）。**先确认跑的是哪一版** —— Loon 会缓存远程脚本，改完脚本若版本号没变，说明加载的还是旧缓存；把插件开关切一次、或删除重新添加可强制重拉。

脚本默认**限流打日志**（10 秒最多 1 条）。需要每次命中都看细节时，把 `argument=[debug=on]` 手动加到规则末尾。

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
