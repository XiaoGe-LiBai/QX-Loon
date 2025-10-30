(function () {
  const raw = $response?.body || "";
  let salt = null, user_id = null, user_name = null;

  function pick(body, re, g = 1) { const m = re.exec(body); return m ? m[g] : null; }

  try {
    const j = JSON.parse(raw);
    salt = j["kuaishou.api_client_salt"] ?? null;
    user_id = j?.user?.user_id ?? null;
    user_name = j?.user?.user_name ?? null;
  } catch (_) {
    salt = pick(raw, /"kuaishou\.api_client_salt"\s*:\s*"([^"]+)"/);
    user_id = pick(raw, /"user_id"\s*:\s*(\d+)/);
    user_name = pick(raw, /"user_name"\s*:\s*"([^"]*)"/);
  }

  // 持久化
  if (salt != null) $persistentStore.write(String(salt), "KS_API_CLIENT_SALT");
  if (user_id != null) $persistentStore.write(String(user_id), "KS_USER_ID");
  if (user_name != null) $persistentStore.write(String(user_name), "KS_USER_NAME");
  $persistentStore.write(JSON.stringify({
    api_client_salt: salt || null,
    user_id: user_id || null,
    user_name: user_name || null
  }), "KS_MIN_INFO");

  // 日志 + 通知（命中必弹，便于确认脚本运行）
  console.log("KS Salt Capture hit:", { salt: !!salt, user_id, user_name });
  const title = "KS 捕获" + (salt ? "成功" : "未取到 salt");
  const sub = (user_name || user_id) ? `用户：${user_name || "-"} (${user_id || "-"})` : "用户信息：-";
  const msg = salt ? String(salt) : "规则命中，但未在响应体中找到 api_client_salt";
  $notification.post(title, sub, msg);

  $done({ body: raw });
})();
