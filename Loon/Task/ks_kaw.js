/**
 * Loon http-request script
 * 场景：快手普通版表情包接口，请求头包含 kaw 参数
 * 匹配：^https?:\/\/az4-api\.ksapisrv\.com\/rest\/n\/emotion\/package\/list\/v2
 * 功能：提取 kaw 参数并输出，不进行持久化存储
 * 输出格式：快手普通版kaw: 参数值
 * 参数说明（可选）：
 *  - notify=on/off：是否发送通知（默认 on）
 *  - clipboard=on/off：通知时是否复制 kaw 参数（默认 on）
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

    // 提取 kaw 参数
    const kawValue = readHeader(headers, "kaw");

    if (!kawValue) {
      if (notify) {
        $notification.post("快手普通版 kaw 参数获取失败", "", "请求头中未找到 kaw 字段");
      }
      console.log("快手普通版kaw: 未找到 kaw 参数");
      console.log("请求头信息:", JSON.stringify(headers, null, 2));
      return $done({});
    }

    // 输出格式：快手普通版kaw: 参数值
    const output = `快手普通版kaw: ${kawValue}`;
    console.log(output);
    console.log("📋 提示：点击弹窗通知即可自动复制完整内容到剪贴板");

    // 通知防抖：10秒内重复触发不通知
    const now = Date.now();
    const lastNotifyKey = "ks_kaw_last_notify";
    const lastNotifyTime = parseInt($persistentStore.read(lastNotifyKey) || "0");
    const cooldownMs = 10000; // 10秒冷却时间
    const shouldNotify = notify && (now - lastNotifyTime >= cooldownMs);

    if (shouldNotify) {
      $persistentStore.write(String(now), lastNotifyKey);

      const title = "快手普通版 kaw 参数已抓取";
      const subtitle = "👆 点击此通知自动复制";
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

      const delayValue = Number(args.delayMs || args.delay || 0);
      const delayMs = Number.isFinite(delayValue) ? delayValue : 0;

      $notification.post(
        title,
        subtitle,
        preview,
        hasAttach ? attachPayload : undefined,
        delayMs > 0 ? delayMs : 0
      );
    } else if (notify) {
      console.log("⏱️ 通知已被限流（10秒内重复触发），完整内容已输出到控制台");
    }

    $done({});
  } catch (err) {
    const errorMsg = String((err && err.stack) || err);
    console.log("快手普通版 kaw 脚本异常:", errorMsg);
    if ((args.notify || "on").toLowerCase() === "on") {
      $notification.post("快手普通版 kaw 脚本异常", "", errorMsg);
    }
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