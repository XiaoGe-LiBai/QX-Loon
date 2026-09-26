"""
Reqable 脚本 - 美团外卖商品券有货状态解锁（通杀版）
@author XiaoGe-LiBai
@date 2026-09-26

匹配 https://i.waimai.meituan.com/openh5/vp/poicoupon/*（任意 sku_view_id / 任意券）

设计原则：字段驱动，不写死取值
  - 失败码不写死 code 34（实测还有 32「活动已下架」），任何非 0 code 一律放行
  - 售罄信号不写死文字（已经抢光 / 已下架 / 售罄 …），按词表递归清洗
  - 表单结构不写死 JSON 路径，按 key 名规则递归归一化
  - 空门店不写死形态（null / [] / {} 都处理），统一注入可用门店
  - 未知的 poicoupon 新接口走信封兜底分支，仍能放行

说明：仅修改客户端展示数据。下单/支付由服务端重新校验真实库存，
      本脚本不会让服务端真正放行，仅用于页面态还原与调试。
"""

from reqable import *

# ==================== 配置参数 ====================
# ---- 有货态文案 ----
STOCK_TEXT = '正在热卖'          # 抢购进度条文案（原「已经抢光」）
STOCK_PERCENT = 62               # 进度条百分比，<100 即未抢光
STOCK_TIP_TEXT = '仅剩 62 件'     # 库存提示
SUBMIT_MASTER_TEXT = '立即抢购'   # 购买按钮主文案（服务端为空时填充）
BUTTON_TITLE = '立即抢券'         # 补齐按钮时使用的文案

# ---- 开关 ----
RESET_NON_ZERO_CODE = True       # 任何 code != 0 -> 0（不写死 34/32）
SCRUB_SOLD_OUT_TEXT = True       # 递归清洗售罄/下架类文案
FORCE_PURCHASE_FLAG = True       # ifPurchaseFlag -> True
FORCE_SECKILL_FLAG = False       # ifSeckillFlag 保持服务端原值（勿轻易打开）
FORCE_SELF_PICK_TAB_BUTTON = False  # selfPickTabVO.showTabButton 保持原值
SHOW_ADD_MINUS_BUTTON = True     # show_add_minus_button -> True
INJECT_MOCK_POI = True           # 门店列表为空时注入模拟门店
ENSURE_BUTTON_INFO = True        # buttonInfo 缺失时补齐「立即抢券」按钮
SUPPORT_DELIVERY_NOW_SIGN = 1    # 立即配送标记；不需要可设为 None

# preview 确认页价格兜底；detail_page 解析到的价格会缓存复用
PRICE_FALLBACK = 0.1
ORIGIN_PRICE_FALLBACK = 22

# 模拟门店（按需替换成目标城市的真实门店更逼真）
MOCK_POI = {
    'wm_poi_id': '0000000000',
    'poi_id': '0000000000',
    'poi_id_str': '0000000000',
    'poi_name': '示例门店',
    'name': '示例门店',
    'brand_id': 110020138,
    'distance': 1200,
    'distance_text': '1.2km',
    'delivery_time': 30,
    'delivery_time_text': '约30分钟',
    'status': 1,
    'available': True,
    'disabled': False,
    'reason': None,
    'poi_type': 1,
    'is_open': 1,
}

ENV_PRICE = 'mt_coupon_price'
ENV_ORIGIN_PRICE = 'mt_coupon_origin_price'
# ================================================

import re

# 售罄 / 不可售 文案词表 —— 命中的短文本统一替换为 STOCK_TEXT
SOLD_OUT_WORDS = re.compile(r'(抢光|售罄|无货|已售完|已抢完|已下架|已停售|已结束|无库存|库存不足|商品不可售|无法购买|已停售)')

# 无可用门店 / 超区 文案词表 —— 命中的文本直接置 None
NO_POI_WORDS = re.compile(r'(暂无门店|暂无可用门店|无可用门店|无适用门店|超出配送范围|不在配送范围|暂无配送门店)')

