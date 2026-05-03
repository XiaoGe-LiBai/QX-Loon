// 小米汽车社区 - 活动详情完整解锁
// 覆盖 5 个接口：detail / refreshCalendar / queryCalendarRoundInfo / checkAndSaveSelectedRound / confirm(Enrollment)
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

var SLOTS = [
    ['10:00', '11:00'],
    ['12:00', '13:00'],
    ['14:00', '15:00'],
    ['16:00', '17:00']
];

function makeTimes(dateStr) {
    return SLOTS.map(function (s) {
        return {
            round: dateStr + ' ' + s[0] + '-' + s[1],
            startTime: s[0],
            endTime: s[1],
            disabled: false
        };
    });
}

// 1. 解锁活动按钮（showEnable / enable → true）
if (url.indexOf('/v1/detail') !== -1) {
    if (obj.code === 200 && obj.data && obj.data.button) {
        obj.data.button.showEnable = true;
        obj.data.button.enable = true;
        console.log('[小米汽车活动] ✅ 按钮已解锁');
    }
}
// 2. 注入日历数据（5 月 2-3 日，每日 4 场）
else if (url.indexOf('/v1/refreshCalendar') !== -1) {
    if (obj.code !== 200) {
        obj.code = 200;
        obj.message = '成功';
        obj.data = {
            monthList: [{
                year: 2026,
                month: 5,
                defaultRound: '2026-05-03 10:00-11:00',
                dateList: [
                    { date: 2, times: makeTimes('2026-05-02') },
                    { date: 3, times: makeTimes('2026-05-03') }
                ]
            }]
        };
        console.log('[小米汽车活动] ✅ refreshCalendar 已修复，注入 4 场次日历');
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
