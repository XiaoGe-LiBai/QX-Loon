/**
 * 快手极速版任务接口 - 提取 Cookie
 * 功能：从请求头聚合拆分 Cookie 并推送通知
 * @author XiaoGe-LiBai
 * @date 2026-05-31
 */

const scriptName = '快手极速版';

(function () {
  const args = parseArgs(typeof $argument === 'string' ? $argument : '');
  const notify = (args.notify || 'on').toLowerCase() === 'on';
  const clipboard = (args.clipboard || 'on').toLowerCase() !== 'off';

  try {
    if (!$request) {
      throw new Error('未获取到请求对象');
    }

    const headers = $request.headers || {};
    const cookieSegments = collectCookieSegments(headers);

    if (cookieSegments.length === 0) {
      if (notify) {
        $notification.post(`${scriptName} Cookie 获取失败`, '', '请求中未找到 Cookie 字段');
      }
      return $done({});
    }

    const cookieString = formatCookieString(cookieSegments);
    if (!cookieString) {
      if (notify) {
        $notification.post(`${scriptName} Cookie 获取失败`, '', 'Cookie 字段内容为空');
      }
      return $done({});
    }

    const output = `${scriptName}cookie: ${cookieString}`;
    console.log(output);

    // 通知防抖：10秒内重复触发不通知
    const now = Date.now();
    const lastNotifyKey = 'ksjsb_cookie_last_notify';
    const lastNotifyTime = parseInt($persistentStore.read(lastNotifyKey) || '0');
    const cooldownMs = 10000;

    if (notify && (now - lastNotifyTime >= cooldownMs)) {
      $persistentStore.write(String(now), lastNotifyKey);

      const title = `${scriptName} Cookie 已抓取`;
      const subtitle = '👆 点击此通知自动复制';
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

      const delayMs = Math.max(0, Number(args.delayMs || args.delay || 0)) || 0;

      $notification.post(
        title,
        subtitle,
        preview,
        hasAttach ? attachPayload : undefined,
        delayMs
      );
    } else if (notify) {
      console.log(`[${scriptName}] ⏱️ 通知已限流（10秒内重复触发）`);
    }

    $done({});
  } catch (err) {
    const errorMsg = String((err && err.stack) || err);
    console.log(`[${scriptName}] ❌ Cookie 脚本异常: ${errorMsg}`);
    if (notify) {
      $notification.post(`${scriptName} Cookie 脚本异常`, '', errorMsg);
    }
    $done({});
  }
})();

function parseArgs(str) {
  if (!str) return {};
  return str.split('&').reduce((acc, cur) => {
    if (!cur) return acc;
    const idx = cur.indexOf('=');
    const key = (idx >= 0 ? cur.slice(0, idx) : cur).trim();
    const val = idx >= 0 ? cur.slice(idx + 1) : '';
    acc[key] = decodeURIComponent(val || '');
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

  ['Cookie', 'cookie'].forEach(key => {
    if (!handledKeys.has(key) && headers && headers[key] != null) {
      addSegmentIfCookie(key, headers[key], segments);
    }
  });

  return segments;
}

function addSegmentIfCookie(key, value, collector) {
  if (!key) return;
  const lower = key.toLowerCase();
  if (lower === 'cookie' || lower.startsWith('cookie#')) {
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

  if (pieces.length === 0) return '';

  const orderedKeys = [];
  const kv = Object.create(null);
  const flagItems = [];

  pieces.forEach(part => {
    const eqIdx = part.indexOf('=');
    if (eqIdx > 0) {
      const key = part.slice(0, eqIdx).trim();
      const val = part.slice(eqIdx + 1).trim();
      if (!(key in kv)) orderedKeys.push(key);
      kv[key] = val;
    } else {
      flagItems.push(part);
    }
  });

  // 优先排列 __NSWJ 参数
  const priorityKeys = ['__NSWJ'];
  const sortedKeys = [];

  priorityKeys.forEach(priorityKey => {
    if (orderedKeys.includes(priorityKey)) {
      sortedKeys.push(priorityKey);
    }
  });

  orderedKeys.forEach(key => {
    if (!priorityKeys.includes(key)) {
      sortedKeys.push(key);
    }
  });

  const result = [];
  sortedKeys.forEach(key => {
    result.push(`${key}=${kv[key]}`);
  });
  flagItems.forEach(item => {
    result.push(item);
  });

  return result.join('; ');
}
