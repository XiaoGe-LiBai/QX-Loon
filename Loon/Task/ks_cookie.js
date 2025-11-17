/**
 * Loon http-request script
 * 场景：快手普通版任务接口，请求头包含拆分 Cookie 字段
 * 匹配：^https?:\/\/encourage\.kuaishou\.com\/rest\/wd\/encourage\/unionTask\/treasureBox\/info
 * 功能：聚合 Cookie 并输出，不进行持久化存储
 * 输出格式：ks cookie=cookie值
 * 参数说明（可选）：
 *  - notify=on/off：是否发送通知（默认 on）
 *  - clipboard=on/off：通知时是否复制 Cookie（默认 on）
 *  - openUrl / mediaUrl / delayMs：透传给通知参数
 */
(function () {
  try {
    if (!$request) {
      throw new Error("未获取到请求对象");
    }

    const headers = $request.headers || {};
    const args = parseArgs(typeof $argument === "string" ? $argument : "");

    const notify = (args.notify || "on").toLowerCase() === "on";
    const clipboard = (args.clipboard || "on").toLowerCase() !== "off";

    const cookieSegments = collectCookieSegments(headers);
    if (cookieSegments.length === 0) {
      if (notify) {
        $notification.post("快手普通版 Cookie 获取失败", "", "请求头未包含 Cookie 字段");
      }
      return $done({});
    }

    const cookieString = formatCookieString(cookieSegments);
    if (!cookieString) {
      if (notify) {
        $notification.post("快手普通版 Cookie 获取失败", "", "Cookie 字段存在但内容为空");
      }
      return $done({});
    }

    // 输出格式：快手普通版cookie: cookie值
    const output = `快手普通版cookie: ${cookieString}`;
    console.log(output);

    if (notify) {
      const title = "快手普通版 Cookie 已更新";
      const subtitle = "任务接口请求捕获成功";
      const preview = cookieString.length > 96 ? `${cookieString.slice(0, 96)}…` : cookieString;

      const attachPayload = {};
      let hasAttach = false;

      if (clipboard) {
        attachPayload.clipboard = output;
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
    $notification.post("快手普通版 Cookie 脚本异常", "", String((err && err.stack) || err));
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


