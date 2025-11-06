/*
快手极速版 kaw 参数抓取脚本（适用于 Loon）
触发条件：拦截 https://api.e.kuaishou.com/rest/e/neo/mixed/ad 请求
功能：从请求头中提取 kaw 参数值并输出
输出格式: 快手极速版kaw: 参数值
*/
(function () {
  try {
    if (!$request || $request.method === 'OPTIONS') {
      return $done({});
    }

    // 从请求头中提取 kaw 参数值
    const headers = $request.headers || {};
    let kawValue = null;

    // 检查请求头中的 kaw 参数
    if (headers.kaw) {
      kawValue = headers.kaw;
    } else if (headers['kaw']) {
      kawValue = headers['kaw'];
    }

    if (kawValue) {
      console.log(`快手极速版kaw: ${kawValue}`);

      // 发送通知
      $notification.post(
        '快手极速版 kaw 参数',
        'kaw 参数捕获成功',
        `长度: ${kawValue.length} 字符`,
        {
          clipboard: `快手极速版kaw: ${kawValue}`
        }
      );
    } else {
      console.log('快手极速版kaw: 未找到 kaw 参数');
      console.log('请求头信息:', JSON.stringify(headers, null, 2));
    }
  } catch (err) {
    console.log('快手极速版 kaw 脚本异常:', err.message);
    $notification.post('快手极速版 kaw 脚本异常', '', String((err && err.stack) || err));
  }

  $done({});
})();