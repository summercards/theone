// js/block_effects/block_C.js

import { getSelectedHeroes } from '../data/hero_state.js';
import HeroData from '../data/hero_data.js';
import { logBattle } from '../utils/battle_log.js';
import { dealDamage } from '../data/monster_state.js';
// 使用火球特效与闪白代替爆炸和弹跳
import { playFireballEffect, createAvatarFlash, showDamageText } from '../effects_engine.js';

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

  // 基础伤害按法师智力总和乘以方块数量，并根据 Combo 叠加 30%/次
  let damage = total * count;
  const comboCnt  = globalThis.comboCounter || 1;
  const comboMult = 1 + Math.max(0, comboCnt - 1) * 0.3;
  damage = Math.floor(damage * comboMult);
  dealDamage(damage, { allowKill: true });
  logBattle(`[蓝方块] {${names.join(', ')}} ×${count} → 造成伤害 ${damage}`);
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
  } catch (err) {
    // ignore
  }
  // 头像弹跳动画
  indices.forEach(idx => {
    try {
      createAvatarFlash(idx, 1, 400, 0, -20);
    } catch (err) {}
  });
}
