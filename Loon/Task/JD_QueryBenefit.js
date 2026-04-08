/**
 * 京东金融白条权益状态修改脚本
 * 功能：将 queryBenefit 响应中的 receiveState=zero 改为 no
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

function replaceReceiveState(target) {
  let changedCount = 0;

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

      if (key === "receiveState" && current === "zero") {
        value[key] = "no";
        changedCount += 1;
        return;
      }

      walk(current);
    });
  }

  walk(target);
  return changedCount;
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
    const changedCount = replaceReceiveState(data);
    log(`receiveState 修改数量: ${changedCount}`);

    if (changedCount === 0) {
      return done(body);
    }

    return done(JSON.stringify(data));
  } catch (error) {
    log(`处理异常: ${error.message}`);
    return done(body);
  }
}

main();
