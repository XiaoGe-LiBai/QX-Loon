/*
顺丰速运 Token 抓取脚本（适用于 Loon）
触发条件：拦截 https://ccsp-egmas.sf-express.com/cx-app-member/member/app/user/universalSign 请求
通知：点击可复制 Token
*/
(function () {
  try {
    if (!$request || $request.method === 'OPTIONS') {
      return $done({});
    }

    const body = JSON.parse($request.body || '{}');
    const userId = body.userId;
    const mobile = body.mobile;

    if (!userId || !mobile) {
      console.log('❌ 参数缺失');
      return $done({});
    }

    const tokenData = {
      url: $request.url,
      headers: $request.headers,
      body: $request.body
    };

    const output = JSON.stringify({ userId, token: tokenData, userName: mobile }, null, 2);

    console.log('✅ Token已抓取');
    console.log(output);

    $notification.post(
      '顺丰速运 Token 已抓取',
      '👆 点击此通知自动复制',
      `账号: ${mobile}`,
      { clipboard: output }
    );

  } catch (err) {
    console.log(`❌ ${err.message || err}`);
  }

  $done({});
})();
