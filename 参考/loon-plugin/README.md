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

[Host]
# 该域名实测只有 IPv6 可达，给这一个域名单独指定地址族（不动全局 ip-mode）
bncr.xiaoge.ink = ip-mode:prefer-v6

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

1. **上报成功即弹窗，点击通知复制凭据**。同一凭据只弹一次，不刷屏。
2. **上报强制直连 + IPv6 优先**：插件里 `[Rule]` 让该域名直连、`[Host]` 让它优先走 IPv6；脚本再用 `$httpClient` 的 `node` 参数指定出口（默认 `DIRECT`），不依赖 `[Rule]` 是否生效、也不受其他规则优先级影响。失败会自动退回「当前路由」再试一次。见下方「为什么不走代理」。
3. **分隔符无关的 Cookie 解析** —— 见下方「踩坑记录」，这是最容易静默失效的一环。
4. **跨请求拼装**：`pin` 与 `wskey` 常分属不同请求。脚本把 `pin` 记忆到本地（12 小时有效），遇到只有 `wskey` 的请求时自动回填。
5. **按类型独立去重（抢占式）**：`pt_key` 与 `wskey` 各自记录最近一次**已受理**的值，读-判-写全在同步段完成。凭据未变 → 直接放行，0 弹窗、0 外发、0 延迟。见下方「并发去重」。
6. **失败自愈**：上报失败会把去重记录**按值回滚**，下一次请求自然重试（不写重试循环）。
7. **动态 UA**：复用京东 App 原始请求的 User-Agent，兜底标准 iOS Safari UA。
8. **安静的通知策略**：只有「上报失败」和「upload=off」才弹通知；无 CK / 无 pin / 凭据未变 / 上报成功都已静默或走正式弹窗。

## 为什么不走代理（关键坑）

`bncr.xiaoge.ink` 同时挂着两条解析记录，**实测只有 IPv6 那条能通**：

| 类型 | 地址 | 归属 | 实测 |
|---|---|---|---|
| A | `111.229.205.209` | 腾讯云（境内） | ❌ TLS 阶段即被 RST（`unexpected eof while reading`） |
| AAAA | `2001:da8:230:1401:...` | CERNET 教育网 | ✅ HTTP/2 正常，返回 302 |

所以这个域名目前**只有 IPv6 可达**。走代理节点时，节点侧解析、以及节点到教育网 IPv6 的可达性都不可控 → 连接被掐断。

**实测现象**（这个现象本身就是最好的判据）：

| 状态 | 访问 `bncr.xiaoge.ink` |
|---|---|
| Loon **关** | ✅ 正常，能进后台 |
| Loon **开**（默认走代理） | ❌ 访问不到 |

手机侧上报失败的原始报错：

```
HTTPClient request failed with error:
Error Domain=LNGCDAsyncSocketErrorDomain Code=7 "Socket closed by remote peer"
```

> ⚠️ 「强制直连」只保证走 DIRECT 出口，**不决定用 A 还是 AAAA**。只加 `[Rule] ... DIRECT` 时，直连仍可能先试 IPv4 → 撞上那台 TLS 就被掐的机器。所以还需要下面的第三条保险。

## 三重保险：`[Rule]` + `[Host] ip-mode` + `node` 参数

**保险一（插件层 · 选出口）**：`[Rule] DOMAIN-SUFFIX,xiaoge.ink,DIRECT` —— 让浏览器等所有流量都直连。

**保险二（插件层 · 选地址族）**：`[Host]` 段给这一个域名单独指定 IPv6 优先：

```ini
[Host]
bncr.xiaoge.ink = ip-mode:prefer-v6
```

Loon 的「规则」只决定走哪个策略，**不决定地址族**；`ip-mode` 才是决定 A / AAAA 的地方 —— 全局写在 `[General] ip-mode`，单域名写在 `[Host]`。这里只影响这一个域名，不动全局。

> 取值拼写官方两处不一致，加完必须验证：
>
> | 来源 | 拼写 |
> |---|---|
> | `nsloon.app/docs/General`（文档页） | `ipv6-preferred` |
> | 官方 `LoonExampleConfig/example2.lcf`（2026.09.11） | `prefer-v6` ← 插件里用的这个 |
>
> 验证：**Loon → 请求记录** 找 `bncr.xiaoge.ink`，看目标地址是否变成 `2001:da8:...` 开头。若仍是 `111.229.205.209`，把值换成 `ipv6-preferred` 再试；两个都无效则说明该值未被识别，改用下方备选。

**保险三（脚本层）**：脚本给 `$httpClient` 显式指定出口：

```js
{ url: ..., node: "DIRECT" }   // node 参数：指定 DIRECT / 节点名 / 策略组
```

这一层更硬：**不依赖 `[Rule]` 是否被重新导入生效，也不受你其他规则优先级影响**。

失败时自动降级：

```
1) 先用 node 指定的出口（默认 DIRECT）
2) 失败 → 退回「当前路由」再试一次
3) 两次都失败才算失败（去重记录会回滚，下次请求自然重试）
```

出口可用 `argument` 调整：`node=DIRECT`（默认）／`node=日本`（节点名）／`node=auto`（走当前路由）。

> 若以后把服务迁到代理节点能正常访问的机房，可改成 `node=auto` 并删掉那条 `[Rule]`。

### 备选（若 `ip-mode` 两种拼写都无效）

插件里改成把该域名映射到**另一个只有 A 记录的域名**，或直接钉死 IPv6 地址：

```ini
[Host]
bncr.xiaoge.ink = 2001:da8:230:1401:60d8:9adc:139e:a0cc
```

