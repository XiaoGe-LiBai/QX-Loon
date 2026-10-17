"""
Reqable 脚本 - 风火轮限定礼盒购买资格抽签 活动门禁解锁（仅定位围栏）
URL 匹配：*jiyou-tech.com/2026/1198/*

目标页面：https://www.jiyou-tech.com/2026/1198/（需在微信内打开，服务端走 snsapi_base 授权拿 openid）

门禁分两层：客户端定位围栏（本脚本解锁）与服务端权威校验（本脚本不碰，见第二节末尾）。

一、定位围栏（抓包 [244] + static.jiyou-tech.com/1198/js/main.min_*.js）
  1. 页面内联脚本 getdizhi()：navigator.geolocation.getCurrentPosition
     -> 与 3 个围栏点(gcj02)做 Haversine 距离 -> radius = 2000m
  2. main.min: createScene() 里
       window._isopen && window.getdizhi ? window.getdizhi().then(ok => ok ? enterGame() : HallView('no'))
                                         : enterGame()
  3. 命中后 fallbackHtml5() 写 GameData.lon/lat，报名时随 gps_lon/gps_lat 上送
  -> 劫持 navigator.geolocation 返回围栏内坐标；这样「客户端校验通过」与「上送坐标在围栏内」同时成立

二、时间围栏（抓包 抓2/[282] lottery_mydetail.php、抓2/[294] get_now_time.php）
  1. enterGame() 从 lottery_mydetail.php 的 event_total 取日期极值写 window._time1/_time2，
     取 today 那天的 signup_start/signup_end/public_time 换算成分钟写 window._time3/_time4/_time5
     （本次实测：20261016~20261018 / 570 / 674 / 690）
  2. onTouchBtnok()（点「预约」）：
       u = 日期在 [_time1,_time2] 内；g = 当天分钟数（来自 get_now_time.php 的服务器时间）
       u && g in [_time3,_time4] ? 进入选礼盒 : 弹「不在时间范围」
  3. 核销/查看门：g >= _time5
  -> 【刻意不解锁】服务端在 lottery_signup.php 上按自己的时钟独立硬校验报名窗口
     （抓包 抓3/[355] 实测：窗口外提交一律 {"code":-302,"msg":"报名已结束"}），
     前端放宽 _time1~_time5 换不到报名资格，只会扰乱「开奖/公示」阶段的界面状态，
     因此在真实窗口内运行时保持服务端下发的原值。

@author XiaoGe-LiBai
@license MIT"""

from reqable import *

TAG = '[风火礼盒活动]'

# ── 可调参数 ────────────────────────────────────────────────────────────────
# 活动围栏点（gcj02，取自页面 getdizhi() 的 targets），任选其一都能过 2km 校验：
#   1. 潭洲国际会展中心A区   22.950914 , 113.168740   ← 默认（线下活动现场）
#   2. 希尔顿花园酒店        22.948746 , 113.166635
#   3. 盛夏路608号2栋        31.207893 , 121.628331
# 若报名接口返回「不在活动范围内」之类提示，说明服务端另有校验，换下一个坐标重试即可。
TARGET_LAT = 22.950914
TARGET_LNG = 113.168740
TARGET_NAME = '潭洲国际会展中心A区'
# ───────────────────────────────────────────────────────────────────────────

