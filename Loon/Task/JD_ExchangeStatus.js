/**
 * 京东金融积分商城多功能脚本
 * 功能1：修改商品详情接口返回的 exchangeDetailStatus 状态值
 * 功能2：提供优惠券快速跳转面板
 * @author 菜狗
 * @date 2026-02-05
 */

const scriptName = '京东金融积分商城';

// ==================== 优惠券配置 ====================
const couponsMap = {
  "831236324": {
    name: "小金库还白条立减券",
    amount: "10元",
    icon: "💰",
    color: "#FF6B6B"
  },
  "832336334": {
    name: "小金库还白条立减券",
    amount: "5元",
    icon: "💵",
    color: "#4ECDC4"
  },
  "833436344": {
    name: "小金库还白条立减券",
    amount: "2元",
    icon: "💴",
    color: "#45B7D1"
  },
  "510033494": {
    name: "小金库还白条立减券",
    amount: "1元",
    icon: "💸",
    color: "#96CEB4"
  },
  "592534154": {
    name: "白条支付立减",
    amount: "10元",
    icon: "🎫",
    color: "#FFEAA7"
  }
};

// ==================== 功能1：状态修改 ====================
// HTTP 响应处理函数
function modifyResponse() {
    try {
        // 获取响应体
        let body = $response.body;

        if (!body) {
            console.log(`[${scriptName}] 响应体为空，跳过处理`);
            return { body };
        }

        // 解析 JSON 数据
        let obj = JSON.parse(body);

        // 检查数据结构是否正确
        if (!obj || !obj.resultData || !obj.resultData.data) {
            console.log(`[${scriptName}] 数据结构异常，跳过处理`);
            return { body };
        }

        // 记录原始状态
        const originalStatus = obj.resultData.data.exchangeDetailStatus;
        console.log(`[${scriptName}] 原始 exchangeDetailStatus: ${originalStatus}`);

        // 修改 exchangeDetailStatus 为 1
        obj.resultData.data.exchangeDetailStatus = 1;

        console.log(`[${scriptName}] 已修改 exchangeDetailStatus: ${originalStatus} -> 1`);

        // 返回修改后的数据
        body = JSON.stringify(obj);
        return { body };

    } catch (error) {
        console.log(`[${scriptName}] 处理异常: ${error.message}`);
        console.log(`[${scriptName}] 错误堆栈: ${error.stack}`);
        return { body: $response.body };
    }
}

// ==================== 功能2：快速跳转面板 ====================
// 生成跳转链接
function generateUrl(goodsId) {
  return `https://member.jr.jd.com/member/integral-mall-detail/detail/?goodsId=${goodsId}`;
}

// 面板显示函数
function showPanel(goodsId) {
  // 获取优惠券信息
  const coupon = couponsMap[goodsId];

  if (!coupon) {
    return {
      title: "❌ 优惠券不存在",
      content: `商品ID: ${goodsId}\n未找到对应的优惠券信息`,
      icon: "exclamationmark.triangle.fill",
      "icon-color": "#FF3B30"
    };
  }

  const now = new Date();
  const timeStr = now.toLocaleTimeString('zh-CN', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit'
  });

  // 构建面板标题
  const title = `${coupon.icon} ${coupon.name}`;

  // 构建面板内容
  let content = `💵 面额: ${coupon.amount}\n`;
  content += `⏰ 更新: ${timeStr}\n`;
  content += `🆔 商品ID: ${goodsId}\n\n`;
  content += `💡 点击面板立即跳转兑换`;

  // 生成跳转链接
  const url = generateUrl(goodsId);

  return {
    title: title,
    content: content,
    icon: "creditcard.fill",
    "icon-color": coupon.color,
    url: url
  };
}

// ==================== 主执行逻辑 ====================
// 判断运行环境并执行对应功能
if (typeof $response !== 'undefined' && $response.body) {
  // HTTP 响应处理模式：修改状态
  const result = modifyResponse();
  $done(result);
} else {
  // 面板模式：显示跳转界面
  // 获取传入的商品ID参数
  const goodsId = $argument || "831236324"; // 默认使用10元券
  const panelResult = showPanel(goodsId);
  $done(panelResult);
}