副作用：地址是 EUI-64 形态，随网卡/前缀变化，**不推荐长期使用**。更干净的解法是去 DNS 侧把那条死掉的 A 记录删掉。

## 踩坑记录

### 1. 并发去重竞态（曾弹出 5 条窗、外发 5 次）

**症状**：上传成功了，但通知栏一次收到 **5 条**「京东凭据已同步」。

**根因**：去重记录的**读**和**写**不在同一段。旧版在同步段读、在 `$httpClient` 的**异步回调里**写：

```js
const changed = ptKey !== ($persistentStore.read(store) || "");  // 同步读
...
sendUpload(route, payload, function (result) {                   // ← 异步，隔了整个 HTTP 往返
  if (result.ok) $persistentStore.write(ptKey, store);           // ← 才写
});
```

JD App 启动时会**并发**打多个 `basicConfig`，Loon 为每个请求各起一个脚本实例。5 个实例都在别人写入之前读到了「未变」→ **全部放行**。所以这不只是弹窗问题，而是同一个凭据被向服务器推了 5 遍。

**修复**：去重改成**抢占式** —— 读-判-写全部放进同步段，先记账再外发；失败时按值回滚。

```js
if (ptKeyChanged) $persistentStore.write(ptKey, ptKeyStore);   // 同步段就记账
sendUpload(route, payload, function (result) {
  if (!result.ok) rollback(ptKeyStore, ptKeyChanged, prevPtKey);  // 失败回滚，保留重试能力
});
```

**回归实测**（本地 harness 模拟 Loon 共享 `$persistentStore` 的并发实例）：

| 场景 | 修复前 | 修复后 |
|---|---|---|
| 5 请求同时到达 | 外发 5 次 / 弹窗 5 条 | 外发 1 次 / 弹窗 1 条 |
| 5 请求间隔 50ms | 外发 5 次 / 弹窗 5 条 | 外发 1 次 / 弹窗 1 条 |
| 5 请求间隔 600ms | 外发 1 次 / 弹窗 2 条 | 外发 1 次 / 弹窗 1 条 |

> 顺带说明：**「回滚」是回滚到本轮之前的值，不是删除键**。早先的写法是「失败就不写记录」，在抢占式改造后会退化成「删除键」，那样会丢掉上一个有效凭据，任何一次网络抖动都会让同一凭据反复重传。

### 2. Cookie 分隔符（曾导致完全不上传）

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

### 3. 指纹不能合并

`pt_key` 与 `wskey` 必须**分开**记去重指纹。合并成单个指纹串时两者会互相覆盖（先存 `KEY_A|`，再被 `|WSKEY_B` 覆盖，回头 `KEY_A|` 又被判为"变更"），表现为换个页面就重复上报。

### 4. 规则里不要写 `argument=`

`[Argument]` 声明后 `$argument` 是**对象**（`$argument.name`），且 `switch` 控件默认值是 `false` —— 若把 `upload` 做成 switch，默认就会关掉上报。因此规则不写 `argument=`，行为由脚本内默认值决定（`silent=false` / `upload=on` / `node=DIRECT` / `debug=off`）。需要临时排查时再手动加。

## 通知与排查

### 正常情况：上报成功弹窗

```
标题:   🎉 京东凭据已同步
副标题: jd_4f5ff4a37c697 (pt_key)
正文:   已发送至对接服务器，点击可复制
```

**点击通知即把完整凭据复制到剪贴板。** 同一凭据只弹一次。

设 `silent=true` 可完全静默。

### 异常情况：诊断通知（每版本每账号至多 1 条）

**只有「需要你处理」的情况才会弹诊断通知**：上报失败、或 `upload=off`。其余状态（无 CK、无 pin、凭据未变）都只写日志，不打扰。

```
标题:   京东脚本诊断 v2026-09-16.7
副标题: api.m.jd.com | Cookie 键 19 个
正文:   pt_key ✓  pt_pin ✓  wskey ✗
        字段(19): sdtoken, __jda, __jdb, __jdc
        ❌ 上报失败：出口DIRECT: 网络错误: ... ｜ 当前路由: 网络错误: ...
```

| 表现 | 结论 | 下一步 |
|---|---|---|
| **压根没弹任何通知** | 脚本没跑起来（**或一切正常**） | 问题在 MITM / 规则 / 远程脚本加载；也可能是本条请求本就没带凭据，继续用京东 App 逛几下 |
| `🎉 京东凭据已同步` | 提取、去重、外发全部正常 | 无需处理，点击可复制凭据 |
| `❌ 上报失败：出口DIRECT: ... ｜ 当前路由: ...` | 两条出网路都不通 | 用 `node=` 换节点，或确认服务器可达 |
| `❌ 上报失败：...返回的是 HTML 而非接口 JSON` | 出网被拦或被改线 | 检查 `node` 参数与插件里 `[Host]` / `[Rule]` 的配置 |
| 弹了但 `pt_key ✗` 且**字段(n)** 的 n 很小 | 代理只交出了部分同名 cookie 头 | 需要换拦截目标或改抓取策略 |

> 诊断通知里只列**字段名**，不含任何凭据值。
>
> 想排查「凭据未变被抑制」这类正常状态时，看日志而不是等通知：把 `argument=[debug=on]` 加进规则，每次命中都会打一行。

### 看日志

日志每条都带版本号（`[京东凭据 v2026-09-16.6]`）。**先确认跑的是哪一版** —— Loon 会缓存远程脚本，改完脚本若版本号没变，说明加载的还是旧缓存；把插件开关切一次、或删除重新添加可强制重拉。

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
