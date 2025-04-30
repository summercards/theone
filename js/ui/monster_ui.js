const { drawRoundedRect } = require('../utils/canvas_utils.js');
// ui/monster_ui.js —— 怪物精灵 + 血条绘制
import { getMonster } from '../data/monster_state.js';
import { monsterHitFlashTime } from '../page_game.js';  // ← 只需引用，不要再定义

const monsterImageCache = {};

/**
 * 绘制当前怪物（含受击闪白）
 * @param {CanvasRenderingContext2D} ctx
 * @param {HTMLCanvasElement}        canvas
 */
export function drawMonsterSprite(ctx, canvas) {
  const monster = getMonster();
  if (!monster || !canvas) return;

  /* ---------- 1. 图片缓存 ---------- */
  if (!monsterImageCache[monster.id]) {
    const img = wx.createImage();
    img.src = `assets/monsters/${monster.sprite}`;
    monsterImageCache[monster.id] = img;
  }
  const img = monsterImageCache[monster.id];

  /* ---------- 2. 坐标尺寸 ---------- */
  const SPR_W = 120;
  const SPR_H = 120;
  const x = (canvas.width  - SPR_W) / 2;
  const y = 120;

  /* ---------- 3. 绘制怪物 + 闪白 ---------- */
  const flash = Date.now() - monsterHitFlashTime < 200;   // 0.2 s
  ctx.save();
  if (flash) ctx.filter = 'brightness(2)';
  if (img && img.width) ctx.drawImage(img, x, y, SPR_W, SPR_H);
  ctx.restore();

  /* ---------- 4. 血条 ---------- */
  const BAR_W = 140;
  const BAR_H = 12;
  const hpRatio = monster.hp / monster.maxHp;

  ctx.fillStyle = '#000';
  drawRoundedRect(ctx, x, y + SPR_H + 6, BAR_W, BAR_H, 6, true, false);

  ctx.fillStyle = '#ff4444';
  drawRoundedRect(ctx, x, y + SPR_H + 6, BAR_W * hpRatio, BAR_H, 6, true, false);

  /* ---------- 5. 名称 + 等级 ---------- */
  ctx.fillStyle = '#fff';
  ctx.font = '14px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`Lv.${monster.level}  ${monster.name}`,
               x + BAR_W / 2,
               y + SPR_H + BAR_H + 24);
}
