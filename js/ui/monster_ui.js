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
  const bgImage = globalThis.imageCache['scene_bg01'];

  const BG_W = 360;
  const BG_H = 160;

  if (bgImage && bgImage.complete && bgImage.width) {
    let gridTop = globalThis.__gridStartY || (canvas.height * 0.8);
    let bgX = (canvas.width - BG_W) / 2;
    let bgY = Math.max(32, gridTop - 340);

    ctx.drawImage(bgImage, bgX, bgY, BG_W, BG_H);
  }

  if (!monsterImageCache[monster.id]) {
    const img = wx.createImage();
    img.src = `assets/monsters/${monster.sprite}`;
    monsterImageCache[monster.id] = img;
  }

  const img = monsterImageCache[monster.id];
  const SPR_W = monster.spriteSize || (monster.isBoss ? 300 : 120);
  const SPR_H = monster.spriteSize || (monster.isBoss ? 120 : 120);
  let x = (canvas.width - SPR_W) / 2;
  let gridTop = globalThis.__gridStartY || (canvas.height * 0.7);
  let y = Math.max(32, gridTop - 320);

  const monsterRect = avoidOverlap(
    { x, y, width: SPR_W, height: SPR_H + 50 },
    layoutRects
  );
  x = monsterRect.x;
  y = monsterRect.y;
  layoutRects.push(monsterRect);

  const imgReady = img && img.width && img.complete;
  if (imgReady) {
    const flash = Date.now() - monsterHitFlashTime < 200;
    const scale = globalThis.monsterScale || 1;

    const cx = x + SPR_W / 2;
    const cy = y + SPR_H / 2;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);
    ctx.translate(-SPR_W / 2, -SPR_H / 2);
    ctx.filter = flash ? 'brightness(2)' : 'none';
    ctx.drawImage(img, 0, 0, SPR_W, SPR_H);
    ctx.restore();
  }

  // 🌟 血条绘制优化
  const BAR_W = 280;
  const BAR_H = 12;
  const BAR_OFFSET_Y = 18;
  const barX = (canvas.width - BAR_W) / 2;
  const barY = y + SPR_H + BAR_OFFSET_Y;

  // 插值血量（平滑过渡）
  globalThis.monsterHpDraw = globalThis.monsterHpDraw ?? monster.hp;
  const speed = 0.2;
  globalThis.monsterHpDraw += (monster.hp - globalThis.monsterHpDraw) * speed;
  const hpDraw = Math.round(globalThis.monsterHpDraw);
  const hpRatio = Math.max(0, Math.min(1, hpDraw / monster.maxHp));

  // 血条背景
  ctx.fillStyle = '#000';
  drawRoundedRect(ctx, barX, barY, BAR_W, BAR_H, 10, true, false);

  // 血条渐变
  const grad = ctx.createLinearGradient(barX, barY, barX + BAR_W * hpRatio, barY);
  grad.addColorStop(0, '#FF6666');
  grad.addColorStop(0.5, '#FF2222');
  grad.addColorStop(1, '#CC0000');
  ctx.fillStyle = grad;
  drawRoundedRect(ctx, barX, barY, BAR_W * hpRatio, BAR_H, 6, true, false);

  // 高光
  const highlightGrad = ctx.createLinearGradient(barX, barY, barX, barY + BAR_H);
  highlightGrad.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
  highlightGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = highlightGrad;
  ctx.fillRect(barX, barY, BAR_W * hpRatio, BAR_H / 2);

  // 受击闪光描边
  const flash = Date.now() - monsterHitFlashTime < 200;
  if (flash) {
    ctx.strokeStyle = '#FFF';
    ctx.lineWidth = 2;
    drawRoundedRect(ctx, barX - 1, barY - 1, BAR_W + 2, BAR_H + 2, 10, false, true);
  }

  // Boss 边框
  if (monster.isBoss) {
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 3;
    drawRoundedRect(ctx, barX - 2, barY - 2, BAR_W + 4, BAR_H + 4, 8, false, true);
  }

  // 临界闪烁
  const isCritical = hpRatio < 0.25;
  const shouldFlash = isCritical && (Date.now() % 400 < 200);
  if (shouldFlash) {
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 2;
    ctx.strokeRect(barX - 3, barY - 3, BAR_W + 6, BAR_H + 6);
  }

  // 数值文字
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 14px sans-serif';
  ctx.textAlign = 'center';
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#000';
  ctx.strokeText(`${hpDraw} / ${monster.maxHp}`, canvas.width / 2, barY + 7);
  ctx.fillStyle = '#fff';
  ctx.fillText(`${hpDraw} / ${monster.maxHp}`, canvas.width / 2, barY + 7);

  // 名称
  const nameY = y - 16;
  ctx.font = 'bold 18px sans-serif';
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#000';
  ctx.strokeText(`Lv.${monster.level}  ${monster.name}`, canvas.width / 2, nameY);
  ctx.fillStyle = '#fff';
  ctx.fillText(`Lv.${monster.level}  ${monster.name}`, canvas.width / 2, nameY);
}
