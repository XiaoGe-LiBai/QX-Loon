/**
 * Loon script-response-body
 * Match: ^https?:\/\/api3\.ksapisrv\.com\/rest\/nebula\/user\/login
 * Saves: api_client_salt / user_id / user_name
 * Keys:
 *  - KS_API_CLIENT_SALT
 *  - KS_USER_ID
 *  - KS_USER_NAME
 *  - KS_MIN_INFO (aggregated)
 */
(function () {
  try {
    const raw = $response?.body || "";

    // Parse plugin arguments: saveUserInfo=on/off & notify=on/off
    function parseArgs(s) {
      const res = {};
      if (!s) return res;
      s.split("&").forEach(p => {
        const i = p.indexOf("=");
        const k = (i >= 0 ? p.slice(0, i) : p).trim();
        const v = (i >= 0 ? p.slice(i + 1) : "").trim();
        res[k] = decodeURIComponent(v || "");
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

    // Prefer JSON parsing
    try {
      const parsed = JSON.parse(raw);
      salt = parsed["kuaishou.api_client_salt"] ?? null;
      userId = parsed?.user?.user_id ?? null;
      userName = parsed?.user?.user_name ?? null;
    } catch (_) {
      // Fallback to regex extraction
      salt = pickByRegex(raw, "\"kuaishou\\.api_client_salt\"\\s*:\\s*\"([^\"]+)\"");
      userId = pickByRegex(raw, "\"user_id\"\\s*:\\s*(\\d+)");
      userName = pickByRegex(raw, "\"user_name\"\\s*:\\s*\"([^\"]*)\"");
    }

    const prevSalt = $persistentStore.read("KS_API_CLIENT_SALT");

    // Persist values
    if (salt != null) $persistentStore.write(String(salt), "KS_API_CLIENT_SALT");
    if (saveUserInfo) {
      if (userId != null) $persistentStore.write(String(userId), "KS_USER_ID");
      if (userName != null) $persistentStore.write(String(userName), "KS_USER_NAME");
    }
    $persistentStore.write(
      JSON.stringify({ api_client_salt: salt ?? null, user_id: userId ?? null, user_name: userName ?? null }),
      "KS_MIN_INFO"
    );

    // Notify only when the salt changes
    if (notify) {
      if (salt && String(prevSalt) !== String(salt)) {
        const title = "快手 salt 获取成功";
        const subtitle = (userName || userId)
          ? `用户：${userName || "-"} (${userId || "-"})`
          : "用户信息缺失";
        $notification.post(title, subtitle, String(salt));
      } else if (!salt) {
        $notification.post("未找到 api_client_salt", "", "请确认已启用 MITM 与证书，且已触发登录接口");
      }
    }

    // Do not modify original response
    $done({ body: raw });
  } catch (err) {
    $notification.post("脚本运行异常", "", String((err && err.stack) || err));
    $done({});
  }
})();
