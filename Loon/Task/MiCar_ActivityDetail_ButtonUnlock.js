// 小米汽车社区 - 活动详情完整解锁
// 覆盖接口：detail / refreshCalendar / queryCalendarRoundInfo / checkAndSaveSelectedRound / getSignSurveyById
// @author XiaoGe-LiBai

var url = $request.url;
var body = $response.body;

if (!body) { $done({}); }

var obj;
try {
    obj = JSON.parse(body);
} catch (e) {
    $done({});
}

// 与官方服务端格式完全对齐的日历数据（粤港澳大湾区车展）
var CALENDAR_DATA = {
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

// 1. 解锁活动按钮 + 开放报名状态
if (url.indexOf('/v1/detail') !== -1) {
    if (obj.code === 200 && obj.data && obj.data.button) {
        obj.data.button.showEnable = true;
        obj.data.button.enable = true;
        obj.data.button.title = '立即预约';
        obj.data.signStatus = 1;
        obj.data.registerStatus = 1;
        console.log('[小米汽车活动] ✅ 按钮已解锁，报名状态已开放');
    }
}
// 2. 注入日历数据（仅在服务端异常时注入，格式对齐官方）
else if (url.indexOf('/v1/refreshCalendar') !== -1) {
    if (obj.code !== 200) {
        obj.code = 200;
        obj.message = '成功';
        obj.data = CALENDAR_DATA;
        console.log('[小米汽车活动] ✅ refreshCalendar 已修复，注入 5月3日剩余场次');
    }
}
// 3. 选择场次验证放行
else if (url.indexOf('/v1/queryCalendarRoundInfo') !== -1) {
    if (obj.code !== 200) {
        obj.code = 200;
        obj.message = '成功';
        obj.data = {};
        console.log('[小米汽车活动] ✅ queryCalendarRoundInfo 放行');
    }
}
// 4. 预占场次放行 — 服务端真实返回 data:true，与之对齐
else if (url.indexOf('/v1/checkAndSaveSelectedRound') !== -1) {
    if (obj.code !== 200) {
        obj.code = 200;
        obj.message = '成功';
        obj.data = true;
        console.log('[小米汽车活动] ✅ checkAndSaveSelectedRound 放行');
    }
}
// 4b. 报名表单获取放行（v3 接口，14:00 前返回 2008，注入空问卷绕过）
else if (url.indexOf('/v3/getSignSurveyById') !== -1) {
    if (obj.code !== 200) {
        obj.code = 200;
        obj.message = '成功';
        obj.data = { surveyList: [] };
        console.log('[小米汽车活动] ✅ getSignSurveyById 放行（空问卷）');
    }
}
// 5. 最终报名提交放行（confirm / confirmEnrollment）—— 暂时注释，观察服务端真实返回
// else if (url.indexOf('/v1/confirmEnrollment') !== -1 || url.indexOf('/v1/confirm') !== -1) {
//     if (obj.code !== 200) {
//         obj.code = 200;
//         obj.message = '成功';
//         obj.data = null;
//         console.log('[小米汽车活动] ✅ confirm 放行');
//     }
// }
// 6. 报名结果查询 — 强制 signStatus=3(PASSED)，保留服务端 infoId
else if (url.indexOf('/v1/querySignInfo') !== -1) {
    if (obj.code === 200 && obj.data) {
        if (obj.data.signStatus !== 3) {
            console.log('[小米汽车活动] ✅ querySignInfo signStatus:' + obj.data.signStatus + '→3');
            obj.data.signStatus = 3;
        }
    }
}

$done({ body: JSON.stringify(obj) });
