/*
爱奇艺尖叫之夜秒杀按钮点亮脚本（适用于 Loon）
触发条件：拦截 https://act.vip.iqiyi.com/supermk/seckill/query/activity/timesList 响应
功能：修改商品剩余库存和活动时间，点亮抢购按钮
参数说明（可选）：
 - stock=数量：设置模拟库存数量（默认 1）
 - extendHours=小时：延长活动结束时间（默认 48 小时）
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

    if (modifications.length > 0) {
      console.log(`爱奇艺秒杀：按钮点亮成功`);
      $notification.post(
        "爱奇艺秒杀按钮已点亮",
        modifications.join("，"),
        "现在可以看到抢购按钮了，活动开始时即可点击"
      );
    } else {
      console.log("爱奇艺秒杀：数据正常，无需修改");
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
