/**
 * Loon script-response-body
 * 场景：快手普通版登录接口，提取 salt 与用户信息
 * 匹配：^https?:\/\/api3\.gifshow\.com\/rest\/n\/user\/login
 * 功能：提取并输出 api_client_salt 和用户信息，不进行持久化存储
 * 输出格式：ks salt=参数值
 * 参数说明（可选）：
 *  - notify=on/off：是否发送通知（默认 on）
 *  - clipboard=on/off：通知时是否复制内容到剪贴板（默认 on）
 *  - mediaUrl/openUrl/delayMs：透传给 $notification.post
 */
(function () {
  try {
    const raw = $response?.body ?? "";

    function parseArgs(s) {
      if (!s) return {};
      return s.split("&").reduce((acc, cur) => {
        if (!cur) return acc;
        const idx = cur.indexOf("=");
        const key = (idx >= 0 ? cur.slice(0, idx) : cur).trim();
        const val = idx >= 0 ? cur.slice(idx + 1) : "";
        acc[key] = decodeURIComponent(val || "");
        return acc;
      }, {});
    }

    const args = parseArgs(typeof $argument === "string" ? $argument : "");
    const notify = (args.notify || "on").toLowerCase() === "on";

    function pickByRegex(body, pattern, group = 1) {
      const match = new RegExp(pattern, "m").exec(body);
      return match ? match[group] : null;
    }

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

    // 输出格式：ks salt=参数值
    const output = `ks salt=${salt ?? ""}`;
    console.log(output);

    if (notify) {
      if (salt) {
        const title = "快手普通版 salt 获取成功";
        const subtitle = (userName || userId)
          ? `用户：${userName || "-"}（${userId || "-"}）`
          : "未获取到用户信息";

        const content = `api_client_salt=${salt ?? "-"}`;

        const attachPayload = {};
        let hasAttach = false;

        const clipboardPref = (args.clipboard || "on").toLowerCase();
        if (clipboardPref !== "off") {
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

        const delayValue = Number(args.delayMs || args.delay || 0);
        const delayMs = Number.isFinite(delayValue) ? delayValue : 0;

        $notification.post(
          title,
          subtitle,
          content,
          hasAttach ? attachPayload : undefined,
          delayMs > 0 ? delayMs : 0
        );
      } else {
        $notification.post("快手普通版 salt 获取失败", "", "未在响应体中找到 api_client_salt，请确认已开启 MITM 并重新触发登录接口");
      }
    }

    $done({ body: raw });
  } catch (err) {
    $notification.post("快手普通版 salt 脚本异常", "", String((err && err.stack) || err));
    $done({});
  }
})();

