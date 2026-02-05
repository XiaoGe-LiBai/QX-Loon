/**
 * 京东金融积分商城多功能脚本
 * 功能1：修改商品详情接口返回的 exchangeDetailStatus 状态值
 * 功能2：提供优惠券快速跳转面板
 * @author 菜狗
 * @date 2026-02-05
 */

const scriptName = '京东金融积分商城';

// ==================== 优惠券配置 ====================
const coupons = [
  {
    name: "小金库还白条立减券 10元",
    goodsId: "831236324",
    icon: "💰"
  },
  {
    name: "小金库还白条立减券 5元",
    goodsId: "832336334",
    icon: "💵"
  },
  {
    name: "小金库还白条立减券 2元",
    goodsId: "833436344",
    icon: "💴"
  },
  {
    name: "小金库还白条立减券 1元",
    goodsId: "510033494",
    icon: "💸"
  },
  {
    name: "白条支付立减 10元",
    goodsId: "592534154",
    icon: "🎫"
  }
];

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
function showPanel() {
  const now = new Date();
  const timeStr = now.toLocaleTimeString('zh-CN', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit'
  });

  // 构建面板标题
  let title = "🏪 京东金融优惠券";

  // 构建面板内容
  let content = `⏰ 更新时间: ${timeStr}\n\n`;
  content += "📋 可用优惠券列表:\n";

  coupons.forEach((coupon) => {
    content += `${coupon.icon} ${coupon.name}\n`;
  });

  content += "\n💡 点击面板可快速跳转到优惠券页面";

  // 默认跳转到第一个优惠券
  const defaultUrl = generateUrl(coupons[0].goodsId);

  return {
    title: title,
    content: content,
    icon: "creditcard.fill",
    "icon-color": "#FF6B6B",
    url: defaultUrl
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
  const panelResult = showPanel();
  $done(panelResult);
}