# 注入正文：占位符 __LAT__ / __LNG__ / __NAME__ 由上方常量填充，
# 正文必须与 Loon/Task/FHLH_ActivityUnlock.js 中的 INJECT_JS_TEMPLATE 逐字一致
# （tests/fhlh_activity.test.py 会做一致性校验）
INJECT_JS_TEMPLATE = """(function () {
    if (window.__FHLH_UNLOCK__) { return; }
    window.__FHLH_UNLOCK__ = true;

    var LAT = __LAT__;
    var LNG = __LNG__;
    var NAME = '__NAME__';
    var ACC = 35;

    function makePosition() {
        return {
            coords: {
                latitude: LAT, longitude: LNG, accuracy: ACC,
                altitude: null, altitudeAccuracy: null, heading: null, speed: null
            },
            timestamp: Date.now()
        };
    }

    function getCurrentPosition(success, error) {
        setTimeout(function () {
            if (typeof success !== 'function') { return; }
            try { success(makePosition()); } catch (e) { console.log('[FHLH] geo callback error: ' + e); }
        }, 20);
    }

    function watchPosition(success, error) {
        getCurrentPosition(success, error);
        return 1;
    }

    function clearWatch() {}

    var fakeGeo = {
        getCurrentPosition: getCurrentPosition,
        watchPosition: watchPosition,
        clearWatch: clearWatch
    };

    var installed = false;
    try {
        Object.defineProperty(navigator, 'geolocation', {
            configurable: true, enumerable: true, value: fakeGeo
        });
        installed = (navigator.geolocation === fakeGeo);
    } catch (e) { installed = false; }

    if (!installed) {
        try {
            var realGeo = navigator.geolocation;
            realGeo.getCurrentPosition = getCurrentPosition;
            realGeo.watchPosition = watchPosition;
            realGeo.clearWatch = clearWatch;
            installed = (realGeo.getCurrentPosition === getCurrentPosition);
        } catch (e) { installed = false; }
    }

    if (!installed) {
        try {
            var proto = Object.getPrototypeOf(navigator.geolocation);
            proto.getCurrentPosition = getCurrentPosition;
            proto.watchPosition = watchPosition;
            proto.clearWatch = clearWatch;
        } catch (e) {}
    }

    // 兜底：接管页面的 getdizhi()，系统级定位被拒绝/失败时也强制放行并补齐上送坐标
    var patched = false;

    function syncGameData() {
        try {
            if (typeof GameData !== 'undefined' && GameData) {
                GameData.lon = LNG;
                GameData.lat = LAT;
            }
        } catch (e) {}
    }

    function patchGetdizhi() {
        if (patched) { return true; }
        if (typeof window.getdizhi !== 'function') { return false; }
        var original = window.getdizhi;
        window.getdizhi = function () {
            var ret;
            try { ret = original.apply(this, arguments); } catch (e) { ret = null; }
            if (!ret || typeof ret.then !== 'function') {
                syncGameData();
                return Promise.resolve(true);
            }
            return ret.then(function () { syncGameData(); return true; }, function () { syncGameData(); return true; });
        };
        patched = true;
        console.log('[FHLH] getdizhi 已接管，活动入口强制放行');
        return true;
    }

    if (!patchGetdizhi()) {
        var timer = setInterval(function () { if (patchGetdizhi()) { clearInterval(timer); } }, 20);
        setTimeout(function () { clearInterval(timer); }, 15000);
    }

    // 时间围栏（_time1~_time5）：不再伪造，保持服务端下发的原值。
    // 服务端在 lottery_signup.php 上按自己的时钟硬校验报名窗口（窗口外一律 -302 报名已结束），
    // 前端放宽这几个变量换不到报名资格，反而会扰乱「开奖/公示」阶段的界面状态。

    console.log('[FHLH] 定位已锁定 ' + NAME + ' (' + LAT + ', ' + LNG + ')');
})();"""

INJECT_JS = (INJECT_JS_TEMPLATE
             .replace('__LAT__', str(TARGET_LAT))
             .replace('__LNG__', str(TARGET_LNG))
             .replace('__NAME__', TARGET_NAME))

INJECT_HTML = '<script>\n' + INJECT_JS + '\n</script>\n'


def build_body(html):
    """幂等 + 只处理活动页：返回改写后的 HTML，无需修改时返回 None"""
    if '__FHLH_UNLOCK__' in html:
        print(f'{TAG} 已注入，跳过')
        return None
    if 'getdizhi' not in html:
        print(f'{TAG} 未发现定位校验代码，跳过')
        return None

    index = html.find('</head>')
    if index >= 0:
        return html[:index] + INJECT_HTML + html[index:]
    return INJECT_HTML + html


def onRequest(context, request):
    return request


def onResponse(context, response):
    try:
        if response.body.isNone:
            return response

        mime = response.mime or ''
        if 'html' not in mime:
            print(f'{TAG} 非 HTML 响应（{mime}），跳过')
            return response

        html = response.body.payload
        if not isinstance(html, str):
            print(f'{TAG} 响应体不是文本，跳过')
            return response

        modified = build_body(html)
        if modified is None:
            return response

        response.body.text(modified)
        response.headers.remove('Content-Length')
        context.highlight = Highlight.green
        context.comment = f'已注入定位解锁（{TARGET_NAME}）'
        print(f'{TAG} ✅ 已注入解锁脚本 -> 定位 {TARGET_NAME} ({TARGET_LAT}, {TARGET_LNG})')

    except Exception as e:
        print(f'{TAG} ❌ 处理异常: {e}')
    return response
