const HeroData = require('./data/hero_data.js');

let ctxRef, canvasRef, switchPageFn;
let progress = 0;
let loadedCount = 0;

// ① 构建预加载列表：英雄图标
const preloadList = HeroData.heroes.map(hero => ({
  key: hero.icon.toLowerCase(),
  path: `assets/icons/${hero.icon}`
}));

// ② 添加 UI 图标（如锁图标、备用图等）
preloadList.push({ key: 'lock.png', path: 'assets/ui/lock.png' });
// preloadList.push({ key: 'fallback.png', path: 'assets/ui/fallback.png' }); // 可选占位图

// ③ 创建全局缓存
globalThis.imageCache = {};

function preloadAssets() {
  for (const item of preloadList) {
    const img = wx.createImage();
    img.src = item.path;

    img.onload = () => {
      globalThis.imageCache[item.key] = img;
      loadedCount++;
      progress = Math.floor((loadedCount / preloadList.length) * 100);
      drawLoading();

      if (loadedCount === preloadList.length) {
        setTimeout(() => switchPageFn('home'), 500);
      }
    };

    img.onerror = () => {
      console.error(`❌ 图片加载失败: ${item.path}`);
      loadedCount++;
      drawLoading();
    };
  }
}

function initLoadingPage(ctx, switchPage, canvas) {
  ctxRef = ctx;
  canvasRef = canvas;
  switchPageFn = switchPage;

  drawLoading();
  preloadAssets();
}

function drawLoading() {
  const ctx = ctxRef;
  const w = canvasRef.width;
  const h = canvasRef.height;

  // 背景
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, w, h);

  // 标题文字
  ctx.fillStyle = '#FFF';
  ctx.font = '28px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('资源加载中...', w / 2, h * 0.3);

  // 进度条位置与尺寸
  const barWidth = w * 0.6;
  const barHeight = 20;
  const barX = (w - barWidth) / 2;
  const barY = h * 0.5;

  // 进度条背景
  ctx.fillStyle = '#444';
  ctx.fillRect(barX, barY, barWidth, barHeight);

  // 进度条填充
  const filled = (progress / 100) * barWidth;
  ctx.fillStyle = '#00FF00';
  ctx.fillRect(barX, barY, filled, barHeight);

  // 边框
  ctx.strokeStyle = '#AAA';
  ctx.lineWidth = 2;
  ctx.strokeRect(barX, barY, barWidth, barHeight);

  // 百分比文字
  ctx.fillStyle = '#FFF';
  ctx.font = '18px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`${progress}%`, w / 2, barY + barHeight + 30);
}

export default {
  init: initLoadingPage,
  update: () => {},
  draw: drawLoading,
  destroy: () => {},
  onTouchend: () => {},
  touchend: () => {}
};
