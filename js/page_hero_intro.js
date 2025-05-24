// js/page_hero_intro.js
const HeroData = require('./data/hero_data.js');
const { HeroState } = require('./data/hero_state.js');
const { drawRoundedRect, drawStyledText } = require('./utils/canvas_utils.js');
const lockIconImg = wx.createImage();
lockIconImg.src = 'assets/ui/lock.png';
globalThis.imageCache = globalThis.imageCache || {};
lockIconImg.onload = () => {
  globalThis.imageCache['lock'] = lockIconImg;
};
let ctxRef, canvasRef, switchPageFn;
let pageIndex = 0;
let btnPrevRect = null, btnNextRect = null, btnBackRect = null;
let heroRects = [];
let popupHero = null;
const HEROES_PER_PAGE = 7;

function init(ctx, switchPage, canvas) {
  ctxRef = ctx;
  switchPageFn = switchPage;
  canvasRef = canvas;
  render();
}

function update() {}
function destroy() {}
function touchend(e) {
  const touch = e.changedTouches[0];
  const x = touch.clientX;
  const y = touch.clientY;

  if (popupHero) {
    popupHero = null;
    return render();
  }

  if (btnPrevRect && hit(x, y, btnPrevRect) && pageIndex > 0) {
    pageIndex--;
    return render();
  }
  if (btnNextRect && hit(x, y, btnNextRect) && (pageIndex + 1) * HEROES_PER_PAGE < HeroData.heroes.length) {
    pageIndex++;
    return render();
  }
  if (btnBackRect && hit(x, y, btnBackRect)) {
    return switchPageFn('home');
  }
  for (const { rect, hero } of heroRects) {
    if (hit(x, y, rect)) {
      if (hero.locked) {
        wx.showToast({ title: '英雄未解锁', icon: 'none' });
        return;
      }
      popupHero = hero;
      return render();
    }
  }
}

function hit(px, py, rect) {
  return rect && px >= rect.x && px <= rect.x + rect.width && py >= rect.y && py <= rect.y + rect.height;
}