# 递归归一化用到的 key 规则
FORCE_TRUE_KEYS = ('ifPurchaseFlag', 'show_button')
FORCE_FALSE_KEYS = ('hidePoiList', 'maskUseLaterButton', 'nonInteractive')
FORCE_NULL_KEYS = (
    'submit_pre_check_toast',       # 「您所在的城市暂无门店适用，是否继续购买？」
    'poiEmptyReason',
    'reason_code',
    'deliveryNowNotShowReason',
    'display_bar_sell_limit_text',
    'display_activity_end_text',
    'display_activity_day_end_text',
    'display_activity_sell_end_text',
)

# 需要注入门店的列表字段（避免误伤 self_pickup_poi_list）
POI_LIST_RE = re.compile(r'^(reachable_poi_list|same_city_poi_list)$')
RECOMMEND_POI_KEY = 'recommend_poi'
PERCENT_RE = re.compile(r'percent$', re.I)

# 短文本才做词表清洗，避免误伤商品名/长规则文案
MAX_SCRUB_LEN = 40


# ==================== 通用工具 ====================

def request_path(response):
    """取响应所属请求的路径（不含 query）"""
    try:
        req = response.request
        path = getattr(req, 'path', None)
        if path:
            return str(path)
        url = getattr(req, 'url', '') or ''
        return str(url).split('?')[0]
    except Exception:
        return ''


def _to_float(value):
    try:
        if value is None or value == '':
            return None
        return float(value)
    except (TypeError, ValueError):
        return None


def _cache_get(context, key):
    try:
        return _to_float(context.env[key])
    except Exception:
        return None


def _cache_set(context, key, value):
    num = _to_float(value)
    if num is not None and num > 0:
        # 整数值去掉多余的 .0，与 Loon 版本保持一致
        text = str(int(num)) if float(num).is_integer() else str(num)
        try:
            context.env[key] = text
        except Exception as e:
            print(f'[美团商品券] 写入缓存失败: {e}')


def _is_empty_list(v):
    return v is None or (isinstance(v, list) and len(v) == 0)


def _is_empty_obj(v):
    return isinstance(v, dict) and len(v) == 0


def _clone_button_info():
    """按钮信息结构，取自抓包 available_poi 的真实形态"""
    return {
        'useButtonListForShow': True,
        'buttonList': [{
            'buttonType': 'NORMAL',
            'title': BUTTON_TITLE,
            'subTitle': None,
            'iconUrl': None,
            'whiteIconUrl': None,
            'jumpUrl': None,
            'textColor': None,
            'backgroundColor': None,
        }],
        'buttonIconList': [],
        'buttonExt': {'deliveryNowNotShowReason': None},
        'nonInteractive': False,
    }


# ==================== 递归归一化 ====================

