/*
BoxJs 集成脚本
为 Loon 存储数据提供 BoxJs 界面管理
功能：将存储数据转换为 BoxJs 可识别的格式
*/
(function() {
  const boxjsData = {
    "id": "com.github.xiaoge-libai.qxloon",
    "name": "QX-Loon 数据管理",
    "desc": "快手和达美乐数据抓取管理面板",
    "icons": [
      "https://raw.githubusercontent.com/XiaoGe-LiBai/QX-Loon/main/Photos/ksjsb.png"
    ],
    "author": "@XiaoGe-LiBai",
    "repo": "https://github.com/XiaoGe-LiBai/QX-Loon",
    "scripts": [
      {
        "name": "快手极速版数据",
        "title": "快手极速版",
        "icon": "https://raw.githubusercontent.com/XiaoGe-LiBai/QX-Loon/main/Photos/ksjsb.png",
        "script": "https://raw.githubusercontent.com/XiaoGe-LiBai/QX-Loon/main/Loon/Task/storage_viewer.js",
        "prefs": [
          {
            "name": "ksjsb_kaw",
            "title": "Kaw 参数",
            "type": "text",
            "readonly": true,
            "desc": "快手极速版 kaw 参数"
          },
          {
            "name": "ksjsb_salt",
            "title": "Salt 参数",
            "type": "text",
            "readonly": true,
            "desc": "快手极速版 api_client_salt"
          }
        ]
      },
      {
        "name": "快手普通版数据",
        "title": "快手普通版",
        "icon": "https://raw.githubusercontent.com/XiaoGe-LiBai/QX-Loon/main/Photos/ksjsb.png",
        "script": "https://raw.githubusercontent.com/XiaoGe-LiBai/QX-Loon/main/Loon/Task/storage_viewer.js",
        "prefs": [
          {
            "name": "ks_kaw",
            "title": "Kaw 参数",
            "type": "text",
            "readonly": true,
            "desc": "快手普通版 kaw 参数"
          },
          {
            "name": "ks_salt",
            "title": "Salt 参数",
            "type": "text",
            "readonly": true,
            "desc": "快手普通版 api_client_salt"
          }
        ]
      }
    ]
  };

  // 输出 BoxJs 配置
  console.log('BoxJs 配置:');
  console.log(JSON.stringify(boxjsData, null, 2));

  $notification.post(
    'BoxJs 配置生成',
    '配置已输出到控制台',
    '请复制配置到 BoxJs 订阅中',
    {
      clipboard: JSON.stringify(boxjsData, null, 2)
    }
  );

  $done({});
})();