import databus from './js/engine/databus.js';
import SceneManager from './js/engine/scene.js';
import render from './js/render.js';

const canvas = wx.createCanvas();
const ctx = canvas.getContext('2d');

canvas.addEventListener('touchstart', (e) => {
  const x = e.touches[0].clientX;
  const y = e.touches[0].clientY;

  if (databus.scene === 'HOME') {
    if (x >= 100 && x <= 300 && y >= 400 && y <= 460) {
      SceneManager.switchTo('HERO_SELECT');
    }
  } else if (databus.scene === 'HERO_SELECT') {
    for (let i = 0; i < 5; i++) {
      let bx = 60 + i * 130;
      let by = 200;
      if (x >= bx && x <= bx + 100 && y >= by && y <= by + 100) {
        databus.heroId = i;
        console.log("选中英雄ID:", i);
        SceneManager.switchTo('GAME');
        break;
      }
    }
  }
});

function drawHome() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#fff';
  ctx.font = '40px Arial';
  ctx.fillText('勇者传说', 120, 200);

  ctx.fillStyle = '#0f0';
  ctx.fillRect(100, 400, 200, 60);
  ctx.fillStyle = '#000';
  ctx.font = '24px Arial';
  ctx.fillText('开始游戏', 140, 440);
}

function loop() {
  if (databus.scene === 'HOME') {
    drawHome();
  } else {
    render(ctx);
  }
  requestAnimationFrame(loop);
}
loop();
