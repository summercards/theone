// js/block_effects/block_A.js

import { getSelectedHeroes } from '../data/hero_state.js';
import HeroData from '../data/hero_data.js';
import { addToAttackGauge } from '../page_game.js';
import { logBattle } from '../utils/battle_log.js';

export function renderBlockA(ctx, x, y, width, height) {
  const img = globalThis.imageCache['block_A'];
  if (img) ctx.drawImage(img, x, y, width, height);
}

export function onEliminateRedBlock(count) {
  const heroes = getSelectedHeroes();
  let total = 0;
  const names = [];

  heroes.forEach(hero => {
    if (hero && hero.role === '战士') {
      const value = hero.attributes?.physical ?? 0;
      total += value;
      names.push(`${hero.name}(${value})`);
    }
  });

  const added = total * count;
  addToAttackGauge(added);
  logBattle(`[方块 A] {${names.join(', ')}} ×${count} → 攻击槽 +${added}`);
}
