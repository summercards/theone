/* ===================== 通用文字绘制 ===================== */
function drawText(ctx, text, x, y,
  font = '16px sans-serif', color = '#333',
  hAlign = 'left', vAlign = 'alphabetic') {
  ctx.fillStyle    = color;
  ctx.font         = font;
  ctx.textAlign    = hAlign;
  ctx.textBaseline = vAlign;
  ctx.fillText(text, x, y);
}

/* ===================== 依赖模块 ========================= */
const HeroState = require('./data/hero_state.js');
const HeroData  = require('./data/hero_data.js');

/* ===================== 选择页状态 ======================= */
const heroImageCache = {};
let   selectedHeroes = [null, null, null, null, null];

let slotRects   = [];
let iconRects   = [];
let btnPrevRect = null;
let btnNextRect = null;

const HERO_PER_PAGE = 10;      // 2 行 × 5 列
const TOTAL_PAGES   = 3;       // 固定 3 页，占位问号补空
let   pageIndex     = 0;       // 0-based

let ctxRef, canvasRef, switchPageFn;

/* ===================== 入口 ============================= */
function initHeroSelectPage(ctx, switchPage, canvas) {
  ctxRef       = ctx;
  canvasRef    = canvas;
  switchPageFn = switchPage;

  canvas.addEventListener('touchstart', onTouch);
  render();
}

