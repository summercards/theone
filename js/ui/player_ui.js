// js/ui/player_ui.js
//------------------------------------------------------------
import { getPlayerHp, getPlayerMaxHp } from '../data/player_state.js';
const { drawRoundedRect } = require('../utils/canvas_utils.js');

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
  const BAR_H = 11;
// === 添加棋盘风格描边框（参考棋盘边框颜色）===
ctx.strokeStyle = '#751b50';  // 同棋盘描边色
ctx.lineWidth = 2;
drawRoundedRect(ctx, x - 2, y - 2, BAR_W + 4, BAR_H + 4, 8, false, true); // 外框稍大一点

  const cur = getPlayerHp();
  const max = getPlayerMaxHp();

  // —— 数值插值：血条平滑掉血 ——
  smoothHp ??= cur;
  smoothHp    += (cur - smoothHp) * 0.15;

  const ratio   = Math.max(0, smoothHp / max);
  const innerW  = BAR_W * ratio;

  /* === 背景条（灰底 + 深描边） === */
  ctx.fillStyle   = '#333';
  ctx.strokeStyle = '#222';
  drawRoundedRect(ctx, x, y, BAR_W, BAR_H, 6, true, true);

  /* === 前景条（红→橙渐变） === */
  const grad = ctx.createLinearGradient(x, y, x + innerW, y);
  grad.addColorStop(0, '#a84acb');
  grad.addColorStop(1, '#e57aff');
  ctx.fillStyle = grad;
  drawRoundedRect(ctx, x, y, innerW, BAR_H, 6, true, false);

  /* === 数值文本 === */
  ctx.fillStyle    = '#FFF';
  ctx.font         = '12px sans-serif';
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${Math.ceil(cur)} / ${max}`, x + BAR_W / 2, y + BAR_H / 2);
  
}
