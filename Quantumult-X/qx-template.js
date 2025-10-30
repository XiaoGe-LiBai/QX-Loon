/**
 * Quantumult‑X 脚本模板
 * name: qx-template
 * author: XiaoGe-LiBai
 * description: QX 插件模板，示例展示如何调用全局 Task 方法或直接包含逻辑。
 */

(async () => {
  // 如果 Task 在运行环境中已被加载并挂到 globalThis，则可直接调用
  if (typeof globalThis.exampleTaskRun === "function") {
    const res = await globalThis.exampleTaskRun({ source: "Quantumult-X/qx-template" });
    console.log("[qx-template] exampleTaskRun 返回:", res);
  } else {
    console.log("[qx-template] 未检测到 exampleTaskRun，建议将 Task/example-task.js 的内容合并或预先加载。");
  }
})();