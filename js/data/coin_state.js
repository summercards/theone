// js/data/coin_state.js
/* -------------------------------------------------------
 * 简单的本地金币状态管理：
 *   - totalCoins    永久累积，存储在 wxStorage
 *   - sessionCoins  本局临时计数，离开关卡时并入 total
 * ----------------------------------------------------- */
const STORAGE_KEY = 'totalCoins';

let sessionCoins = 0;

export function addCoins(amount = 1) {
  sessionCoins += amount;
}

export function getSessionCoins() {
  return sessionCoins;
}

// ✅ 实时读取存储中的 totalCoins，解决金币不刷新的问题
export function getTotalCoins() {
  return wx.getStorageSync(STORAGE_KEY) || 0;
}

/** 尝试消费金币。不足返回 false 并不扣款 */
export function spendCoins(amount) {
  const current = wx.getStorageSync(STORAGE_KEY) || 0;
  if (current < amount) return false;
  wx.setStorageSync(STORAGE_KEY, current - amount);
  return true;
}

/** 结束一局游戏时调用，把 session 写入本地并清零 */
export function commitSessionCoins() {
  const current = wx.getStorageSync(STORAGE_KEY) || 0;
  wx.setStorageSync(STORAGE_KEY, current + sessionCoins);
  sessionCoins = 0;
}
