/**
 * Loon script-response-body
 * Match: ^https?:\/\/api3\.ksapisrv\.com\/rest\/nebula\/user\/login
 * 仅保存：api_client_salt / user_id / user_name
 */
(function () {
  const raw = $response?.body || "";

  function pickByRegex(body, key, group = 1) {
    const m = new RegExp(key, "m").exec(body);
    return m ? m[group] : null;
  }

  let salt = null, user_id = null, user_name = null, headurl = null;

  // 优先 JSON 解析
  try {
    const j = JSON.parse(raw);
    salt = j["kuaishou.api_client_salt"] ?? null;
    user_id = j?.user?.user_id ?? null;
    user_name = j?.user?.user_name ?? null;
    headurl = j?.user?.headurl ?? null;
  } catch (_) {
    // 回退：正则从原始文本提取
    salt = pickByRegex(raw, "\"kuaishou\\.api_client_salt\"\\s*:\\s*\"([^\"]+)\"");
    user_id = pickByRegex(raw, "\"user_id\"\\s*:\\s*(\\d+)");
    user_name = pickByRegex(raw, "\"user_name\"\\s*:\\s*\"([^\"]*)\"");
    headurl = pickByRegex(raw, "\"headurl\"\\s*:\\s*\"([^\"]+)\"");
  }

  // 写入持久化（分别 + 汇总）
  if (salt != null) $persistentStore.write(String(salt), "KS_API_CLIENT_SALT");
  if (user_id != null) $persistentStore.write(String(user_id), "KS_USER_ID");
  if (user_name != null) $persistentStore.write(String(user_name), "KS_USER_NAME");
  $persistentStore.write(
    JSON.stringify({ api_client_salt: salt || null, user_id: user_id || null, user_name: user_name || null }),
    "KS_MIN_INFO"
  );

  // 通知（Loon 通知不渲染图片，头像仅作为可点链接）
  const ok = salt != null;
  const title = ok ? "快手信息获取成功" : "未找到 api_client_salt";
  const sub = (user_name || user_id) ? `用户：${user_name || "-"} (${user_id || "-"})` : "";
  const saltShow = salt ? (String(salt)) : "-";
  const body = `salt: ${saltShow}`;
  const opts = headurl ? { url: headurl } : undefined; // 点通知打开头像链接
  try {
    // Loon 的 $notification.post 第四参可传 url（部分版本支持）
    $notification.post(title, sub, body, opts);
  } catch (_) {
    $notification.post(title, sub, body);
  }

  // 不改动原响应
  $done({ body: raw });
})();
