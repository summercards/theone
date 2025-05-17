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
  
    const BG_W = 360, BG_H = 160;
    const gridTop = globalThis.__gridStartY || canvas.height * 0.8;
    const bgX = (canvas.width - BG_W) / 2;
    const bgY = Math.max(32, gridTop - 340);
    if (bgImage?.complete && bgImage.width) {
      ctx.drawImage(bgImage, bgX, bgY, BG_W, BG_H);
    }
  
    // 怪物位置与大小
    const SPR_W = 300, SPR_H = 120;
    let x = (canvas.width - SPR_W) / 2;
    let y = Math.max(32, gridTop - 320);
    const monsterRect = avoidOverlap({ x, y, width: SPR_W, height: SPR_H + 50 }, layoutRects);
    x = monsterRect.x;
    y = monsterRect.y;
    layoutRects.push(monsterRect);
  
    // 怪物头像绘制
    const img = monsterImageCache[monster.id] ||= (() => {
      const img = wx.createImage();
      img.src = `assets/monsters/${monster.sprite}`;
      return img;
    })();
  
    if (img?.complete && img.width) {
      const flash = Date.now() - monsterHitFlashTime < 200;
      const scale = globalThis.monsterScale || 1;
      const cx = x + SPR_W / 2;
      const cy = y + SPR_H / 2;
  
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(scale, scale);
      ctx.translate(-SPR_W / 2, -SPR_H / 2);
      if (flash) ctx.filter = 'brightness(2)';
      ctx.drawImage(img, 0, 0, SPR_W, SPR_H);
      ctx.restore();
    }
  
    // ====== 血条 ======
    const BAR_W = 280, BAR_H = 12, BAR_OFFSET_Y = 18;
    const barX = (canvas.width - BAR_W) / 2;
    const barY = y + SPR_H + BAR_OFFSET_Y;
  
    const hpRatio = monster.hp / monster.maxHp;
    const smoothRatio = globalThis.monsterHpSmoothRatio ?? hpRatio;
    const delta = hpRatio - smoothRatio;
    globalThis.monsterHpSmoothRatio = smoothRatio + delta * 0.2;
  
    const fillWidth = Math.max(2, BAR_W * globalThis.monsterHpSmoothRatio);
  
    // 背景条
    ctx.fillStyle = '#222';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    drawRoundedRect(ctx, barX, barY, BAR_W, BAR_H, 10, true, true);
  
    // 前景条
    ctx.fillStyle = '#FF5555';
    drawRoundedRect(ctx, barX, barY, fillWidth, BAR_H, 10, true, false);
  
    // 血量文字
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#000';
    ctx.strokeText(`${monster.hp} / ${monster.maxHp}`, canvas.width / 2, barY + 7);
    ctx.fillText(`${monster.hp} / ${monster.maxHp}`, canvas.width / 2, barY + 7);
  
    // 名称 + 等级
    const nameY = y - 16;
    ctx.font = 'bold 18px sans-serif';
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#000';
    ctx.strokeText(`Lv.${monster.level}  ${monster.name}`, canvas.width / 2, nameY);
    ctx.fillStyle = '#fff';
    ctx.fillText(`Lv.${monster.level}  ${monster.name}`, canvas.width / 2, nameY);
  }
  
