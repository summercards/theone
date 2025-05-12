// js/block_effects/block_C.js

import { getSelectedHeroes } from '../data/hero_state.js';
import HeroData from '../data/hero_data.js';
import { addToAttackGauge } from '../page_game.js';
import { logBattle } from '../utils/battle_log.js';

export function renderBlockC(ctx, x, y, width, height) {
  const img = globalThis.imageCache['block_C'];
  if (img) ctx.drawImage(img, x, y, width, height);
}

export function onEliminateBlueBlock(count) {
  const heroes = getSelectedHeroes();
  let total = 0;
  const names = [];

  heroes.forEach(hero => {
    if (hero && hero.role === '法师') {
      const value = hero.attributes?.magical ?? 0;
      total += value;
      names.push(`${hero.name}(${value})`);
    }
  });

  const added = total * count;
  addToAttackGauge(added);
  logBattle(`[方块 C] {${names.join(', ')}} ×${count} → 攻击槽 +${added}`);
}
