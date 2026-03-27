// theone/js/ui/monster_ui.js
// ------------------------------------------------------------
// 怪物贴图 + 血条 + 名称绘制 + 当前 HP 显示（美术风格加强版）
// ------------------------------------------------------------

const { drawRoundedRect } = require('../utils/canvas_utils.js');
import { getMonster } from '../data/monster_state.js';
import { monsterHitFlashTime } from '../utils/game_shared.js';
const HeroData = require('../data/hero_data.js');


const monsterImageCache = {};
let smoothMonsterScaleX = 1;
let smoothMonsterScaleY = 1;
let lastMonsterScaleId = null;

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
  const mapKey = globalThis.currentMap || wx.getStorageSync('currentMap') || 'forest';
  const BG_BY_MAP = {
    forest:  'scene_bg01',
    plains:  'scene_bg02',
    desert:  'scene_bg03',
    volcano: 'scene_bg04'
  };
  const bgKey = BG_BY_MAP[mapKey] || 'scene_bg01';
  const bgImage = globalThis.imageCache[bgKey] || globalThis.imageCache['scene_bg01'];
  
  const BG_W = 460;
  const BG_H = 380;
  let gridTop = globalThis.__gridStartY || (canvas.height * 0.8);

  if (bgImage && bgImage.complete && bgImage.width) {
    let bgX = (canvas.width - BG_W) / 2;
    let bgY = Math.max(32, gridTop - 380);
    ctx.drawImage(bgImage, bgX, bgY, BG_W, BG_H);
  }

  if (!monsterImageCache[monster.id]) {
    const img = wx.createImage();
    const sp = monster.sprite || 'icons/hero1.png';
    const resolved =
      sp.startsWith('../') ? 'assets/' + sp.slice(3) :
      sp.startsWith('icons/') ? 'assets/' + sp :
      'assets/icons/' + sp;
    img.src = resolved;
    monsterImageCache[monster.id] = img;
  }
  
  const img = monsterImageCache[monster.id];
  const BASE_SIZE = monster.spriteSize || 120;
  const SPR_W = BASE_SIZE;
  const SPR_H = BASE_SIZE;
  let x = (canvas.width - SPR_W) / 2;
  let y = Math.max(32 + 50, gridTop - 380 + 100);

  const monsterRect = avoidOverlap(
    { x, y, width: SPR_W, height: SPR_H + 50 },
    layoutRects
  );
  x = monsterRect.x;
  y = monsterRect.y;
  layoutRects.push(monsterRect);

  const imgReady = img && img.width && img.complete;
  const hitFlashTime = Math.max(monsterHitFlashTime || 0, globalThis.monsterHitFlashTime || 0);
  const flash = Date.now() - hitFlashTime < 180;

  if (imgReady) {
    const baseScale = monster.spriteScale ?? 1.0;
    const targetScaleX = (globalThis.monsterScaleX ?? 1.0) * baseScale;
    const targetScaleY = (globalThis.monsterScaleY ?? 1.0) * baseScale;
    if (lastMonsterScaleId !== monster.id) {
      smoothMonsterScaleX = targetScaleX;
      smoothMonsterScaleY = targetScaleY;
      lastMonsterScaleId = monster.id;
    }
    smoothMonsterScaleX += (targetScaleX - smoothMonsterScaleX) * 0.35;
    smoothMonsterScaleY += (targetScaleY - smoothMonsterScaleY) * 0.35;
  
    const cx = x + SPR_W / 2;
    const cy = y + SPR_H / 2;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(smoothMonsterScaleX, smoothMonsterScaleY);
    ctx.translate(-SPR_W / 2, -SPR_H / 2);
    ctx.drawImage(img, 0, 0, SPR_W, SPR_H);
    if (flash) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.22;
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, SPR_W, SPR_H);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.restore();
  }

  try {
    globalThis.monsterSpritePos = {
      x: x + SPR_W / 2,
      y: y + SPR_H / 2,
      width: SPR_W,
      height: SPR_H
    };
  } catch (e) {
    globalThis.monsterSpritePos = globalThis.monsterSpritePos || null;
  }

  const BAR_W = 280;
  const BAR_H = 22;
  const BAR_OFFSET_Y = 18;
  const barX = (canvas.width - BAR_W) / 2;
  const barY = y + SPR_H + BAR_OFFSET_Y;

  globalThis.monsterHpDraw = globalThis.monsterHpDraw ?? monster.hp;
  globalThis.monsterHpDraw += (monster.hp - globalThis.monsterHpDraw) * 0.2;
  const hpDraw = Math.round(globalThis.monsterHpDraw);

  const rawRatio = hpDraw / monster.maxHp;
  const hpRatio  = Number.isFinite(rawRatio) ? Math.max(0, Math.min(1, rawRatio)) : 0;

  ctx.fillStyle = '#1e1121';
  drawRoundedRect(ctx, barX, barY, BAR_W, BAR_H, 8, true, false);

  const grad = ctx.createLinearGradient(barX, barY, barX + BAR_W * hpRatio, barY);
  grad.addColorStop(0, '#f2093b');
  grad.addColorStop(1, '#f2091f');
  ctx.fillStyle = grad;
  drawRoundedRect(ctx, barX, barY, BAR_W * hpRatio, BAR_H, 6, true, false);
  ctx.strokeStyle = 'rgba(0,0,0,0.4)';
  ctx.lineWidth = 1.2;
  drawRoundedRect(ctx, barX, barY, BAR_W * hpRatio, BAR_H, 6, false, true);

  if (flash) {
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    drawRoundedRect(ctx, barX - 1, barY - 1, BAR_W + 2, BAR_H + 2, 8, false, true);
  }

  if (monster.isBoss) {
    const t = Date.now() / 1000;
    const pulse = Math.sin(t * 6) * 0.5 + 0.5;
    const alpha = 0.5 + 0.3 * pulse;
    ctx.strokeStyle = 'rgba(180, 0, 0, ' + alpha.toFixed(2) + ')';
    ctx.lineWidth = 3;
    ctx.shadowColor = 'rgba(255, 0, 0, ' + alpha.toFixed(2) + ')';
    ctx.shadowBlur = 10 + 6 * pulse;
    drawRoundedRect(ctx, barX - 2, barY - 2, BAR_W + 4, BAR_H + 4, 10, false, true);
    ctx.shadowBlur = 0;
  }

  if (hpRatio < 0.25) {
    const t = Date.now() / 1000;
    const pulse = Math.sin(t * 10) * 0.5 + 0.5;
    const alpha = 0.4 + 0.4 * pulse;
    ctx.strokeStyle = 'rgba(255, 60, 113, ' + alpha.toFixed(2) + ')';
    ctx.lineWidth = 3;
    drawRoundedRect(ctx, barX - 3, barY - 3, BAR_W + 6, BAR_H + 6, 10, false, true);
  }

  ctx.fillStyle = '#ffe7ef';
  ctx.font = 'bold 14px IndieFlower, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(hpDraw + ' / ' + monster.maxHp, canvas.width / 2, barY + 12);

  try {
    const attackMax  = globalThis.enemyAttackThreshold || 5;
    const attackProg = globalThis.enemyAttackProgress || 0;
    const ratio      = Math.max(0, Math.min(attackProg / attackMax, 1));
    const atkBarH    = 8;
    const atkBarY    = barY + BAR_H + 6;
    ctx.fillStyle   = '#331B33';
    drawRoundedRect(ctx, barX, atkBarY, BAR_W, atkBarH, 4, true, false);
    ctx.fillStyle   = '#FFAA33';
    drawRoundedRect(ctx, barX, atkBarY, BAR_W * ratio, atkBarH, 4, true, false);
    ctx.strokeStyle = '#664466';
    ctx.lineWidth   = 1;
    drawRoundedRect(ctx, barX, atkBarY, BAR_W, atkBarH, 4, false, true);
  } catch (e) {}

  const nameY = y - 35;
  ctx.font = 'bold 18px IndieFlower, sans-serif';
  ctx.lineWidth = 2;
  const rarityColors = {
    white: '#FFFFFF', green: '#00FF00', blue: '#00BFFF',
    purple: '#C71585', yellow: '#FFC107', gold: '#FFD700'
  };
  const nameColor = monster.rarityColor || rarityColors[monster.rarityTier] || '#FFFFFF';
  ctx.strokeStyle = '#000';
  ctx.strokeText('Lv.' + monster.level + '  ' + monster.name, canvas.width / 2, nameY);
  ctx.fillStyle = nameColor;
  ctx.fillText('Lv.' + monster.level + '  ' + monster.name, canvas.width / 2, nameY);
}

