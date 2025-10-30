/**
 * example-qx.js
 * 简单的 Quantumult‑X 脚本示例（可直接放到 QX 的脚本目录或通过 URL 加载）。
 */

(async function() {
  const params = { msg: "hello from example-qx" };
  // 如果你在设备上先加载了 Task/example-task.js 并把方法挂到 globalThis：
  if (typeof globalThis.exampleTaskRun === "function") {
    const r = await globalThis.exampleTaskRun(params);
    console.log("[example-qx] result:", r);
  } else {
    console.log("[example-qx] 未检测到 exampleTaskRun，脚本可独立执行或合并 Task 的逻辑。");
  }
})();