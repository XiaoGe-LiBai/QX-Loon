/**
 * Loon http-request script: 京东凭据提取并同步至 Bncr 无界服务端
 *
 * 匹配规则：^https?:\/\/api\.m\.jd\.com\/(client\.action|api)
 * 目标接口：https://bncr.xiaoge.ink/api/Doraemon/loginCallback_receive
 * 支持凭据：
 *   1. 临时凭据：pt_key + pt_pin (full_ck)
 *   2. 长期凭据：wskey + pin (wskey)
 *
 * 核心机制：
 *   1. 跨请求记忆 Pin：自动记忆最近一次交互的账号 PIN，遇到只有 wskey 的接口时自动无缝配对
 *   2. 严格凭据指纹去重：只有在【首次抓取】或【凭据变更/刷新】时才发起上报与通知
 *   3. 拒绝弹窗轰炸：即便设置 silent=false（非静默），凭据未变时永远 0 弹窗、0 外发、0 延迟直接放行
 *   4. 异步 5 秒超时保护：接口异常时绝不阻塞 App 正常网络请求
 *
 * 参数说明（可选 argument）：
 *   - silent=true/false：静默模式（默认 true 完全静默；设为 false 时仅在凭据首次抓取或更新时弹窗 1 次）
 *   - upload=on/off：是否开启外发 Bncr（默认 on）
 *
 * @author XiaoGe-LiBai
 * @reference /参考/jd-ck-apk-v2
 * @license MIT
 */

const BNCR_ENDPOINT = "https://bncr.xiaoge.ink/api/Doraemon/loginCallback_receive";
const BNCR_AUTH_TOKEN = "96358b36fc0769de2c8373d5e3582bb9";

