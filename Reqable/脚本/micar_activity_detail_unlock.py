"""
Reqable 脚本 - 小米汽车社区活动详情按钮解锁
URL 匹配：*api.community.car.miui.com/*
功能：
  1. detail                  解锁按钮 + 开放报名状态（signStatus/registerStatus → 1）
  2. refreshCalendar         注入日历场次数据（服务端返回 3000 时接管）
  3. queryCalendarRoundInfo  验证场次放行
  4. checkAndSaveSelectedRound  预占场次放行
  5. getSignSurveyById       注入正确表单结构
@author XiaoGe-LiBai
@license MIT"""

from reqable import *

TAG = '[小米汽车活动]'

# 与官方服务器返回格式完全对齐的日历数据（粤港澳大湾区车展 809302857）
_CALENDAR_DATA = {
    'activityId': '809302857',
    'enableQuota': True,
    'pay': False,
    'monthList': [{
        'year': '2026',
        'month': '5',
        'defaultRound': '2026-05-31 15:00-16:00',
        'expired': False,
        'dateList': [{
            'date': '31',
            'disabled': False,
            'times': [{
                'startTime': '15:00',
                'endTime': '16:00',
                'roundName': '第三场15:00-16:00',
                'round': '2026-05-31 15:00-16:00',
                'buyLimit': 1,
                'disabled': False
            }]
        }]
    }, {
        'year': '2026',
        'month': '6',
        'defaultRound': None,
        'expired': False,
        'dateList': [
            {'date': '1', 'disabled': True, 'times': [
                {'startTime': '10:00', 'endTime': '11:00', 'roundName': '第一场10:00-11:00', 'round': '2026-06-01 10:00-11:00', 'buyLimit': 1, 'disabled': True},
                {'startTime': '13:00', 'endTime': '14:00', 'roundName': '第二场13:00-14:00', 'round': '2026-06-01 13:00-14:00', 'buyLimit': 1, 'disabled': True},
                {'startTime': '15:00', 'endTime': '16:00', 'roundName': '第三场15:00-16:00', 'round': '2026-06-01 15:00-16:00', 'buyLimit': 1, 'disabled': True}
            ]},
            {'date': '2', 'disabled': True, 'times': [
                {'startTime': '10:00', 'endTime': '11:00', 'roundName': '第一场10:00-11:00', 'round': '2026-06-02 10:00-11:00', 'buyLimit': 1, 'disabled': True},
                {'startTime': '13:00', 'endTime': '14:00', 'roundName': '第二场13:00-14:00', 'round': '2026-06-02 13:00-14:00', 'buyLimit': 1, 'disabled': True},
                {'startTime': '15:00', 'endTime': '16:00', 'roundName': '第三场15:00-16:00', 'round': '2026-06-02 15:00-16:00', 'buyLimit': 1, 'disabled': True}
            ]},
            {'date': '3', 'disabled': True, 'times': [
                {'startTime': '10:00', 'endTime': '11:00', 'roundName': '第一场10:00-11:00', 'round': '2026-06-03 10:00-11:00', 'buyLimit': 1, 'disabled': True},
                {'startTime': '13:00', 'endTime': '14:00', 'roundName': '第二场13:00-14:00', 'round': '2026-06-03 13:00-14:00', 'buyLimit': 1, 'disabled': True},
                {'startTime': '15:00', 'endTime': '16:00', 'roundName': '第三场15:00-16:00', 'round': '2026-06-03 15:00-16:00', 'buyLimit': 1, 'disabled': True}
            ]},
            {'date': '4', 'disabled': True, 'times': [
                {'startTime': '10:00', 'endTime': '11:00', 'roundName': '第一场10:00-11:00', 'round': '2026-06-04 10:00-11:00', 'buyLimit': 1, 'disabled': True},
                {'startTime': '13:00', 'endTime': '14:00', 'roundName': '第二场13:00-14:00', 'round': '2026-06-04 13:00-14:00', 'buyLimit': 1, 'disabled': True},
                {'startTime': '15:00', 'endTime': '16:00', 'roundName': '第三场15:00-16:00', 'round': '2026-06-04 15:00-16:00', 'buyLimit': 1, 'disabled': True}
            ]},
            {'date': '5', 'disabled': True, 'times': [
                {'startTime': '10:00', 'endTime': '11:00', 'roundName': '第一场10:00-11:00', 'round': '2026-06-05 10:00-11:00', 'buyLimit': 1, 'disabled': True},
                {'startTime': '13:00', 'endTime': '14:00', 'roundName': '第二场13:00-14:00', 'round': '2026-06-05 13:00-14:00', 'buyLimit': 1, 'disabled': True},
                {'startTime': '15:00', 'endTime': '16:00', 'roundName': '第三场15:00-16:00', 'round': '2026-06-05 15:00-16:00', 'buyLimit': 1, 'disabled': True}
            ]},
            {'date': '6', 'disabled': True, 'times': [
                {'startTime': '10:00', 'endTime': '11:00', 'roundName': '第一场10:00-11:00', 'round': '2026-06-06 10:00-11:00', 'buyLimit': 1, 'disabled': True},
                {'startTime': '13:00', 'endTime': '14:00', 'roundName': '第二场13:00-14:00', 'round': '2026-06-06 13:00-14:00', 'buyLimit': 1, 'disabled': True},
                {'startTime': '15:00', 'endTime': '16:00', 'roundName': '第三场15:00-16:00', 'round': '2026-06-06 15:00-16:00', 'buyLimit': 1, 'disabled': True}
            ]},
            {'date': '7', 'disabled': True, 'times': [
                {'startTime': '10:00', 'endTime': '11:00', 'roundName': '第一场10:00-11:00', 'round': '2026-06-07 10:00-11:00', 'buyLimit': 1, 'disabled': True},
                {'startTime': '13:00', 'endTime': '14:00', 'roundName': '第二场13:00-14:00', 'round': '2026-06-07 13:00-14:00', 'buyLimit': 1, 'disabled': True},
                {'startTime': '15:00', 'endTime': '16:00', 'roundName': '第三场15:00-16:00', 'round': '2026-06-07 15:00-16:00', 'buyLimit': 1, 'disabled': True}
            ]}
        ]
    }]
}

