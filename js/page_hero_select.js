// ✅ js/page_hero_select.js（自适应 Canvas 尺寸版）
const HeroData = require('./data/hero_data.js');

let selectedHeroes = [null, null, null, null, null];
let slotRects = [];
let iconRects = [];

function initHeroSelectPage(ctx, switchPage, canvas) {
  canvas.addEventListener('touchstart', (e) => {
    const touch = e.touches[0];
    const x = touch.clientX;
    const y = touch.clientY;

    // 点击出战栏位
    for (let i = 0; i < slotRects.length; i++) {
      const rect = slotRects[i];
      if (pointInRect(x, y, rect)) {
        selectedHeroes[i] = null;
        render(ctx, canvas);
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
          render(ctx, canvas);
        }
        return;
      }
    }

    // 点击确认按钮
    const btnX = canvas.width / 2 - 80;
    const btnY = canvas.height - 100;
    if (pointInRect(x, y, { x: btnX, y: btnY, width: 160, height: 50 })) {
      wx.setStorageSync("selectedHeroes", selectedHeroes);
      switchPage("game");
    }
  });

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

  // 出战栏位
  ctx.fillStyle = '#333';
  ctx.font = '16px sans-serif';
  ctx.fillText("出战英雄（点击移除）", paddingX, 80);
  slotRects = [];
  for (let i = 0; i < 5; i++) {
    const x = paddingX + i * (heroSize + gap);
    const y = 100;
    ctx.strokeStyle = '#999';
    ctx.strokeRect(x, y, heroSize, heroSize);
    slotRects.push({ x, y, width: heroSize, height: heroSize });
    if (selectedHeroes[i]) drawIcon(ctx, selectedHeroes[i], x, y);
  }

  // 英雄池
  ctx.fillStyle = '#333';
  ctx.fillText("英雄池（点击添加）", paddingX, 200);
  iconRects = [];
  HeroData.heroes.forEach((hero, i) => {
    const x = paddingX + i * (heroSize + gap);
    const y = 220;
    ctx.strokeStyle = '#999';
    ctx.strokeRect(x, y, heroSize, heroSize);
    drawIcon(ctx, hero, x, y);
    iconRects.push({ rect: { x, y, width: heroSize, height: heroSize }, hero });
  });

  // 确认按钮
  const btnX = canvas.width / 2 - 80;
  const btnY = canvas.height - 100;
  ctx.fillStyle = '#00AA00';
  ctx.fillRect(btnX, btnY, 160, 50);
  ctx.fillStyle = '#ffffff';
  ctx.font = '18px sans-serif';
  ctx.fillText("确认出战", btnX + 35, btnY + 30);
}

function drawIcon(ctx, hero, x, y) {
  const img = wx.createImage();
  img.src = `assets/icons/${hero.icon}`;
  img.onload = () => {
    ctx.drawImage(img, x, y, 60, 60);
  };
}

module.exports = {
  initHeroSelectPage
};
