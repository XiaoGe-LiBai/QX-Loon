/**
 * Loon combo script
 * 场景一（http-response）: 捕获登录接口返回的 kuaishou.api_client_salt 与基础用户信息
 * 场景二（http-request）: 捕获任务中心接口请求的 Cookie 与 User-Agent
 *
 * 支持的参数（兼容原脚本，同时提供更精细的前缀参数）:
 * - salt_notify / notify: on/off，Salt 变更时通知（默认 on）
 * - salt_clipboard / clipboard: on/off，Salt 通知时是否写入剪贴板（默认 on）
 * - salt_saveUserInfo / saveUserInfo: on/off，是否保存用户信息（默认 on）
 * - salt_mediaUrl / mediaUrl: Salt 通知的 mediaUrl
 * - salt_openUrl / openUrl: Salt 通知的 openUrl
 * - salt_delay / salt_delayMs / delay / delayMs: Salt 通知延迟毫秒
 *
 * - cookie_storeKey / storeKey: Cookie 持久化键名（默认 KS_EARN_COOKIE）
 * - cookie_notify / notify: Cookie 变更时通知（默认 on）
 * - cookie_clipboard / clipboard: on/off，是否把 Cookie+UA 写入剪贴板（默认 on）
 * - cookie_mediaUrl / cookie_openUrl / cookie_delay / cookie_delayMs: 同 Salt，对 Cookie 通知生效
 */
(function () {
  try {
    const args = parseArgs(typeof $argument === "string" ? $argument : "");
    const context = detectContext();

    if (context.type === "salt") {
      handleSaltCapture(context, args);
      return $done({ body: context.body });
    }

    if (context.type === "cookie") {
      handleCookieCapture(context, args);
      return $done({});
    }

    // 未命中正则时回传原始 body，以避免阻断请求
    if (context.body != null) {
      return $done({ body: context.body });
    }

    return $done({});
  } catch (err) {
    $notification.post("快手合集脚本异常", "", String((err && err.stack) || err));
    $done({});
  }
})();

// ---------- Salt 捕获逻辑 ----------
function handleSaltCapture(ctx, args) {
  const raw = ctx.body || "";

  const notify = readBool(args, ["salt_notify", "salt.notification", "notify"], true);
  const saveUserInfo = readBool(args, ["salt_saveUserInfo", "saveUserInfo"], true);
  const clipboardPref = readBool(args, ["salt_clipboard", "clipboard"], true);

  const saltInfo = extractSaltInfo(raw);
  const prevSalt = $persistentStore.read("KS_API_CLIENT_SALT");

  if (saltInfo.salt != null) {
    $persistentStore.write(String(saltInfo.salt), "KS_API_CLIENT_SALT");
  }

  if (saveUserInfo) {
    if (saltInfo.userId != null) $persistentStore.write(String(saltInfo.userId), "KS_USER_ID");
    if (saltInfo.userName != null) $persistentStore.write(String(saltInfo.userName), "KS_USER_NAME");
    if (saltInfo.headUrl != null) $persistentStore.write(String(saltInfo.headUrl), "KS_USER_HEADURL");
  }

  $persistentStore.write(
    JSON.stringify({
      api_client_salt: saltInfo.salt ?? null,
      head_url: saltInfo.headUrl ?? null
    }),
    "KS_MIN_INFO"
  );

  if (!notify) return;

  if (saltInfo.salt && String(prevSalt) !== String(saltInfo.salt)) {
    const title = "快手 salt 获取成功";
    const subtitle =
      saltInfo.userName || saltInfo.userId
        ? `用户: ${saltInfo.userName || "-"} (${saltInfo.userId || "-"})`
        : "用户信息缺失";

    const content = `api_client_salt=${saltInfo.salt ?? "-"}`;
    const attachPayload = {};
    let hasAttach = false;

    if (clipboardPref) {
      attachPayload.clipboard = content;
      hasAttach = true;
    }

    const openUrl = readString(args, ["salt_openUrl", "openUrl"]);
    if (openUrl) {
      attachPayload.openUrl = openUrl;
      hasAttach = true;
    }

    const mediaUrl = readString(args, ["salt_mediaUrl", "mediaUrl"]) || saltInfo.headUrl;
    if (mediaUrl) {
      attachPayload.mediaUrl = mediaUrl;
      hasAttach = true;
    }

    const delayMs = readDelay(args, ["salt_delayMs", "salt_delay", "delayMs", "delay"]);

    $notification.post(
      title,
      subtitle,
      content,
      hasAttach ? attachPayload : undefined,
      delayMs > 0 ? delayMs : 0
    );
  } else if (!saltInfo.salt) {
    $notification.post("未找到 api_client_salt", "", "请确认已启用 MITM 与证书，且触发登录接口");
  }
}

