// theone/js/ui/monster_ui.js
// ------------------------------------------------------------
// 怪物贴图 + 血条 + 名称绘制 + 当前 HP 显示
// ------------------------------------------------------------

const { drawRoundedRect } = require('../utils/canvas_utils.js');
import { getMonster } from '../data/monster_state.js';
import { monsterHitFlashTime } from '../page_game.js'; // ← 引用受击时间

const monsterImageCache = {};

/** 避让工具 */
function avoidOverlap(rect, others, minGap = 12, maxTries = 5) {
  let attempt = 0;
  while (attempt < maxTries) {
    let collision = false;
    for (const o of others) {
      const overlapX = rect.x < o.x + o.width + minGap &&
                       rect.x + rect.width + minGap > o.x;
      const overlapY = rect.y < o.y + o.height + minGap &&
                       rect.y + rect.height + minGap > o.y;
      if (overlapX && overlapY) {
        rect.y = o.y + o.height + minGap;
        collision = true;
        break;
      }
    }
    if (!collision) break;
    attempt++;
  }
  return rect;
}

/** 主绘制函数 */
export function drawMonsterSprite(ctx, canvas) {
  const monster = getMonster();
  if (!monster || !canvas) return;

  const layoutRects = globalThis.layoutRects || [];

  // 加载怪物贴图
  if (!monsterImageCache[monster.id]) {
    const img = wx.createImage();
    img.src = `assets/monsters/${monster.sprite}`;
    monsterImageCache[monster.id] = img;
  }
  const img = monsterImageCache[monster.id];

  // 怪物贴图位置
  const SPR_W = 120;
  const SPR_H = 120;
  let x = (canvas.width - SPR_W) / 2;
  let y = 128;

  const monsterRect = avoidOverlap(
    { x, y, width: SPR_W, height: SPR_H + 50 },
    layoutRects
  );
  x = monsterRect.x;
  y = monsterRect.y;
  layoutRects.push(monsterRect);

  // 绘制贴图（含受击闪白）
  const flash = Date.now() - monsterHitFlashTime < 200;
  ctx.save();
  if (flash) ctx.filter = 'brightness(2)';
  if (img && img.width) ctx.drawImage(img, x, y, SPR_W, SPR_H);
  ctx.restore();

  // 血条避让
  const BAR_W = 280;
  const BAR_H = 12;
  const BAR_OFFSET_Y = 18;

  let barRect = {
    x: (canvas.width - BAR_W) / 2,
    y: y + SPR_H + BAR_OFFSET_Y,
    width: BAR_W,
    height: BAR_H + 22
  };

  barRect = avoidOverlap(barRect, layoutRects, 12);
  layoutRects.push(barRect);

  const barX = barRect.x;
  const barY = barRect.y;
  const hpRatio = monster.hp / monster.maxHp;

  // 血条绘制
  ctx.fillStyle = '#000';
  drawRoundedRect(ctx, barX, barY, BAR_W, BAR_H, 10, true, false);

  ctx.fillStyle = '#ff4444';
  drawRoundedRect(ctx, barX, barY, BAR_W * hpRatio, BAR_H, 6, true, false);

  // 血量文字
  ctx.fillStyle = '#fff';
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`${monster.hp} / ${monster.maxHp}`, canvas.width / 2, barY + 7);
  ctx.fillText(`Lv.${monster.level}  ${monster.name}`, canvas.width / 2, barY + BAR_H + 8);

  // ✅ 写回全局，避免棋盘遮挡
  globalThis.layoutRects = layoutRects;
}