/* ===================== 触控处理 ========================= */
function onTouch(e) {
  const { clientX: x, clientY: y } = e.touches[0];

  /* ---- 出战栏：移除 ---- */
  for (let i = 0; i < slotRects.length; i++) {
    if (hit(x, y, slotRects[i])) {
      selectedHeroes[i] = null;
      HeroState.setSelectedHeroes(selectedHeroes);
      return render();
    }
  }

  /* ---- 翻页按钮 ---- */
  if (hit(x, y, btnPrevRect) && pageIndex > 0) {
    pageIndex--;
    return render();
  }
  if (hit(x, y, btnNextRect) && pageIndex < TOTAL_PAGES - 1) {
    pageIndex++;
    return render();
  }

  /* ---- 英雄池：添加 ---- */
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

  /* ---- 确认按钮 ---- */
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

/* ===================== 工具 ============================= */
function hit(px, py, r) {
  return r && px >= r.x && px <= r.x + r.width &&
         py >= r.y && py <= r.y + r.height;
}

/* ===================== 主渲染 =========================== */
function render() {
  const ctx = ctxRef, canvas = canvasRef;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#FFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const PAD_X     = 20;
  const ICON      = 60;
  const GAP       = 15;
  const topOffset = 80;

  /* —— 出战栏 —— */
  drawText(ctx, '出战英雄（点击移除）',
           PAD_X, 280 + topOffset, '16px sans-serif', '#333', 'left', 'top');

  slotRects.length = 0;
  for (let i = 0; i < 5; i++) {
    const sx = PAD_X + i * (ICON + GAP);
    const sy = 300 + topOffset;
    ctx.strokeStyle = '#999';
    ctx.strokeRect(sx, sy, ICON, ICON);
    slotRects[i] = { x: sx, y: sy, width: ICON, height: ICON };
    if (selectedHeroes[i]) drawIcon(ctx, selectedHeroes[i], sx, sy);
  }

  /* —— 英雄池 —— */
  drawText(ctx, '英雄池（点击添加）',
           PAD_X, 420 + topOffset - 20, '16px sans-serif', '#333', 'left', 'top');

  const startIdx   = pageIndex * HERO_PER_PAGE;
  const pageHeroes = HeroData.heroes.slice(startIdx, startIdx + HERO_PER_PAGE);
  while (pageHeroes.length < HERO_PER_PAGE) pageHeroes.push(null); // 占位

  iconRects.length = 0;
  pageHeroes.forEach((hero, i) => {
    const row = Math.floor(i / 5);
    const col = i % 5;
    const ix  = PAD_X + col * (ICON + GAP);
    const iy  = 420 + topOffset + row * (ICON + 30);
    ctx.strokeStyle = '#999';
    ctx.strokeRect(ix, iy, ICON, ICON);

    if (hero) drawIcon(ctx, hero, ix, iy);
    else {
      ctx.fillStyle = '#EEE';
      ctx.fillRect(ix + 4, iy + 4, ICON - 8, ICON - 8);
      drawText(ctx, '?', ix + ICON / 2, iy + ICON / 2,
               '20px sans-serif', '#AAA', 'center', 'middle');
    }
    iconRects.push({ rect: { x: ix, y: iy, width: ICON, height: ICON }, hero });
  });

  /* —— 翻页按钮 —— */
  const btnY = 420 + topOffset + 2 * (ICON + 30) + 10;
  btnPrevRect = { x: PAD_X,                 y: btnY, width: 40, height: 40 };
  btnNextRect = { x: canvas.width - PAD_X - 40, y: btnY, width: 40, height: 40 };

  ctx.fillStyle = pageIndex > 0 ? '#00AA00' : '#DDD';
  ctx.fillRect(btnPrevRect.x, btnPrevRect.y, 40, 40);
  drawText(ctx, '<', btnPrevRect.x + 20, btnPrevRect.y + 20,
           '24px sans-serif', '#FFF', 'center', 'middle');

  ctx.fillStyle = pageIndex < TOTAL_PAGES - 1 ? '#00AA00' : '#DDD';
  ctx.fillRect(btnNextRect.x, btnNextRect.y, 40, 40);
  drawText(ctx, '>', btnNextRect.x + 20, btnNextRect.y + 20,
           '24px sans-serif', '#FFF', 'center', 'middle');

  /* —— 页码 —— */
  drawText(ctx, `${pageIndex + 1} / ${TOTAL_PAGES}`,
           canvas.width / 2, btnPrevRect.y + 20,
           '14px sans-serif', '#333', 'center', 'middle');

  /* —— 确认按钮 —— */
  const confirmX = canvas.width / 2 - 80;
  const confirmY = canvas.height - 80;
  ctx.fillStyle  = '#00AA00';
  ctx.fillRect(confirmX, confirmY, 160, 50);
  drawText(ctx, '确认出战', confirmX + 80, confirmY + 25,
           '18px sans-serif', '#FFF', 'center', 'middle');
}

/* ===================== 头像绘制 ========================= */
function drawIcon(ctx, hero, x, y) {
  const ICON = 60;
  const rarityColor =
    { SSR: '#FFD700', SR: '#C0C0C0', R: '#8B4513' }[hero.rarity] || '#888';

  if (heroImageCache[hero.id]) {
    ctx.fillStyle = '#111';
    ctx.fillRect(x - 2, y - 2, ICON + 4, ICON + 4);
    ctx.drawImage(heroImageCache[hero.id], x, y, ICON, ICON);

    ctx.strokeStyle = rarityColor;
    ctx.lineWidth   = 2;
    ctx.strokeRect(x - 1, y - 1, ICON + 2, ICON + 2);

    /* ── 顶部属性 ── */
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(x, y - 14, ICON, 14);
    drawText(ctx, `物:${hero.attributes.physical} 魔:${hero.attributes.magical}`,
             x + 4, y - 3, '10px sans-serif', '#0FF', 'left', 'bottom');

    /* ── 底部名字 / 职业 ── */
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(x, y + ICON - 20, ICON, 20);
    drawText(ctx, hero.role, x + 36, y + ICON - 14,
             '10px sans-serif', '#FFF', 'left', 'bottom');
    drawText(ctx, hero.name, x + 4, y + ICON - 3,
             '10px sans-serif', '#FFF', 'left', 'bottom');
    return;
  }

  /* 异步加载图片 */
  const img = wx.createImage();
  img.src   = `assets/icons/${hero.icon}`;
  img.onload = () => { heroImageCache[hero.id] = img; render(); };
}

/* ===================== 导出 ============================= */
export default {
  init   : initHeroSelectPage,
  update : () => {},
  draw   : () => render(),
  destroy: () => canvasRef.removeEventListener('touchstart', onTouch)
};
