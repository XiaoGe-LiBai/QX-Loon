/**
 * jd_cookie.js 自检：node tests/jd_cookie.test.js
 * 覆盖四段容易改坏的核心逻辑：cookie 多头的解析、去重抑制、失败回滚、pin 回填。
 * 用 vm 起沙箱注入 Loon 全局（$request/$persistentStore/$httpClient/$notification/$done），
 * 不引入任何依赖。
 */
const fs = require("fs");
const vm = require("vm");
const path = require("path");
const assert = require("assert");

const SRC = fs.readFileSync(path.join(__dirname, "..", "Loon", "Task", "jd_cookie.js"), "utf8");
const silent = { log() {}, error() {} };

function run(env) {
  const store = env.store || {};
  const state = { uploads: [], notes: [], done: null };
  const sandbox = {
    $request: {
      url: env.url || "https://api.m.jd.com/client.action",
      method: env.method || "GET",
      headers: env.headers || {}
    },
    $argument: env.argument || "",
    $persistentStore: {
      read: (k) => (k in store ? store[k] : null),
      write: (v, k) => {
        if (v === undefined) delete store[k];
        else store[k] = v;
      }
    },
    $httpClient: {
      post: (opts, cb) => {
        state.uploads.push(opts);
        if (env.respond) env.respond(state.uploads.length, opts, cb);
        else cb(null, { status: 200 }, JSON.stringify({ code: 0, msg: "ok", triggered: 1 }));
      }
    },
    $notification: { post: function () { state.notes.push([].slice.call(arguments)); } },
    $done: (r) => { state.done = r; },
    console: silent
  };
  vm.createContext(sandbox);
  vm.runInContext(SRC, sandbox);
  return { store, state };
}

// 1) 同名 cookie 头被拆成多个 + ", " 分隔符 —— pt_key 必须能捞出来
const r1 = run({
  headers: { cookie: "a=1, pt_key=AAA, pt_pin=test", cookie2: "b=2", Cookie3: "c=3" },
  argument: ""
});
assert.strictEqual(r1.state.uploads.length, 2, "两个域名各外发一次");
const r1urls = r1.state.uploads.map((u) => u.url).sort();
assert.deepStrictEqual(r1urls, [
  "https://bncr.xiaoge.ink/api/Doraemon/loginCallback_receive",
  "https://bncr2.xiaoge.ink/api/Doraemon/loginCallback_receive"
], "两个域名都要打到");
assert.ok(r1.state.uploads.every((u) => u.node === "DIRECT"), "默认出口应为 DIRECT");
assert.strictEqual(JSON.parse(r1.state.uploads[0].body).full_ck, "pt_key=AAA; pt_pin=test;");
assert.strictEqual(JSON.parse(r1.state.uploads[0].body).pin, "test");
assert.strictEqual(r1.store["jd_loon_ptkey_test"], "AAA", "同步段就要落去重记录");
assert.strictEqual(r1.state.notes.length, 1, "成功即弹窗（silent 默认 false）");
assert.ok(r1.state.notes[0][0].indexOf("已同步") > 0, "是成功通知");
assert.ok(r1.state.notes[0][2].indexOf("bncr") >= 0 && r1.state.notes[0][2].indexOf("bncr2") >= 0, "正文应显示两个域名都送达");

// 2) 同一凭据再来一次 → 抑制，不外发
const r2 = run({
  headers: { cookie: "a=1, pt_key=AAA, pt_pin=test" },
  store: r1.store
});
assert.strictEqual(r2.state.uploads.length, 0, "凭据未变不应重复外发");
assert.strictEqual(r2.state.notes.length, 0);

// 3) 两次上报都失败 → 回滚去重记录，下一个请求能重试
const r3 = run({
  headers: { cookie: "pt_key=BBB; pt_pin=u2" },
  respond: (n, opts, cb) => cb("Socket closed by remote peer")
});
assert.strictEqual(r3.state.uploads.length, 4, "2 域名 x 2 轮 = 4 次");
assert.ok(r3.state.uploads.slice(0, 2).every((u) => u.node === "DIRECT"), "第一轮带 node");
assert.ok(r3.state.uploads.slice(2).every((u) => u.node === undefined), "第二轮不带 node（走当前路由）");
assert.ok(!("jd_loon_ptkey_u2" in r3.store), "失败必须回滚，否则永远不再重试");
const r3b = run({ headers: { cookie: "pt_key=BBB; pt_pin=u2" }, store: r3.store });
assert.strictEqual(r3b.state.uploads.length, 2, "回滚后下次请求应重新外发（两个域名）");

// 4) 只有 wskey 的请求（sh.jd.com）→ 回填记忆 pin，拼成 wskey 形态
const r4 = run({
  headers: { cookie: "wskey=WWW" },
  url: "https://sh.jd.com/d?x=1",
  store: { jd_loon_pin: JSON.stringify({ pin: "test", raw: "test", ts: Date.now() }) }
});
assert.strictEqual(r4.state.uploads.length, 2, "wskey 单独出现也应上报（两个域名）");
assert.strictEqual(JSON.parse(r4.state.uploads[0].body).full_ck, "pin=test;wskey=WWW;");
// 只有 wskey 变化时：弹「已获取」一条即可，成功通知内容与之逐字相同应被抑制
assert.strictEqual(r4.state.notes.length, 1, "只有 wskey 变化时只弹一条，不重复");
assert.ok(r4.state.notes[0][0].indexOf("wskey已获取") > 0, "弹的是 wskey 已获取");
assert.strictEqual(r4.state.notes[0][3].clipboard, "pin=test;wskey=WWW;", "剪贴板为 pin+wskey 形态");

