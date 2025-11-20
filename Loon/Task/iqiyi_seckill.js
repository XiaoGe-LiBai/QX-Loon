/*
爱奇艺尖叫之夜秒杀按钮点亮脚本（适用于 Loon）
触发条件：拦截 https://act.vip.iqiyi.com/supermk/seckill/query/activity/timesList 响应
功能：修改商品剩余库存和活动时间，点亮抢购按钮，抓取 Cookie
参数说明（可选）：
 - stock=数量：设置模拟库存数量（默认 100）
 - extendHours=小时：延长活动结束时间（默认 48 小时）
 - notify=on/off：是否通知（默认 off，静默工作）
 - clipboard=on/off：是否复制 Cookie（默认 on）
*/
(function () {
  try {
    const raw = $response?.body ?? "";

    if (!raw) {
      console.log("爱奇艺秒杀：响应体为空");
      return $done({});
    }

    const args = parseArgs(typeof $argument === "string" ? $argument : "");
    const stockValue = parseInt(args.stock || "100") || 1;
    const extendHours = parseInt(args.extendHours || "48") || 48;
    const notify = (args.notify || "off").toLowerCase() === "on";
    const clipboard = (args.clipboard || "on").toLowerCase() !== "off";

    let data;
    try {
      data = JSON.parse(raw);
    } catch (e) {
      console.log("爱奇艺秒杀：响应体解析失败");
      return $done({ body: raw });
    }

    // 检查响应结构
    const timesList = data?.data?.skActivityTimesResponseList;
    const goodsList = timesList?.skTimesGoodsResponseList;

    if (!goodsList || !Array.isArray(goodsList)) {
      console.log("爱奇艺秒杀：未找到商品列表");
      return $done({ body: raw });
    }

    let modifications = [];

    // 修改活动结束时间（延长指定小时数）
    if (timesList && timesList.timesEndTime) {
      const now = Date.now();
      const newEndTime = now + (extendHours * 60 * 60 * 1000);
      const oldEndTime = new Date(timesList.timesEndTime).toLocaleString("zh-CN");
      const newEndTimeStr = new Date(newEndTime).toLocaleString("zh-CN");

      timesList.timesEndTime = newEndTime;
      modifications.push(`活动时间延长至 ${newEndTimeStr}`);
      console.log(`爱奇艺秒杀：活动结束时间从 ${oldEndTime} 延长至 ${newEndTimeStr}`);
    }

    // 修改所有商品的剩余库存
    let stockModifiedCount = 0;
    goodsList.forEach(item => {
      if (item.leftStock === 0) {
        item.leftStock = stockValue;
        stockModifiedCount++;
        console.log(`爱奇艺秒杀：${item.skuName} 库存已修改为 ${stockValue}`);
      }
    });

    if (stockModifiedCount > 0) {
      modifications.push(`${stockModifiedCount} 个商品库存已修改`);
    }

    // 提取 Cookie 和设备信息
    const headers = $request?.headers || {};
    const cookies = extractCookies(headers);
    const cookieString = cookies.join("; ");

    // 保存 Cookie 和设备参数到持久化存储（供自动抢购使用）
    if (cookieString) {
      const cookieData = {
        cookieString: cookieString,
        u: data?.data?.currentTime ? String(data.data.currentTime) : "",
        deviceId: extractQueryParam($request.url, "deviceId") || "",
        qyid: extractQueryParam($request.url, "qyid") || "",
        dfp: extractQueryParam($request.url, "dfp") || "",
        de: extractQueryParam($request.url, "de") || "",
        platform: extractQueryParam($request.url, "platform") || "",
        fv: extractQueryParam($request.url, "fv") || "",
        P00001: extractQueryParam($request.url, "P00001") || "",
        timestamp: Date.now()
      };
      $persistentStore.write(JSON.stringify(cookieData), "iqiyi_seckill_cookie");
      console.log("爱奇艺秒杀：Cookie 已保存到持久化存储");
    }

    // 控制台输出
    if (modifications.length > 0) {
      console.log(`爱奇艺秒杀：按钮点亮成功 - ${modifications.join("，")}`);
    } else {
      console.log("爱奇艺秒杀：数据正常，无需修改");
    }

    if (cookieString) {
      console.log(`爱奇艺秒杀 Cookie: ${cookieString}`);
      console.log("📋 提示：点击弹窗通知即可自动复制完整 Cookie 到剪贴板");
    }

    // 可选通知（默认不通知，静默工作）
    if (notify && cookieString) {
      const attachPayload = {};
      if (clipboard) {
        attachPayload.clipboard = cookieString;
      }

      $notification.post(
        "爱奇艺秒杀 Cookie 已抓取",
        "👆 点击此通知自动复制",
        `已修改：${modifications.join("，")}`,
        clipboard ? attachPayload : undefined
      );
    }

    $done({ body: JSON.stringify(data) });
  } catch (err) {
    console.log("爱奇艺秒杀脚本异常:", String((err && err.stack) || err));
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

function extractQueryParam(url, param) {
  if (!url) return "";
  const match = new RegExp(`[?&]${param}=([^&]*)`).exec(url);
  return match ? decodeURIComponent(match[1]) : "";
}
