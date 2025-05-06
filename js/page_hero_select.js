// ======================= 资源与常量 =======================
const { drawRoundedRect } = require('./utils/canvas_utils.js');
const { getTotalCoins }   = require('./data/coin_state.js');
const {
  HeroState,            // 类
  setSelectedHeroes     // 方法
} = require('./data/hero_state.js');
const HeroData          = require('./data/hero_data.js');

const ICON       = 60;                  // 头像大小（全局常量）
const HERO_PER_PAGE = 10;
const TOTAL_PAGES   = 3;

const lockIconImg = wx.createImage();   // 锁图标
lockIconImg.src   = 'assets/ui/lock.png';

// ======================= 运行时状态 =======================
let selectedHeroes = [null, null, null, null, null];
let slotRects  = [];
let iconRects  = [];
let btnPrevRect = null;
let btnNextRect = null;
let pageIndex   = 0;


let ctxRef, canvasRef, switchPageFn;
let showUpgradeButtons = false;         // 是否显示“升级”按钮

// ======================= 页面生命周期 =====================
function initHeroSelectPage(ctx, switchPage, canvas) {
  ctxRef = ctx;
  canvasRef = canvas;
  switchPageFn = switchPage;
  canvas.addEventListener('touchstart', onTouch);
  render();
}

// ======================= 触摸 / 点击 ======================
function onTouch(e) {
  const { clientX: x, clientY: y } = e.touches[0];

  /* ---------- 已选槽位：点击移除 ---------- */
  for (let i = 0; i < slotRects.length; i++) {
    if (hit(x, y, slotRects[i])) {
      selectedHeroes[i] = null;
      setSelectedHeroes(selectedHeroes);
      return render();
    }
  }

  /* ---------- 翻页按钮 ---------- */
  if (hit(x, y, btnPrevRect) && pageIndex > 0) {
    pageIndex--; return render();
  }
  if (hit(x, y, btnNextRect) && pageIndex < TOTAL_PAGES - 1) {
    pageIndex++; return render();
  }

  /* ---------- 升级按钮显示开关 ---------- */
  const upgradeToggleRect = { x: 20, y: canvasRef.height - 80, width: 80, height: 50 };
  if (hit(x, y, upgradeToggleRect)) {
    showUpgradeButtons = !showUpgradeButtons;
    return render();
  }

  /* ---------- 英雄头像区 ---------- */
  for (const { rect, hero } of iconRects) {
    if (hero && hit(x, y, rect)) {

// === 🔒 若英雄被锁，先弹确认框 ===
if (hero.locked) {
  const cost = hero.unlockCost || 0;
  const coins = getTotalCoins();
  wx.showModal({
    title: '✨ 解锁英雄 ✨',            // 加 Emoji + 两侧空格让标题更醒目
    content: `解锁「${hero.name}」\n需要  ${cost} 金币\n\n确定要花费吗？`,
    showCancel: true,
    cancelText: '算了吧',
    confirmText: '花费解锁',
    confirmColor: '#B44CFF',           // 亮紫 #B44CFF
    cancelColor:  '#FFD54F',           // 金黄 #FFD54F
    success(res) {
      if (!res.confirm) return;        // 点击“算了吧”或空白
      if (getTotalCoins() < cost) {
        return wx.showToast({ title: '金币不足', icon: 'none' });
      }
      const state = new HeroState(hero.id);
      if (state.tryUnlock()) {
        hero.locked = false;
        render();
      }
    }
  });
  return;                                       // 不再向下执行
}

      // === 已解锁：加入出战列表 ===
      if (selectedHeroes.includes(hero.id)) return;      // 已选中
      const empty = selectedHeroes.findIndex(h => h === null);
      if (empty !== -1) {
        selectedHeroes[empty] = hero.id;
        setSelectedHeroes(selectedHeroes);
        return render();
      }
    }
  }

  /* ---------- 头像下方“升级”按钮 ---------- */
  for (const { hero } of iconRects) {
    const btn = hero?.upgradeButtonRect;
    if (btn && hit(x, y, btn)) {
      const progress = wx.getStorageSync('heroProgress')?.[hero.id];
      const cost     = (progress?.level ?? 1) * 100;
      const coins    = getTotalCoins();
      if (coins >= cost) {
        const hs = new HeroState(hero.id);
        hs.gainExp(hs.expToNextLevel);                  // 升一次级
        wx.setStorageSync('totalCoins', coins - cost);  // 扣金币
        return render();
      } else {
        wx.showToast({ title: '金币不足', icon: 'none' });
      }
    }
  }

  /* ---------- 确认按钮 ---------- */
  const confirmRect = {
    x: canvasRef.width / 2 - 80,
    y: canvasRef.height - 80,
    width: 160, height: 50
  };
  if (hit(x, y, confirmRect)) {
    wx.setStorageSync('selectedHeroes', selectedHeroes);
    switchPageFn('game');
  }
}

