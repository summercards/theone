const img_B = wx.createImage();
img_B.src = "assets/blocks/B.png";

export function renderBlockB(ctx, x, y, width, height) {
  if (img_B.complete) {
    ctx.drawImage(img_B, x, y, width, height);
  }
}

import { getSelectedHeroes } from '../data/hero_state.js';
// import { addGold } from '../data/coin_state.js'; // 原逻辑使用
import { logBattle } from '../utils/battle_log.js';
import { healPlayer } from '../data/player_state.js'; // ✅ 新增
import { createFloatingText } from '../effects_engine.js'; // ✅ 新增

/**
 * B方块消除后效果（🟢新逻辑）：
 * 每个方块给玩家回血 5 点；
 * 如果场上有游侠，每个再 +1 点
 */
export function onEliminateGreenBlock(count) {
  const heroes = getSelectedHeroes().filter(Boolean);
  if (count <= 0 || heroes.length === 0) return;

  const hasRanger = heroes.some(h => h.role === '游侠');
  const perBlockHeal = hasRanger ? 6 : 5;
  const totalHeal = Math.round(perBlockHeal * count * (globalThis.runModifiers?.healMultiplier || 1));

  healPlayer(totalHeal); // ✅ 加血
  logBattle(`[B方块] 玩家恢复生命 +${totalHeal}${hasRanger ? '（游侠加成）' : ''}`);

  // ✅ 漂浮加血文字（位置可调）
  const hp = globalThis.hpBarPos || { x: 24, y: 24, width: 280, height: 20 };
  const floatX = hp.x + hp.width * 0.75;  // 血条偏右
  const floatY = hp.y - 10;               // 血条上方
  createFloatingText(`+${totalHeal} HP`, floatX, floatY, '#66FFAA');
}


/* === 🛑 原逻辑保留，已注释：随机分配属性或金币道具 ===
export function onEliminateGreenBlock(count) {
  const heroes = getSelectedHeroes().filter(Boolean);
  if (heroes.length === 0) return;

  for (let i = 0; i < count; i++) {
    const random = Math.random();
    const target = heroes[Math.floor(Math.random() * heroes.length)];

    if (random < 0.33) {
      target.attributes.physical += 1;
      logBattle(`[B道具] ${target.name} 力量 +1`);
    } else if (random < 0.66) {
      target.attributes.magical += 1;
      logBattle(`[B道具] ${target.name} 智力 +1`);
    } else {
      addGold(1);
      logBattle(`[B道具] 获得金币 +1`);
    }
  }
}
*/
