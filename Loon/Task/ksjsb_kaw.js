/**
 * 快手极速版广告接口 - 提取 kaw 参数
 * 功能：从请求头提取 kaw 参数并推送通知
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
    const kawValue = readHeader(headers, 'kaw');

    if (!kawValue) {
      console.log(`[${scriptName}] kaw 参数未找到`);
      if (notify) {
        $notification.post(`${scriptName} kaw 参数获取失败`, '', '请求头中未找到 kaw 字段');
      }
      return $done({});
    }

    const output = `${scriptName}kaw: ${kawValue}`;
    console.log(output);

    // 通知防抖：10秒内重复触发不通知
    const now = Date.now();
    const lastNotifyKey = 'ksjsb_kaw_last_notify';
    const lastNotifyTime = parseInt($persistentStore.read(lastNotifyKey) || '0');
    const cooldownMs = 10000;

    if (notify && (now - lastNotifyTime >= cooldownMs)) {
      $persistentStore.write(String(now), lastNotifyKey);

      const title = `${scriptName} kaw 参数已抓取`;
      const subtitle = '👆 点击此通知自动复制';
      const preview = kawValue.length > 96 ? `${kawValue.slice(0, 96)}…` : kawValue;

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
    console.log(`[${scriptName}] ❌ kaw 脚本异常: ${errorMsg}`);
    if (notify) {
      $notification.post(`${scriptName} kaw 脚本异常`, '', errorMsg);
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

function readHeader(headers, target) {
  if (!headers || !target) return null;
  const wanted = target.toLowerCase();
  for (const key of Object.keys(headers)) {
    if ((key || '').toLowerCase() === wanted) {
      const value = headers[key];
      if (Array.isArray(value)) {
        return value.length > 0 ? String(value[0]) : null;
      }
      return value != null ? String(value) : null;
    }
  }
  return null;
}
