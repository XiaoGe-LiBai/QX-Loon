/*
达美乐微信小程序 Authorization 抓取脚本（适用于 Loon）
触发条件：拦截 https://game.dominos.com.cn/.../getUser 请求
*/
if ($request && $request.method !== 'OPTIONS') {
  const headers = $request.headers || {};
  const token = headers.authorization || headers.Authorization || '';

  if (token) {
    const cleaned = token.replace(/^Bearer\s+/i, '');
    $notification.post('微信小程序-达美乐Token', '', cleaned);
  } else {
    $notification.post('微信小程序-达美乐Token', '未找到 Authorization 头', '');
  }
}
$done({});
