const img_D = wx.createImage();
img_D.src = "assets/blocks/D.png";

export function renderBlockD(ctx, x, y, width, height) {
  if (img_D.complete) {
    ctx.drawImage(img_D, x, y, width, height);
  }
}

import { addGold } from '../data/coin_state.js';
import { logBattle } from '../utils/battle_log.js';

/**
 * 黄色方块消除后效果：
 * 每个黄色方块增加 5 金币
 */
export function onEliminateYellowBlock(count) {
  const added = count * 5;
  addGold(added);
  logBattle(`[黄方块] 消除 ×${count} → 获得金币 +${added}`);
}