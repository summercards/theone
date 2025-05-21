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
  const bgImage = globalThis.imageCache['scene_bg01']; // 对应 key

  const BG_W = 360; // 背景图宽度（可调整）
  const BG_H = 160; // 背景图高度（可调整）
  
  if (bgImage && bgImage.complete && bgImage.width) {
    let gridTop = globalThis.__gridStartY || (canvas.height * 0.8);
    let bgX = (canvas.width - BG_W) / 2;
    let bgY = Math.max(32, gridTop - 340);  // 保持与怪物一致的垂直逻辑
  
    ctx.drawImage(bgImage, bgX, bgY, BG_W, BG_H);
  }

  // 加载图片（如未缓存）
  if (!monsterImageCache[monster.id]) {
    const img = wx.createImage();
    img.src = `assets/monsters/${monster.sprite}`;
    monsterImageCache[monster.id] = img;
  }

  const img = monsterImageCache[monster.id];
  const SPR_W = monster.spriteSize || (monster.isBoss ? 300 : 120);
  const SPR_H = monster.spriteSize || (monster.isBoss ? 120 : 120);
  let x = (canvas.width - SPR_W) / 2;
  let gridTop = globalThis.__gridStartY || (canvas.height * 0.7);  // Fallback
let y = Math.max(32, gridTop - 320);  // 让怪物始终在棋盘上方一定高度

  // 自动避让：优先占位
  const monsterRect = avoidOverlap(
    { x, y, width: SPR_W, height: SPR_H + 50 },
    layoutRects
  );
  x = monsterRect.x;
  y = monsterRect.y;
  layoutRects.push(monsterRect);

  // ✅ 即使图未加载完成也占位；只有加载成功才绘制
  const imgReady = img && img.width && img.complete;
  if (imgReady) {
    const flash = Date.now() - monsterHitFlashTime < 200;
    const scale = globalThis.monsterScale || 1;
  
    const cx = x + SPR_W / 2;
    const cy = y + SPR_H / 2;
  
    ctx.save();
    ctx.translate(cx, cy);         // 移动到怪物中心
    ctx.scale(scale, scale);       // 弹性缩放
    ctx.translate(-SPR_W / 2, -SPR_H / 2); // 再偏移回图像原点
  
    if (flash) {
      ctx.filter = 'brightness(2)';
    } else {
      ctx.filter = 'none';
    }
  
    ctx.drawImage(img, 0, 0, SPR_W, SPR_H);
    ctx.restore();
  }

  // 绘制血条
  const BAR_W = 280;
  const BAR_H = 12;
  const BAR_OFFSET_Y = 18;
  const barX = (canvas.width - BAR_W) / 2;
  const barY = y + SPR_H + BAR_OFFSET_Y;

  const hpRatio = monster.hp / monster.maxHp;
  ctx.fillStyle = '#000';
  drawRoundedRect(ctx, barX, barY, BAR_W, BAR_H, 10, true, false);
  ctx.fillStyle = '#ff4444';
  drawRoundedRect(ctx, barX, barY, BAR_W * hpRatio, BAR_H, 6, true, false);

// 文字信息
ctx.fillStyle = '#fff';
ctx.font = 'bold 14px sans-serif';
ctx.textAlign = 'center';

// 血量显示（仍在血条中心）
ctx.lineWidth = 2;
ctx.strokeStyle = '#000';
ctx.strokeText(`${monster.hp} / ${monster.maxHp}`, canvas.width / 2, barY + 7);
ctx.fillStyle = '#fff';
ctx.fillText(`${monster.hp} / ${monster.maxHp}`, canvas.width / 2, barY + 7);

// 名称 + 等级（移到怪物上方）
const nameY = y - 16; // 位置：怪物图像正上方（可调）
ctx.font = 'bold 18px sans-serif';
ctx.lineWidth = 3;
ctx.strokeStyle = '#000';
ctx.strokeText(`Lv.${monster.level}  ${monster.name}`, canvas.width / 2, nameY);
ctx.fillStyle = '#fff';
ctx.fillText(`Lv.${monster.level}  ${monster.name}`, canvas.width / 2, nameY);

  
}
