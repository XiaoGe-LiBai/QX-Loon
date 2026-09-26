/**
 * 美团外卖 · 商品券（POI Coupon）有货状态解锁 —— 通杀版
 *
 * 匹配范围：i.waimai.meituan.com/openh5/vp/poicoupon/*（任意 sku_view_id / 任意券）
 *
 * 设计原则：**字段驱动，不写死取值**
 *   - 失败码不写死 code 34（实测还有 32「活动已下架」），任何非 0 code 一律放行
 *   - 售罄信号不写死文字（已经抢光 / 已下架 / 售罄 …），按词表递归清洗
 *   - 表单结构不写死 JSON 路径，按 key 名规则递归归一化
 *   - 空门店不写死形态（null / [] / {} 都处理），统一注入可用门店
 *   - 未知的 poicoupon 新接口走信封兜底分支，仍能放行
 *
 * 说明：仅修改客户端展示数据。下单/支付由服务端重新校验真实库存，
 *      本脚本不会让服务端真正放行，仅用于页面态还原与调试。
 *
 * @author XiaoGe-LiBai
 * @date 2026-09-26
 */

const scriptName = '美团商品券解锁';

// ==================== 配置参数 ====================
const CONFIG = {
    // ---- 有货态文案 ----
    stockText: '正在热卖',         // 抢购进度条文案（原「已经抢光」）
    stockPercent: 62,              // 进度条百分比，<100 即未抢光
    stockTipText: '仅剩 62 件',     // 库存提示
    submitMasterText: '立即抢购',   // 购买按钮主文案（服务端为空时填充）

    // ---- 开关 ----
    resetNonZeroCode: true,        // 任何 code != 0 -> 0（不写死 34/32）
    scrubSoldOutText: true,        // 递归清洗售罄/下架类文案
    forcePurchaseFlag: true,       // ifPurchaseFlag -> true
    forceSeckillFlag: false,       // ifSeckillFlag 保持服务端原值（勿轻易打开）
    forceSelfPickTabButton: false, // selfPickTabVO.showTabButton 保持原值
    showAddMinusButton: true,      // show_add_minus_button -> true
    injectMockPoi: true,           // 门店列表为空时注入模拟门店
    ensureButtonInfo: true,        // buttonInfo 缺失时补齐「立即抢券」按钮
    supportDeliveryNowSign: 1,     // 立即配送标记；不需要可设为 null
    buttonTitle: '立即抢券',        // 补齐按钮时使用的文案

    // ---- preview 价格兜底 ----
    // detail_page 解析到的价格会缓存复用，缓存缺失时才用下面兜底值
    priceFallback: {
        price: 0.1,
        originalPrice: 22
    },

    // ---- 模拟门店（注入用，按需替换成目标城市的真实门店更逼真）----
    mockPoi: {
        wm_poi_id: '0000000000',
        poi_id: '0000000000',
        poi_id_str: '0000000000',
        poi_name: '示例门店',
        name: '示例门店',
        brand_id: 110020138,
        distance: 1200,
        distance_text: '1.2km',
        delivery_time: 30,
        delivery_time_text: '约30分钟',
        status: 1,
        available: true,
        disabled: false,
        reason: null,
        poi_type: 1,
        is_open: 1
    }
};
// ================================================

// 售罄 / 不可售 文案词表 —— 命中的短文本统一替换为 stockText
const SOLD_OUT_WORDS = /(抢光|售罄|无货|已售完|已抢完|已下架|已停售|已结束|无库存|库存不足|商品不可售|无法购买|已停售)/;

// 无可用门店 / 超区 文案词表 —— 命中的文本直接置 null
const NO_POI_WORDS = /(暂无门店|暂无可用门店|无可用门店|无适用门店|超出配送范围|不在配送范围|暂无配送门店)/;

// 递归归一化用到的 key 规则
const KEY_RULES = {
    forceTrue: ['ifPurchaseFlag', 'show_button'],
    forceFalse: ['hidePoiList', 'maskUseLaterButton', 'nonInteractive'],
    forceNull: [
        'submit_pre_check_toast',      // 「您所在的城市暂无门店适用，是否继续购买？」
        'poiEmptyReason',
        'reason_code',
        'deliveryNowNotShowReason',
        'display_bar_sell_limit_text',
        'display_activity_end_text',
        'display_activity_day_end_text',
        'display_activity_sell_end_text'
    ]
};

