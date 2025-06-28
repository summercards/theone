// js/utils/player_stats.js
const STORAGE_KEY = 'player_stats';

/** 单局结束时更新统计（原有逻辑） */
function updatePlayerStats({ stage, damage, gold }) {
  const old = wx.getStorageSync(STORAGE_KEY) || {
    maxStage  : 0,
    maxDamage : 0,
    maxGold   : 0
  };
  const next = {
    maxStage  : Math.max(old.maxStage , stage   ?? old.maxStage ),
    maxDamage : Math.max(old.maxDamage, damage  ?? old.maxDamage),
    maxGold   : Math.max(old.maxGold , gold    ?? old.maxGold )
  };
  wx.setStorageSync(STORAGE_KEY, next);
}

/** → 云端保存用 */
function exportStats() {
  return wx.getStorageSync(STORAGE_KEY) || {};
}

/** ← 云端回灌用 */
function applyStats(obj) {
  if (obj && typeof obj === 'object') {
    wx.setStorageSync(STORAGE_KEY, obj);
  }
}

module.exports = { updatePlayerStats, exportStats, applyStats };
