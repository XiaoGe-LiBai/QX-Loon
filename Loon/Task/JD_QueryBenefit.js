/**
 * 京东金融白条权益 - 修改状态
 * 功能：深度遍历 queryBenefit 响应，将 receiveState 强制改为 no、availableState 强制改为 yes
 * @author XiaoGe-LiBai
 * @date 2026-05-31
 */

const scriptName = '京东金融白条权益';

function replaceBenefitState(data) {
    let receiveCount = 0;
    let availableCount = 0;

    function walk(obj) {
        if (!obj || typeof obj !== 'object') return;

        if (Array.isArray(obj)) {
            obj.forEach(walk);
            return;
        }

        Object.keys(obj).forEach(key => {
            const val = obj[key];

            if (key === 'availableState' && val !== 'yes') {
                obj[key] = 'yes';
                availableCount++;
                return;
            }

            if (key === 'receiveState' && val !== 'no') {
                obj[key] = 'no';
                receiveCount++;
                return;
            }

            walk(val);
        });
    }

    walk(data);
    return { receiveCount, availableCount };
}

function modifyResponse() {
    try {
        let body = $response.body;
        if (!body) {
            console.log(`[${scriptName}] 响应体为空，跳过处理`);
            return { body };
        }

        let obj = JSON.parse(body);

        const { receiveCount, availableCount } = replaceBenefitState(obj);

        if (receiveCount === 0 && availableCount === 0) {
            return { body };
        }

        console.log(`[${scriptName}] ✅ receiveState 修改: ${receiveCount}处  availableState 修改: ${availableCount}处`);
        return { body: JSON.stringify(obj) };

    } catch (error) {
        console.log(`[${scriptName}] ❌ 处理异常: ${error.message}`);
        return { body: $response.body };
    }
}

const result = modifyResponse();
$done(result);
