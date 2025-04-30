// theone/js/ui/monster_ui.js
// ------------------------------------------------------------
// 怪物贴图 + 血条 + 名称绘制 + 当前 HP 显示
// ------------------------------------------------------------
const { drawRoundedRect } = require('../utils/canvas_utils.js');
import { getMonster } from '../data/monster_state.js';
import { monsterHitFlashTime } from '../page_game.js'; // ← 只引用

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
  const x = (canvas.width - SPR_W) / 2;
  const y = 128;

  /* ---------- 3. 绘制怪物 + 闪白 ---------- */
  const flash = Date.now() - monsterHitFlashTime < 200;
  ctx.save();
  if (flash) ctx.filter = 'brightness(2)';
  if (img && img.width) ctx.drawImage(img, x, y, SPR_W, SPR_H);
  ctx.restore();

  /* ---------- 4. 血条 ---------- */
  const BAR_W = 280;
  const BAR_H = 12;
  const BAR_OFFSET_Y = 18;
  const barX = (canvas.width - BAR_W) / 2;
  const barY = y + SPR_H + BAR_OFFSET_Y;

  const hpRatio = monster.hp / monster.maxHp;

  // 背景框
  ctx.fillStyle = '#000';
  drawRoundedRect(ctx, barX, barY, BAR_W, BAR_H, 10, true, false);

  // 红色血量条
  ctx.fillStyle = '#ff4444';
  drawRoundedRect(ctx, barX, barY, BAR_W * hpRatio, BAR_H, 6, true, false);

  /* ---------- 5. 当前 HP 文本 ---------- */
  ctx.fillStyle = '#fff';
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(
    `${monster.hp} / ${monster.maxHp}`,
    canvas.width / 2,
    barY - 6  // 血条上方
  );

  /* ---------- 6. 名称 + 等级 ---------- */
  ctx.fillText(
    `Lv.${monster.level}  ${monster.name}`,
    canvas.width / 2,
    barY + BAR_H + 14 // 血条下方显示名称
  );
}
