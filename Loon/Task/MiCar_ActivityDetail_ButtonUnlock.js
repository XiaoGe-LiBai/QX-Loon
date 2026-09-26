/**
 * 小米汽车社区活动详情解锁
 * 功能：解锁详情按钮、注入日历数据、放行场次验证、修改签到状态
 * @author XiaoGe-LiBai
 * @date 2026-05-31
 */

const scriptName = '小米汽车活动';

// 日历会场数据，与服务端格式对齐（从 refreshCalendar 抓包确认）
const CALENDAR_DATA = {
    activityId: '809302857',
    enableQuota: true,
    pay: false,
    monthList: [{
        year: '2026',
        month: '5',
        defaultRound: '2026-05-31 15:00-16:00',
        expired: false,
        dateList: [{
            date: '31',
            disabled: false,
            times: [
                { startTime: '15:00', endTime: '16:00', roundName: '第三场15:00-16:00', round: '2026-05-31 15:00-16:00', buyLimit: 1, disabled: false }
            ]
        }]
    }, {
        year: '2026',
        month: '6',
        defaultRound: null,
        expired: false,
        dateList: [
            { date: '1', disabled: true, times: [
                { startTime: '10:00', endTime: '11:00', roundName: '第一场10:00-11:00', round: '2026-06-01 10:00-11:00', buyLimit: 1, disabled: true },
                { startTime: '13:00', endTime: '14:00', roundName: '第二场13:00-14:00', round: '2026-06-01 13:00-14:00', buyLimit: 1, disabled: true },
                { startTime: '15:00', endTime: '16:00', roundName: '第三场15:00-16:00', round: '2026-06-01 15:00-16:00', buyLimit: 1, disabled: true }
            ]},
            { date: '2', disabled: true, times: [
                { startTime: '10:00', endTime: '11:00', roundName: '第一场10:00-11:00', round: '2026-06-02 10:00-11:00', buyLimit: 1, disabled: true },
                { startTime: '13:00', endTime: '14:00', roundName: '第二场13:00-14:00', round: '2026-06-02 13:00-14:00', buyLimit: 1, disabled: true },
                { startTime: '15:00', endTime: '16:00', roundName: '第三场15:00-16:00', round: '2026-06-02 15:00-16:00', buyLimit: 1, disabled: true }
            ]},
            { date: '3', disabled: true, times: [
                { startTime: '10:00', endTime: '11:00', roundName: '第一场10:00-11:00', round: '2026-06-03 10:00-11:00', buyLimit: 1, disabled: true },
                { startTime: '13:00', endTime: '14:00', roundName: '第二场13:00-14:00', round: '2026-06-03 13:00-14:00', buyLimit: 1, disabled: true },
                { startTime: '15:00', endTime: '16:00', roundName: '第三场15:00-16:00', round: '2026-06-03 15:00-16:00', buyLimit: 1, disabled: true }
            ]},
            { date: '4', disabled: true, times: [
                { startTime: '10:00', endTime: '11:00', roundName: '第一场10:00-11:00', round: '2026-06-04 10:00-11:00', buyLimit: 1, disabled: true },
                { startTime: '13:00', endTime: '14:00', roundName: '第二场13:00-14:00', round: '2026-06-04 13:00-14:00', buyLimit: 1, disabled: true },
                { startTime: '15:00', endTime: '16:00', roundName: '第三场15:00-16:00', round: '2026-06-04 15:00-16:00', buyLimit: 1, disabled: true }
            ]},
            { date: '5', disabled: true, times: [
                { startTime: '10:00', endTime: '11:00', roundName: '第一场10:00-11:00', round: '2026-06-05 10:00-11:00', buyLimit: 1, disabled: true },
                { startTime: '13:00', endTime: '14:00', roundName: '第二场13:00-14:00', round: '2026-06-05 13:00-14:00', buyLimit: 1, disabled: true },
                { startTime: '15:00', endTime: '16:00', roundName: '第三场15:00-16:00', round: '2026-06-05 15:00-16:00', buyLimit: 1, disabled: true }
            ]},
            { date: '6', disabled: true, times: [
                { startTime: '10:00', endTime: '11:00', roundName: '第一场10:00-11:00', round: '2026-06-06 10:00-11:00', buyLimit: 1, disabled: true },
                { startTime: '13:00', endTime: '14:00', roundName: '第二场13:00-14:00', round: '2026-06-06 13:00-14:00', buyLimit: 1, disabled: true },
                { startTime: '15:00', endTime: '16:00', roundName: '第三场15:00-16:00', round: '2026-06-06 15:00-16:00', buyLimit: 1, disabled: true }
            ]},
            { date: '7', disabled: true, times: [
                { startTime: '10:00', endTime: '11:00', roundName: '第一场10:00-11:00', round: '2026-06-07 10:00-11:00', buyLimit: 1, disabled: true },
                { startTime: '13:00', endTime: '14:00', roundName: '第二场13:00-14:00', round: '2026-06-07 13:00-14:00', buyLimit: 1, disabled: true },
                { startTime: '15:00', endTime: '16:00', roundName: '第三场15:00-16:00', round: '2026-06-07 15:00-16:00', buyLimit: 1, disabled: true }
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
        obj.data = {
            roundName: '第三场15:00-16:00',
            round: '2026-05-31 15:00-16:00',
            imgUrl: 'https://cdn-img.car.miui.com/micar-community-static/445d422a05a547aa8aa711271e0b4abc',
            isPay: false,
            buyLimit: 1
        };
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

// 报名表单注入（服务端异常时注入正确表单结构）
function handleSurvey(obj) {
    if (obj.code !== 200) {
        obj.code = 200;
        obj.message = '成功';
        obj.data = {
            populationId: 0,
            tips: [],
            formItems: [
                {
                    id: '1778636955165',
                    type: 'username',
                    required: true,
                    label: '姓名',
                    desc: '',
                    group: 1,
                    useForQuota: false
                },
                {
                    id: '1778636967360',
                    type: 'phone',
                    required: true,
                    label: '手机号',
                    desc: '',
                    group: 1,
                    useForQuota: false
                },
                {
                    id: '1779796926417',
                    type: 'picker',
                    required: false,
                    label: '您如果购车属于',
                    desc: '',
                    defaultValue: '',
                    options: [
                        { disabled: false, value: '首次购买汽车', text: '首次购买汽车' },
                        { disabled: false, value: '置换现有车辆', text: '置换现有车辆' },
                        { disabled: false, value: '额外添置车辆', text: '额外添置车辆' }
                    ],
                    group: 1,
                    useForQuota: false
                }
            ],
            signUpReturn: {
                url: 'https://cdn-img.car.miui.com/micar-community-static/1778637005447_dec7021a7b5a4f8890c090e581d04f7b.jpg',
                title: '恭喜您预约成功',
                subTitle: '请本人前往粤港澳大湾区车展小米汽车展台，凭借核销码领取车模。',
                buttonList: [
                    { title: '查看核销码', type: 'QRCODE' },
                    { title: '分享喜悦心情', type: 'SHARE' }
                ]
            }
        };
        console.log(`[${scriptName}] ✅ getSignSurveyById 已注入表单结构`);
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
