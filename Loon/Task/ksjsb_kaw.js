/*
快手极速版 kaw 参数抓取脚本（适用于 Loon）
触发条件：拦截 https://api.e.kuaishou.com/rest/e/neo/mixed/ad 请求
功能：从请求体中提取 kaw 参数值并输出
输出格式: ksjsb kaw=参数值
*/
(function () {
  try {
    if (!$request || $request.method !== 'POST' || $request.method === 'OPTIONS') {
      return $done({});
    }

    // 简化脚本，只关注 kaw 参数值的提取和输出

    // 从请求体中提取 kaw 参数值
    try {
      if ($request.body) {
        const requestBody = $request.body;

        // 尝试解析 JSON 请求体
        const parsedBody = JSON.parse(requestBody);
        const kawValue = parsedBody.kaw || null;

        // 如果直接解析失败，尝试从字符串中提取
        if (!kawValue) {
          const kawMatch = requestBody.match(/"kaw"\s*:\s*"([^"]+)"/);
          const extractedValue = kawMatch ? kawMatch[1] : null;

          if (extractedValue) {
            console.log(`ksjsb kaw=${extractedValue}`);
          }
        } else {
          console.log(`ksjsb kaw=${kawValue}`);
        }
      }
    } catch (err) {
      console.log('解析请求体时出错:', err.message);
    }
  }

  $done({});
})();

function parseArgs(str) {
  if (!str) return {};
  return str.split('&').reduce((acc, cur) => {
    if (!cur) return acc;
    const idx = cur.indexOf('=');
    const key = (idx >= 0 ? cur.slice(0, idx) : cur).trim();
    const val = idx >= 0 ? cur.slice(idx + 1) : '';
    acc[key] = decodeURIComponent(val || '');
    return acc;
  }, {});
}