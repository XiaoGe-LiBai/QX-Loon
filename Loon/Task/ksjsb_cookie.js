/**
 * Loon http-request script
 * 监听快手极速版任务中心任务页接口，自动聚合 Cookie 与 User-Agent 并保存
 *
 * 插件参数（可选）：
 *   - storeKey: 自定义持久化键名，默认 KS_EARN_COOKIE
 *   - notify: on/off，是否通知（默认 on，仅 Cookie 变化时提醒）
 *   - clipboard: on/off，是否复制到剪贴板（默认 on，会同时包含 Cookie 与 User-Agent）
 *   - openUrl / mediaUrl / delayMs：同 Loon $notification.attach 参数
 */
(function () {
  try {
    if (!$request) {
      throw new Error("未获取到请求对象");
    }

    const headers = $request.headers || {};
    const args = parseArgs(typeof $argument === "string" ? $argument : "");

    const storeKey = args.storeKey || "KS_EARN_COOKIE";
    const notify = (args.notify || "on").toLowerCase() === "on";
    const clipboard = (args.clipboard || "on").toLowerCase() !== "off";

    const cookieSegments = collectCookieSegments(headers);
    if (cookieSegments.length === 0) {
      if (notify) {
        $notification.post("快手极速版 Cookie 获取失败", "", "请求中未找到 Cookie 字段");
      }
      return $done({});
    }

    const cookieString = formatCookieString(cookieSegments);
    if (!cookieString) {
      if (notify) {
        $notification.post("快手极速版 Cookie 获取失败", "", "Cookie 字段内容为空");
      }
      return $done({});
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
        url: $request.url || ""
      }),
      `${storeKey}_META`
    );

    if (notify && String(prevCookie) !== String(cookieString)) {
      const title = "快手极速版 Cookie 已更新";
      const subtitle = "任务中心请求已捕获";
      const preview = cookieString.length > 96 ? `${cookieString.slice(0, 96)}…` : cookieString;

      const attachPayload = {};
      let hasAttach = false;

      if (clipboard) {
        attachPayload.clipboard = buildClipboardContent(cookieString, userAgent);
        hasAttach = true;
      }

      if (args.openUrl) {
        attachPayload.openUrl = args.openUrl;
        hasAttach = true;
      }

      if (args.mediaUrl) {
        attachPayload.mediaUrl = args.mediaUrl;
        hasAttach = true;
      }

      const delayValue = Number(args.delayMs || args.delay || 0);
      const delayMs = Number.isFinite(delayValue) ? delayValue : 0;

      $notification.post(
        title,
        subtitle,
        preview,
        hasAttach ? attachPayload : undefined,
        delayMs > 0 ? delayMs : 0
      );
    }

    $done({});
  } catch (err) {
    $notification.post("快手极速版 Cookie 获取异常", "", String((err && err.stack) || err));
    $done({});
  }
})();

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
