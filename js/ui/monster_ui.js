// ui/monster_ui.js  ── 负责怪物 Sprite & HP 条渲染
import { getMonster } from '../data/monster_state.js';

const monsterImageCache = {};

/**
 * 在给定 2d-context 里绘制当前怪物。
 * 约定：canvas 顶部居中绘制，UI/逻辑层不关心尺寸。
 * @param {CanvasRenderingContext2D} ctx
 * @param {HTMLCanvasElement} canvas
 */
export function drawMonsterSprite(ctx, canvas) {
  const monster = getMonster();
  if (!monster || !canvas) return;

  // ── 1. 处理图片缓存
  if (!monsterImageCache[monster.id]) {
    const img = wx.createImage();
    img.src = `assets/monsters/${monster.sprite}`;
    monsterImageCache[monster.id] = img;
  }
  const img = monsterImageCache[monster.id];

  // ── 2. 计算坐标
  const SPR_W = 120;
  const SPR_H = 120;
  const x = (canvas.width - SPR_W) / 2;
  const y = 120;

  // ── 3. 绘制怪物本体
  if (img && img.width) {
    ctx.drawImage(img, x, y, SPR_W, SPR_H);
  }

  // ── 4. 绘制血条
  const BAR_W = 140;
  const BAR_H = 12;
  const hpRatio = monster.hp / monster.maxHp;

  ctx.fillStyle = '#000';
  ctx.fillRect(x, y + SPR_H + 6, BAR_W, BAR_H);

  ctx.fillStyle = '#ff4444';
  ctx.fillRect(x, y + SPR_H + 6, BAR_W * hpRatio, BAR_H);

  // ── 5. 怪物名称 / 等级
  ctx.fillStyle = '#fff';
  ctx.font = '14px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(`Lv.${monster.level}  ${monster.name}`,
               x + BAR_W / 2,
               y + SPR_H + BAR_H + 24);
}