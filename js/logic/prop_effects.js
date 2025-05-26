// js/logic/prop_effects.js
import PropData      from '../data/prop_data';
import { hitLog }    from '../utils/battle_log';      // 若没有请改成你自己的日志函数
import { gainCoins } from '../data/coin_state';       // settleCoins 用到
// --------------------------------------------------
// —— 外部 API ——
// --------------------------------------------------

/**
 * 购买 / 使用一个道具
 * @param {string} id     道具 id
 * @param {object} ctx    战斗上下文，可选（{ logBattle }）
 * @param {object} extra  额外信息，视道具需要而定
 *        attr_boost*  → { hero, key }  key 默认 'physical'
 *        level_chip*  → { hero }
 */
export function applyProp (id, ctx = {}, extra = {}) {
  switch (id) {
    /* 1. 属性强化（本场立即生效） ------------------------------ */
    case 'attr_boost':        return attrBoost(ctx, extra, 5);
    case 'attr_boost_plus':   return attrBoost(ctx, extra,10);

    /* 2. 等级提升（永久） ------------------------------------ */
    case 'level_chip':        return levelChip(ctx, extra, 1);
    case 'level_chip_plus':   return levelChip(ctx, extra, 2);

    /* 3. 操作次数（下一场） ---------------------------------- */
    case 'extra_action':      return flagNextBattle('extraAction', 1);
    case 'extra_action_plus': return flagNextBattle('extraAction', 2);

    /* 4. 初始回合（下一场） ---------------------------------- */
    case 'extra_turn':        return flagNextBattle('extraTurn', 1);
    case 'extra_turn_plus':   return flagNextBattle('extraTurn', 2);

    /* 5. 金币倍率（下一场） ---------------------------------- */
    case 'gold_double':       return flagNextBattle('goldMultiplier', 2);
    case 'gold_triple':       return flagNextBattle('goldMultiplier', 3);

    default: return false;
  }
}

/**
 * 开局读取 & 清空所有“下一场战斗”标记
 *    PageGame.initGamePage() 调用
 * @param {object} sessionCtx  你本局要写入的配置对象
 */
export function applyNextBattleFlags (sessionCtx) {
  const flag = wx.getStorageSync(STORAGE_KEY_NEXT);
  if (!flag) return;

  sessionCtx.actionLimit     = (sessionCtx.actionLimit  || 0) + (flag.extraAction    || 0);
  sessionCtx.turnsLeft       = (sessionCtx.turnsLeft    || 0) + (flag.extraTurn      || 0);
  sessionCtx.goldMultiplier  = Math.max(sessionCtx.goldMultiplier || 1,
                                        flag.goldMultiplier || 1);

  wx.removeStorageSync(STORAGE_KEY_NEXT);
}

// --------------------------------------------------
// —— 具体实现 ——
// --------------------------------------------------

/* == 本场即时 ================================================= */
function attrBoost (ctx, { hero, key = 'physical' }, amount) {
  if (!hero) return false;
  hero.attributes[key] = (hero.attributes[key] || 0) + amount;
  ctx?.logBattle?.(`${hero.name} 的 ${key} +${amount}（本场）`);
  return true;
}

function levelChip (ctx, { hero }, levels) {
  if (!hero) return false;
  for (let i = 0; i < levels; i++) {
    const need = hero.expToNextLevel - hero.exp;
    hero.gainExp(need);
  }
  ctx?.logBattle?.(`${hero.name} 等级提升！现在 Lv.${hero.level}`);
  return true;
}

/* == 跨战斗标记 =============================================== */
const STORAGE_KEY_NEXT = 'nextBattleFlags';

/** 把效果写入本地存储，等待下一局读取 */
function flagNextBattle (key, value) {
  const flag = wx.getStorageSync(STORAGE_KEY_NEXT) || {};
  flag[key] = (flag[key] || 0) + value;
  wx.setStorageSync(STORAGE_KEY_NEXT, flag);
  return true;
}

// --------------------------------------------------
// —— 垫片：没有 battle_log / coin_state 时可删除 ——
// --------------------------------------------------
function noop() {}
export const __test = { attrBoost, levelChip, flagNextBattle }; // 方便单元测试