// 需要注入门店的列表字段（避免误伤 self_pickup_poi_list）
const POI_LIST_KEY = /^(reachable_poi_list|same_city_poi_list)$/;
const RECOMMEND_POI_KEY = 'recommend_poi';

const CACHE_KEY_PRICE = 'mt_coupon_price';
const CACHE_KEY_ORIGIN_PRICE = 'mt_coupon_origin_price';

/** 短文本才做词表清洗，避免误伤商品名/长规则文案 */
const MAX_SCRUB_LEN = 40;

// ==================== 通用工具 ====================

function getPath(url) {
    return String(url || '')
        .replace(/^https?:\/\/[^/]+/i, '')
        .split('?')[0];
}

function readCache(key) {
    try {
        const n = parseFloat($persistentStore.read(key));
        return isNaN(n) ? null : n;
    } catch (e) {
        return null;
    }
}

function writeCache(key, value) {
    try {
        const n = parseFloat(value);
        if (!isNaN(n) && n > 0) $persistentStore.write(String(n), key);
    } catch (e) {
        // ignore
    }
}

function isEmptyList(v) {
    return v === null || typeof v === 'undefined' || (Array.isArray(v) && v.length === 0);
}

function isEmptyObj(v) {
    return v && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length === 0;
}

// ==================== 递归归一化 ====================

/**
 * 对任意 poicoupon 响应做字段级归一化，规则按 key 名生效，不依赖具体 JSON 路径。
 */
