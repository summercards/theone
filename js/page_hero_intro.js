// js/page_hero_intro.js
const HeroData = require('./data/hero_data.js');
const { HeroState } = require('./data/hero_state.js');
const { drawRoundedRect, drawStyledText } = require('./utils/canvas_utils.js');

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

  const margin = 16;
  const cardW = canvas.width - margin * 2;
  const cardH = 70;
  const gap = 12;
  const startX = margin;
  const startY = 20;

  const startIdx = pageIndex * HEROES_PER_PAGE;
  const endIdx = startIdx + HEROES_PER_PAGE;
  const heroesToShow = HeroData.heroes.slice(startIdx, endIdx).map(h => new HeroState(h.id));

  heroRects = [];
  heroesToShow.forEach((hero, i) => {
    const x = startX;
    const y = startY + i * (cardH + gap);

    const rect = { x, y, width: cardW, height: cardH };
    drawRoundedRect(ctx, x, y, cardW, cardH, 6, true, false);

    const img = globalThis.imageCache[hero.icon];
    if (img) ctx.drawImage(img, x + 8, y + 8, 54, 54);

    drawStyledText(ctx, hero.name, x + 70, y + 18, { font: 'bold 15px Arial', fill: '#FFF' });
    drawStyledText(ctx, hero.role, x + 70, y + 36, { font: '12px Arial', fill: '#AAA' });

    const attrs = hero.attributes;
    const attrText = Object.entries(attrs).map(([k, v]) => `${k}: ${v}`).join('  ');
    drawStyledText(ctx, attrText, x + 70, y + 52, { font: '11px Arial', fill: '#FFD700' });

    drawStyledText(ctx, `Lv.${hero.level}`, x + cardW - 10, y + 10, {
      font: 'bold 11px Arial', fill: '#00FFFF', align: 'right'
    });

    heroRects.push({ rect, hero });
  });

  const btnW = 70, btnH = 26;
  const centerY = canvas.height - btnH - 10;
  btnPrevRect = { x: canvas.width / 2 - btnW - 10, y: centerY, width: btnW, height: btnH };
  btnNextRect = { x: canvas.width / 2 + 10, y: centerY, width: btnW, height: btnH };
  btnBackRect = { x: 16, y: 16, width: 60, height: 26 };

  ctx.fillStyle = '#444';
  drawRoundedRect(ctx, btnPrevRect.x, btnPrevRect.y, btnPrevRect.width, btnPrevRect.height, 5, true, false);
  drawRoundedRect(ctx, btnNextRect.x, btnNextRect.y, btnNextRect.width, btnNextRect.height, 5, true, false);
  drawRoundedRect(ctx, btnBackRect.x, btnBackRect.y, btnBackRect.width, btnBackRect.height, 5, true, false);

  drawStyledText(ctx, '< 上一页', btnPrevRect.x + btnW / 2, btnPrevRect.y + btnH / 2, { font: '13px Arial', fill: '#FFF', align: 'center', baseline: 'middle' });
  drawStyledText(ctx, '下一页 >', btnNextRect.x + btnW / 2, btnNextRect.y + btnH / 2, { font: '13px Arial', fill: '#FFF', align: 'center', baseline: 'middle' });
  drawStyledText(ctx, '返回', btnBackRect.x + btnBackRect.width / 2, btnBackRect.y + btnBackRect.height / 2, { font: '13px Arial', fill: '#FFF', align: 'center', baseline: 'middle' });

  if (popupHero) drawPopup(ctx, canvas, popupHero);
}

function drawPopup(ctx, canvas, hero) {
  const W = canvas.width * 0.85;
  const H = 180;
  const x = (canvas.width - W) / 2;
  const y = (canvas.height - H) / 2;

  ctx.fillStyle = '#222';
  drawRoundedRect(ctx, x, y, W, H, 10, true, false);
  drawStyledText(ctx, hero.name, x + 16, y + 20, { font: 'bold 18px Arial', fill: '#FFD700' });
  drawStyledText(ctx, `职业：${hero.role}    等级：${hero.level}`, x + 16, y + 50, { font: '14px Arial', fill: '#FFF' });
  drawStyledText(ctx, `技能：${hero.skill.name}`, x + 16, y + 80, { font: 'bold 14px Arial', fill: '#66CCFF' });
  drawStyledText(ctx, hero.skill.description, x + 16, y + 105, { font: '13px Arial', fill: '#EEE' });
  drawStyledText(ctx, '点击任意处关闭', x + W / 2, y + H - 24, { font: '12px Arial', fill: '#AAA', align: 'center' });
}

export default {
  init,
  update,
  draw: render,
  destroy,
  touchend
};