function render() {
  const ctx = ctxRef, canvas = canvasRef;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#2a003f';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const margin = 16;
  const cardW = canvas.width - margin * 2;
  const cardH = 90;
  const gap = 14;
  const startX = margin;
  const startY = 60;

  const startIdx = pageIndex * HEROES_PER_PAGE;
  const endIdx = startIdx + HEROES_PER_PAGE;
  const heroesToShow = HeroData.heroes.slice(startIdx, endIdx).map(h => new HeroState(h.id));

  heroRects = [];
  heroesToShow.forEach((hero, i) => {
    const x = startX;
    const y = startY + i * (cardH + gap);

    const rect = { x, y, width: cardW, height: cardH };
    ctx.fillStyle = '#3e205c';
    drawRoundedRect(ctx, x, y, cardW, cardH, 8, true, false);

    const imgX = x + 12;
    const imgY = y + 18;
    const img = globalThis.imageCache[hero.icon];
    if (img) {
      ctx.drawImage(img, imgX, imgY, 54, 54);
    
      if (hero.locked) {
        ctx.save();
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = '#000';
        drawRoundedRect(ctx, imgX, imgY, 54, 54, 6, true, false);
        ctx.globalAlpha = 1;
    
        const lockImg = globalThis.imageCache?.['lock'];
        if (lockImg && lockImg.complete) {
          ctx.drawImage(lockImg, imgX + 10, imgY + 10, 32, 32);
        } else {
          drawStyledText(ctx, '🔒', imgX + 27, imgY + 27, {
            font: '16px sans-serif',
            fill: '#FFF',
            align: 'center',
            baseline: 'middle'
          });
        }
        ctx.restore();
      }
    }
    

    const textX = imgX + 54 + 10;
    let textY = imgY;

    drawStyledText(ctx, hero.name, textX, textY, {
      font: 'bold 16px IndieFlower', fill: '#f9c74f', align: 'left', baseline: 'top'
    });
    textY += 20;

    drawStyledText(ctx, `职业：${hero.role}`, textX, textY, {
      font: '13px IndieFlower', fill: '#fefae0', align: 'left', baseline: 'top'
    });
    textY += 20;

    const attrs = hero.attributes;
    const attrText = Object.entries(attrs)
      .map(([k, v]) => `${k}: ${v}`)
      .join('  ');

    drawStyledText(ctx, attrText, textX, textY, {
      font: '12px IndieFlower', fill: '#90e0ef', align: 'left', baseline: 'top'
    });

    drawStyledText(ctx, `Lv.${hero.level}`, x + cardW - 12, y + 16, {
      font: 'bold 12px IndieFlower', fill: '#00FFFF', align: 'right', baseline: 'top'
    });

    heroRects.push({ rect, hero });
  });

  const btnW = 90, btnH = 32;
  const centerY = canvas.height - btnH - 50;
  btnPrevRect = { x: canvas.width / 2 - btnW - 10, y: centerY, width: btnW, height: btnH };
  btnNextRect = { x: canvas.width / 2 + 10, y: centerY, width: btnW, height: btnH };
  btnBackRect = { x: 16, y: 16, width: 64, height: 30 };

  ctx.fillStyle = '#5e3a7d';
  drawRoundedRect(ctx, btnPrevRect.x, btnPrevRect.y, btnPrevRect.width, btnPrevRect.height, 6, true, false);
  drawRoundedRect(ctx, btnNextRect.x, btnNextRect.y, btnNextRect.width, btnNextRect.height, 6, true, false);
  drawRoundedRect(ctx, btnBackRect.x, btnBackRect.y, btnBackRect.width, btnBackRect.height, 6, true, false);

  drawStyledText(ctx, '< 上一页', btnPrevRect.x + btnW / 2, btnPrevRect.y + btnH / 2, { font: '14px IndieFlower', fill: '#fff', align: 'center', baseline: 'middle' });
  drawStyledText(ctx, '下一页 >', btnNextRect.x + btnW / 2, btnNextRect.y + btnH / 2, { font: '14px IndieFlower', fill: '#fff', align: 'center', baseline: 'middle' });
  drawStyledText(ctx, '返回', btnBackRect.x + btnBackRect.width / 2, btnBackRect.y + btnBackRect.height / 2, { font: '14px IndieFlower', fill: '#fff', align: 'center', baseline: 'middle' });

  if (popupHero) drawPopup(ctx, canvas, popupHero);
}

function drawPopup(ctx, canvas, hero) {
  const W = canvas.width * 0.85;
  const H = 180;
  const x = (canvas.width - W) / 2;
  const y = (canvas.height - H) / 2;

  ctx.fillStyle = '#222';
  drawRoundedRect(ctx, x, y, W, H, 10, true, false);

  const lineHeight = 24;
  let cy = y + 24;
  drawStyledText(ctx, hero.name, x + 20, cy, { font: 'bold 18px IndieFlower', fill: '#FFD700', align: 'left', baseline: 'top' });
  cy += lineHeight;
  drawStyledText(ctx, `职业：${hero.role}  等级：${hero.level}`, x + 20, cy, { font: '14px IndieFlower', fill: '#FFF', align: 'left', baseline: 'top' });
  cy += lineHeight;
  drawStyledText(ctx, `技能：${hero.skill.name}`, x + 20, cy, { font: 'bold 14px IndieFlower', fill: '#66CCFF', align: 'left', baseline: 'top' });
  cy += lineHeight;
  drawStyledText(ctx, hero.skill.description, x + 20, cy, { font: '13px IndieFlower', fill: '#EEE', align: 'left', baseline: 'top' });

  drawStyledText(ctx, '点击任意处关闭', x + W / 2, y + H - 24, {
    font: '12px IndieFlower', fill: '#AAA', align: 'center', baseline: 'top'
  });
}

export default {
  init,
  update,
  draw: render,
  destroy,
  touchend
};
