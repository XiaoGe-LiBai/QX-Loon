/**
 * 快手极速版登录接口 - 提取 salt 与用户信息
 * 功能：从登录响应中提取 api_client_salt 并推送通知
 * @author XiaoGe-LiBai
 * @date 2026-05-31
 */

const scriptName = '快手极速版';

(function () {
  const args = parseArgs(typeof $argument === 'string' ? $argument : '');
  const notify = (args.notify || 'on').toLowerCase() === 'on';

  try {
    const raw = $response?.body ?? '';

    let salt = null;
    let userId = null;
    let userName = null;
    let headUrl = null;

    try {
      const parsed = JSON.parse(raw);
      salt = parsed['kuaishou.api_client_salt'] ?? null;
      userId = parsed?.user?.user_id ?? null;
      userName = parsed?.user?.user_name ?? null;
      headUrl = parsed?.user?.headurl ?? null;
    } catch (_) {
      salt = pickByRegex(raw, '"kuaishou\\.api_client_salt"\\s*:\\s*"([^"]+)"');
      userId = pickByRegex(raw, '"user_id"\\s*:\\s*(\\d+)');
      userName = pickByRegex(raw, '"user_name"\\s*:\\s*"([^"]*)"');
      headUrl = pickByRegex(raw, '"headurl"\\s*:\\s*"([^"]+)"');
    }

    const output = `${scriptName}salt: ${salt ?? ''}`;
    console.log(output);

    if (notify) {
      if (salt) {
        const title = `${scriptName} salt 已抓取`;
        const subtitle = '👆 点击此通知自动复制';
        const content = (userName || userId)
          ? `用户：${userName || '-'}（${userId || '-'}）`
          : '用户信息缺失';

        const attachPayload = {};
        let hasAttach = false;

        if ((args.clipboard || 'on').toLowerCase() !== 'off') {
          attachPayload.clipboard = output;
          hasAttach = true;
        }

        const mediaUrl = args.mediaUrl || headUrl;
        if (mediaUrl) {
          attachPayload.mediaUrl = mediaUrl;
          hasAttach = true;
        }

        if (args.openUrl) {
          attachPayload.openUrl = args.openUrl;
          hasAttach = true;
        }

        const delayMs = Math.max(0, Number(args.delayMs || args.delay || 0)) || 0;

        $notification.post(
          title,
          subtitle,
          content,
          hasAttach ? attachPayload : undefined,
          delayMs
        );
      } else {
        $notification.post(
          `${scriptName} salt 获取失败`,
          '',
          '请确认已启用 MITM 与证书，且已触发登录接口'
        );
      }
    }

    $done({ body: raw });
  } catch (err) {
    const errorMsg = String((err && err.stack) || err);
    console.log(`[${scriptName}] ❌ 脚本异常: ${errorMsg}`);
    if (notify) {
      $notification.post(`${scriptName} salt 脚本异常`, '', errorMsg);
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

function pickByRegex(body, pattern, group = 1) {
  const match = new RegExp(pattern, 'm').exec(body);
  return match ? match[group] : null;
}
