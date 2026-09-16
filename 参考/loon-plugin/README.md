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

1. **分隔符无关的 Cookie 解析** —— 见下方「踩坑记录」，这是最容易静默失效的一环。
2. **跨请求拼装**：`pin` 与 `wskey` 常分属不同请求。脚本把 `pin` 记忆到本地（12 小时有效），遇到只有 `wskey` 的请求时自动回填。
3. **按类型独立去重**：`pt_key` 与 `wskey` 各自记录最近一次**上报成功**的值。凭据未变 → 直接放行，0 弹窗、0 外发、0 延迟。
4. **失败自愈**：上报失败不写记录，下一次请求自然重试（不写重试循环）。
5. **动态 UA**：复用京东 App 原始请求的 User-Agent，兜底标准 iOS Safari UA。

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

`[Argument]` 声明后 `$argument` 是**对象**（`$argument.name`），且 `switch` 控件默认值是 `false` —— 若把 `upload` 做成 switch，默认就会关掉上报。因此规则不写 `argument=`，行为由脚本内默认值决定（`silent=true` / `upload=on` / `debug=off`）。需要临时排查时再手动加。

## 排查手法

### 第一步：看通知，不用翻日志

每个脚本版本首次「有结论」时会弹一条一次性诊断通知（每版本只弹一次，不刷屏）。它会同时告诉你**看到了什么**和**上报成没成**：

```
标题:   京东脚本诊断 v2026-09-16.4
副标题: api.m.jd.com | Cookie 键 1 个
正文:   pt_key ✓  pt_pin ✓  wskey ✗
        字段(19): sdtoken, __jda, __jdb, __jdc
        ✅ 上报成功：参数已接收 (mask)
```

第四行的四种可能，直接对应四种结论：

| 第四行 | 结论 | 下一步 |
|---|---|---|
| **压根没弹通知** | 脚本没跑起来 | 问题在 MITM / 规则 / 远程脚本加载，**不在脚本** |
| `这条请求不带 CK，属正常` | 命中了，该请求本来就没带凭据 | 继续用京东 App 逛几下 |
| `凭据未变，已抑制重复上报` | 提取正常、去重正常 | 已经上报过，无需处理 |
| `✅ 上报成功：...` | **全链路通** | 服务器没收到就看服务端插件 |
| `❌ 上报失败：HTTP 200，返回的是 HTML 而非接口 JSON（疑似被运营商/网关劫持...）` | **域名被运营商拦截** | 见下方「运营商劫持」 |
| `❌ 上报失败：网络错误: ...` | 出网失败 | 检查 Loon 分流规则 |

> 通知里只列**字段名**，不含任何凭据值。

### 运营商劫持（`.ink` 域名备案问题）

`xiaoge.ink` 是 `.ink` 后缀，**不在工信部可备案名单内，无法备案**。手机走蜂窝网络直连境内未备案域名时，运营商/网关会拦截并把响应替换成备案提示页 —— **请求根本没到服务器**。

自测方法（在电脑上）：

```bash
curl -s -i http://bncr.xiaoge.ink/    # 307 → https（服务器自己跳的，正常）
curl -s -i https://bncr.xiaoge.ink/   # 302 → /admin（Bncr 后台，正常）
```

服务器本身不返回任何备案页。所以手机浏览器看到的备案跳转 = 运营商拦截。

**关键**：脚本上报走 Loon 的 `$httpClient`，遵守你的分流规则。若 `bncr.xiaoge.ink` 被匹配到 **DIRECT**，请求就从手机蜂窝网络出去 → 被劫持 → 上报静默失效。

处理办法（任选其一）：

1. 把 `bncr.xiaoge.ink` 从 DIRECT 名单移出，交给代理节点出去；
2. 用一台能正常访问该域名的节点做该域名的策略（`PROXY`）；
3. 换一个可备案/或走 Cloudflare 的域名做对接地址。

诊断通知里若出现「返回的是 HTML 而非接口 JSON」，就是这个问题。

### 第二步：看日志

日志每条都带版本号（`[京东凭据 v2026-09-16.4]`）。**先确认跑的是哪一版** —— Loon 会缓存远程脚本，改完脚本若版本号没变，说明加载的还是旧缓存；把插件开关切一次、或删除重新添加可强制重拉。

脚本默认**限流打日志**（10 秒最多 1 条）：

- **完全没有任何输出** → 同「没弹通知」，脚本没跑起来。
- **`命中 ...` 但 `pt_key ✗`** → 命中了但没抓到凭据。
- **`==== [京东凭据捕获 v...] ====`** → 已抓到并外发，紧跟打印上报结果。

需要每次命中都看细节时，把 `argument=[debug=on]` 手动加到规则末尾。

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
