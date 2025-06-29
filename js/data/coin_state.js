// js/data/coin_state.js
/* -------------------------------------------------------
 * 简单的本地金币状态管理：
 *   - totalCoins    永久累积，存储在 wxStorage
 *   - sessionCoins  本局临时计数，离开关卡时并入 total
 * ----------------------------------------------------- */

import { logBattle } from '../utils/battle_log.js';

export const addCoins = addGold;

const STORAGE_KEY = 'totalCoins';

let sessionCoins = 0;

/**
 * 增加金币（用于方块收益等）
 * 默认每次 +1，可指定具体数值
 */
export function addGold(amount = 1) {
  sessionCoins += amount;
  logBattle(`获得金币 +${amount}（当前本局：${sessionCoins}）`);
}

/** 获取当前局内金币数（本局） */
export function getSessionCoins() {
  return sessionCoins;
}

/** 获取本地存储中永久金币总数 */
export function getTotalCoins() {
  return wx.getStorageSync(STORAGE_KEY) || 0;
}

/** 尝试消费金币。不足返回 false 并不扣款 */
export function spendCoins(amount) {
  const current = wx.getStorageSync(STORAGE_KEY) || 0;
  if (current < amount) return false;
  wx.setStorageSync(STORAGE_KEY, current - amount);
  return true;
}

/** 结束游戏后合并 sessionCoins 到永久金币，并清零 session */
export function commitSessionCoins() {
  const current = wx.getStorageSync(STORAGE_KEY) || 0;
  wx.setStorageSync(STORAGE_KEY, current + sessionCoins);
  sessionCoins = 0;
}
