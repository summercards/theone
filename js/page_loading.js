const HeroData = require('./data/hero_data.js');

let ctxRef, canvasRef, switchPageFn;
let progress = 0;
let loadedCount = 0;

// ① 构建预加载列表：英雄图标
const preloadList = HeroData.heroes.map(hero => ({
  key: hero.icon.toLowerCase(),
  path: `assets/icons/${hero.icon}`
}));

// ✅ 添加 block 方块贴图
const blockLetters = ['A', 'B', 'C', 'D', 'E', 'F'];
blockLetters.forEach(letter => {
  preloadList.push({
    key: `block_${letter}`,
    path: `assets/blocks/${letter}.png`
  });
});


// ② 添加 UI 图标（如锁图标、备用图等）
preloadList.push({ key: 'lock.png', path: 'assets/ui/lock.png' });
preloadList.push({ key: 'basketball', path: 'assets/effects/basketball.png' });
preloadList.push({ key: 'bg', path: 'assets/bg.png' });
preloadList.push({ key: 'scene_bg01', path: 'assets/scene/scene-bg01.png' });
preloadList.push({ key: 'hero_window', path: 'assets/ui/hero-window.png' });
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
  
    // 进度条参数
    const barWidth = w * 0.6;
    const barHeight = 22;
    const barX = (w - barWidth) / 2;
    const barY = h * 0.5;
    const radius = 10;
  
    function drawRoundedRect(x, y, width, height, radius) {
      ctx.beginPath();
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + width - radius, y);
      ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
      ctx.lineTo(x + width, y + height - radius);
      ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
      ctx.lineTo(x + radius, y + height);
      ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
      ctx.closePath();
    }
  
    // 背景条
    drawRoundedRect(barX, barY, barWidth, barHeight, radius);
    ctx.fillStyle = '#1a1a1a';
    ctx.fill();
  
    // 填充条（魅红色）
    const filledWidth = (progress / 100) * barWidth;
    drawRoundedRect(barX, barY, filledWidth, barHeight, radius);
    ctx.fillStyle = '#C2185B';
    ctx.fill();
  
    // 边框（加粗 + 蓝紫）
    drawRoundedRect(barX, barY, barWidth, barHeight, radius);
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#6A5ACD';
    ctx.stroke();
  
    // 百分比文字
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '20px gameFont';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#000';
    ctx.shadowBlur = 2;
    ctx.fillText(`${progress}%`, w / 2, barY + barHeight + 32);
    ctx.shadowBlur = 0;
  
    // 加载文案（大字、加粗、上方靠近进度条）
    ctx.fillStyle = '#FF3399';
    ctx.font = 'bold 30px gameFont';
    ctx.shadowColor = '#000';
    ctx.shadowBlur = 3;
    ctx.fillText('召唤中…', w / 2, barY - 20);
    ctx.shadowBlur = 0;
  }
  
  
  
  

export default {
  init: initLoadingPage,
  update: () => {},
  draw: drawLoading,
  destroy: () => {},
  onTouchend: () => {},
  touchend: () => {}
};
