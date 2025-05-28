/* ==========================================================
 * 道具头像绘制工具  ui/prop_ui.js
 * ======================================================= */

import { drawRoundedRect } from '../utils/canvas_utils.js';
import PropData            from '../data/prop_data.js';

/* —— 纯色底色映射 —— */
const PROP_COLOR_MAP = {
  attribute : '#7E4AFF',   // 紫：属性
  level     : '#00B5FF',   // 靛：等级
  action    : '#FF7E29',   // 橙：操作次数
  turn      : '#FF4A6A',   // 粉：回合数
  gold      : '#FFD700'    // 金：金币收益
};

/**
 * 以统一圆角风格绘制一个道具头像
 * @param {CanvasRenderingContext2D} ctx
 * @param {object|string} prop       道具对象或 id
 * @param {number} x,y,size          位置 & 边长
 * @param {boolean} purchased        是否已购买（决定是否加锁）
 * @param {number}  scale            整体缩放 (默认 1)
 */
export function drawPropIcon(
  ctx, prop, x, y,
  size = 48,
  purchased = false,
  scale = 1
) {
  /* —— 1. 容错：如果传的是 id 则查表 —— */
  if (typeof prop === 'string') prop = PropData.getById(prop);
  if (!prop) return;

  const r        = 6 * scale;                                 // 圆角半径
  const bgColor  = PROP_COLOR_MAP[prop.category] || '#666';   // 底色
  const char     = prop.iconChar || '?';                      // 中央符号

  // —— Super Block: 特殊样式渲染 ——
if (prop.id === 'super_block') {
  const r = 6 * scale;
  const centerX = x + size / 2;
  const centerY = y + size / 2;

  // 背景渐变
  const gradient = ctx.createRadialGradient(centerX, centerY, size * 0.2, centerX, centerY, size / 1.5);
  gradient.addColorStop(0, '#FFD700');  // 金色中心
  gradient.addColorStop(1, '#FF4A6A');  // 粉红边缘

  ctx.fillStyle = gradient;
  drawRoundedRect(ctx, x, y, size, size, r, true, false);

  // 发光描边
  ctx.strokeStyle = '#FFF';
  ctx.lineWidth = 4;
  ctx.shadowBlur = 12;
  ctx.shadowColor = '#FFD700';
  drawRoundedRect(ctx, x, y, size, size, r, false, true);
  ctx.shadowBlur = 0;

  // 图标绘制
  ctx.fillStyle   = '#222';
  ctx.font        = `bold ${size * 0.75}px sans-serif`;
  ctx.textAlign   = 'center';
  ctx.textBaseline= 'middle';
  ctx.fillText(char, centerX, centerY);

  return; // 结束超级方块渲染，不走后面默认逻辑
}


  /* —— 2. 底板 —— */
  ctx.fillStyle = bgColor;
  drawRoundedRect(ctx, x, y, size, size, r, true, false);

  /* —— 3. 中央系统图标 / Emoji —— */
  ctx.fillStyle   = '#FFF';
  ctx.font        = `bold ${size * 0.6}px sans-serif`;
  ctx.textAlign   = 'center';
  ctx.textBaseline= 'middle';
  ctx.fillText(char, x + size / 2, y + size / 2 + 1);

  /* —— 4. 未购买时加锁遮罩 —— */
  if (!purchased) {
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(x, y, size, size);

    ctx.fillStyle = '#FFD700';
    ctx.font      = `bold ${size * 0.38}px sans-serif`;
    ctx.fillText('💰', x + size / 2, y + size / 2);
  }
}
