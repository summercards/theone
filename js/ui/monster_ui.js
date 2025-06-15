// theone/js/ui/monster_ui.js
// ------------------------------------------------------------
// 怪物贴图 + 血条 + 名称绘制 + 当前 HP 显示（美术风格加强版）
// ------------------------------------------------------------

const { drawRoundedRect } = require('../utils/canvas_utils.js');
import { getMonster } from '../data/monster_state.js';
import { monsterHitFlashTime } from '../utils/game_shared.js';


const monsterImageCache = {};

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

export function drawMonsterSprite(ctx, canvas) {
  const monster = getMonster();
  if (!monster || !canvas) return;

  const layoutRects = globalThis.layoutRects || [];
  const level = monster.level || 1; // ✅ 直接用怪物数据中带的关卡号
  let bgIndex = Math.floor((level - 1) / 10) + 1;
  let bgKey = `scene_bg${String(bgIndex).padStart(2, '0')}`;
  const bgImage = globalThis.imageCache[bgKey] || globalThis.imageCache['scene_bg01'];

  const BG_W = 460;
  const BG_H = 380;

  if (bgImage && bgImage.complete && bgImage.width) {
    let gridTop = globalThis.__gridStartY || (canvas.height * 0.8);
    let bgX = (canvas.width - BG_W) / 2;
    let bgY = Math.max(32, gridTop - 380);
    ctx.drawImage(bgImage, bgX, bgY, BG_W, BG_H);
  }

  if (!monsterImageCache[monster.id]) {
    const img = wx.createImage();
    img.src = `assets/monsters/${monster.sprite}`;
    monsterImageCache[monster.id] = img;
  }

  const img = monsterImageCache[monster.id];
  const BASE_SIZE = monster.spriteSize || 120;         // 所有怪物默认 120
  const scale = monster.spriteScale || 1.0;            // 所有怪物使用缩放
  const SPR_W = BASE_SIZE;
  const SPR_H = BASE_SIZE;
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
    const scale = monster.spriteScale || 1;  // ✅ 改用每个怪物自己的缩放比例
    const cx = x + SPR_W / 2;
    const cy = y + SPR_H / 2;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(scale, scale); // ✅ 原来这里是 globalThis.monsterScale，现在用怪物自身的 spriteScale
    ctx.translate(-SPR_W / 2, -SPR_H / 2);
    ctx.filter = flash ? 'brightness(2)' : 'none';
    ctx.drawImage(img, 0, 0, SPR_W, SPR_H);
    ctx.restore();
  }

  const BAR_W = 280;
  const BAR_H = 12;
  const BAR_OFFSET_Y = 18;
  const barX = (canvas.width - BAR_W) / 2;
  const barY = y + SPR_H + BAR_OFFSET_Y;

  globalThis.monsterHpDraw = globalThis.monsterHpDraw ?? monster.hp;
  const speed = 0.2;
  globalThis.monsterHpDraw += (monster.hp - globalThis.monsterHpDraw) * speed;
  const hpDraw = Math.round(globalThis.monsterHpDraw);

  /* ---------- 新增防御逻辑 ---------- */
  const rawRatio = hpDraw / monster.maxHp;
  const hpRatio  = Number.isFinite(rawRatio)
                 ? Math.max(0, Math.min(1, rawRatio))
                 : 0;        // 出现 NaN / Infinity 时退回 0
  /* ---------------------------------- */

  ctx.fillStyle = '#1e1121';
  drawRoundedRect(ctx, barX, barY, BAR_W, BAR_H, 8, true, false);

  const grad = ctx.createLinearGradient(barX, barY, barX + BAR_W * hpRatio, barY);
  grad.addColorStop(0, '#702243');
  grad.addColorStop(0.5, '#9c2d55');
  grad.addColorStop(1, '#ff3c71');
  ctx.fillStyle = grad;
  drawRoundedRect(ctx, barX, barY, BAR_W * hpRatio, BAR_H, 6, true, false);

  const flash = Date.now() - monsterHitFlashTime < 200;
  if (flash) {
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    drawRoundedRect(ctx, barX - 1, barY - 1, BAR_W + 2, BAR_H + 2, 8, false, true);
  }

  if (monster.isBoss) {
    const t = Date.now() / 1000;
    const pulse = Math.sin(t * 6) * 0.5 + 0.5;
    const alpha = 0.5 + 0.3 * pulse;

    ctx.strokeStyle = `rgba(180, 0, 0, ${alpha.toFixed(2)})`;
    ctx.lineWidth = 3;
    ctx.shadowColor = `rgba(255, 0, 0, ${alpha.toFixed(2)})`;
    ctx.shadowBlur = 10 + 6 * pulse;

    drawRoundedRect(ctx, barX - 2, barY - 2, BAR_W + 4, BAR_H + 4, 10, false, true);

    ctx.shadowBlur = 0;
  }

  const isCritical = hpRatio < 0.25;
  if (isCritical) {
    const t = Date.now() / 1000;
    const pulse = Math.sin(t * 10) * 0.5 + 0.5;
    const alpha = 0.4 + 0.4 * pulse;
    ctx.strokeStyle = `rgba(255, 60, 113, ${alpha.toFixed(2)})`;
    ctx.lineWidth = 3;
    drawRoundedRect(ctx, barX - 3, barY - 3, BAR_W + 6, BAR_H + 6, 10, false, true);
  }

  ctx.fillStyle = '#ffe7ef';
  ctx.font = 'bold 14px IndieFlower, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`${hpDraw} / ${monster.maxHp}`, canvas.width / 2, barY + 8);

  const nameY = y - 16;
  ctx.font = 'bold 18px IndieFlower, sans-serif';
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#000';
  ctx.strokeText(`Lv.${monster.level}  ${monster.name}`, canvas.width / 2, nameY);
  ctx.fillStyle = '#fff';
  ctx.fillText(`Lv.${monster.level}  ${monster.name}`, canvas.width / 2, nameY);
}
