/**
 * Loon script-response-body
 * Match: ^https?:\/\/api3\.ksapisrv\.com\/rest\/nebula\/user\/login
 * 保存：api_client_salt / user_id / user_name
 * Keys:
 *  - KS_API_CLIENT_SALT
 *  - KS_USER_ID
 *  - KS_USER_NAME
 *  - KS_MIN_INFO (聚合)
 */
(function () {
  try {
    const raw = $response?.body || "";

    // 解析插件参数：saveUserInfo=on/off & notify=on/off
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

    function pickByRegex(body, key, group = 1) {
      const m = new RegExp(key, "m").exec(body);
      return m ? m[group] : null;
    }

    let salt = null, user_id = null, user_name = null;

    // 优先 JSON 解析
    try {
      const j = JSON.parse(raw);
      salt = j["kuaishou.api_client_salt"] ?? null;
      user_id = j?.user?.user_id ?? null;
      user_name = j?.user?.user_name ?? null;
    } catch (_) {
      // 回退：正则从原始文本提取
      salt = pickByRegex(raw, "\"kuaishou\\.api_client_salt\"\\s*:\\s*\"([^\"]+)\"");
      user_id = pickByRegex(raw, "\"user_id\"\\s*:\\s*(\\d+)");
      user_name = pickByRegex(raw, "\"user_name\"\\s*:\\s*\"([^\"]*)\"");
    }

    // 写入持久化
    if (salt != null) $persistentStore.write(String(salt), "KS_API_CLIENT_SALT");
    if (saveUserInfo) {
      if (user_id != null) $persistentStore.write(String(user_id), "KS_USER_ID");
      if (user_name != null) $persistentStore.write(String(user_name), "KS_USER_NAME");
    }
    $persistentStore.write(
      JSON.stringify({ api_client_salt: salt || null, user_id: user_id || null, user_name: user_name || null }),
      "KS_MIN_INFO"
    );

    // 通知（仅在首次/变更时）
    const prev = $persistentStore.read("KS_API_CLIENT_SALT");
    if (notify) {
      if (salt && String(prev) !== String(salt)) {
        const title = "快手 salt 获取成功";
        const sub = (user_name || user_id) ? `用户：${user_name || "-"} (${user_id || "-"})` : "用户信息：-";
        $notification.post(title, sub, String(salt));
      } else if (!salt) {
        $notification.post("未找到 api_client_salt", "", "请确认已启用 MITM 与证书，且已触发登录接口");
      }
    }

    // 不改动原响应
    $done({ body: raw });
  } catch (e) {
    $notification.post("脚本运行异常", "", String(e && e.stack || e));
    $done({});
  }
})();
