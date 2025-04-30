const { drawRoundedRect } = require('./utils/canvas_utils.js');

function drawText(ctx, text, x, y,
  font = '16px IndieFlower, sans-serif', color = '#FFF',
  hAlign = 'left', vAlign = 'alphabetic') {
  ctx.fillStyle = color;
  ctx.font = font;
  ctx.textAlign = hAlign;
  ctx.textBaseline = vAlign;
  ctx.fillText(text, x, y);
}

const HeroState = require('./data/hero_state.js');
const HeroData = require('./data/hero_data.js');

const heroImageCache = {};
let selectedHeroes = [null, null, null, null, null];

let slotRects = [];
let iconRects = [];
let btnPrevRect = null;
let btnNextRect = null;

const HERO_PER_PAGE = 10;
const TOTAL_PAGES = 3;
let pageIndex = 0;

let ctxRef, canvasRef, switchPageFn;

function initHeroSelectPage(ctx, switchPage, canvas) {
  ctxRef = ctx;
  canvasRef = canvas;
  switchPageFn = switchPage;
  canvas.addEventListener('touchstart', onTouch);
  render();
}

function onTouch(e) {
  const { clientX: x, clientY: y } = e.touches[0];

  for (let i = 0; i < slotRects.length; i++) {
    if (hit(x, y, slotRects[i])) {
      selectedHeroes[i] = null;
      HeroState.setSelectedHeroes(selectedHeroes);
      return render();
    }
  }

  if (hit(x, y, btnPrevRect) && pageIndex > 0) {
    pageIndex--;
    return render();
  }
  if (hit(x, y, btnNextRect) && pageIndex < TOTAL_PAGES - 1) {
    pageIndex++;
    return render();
  }

  for (const { rect, hero } of iconRects) {
    if (hero && hit(x, y, rect)) {
      if (selectedHeroes.some(h => h && h.id === hero.id)) return;
      const empty = selectedHeroes.findIndex(h => h === null);
      if (empty !== -1) {
        selectedHeroes[empty] = hero;
        HeroState.setSelectedHeroes(selectedHeroes);
        return render();
      }
    }
  }

  const confirmRect = {
    x: canvasRef.width / 2 - 80,
    y: canvasRef.height - 80,
    width: 160,
    height: 50
  };
  if (hit(x, y, confirmRect)) {
    wx.setStorageSync('selectedHeroes', selectedHeroes);
    switchPageFn('game');
  }
}

function hit(px, py, r) {
  return r && px >= r.x && px <= r.x + r.width &&
         py >= r.y && py <= r.y + r.height;
}

