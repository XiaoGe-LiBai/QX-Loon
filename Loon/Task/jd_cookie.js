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
 * 去重：pt_key 与 wskey 各自记「最近一次成功上报」的值。凭据未变 → 直接放行。
 * 必须分开记 —— 合并成单个指纹会让两者互相覆盖，导致重复上报。
 *
 * 参数（argument）：
 *   silent=true/false  默认 true；false 时仅在凭据变更并上报成功时弹窗 1 次
 *   upload=on/off      默认 on
 *   debug=on/off       默认 off；on 时每次命中都打日志（排查用）
 *
 * @author XiaoGe-LiBai
 * @license MIT
 */

const BNCR_ENDPOINT = "https://bncr.xiaoge.ink/api/Doraemon/loginCallback_receive";
const BNCR_AUTH_TOKEN = "96358b36fc0769de2c8373d5e3582bb9";

const PIN_TTL_MS = 12 * 60 * 60 * 1000;      // pin 记忆有效期
const HIT_LOG_INTERVAL_MS = 10 * 1000;       // 无凭据时的命中日志限流间隔

const STORE_PIN = "jd_loon_pin";             // {pin, raw, ts}
const STORE_PTKEY_PREFIX = "jd_loon_ptkey_"; // 每账号最近一次成功上报的 pt_key
const STORE_WSKEY_PREFIX = "jd_loon_wskey_"; // 每账号最近一次成功上报的 wskey
const STORE_HIT_TS = "jd_loon_hit_ts";       // 命中日志限流时间戳
const STORE_DIAG_PREFIX = "jd_loon_diag_";   // 一次性诊断通知标记（按版本）

const SCRIPT_VERSION = "2026-09-16.4";       // 改脚本时同步更新，日志与诊断通知都会显示，便于确认线上跑的是哪一版

(function () {
  try {
    if (!$request || $request.method === "OPTIONS") {
      return $done({});
    }

    const headers = $request.headers || {};
    const args = parseArgs(typeof $argument === "string" ? $argument : "");
    const isSilent = (args.silent || "true").toLowerCase() !== "false";
    const isUploadEnabled = (args.upload || "on").toLowerCase() !== "off";
    const isDebug = (args.debug || "off").toLowerCase() === "on";

    const host = hostOf($request.url);
    const cookieHeaders = cookieHeaderCount(headers);
    const cookie = collectCookie(headers);

    const ptKey = pick(cookie, "pt_key");
    const wskey = pick(cookie, "wskey");
    const rawPin = pick(cookie, "pt_pin") || pick(cookie, "pin") || pick(cookie, "pwdt_id");

    // 诊断上下文：凑齐后交给 handle，等上报出结果再一次性播报
    const diag = { host, cookieHeaders, cookie, ptKey, rawPin, wskey };

    if (!cookie) {
      hitLog(isDebug, `${host} | 无 Cookie 头(共 ${cookieHeaders} 个) → 放行`);
      diagnoseOnce(diag, null);
      return $done({});
    }

    if (isDebug) {
      console.log(`[京东凭据 v${SCRIPT_VERSION}] 命中 ${host} | cookie头 ${cookieHeaders} 个 | pt_key ${yn(ptKey)} pt_pin ${yn(rawPin)} wskey ${yn(wskey)}`);
    }

    // pin 记忆：命中即刷新，未命中则回填最近一次（供 sh.jd.com 这类无 pin 的请求配对）
    let pin = rawPin ? decodePin(rawPin) : "";
    if (pin) {
      $persistentStore.write(JSON.stringify({ pin: pin, raw: rawPin, ts: Date.now() }), STORE_PIN);
      return handle(pin, rawPin, ptKey, wskey, { isSilent, isUploadEnabled, host, cookieHeaders, diag });
    }

    const recalled = recallPin();
    if (recalled.pin) {
      hitLog(isDebug, `${host} | pt_pin 缺失，回填记忆 pin ${recalled.pin}`);
      return handle(recalled.pin, recalled.raw, ptKey, wskey, { isSilent, isUploadEnabled, host, cookieHeaders, diag });
    }

    hitLog(isDebug, `${host} | 未找到 pin（cookie 头 ${cookieHeaders} 个）→ 放行`);
    diagnoseOnce(diag, null);
    return $done({});

  } catch (err) {
    console.log(`❌ [京东凭据 v${SCRIPT_VERSION}] 脚本异常: ${(err && err.message) || err}`);
    $done({});
  }
})();

