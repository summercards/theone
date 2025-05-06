// js/block_effects/block_A.js

import { getSelectedHeroes } from '../data/hero_state.js';
import HeroData from '../data/hero_data.js';
import { addToAttackGauge } from '../page_game.js'; // ✅ 正确方式调用攻击槽接口
import { logBattle } from '../utils/battle_log.js'; // ✅ 记录日志

/**
 * 红色方块消除后效果：
 * 将所有“战士”的物理攻击值 × 消除数量，加入攻击槽
 */
export function onEliminateRedBlock(count) {
  const heroes = getSelectedHeroes();  // 当前上场英雄

  let totalPhysical = 0;
  const names = [];

  heroes.forEach(hero => {
    if (hero && hero.role === '战士') {
      const atk = hero.attributes?.physical ?? 0;
      totalPhysical += atk;
      names.push(`${hero.name}(${atk})`);
    }
  });

  const added = totalPhysical * count;
  addToAttackGauge(added);  // ✅ 累加到攻击槽

  logBattle(`[红方块] 战士 [${names.join(', ')}] ×${count} → 攻击槽 +${added}`);
}
