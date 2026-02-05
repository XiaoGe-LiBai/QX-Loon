/**
 * 京东金融积分商城状态修改脚本
 * 功能：修改商品详情接口返回的 exchangeDetailStatus 状态值
 * 作者：技术专家
 * 更新时间：2026-02-05
 */

const scriptName = '京东金融兑换状态修改';

// 主处理函数
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

// 执行修改
const result = modifyResponse();
$done(result);
