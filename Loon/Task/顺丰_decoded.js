/**
 * 顺丰速运自动化脚本
 * 功能：签到、积分任务、领奖、领券
 */

const $ = new Env("顺丰速运");
const notify = $.isNode() ? require("../sendNotify") : "";

// 配置与变量
let XZXXN = ($.isNode() ? process.env.XZXXN : $.getdata("XZXXN")) || "";
let XZXXNSERVER = ($.isNode() ? process.env.XZXXNSERVER : $.getdata("XZXXNSERVER")) || "https://dalaoshi.xn--ug8h.eu.org";
const DATA_KEY = "sfsy_data";
const accounts = $.toObj($.isNode() ? process.env[DATA_KEY] : $.getdata(DATA_KEY)) || [];

// 排除不做的任务
const unTaskList = [
    "完成连签7天", "参与积分活动", "每月累计寄件", "完成每月任务", 
    "与好友微信分享会员福利", "去新增一个收件偏好", "用行业模板寄件下单", 
    "用积分兑任意礼品", "设置你的顺丰ID"
];

class SFUser {
    constructor(item) {
        this.index = $.userIdx++;
        this.userId = item.userId;
        this.phone = item.phone;
        this.userName = item.userName || item.phone || item.userId || this.index;
        this.token = item.token; // 包含 url, headers, body 的对象
        this.baseUrl = "https://userone.angelgroup.com.cn";
        this.ckStatus = true;
    }

    // 通用请求方法
    async fetch(opts) {
        const url = new URL(opts.url, "https://mcs-mimp-web.sf-express.com").href;
        const options = {
            url: url,
            method: opts.type || "post",
            headers: opts.headers || { "content-type": "application/json" },
            body: opts.body ? (typeof opts.body === 'object' ? JSON.stringify(opts.body) : opts.body) : undefined,
            dataType: "json"
        };
        return await $.http[options.method.toLowerCase()](options);
    }

    // 验证脚本授权 (针对特定服务器)
    async verify() {
        const res = await $.http.post({
            url: `${XZXXNSERVER}/token/verify`,
            body: JSON.stringify({ token: XZXXN, type: "SYSY", userId: this.userId })
        });
        return JSON.parse(res.body);
    }

    // 登录获取 Sign
    async login() {
        // 使用抓包获取的原始 token 请求信息重新获取登录态
        const res = await $.http.post(this.token);
        const data = JSON.parse(res.body);
        return data.obj?.sign;
    }

    // 刷新 Cookie/Session
    async refresh_cookie(sign) {
        await $.http.get({
            url: `https://mcs-mimp-web.sf-express.com/mcs-mimp/share/app/shareRedirect?sign=${encodeURIComponent(sign)}&source=SFAPP&bizCode=647...`
        });
    }

    // 获取当前积分
    async getPoint() {
        const res = await this.fetch({
            url: "/mcs-mimp/commonPost/~memberIntegral~userInfoService~queryUserInfo",
            body: { 
                sysCode: "ESG-CEMP-CORE", 
                optionalColumns: ["usablePoint", "cycleSub", "leavePoint"],
                token: "zeTLTYeG0bLetfRk" 
            }
        });
        const points = res.obj?.usablePoint || 0;
        $.info(`[${this.userName}] 当前积分: ${points}`);
        return points;
    }

    // 签到
    async signin() {
        const res = await this.fetch({
            url: "/mcs-mimp/commonPost/~memberNonactivity~integralTaskSignPlusService~automaticSignFetchPackage",
            body: { comeFrom: "vioin", channelFrom: "SFAPP" }
        });
        $.info(`[${this.userName}] 签到结果: ${res.errorMessage || res.success}`);
    }

    // 获取任务列表
    async getTaskList() {
        const res = await this.fetch({
            url: "/mcs-mimp/commonPost/~memberNonactivity~integralTaskStrategyService~queryPointTaskAndSignFromES",
            body: { channelType: "1" }
        });
        return res.obj?.taskTitleLevels.filter(t => !unTaskList.includes(t.title)) || [];
    }

    // 完成任务
    async finishTask(task) {
        const res = await this.fetch({
            url: "/mcs-mimp/commonRoutePost/memberEs/taskRecord/finishTask",
            body: { taskCode: task.taskCode }
        });
        $.info(`[${this.userName}] 完成任务 [${task.title}]: ${res.success}`);
    }

    // 领取奖励
    async reviceReward(task) {
        const res = await this.fetch({
            url: "/mcs-mimp/commonPost/~memberNonactivity~integralTaskStrategyService~fetchIntegral",
            body: { strategyId: task.strategyId, taskId: task.taskId, taskCode: task.taskCode, channelType: "1" }
        });
        $.info(`[${this.userName}] 领取奖励 [${task.title}]: ${res.success}`);
    }
}

// 主程序执行流程
async function main() {
    for (const item of accounts) {
        const user = new SFUser(item);
        $.log(`\n--- 账号 ${user.userName} 开始 ---`);

        try {
            // 1. 权限验证 (已注释)
            // const v = await user.verify();
            // if (v.code !== 200) {
            //     console.log(v.msg);
            //     continue;
            // }

            // 2. 登录与初始化
            const sign = await user.login();
            await user.refresh_cookie(sign);

            // 3. 执行常规操作
            const startPoint = await user.getPoint();
            await user.signin();

            // 4. 任务循环
            const tasks = await user.getTaskList();
            for (const task of tasks) {
                if (task.status === 2) { // 待完成
                    await user.finishTask(task);
                }
                if (task.status === 1 || task.status === 2) { // 待领奖
                    await user.reviceReward(task);
                }
            }

            const endPoint = await user.getPoint();
            $.notifyMsg.push(`[${user.userName}] 积分: ${startPoint} -> ${endPoint} (变动: ${endPoint - startPoint})`);
            $.succCount++;

        } catch (e) {
            $.error(`[${user.userName}] 执行失败: ${e.message}`);
        }
    }
}