function extractSaltInfo(raw) {
  let salt = null;
  let userId = null;
  let userName = null;
  let headUrl = null;

  try {
    const parsed = JSON.parse(raw);
    salt = parsed["kuaishou.api_client_salt"] ?? null;
    userId = parsed?.user?.user_id ?? null;
    userName = parsed?.user?.user_name ?? null;
    headUrl = parsed?.user?.headurl ?? null;
  } catch (_) {
    salt = pickByRegex(raw, "\"kuaishou\\.api_client_salt\"\\s*:\\s*\"([^\"]+)\"");
    userId = pickByRegex(raw, "\"user_id\"\\s*:\\s*(\\d+)");
    userName = pickByRegex(raw, "\"user_name\"\\s*:\\s*\"([^\"]*)\"");
    headUrl = pickByRegex(raw, "\"headurl\"\\s*:\\s*\"([^\"]+)\"");
  }

  return { salt, userId, userName, headUrl };
}

// ---------- Cookie 捕获逻辑 ----------
function handleCookieCapture(ctx, args) {
  const headers = ctx.headers || {};

  const storeKey = readString(args, ["cookie_storeKey", "storeKey"], "KS_EARN_COOKIE");
  const notify = readBool(args, ["cookie_notify", "notify"], true);
  const clipboardPref = readBool(args, ["cookie_clipboard", "clipboard"], true);

  const cookieSegments = collectCookieSegments(headers);
  if (cookieSegments.length === 0) {
    if (notify) {
      $notification.post("快手极速版 Cookie 获取失败", "", "请求中未找到 Cookie 字段");
    }
    return;
  }

  const cookieString = formatCookieString(cookieSegments);
  if (!cookieString) {
    if (notify) {
      $notification.post("快手极速版 Cookie 获取失败", "", "Cookie 字段内容为空");
    }
    return;
  }

  const userAgent = readHeader(headers, "user-agent") || "";

  const prevCookie = $persistentStore.read(storeKey) || "";
  $persistentStore.write(cookieString, storeKey);
  if (userAgent) {
    $persistentStore.write(String(userAgent), `${storeKey}_UA`);
  }
  $persistentStore.write(
    JSON.stringify({
      cookie: cookieString,
      user_agent: userAgent || null,
      updated_at: new Date().toISOString(),
      url: ctx.url || ""
    }),
    `${storeKey}_META`
  );

  if (!notify || String(prevCookie) === String(cookieString)) return;

  const title = "快手极速版 Cookie 已更新";
  const subtitle = "任务中心请求已捕获";
  const preview = cookieString.length > 96 ? `${cookieString.slice(0, 96)}…` : cookieString;

  const attachPayload = {};
  let hasAttach = false;

  if (clipboardPref) {
    attachPayload.clipboard = buildClipboardContent(cookieString, userAgent);
    hasAttach = true;
  }

  const openUrl = readString(args, ["cookie_openUrl", "openUrl"]);
  if (openUrl) {
    attachPayload.openUrl = openUrl;
    hasAttach = true;
  }

  const mediaUrl = readString(args, ["cookie_mediaUrl", "mediaUrl"]);
  if (mediaUrl) {
    attachPayload.mediaUrl = mediaUrl;
    hasAttach = true;
  }

  const delayMs = readDelay(args, ["cookie_delayMs", "cookie_delay", "delayMs", "delay"]);

  $notification.post(
    title,
    subtitle,
    preview,
    hasAttach ? attachPayload : undefined,
    delayMs > 0 ? delayMs : 0
  );
}

function collectCookieSegments(headers) {
  const segments = [];
  const handledKeys = new Set();

  Object.keys(headers || {}).forEach(key => {
    handledKeys.add(key);
    addSegmentIfCookie(key, headers[key], segments);
  });

  ["Cookie", "cookie"].forEach(key => {
    if (!handledKeys.has(key) && headers && headers[key] != null) {
      addSegmentIfCookie(key, headers[key], segments);
    }
  });

  return segments;
}