def _normalize(node, changed):
    """按 key 名规则递归归一化，不依赖具体 JSON 路径"""
    if isinstance(node, list):
        for item in node:
            _normalize(item, changed)
        return
    if not isinstance(node, dict):
        return

    # list(dict.items()) 快照，避免边遍历边新增 key
    for key, value in list(node.items()):

        # ---- 1. 门店列表注入（None / [] 都处理）----
        if POI_LIST_RE.match(key) and INJECT_MOCK_POI and _is_empty_list(value):
            node[key] = [dict(MOCK_POI)]
            # 字段命名不规整：reachable_poi_list -> reachable_total_num / reachable_page_info
            base_key = key.replace('_poi_list', '').replace('_list', '')
            total_key = base_key + '_total_num'
            page_key = base_key + '_page_info'
            if total_key in node:
                node[total_key] = 1
            if page_key in node:
                node[page_key] = {'page_index': 1, 'page_size': 10, 'total': 1}
            changed.append(f'{key}: 空 -> 注入 1 家可用门店（{base_key}_total_num 同步为 1）')
            value = node[key]

        # ---- 2. 推荐门店为空（None / {} / []）时同样注入 ----
        if key == RECOMMEND_POI_KEY and INJECT_MOCK_POI and (_is_empty_obj(value) or _is_empty_list(value)):
            node[key] = dict(MOCK_POI)
            changed.append(f'{key}: 空 -> 注入 1 家可用门店')
            value = node[key]

        # ---- 3. 底部按钮信息缺失时补齐（抓包1 的 buttonInfo 为 null）----
        if key == 'buttonInfo' and ENSURE_BUTTON_INFO and (value is None or _is_empty_obj(value)):
            node[key] = _clone_button_info()
            changed.append(f'{key}: 空 -> 补齐「{BUTTON_TITLE}」按钮')
            value = node[key]

        # ---- 4. 强制布尔值 ----
        if key in FORCE_TRUE_KEYS and value is not True:
            changed.append(f'{key}: {value} -> True')
            node[key] = True
            continue
        if key in FORCE_FALSE_KEYS and value is not False:
            changed.append(f'{key}: {value} -> False')
            node[key] = False
            continue

        # ---- 5. 强制置空 ----
        if key in FORCE_NULL_KEYS and value is not None:
            changed.append(f'{key}: "{value}" -> None')
            node[key] = None
            continue

        # ---- 6. 立即配送标记 ----
        if key == 'supportDeliveryNowSign' and SUPPORT_DELIVERY_NOW_SIGN is not None \
                and value != SUPPORT_DELIVERY_NOW_SIGN:
            changed.append(f'{key}: {value} -> {SUPPORT_DELIVERY_NOW_SIGN}')
            node[key] = SUPPORT_DELIVERY_NOW_SIGN
            continue

        # ---- 7. 抢购进度百分比：>=100 一律按未抢光处理 ----
        if PERCENT_RE.search(key) and isinstance(value, (int, float)) \
                and not isinstance(value, bool) and value >= 100:
            changed.append(f'{key}: {value} -> {STOCK_PERCENT}')
            node[key] = STOCK_PERCENT
            continue

        # ---- 8. 抢购进度条文案 ----
        if key == 'display_bar_sell_process_text':
            if not isinstance(value, str) or value != STOCK_TEXT:
                changed.append(f'{key}: "{value}" -> "{STOCK_TEXT}"')
                node[key] = STOCK_TEXT
            continue

        # ---- 9. 库存提示文案 ----
        if key == 'stock_text':
            if not value or (isinstance(value, str) and SOLD_OUT_WORDS.search(value)):
                changed.append(f'{key}: "{value}" -> "{STOCK_TIP_TEXT}"')
                node[key] = STOCK_TIP_TEXT
            continue

        # ---- 10. 按钮主文案（服务端为空时补齐）----
        if key == 'submit_master_text':
            if not value and SUBMIT_MASTER_TEXT:
                changed.append(f'{key}: "{value}" -> "{SUBMIT_MASTER_TEXT}"')
                node[key] = SUBMIT_MASTER_TEXT
            continue

        # ---- 11. 秒杀标记 / 自提页签 / 数量加减（默认都不动）----
        if key == 'ifSeckillFlag' and FORCE_SECKILL_FLAG and value is not True:
            changed.append(f'{key}: {value} -> True')
            node[key] = True
            continue
        if key == 'showTabButton' and FORCE_SELF_PICK_TAB_BUTTON and value is not True:
            changed.append(f'{key}: {value} -> True')
            node[key] = True
            continue
        if key == 'show_add_minus_button' and SHOW_ADD_MINUS_BUTTON and value is not True:
            changed.append(f'{key}: {value} -> True')
            node[key] = True
            continue

        # ---- 12. 通用文案清洗：短文本命中售罄/无门店词表 ----
        if SCRUB_SOLD_OUT_TEXT and isinstance(value, str) and len(value) <= MAX_SCRUB_LEN:
            if NO_POI_WORDS.search(value):
                changed.append(f'{key}: "{value}" -> None')
                node[key] = None
                continue
            if SOLD_OUT_WORDS.search(value):
                changed.append(f'{key}: "{value}" -> "{STOCK_TEXT}"')
                node[key] = STOCK_TEXT
                continue

        # ---- 13. 继续向下递归 ----
        if isinstance(value, (dict, list)):
            _normalize(value, changed)


