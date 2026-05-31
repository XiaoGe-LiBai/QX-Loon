/**
 * 小米汽车社区活动详情解锁
 * 功能：解锁详情按钮、注入日历数据、放行场次验证、修改签到状态
 * @author XiaoGe-LiBai
 * @date 2026-05-31
 */

const scriptName = '小米汽车活动';

// 日历会场数据，与服务端格式对齐
const CALENDAR_DATA = {
    activityId: '809302857',
    enableQuota: true,
    pay: false,
    monthList: [{
        year: '2026',
        month: '5',
        defaultRound: '2026-05-31 10:00-11:00',
        expired: false,
        dateList: [{
            date: '31',
            disabled: false,
            times: [
                { startTime: '10:00', endTime: '11:00', roundName: '5月31日10:00-11:00', round: '2026-05-31 10:00-11:00', buyLimit: 1, disabled: false },
                { startTime: '13:00', endTime: '14:00', roundName: '5月31日13:00-14:00', round: '2026-05-31 13:00-14:00', buyLimit: 1, disabled: false },
                { startTime: '15:00', endTime: '16:00', roundName: '5月31日15:00-16:00', round: '2026-05-31 15:00-16:00', buyLimit: 1, disabled: false }
            ]
        }]
    }, {
        year: '2026',
        month: '6',
        defaultRound: '2026-06-01 10:00-11:00',
        expired: false,
        dateList: [
            { date: '1', disabled: false, times: [
                { startTime: '10:00', endTime: '11:00', roundName: '6月1日10:00-11:00', round: '2026-06-01 10:00-11:00', buyLimit: 1, disabled: false },
                { startTime: '13:00', endTime: '14:00', roundName: '6月1日13:00-14:00', round: '2026-06-01 13:00-14:00', buyLimit: 1, disabled: false },
                { startTime: '15:00', endTime: '16:00', roundName: '6月1日15:00-16:00', round: '2026-06-01 15:00-16:00', buyLimit: 1, disabled: false }
            ]},
            { date: '2', disabled: false, times: [
                { startTime: '10:00', endTime: '11:00', roundName: '6月2日10:00-11:00', round: '2026-06-02 10:00-11:00', buyLimit: 1, disabled: false },
                { startTime: '13:00', endTime: '14:00', roundName: '6月2日13:00-14:00', round: '2026-06-02 13:00-14:00', buyLimit: 1, disabled: false },
                { startTime: '15:00', endTime: '16:00', roundName: '6月2日15:00-16:00', round: '2026-06-02 15:00-16:00', buyLimit: 1, disabled: false }
            ]},
            { date: '3', disabled: false, times: [
                { startTime: '10:00', endTime: '11:00', roundName: '6月3日10:00-11:00', round: '2026-06-03 10:00-11:00', buyLimit: 1, disabled: false },
                { startTime: '13:00', endTime: '14:00', roundName: '6月3日13:00-14:00', round: '2026-06-03 13:00-14:00', buyLimit: 1, disabled: false },
                { startTime: '15:00', endTime: '16:00', roundName: '6月3日15:00-16:00', round: '2026-06-03 15:00-16:00', buyLimit: 1, disabled: false }
            ]},
            { date: '4', disabled: false, times: [
                { startTime: '10:00', endTime: '11:00', roundName: '6月4日10:00-11:00', round: '2026-06-04 10:00-11:00', buyLimit: 1, disabled: false },
                { startTime: '13:00', endTime: '14:00', roundName: '6月4日13:00-14:00', round: '2026-06-04 13:00-14:00', buyLimit: 1, disabled: false },
                { startTime: '15:00', endTime: '16:00', roundName: '6月4日15:00-16:00', round: '2026-06-04 15:00-16:00', buyLimit: 1, disabled: false }
            ]},
            { date: '5', disabled: false, times: [
                { startTime: '10:00', endTime: '11:00', roundName: '6月5日10:00-11:00', round: '2026-06-05 10:00-11:00', buyLimit: 1, disabled: false },
                { startTime: '13:00', endTime: '14:00', roundName: '6月5日13:00-14:00', round: '2026-06-05 13:00-14:00', buyLimit: 1, disabled: false },
                { startTime: '15:00', endTime: '16:00', roundName: '6月5日15:00-16:00', round: '2026-06-05 15:00-16:00', buyLimit: 1, disabled: false }
            ]},
            { date: '6', disabled: false, times: [
                { startTime: '10:00', endTime: '11:00', roundName: '6月6日10:00-11:00', round: '2026-06-06 10:00-11:00', buyLimit: 1, disabled: false },
                { startTime: '13:00', endTime: '14:00', roundName: '6月6日13:00-14:00', round: '2026-06-06 13:00-14:00', buyLimit: 1, disabled: false },
                { startTime: '15:00', endTime: '16:00', roundName: '6月6日15:00-16:00', round: '2026-06-06 15:00-16:00', buyLimit: 1, disabled: false }
            ]},
            { date: '7', disabled: false, times: [
                { startTime: '10:00', endTime: '11:00', roundName: '6月7日10:00-11:00', round: '2026-06-07 10:00-11:00', buyLimit: 1, disabled: false },
                { startTime: '13:00', endTime: '14:00', roundName: '6月7日13:00-14:00', round: '2026-06-07 13:00-14:00', buyLimit: 1, disabled: false },
                { startTime: '15:00', endTime: '16:00', roundName: '6月7日15:00-16:00', round: '2026-06-07 15:00-16:00', buyLimit: 1, disabled: false }
            ]}
        ]
    }]
};

