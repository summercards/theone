// js/utils/share_utils.js

export function shareMyStats() {
  const stats = wx.getStorageSync('player_stats') || {};
  const stage = stats.maxStage || 0;
  const damage = stats.maxDamage || 0;

  wx.shareAppMessage({
    title: `我打到第 ${stage} 关，造成 ${damage} 点伤害！你能超越我吗？`,
    imageUrl: 'images/share_banner.png', // 替换为你自己的图
    query: `ref=share&stage=${stage}&damage=${damage}`
  });
}
