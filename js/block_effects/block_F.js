const img_F = wx.createImage();
img_F.src = "assets/blocks/F.png";

export function renderBlockF(ctx, x, y, width, height) {
  if (img_F.complete) {
    ctx.drawImage(img_F, x, y, width, height);
  }
}

import { getSelectedHeroes } from '../data/hero_state.js';
import { getCharges, setCharge } from '../data/hero_charge_state.js';
import { logBattle } from '../utils/battle_log.js';

/**
 * F方块（紫色）消除后效果：
 * 所有在场英雄蓄力槽 +10% × 方块数量
 */
export function onEliminateSupportBlock(count) {
  const gain = count * 10;
  const charges = getCharges();
  const heroes = getSelectedHeroes();

  heroes.forEach((hero, i) => {
    if (!hero) return;
    const before = charges[i];
    const after  = Math.min(100, before + gain);
    setCharge(i, after);
    logBattle(`[F方块] ${hero.name} 蓄力 +${gain}%（原 ${before} → ${after}）`);
  });
}