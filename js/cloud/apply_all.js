/* js/cloud/apply_all.js
 * ----------------------------------------------------
 * 把 loadCloudSave() 得到的对象
 *   { coins, heroes, stats, ... }
 * 分发回各数据模块，回灌到本地 storage
 * ---------------------------------------------------- */

// === 1. 引入各模块的 “applyXX” 函数 =============
const { applyCoins }        = require('../data/coin_state.js');
const { applyHeroProgress } = require('../data/hero_state.js');
const { applyStats }        = require('../utils/player_stats.js');   // 若暂时没 stats 模块，可删这两行并同时注释掉下方调用

// === 2. 统一出口 ================================
/**
 * @param {Object} cloudSave  从云端读取的整包存档
 *      示例 {
 *        coins : 1234,
 *        heroes: { id1: {lv:3}, ... },
 *        stats : {...}
 *      }
 */
function applyAll(cloudSave = {}) {
  if ('coins'  in cloudSave) applyCoins(cloudSave.coins);
  if ('heroes' in cloudSave) applyHeroProgress(cloudSave.heroes);
  if ('stats'  in cloudSave) applyStats(cloudSave.stats);
}

module.exports = { applyAll };