function normalize(node, changed, ctx) {
    if (Array.isArray(node)) {
        for (let i = 0; i < node.length; i++) {
            normalize(node[i], changed, ctx);
        }
        return;
    }
    if (!node || typeof node !== 'object') return;

    const keys = Object.keys(node);

    for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        let value = node[key];

        // ---- 1. 门店列表注入（null / [] 都处理）----
        if (POI_LIST_KEY.test(key) && CONFIG.injectMockPoi && isEmptyList(value)) {
            node[key] = [cloneMockPoi()];
            // 字段命名不规整：reachable_poi_list -> reachable_total_num / reachable_page_info
            const baseKey = key.replace(/_poi_list$/, '').replace(/_list$/, '');
            const totalKey = baseKey + '_total_num';
            const pageKey = baseKey + '_page_info';
            if (totalKey in node) node[totalKey] = 1;
            if (pageKey in node) node[pageKey] = { page_index: 1, page_size: 10, total: 1 };
            changed.push(`${key}: 空 -> 注入 1 家可用门店（${baseKey}_total_num 同步为 1）`);
            value = node[key];
        }

        // ---- 2. 推荐门店为空（null / {} / []）时同样注入 ----
        if (key === RECOMMEND_POI_KEY && CONFIG.injectMockPoi
            && (isEmptyObj(value) || isEmptyList(value))) {
            node[key] = cloneMockPoi();
            changed.push(`${key}: {} -> 注入 1 家可用门店`);
            value = node[key];
        }

        // ---- 3. 下标按钮信息缺失时补齐（抓包1 的 buttonInfo 为 null）----
        if (key === 'buttonInfo' && CONFIG.ensureButtonInfo
            && (value === null || typeof value === 'undefined' || isEmptyObj(value))) {
            node[key] = cloneButtonInfo();
            changed.push(`${key}: 空 -> 补齐「立即抢券」按钮`);
            value = node[key];
        }

        // ---- 4. 强制布尔值 ----
        if (KEY_RULES.forceTrue.indexOf(key) >= 0 && value !== true) {
            changed.push(`${key}: ${value} -> true`);
            node[key] = true;
            continue;
        }
        if (KEY_RULES.forceFalse.indexOf(key) >= 0 && value !== false) {
            changed.push(`${key}: ${value} -> false`);
            node[key] = false;
            continue;
        }

        // ---- 5. 强制置空 ----
        if (KEY_RULES.forceNull.indexOf(key) >= 0 && value !== null) {
            changed.push(`${key}: "${value}" -> null`);
            node[key] = null;
            continue;
        }

        // ---- 6. 立即配送标记 ----
        if (key === 'supportDeliveryNowSign' && CONFIG.supportDeliveryNowSign !== null
            && value !== CONFIG.supportDeliveryNowSign) {
            changed.push(`${key}: ${value} -> ${CONFIG.supportDeliveryNowSign}`);
            node[key] = CONFIG.supportDeliveryNowSign;
            continue;
        }

        // ---- 7. 抢购进度百分比：>=100 一律按未抢光处理 ----
        if (/percent$/i.test(key) && typeof value === 'number' && value >= 100) {
            changed.push(`${key}: ${value} -> ${CONFIG.stockPercent}`);
            node[key] = CONFIG.stockPercent;
            continue;
        }

        // ---- 8. 抢购进度条文案 ----
        if (key === 'display_bar_sell_process_text') {
            if (typeof value !== 'string' || value !== CONFIG.stockText) {
                changed.push(`${key}: "${value}" -> "${CONFIG.stockText}"`);
                node[key] = CONFIG.stockText;
            }
            continue;
        }

        // ---- 9. 库存提示文案 ----
        if (key === 'stock_text') {
            if (!value || (typeof value === 'string' && SOLD_OUT_WORDS.test(value))) {
                changed.push(`${key}: "${value}" -> "${CONFIG.stockTipText}"`);
                node[key] = CONFIG.stockTipText;
            }
            continue;
        }

        // ---- 10. 按钮主文案（服务端为空时补齐）----
        if (key === 'submit_master_text') {
            if (!value && CONFIG.submitMasterText) {
                changed.push(`${key}: "${value}" -> "${CONFIG.submitMasterText}"`);
                node[key] = CONFIG.submitMasterText;
            }
            continue;
        }

        // ---- 11. 秒杀标记 / 自提页签（默认都不动）----
        if (key === 'ifSeckillFlag' && CONFIG.forceSeckillFlag && value !== true) {
            changed.push(`${key}: ${value} -> true`);
            node[key] = true;
            continue;
        }
        if (key === 'showTabButton' && CONFIG.forceSelfPickTabButton && value !== true) {
            changed.push(`${key}: ${value} -> true`);
            node[key] = true;
            continue;
        }
        if (key === 'show_add_minus_button' && CONFIG.showAddMinusButton && value !== true) {
            changed.push(`${key}: ${value} -> true`);
            node[key] = true;
            continue;
        }

        // ---- 12. 通用文案清洗：短文本命中售罄/无门店词表 ----
        if (CONFIG.scrubSoldOutText && typeof value === 'string'
            && value.length <= MAX_SCRUB_LEN) {
            if (NO_POI_WORDS.test(value)) {
                changed.push(`${key}: "${value}" -> null`);
                node[key] = null;
                continue;
            }
            if (SOLD_OUT_WORDS.test(value)) {
                changed.push(`${key}: "${value}" -> "${CONFIG.stockText}"`);
                node[key] = CONFIG.stockText;
                continue;
            }
        }

        // ---- 13. 继续向下递归 ----
        if (value && typeof value === 'object') {
            normalize(value, changed, ctx);
        }
    }
}

function cloneMockPoi() {
    const out = {};
    Object.keys(CONFIG.mockPoi).forEach(k => { out[k] = CONFIG.mockPoi[k]; });
    return out;
}

/** 按钮信息结构，取自抓包2 available_poi 的真实形态 */
function cloneButtonInfo() {
    return {
        useButtonListForShow: true,
        buttonList: [{
            buttonType: 'NORMAL',
            title: CONFIG.buttonTitle,
            subTitle: null,
            iconUrl: null,
            whiteIconUrl: null,
            jumpUrl: null,
            textColor: null,
            backgroundColor: null
        }],
        buttonIconList: [],
        buttonExt: { deliveryNowNotShowReason: null },
        nonInteractive: false
    };
}

// ==================== 各分支处理 ====================

