/* js/cloud/apply_all.js
 * ----------------------------------------------
 * 负责把 loadCloudSave 拿到的对象
 *   { coins, heroes, stats, ... }
 * 分发回各数据模块，回灌到本地 storage
 * ---------------------------------------------- */

// === 1. 引入各模块的 “applyXX” 函数 =============
import { applyCoins }        from '../data/coin_state.js';
import { applyHeroProgress } from '../data/hero_state.js';
import { applyStats }        from '../utils/player_stats.js';   // 如果暂时没有 stats 模块，可先删掉这一行

// === 2. 统一出口 ================================
/**
 * @param {Object} cloudSave  从云端读取的整包存档
 *      示例 {
 *        coins : 1234,
 *        heroes: { id1: {lv:3}, ... },
 *        stats : {...}
 *      }
 */
export function applyAll(cloudSave = {}) {
  // 每个字段都做存在性判断，防止 undefined 报错
  if ('coins'  in cloudSave) applyCoins(cloudSave.coins);
  if ('heroes' in cloudSave) applyHeroProgress(cloudSave.heroes);
  if ('stats'  in cloudSave) applyStats(cloudSave.stats);
}