// 命中测试
function hit(px, py, r) {
  return r && px >= r.x && px <= r.x + r.width &&
         py >= r.y && py <= r.y + r.height;
}

// ======================= 渲染 =============================
function render() {
  const ctx = ctxRef, canvas = canvasRef;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#2E003E';
  drawRoundedRect(ctx, 0, 0, canvas.width, canvas.height, 8, true, false);

  /* ---------- 顶部金币数 ---------- */
  drawText(ctx, `金币: ${getTotalCoins()}`,
           canvas.width - 30, 30,
           '18px IndieFlower', '#FFD700', 'right', 'top');

  const PAD_X = 20;
  const GAP   = 15;
  const topOffset = 80;

  /* ---------- 已选英雄 5 槽 ---------- */
  drawText(ctx, '出战英雄（点击移除）', PAD_X, 280 + topOffset,
           '16px IndieFlower', '#DCC6F0', 'left', 'top');

  slotRects.length = 0;
  for (let i = 0; i < 5; i++) {
    const sx = PAD_X + i * (ICON + GAP);
    const sy = 300 + topOffset;
    ctx.strokeStyle = '#A64AC9';
    ctx.lineWidth = 3;
    drawRoundedRect(ctx, sx, sy, ICON, ICON, 8, false, true);
    slotRects[i] = { x: sx, y: sy, width: ICON, height: ICON };
    const heroObj = selectedHeroes[i] && HeroData.getHeroById(selectedHeroes[i]);
    if (heroObj) drawIcon(ctx, heroObj, sx, sy);
  }

  /* ---------- 英雄池 ---------- */
  drawText(ctx, '英雄池（点击添加）', PAD_X, 420 + topOffset - 20,
           '16px IndieFlower', '#DCC6F0', 'left', 'top');

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

  /* ---------- 翻页按钮 ---------- */
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

  /* ---------- 升级按钮显示开关 ---------- */
  const upgradeToggleRect = { x: PAD_X, y: canvas.height - 80, width: 80, height: 50 };
  ctx.fillStyle = '#FFD700';
  drawRoundedRect(ctx, upgradeToggleRect.x, upgradeToggleRect.y,
                  upgradeToggleRect.width, upgradeToggleRect.height, 8, true, false);
  drawText(ctx, showUpgradeButtons ? '隐藏' : '升级',
    upgradeToggleRect.x + upgradeToggleRect.width / 2,
    upgradeToggleRect.y + 25,
    '18px IndieFlower', '#000', 'center', 'middle');

  /* ---------- 确认按钮 ---------- */
  const confirmX = canvas.width / 2 - 80;
  const confirmY = canvas.height - 80;
  ctx.fillStyle = '#912BB0';
  drawRoundedRect(ctx, confirmX, confirmY, 160, 50, 8, true, false);
  drawText(ctx, '确认出战', confirmX + 80, confirmY + 25,
    '18px IndieFlower', '#FFF', 'center', 'middle');
}

