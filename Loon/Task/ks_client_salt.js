/**
 * Loon script-response-body
 * Match: ^https?:\/\/api3\.ksapisrv\.com\/rest\/nebula\/user\/login
 * Persist keys:
 *  - KS_API_CLIENT_SALT
 *  - KS_USER_ID
 *  - KS_USER_NAME
 *  - KS_USER_HEADURL
 *  - KS_MIN_INFO (summary JSON)
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
    const saveUserInfo = (args.saveUserInfo || "on").toLowerCase() === "on";
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

    const prevSalt = $persistentStore.read("KS_API_CLIENT_SALT");

    if (salt != null) $persistentStore.write(String(salt), "KS_API_CLIENT_SALT");
    if (saveUserInfo) {
      if (userId != null) $persistentStore.write(String(userId), "KS_USER_ID");
      if (userName != null) $persistentStore.write(String(userName), "KS_USER_NAME");
      if (headUrl != null) $persistentStore.write(String(headUrl), "KS_USER_HEADURL");
    }

    $persistentStore.write(
      JSON.stringify({
        user_name: userName ?? null,
        user_id: userId ?? null,
        api_client_salt: salt ?? null,
        head_url: headUrl ?? null
      }),
      "KS_MIN_INFO"
    );

    if (notify) {
      if (salt && String(prevSalt) !== String(salt)) {
        const title = "快手 salt 获取成功";
        const subtitle = (userName || userId)
          ? `用户: ${userName || "-"} (${userId || "-"})`
          : "用户信息缺失";

        const contentLines = [
          `user_name=${userName ?? "-"}`,
          `user_id=${userId ?? "-"}`,
          `api_client_salt=${salt ?? "-"}`
        ];
        const content = contentLines.join("\n");

        const attachPayload = {};
        let hasAttach = false;

        const clipboardPref = (args.clipboard || "on").toLowerCase();
        if (clipboardPref !== "off") {
          attachPayload.clipboard = content;
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
      } else if (!salt) {
        $notification.post("未找到 api_client_salt", "", "请确认已启用 MITM 与证书，且已触发登录接口");
      }
    }

    $done({ body: raw });
  } catch (err) {
    $notification.post("脚本运行异常", "", String((err && err.stack) || err));
    $done({});
  }
})();
