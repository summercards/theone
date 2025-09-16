const img_B = wx.createImage();
img_B.src = "assets/blocks/B.png";

export function renderBlockB(ctx, x, y, width, height) {
  if (img_B.complete) {
    ctx.drawImage(img_B, x, y, width, height);
  }
}

import { getSelectedHeroes } from '../data/hero_state.js';
import { logBattle } from '../utils/battle_log.js';
import { dealDamage } from '../data/monster_state.js';
// 使用火球特效与闪白代替爆炸和弹跳
import { playFireballEffect, createAvatarFlash, showDamageText } from '../effects_engine.js';
import { createFloatingText } from '../effects_engine.js';
import { healPlayer } from '../data/player_state.js';

/**
 * B方块消除后效果（🟢新逻辑）：
 * 每个方块给玩家回血 5 点；
 * 如果场上有游侠，每个再 +1 点
 */
export function onEliminateGreenBlock(count) {
  // 攻击逻辑：绿色方块驱动在场的游侠造成物理伤害
  const heroes = getSelectedHeroes().filter(Boolean);
  if (count <= 0 || heroes.length === 0) return;

  let total = 0;
  const indices = [];
  const names = [];
  // 聚合所有游侠的物理攻击
  heroes.forEach((hero, idx) => {
    if (hero.role === '游侠') {
      const value = hero.attributes?.physical ?? 0;
      total += value;
      indices.push(idx);
      names.push(`${hero.name}(${value})`);
    }
  });

  if (total > 0) {
    // 计算伤害：游侠物攻和 × 消除数量，按连击数增加 30%/次
    let damage = total * count;
    const comboCnt  = globalThis.comboCounter || 1;
    const comboMult = 1 + Math.max(0, comboCnt - 1) * 0.3;
    damage = Math.floor(damage * comboMult);
    dealDamage(damage, { allowKill: true });
    logBattle(`[绿方块] {${names.join(', ')}} ×${count} → 造成伤害 ${damage}`);
    try {
      const canvas = globalThis.canvasRef;
      if (canvas) {
        const monsterPos   = globalThis.monsterSpritePos || { x: canvas.width / 2, y: 180 };
        const heroPositions = globalThis.heroIconPositions || {};
        // 发射火球
        indices.forEach(idx => {
          const pos = heroPositions[idx];
          if (pos) {
            playFireballEffect(
              pos.x + pos.width / 2,
              pos.y + pos.height / 2,
              monsterPos.x,
              monsterPos.y,
              48,
              500
            );
          }
        });
        // 怪物闪白
        globalThis.monsterHitFlashTime = Date.now();
        // 伤害飘字
        showDamageText(damage, monsterPos.x, monsterPos.y + 60);
      }
    } catch (err) {}
    // 头像弹跳动画
    indices.forEach(idx => {
      try {
        createAvatarFlash(idx, 1, 400, 0, -20);
      } catch (err) {}
    });
  }
  // 若没有游侠，仍旧为玩家回复少量生命以体现绿色方块的辅助价值
  else {
    const totalHeal = 5 * count;
    healPlayer(totalHeal);
    logBattle(`[绿方块] 消除 ×${count} → 玩家回复生命 ${totalHeal}`);
    const hp = globalThis.hpBarPos || { x: 24, y: 24, width: 280, height: 20 };
    const floatX = hp.x + hp.width * 0.75;
    const floatY = hp.y - 10;
    createFloatingText(`+${totalHeal} HP`, floatX, floatY, '#66FFAA');
  }
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