(function () {
  try {
    if (!$request || $request.method === "OPTIONS") {
      return $done({});
    }

    const headers = $request.headers || {};
    const args = parseArgs(typeof $argument === "string" ? $argument : "");

    // 默认模式：silent=true 静默无弹窗；upload=on 开启外发
    const isSilent = (args.silent || "true").toLowerCase() !== "false";
    const isUploadEnabled = (args.upload || "on").toLowerCase() !== "off";

    // 1. 采集并聚合 Cookie 字段（完美兼容 HTTP/2 多行拆分）
    const cookieSegments = collectCookieSegments(headers);
    if (cookieSegments.length === 0) {
      return $done({});
    }
    const fullCookieString = cookieSegments.join("; ");

    // 2. 正则提取各类字段：pt_key, wskey, pt_pin, pin, pwdt_id
    const ptKeyMatch = fullCookieString.match(/(?:^|;\s*)pt_key=([^;]+)/);
    const wskeyMatch = fullCookieString.match(/(?:^|;\s*)wskey=([^;]+)/);
    const ptPinMatch = fullCookieString.match(/(?:^|;\s*)pt_pin=([^;]+)/);
    const pinMatch = fullCookieString.match(/(?:^|;\s*)pin=([^;]+)/);
    const pwdtIdMatch = fullCookieString.match(/(?:^|;\s*)pwdt_id=([^;]+)/);

    const ptKey = ptKeyMatch ? ptKeyMatch[1].trim() : "";
    const wskey = wskeyMatch ? wskeyMatch[1].trim() : "";

    // 提取当前请求中的 pin
    let pin = ptPinMatch ? ptPinMatch[1].trim() : (pinMatch ? pinMatch[1].trim() : (pwdtIdMatch ? pwdtIdMatch[1].trim() : ""));

    // 持久化关联记忆：如果当前请求带有明文 pin，则保存为全局最后已知账号 pin
    const LAST_KNOWN_PIN_KEY = "jd_last_known_pin";
    if (pin) {
      $persistentStore.write(pin, LAST_KNOWN_PIN_KEY);
    } else {
      // 若当前请求仅有 wskey 无 pin（例如某些客户端底层接口），从持久化存储自动回填最近一次交互的 pin
      pin = $persistentStore.read(LAST_KNOWN_PIN_KEY) || "";
    }

    // 既无 pt_key 也无 wskey，或者完全无法确定账号 pin 时直接放行
    if ((!ptKey && !wskey) || !pin) {
      return $done({});
    }

    // 组装格式化字符串
    const fullCkString = ptKey ? `pt_key=${ptKey}; pt_pin=${pin};` : "";
    const wskeyString = wskey ? `pin=${pin};wskey=${wskey};` : "";

    // 3. 严格去重与状态机判定（解决非静默模式下一刷就弹窗的痛点）
    const storePrefix = "jd_sync_";
    const ptKeyStoreKey = `${storePrefix}ptkey_${pin}`;
    const wskeyStoreKey = `${storePrefix}wskey_${pin}`;

    const savedPtKey = $persistentStore.read(ptKeyStoreKey) || "";
    const savedWskey = $persistentStore.read(wskeyStoreKey) || "";

    const isPtKeyNewOrUpdated = Boolean(ptKey && ptKey !== savedPtKey);
    const isWskeyNewOrUpdated = Boolean(wskey && wskey !== savedWskey);

    // 核心屏障：只有 pt_key 或 wskey 产生了新值才放行至外发/通知
    if (!isPtKeyNewOrUpdated && !isWskeyNewOrUpdated) {
      // 凭据未改变，直接静默放行，绝不发起重复网络请求，绝不弹窗打扰！
      return $done({});
    }

    // 汇总本次捕获变更的凭据类型
    const changeTypes = [];
    if (isPtKeyNewOrUpdated) changeTypes.push("pt_key");
    if (isWskeyNewOrUpdated) changeTypes.push("wskey");

    console.log("================== [京东凭据捕获/更新] ==================");
    console.log(`账号 PIN : ${pin}`);
    console.log(`变更类型 : ${changeTypes.join(" + ")}`);
    if (ptKey) console.log(`pt_key   : ${ptKey}`);
    if (wskey) console.log(`wskey    : ${wskey}`);
    console.log("=========================================================");

    // 未开启上传时直接更新持久化记录并退出
    if (!isUploadEnabled) {
      if (ptKey) $persistentStore.write(ptKey, ptKeyStoreKey);
      if (wskey) $persistentStore.write(wskey, wskeyStoreKey);
      return $done({});
    }

    // 4. 构建外发数据包，向 Bncr 接口发送 POST
    const payload = {
      wskey: wskeyString,
      pin: pin,
      full_ck: fullCkString,
      name: pin,
      source: "loon-plugin",
      callback_id: BNCR_AUTH_TOKEN
    };

    const postOptions = {
      url: BNCR_ENDPOINT,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": resolveUserAgent(headers)
      },
      body: JSON.stringify(payload),
      timeout: 5000
    };

    console.log(`准备静默同步至 Bncr -> ${BNCR_ENDPOINT}`);

    $httpClient.post(postOptions, function (error, response, data) {
      try {
        if (error) {
          console.log(`❌ [Bncr 外发失败] 网络错误: ${error}`);
        } else {
          const status = response ? (response.status || response.statusCode) : 0;
          let resJson = {};
          try {
            resJson = JSON.parse(data || "{}");
          } catch (e) {
            resJson = { raw: data };
          }

          if (status === 200 && (resJson.code === 0 || resJson.code === 200)) {
            // 同步成功，持久化存储新凭据
            if (ptKey) $persistentStore.write(ptKey, ptKeyStoreKey);
            if (wskey) $persistentStore.write(wskey, wskeyStoreKey);

            console.log(`✅ [Bncr 外发成功] 账号 ${pin} 同步完成: ${resJson.msg || "ok"}`);

            // 非静默模式下：仅在凭据真正变更并同步成功时弹窗 1 次
            if (!isSilent) {
              const tipContent = [wskeyString, fullCkString].filter(Boolean).join("\n");
              $notification.post(
                "🎉 京东凭据已同步",
                `账号: ${pin} (${changeTypes.join("+")}更新)`,
                "已成功发送至对接服务器，点击可复制",
                { clipboard: tipContent }
              );
            }
          } else {
            console.log(`⚠️ [Bncr 外发异常] HTTP ${status}, 返回: ${data}`);
          }
        }
      } catch (callbackErr) {
        console.log(`❌ [Bncr 回调异常]: ${callbackErr.message || callbackErr}`);
      } finally {
        $done({});
      }
    });

  } catch (err) {
    console.log(`❌ [脚本执行异常]: ${err.message || err}`);
    $done({});
  }
})();

/**
 * 解析参数字符串
 */
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

/**
 * 汇聚多段 Cookie（兼容 HTTP/2 分片）
 */
function collectCookieSegments(headers) {
  const segments = [];
  if (!headers || typeof headers !== "object") return segments;

  Object.keys(headers).forEach(key => {
    const lower = key.toLowerCase();
    if (lower === "cookie" || lower.startsWith("cookie#")) {
      const val = headers[key];
      if (Array.isArray(val)) {
        val.forEach(v => {
          if (v != null && String(v).trim()) segments.push(String(v).trim());
        });
      } else if (val != null && String(val).trim()) {
        segments.push(String(val).trim());
      }
    }
  });

  return segments;
}

/**
 * 动态自适应 User-Agent，优先复用原生请求 UA，兜底标准 iOS Safari UA
 */
function resolveUserAgent(headers) {
  if (!headers || typeof headers !== "object") {
    return "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148";
  }
  for (const key of Object.keys(headers)) {
    if (key.toLowerCase() === "user-agent") {
      const val = headers[key];
      if (val && typeof val === "string" && val.trim()) {
        return val.trim();
      }
    }
  }
  return "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148";
}