function render() {
  const ctx = ctxRef, canvas = canvasRef;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#2E003E';
  drawRoundedRect(ctx, 0, 0, canvas.width, canvas.height, 8, true, false);

  const PAD_X = 20;
  const ICON = 60;
  const GAP = 15;
  const topOffset = 80;

  drawText(ctx, '出战英雄（点击移除）',
    PAD_X, 280 + topOffset, '16px IndieFlower', '#DCC6F0', 'left', 'top');

  slotRects.length = 0;
  for (let i = 0; i < 5; i++) {
    const sx = PAD_X + i * (ICON + GAP);
    const sy = 300 + topOffset;
    ctx.strokeStyle = '#A64AC9';
    ctx.lineWidth = 3;
    drawRoundedRect(ctx, sx, sy, ICON, ICON, 8, false, true);
    slotRects[i] = { x: sx, y: sy, width: ICON, height: ICON };
    if (selectedHeroes[i]) drawIcon(ctx, selectedHeroes[i], sx, sy);
  }

  drawText(ctx, '英雄池（点击添加）',
    PAD_X, 420 + topOffset - 20, '16px IndieFlower', '#DCC6F0', 'left', 'top');

  const startIdx = pageIndex * HERO_PER_PAGE;
  const pageHeroes = HeroData.heroes.slice(startIdx, startIdx + HERO_PER_PAGE);
  while (pageHeroes.length < HERO_PER_PAGE) pageHeroes.push(null);

  iconRects.length = 0;
  pageHeroes.forEach((hero, i) => {
    const row = Math.floor(i / 5);
    const col = i % 5;
    const ix = PAD_X + col * (ICON + GAP);
    const iy = 420 + topOffset + row * (ICON + 30);
    ctx.strokeStyle = '#C084FC';
    ctx.lineWidth = 2;
    drawRoundedRect(ctx, ix, iy, ICON, ICON, 8, false, true);

    if (hero) drawIcon(ctx, hero, ix, iy);
    else {
      ctx.fillStyle = '#4B0073';
      drawRoundedRect(ctx, ix + 4, iy + 4, ICON - 8, ICON - 8, 8, true, false);
      drawText(ctx, '?', ix + ICON / 2, iy + ICON / 2,
        '20px IndieFlower', '#FFF', 'center', 'middle');
    }
    iconRects.push({ rect: { x: ix, y: iy, width: ICON, height: ICON }, hero });
  });

  const btnY = 420 + topOffset + 2 * (ICON + 30) + 10;
  btnPrevRect = { x: PAD_X, y: btnY, width: 40, height: 40 };
  btnNextRect = { x: canvas.width - PAD_X - 40, y: btnY, width: 40, height: 40 };

  ctx.fillStyle = pageIndex > 0 ? '#7E30B3' : '#300';
  drawRoundedRect(ctx, btnPrevRect.x, btnPrevRect.y, 40, 40, 8, true, false);
  drawText(ctx, '<', btnPrevRect.x + 20, btnPrevRect.y + 20,
    '24px IndieFlower', '#FFF', 'center', 'middle');

  ctx.fillStyle = pageIndex < TOTAL_PAGES - 1 ? '#7E30B3' : '#300';
  drawRoundedRect(ctx, btnNextRect.x, btnNextRect.y, 40, 40, 8, true, false);
  drawText(ctx, '>', btnNextRect.x + 20, btnNextRect.y + 20,
    '24px IndieFlower', '#FFF', 'center', 'middle');

  drawText(ctx, `${pageIndex + 1} / ${TOTAL_PAGES}`,
    canvas.width / 2, btnPrevRect.y + 20,
    '14px IndieFlower', '#DCC6F0', 'center', 'middle');

  const confirmX = canvas.width / 2 - 80;
  const confirmY = canvas.height - 80;
  ctx.fillStyle = '#912BB0';
  drawRoundedRect(ctx, confirmX, confirmY, 160, 50, 8, true, false);
  drawText(ctx, '确认出战', confirmX + 80, confirmY + 25,
    '18px IndieFlower', '#FFF', 'center', 'middle');
}

/* ===================== 头像绘制 ========================= */
function drawIcon(ctx, hero, x, y) {
  const ICON = 60;
  const radius = 12;
  const rarityColor = { SSR: '#FFD700', SR: '#C0C0C0', R: '#8B4513' }[hero.rarity] || '#FFFFFF';

  if (heroImageCache[hero.id]) {
    // 圆角剪裁头像图像
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + ICON - radius, y);
    ctx.quadraticCurveTo(x + ICON, y, x + ICON, y + radius);
    ctx.lineTo(x + ICON, y + ICON - radius);
    ctx.quadraticCurveTo(x + ICON, y + ICON, x + ICON - radius, y + ICON);
    ctx.lineTo(x + radius, y + ICON);
    ctx.quadraticCurveTo(x, y + ICON, x, y + ICON - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(heroImageCache[hero.id], x, y, ICON, ICON);
    ctx.restore();

    // 稀有度边框
    ctx.strokeStyle = rarityColor;
    ctx.lineWidth = 5;
    drawRoundedRect(ctx, x, y, ICON, ICON, radius, false, true);

    // 顶部属性
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    drawRoundedRect(ctx, x, y - 14, ICON, 14, 4, true, false);
    drawText(ctx, `物:${hero.attributes.physical} 魔:${hero.attributes.magical}`,
      x + 4, y - 3, '10px IndieFlower', '#FFD', 'left', 'bottom');

    // 职业和名字加粗描边
    ctx.font = 'bold 10px IndieFlower';
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#000';
    ctx.fillStyle = '#FFF';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';

    ctx.strokeText(hero.role, x + 4, y + ICON - 14);
    ctx.fillText(hero.role, x + 4, y + ICON - 14);
    ctx.strokeText(hero.name, x + 4, y + ICON - 3);
    ctx.fillText(hero.name, x + 4, y + ICON - 3);
    return;
  }

  const img = wx.createImage();
  img.src = `assets/icons/${hero.icon}`;
  img.onload = () => { heroImageCache[hero.id] = img; render(); };
}

/* ===================== 导出 ============================= */
export default {
  init: initHeroSelectPage,
  update: () => { },
  draw: () => render(),
  destroy: () => canvasRef.removeEventListener('touchstart', onTouch)
};
