function drawText(ctx, text, x, y, font = '16px sans-serif', color = '#333',
                  hAlign = 'left', vAlign = 'alphabetic') {
  ctx.fillStyle   = color;
  ctx.font        = font;
  ctx.textAlign   = hAlign;      // 'left' | 'center' | 'right'
  ctx.textBaseline= vAlign;      // 'top' | 'middle' | 'bottom' | 'alphabetic'
  ctx.fillText(text, x, y);
}


const HeroState = require('./data/hero_state.js');
const HeroData = require('./data/hero_data.js');

let selectedHeroes = [null, null, null, null, null];
let slotRects = [];
let iconRects = [];

let scrollY = 0;
let isDragging = false;
let lastY = 0;
const SCROLL_LIMIT = 400; // 英雄池最大可上滑像素

let ctxRef;
let switchPageFn;
let canvasRef;

let _handlers = [];
let _touchStartHandler, _touchMoveHandler, _touchEndHandler;
const heroImageCache = {}; // 缓存头像图像

function initHeroSelectPage(ctx, switchPage, canvas) {
  ctxRef = ctx;
  switchPageFn = switchPage;
  canvasRef = canvas;

  _touchStartHandler = function(e) {
    const touch = e.touches[0];
    const x = touch.clientX;
    const y = touch.clientY;

    // 点击出战栏位
    for (let i = 0; i < slotRects.length; i++) {
      const rect = slotRects[i];
      if (pointInRect(x, y, rect)) {
        selectedHeroes[i] = null;
        render(ctxRef, canvasRef);
        return;
      }
    }

    // 点击英雄池
    for (let i = 0; i < iconRects.length; i++) {
      const { rect, hero } = iconRects[i];
      if (pointInRect(x, y, rect)) {
        if (selectedHeroes.find(h => h && h.id === hero.id)) return;
        let index = selectedHeroes.findIndex(h => h === null);
        if (index !== -1) {
          selectedHeroes[index] = hero;
          HeroState.setSelectedHeroes(selectedHeroes);
          render(ctxRef, canvasRef);
        }
        return;
      }
    }

    // 点击确认按钮
    const btnX = canvasRef.width / 2 - 80;
    const btnY = canvasRef.height - 80;
    if (pointInRect(x, y, { x: btnX, y: btnY, width: 160, height: 50 })) {
      wx.setStorageSync("selectedHeroes", selectedHeroes);
      switchPageFn("game");
    }

    // 开始拖动
    isDragging = true;
    lastY = y;
  };
canvas.addEventListener('touchstart', _touchStartHandler);
_handlers.push(['touchstart', _touchStartHandler]);
_touchMoveHandler = function(e) {
    if (!isDragging) return;
    const currentY = e.touches[0].clientY;
    const deltaY = currentY - lastY;
    lastY = currentY;

    scrollY += deltaY;
    if (scrollY > 0) scrollY = 0;
    if (scrollY < -SCROLL_LIMIT) scrollY = -SCROLL_LIMIT;

    render(ctxRef, canvasRef);
  };
canvas.addEventListener('touchmove', _touchMoveHandler);
_handlers.push(['touchmove', _touchMoveHandler]);
_touchEndHandler = function() {
    isDragging = false;
  };
canvas.addEventListener('touchend', _touchEndHandler);
_handlers.push(['touchend', _touchEndHandler]);
render(ctx, canvas);
}

function pointInRect(x, y, rect) {
  return x >= rect.x && x <= rect.x + rect.width &&
         y >= rect.y && y <= rect.y + rect.height;
}

