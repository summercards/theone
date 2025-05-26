// js/logic/prop_effects.js
import PropData from '../data/prop_data';

// --------------- 外部可见 API -----------------

/**
 * 使用 / 触发一个道具
 * @param {string} id      - 道具 id（如 'attr_boost'）
 * @param {object} ctx     - 当前战斗上下文，可选；用于战斗日志、属性修改
 * @param {object} extra   - 额外参数（视道具需求）
 *        • attr_boost : { hero, key }   key=属性字段名，默认 'physical'
 *        • level_chip : { hero }
 */
export function applyProp (id, ctx = {}, extra = {}) {
  switch (id) {
    case 'attr_boost':   return attrBoost(ctx, extra);
    case 'level_chip':   return levelChip(ctx, extra);
    case 'extra_action': return flagNextBattle('extraAction', 1);
    case 'extra_turn':   return flagNextBattle('extraTurn', 1);
    case 'gold_double':  return flagNextBattle('goldMultiplier', 2);
    default:             return false;   // 未知道具
  }
}

/**
 * 开局时调用，让所有“跨战斗 Flag”立刻落实到本局参数
 *    PageGame.initGamePage() → applyNextBattleFlags(sessionCtx)
 * @param {object} sessionCtx - 你初始化好的本局配置对象
 */
export function applyNextBattleFlags (sessionCtx) {
  const flag = wx.getStorageSync(STORAGE_KEY_NEXT);
  if (!flag) return;

  if (flag.extraAction)   sessionCtx.actionLimit  = (sessionCtx.actionLimit  || 0) + flag.extraAction;
  if (flag.extraTurn)     sessionCtx.turnsLeft    = (sessionCtx.turnsLeft    || 0) + flag.extraTurn;
  if (flag.goldMultiplier) sessionCtx.goldMultiplier = flag.goldMultiplier;

  wx.removeStorageSync(STORAGE_KEY_NEXT);
}

// --------------- 道具实现（内部） ---------------

/* —— 战斗内即时 —— */
function attrBoost (ctx, { hero, key = 'physical' }) {
  if (!hero) return false;
  hero.attributes[key] = (hero.attributes[key] || 0) + 5;
  ctx?.logBattle?.(`${hero.name} 的 ${key} +5（本战斗）`);
  return true;
}

function levelChip (ctx, { hero }) {
  if (!hero) return false;
  const need = hero.expToNextLevel - hero.exp;
  hero.gainExp(need);   // 触发原生升级流程
  ctx?.logBattle?.(`${hero.name} 等级提升！现在 Lv.${hero.level}`);
  return true;
}

/* —— 跨战斗 —— */
const STORAGE_KEY_NEXT = 'nextBattleFlags';

function flagNextBattle (key, value) {
  const flag = wx.getStorageSync(STORAGE_KEY_NEXT) || {};
  flag[key] = (flag[key] || 0) + value;
  wx.setStorageSync(STORAGE_KEY_NEXT, flag);
  return true;
}