function modifyResponse() {
    try {
        let body = $response.body;
        if (!body) {
            console.log(`[${scriptName}] 响应体为空，跳过处理`);
            return { body };
        }

        let obj = JSON.parse(body);
        let url = $request.url;

        // 按接口路径路由到对应处理函数
        if (url.includes('/v1/detail')) {
            handleDetail(obj);
        } else if (url.includes('/v1/refreshCalendar')) {
            handleRefreshCalendar(obj);
        } else if (url.includes('/v1/queryCalendarRoundInfo')) {
            handleQueryRound(obj);
        } else if (url.includes('/v1/checkAndSaveSelectedRound')) {
            handleCheckSave(obj);
        } else if (url.includes('/v3/getSignSurveyById')) {
            handleSurvey(obj);
        } else if (url.includes('/v1/querySignInfo')) {
            handleQuerySign(obj);
        }

        return { body: JSON.stringify(obj) };

    } catch (error) {
        console.log(`[${scriptName}] 处理异常: ${error.message}`);
        return { body: $response.body };
    }
}

// 解锁活动按钮 + 开放报名状态
function handleDetail(obj) {
    if (obj.code !== 200) return;
    if (!obj.data || !obj.data.button) {
        console.log(`[${scriptName}] ⚠️ detail 数据结构异常，跳过`);
        return;
    }

    const button = obj.data.button;
    const beforeShow = button.showEnable;
    const beforeEnable = button.enable;

    button.showEnable = true;
    button.enable = true;
    button.title = '立即预约';
    obj.data.signStatus = 1;
    obj.data.registerStatus = 1;

    console.log(`[${scriptName}] ✅ detail 已解锁  showEnable:${beforeShow}→true  enable:${beforeEnable}→true`);
}

// 注入日历数据（服务端异常时注入）
function handleRefreshCalendar(obj) {
    if (obj.code !== 200) {
        obj.code = 200;
        obj.message = '成功';
        obj.data = CALENDAR_DATA;
        console.log(`[${scriptName}] ✅ refreshCalendar 已注入日历数据`);
    }
}

// 场次查询放行
function handleQueryRound(obj) {
    if (obj.code !== 200) {
        obj.code = 200;
        obj.message = '成功';
        obj.data = {};
        console.log(`[${scriptName}] ✅ queryCalendarRoundInfo 已放行`);
    }
}

// 场次预占放行
function handleCheckSave(obj) {
    if (obj.code !== 200) {
        obj.code = 200;
        obj.message = '成功';
        obj.data = true;
        console.log(`[${scriptName}] ✅ checkAndSaveSelectedRound 已放行`);
    }
}

// 报名表单放行（注入空问卷绕过）
function handleSurvey(obj) {
    if (obj.code !== 200) {
        obj.code = 200;
        obj.message = '成功';
        obj.data = { surveyList: [] };
        console.log(`[${scriptName}] ✅ getSignSurveyById 已放行（空问卷）`);
    }
}

// 报名结果查询 — 强制签到通过
function handleQuerySign(obj) {
    if (obj.code !== 200 || !obj.data) return;

    if (obj.data.signStatus !== 3) {
        const before = obj.data.signStatus;
        obj.data.signStatus = 3;
        console.log(`[${scriptName}] ✅ querySignInfo signStatus:${before}→3`);
    }
}

const result = modifyResponse();
$done(result);