# ==================== 各分支处理 ====================

def _fix_envelope(obj, changed):
    """信封层：任何非 0 code 放行 + msg 归一"""
    code = obj.get('code')
    if RESET_NON_ZERO_CODE and isinstance(code, (int, float)) and not isinstance(code, bool) and code != 0:
        changed.append(f'code: {code} -> 0')
        obj['code'] = 0
    if isinstance(obj.get('msg'), str) and obj['msg'] != '成功':
        changed.append(f'msg: "{obj["msg"]}" -> "成功"')
        obj['msg'] = '成功'


def onRequest(context, request):
    """请求处理函数（直接放行）"""
    return request


def onResponse(context, response):
    """响应处理函数"""
    try:
        if response.body.isNone:
            print('[美团商品券] 响应体为空，跳过')
            return response

        path = request_path(response)
        if '/poicoupon/' not in path:
            print(f'[美团商品券] 非 poicoupon 接口，原样放行: {path}')
            return response

        # jsonify() 返回解析后的字典，直接改它即可同步回响应体
        body = response.body.jsonify()
        if not isinstance(body, dict):
            return response

        changed = []
        kind = 'unknown'

        # ---- 1. 信封兜底：所有 poicoupon 接口通用（含未来新增接口）----
        _fix_envelope(body, changed)

        # ---- 2. 字段级递归归一化 ----
        _normalize(body, changed)

        # ---- 3. 接口专属补强 ----
        if '/detail_page' in path:
            kind = 'detail_page'
            _handle_detail_page(context, body, changed)
        elif '/preview' in path:
            kind = 'preview'
            _handle_preview(context, body, changed)
        elif '/available_poi' in path:
            kind = 'available_poi'
        else:
            # 未知的 poicoupon 接口：只做信封 + 文案，不注入门店价格
            kind = 'generic'

        if not changed:
            print(f'[美团商品券] [{kind}] {path} 无需修改')
            return response

        print(f'[美团商品券] ✅ [{kind}] {path}')
        for item in changed:
            print(f'[美团商品券]   • {item}')

        context.highlight = Highlight.green
        return response

    except Exception as e:
        print(f'[美团商品券] ❌ 脚本异常: {e}')
        import traceback
        traceback.print_exc()
        return response


def _handle_detail_page(context, body, changed):
    """detail_page：补齐可购买标记 + 缓存价格供 preview 复用"""
    data = body.get('data')
    base = data.get('coupon_package_detail_base_vo') if isinstance(data, dict) else None
    if not isinstance(base, dict):
        return
    sku = base.get('sku_info')
    if not isinstance(sku, dict):
        return

    if FORCE_PURCHASE_FLAG and sku.get('ifPurchaseFlag') is not True:
        changed.append(f'ifPurchaseFlag: {sku.get("ifPurchaseFlag")} -> True')
        sku['ifPurchaseFlag'] = True

    price = _to_float(sku.get('current_price'))
    origin = _to_float(sku.get('original_price'))
    if price:
        _cache_set(context, ENV_PRICE, price)
    if origin:
        _cache_set(context, ENV_ORIGIN_PRICE, origin)


def _handle_preview(context, body, changed):
    """preview：价格全 0 时用缓存/兜底值回填"""
    data = body.get('data')
    if not isinstance(data, dict):
        return

    price = _cache_get(context, ENV_PRICE) or PRICE_FALLBACK
    origin = _cache_get(context, ENV_ORIGIN_PRICE) or ORIGIN_PRICE_FALLBACK

    for key, value in (('product_price', price),
                       ('total_price', price),
                       ('original_price', origin),
                       ('max_original_price', origin)):
        cur = _to_float(data.get(key))
        if cur is not None and cur > 0:
            continue
        changed.append(f'{key}: {data.get(key)} -> {value}')
        data[key] = value
