/*
爱奇艺尖叫之夜 Cookie 抓取脚本（适用于 Loon）
触发条件：拦截 https://act.vip.iqiyi.com/supermk/seckill/action/seckill 请求
功能：抓取完整的 Cookie 和设备参数，用于 Python 脚本抢购
参数说明（可选）：
 - notify=on/off：是否通知（默认 on）
 - clipboard=on/off：是否复制到剪贴板（默认 on）
 - file=on/off：是否生成抓包文件格式（默认 on）
*/
(function () {
  try {
    const args = parseArgs(typeof $argument === "string" ? $argument : "");
    const notify = (args.notify || "on").toLowerCase() !== "off";
    const clipboard = (args.clipboard || "on").toLowerCase() !== "off";
    const fileFormat = (args.file || "on").toLowerCase() !== "off";

    // 提取请求头中的所有 Cookie
    const headers = $request?.headers || {};
    const cookies = extractCookies(headers);

    // 提取请求体参数
    const bodyStr = $request?.body || "";
    let bodyParams = {};

    try {
      if (bodyStr) {
        bodyParams = JSON.parse(bodyStr);
      }
    } catch (e) {
      console.log("爱奇艺秒杀：请求体解析失败");
    }

    // 生成抓包文件格式的输出
    let captureOutput = "";

    if (fileFormat) {
      captureOutput = ":scheme: https\n";
      captureOutput += ":path: /supermk/seckill/action/seckill\n";
      captureOutput += ":authority: act.vip.iqiyi.com\n";
      captureOutput += ":method: POST\n";
      captureOutput += "content-type: application/json\n";
      captureOutput += "accept: application/json, text/plain, */*\n";
      captureOutput += "sec-fetch-site: same-site\n";
      captureOutput += "accept-language: zh-CN,zh-Hans;q=0.9\n";
      captureOutput += "accept-encoding: gzip, deflate, br\n";
      captureOutput += "sec-fetch-mode: cors\n";
      captureOutput += "origin: https://vip.iqiyi.com\n";

      // 提取 User-Agent
      const ua = headers["User-Agent"] || headers["user-agent"] || "";
      if (ua) {
        captureOutput += `user-agent: ${ua}\n`;
      }

      captureOutput += "referer: https://vip.iqiyi.com/\n";
      captureOutput += `content-length: ${bodyStr.length}\n`;
      captureOutput += "sec-fetch-dest: empty\n";

      // 输出所有 Cookie（每行一个）
      cookies.forEach(cookie => {
        captureOutput += `cookie: ${cookie}\n`;
      });

      captureOutput += "\n";
      captureOutput += bodyStr;
    }

    // 合并 Cookie 用于显示
    const cookieString = cookies.join("; ");

    // 提取关键参数
    const deviceParams = {
      de: bodyParams.de || "",
      platform: bodyParams.platform || "",
      u: bodyParams.u || "",
      deviceId: bodyParams.deviceId || "",
      qyid: bodyParams.qyid || "",
      dfp: bodyParams.dfp || "",
      fv: bodyParams.fv || "",
      P00001: bodyParams.P00001 || ""
    };

    // 保存到持久化存储
    const captureData = {
      cookie: cookieString,
      device_params: deviceParams,
      capture_file: captureOutput,
      timestamp: Date.now()
    };
    $persistentStore.write(JSON.stringify(captureData), "iqiyi_capture_data");

    // 控制台输出
    console.log("=========================================");
    console.log("爱奇艺秒杀：已抓取抢购请求");
    console.log("=========================================");
    console.log("Cookie 长度：" + cookieString.length + " 字符");
    console.log("Cookie 字段数：" + cookies.length + " 个");
    console.log("设备参数：" + Object.keys(deviceParams).filter(k => deviceParams[k]).length + " 个");
    console.log("=========================================");

    if (fileFormat) {
      console.log("抓包文件格式（可直接用于 Python 脚本）：");
      console.log("=========================================");
      console.log(captureOutput);
      console.log("=========================================");
    } else {
      console.log("Cookie：");
      console.log(cookieString);
      console.log("=========================================");
      console.log("设备参数：");
      console.log(JSON.stringify(deviceParams, null, 2));
      console.log("=========================================");
    }

    // 通知
    if (notify) {
      const attachPayload = {};
      if (clipboard) {
        // 复制抓包文件格式到剪贴板，可直接保存为 request_seckill.txt
        attachPayload.clipboard = fileFormat ? captureOutput : cookieString;
      }

      $notification.post(
        "爱奇艺秒杀 Cookie 已抓取",
        "👆 点击复制抓包内容",
        `Cookie: ${cookies.length}个字段 | 参数: ${Object.keys(deviceParams).filter(k => deviceParams[k]).length}个\n可直接保存为 request_seckill.txt`,
        clipboard ? attachPayload : undefined
      );
    }

    // 放行请求
    $done({});
  } catch (err) {
    console.log("爱奇艺秒杀 Cookie 抓取异常:", String((err && err.stack) || err));
    $done({});
  }
})();

function parseArgs(str) {
  if (!str) return {};
  return str.split("&").reduce((acc, cur) => {
    if (!cur) return acc;
    const idx = cur.indexOf("=");
    const key = (idx >= 0 ? cur.slice(0, idx) : cur).trim();
    const val = idx >= 0 ? cur.slice(idx + 1) : "";
    acc[key] = decodeURIComponent(val || "");
    return acc;
  }, {});
}

function extractCookies(headers) {
  const cookies = [];
  if (!headers) return cookies;

  // 收集所有 cookie 字段
  Object.keys(headers).forEach(key => {
    const lowerKey = key.toLowerCase();
    if (lowerKey === "cookie" || lowerKey.startsWith("cookie")) {
      const value = headers[key];
      if (Array.isArray(value)) {
        cookies.push(...value);
      } else if (value) {
        cookies.push(String(value));
      }
    }
  });

  return cookies;
}