# 表单结构（从 getSignSurveyById 抓包确认）
_FORM_SURVEY_DATA = {
    'populationId': 0,
    'tips': [],
    'formItems': [
        {
            'id': '1778636955165',
            'type': 'username',
            'required': True,
            'label': '姓名',
            'desc': '',
            'group': 1,
            'useForQuota': False
        },
        {
            'id': '1778636967360',
            'type': 'phone',
            'required': True,
            'label': '手机号',
            'desc': '',
            'group': 1,
            'useForQuota': False
        },
        {
            'id': '1779796926417',
            'type': 'picker',
            'required': False,
            'label': '您如果购车属于',
            'desc': '',
            'defaultValue': '',
            'options': [
                {'disabled': False, 'value': '首次购买汽车', 'text': '首次购买汽车'},
                {'disabled': False, 'value': '置换现有车辆', 'text': '置换现有车辆'},
                {'disabled': False, 'value': '额外添置车辆', 'text': '额外添置车辆'}
            ],
            'group': 1,
            'useForQuota': False
        }
    ],
    'signUpReturn': {
        'url': 'https://cdn-img.car.miui.com/micar-community-static/1778637005447_dec7021a7b5a4f8890c090e581d04f7b.jpg',
        'title': '恭喜您预约成功',
        'subTitle': '请本人前往粤港澳大湾区车展小米汽车展台，凭借核销码领取车模。您可以点击下方按钮查看核销码，或通过小米汽车APP-我的-我的活动，找到报名记录后，查看核销码。 期待与您相遇～',
        'buttonList': [
            {'title': '查看核销码', 'type': 'QRCODE'},
            {'title': '分享喜悦心情', 'type': 'SHARE'}
        ]
    }
}


