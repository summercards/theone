// 云函数：返回 player_stats.maxStage 降序 Top100
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

// ⚠️ 如果你安装的是 wx-server-sdk@latest，Node16 默认是 ESM，需 .default
const $cloud = cloud.default || cloud;  // 兼容性处理
const $db    = $cloud.database();
const _      = $db.command;

exports.main = async () => {
  // 聚合：把嵌套字段拉平，方便排序 & 前端直接用
  const res = await $db.collection('player_saves')
    .aggregate()
    .project({
      _id: 0,                       // 不要 _id
      openid: '$_openid',
      maxStage: '$player_stats.maxStage',
      maxDamage: '$player_stats.maxDamage',
      maxGold:   '$player_stats.maxGold'
    })
    .sort({ maxStage: -1 })         // 降序
    .limit(100)
    .end();

  return res.list;
};
