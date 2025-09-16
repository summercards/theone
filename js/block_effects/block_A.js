// js/block_effects/block_A.js

import { getSelectedHeroes } from '../data/hero_state.js';
import HeroData from '../data/hero_data.js';
import { logBattle } from '../utils/battle_log.js';
import { dealDamage } from '../data/monster_state.js';
// Use fireball effect instead of explosion and bounce. Import flash and damage text utilities.
import { playFireballEffect, createAvatarFlash, showDamageText } from '../effects_engine.js';
// getMonster is no longer needed; hero icons and monster position stored in global variables

export function renderBlockA(ctx, x, y, width, height) {
  const img = globalThis.imageCache['block_A'];
  if (img) ctx.drawImage(img, x, y, width, height);
}

export function onEliminateRedBlock(count) {
  // 直接伤害：每个消除的红方块根据上阵战士的力量属性造成伤害
  const heroes = getSelectedHeroes();
  let total = 0;
  const indices = [];
  const names = [];

  heroes.forEach((hero, idx) => {
    if (hero && hero.role === '战士') {
      const value = hero.attributes?.physical ?? 0;
      total += value;
      indices.push(idx);
      names.push(`${hero.name}(${value})`);
    }
  });

  // 如果没有战士，直接返回
  if (total <= 0) return;

  // 基础伤害按战士力量总和乘以消除数量
  let damage = total * count;
  // 根据当前 Combo 数附加伤害加成：每多一次连击增加 30%
  const comboCnt  = globalThis.comboCounter || 1;
  const comboMult = 1 + Math.max(0, comboCnt - 1) * 0.3;
  damage = Math.floor(damage * comboMult);
  // 立即对怪物造成伤害
  dealDamage(damage, { allowKill: true });
  // 战斗日志
  logBattle(`[红方块] {${names.join(', ')}} ×${count} → 造成伤害 ${damage}`);
  // 触发火球特效、怪物闪白和伤害飘字
  try {
    const canvas = globalThis.canvasRef;
    if (canvas) {
      const monsterPos = globalThis.monsterSpritePos || { x: canvas.width / 2, y: 180 };
      // 从每个战士头像发射火球
      const heroPositions = globalThis.heroIconPositions || {};
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
      // 触发怪物闪白效果
      globalThis.monsterHitFlashTime = Date.now();
      // 显示伤害飘字
      showDamageText(damage, monsterPos.x, monsterPos.y + 60);
    }
  } catch (err) {
    // 忽略绘制错误
  }
  // 头像弹跳动画：向上轻弹后归位
  indices.forEach(idx => {
    try {
      createAvatarFlash(idx, 1, 400, 0, -20);
    } catch (err) {
      // ignore
    }
  });
}
