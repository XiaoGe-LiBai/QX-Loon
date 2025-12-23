"""
Reqable 脚本 - 爱奇艺尖叫之夜按钮点亮
@author XiaoGe-LiBai
@date 2025-11-21
"""

from reqable import *
import time

# ==================== 配置参数 ====================
STOCK_VALUE = 100     # 模拟库存数量
EXTEND_HOURS = 48     # 延长活动时间（小时）
# ================================================


def onRequest(context, request):
    """请求处理函数（直接放行）"""
    return request


def onResponse(context, response):
    """响应处理函数 - 修改库存和活动时间"""
    try:
        # 检查响应体
        if response.body.isNone:
            print('[爱奇艺秒杀] 响应体为空')
            return response

        # 将响应体转为字典（jsonify后可通过索引访问）
        response.body.jsonify()

        # 检查响应结构 - 使用索引访问而非.get()
        code = response.body['code'] if 'code' in response.body else None
        if code != 'A00000':
            msg = response.body['msg'] if 'msg' in response.body else '未知'
            print(f'[爱奇艺秒杀] 响应状态异常: {code} - {msg}')
            return response

        # 获取数据结构
        data = response.body['data'] if 'data' in response.body else {}
        times_list = data.get('skActivityTimesResponseList', {}) if isinstance(data, dict) else {}
        goods_list = times_list.get('skTimesGoodsResponseList', []) if isinstance(times_list, dict) else []

        if not goods_list:
            print('[爱奇艺秒杀] 未找到商品列表')
            return response

        modifications = []
        now = int(time.time() * 1000)

        # 1. 修改活动开始时间（提前到1小时前，解决"待开售"状态）
        if times_list.get('timesStartTime'):
            new_start_time = now - (1 * 60 * 60 * 1000)  # 当前时间-1小时
            response.body['data']['skActivityTimesResponseList']['timesStartTime'] = new_start_time
            modifications.append('已开售')

        # 2. 修改活动结束时间（延长指定小时数）
        if times_list.get('timesEndTime'):
            new_end_time = now + (EXTEND_HOURS * 60 * 60 * 1000)
            response.body['data']['skActivityTimesResponseList']['timesEndTime'] = new_end_time
            modifications.append('时间延长')

        # 3. 修改所有商品的剩余库存
        stock_modified_count = 0
        for i, item in enumerate(goods_list):
            if item.get('leftStock', 0) == 0:
                response.body['data']['skActivityTimesResponseList']['skTimesGoodsResponseList'][i]['leftStock'] = STOCK_VALUE
                stock_modified_count += 1

        if stock_modified_count > 0:
            modifications.append(f'{stock_modified_count}个商品已点亮')

        # 输出结果
        if modifications:
            print(f'[爱奇艺秒杀] ✅ {" | ".join(modifications)}')
        else:
            print('[爱奇艺秒杀] 无需修改')

        # 设置高亮显示
        context.highlight = Highlight.green

        return response

    except Exception as e:
        print(f'[爱奇艺秒杀] 脚本异常: {str(e)}')
        import traceback
        traceback.print_exc()
        return response
