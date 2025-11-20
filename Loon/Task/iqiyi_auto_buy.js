/*
爱奇艺尖叫之夜自动抢购脚本（适用于 Loon）
触发方式：定时任务 cron
功能：在指定时间自动发送抢购请求
参数说明（可选）：
 - goodsCodes=商品code列表：优先级顺序抢购（逗号分隔）
 - retryTimes=次数：失败重试次数（默认 3）
 - retryDelay=毫秒：重试间隔（默认 500ms）
*/

// 商品配置（价格从低到高）
const GOODS_CONFIG = {
  "8e46b29c6a2ebc92": { name: "A款礼盒", price: 680 },
  "85883e992393e8b7": { name: "B款礼盒", price: 1080 },
  "84a409f842140971": { name: "C款礼盒", price: 1480 },
  "be4e5cf1fc989c2d": { name: "D款礼盒", price: 1980 }
};

(async function () {
  try {
    const args = parseArgs(typeof $argument === "string" ? $argument : "");

    // 默认按价格从低到高抢购
    const defaultGoods = "8e46b29c6a2ebc92,85883e992393e8b7,84a409f842140971,be4e5cf1fc989c2d";
    const goodsCodes = (args.goodsCodes || defaultGoods).split(",").map(c => c.trim());
    const retryTimes = parseInt(args.retryTimes || "3") || 3;
    const retryDelay = parseInt(args.retryDelay || "500") || 500;

    console.log(`爱奇艺秒杀：开始自动抢购，商品优先级: ${goodsCodes.map(c => GOODS_CONFIG[c]?.name || c).join(" > ")}`);

    // 从持久化存储读取Cookie（由之前的脚本保存）
    const cookieData = $persistentStore.read("iqiyi_seckill_cookie");
    if (!cookieData) {
      const msg = "未找到已保存的 Cookie，请先访问活动页面";
      console.log(`爱奇艺秒杀：${msg}`);
      $notification.post("爱奇艺秒杀失败", "", msg);
      return $done({});
    }

    let cookies;
    try {
      cookies = JSON.parse(cookieData);
    } catch (e) {
      cookies = { cookieString: cookieData };
    }

    // 按优先级依次尝试抢购
    let success = false;
    for (const code of goodsCodes) {
      const goodsInfo = GOODS_CONFIG[code];
      if (!goodsInfo) {
        console.log(`爱奇艺秒杀：跳过未知商品 ${code}`);
        continue;
      }

      console.log(`爱奇艺秒杀：尝试抢购 ${goodsInfo.name}（¥${goodsInfo.price}）`);

      // 尝试抢购（带重试）
      const result = await buyWithRetry(code, cookies, retryTimes, retryDelay);

      if (result.success) {
        success = true;
        const msg = `${goodsInfo.name} 抢购成功！¥${goodsInfo.price}`;
        console.log(`爱奇艺秒杀：${msg}`);
        $notification.post(
          "🎉 爱奇艺秒杀成功",
          goodsInfo.name,
          `价格：¥${goodsInfo.price}\n${result.message || "请尽快完成支付"}`
        );
        break; // 成功后停止尝试其他商品
      } else {
        console.log(`爱奇艺秒杀：${goodsInfo.name} 抢购失败 - ${result.message}`);
        // 如果不是售罄，继续尝试下一个商品
        if (result.shouldStop) {
          break;
        }
      }
    }

    if (!success) {
      $notification.post(
        "爱奇艺秒杀失败",
        "所有商品均未抢到",
        "可能原因：网络延迟、库存不足、账号限制"
      );
    }

    $done({});
  } catch (err) {
    const errorMsg = String((err && err.stack) || err);
    console.log("爱奇艺秒杀脚本异常:", errorMsg);
    $notification.post("爱奇艺秒杀脚本异常", "", errorMsg);
    $done({});
  }
})();

// 带重试的抢购函数
async function buyWithRetry(goodsCode, cookies, maxRetry, delay) {
  for (let i = 0; i < maxRetry; i++) {
    if (i > 0) {
      console.log(`爱奇艺秒杀：第 ${i + 1} 次重试...`);
      await sleep(delay);
    }

    const result = await executeBuy(goodsCode, cookies);

    // 如果成功或确定失败（非网络问题），不再重试
    if (result.success || !result.shouldRetry) {
      return result;
    }
  }

  return {
    success: false,
    message: `重试 ${maxRetry} 次后仍失败`,
    shouldStop: false,
    shouldRetry: false
  };
}

// 执行抢购请求
function executeBuy(goodsCode, cookies) {
  return new Promise((resolve) => {
    // 构造请求体
    const timestamp = Date.now();
    const requestBody = {
      de: cookies.de || "fd8987532f924c3182cfbde982ab0a05",
      platform: cookies.platform || "bb35a104d95490f6",
      version: "16.11.0",
      u: cookies.u || "",
      deviceId: cookies.deviceId || "",
      qyid: cookies.qyid || "",
      dfp: cookies.dfp || "",
      lang: "zh_CN",
      app_lm: "cn",
      ptid: "02030031010000000000",
      agentType: 12,
      fv: cookies.fv || "9bf8a4c83b940a58",
      P00001: cookies.P00001 || "",
      code: goodsCode,
      _: timestamp
    };

    const request = {
      url: "https://act.vip.iqiyi.com/supermk/seckill/action/seckill",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json, text/plain, */*",
        "Origin": "https://vip.iqiyi.com",
        "Referer": "https://vip.iqiyi.com/",
        "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 IqiyiApp/iqiyi IqiyiVersion/16.11.0",
        "Cookie": cookies.cookieString || ""
      },
      body: JSON.stringify(requestBody)
    };

    $httpClient.post(request, (error, response, data) => {
      if (error) {
        console.log(`爱奇艺秒杀：网络请求失败 - ${error}`);
        resolve({
          success: false,
          message: `网络错误: ${error}`,
          shouldRetry: true,
          shouldStop: false
        });
        return;
      }

      try {
        const result = JSON.parse(data);
        const code = result.code;
        const msg = result.msg || "未知错误";

        // 根据响应码判断结果
        if (code === "A00000") {
          // 成功
          resolve({
            success: true,
            message: msg,
            shouldRetry: false,
            shouldStop: true
          });
        } else if (code === "Q00103") {
          // 已抢光
          resolve({
            success: false,
            message: "已抢光",
            shouldRetry: false,
            shouldStop: false
          });
        } else if (code === "Q00104") {
          // 活动未开始
          resolve({
            success: false,
            message: "活动未开始",
            shouldRetry: true,
            shouldStop: false
          });
        } else if (code === "Q00106") {
          // 已抢过
          resolve({
            success: false,
            message: "您已参与过此活动",
            shouldRetry: false,
            shouldStop: true
          });
        } else {
          // 其他错误
          resolve({
            success: false,
            message: msg,
            shouldRetry: true,
            shouldStop: false
          });
        }
      } catch (e) {
        console.log(`爱奇艺秒杀：响应解析失败 - ${e}`);
        resolve({
          success: false,
          message: "响应解析失败",
          shouldRetry: true,
          shouldStop: false
        });
      }
    });
  });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

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
