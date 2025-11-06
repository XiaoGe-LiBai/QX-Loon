/*
Loon 持久化存储查看器
功能：查看所有相关的持久化存储数据
使用方式：在 Loon 中手动执行或通过快捷方式调用
*/
(function () {
  try {
    // 要查看的存储键列表
    const storageKeys = [
      // 快手极速版
      'KS_API_CLIENT_SALT',
      'KS_USER_ID',
      'KS_USER_NAME',
      'KS_USER_HEADURL',
      'KS_MIN_INFO',
      'KSJSB_KAW',
      'KSJSB_KAW_INFO',

      // 快手普通版
      'KS_MAIN_API_CLIENT_SALT',
      'KS_MAIN_USER_ID',
      'KS_MAIN_USER_NAME',
      'KS_MAIN_USER_HEADURL',
      'KS_MAIN_MIN_INFO',
      'KS_KAW',
      'KS_KAW_INFO'
    ];

    let output = '📊 Loon 持久化存储数据报告\n';
    output += '=' .repeat(50) + '\n\n';

    let foundData = 0;

    storageKeys.forEach(key => {
      const value = $persistentStore.read(key);
      if (value && value.trim() !== '') {
        foundData++;
        output += `🔑 ${key}:\n`;

        try {
          // 尝试解析为 JSON
          const parsedValue = JSON.parse(value);
          output += JSON.stringify(parsedValue, null, 2);
        } catch (e) {
          // 不是 JSON，直接显示
          output += value;
          if (value.length > 100) {
            output += `\n(长度: ${value.length} 字符)`;
          }
        }

        output += '\n\n' + '-'.repeat(30) + '\n\n';
      }
    });

    if (foundData === 0) {
      output += '❌ 未找到任何相关存储数据\n\n';
      output += '💡 请确保：\n';
      output += '1. 已成功运行过相关脚本\n';
      output += '2. 脚本执行时没有发生错误\n';
      output += '3. 存储键名称正确\n';
    } else {
      output += `✅ 共找到 ${foundData} 个存储数据\n\n`;
    }

    // 输出到控制台
    console.log(output);

    // 发送通知
    $notification.post(
      'Loon 存储数据查看器',
      foundData > 0 ? `找到 ${foundData} 个存储数据` : '未找到存储数据',
      '详细内容请查看控制台日志',
      {
        clipboard: output, // 复制完整报告到剪贴板
        openUrl: 'loon://manual-sub' // 可选：打开订阅页面
      }
    );

    $done({});

  } catch (err) {
    console.log('存储查看器异常:', err);
    $notification.post(
      '存储查看器异常',
      '',
      String((err && err.stack) || err)
    );
    $done({});
  }
})();