// 5) 过期的 pin 记忆不参与回填
const r5 = run({
  headers: { cookie: "wskey=WWW" },
  store: { jd_loon_pin: JSON.stringify({ pin: "old", raw: "old", ts: Date.now() - 13 * 3600 * 1000 }) }
});
assert.strictEqual(r5.state.uploads.length, 0, "pin 记忆超 12 小时应失效");
assert.strictEqual(r5.state.notes.length, 0, "无 pin 配对时不弹 wskey 窗");

// 6) upload=off → 不外发，但弹一条诊断
const r6 = run({
  headers: { cookie: "pt_key=CCC; pt_pin=u3" },
  argument: "upload=off"
});
assert.strictEqual(r6.state.uploads.length, 0);
assert.strictEqual(r6.state.notes.length, 1, "upload=off 属配置异常，应提示一次");
assert.ok(r6.state.notes[0][0].indexOf("诊断") > 0, "应弹诊断通知而非成功通知");
const r6b = run({ headers: { cookie: "pt_key=CCC; pt_pin=u3" }, argument: "upload=off", store: r6.store });
assert.strictEqual(r6b.state.notes.length, 0, "同版本同账号诊断只弹一次");

// 7) 无 cookie → 静默放行
const r7 = run({ headers: { host: "api.m.jd.com" } });
assert.strictEqual(r7.state.uploads.length, 0);
assert.strictEqual(r7.state.notes.length, 0);

// 8) 冗余语义：一个域名成功、另一个失败 → 整体算成功，不降级重试
const r8 = run({
  headers: { cookie: "pt_key=DDD; pt_pin=u4" },
  respond: (n, opts, cb) => {
    if (opts.url.indexOf("bncr2.") >= 0) cb("Socket closed by remote peer");
    else cb(null, { status: 200 }, JSON.stringify({ code: 0, msg: "ok", triggered: "mask" }));
  }
});
assert.strictEqual(r8.state.uploads.length, 2, "任一成功即成功，不应再降级重试第二轮");
assert.strictEqual(r8.store["jd_loon_ptkey_u4"], "DDD", "有域名成功就应保留去重记录");
assert.strictEqual(r8.state.notes.length, 1, "仍只弹一条成功通知");
assert.ok(r8.state.notes[0][2].indexOf("bncr") >= 0, "正文应显示送达的域名");

// 9) 同时换了 pt_key 与 wskey → 弹两条（内容不同，都要给）
const r9 = run({
  headers: { cookie: "pt_key=EEE; pt_pin=u5; wskey=W9" },
  store: { jd_loon_pin: JSON.stringify({ pin: "u5", raw: "u5", ts: Date.now() }) }
});
assert.strictEqual(r9.state.uploads.length, 2);
assert.strictEqual(r9.state.notes.length, 2, "pt_key 与 wskey 各一条");
const r9titles = r9.state.notes.map((n) => n[0]).join(" | ");
assert.ok(r9titles.indexOf("wskey已获取") >= 0 && r9titles.indexOf("已同步") >= 0, "两条通知类型不同");
const r9clips = r9.state.notes.map((n) => n[3].clipboard).sort();
assert.deepStrictEqual(r9clips, ["pin=u5;wskey=W9;", "pt_key=EEE; pt_pin=u5;"], "两条剪贴板内容不同");

// 10) 弹窗去重独立于上报去重：上报失败回滚后重试，不应再弹一次 wskey 窗
//     store 里：有 pin 记忆 + 弹窗标记已有 WWW，但没有上报去重记录（= 上次上报失败被回滚）
const r10 = run({
  headers: { cookie: "wskey=WWW" },
  url: "https://sh.jd.com/d?x=1",
  store: {
    jd_loon_pin: JSON.stringify({ pin: "test", raw: "test", ts: Date.now() }),
    jd_loon_wskeypop_test: "WWW"
  }
});
assert.strictEqual(r10.state.uploads.length, 2, "上报去重记录被回滚过，应重新外发");
assert.strictEqual(
  r10.state.notes.filter((n) => n[0].indexOf("wskey已获取") >= 0).length, 0,
  "弹窗标记还在，不应重复弹 wskey 窗"
);
assert.strictEqual(r10.state.notes.length, 1, "只应有成功通知（其内容与 wskey 窗相同则同样抑制）");
assert.ok(r10.state.notes[0][0].indexOf("已同步") > 0, "这条是成功通知");
assert.strictEqual(r10.state.notes[0][3].clipboard, "pin=test;wskey=WWW;", "剪贴板仍是完整 pin+wskey");

console.log("✅ jd_cookie.js 自检通过（10 组）");