/** 信封层：任何非 0 code 放行 + msg 归一 */
function fixEnvelope(obj, changed) {
    if (CONFIG.resetNonZeroCode && typeof obj.code === 'number' && obj.code !== 0) {
        changed.push(`code: ${obj.code} -> 0`);
        obj.code = 0;
    }
    if (typeof obj.msg === 'string' && obj.msg !== '成功') {
        changed.push(`msg: "${obj.msg}" -> "成功"`);
        obj.msg = '成功';
    }
}

/** 从 detail_page 响应里抓价格缓存 / 抓可购买标记 */
function harvestDetail(obj, changed) {
    const base = obj.data && obj.data.coupon_package_detail_base_vo;
    if (!base) return null;

    const sku = base.sku_info;
    if (!sku) return null;

    if (CONFIG.forcePurchaseFlag && sku.ifPurchaseFlag !== true) {
        changed.push(`ifPurchaseFlag: ${sku.ifPurchaseFlag} -> true`);
        sku.ifPurchaseFlag = true;
    }

    const price = parseFloat(sku.current_price);
    const origin = parseFloat(sku.original_price);
    if (!isNaN(price) && price > 0) writeCache(CACHE_KEY_PRICE, price);
    if (!isNaN(origin) && origin > 0) writeCache(CACHE_KEY_ORIGIN_PRICE, origin);

    return {
        price: (!isNaN(price) && price > 0) ? price : null,
        origin: (!isNaN(origin) && origin > 0) ? origin : null
    };
}

/** preview / 其它接口：价格全 0 时回填 */
function fillPrice(obj, changed) {
    const data = obj.data;
    if (!data || typeof data !== 'object') return;

    const price = readCache(CACHE_KEY_PRICE) || CONFIG.priceFallback.price;
    const origin = readCache(CACHE_KEY_ORIGIN_PRICE) || CONFIG.priceFallback.originalPrice;

    const fill = (key, value) => {
        const raw = data[key];
        const cur = parseFloat(raw);
        if (!isNaN(cur) && cur > 0) return;
        changed.push(`${key}: ${raw} -> ${value}`);
        data[key] = value;
    };

    fill('product_price', price);
    fill('total_price', price);
    fill('original_price', origin);
    fill('max_original_price', origin);
}

function modifyResponse() {
    const originalBody = $response.body;
    if (!originalBody) {
        console.log(`[${scriptName}] 响应体为空，跳过`);
        return { body: originalBody };
    }

    const path = getPath($request.url);
    if (path.indexOf('/poicoupon/') < 0) {
        console.log(`[${scriptName}] 非 poicoupon 接口，原样放行: ${path}`);
        return { body: originalBody };
    }

    let obj;
    try {
        obj = JSON.parse(originalBody);
    } catch (e) {
        console.log(`[${scriptName}] 非 JSON 响应，跳过`);
        return { body: originalBody };
    }

    if (!obj || typeof obj !== 'object') {
        return { body: originalBody };
    }

    const changed = [];
    let kind = 'unknown';

    try {
        // ---- 1. 信封兜底：所有 poicoupon 接口通用（含未来新增接口）----
        fixEnvelope(obj, changed);

        // ---- 2. 字段级递归归一化 ----
        normalize(obj, changed, {});

        // ---- 3. 接口专属补强 ----
        if (path.indexOf('/detail_page') >= 0) {
            kind = 'detail_page';
            harvestDetail(obj, changed);
        } else if (path.indexOf('/preview') >= 0) {
            kind = 'preview';
            fillPrice(obj, changed);
        } else if (path.indexOf('/available_poi') >= 0) {
            kind = 'available_poi';
        } else {
            // 未知的 poicoupon 接口：只做信封 + 文案，不注入门店价格
            kind = 'generic';
        }
    } catch (e) {
        console.log(`[${scriptName}] ❌ 处理异常: ${e.message}`);
        return { body: originalBody };
    }

    if (!changed.length) {
        console.log(`[${scriptName}] [${kind}] ${path} 无需修改`);
        return { body: originalBody };
    }

    console.log(`[${scriptName}] ✅ [${kind}] ${path}`);
    changed.forEach(item => console.log(`[${scriptName}]   • ${item}`));

    return { body: JSON.stringify(obj) };
}

$done(modifyResponse());