def _force_success(response, tag, data=None):
    """将业务 code 强制改为 200"""
    original = response.body['code'] if 'code' in response.body else None
    if original != 200:
        response.body['code']    = 200
        response.body['message'] = '成功'
        response.body['data']    = data
        print(f'{TAG} ✅ {tag}  code: {original}→200')
        return True
    print(f'{TAG} {tag} 返回正常，无需修改')
    return False


def onRequest(context, request):
    return request


def onResponse(context, response):
    try:
        if response.body.isNone:
            return response

        path = response.request.path

        # ── 1. 解锁活动详情按钮 + 开放报名状态 ───────────────────────────────
        if '/api/h5/activity/v1/detail' in path:
            response.body.jsonify()
            if response.body['code'] != 200:
                print(f'{TAG} detail 接口业务异常: code={response.body["code"]}')
                return response
            data = response.body['data'] if 'data' in response.body else None
            if not data or 'button' not in data:
                print(f'{TAG} detail 缺少 data.button，跳过')
                return response
            before_show  = response.body['data']['button'].get('showEnable')
            before_en    = response.body['data']['button'].get('enable')
            before_sign  = response.body['data'].get('signStatus')
            before_reg   = response.body['data'].get('registerStatus')
            response.body['data']['button']['showEnable'] = True
            response.body['data']['button']['enable']     = True
            response.body['data']['button']['title']      = '立即预约'
            response.body['data']['signStatus']           = 1   # CAN_APPLY
            response.body['data']['registerStatus']       = 1   # 报名开放
            print(f'{TAG} ✅ detail 已修改  showEnable:{before_show}→True  enable:{before_en}→True  signStatus:{before_sign}→1  registerStatus:{before_reg}→1')
            context.highlight = Highlight.green

        # ── 2. 注入日历数据（服务端返回非 200 时接管） ─────────────────────────
        elif '/api/h5/activity/v1/refreshCalendar' in path:
            response.body.jsonify()
            if response.body['code'] != 200:
                response.body['code']    = 200
                response.body['message'] = '成功'
                response.body['data']    = _CALENDAR_DATA
                print(f'{TAG} ✅ refreshCalendar 已注入日历数据（code 异常修复）')
                context.highlight = Highlight.green
            else:
                print(f'{TAG} refreshCalendar 正常，无需修改')

        # ── 3. 场次验证放行 ───────────────────────────────────────────────
        elif '/api/h5/activity/v1/queryCalendarRoundInfo' in path:
            response.body.jsonify()
            if _force_success(response, 'queryCalendarRoundInfo', data={
                'roundName': '第三场15:00-16:00',
                'round': '2026-05-31 15:00-16:00',
                'imgUrl': 'https://cdn-img.car.miui.com/micar-community-static/445d422a05a547aa8aa711271e0b4abc',
                'isPay': False,
                'buyLimit': 1
            }):
                context.highlight = Highlight.green

        # ── 4. 预占场次放行 ───────────────────────────────────────────────
        elif '/api/h5/activity/v1/checkAndSaveSelectedRound' in path:
            response.body.jsonify()
            if _force_success(response, 'checkAndSaveSelectedRound', data=True):
                context.highlight = Highlight.green

        # ── 5. 报名表单注入（服务端返回非 200 时接管） ─────────────────────────
        elif '/api/h5/activity/v3/getSignSurveyById' in path:
            response.body.jsonify()
            if response.body['code'] != 200:
                response.body['code']    = 200
                response.body['message'] = '成功'
                response.body['data']    = _FORM_SURVEY_DATA
                print(f'{TAG} ✅ getSignSurveyById 已注入表单结构')
                context.highlight = Highlight.green
            else:
                print(f'{TAG} getSignSurveyById 正常，无需修改')

        # ── 6. 最终报名提交放行 —— 暂时注释，到点抢购时不需要 bypass ─────────
        # elif '/api/h5/activity/v1/confirm' in path:
        #     response.body.jsonify()
        #     if _force_success(response, 'confirm', data=None):
        #         context.highlight = Highlight.green

        return response

    except Exception as e:
        print(f'{TAG} 脚本异常: {str(e)}')
        import traceback
        traceback.print_exc()
        return response