// ======================= 绘制单个头像 ====================
function drawIcon(ctx, hero, x, y) {
  /* --------- 图片 --------- */
  if (heroImageCache[hero.id]) {
    ctx.save();
    ctx.beginPath();
    const r = 12;
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + ICON - r, y);
    ctx.quadraticCurveTo(x + ICON, y, x + ICON, y + r);
    ctx.lineTo(x + ICON, y + ICON - r);
    ctx.quadraticCurveTo(x + ICON, y + ICON, x + ICON - r, y + ICON);
    ctx.lineTo(x + r, y + ICON);
    ctx.quadraticCurveTo(x, y + ICON, x, y + ICON - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(heroImageCache[hero.id], x, y, ICON, ICON);
    ctx.restore();
  } else {
    const img = wx.createImage();
    img.src = `assets/icons/${hero.icon}`;
    img.onload = () => { heroImageCache[hero.id] = img; render(); };
  }

  /* --------- 品质描边 --------- */
  const rarityColor = { SSR: '#FFD700', SR: '#C0C0C0', R: '#8B4513' }[hero.rarity] || '#FFFFFF';
  ctx.strokeStyle = rarityColor;
  ctx.lineWidth = 5;
  drawRoundedRect(ctx, x, y, ICON, ICON, 12, false, true);

  /* --------- 名称 / 职业文本 --------- */
  ctx.font = 'bold 10px IndieFlower';
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#000';
  ctx.fillStyle = '#FFF';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'bottom';
  ctx.strokeText(hero.role, x + 4, y + ICON - 14);
  ctx.fillText(hero.role,   x + 4, y + ICON - 14);
  ctx.strokeText(hero.name, x + 4, y + ICON - 3);
  ctx.fillText(hero.name,   x + 4, y + ICON - 3);

  /* --------- 锁定遮罩 --------- */
  if (hero.locked) {
    ctx.save();
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = '#000';
    ctx.fillRect(x, y, ICON, ICON);
    ctx.globalAlpha = 1;
    const lockSize = ICON * 0.5;
    ctx.drawImage(lockIconImg,
                  x + (ICON - lockSize) / 2,
                  y + (ICON - lockSize) / 2,
                  lockSize, lockSize);
    ctx.restore();
  }

  /* --------- 属性文本 --------- */
  const saved = wx.getStorageSync('heroProgress')?.[hero.id];
  const physical = saved?.attributes?.physical ?? hero.attributes.physical ?? 0;
  const magical  = saved?.attributes?.magical  ?? hero.attributes.magical  ?? 0;
  let attrText = hero.role === '法师' ? `魔攻: ${magical}` : `物攻: ${physical}`;
  drawText(ctx, attrText, x + 4, y + ICON + 6,
    '12px IndieFlower', '#FFF', 'left', 'top');

  /* --------- 升级按钮 --------- */
  if (showUpgradeButtons && !hero.locked) {
    const btnText    = '升级';
    ctx.font         = '12px IndieFlower';
    const textWidth  = ctx.measureText(btnText).width;
    const btnPadding = 8;
    const btnW = textWidth + btnPadding * 4;
    const btnH = 22;
    const btnX = x + ICON / 2 - btnW / 2;
    const btnY = y + ICON + 4;

    ctx.fillStyle = '#FFD700';
    drawRoundedRect(ctx, btnX, btnY, btnW, btnH, 4, true, false);
    drawText(ctx, btnText, btnX + btnW / 2, btnY + 2,
      '12px IndieFlower', '#000', 'center', 'top');

    hero.upgradeButtonRect = { x: btnX, y: btnY, width: btnW, height: btnH };
  } else {
    hero.upgradeButtonRect = null;
  }

  /* --------- 等级角标 --------- */
  const level = saved?.level ?? hero.level ?? 1;
  ctx.font = 'bold 11px IndieFlower';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#FFD700';
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 2;
  ctx.strokeText(`Lv.${level}`, x + ICON - 4, y + 4);
  ctx.fillText(`Lv.${level}`,   x + ICON - 4, y + 4);
}

// 绘制文本工具
function drawText(ctx, text, x, y,
  font = '16px IndieFlower', color = '#FFF',
  hAlign = 'left', vAlign = 'alphabetic') {
  ctx.fillStyle = color;
  ctx.font = font;
  ctx.textAlign = hAlign;
  ctx.textBaseline = vAlign;
  ctx.fillText(text, x, y);
}

// 图片缓存
const heroImageCache = {};

// ======================= 导出接口 ========================
module.exports = {
  init:    initHeroSelectPage,
  update:  () => {},
  draw:    () => render(),
  destroy: () => canvasRef.removeEventListener('touchstart', onTouch)
};
