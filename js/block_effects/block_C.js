// js/block_effects/block_C.js

import { getSelectedHeroes } from '../data/hero_state.js';
import HeroData from '../data/hero_data.js';
import { logBattle } from '../utils/battle_log.js';
import { dealDamage } from '../data/monster_state.js';
import { createExplosion, createMonsterBounce, showDamageText, createAvatarFlash } from '../effects_engine.js';

export function renderBlockC(ctx, x, y, width, height) {
  const img = globalThis.imageCache['block_C'];
  if (img) ctx.drawImage(img, x, y, width, height);
}

export function onEliminateBlueBlock(count) {
  // 直接魔法伤害：每个消除的蓝方块根据法师的智力属性造成伤害
  const heroes = getSelectedHeroes();
  let total = 0;
  const indices = [];
  const names = [];

  heroes.forEach((hero, idx) => {
    if (hero && hero.role === '法师') {
      const value = hero.attributes?.magical ?? 0;
      total += value;
      indices.push(idx);
      names.push(`${hero.name}(${value})`);
    }
  });

  if (total <= 0) return;

  const damage = total * count;
  dealDamage(damage, { allowKill: true });
  logBattle(`[蓝方块] {${names.join(', ')}} ×${count} → 直接造成伤害 ${damage}`);
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
    // ignore
  }
  indices.forEach(idx => {
    try {
      // 攻击动画：头像向上弹出后返回，不再放大
      createAvatarFlash(idx, 1, 400, 0, -20);
    } catch (err) {}
  });
}
