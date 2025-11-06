/**
 * Loon http-request script
 * 场景：快手极速版广告接口，请求头包含 kaw 参数
 * 匹配：^https?:\/\/api\.e\.kuaishou\.com\/rest\/e\/neo\/mixed\/ad
 * 功能：提取 kaw 参数并输出，不进行持久化存储
 * 输出格式：快手极速版kaw: 参数值
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
        $notification.post("快手极速版 kaw 参数获取失败", "", "请求头中未找到 kaw 字段");
      }
      console.log("快手极速版kaw: 未找到 kaw 参数");
      console.log("请求头信息:", JSON.stringify(headers, null, 2));
      return $done({});
    }

    // 输出格式：快手极速版kaw: 参数值
    const output = `快手极速版kaw: ${kawValue}`;
    console.log(output);

    if (notify) {
      const title = "快手极速版 kaw 参数已更新";
      const subtitle = "广告接口请求捕获成功";
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
    }

    $done({});
  } catch (err) {
    const errorMsg = String((err && err.stack) || err);
    console.log("快手极速版 kaw 脚本异常:", errorMsg);
    if ((args.notify || "on").toLowerCase() === "on") {
      $notification.post("快手极速版 kaw 脚本异常", "", errorMsg);
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