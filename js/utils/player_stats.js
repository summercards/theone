// js/utils/player_stats.js

export function updatePlayerStats({ stage, damage, gold }) {
  const oldData = wx.getStorageSync('player_stats') || {
    maxStage: 0,
    maxDamage: 0,
    maxGold: 0
  };

  const newData = {
    maxStage: Math.max(oldData.maxStage, stage ?? oldData.maxStage),
    maxDamage: Math.max(oldData.maxDamage, damage ?? oldData.maxDamage),
    maxGold: Math.max(oldData.maxGold, gold ?? oldData.maxGold)
  };

  wx.setStorageSync('player_stats', newData);
}
