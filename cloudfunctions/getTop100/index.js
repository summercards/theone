// 云函数：返回 player_saves 中按最高伤害降序的 Top100，并投影昵称 & 头像
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async () => {
  const result = await db.collection('player_saves')
    .aggregate()
    .project({
      _id:       0,                         // 不要 _id
      openid:    '$_openid',                // 用户 openid
      nick:      '$nick',                   // 微信昵称（已在 cloud_save 写入）
      avatar:    '$avatar',                 // 微信头像（已在 cloud_save 写入）
      maxStage:  '$player_stats.maxStage',  // 最远关卡
      maxDamage: '$player_stats.maxDamage', // 最高伤害
      maxGold:   '$player_stats.maxGold'    // 最多金币
    })
    .sort({ maxDamage: -1 })               // 按最高伤害降序
    .limit(100)                            // 取前 100
    .end();

  return {
    top:      result.list,
    // myRank: 在前端计算即可，云函数这里不用额外查 count
  };
};
