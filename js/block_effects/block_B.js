const img_B = wx.createImage();
img_B.src = "assets/blocks/B.png";

export function renderBlockB(ctx, x, y, width, height) {
  if (img_B.complete) {
    ctx.drawImage(img_B, x, y, width, height);
  }
}

import { getSelectedHeroes } from '../data/hero_state.js';
import { addGold } from '../data/coin_state.js';
import { logBattle } from '../utils/battle_log.js';

/**
 * B方块消除后效果：
 * 每个方块生成一个“道具”，随机：
 * - 给一个英雄加物理 +5
 * - 给一个英雄加魔法 +5
 * - 加金币 +5
 */
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