/**
 * example-task.js
 * 共享任务示例，供 Loon 与 Quantumult‑X 的插件调用。
 *
 * 建议运行时将此文件在设备上事先加载（例如在启动脚本中），并把方法挂到 globalThis。
 */

async function exampleTaskRun(params = {}) {
  console.log("[example-task] running with params:", params);

  // 示例逻辑：模拟处理并返回结果
  return {
    ok: true,
    timestamp: Date.now(),
    note: "来自 Task/example-task.js",
    input: params
  };
}

if (typeof globalThis !== "undefined") {
  globalThis.exampleTaskRun = exampleTaskRun;
} else if (typeof window !== "undefined") {
  window.exampleTaskRun = exampleTaskRun;
}