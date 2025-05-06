// js/block_effects/block_C.js

import { getSelectedHeroes } from '../data/hero_state.js';
import { addToAttackGauge } from '../page_game.js';
import { logBattle } from '../utils/battle_log.js';

/**
 * 蓝色方块消除后效果：
 * 将所有“法师”的法术攻击值 × 消除数量，加入攻击槽
 */
export function onEliminateBlueBlock(count) {
  const heroes = getSelectedHeroes();
  let totalMagical = 0;
  const names = [];

  heroes.forEach(hero => {
    if (hero && hero.role === '法师') {
      const atk = hero.attributes?.magical ?? 0;
      totalMagical += atk;
      names.push(`${hero.name}(${atk})`);
    }
  });

  const added = totalMagical * count;
  addToAttackGauge(added);

  logBattle(`[蓝方块] 法师 [${names.join(', ')}] ×${count} → 攻击槽 +${added}`);
}
