// js/cloud/cloud_save_manager.js
/* ------------------------------------------------
 * 统一负责「保存 / 读取 / 合并」的云逻辑
 * 本地仍保留一份备份，离线可用
 * ------------------------------------------------ */
const ENV_ID = 'prod-hero3match';    // 改成你的
const COLLECTION = 'UserSave';       // 数据库集合名
const LOCAL_KEY  = 'LOCAL_BACKUP';   // 整包 JSON 备份

/** 🏁 首次启动时调用 —— 拉取云存档并合并到内存 */
export async function loadCloudSave(applyFn) {
  let cloudData = null;
  try {
    const res = await wx.cloud.callFunction({ name: 'getSaveData' });
    cloudData = res.result?.data ? JSON.parse(res.result.data) : null;
  } catch (e) {
    console.warn('云端读取失败，转用本地备份', e);
  }
  if (!cloudData) cloudData = wx.getStorageSync(LOCAL_KEY) || {};
  applyFn(cloudData);            // 把数据灌回各模块
}

/** 💾 标记脏数据，节流后批量上传（避免频繁 I/O） */
let _dirty = false;
export function markDirty() {
  if (_dirty) return;
  _dirty = true;
  // 1 秒后批量写入
  setTimeout(flushCloudSave, 1000);
}

/** 🚀 真正写库的函数 */
async function flushCloudSave() {
  _dirty = false;
  const payload = collectGameState();       // 各模块自行暴露 getter
  try {
    await wx.cloud.callFunction({
      name: 'setSaveData',
      data: { saveStr: JSON.stringify(payload), version: Date.now() }
    });
  } catch (e) {
    console.warn('写云端失败，先写本地备份', e);
  }
  wx.setStorageSync(LOCAL_KEY, payload);
}

/* ---------------- 这里按自己工程补完 ---------------- */
/** 收集所有要保存的字段，打成一个对象 */
function collectGameState() {
  const { getTotalCoins }     = require('../data/coin_state.js');
  const { exportHeroProgress }= require('../data/hero_state.js');
  const { exportStats }       = require('../utils/player_stats.js');
  return {
    coins:  getTotalCoins(),
    heroes: exportHeroProgress(),
    stats:  exportStats(),
    // … 其它全局量
  };
}
