/**
 * Loon script-response-body
 * 场景：快手极速版登录接口，提取 salt 与用户信息
 * 匹配：^https?:\/\/api3\.ksapisrv\.com\/rest\/nebula\/user\/login
 * 功能：提取并输出 api_client_salt 和用户信息，不进行持久化存储
 * 输出格式：ksjsb salt=参数值
 * 参数说明（可选）：
 *  - notify=on/off：是否发送通知（默认 on）
 *  - clipboard=on/off：通知时是否复制内容到剪贴板（默认 on）
 *  - mediaUrl/openUrl/delayMs：透传给 $notification.post
 */
(function () {
  try {
    const raw = $response?.body ?? "";

    function parseArgs(s) {
      const res = {};
      if (!s) return res;
      s.split("&").forEach(pair => {
        const idx = pair.indexOf("=");
        const key = (idx >= 0 ? pair.slice(0, idx) : pair).trim();
        const val = (idx >= 0 ? pair.slice(idx + 1) : "").trim();
        res[key] = decodeURIComponent(val || "");
      });
      return res;
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

    // 输出格式：快手极速版salt: 参数值
    const output = `快手极速版salt: ${salt ?? ""}`;
    console.log(output);
    console.log("📋 提示：点击弹窗通知即可自动复制完整内容到剪贴板");

    if (notify) {
      if (salt) {
        const title = "快手极速版 salt 已抓取";
        const subtitle = "👆 点击此通知自动复制";

        const userInfo = (userName || userId)
          ? `用户: ${userName || "-"} (${userId || "-"})`
          : "用户信息缺失";
        const content = userInfo;

        const attachPayload = {};
        let hasAttach = false;

        const clipboardPref = (args.clipboard || "on").toLowerCase();
        // 允许时复制内容到剪贴板，方便直接粘贴使用
        if (clipboardPref !== "off") {
          attachPayload.clipboard = output;
          hasAttach = true;
        }

        const mediaUrl = args.mediaUrl || headUrl;
        // 默认使用头像 URL，可通过参数覆盖
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
        $notification.post("快手极速版 salt 获取失败", "", "请确认已启用 MITM 与证书，且已触发登录接口");
      }
    }

    $done({ body: raw });
  } catch (err) {
    $notification.post("脚本运行异常", "", String((err && err.stack) || err));
    $done({});
  }
})();
