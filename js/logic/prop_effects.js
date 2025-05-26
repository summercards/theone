// js/logic/prop_effects.js
import PropData from '../data/prop_data';

/* ----------------- 对外 API ----------------- */

/**
 * 立即消耗并应用一个道具
 * @param {string} id
 * @param {object} ctx   - 战斗上下文（写日志等）
 * @param {object} extra - 额外参数（部分道具需要）
 */
export function applyProp(id, ctx = {}, extra = {}) {
  switch (id) {
    /* ------- 即时生效类 ------- */
    case 'attr_boost'      : return attrBoost(ctx, extra, +5);
    case 'attr_boost_plus' : return attrBoost(ctx, extra, +10);

    case 'level_chip'      : return levelChip(ctx, extra, 1);
    case 'level_chip_plus' : return levelChip(ctx, extra, 2);

    /* ------- 跨战斗 FLAG ------- */
    case 'extra_action'      : return flagNextBattle('extraAction', 1);
    case 'extra_action_plus' : return flagNextBattle('extraAction', 2);

    case 'extra_turn'        : return flagNextBattle('extraTurn', 1);
    case 'extra_turn_plus'   : return flagNextBattle('extraTurn', 2);

    case 'gold_double'       : return flagNextBattle('goldMultiplier', 2);
    case 'gold_triple'       : return flagNextBattle('goldMultiplier', 3);

    case 'revive_token'      : return flagNextBattle('autoRevive', 1);
    case 'cleanse_scroll'    : return cleanse(ctx);
    case 'reroll_ticket'     : return flagNextBattle('reroll', 1);

    default: return false;
  }
}

/**
 * 下场战斗开始时调用，把上场存的 flag 兑现
 * PageGame.initGamePage() -> applyNextBattleFlags(sessionCtx)
 */
export function applyNextBattleFlags(sessionCtx) {
  const flag = wx.getStorageSync(STORAGE_KEY_NEXT);
  if (!flag) return;

  sessionCtx.actionLimit   += flag.extraAction   || 0;
  sessionCtx.turnsLeft     += flag.extraTurn     || 0;
  sessionCtx.goldMultiplier = flag.goldMultiplier || 1;
  sessionCtx.autoRevive     = !!flag.autoRevive;
  sessionCtx.reroll         = (flag.reroll || 0);

  wx.removeStorageSync(STORAGE_KEY_NEXT);
}

/* ----------------- 具体实现 ----------------- */

function attrBoost(ctx, { hero, key = 'physical' }, delta) {
  if (!hero) return false;
  hero.attributes[key] = (hero.attributes[key] || 0) + delta;
  ctx.logBattle?.(`${hero.name} 的 ${key} +${delta}（本场）`);
  return true;
}

function levelChip(ctx, { hero }, lvInc) {
  if (!hero) return false;
  for (let i = 0; i < lvInc; i++) {
    const need = hero.expToNextLevel - hero.exp;
    hero.gainExp(need);
  }
  ctx.logBattle?.(`${hero.name} 等级 +${lvInc} → Lv.${hero.level}`);
  return true;
}

/* —— 战斗外 flag —— */
const STORAGE_KEY_NEXT = 'nextBattleFlags';

function flagNextBattle(key, value) {
  const flag = wx.getStorageSync(STORAGE_KEY_NEXT) || {};
  flag[key] = (flag[key] || 0) + value;          // ★ 叠加存储
  wx.setStorageSync(STORAGE_KEY_NEXT, flag);
  return true;
}

/* —— 其它即时类 —— */
function cleanse(ctx) {
  ctx.allHeroes?.forEach(h => h.clearDebuff?.());
  ctx.logBattle?.('全体负面效果已驱散');
  return true;
}