/**
 * 组装并上报
 */
function handle(pin, rawPin, ptKey, wskey, opts) {
  if (!ptKey && !wskey) {
    hitLog(false, `${opts.host} | pin ${pin} 但无 pt_key/wskey → 放行`);
    diagnoseOnce(opts.diag, null);
    return $done({});
  }

  // 优先 pt_key 形态（登录插件可直接使用），退回 wskey 形态
  const fullCk = ptKey
    ? `pt_key=${ptKey}; pt_pin=${rawPin || pin};`
    : `pin=${encodeURIComponent(pin)};wskey=${wskey};`;

  // 去重：两类凭据各自独立记，避免互相覆盖
  const ptKeyStore = STORE_PTKEY_PREFIX + pin;
  const wskeyStore = STORE_WSKEY_PREFIX + pin;

  const ptKeyChanged = Boolean(ptKey && ptKey !== ($persistentStore.read(ptKeyStore) || ""));
  const wskeyChanged = Boolean(wskey && wskey !== ($persistentStore.read(wskeyStore) || ""));

  if (!ptKeyChanged && !wskeyChanged) {
    diagnoseOnce(opts.diag, { kind: "skipped", reason: "凭据未变，已抑制重复上报" });
    return $done({});
  }

  const changed = [];
  if (ptKeyChanged) changed.push("pt_key");
  if (wskeyChanged) changed.push("wskey");

  console.log(`================== [京东凭据捕获 v${SCRIPT_VERSION}] ==================`);
  console.log(`账号 PIN : ${pin}`);
  console.log(`变更类型 : ${changed.join(" + ")}`);
  console.log(`凭据内容 : ${fullCk}`);
  console.log("================================================================");

  if (!opts.isUploadEnabled) {
    if (ptKey) $persistentStore.write(ptKey, ptKeyStore);
    if (wskey) $persistentStore.write(wskey, wskeyStore);
    console.log("ℹ️ upload=off，已跳过外发");
    diagnoseOnce(opts.diag, { kind: "skipped", reason: "upload=off，未外发" });
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

  console.log(`→ 上报 ${BNCR_ENDPOINT}`);

  $httpClient.post(
    {
      url: BNCR_ENDPOINT,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": resolveUserAgent()
      },
      body: JSON.stringify(payload),
      timeout: 10000
    },
    function (error, response, data) {
      try {
        if (error) {
          console.log(`❌ 上报失败(网络): ${error} — 未写入记录，下次请求自动重试`);
          diagnoseOnce(opts.diag, { ok: false, detail: `网络错误: ${error}` });
        } else {
          const status = response ? (response.status || response.statusCode) : 0;
          let res = {};
          try {
            res = JSON.parse(data || "{}");
          } catch (e) {
            res = {};
          }

          if (status === 200 && (res.code === 0 || res.code === 200)) {
            if (ptKey) $persistentStore.write(ptKey, ptKeyStore);
            if (wskey) $persistentStore.write(wskey, wskeyStore);
            console.log(`✅ 上报成功: ${res.msg || "ok"} (${res.triggered || "-"})`);
            diagnoseOnce(opts.diag, { ok: true, msg: `${res.msg || "ok"} (${res.triggered || "-"})` });

            if (!opts.isSilent) {
              $notification.post(
                "🎉 京东凭据已同步",
                `${pin} (${changed.join("+")})`,
                "已发送至对接服务器，点击可复制",
                { clipboard: fullCk }
              );
            }
          } else {
            console.log(`❌ 上报失败: HTTP ${status} ${data} — 未写入记录，下次请求自动重试`);
            diagnoseOnce(opts.diag, { ok: false, detail: describeFailure(status, data) });
          }
        }
      } catch (cbErr) {
        console.log(`❌ 回调异常: ${(cbErr && cbErr.message) || cbErr}`);
      } finally {
        $done({});
      }
    }
  );
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
 * 一次性诊断通知：每个脚本版本首次「有结论」时弹一次
 * 把「脚本跑没跑、看到了什么、上报成没成、服务器回了什么」全摆到通知栏，
 * 不必翻 Loon 日志。通知里只列字段名，不泄露凭据值。
 *
 * outcome 取值：
 *   null                              → 这条请求不带凭据（正常）
 *   { kind:"skipped", reason }        → 凭据未变 / 未开启外发，主动跳过
 *   { ok:true, msg }                  → 上报成功
 *   { ok:false, detail }              → 上报失败（含被劫持识别）
 */
function diagnoseOnce(d, outcome) {
  if (!d) return;
  const key = STORE_DIAG_PREFIX + SCRIPT_VERSION;
  if ($persistentStore.read(key)) return;
  $persistentStore.write("1", key);

  const marks = `pt_key ${yn(d.ptKey)}  pt_pin ${yn(d.rawPin)}  wskey ${yn(d.wskey)}`;
  const names = fieldNames(d.cookie, 4);
  const fields = countFields(d.cookie);
  const detail = names ? `\n字段(${fields}): ${names}` : "\n(请求里没有 Cookie)";

  let result;
  if (!outcome) {
    result = "这条请求不带 CK，属正常；继续用京东 App 即可";
  } else if (outcome.kind === "skipped") {
    result = outcome.reason || "已跳过上报";
  } else if (outcome.ok) {
    result = `✅ 上报成功：${outcome.msg}`;
  } else {
    result = `❌ 上报失败：${outcome.detail}`;
  }

  try {
    $notification.post(
      `京东脚本诊断 v${SCRIPT_VERSION}`,
      `${d.host} | Cookie 键 ${d.cookieHeaders} 个`,
      `${marks}${detail}\n${result}`
    );
  } catch (e) {
    // 通知失败不影响主流程
  }
}

/**
 * cookie 字段个数（按 ; , 换行切分后的段数）
 * 这是判断「代理有没有把十几个同名 cookie 头都交给我们」的关键数字
 */
function countFields(cookie) {
  return String(cookie || "")
    .split(/[;,\r\n]+/)
    .filter(function (seg) {
      return seg.indexOf("=") > 0;
    }).length;
}

/**
 * 列出 cookie 里的前几个字段名（只取名字，不取value，用于诊断）
 */
function fieldNames(cookie, limit) {
  const out = [];
  String(cookie || "")
    .split(/[;,\r\n]+/)
    .forEach(function (seg) {
      if (out.length >= limit) return;
      const idx = seg.indexOf("=");
      const name = (idx > 0 ? seg.slice(0, idx) : "").trim();
      if (name && /^[\w.@-]+$/.test(name)) out.push(name);
    });
  return out.join(", ");
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
  const last = Number($persistentStore.read(STORE_HIT_TS) || 0);
  if (now - last < HIT_LOG_INTERVAL_MS) return;
  $persistentStore.write(String(now), STORE_HIT_TS);
  console.log(line);
}

/**
 * 聚合所有 cookie 头
 * 兼容三种形态：数组值 / cookie#N 分片键 / 单键内含 ", " 或换行拼接的多段 Cookie
 */
function collectCookie(headers) {
  if (!headers || typeof headers !== "object") return "";

  const raw = [];
  Object.keys(headers).forEach(function (name) {
    if (String(name).toLowerCase().indexOf("cookie") !== 0) return;
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
  return raw.join("; ").replace(/[\r\n]+/g, "; ").trim();
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
 * cookie 头个数（用于诊断）
 */
function cookieHeaderCount(headers) {
  if (!headers || typeof headers !== "object") return 0;
  let n = 0;
  Object.keys(headers).forEach(function (name) {
    if (String(name).toLowerCase().indexOf("cookie") === 0) n++;
  });
  return n;
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
 * 参数解析
 */
function parseArgs(str) {
  if (!str) return {};
  return str.split("&").reduce(function (acc, cur) {
    if (!cur) return acc;
    const idx = cur.indexOf("=");
    const key = (idx >= 0 ? cur.slice(0, idx) : cur).trim();
    const val = idx >= 0 ? cur.slice(idx + 1) : "";
    acc[key] = decodeURIComponent(val || "");
    return acc;
  }, {});
}

/**
 * 动态 UA：优先复用京东 App 原生请求 UA，兜底标准 iOS Safari UA
 */
function resolveUserAgent() {
  try {
    const headers = ($request && $request.headers) || {};
    for (const key of Object.keys(headers)) {
      if (key.toLowerCase() === "user-agent") {
        const value = headers[key];
        if (typeof value === "string" && value.trim()) return value.trim();
      }
    }
  } catch (e) {
    // 忽略，走兜底
  }
  return "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148";
}
