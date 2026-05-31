/**
 * 京东金融积分商城 - 修改兑换状态
 * 功能：修改商品详情接口返回的 exchangeDetailStatus 状态值为 1
 * @author XiaoGe-LiBai
 * @date 2026-05-31
 */

const scriptName = '京东金融积分商城';

function modifyResponse() {
    try {
        let body = $response.body;

        if (!body) {
            console.log(`[${scriptName}] 响应体为空，跳过处理`);
            return { body };
        }

        let obj = JSON.parse(body);

        if (!obj || !obj.resultData || !obj.resultData.data) {
            console.log(`[${scriptName}] 数据结构异常，跳过处理`);
            return { body };
        }

        const originalStatus = obj.resultData.data.exchangeDetailStatus;
        console.log(`[${scriptName}] 原始 exchangeDetailStatus: ${originalStatus}`);

        obj.resultData.data.exchangeDetailStatus = 1;

        console.log(`[${scriptName}] 🔄 已修改 exchangeDetailStatus: ${originalStatus} -> 1`);

        return { body: JSON.stringify(obj) };

    } catch (error) {
        console.log(`[${scriptName}] ❌ 处理异常: ${error.message}`);
        return { body: $response.body };
    }
}

const result = modifyResponse();
$done(result);
