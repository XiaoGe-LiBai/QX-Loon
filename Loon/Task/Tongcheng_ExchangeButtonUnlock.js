/**
 * 同程旅行 - 萌力值兑换按钮点亮
 *
 * 抓包来源：H5 活动页 https://wx.17u.cn/cvgfront-common/activity/20260819dailyCheckIn/
 * 后端接口：POST https://cvg.17usoft.com/activity/signInCash/{method}
 *           POST https://cvg.17usoft.com/activity/leadGeneration/getComponentInfo
 *
 * 按钮置灰的判定（来自 app.js 反编译，ExchangeSection.vue）：
 *   disabled = busy || !prize.couldExchange
 *   文案：redeemed → 已兑换 / remainingStock<=0 → 库存不足
 *         pointsBalance<pointsCost → 萌力值不足 / couldExchange → 换这个 / 否则 暂不可兑
 *
 * 本脚本只负责「点亮」，不做任何伪造成功：点击后 exchangePrize 仍会打到服务端，
 * 服务端是否放行（真实库存 / 是否已加企微 / 是否已兑换）以服务端返回为准。
 *
 * @author XiaoGe-LiBai
 * @date 2026-10-17
 */

const SCRIPT_NAME = '同程萌力值';

// ==================== 配置 ====================
const CFG = {
    // 把 remainingStock / couldExchange 改成可兑换（点亮按钮）
    ENABLE_BUTTON_UNLOCK: true,
    // 假库存数量，0 表示按该奖品的 dailyStock 补齐
    FAKE_STOCK: 0,
    // 同时把 redeemed 置为 false（清掉「已兑换」灰态）
    RESET_REDEEMED: true,
    // 绕过「需先添加同程企业微信小助手」的客户端拦截
    // 只影响前端判定，服务端是否校验未知
    BYPASS_ENT_WX_CHECK: true,
    // 强制萌力值余额，0 表示不修改
    FAKE_POINTS_BALANCE: 0
};
// =============================================

function safeJson(text) {
    try {
        return JSON.parse(text);
    } catch (e) {
        return null;
    }
}

function log(msg) {
    console.log(`[${SCRIPT_NAME}] ${msg}`);
}

/** 兑换列表 / 首页信息：点亮按钮 */
function handleExchangeInfo(obj) {
    const data = obj && obj.data;
    if (!data || !Array.isArray(data.prizeList)) {
        log('⚠️ prizeList 结构异常，跳过');
        return false;
    }

    const changed = [];
    data.prizeList.forEach(function (prize) {
        const before = `${prize.prizeName}: stock=${prize.remainingStock} couldExchange=${prize.couldExchange}`;
        const stock = CFG.FAKE_STOCK > 0 ? CFG.FAKE_STOCK : (prize.dailyStock > 0 ? prize.dailyStock : 1);

        if (!(prize.remainingStock > 0)) prize.remainingStock = stock;
        if (CFG.RESET_REDEEMED) prize.redeemed = false;
        prize.couldExchange = true;

        changed.push(`${before} → stock=${prize.remainingStock} couldExchange=true`);
    });

    if (CFG.FAKE_POINTS_BALANCE > 0) {
        data.pointsBalance = CFG.FAKE_POINTS_BALANCE;
    }

    log(`✅ 兑换列表已点亮 ${changed.length} 个奖品`);
    changed.forEach(function (c) { log('   ' + c); });
    return true;
}

/** 首页信息：只补余额，其它字段保持原样 */
function handleIndexInfo(obj) {
    if (CFG.FAKE_POINTS_BALANCE <= 0) return false;
    if (!obj || !obj.data) return false;
    obj.data.pointsBalance = CFG.FAKE_POINTS_BALANCE;
    log(`✅ 萌力值余额 → ${CFG.FAKE_POINTS_BALANCE}`);
    return true;
}

/**
 * 企微好友校验：getMarketPublicComponentInfo()
 * 客户端逻辑：data 为 null → 放行；data.userId 存在 → 放行；否则弹「添加同程旅行小助手」二维码
 * 真实响应结构未知，这里只补一个 userId 占位，不改其它字段
 */
function handleEntWxCheck(obj) {
    if (!CFG.BYPASS_ENT_WX_CHECK) return false;
    if (obj.code !== 1000) return false;

    if (obj.data === null || obj.data === undefined) {
        obj.data = { userId: '-1' };
        log('✅ 企微校验已放行（注入 userId）');
        return true;
    }
    if (!obj.data.userId) {
        obj.data.userId = '-1';
        log('✅ 企微校验已放行（补 userId）');
        return true;
    }
    return false;
}

/** 兑换结果只做日志，绝不伪造成功 */
function handleExchangePrize(obj) {
    if (obj.code === 1000) {
        const d = obj.data || {};
        log(`🎉 兑换成功：${d.prizeName || ''}${d.redirectUrl ? ' ' + d.redirectUrl : ''}`);
    } else {
        log(`❌ 兑换失败：code=${obj.code} message=${obj.message} logId=${obj.logId || '-'}`);
        log('   → 说明是服务端拦截（库存/风控/已兑换），脚本无法绕过');
    }
    return false;
}

function main() {
    const url = $request.url || '';
    const body = $response && $response.body;

    if (!body) {
        log('响应体为空，跳过');
        return $done({});
    }

    const obj = safeJson(body);
    if (!obj) {
        log('响应非 JSON，跳过');
        return $done({});
    }

    let modified = false;
    try {
        if (url.indexOf('/activity/signInCash/getExchangeInfo') !== -1) {
            modified = CFG.ENABLE_BUTTON_UNLOCK ? handleExchangeInfo(obj) : false;
        } else if (url.indexOf('/activity/signInCash/getIndexInfo') !== -1) {
            modified = handleIndexInfo(obj);
        } else if (url.indexOf('/activity/leadGeneration/getComponentInfo') !== -1) {
            modified = handleEntWxCheck(obj);
        } else if (url.indexOf('/activity/signInCash/exchangePrize') !== -1) {
            modified = handleExchangePrize(obj);
        }
    } catch (e) {
        log(`处理异常: ${e.message}`);
        return $done({});
    }

    if (modified) {
        return $done({ body: JSON.stringify(obj) });
    }
    return $done({});
}

main();
