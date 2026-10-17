"""
Reqable 脚本 - 同程旅行「萌力值兑换」按钮点亮
@author XiaoGe-LiBai
@date 2026-10-17

抓包来源：H5 活动页 https://wx.17u.cn/cvgfront-common/activity/20260819dailyCheckIn/
后端接口：POST https://cvg.17usoft.com/activity/signInCash/{method}
          POST https://cvg.17usoft.com/activity/leadGeneration/getComponentInfo

按钮置灰判定（app.js 反编译 ExchangeSection.vue）：
    disabled = busy || !prize.couldExchange
    文案：redeemed → 已兑换 / remainingStock<=0 → 库存不足
          pointsBalance<pointsCost → 萌力值不足 / couldExchange → 换这个 / 其它 暂不可兑

本脚本只负责「点亮」：不改 exchangePrize 的返回值，服务端是否放行以真实结果为准。

@license MIT"""

from reqable import *

# ==================== 配置参数 ====================
ENABLE_BUTTON_UNLOCK = True   # 点亮兑换按钮
FAKE_STOCK = 0                # 假库存，0 表示按该奖品 dailyStock 补齐
RESET_REDEEMED = True         # 清掉「已兑换」灰态
BYPASS_ENT_WX_CHECK = True    # 放行「需先添加企微小助手」的前端拦截
FAKE_POINTS_BALANCE = 0       # 强制萌力值余额，0 表示不修改
# ================================================

TAG = '[同程萌力值]'


def _g(obj, key, default=None):
    """response.body jsonify 后顶层对象按索引取值，这里统一兜底"""
    try:
        value = obj[key]
        return default if value is None else value
    except Exception:
        return default


def onRequest(context, request):
    """请求处理函数（直接放行）"""
    return request


def _handle_exchange_info(data):
    """getExchangeInfo: {pointsBalance, stockResetTime, prizeList:[{prizeId,...,couldExchange}]}"""
    if not isinstance(data, dict):
        print(f'{TAG} data 结构异常，跳过')
        return False

    prizes = data.get('prizeList') or []
    if not prizes:
        print(f'{TAG} 未找到 prizeList，跳过')
        return False

    for prize in prizes:
        stock = FAKE_STOCK if FAKE_STOCK > 0 else ((prize.get('dailyStock') or 0) or 1)
        before = f"{prize.get('prizeName')}: stock={prize.get('remainingStock')} couldExchange={prize.get('couldExchange')}"

        if not (prize.get('remainingStock') or 0) > 0:
            prize['remainingStock'] = stock
        if RESET_REDEEMED:
            prize['redeemed'] = False
        prize['couldExchange'] = True

        print(f'{TAG}   {before} → stock={prize["remainingStock"]} couldExchange=True')

    if FAKE_POINTS_BALANCE > 0:
        data['pointsBalance'] = FAKE_POINTS_BALANCE

    print(f'{TAG} ✅ 兑换列表已点亮 {len(prizes)} 个奖品')
    return True


def _handle_index_info(root):
    """getIndexInfo: 只补余额，其它字段保持原样"""
    if FAKE_POINTS_BALANCE <= 0:
        return False
    data = _g(root, 'data')
    if not isinstance(data, dict):
        return False
    data['pointsBalance'] = FAKE_POINTS_BALANCE
    print(f'{TAG} ✅ 萌力值余额 → {FAKE_POINTS_BALANCE}')
    return True


def _handle_ent_wx_check(root):
    """
    getComponentInfo: 客户端逻辑为 data 为空则放行，data.userId 存在则放行，
    否则弹「添加同程旅行小助手」二维码。真实响应结构未证实，这里只补 userId 占位。
    """
    if not BYPASS_ENT_WX_CHECK:
        return False

    data = _g(root, 'data')
    if data is None:
        root['data'] = {'userId': '-1'}
        print(f'{TAG} ✅ 企微校验已放行（注入 userId）')
        return True
    if isinstance(data, dict) and not data.get('userId'):
        data['userId'] = '-1'
        print(f'{TAG} ✅ 企微校验已放行（补 userId）')
        return True
    return False


def _handle_exchange_prize(root):
    """只打日志，绝不伪造成功"""
    if _g(root, 'code') == 1000:
        d = _g(root, 'data') or {}
        name = d.get('prizeName', '') if isinstance(d, dict) else ''
        redirect = d.get('redirectUrl', '') if isinstance(d, dict) else ''
        print(f'{TAG} 🎉 兑换成功: {name} {redirect}')
    else:
        print(f"{TAG} ❌ 兑换失败: code={_g(root, 'code')} "
              f"message={_g(root, 'message')} logId={_g(root, 'logId', '-')}")
        print(f'{TAG}    → 服务端拦截（库存/风控/已兑换），脚本无法绕过')
    return False


def onResponse(context, response):
    """响应处理函数 - 点亮兑换按钮"""
    try:
        if response.body.isNone:
            print(f'{TAG} 响应体为空')
            return response

        url = context.url or ''
        if 'cvg.17usoft.com' not in url:
            return response

        response.body.jsonify()
        root = response.body

        code = _g(root, 'code')
        if code != 1000:
            print(f"{TAG} 响应状态异常: code={code} message={_g(root, 'message')}")
            return response

        modified = False

        if '/activity/signInCash/getExchangeInfo' in url:
            if ENABLE_BUTTON_UNLOCK:
                modified = _handle_exchange_info(_g(root, 'data') or {})
        elif '/activity/signInCash/getIndexInfo' in url:
            modified = _handle_index_info(root)
        elif '/activity/leadGeneration/getComponentInfo' in url:
            modified = _handle_ent_wx_check(root)
        elif '/activity/signInCash/exchangePrize' in url:
            modified = _handle_exchange_prize(root)

        if modified:
            context.highlight = Highlight.green

        return response

    except Exception as e:
        print(f'{TAG} 脚本异常: {str(e)}')
        import traceback
        traceback.print_exc()
        return response
