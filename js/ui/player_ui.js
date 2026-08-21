// js/ui/player_ui.js
//------------------------------------------------------------
import { getPlayerHp, getPlayerMaxHp } from '../data/player_state.js';
const { drawComicHealthBar } = require('../utils/comic_button.js');

let smoothHp = null;      // 用于动画平滑

/**
 * 绘制玩家血条
 * @param ctx      CanvasRenderingContext2D
 * @param canvas   当前画布
 * @param x        血条左上角 X（默认 24）
 * @param y        血条左上角 Y（默认 24）
 */
export function drawPlayerHp(ctx, canvas, x = 24, y = 24) {
  const BAR_W = 280;
  const BAR_H = 18;

  const cur = getPlayerHp();
  const max = getPlayerMaxHp();

  // —— 数值插值：血条平滑掉血 ——
  smoothHp ??= cur;
  smoothHp    += (cur - smoothHp) * 0.15;

  const ratio   = Math.max(0, smoothHp / max);
  drawComicHealthBar(ctx, {
    x, y, width: BAR_W, height: BAR_H, ratio,
    label: `${Math.ceil(cur)} / ${max}`, side: 'player', critical: ratio < 0.25
  });
  
}
