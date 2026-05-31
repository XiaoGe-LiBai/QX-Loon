/*
达美乐微信小程序 Authorization 抓取脚本（适用于 Loon）
触发条件：拦截 https://game.dominos.com.cn/{活动名}/v2/getUser 请求（支持所有活动）
通知：点击可复制 Token（可通过参数控制）
输出格式：,dlm set token#备注
 * @license MIT
*/
(function () {
  try {
    if (!$request || $request.method === 'OPTIONS') {
      return $done({});
    }

    const headers = $request.headers || {};
    const args = parseArgs(typeof $argument === 'string' ? $argument : '');

    const notify = (args.notify || 'on').toLowerCase() !== 'off';
    const clipboard = (args.clipboard || 'on').toLowerCase() !== 'off';

    const rawToken = readHeader(headers, 'authorization');

    if (!rawToken) {
      if (notify) {
        $notification.post(
          '微信小程序-达美乐Token',
          '未找到 Authorization 头',
          $request.url || ''
        );
      }
      return $done({});
    }

    const cleaned = rawToken.replace(/^Bearer\s+/i, '').trim();

    if (!cleaned) {
      if (notify) {
        $notification.post(
          '微信小程序-达美乐Token',
          'Authorization 内容为空',
          $request.url || ''
        );
      }
      return $done({});
    }

    // 输出格式: ,dlm set token#备注
    const remark = args.remark || '达美乐Token';
    const output = `,dlm set ${cleaned}#${remark}`;

    // 输出到控制台/日志
    console.log(output);
    console.log('📋 提示：点击弹窗通知即可自动复制完整内容到剪贴板');

    if (notify) {
      const attachPayload = {};
      let hasAttach = false;

      // 将格式化输出放入剪贴板
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
        '达美乐 Token 已抓取',
        '👆 点击此通知自动复制',
        `格式: ${output}`,
        hasAttach ? attachPayload : undefined,
        delayMs > 0 ? delayMs : 0
      );
    }
  } catch (err) {
    $notification.post(
      '微信小程序-达美乐Token 脚本异常',
      '',
      String((err && err.stack) || err)
    );
  }

  $done({});
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
  if (!headers || !target) return '';
  const wanted = target.toLowerCase();
  for (const key of Object.keys(headers)) {
    if ((key || '').toLowerCase() === wanted) {
      const value = headers[key];
      if (Array.isArray(value)) {
        return value.length > 0 ? String(value[0] || '') : '';
      }
      return value != null ? String(value) : '';
    }
  }
  return headers[target] || headers[target.toUpperCase()] || '';
}

