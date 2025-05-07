// === 全局冷却控制（可放在文件顶部或函数外部） ===
let lastAdTime = 0; // 上次点击时间戳
const AD_COOLDOWN = 30 * 1000; // 30秒冷却，单位毫秒


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
/* ---------- 弹窗状态 ---------- */
let unlockDialog = { show: false, hero: null, okRect: null, cancelRect: null };



let ctxRef, canvasRef, switchPageFn;
let showUpgradeButtons = false;         // 是否显示“升级”按钮

// ======================= 页面生命周期 =====================
function initHeroSelectPage(ctx, switchPage, canvas) {
  ctxRef = ctx;
  canvasRef = canvas;
  switchPageFn = switchPage;
  render();
}

// ======================= 触摸 / 点击 ======================
function onTouch(e) {
  if (!e.changedTouches || !e.changedTouches[0]) return;
  const { clientX: x, clientY: y } = e.changedTouches[0];

  console.log('[DEBUG] 用户触摸了坐标：', x, y);

    // ---------- 若弹窗已开启，优先处理弹窗 ----------
    if (unlockDialog.show) {
      // 点坐标
      const px = x, py = y;
      const { okRect, cancelRect } = unlockDialog;
  
      // 点击确定
      if (hit(px, py, okRect)) {
        const hero  = unlockDialog.hero;
        const cost  = hero.unlockCost || 0;
        const coins = getTotalCoins();
        unlockDialog.show = false;
        if (coins < cost) {
          wx.showToast({ title: '金币不足', icon: 'none' });
          return render();
        }
        const st = new HeroState(hero.id);
        if (st.tryUnlock()) hero.locked = false;
        return render();
      }
  
      // 点击取消按钮或蒙层空白
      if (!hit(px, py, okRect)) {
        unlockDialog.show = false;
        return render();
      }
    }
  


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
// ---------- 点击“看广告得金币” ----------

// 全局冷却控制（若已声明，可略）
if (typeof globalThis.lastAdTime === 'undefined') {
  globalThis.lastAdTime = 0;
}
const AD_COOLDOWN = 30 * 1000; // 30秒冷却时间

if (hit(x, y, globalThis.adBtnRect)) {
  const now = Date.now();
  if (now - globalThis.lastAdTime < AD_COOLDOWN) {
    wx.showToast({ title: '请稍后再试', icon: 'none' });
    return;
  }

  globalThis.lastAdTime = now; // 记录点击时间

  // ✅ 当前为模拟广告播放流程，开发阶段使用
  // ✅ 正式发布前可替换为 wx.createRewardedVideoAd 逻辑（见下方注释）
  wx.showModal({
    title: '🎁 免费金币',
    content: '观看一段广告可获得100金币，是否继续？',
    confirmText: '观看完成',
    cancelText: '取消',
    success(res) {
      if (res.confirm) {
        const coins = getTotalCoins();
        wx.setStorageSync('totalCoins', coins + 100);
        wx.showToast({ title: '金币 +100', icon: 'success' });
        render();
      } else {
        wx.showToast({ title: '观看未完成', icon: 'none' });
      }
    }
  });

  /*
  // ✅ 正式上线请使用真实广告 API 替换上方模拟逻辑：
  const videoAd = wx.createRewardedVideoAd({ adUnitId: 'your-real-ad-id' });

  videoAd.onError(err => {
    wx.showToast({ title: '广告加载失败', icon: 'none' });
  });

  videoAd.load().then(() => videoAd.show())
    .catch(() => wx.showToast({ title: '广告展示失败', icon: 'none' }));

  videoAd.onClose(res => {
    if (res && res.isEnded) {
      const coins = getTotalCoins();
      wx.setStorageSync('totalCoins', coins + 100);
      wx.showToast({ title: '金币 +100', icon: 'success' });
      render();
    } else {
      wx.showToast({ title: '观看未完成', icon: 'none' });
    }
  });
  */

  return;
}


  /* ---------- 英雄头像区 ---------- */
  for (const { rect, hero } of iconRects) {
    if (hero && hit(x, y, rect)) {

// === 🔒 若英雄被锁，先弹确认框 ===
if (hero.locked) {
  const cost = hero.unlockCost || 0;
  const coins = getTotalCoins();

// === 🔒 被锁，打开自绘弹窗 ===
if (hero.locked) {
  if (hero.unlockBy === 'ad') {
    // 先弹出提示框而不是直接播放广告
    wx.showModal({
      title: '🎥 解锁英雄',
      content: `解锁「${hero.name}」需要观看一段广告，是否继续？`,
      cancelText: '取消',
      confirmText: '立即观看',
      success(res) {
        if (res.confirm) {
          const videoAd = wx.createRewardedVideoAd({ adUnitId: 'adunit-0123456789abcdef' });

          videoAd.onError(err => {
            wx.showToast({ title: '广告加载失败', icon: 'none' });
          });

          videoAd.load()
            .then(() => videoAd.show())
            .catch(() => {
              wx.showToast({ title: '广告展示失败', icon: 'none' });
            });

          videoAd.onClose(res => {
            if (res && res.isEnded) {
              const state = new HeroState(hero.id);
              if (state.tryUnlock()) {
                hero.locked = false;
                render();
              }
            } else {
              wx.showToast({ title: '观看未完成', icon: 'none' });
            }
          });
        }
      }
    });

    return; // ⛔ 防止后续加入出战队列
  } else {
    unlockDialog = { show: true, hero };
    return render();
  }
}



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

function onTouchend(e) {
  onTouch(e); // ✅ 复用已有点击处理逻辑
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
           canvas.width - 280, 80,
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

  // ✅ 使用 HeroState 读取实时状态（包括是否解锁）
  const heroId = selectedHeroes[i];
  if (heroId) {
    const heroObj = new HeroState(heroId);
    drawIcon(ctx, heroObj, sx, sy);
  }
}


  /* ---------- 英雄池 ---------- */
  drawText(ctx, '英雄池（点击添加）', PAD_X, 420 + topOffset - 20,
           '16px IndieFlower', '#DCC6F0', 'left', 'top');

  const startIdx = pageIndex * HERO_PER_PAGE;
  const rawHeroes = HeroData.heroes.slice(startIdx, startIdx + HERO_PER_PAGE);
  const pageHeroes = rawHeroes.map(h => h ? new HeroState(h.id) : null);
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
    // 如需弹窗则绘制
  drawUnlockDialog(ctx, canvas);

    /* ---------- 看广告得金币按钮 ---------- */
    const adBtnRect = { x: canvas.width - 20 - 80, 
      y: upgradeToggleRect.y,
      width: 80, height: 50 };
ctx.fillStyle = '#FFD700';
drawRoundedRect(ctx, adBtnRect.x, adBtnRect.y,
  adBtnRect.width, adBtnRect.height, 8, true, false);
drawText(ctx, '看广告得金币',
adBtnRect.x + adBtnRect.width / 2,
adBtnRect.y + 25,
'18px IndieFlower', '#000', 'center', 'middle');

// 存储按钮热区
globalThis.adBtnRect = adBtnRect;

}

function drawUnlockDialog(ctx, canvas) {
  if (!unlockDialog.show) return;          // 没开启不画

  const { hero } = unlockDialog;
  const cost = hero.unlockCost || 0;

  /* ——— 1. 半透明遮罩 ——— */
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.restore();

  /* ——— 2. 主卡片 ——— */
  const W = 270, H = 180, R = 14;
  const x = (canvas.width - W) / 2;
  const y = (canvas.height - H) / 2;

  ctx.fillStyle = '#4A007F';
  drawRoundedRect(ctx, x, y, W, H, R, true, false);

  /* ——— 3. 标题 ——— */
  drawText(ctx, '解锁英雄', x + W / 2, y + 36,
    'bold 20px PingFang SC', '#FFD54F', 'center', 'middle');

  /* ——— 4. 内容 ——— */
  drawText(ctx, `解锁「${hero.name}」需要`, x + W / 2, y + 76,
    '15px PingFang SC', '#FFFFFF', 'center', 'middle');
  drawText(ctx, `${cost} 金币，确定继续？`, x + W / 2, y + 100,
    '15px PingFang SC', '#FFFFFF', 'center', 'middle');

  /* ——— 5. 两个按钮 ——— */
  const btnW = 100, btnH = 36, gap = 26;
  const btnY = y + H - 56;
  const cancelX = x + (W - 2 * btnW - gap) / 2;
  const okX     = cancelX + btnW + gap;

  // 取消
  ctx.strokeStyle = '#DCC6F0';
  ctx.lineWidth   = 2;
  drawRoundedRect(ctx, cancelX, btnY, btnW, btnH, 6, false, true);
  drawText(ctx, '取消', cancelX + btnW / 2, btnY + btnH / 2 + 1,
    '15px PingFang SC', '#DCC6F0', 'center', 'middle');

  // 确定
  ctx.fillStyle = '#B44CFF';
  drawRoundedRect(ctx, okX, btnY, btnW, btnH, 6, true, false);
  drawText(ctx, '确定', okX + btnW / 2, btnY + btnH / 2 + 1,
    '15px PingFang SC', '#FFFFFF', 'center', 'middle');

  // 保存按钮热区
  unlockDialog.cancelRect = { x: cancelX, y: btnY, width: btnW, height: btnH };
  unlockDialog.okRect     = { x: okX,     y: btnY, width: btnW, height: btnH };
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
    ctx.globalAlpha = 0.95;
    ctx.fillStyle = '#000';
    drawRoundedRect(ctx, x, y, ICON, ICON, 8, true, false);  // ✅ 圆角遮罩
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
  ctx.textBaseline = 'middle';
  const textWidth  = ctx.measureText(btnText).width;
  const btnPadding = 8;
  const btnW = textWidth + btnPadding * 4;
  const btnH = 22;
  const btnX = x + ICON / 2 - btnW / 2;
  const btnY = y + ICON + 4;

  ctx.fillStyle = '#FFD700';
  drawRoundedRect(ctx, btnX, btnY, btnW, btnH, 4, true, false);

  // 将 drawText 的 textBaseline 设置为 'middle'，y 改为按钮中线
  drawText(ctx, btnText, btnX + btnW / 2, btnY + btnH / 2,
    '12px IndieFlower', '#000', 'center', 'middle');

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
  destroy: () => {},
  onTouchend,
  touchend: onTouchend   // ✅ 必须导出这个字段
};