function render(ctx, canvas) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const paddingX = 20;
  const heroSize = 60;
  const gap = 15;
  const topOffset = 80;

  // 出战栏位
  drawText(ctx, "出战英雄（点击移除）",
            paddingX, 280 + topOffset,
            '16px sans-serif', '#333', 'left', 'top');
  slotRects = [];
  for (let i = 0; i < 5; i++) {
    const x = paddingX + i * (heroSize + gap);
    const y = 300 + topOffset;
    ctx.strokeStyle = '#999';
    ctx.strokeRect(x, y, heroSize, heroSize);
    slotRects.push({ x, y, width: heroSize, height: heroSize });
    if (selectedHeroes[i]) drawIcon(ctx, selectedHeroes[i], x, y);
  }

  // 英雄池标题 & 滚动起点
  const baseY = 420;
  const scrollBaseY = baseY + scrollY + topOffset;
  ctx.fillStyle = '#333';
   drawText(ctx, "英雄池（点击添加）",
            paddingX, baseY + scrollY + topOffset - 20,
            '16px sans-serif', '#333', 'left', 'top');

  // 英雄池绘制
  iconRects = [];
  HeroData.heroes.forEach((hero, i) => {
    const row = Math.floor(i / 5);
    const col = i % 5;
    const x = paddingX + col * (heroSize + gap);
    const y = scrollBaseY + row * (heroSize + 30);

    ctx.strokeStyle = '#999';
    ctx.strokeRect(x, y, heroSize, heroSize);
    drawIcon(ctx, hero, x, y);
    iconRects.push({ rect: { x, y, width: heroSize, height: heroSize }, hero });
  });

  // 确认按钮
  const btnX = canvas.width / 2 - 80;
  const btnY = canvas.height - 80;
  ctx.fillStyle = '#00AA00';
  ctx.fillRect(btnX, btnY, 160, 50);
   drawText(ctx, "确认出战",
            btnX + 80,          // 按钮中心 = btnX + btnWidth/2
            btnY + 25,          //           btnY + btnHeight/2
            '18px sans-serif', '#fff', 'center', 'middle');
}

function drawIcon(ctx, hero, x, y) {
  const iconSize = 60;

  // 稀有度边框颜色
  let borderColor = '#888';
  if (hero.rarity === 'SSR') borderColor = '#FFD700';
  else if (hero.rarity === 'SR') borderColor = '#C0C0C0';
  else if (hero.rarity === 'R') borderColor = '#8B4513';

  if (heroImageCache[hero.id]) {
    ctx.fillStyle = '#111';
    ctx.fillRect(x - 2, y - 2, iconSize + 4, iconSize + 4);
    ctx.drawImage(heroImageCache[hero.id], x, y, iconSize, iconSize);

    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 2;
    ctx.strokeRect(x - 1, y - 1, iconSize + 2, iconSize + 2);

    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(x, y + iconSize - 14, iconSize, 14);
     drawText(ctx, hero.role,
                x + 4, y + iconSize - 3,
                '10px sans-serif', '#fff', 'left', 'bottom');

    const phys = hero.attributes?.physical ?? 0;
    const magic = hero.attributes?.magical ?? 0;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(x, y - 14, iconSize, 14);
     drawText(ctx, `物:${phys} 魔:${magic}`,
              x + 4, y - 3,
              '10px sans-serif', '#0FF', 'left', 'bottom');
    return;
  }

  // 如果还没加载过图片
  const img = wx.createImage();
  img.src = `assets/icons/${hero.icon}`;
  img.onload = () => {
    heroImageCache[hero.id] = img;
    render(ctx, ctx.canvas); // 触发重新渲染一次头像
  };
}


export function destroyHeroSelectPage() {
  if (!canvasRef) return;
  _handlers.forEach(([type, fn]) => {
    canvasRef.removeEventListener(type, fn);
  });
  _handlers.length = 0;
}

export default {
  init: initHeroSelectPage,
  update: () => {},
  draw(ctx){               // ← 新增包装函数
  render(ctx, canvasRef);
     },
  onTouchstart: _touchStartHandler,
  onTouchmove: _touchMoveHandler,
  onTouchend: _touchEndHandler,
  destroy: destroyHeroSelectPage
};