function addSegmentIfCookie(key, value, collector) {
  if (!key) return;
  const lower = key.toLowerCase();
  if (lower === "cookie" || lower.startsWith("cookie#")) {
    if (Array.isArray(value)) {
      value.forEach(v => addSegmentIfCookie(key, v, collector));
    } else if (value != null) {
      const str = String(value).trim();
      if (str) collector.push(str);
    }
  }
}

function formatCookieString(values) {
  const pieces = [];
  values.forEach(val => {
    String(val)
      .split(/;+/)
      .forEach(item => {
        const trimmed = item.trim();
        if (trimmed) pieces.push(trimmed);
      });
  });

  if (pieces.length === 0) return "";

  const orderedKeys = [];
  const kv = Object.create(null);
  const flagItems = [];

  pieces.forEach(part => {
    const eqIdx = part.indexOf("=");
    if (eqIdx > 0) {
      const key = part.slice(0, eqIdx).trim();
      const val = part.slice(eqIdx + 1).trim();
      if (!(key in kv)) orderedKeys.push(key);
      kv[key] = val;
    } else {
      flagItems.push(part);
    }
  });

  const result = [];
  orderedKeys.forEach(key => {
    result.push(`${key}=${kv[key]}`);
  });
  flagItems.forEach(item => {
    result.push(item);
  });

  return result.join("; ");
}

// ---------- 工具函数 ----------
function detectContext() {
  const responseUrl = $response && typeof $response === "object" ? $response.url : undefined;
  const requestUrl = $request && typeof $request === "object" ? $request.url : undefined;
  const url = requestUrl || responseUrl || "";

  const isSalt = Boolean($response && /https?:\/\/api3\.ksapisrv\.com\/rest\/nebula\/user\/login/i.test(url));
  if (isSalt) {
    return { type: "salt", body: $response?.body ?? "", url };
  }

  const isCookie = Boolean($request && /https?:\/\/nebula\.kuaishou\.com\/rest\/n\/nebula\/activity\/earn\/overview\/tasks/i.test(url));
  if (isCookie) {
    return { type: "cookie", headers: $request?.headers || {}, url };
  }

  return { type: "unknown", body: $response?.body ?? null, url };
}

function parseArgs(str) {
  if (!str) return {};
  return str.split("&").reduce((acc, cur) => {
    if (!cur) return acc;
    const idx = cur.indexOf("=");
    const key = (idx >= 0 ? cur.slice(0, idx) : cur).trim();
    const val = idx >= 0 ? cur.slice(idx + 1) : "";
    acc[key] = decodeURIComponent(val || "");
    return acc;
  }, {});
}

function pickByRegex(body, pattern, group = 1) {
  const match = new RegExp(pattern, "m").exec(body);
  return match ? match[group] : null;
}

function readHeader(headers, target) {
  if (!headers || !target) return null;
  const wanted = target.toLowerCase();
  for (const key of Object.keys(headers)) {
    if ((key || "").toLowerCase() === wanted) {
      const value = headers[key];
      if (Array.isArray(value)) {
        return value.length > 0 ? String(value[0]) : null;
      }
      return value != null ? String(value) : null;
    }
  }
  return null;
}

function buildClipboardContent(cookieString, userAgent) {
  if (!cookieString) return "";
  if (!userAgent) return cookieString;
  return `Cookie: ${cookieString}\nUser-Agent: ${userAgent}`;
}

function readString(args, keys, defaultValue = "") {
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(args, key)) {
      const val = args[key];
      if (val != null && `${val}`.trim() !== "") {
        return `${val}`.trim();
      }
      return "";
    }
  }
  return defaultValue;
}

function readBool(args, keys, defaultOn) {
  const defaultStr = defaultOn ? "on" : "off";
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(args, key)) {
      const val = `${args[key]}`.trim().toLowerCase();
      if (["on", "true", "1", "yes"].includes(val)) return true;
      if (["off", "false", "0", "no"].includes(val)) return false;
    }
  }
  return ["on", "true", "1", "yes"].includes(defaultStr.toLowerCase());
}

function readDelay(args, keys) {
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(args, key)) {
      const num = Number(args[key]);
      if (Number.isFinite(num) && num >= 0) {
        return num;
      }
    }
  }
  return 0;
}
