/**
 * 京东金融白条权益状态修改脚本
 * 功能：
 * 1) 将 queryBenefit 响应中的 receiveState 强制改为 no（主要用于把 zero 改为 no）
 * 2) 将 queryBenefit 响应中的 availableState 强制改为 yes
 *
 * @author 菜狗
 * @date 2026-04-08
 */

const SCRIPT_NAME = "京东金融白条权益";

function log(message) {
  console.log(`[${SCRIPT_NAME}] ${message}`);
}

function done(body) {
  $done({ body });
}

function replaceBenefitState(target) {
  let receiveStateChanged = 0;
  let availableStateChanged = 0;

  function walk(value) {
    if (!value || typeof value !== "object") {
      return;
    }

    if (Array.isArray(value)) {
      value.forEach(walk);
      return;
    }

    Object.keys(value).forEach((key) => {
      const current = value[key];

      // 强制可领取状态为 yes
      if (key === "availableState" && current !== "yes") {
        value[key] = "yes";
        availableStateChanged += 1;
        return;
      }

      // 强制领取状态为 no（兼容 receiveState=zero 的情况）
      if (key === "receiveState" && current !== "no") {
        value[key] = "no";
        receiveStateChanged += 1;
        return;
      }

      walk(current);
    });
  }

  walk(target);
  return { receiveStateChanged, availableStateChanged };
}

function main() {
  const body = $response.body;
  if (!body) {
    log("响应体为空，跳过处理");
    return done(body);
  }

  let data;
  try {
    data = JSON.parse(body);
  } catch (error) {
    log(`JSON 解析失败: ${error.message}`);
    return done(body);
  }

  try {
    const { receiveStateChanged, availableStateChanged } =
      replaceBenefitState(data);
    log(`availableState 修改数量: ${availableStateChanged}`);
    log(`receiveState 修改数量: ${receiveStateChanged}`);

    if (receiveStateChanged === 0 && availableStateChanged === 0) {
      return done(body);
    }

    return done(JSON.stringify(data));
  } catch (error) {
    log(`处理异常: ${error.message}`);
    return done(body);
  }
}

main();
