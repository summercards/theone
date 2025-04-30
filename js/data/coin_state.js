// js/data/coin_state.js
/* -------------------------------------------------------
 * 简单的本地金币状态管理：
 *   - totalCoins    永久累积，存储在 wxStorage
 *   - sessionCoins  本局临时计数，离开关卡时并入 total
 * ----------------------------------------------------- */
const STORAGE_KEY = 'totalCoins';

let totalCoins    = wx.getStorageSync(STORAGE_KEY) || 0;
let sessionCoins  = 0;

export function addCoins(amount = 1) {
  sessionCoins += amount;
}

export function getSessionCoins() {
  return sessionCoins;
}

export function getTotalCoins() {
  return totalCoins;
}

/** 结束一局游戏时调用，把 session 写入本地并清零 */
export function commitSessionCoins() {
  totalCoins   += sessionCoins;
  wx.setStorageSync(STORAGE_KEY, totalCoins);
  sessionCoins  = 0;
}
