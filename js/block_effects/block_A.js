// js/block_effects/block_A.js

import { getSelectedHeroes } from '../data/hero_state.js';
import HeroData from '../data/hero_data.js';
import { logBattle } from '../utils/battle_log.js';
import { dealDamage } from '../data/monster_state.js';
import { createExplosion, createMonsterBounce, showDamageText, createAvatarFlash } from '../effects_engine.js';
import { getMonster } from '../data/monster_state.js';

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

  const damage = total * count;
  // 立即对怪物造成伤害
  dealDamage(damage, { allowKill: true });
  // 战斗日志
  logBattle(`[红方块] {${names.join(', ')}} ×${count} → 直接造成伤害 ${damage}`);
  // 显示爆炸和伤害文本
  try {
    const canvas = globalThis.canvasRef;
    if (canvas) {
      const x = canvas.width / 2;
      const y = 180;
      createExplosion(x, y);
      createMonsterBounce();
      showDamageText(damage, x, y + 50);
    }
  } catch (err) {
    // fallback silently
  }
  // 放大对应英雄头像
  indices.forEach(idx => {
    try {
      // 攻击动画：头像向上弹出后返回，不再放大
      createAvatarFlash(idx, 1, 400, 0, -20);
    } catch (err) {
      /* ignore */
    }
  });
}
