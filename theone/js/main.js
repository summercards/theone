import render from './render.js';
import databus from './engine/databus.js';
import SceneManager from './engine/scene.js';

const canvas = wx.createCanvas();
const ctx = canvas.getContext('2d');

canvas.addEventListener('touchstart', (e) => {
  const x = e.touches[0].clientX;
  const y = e.touches[0].clientY;

  if (databus.scene === 'HOME') {
    if (x >= 100 && x <= 300 && y >= 400 && y <= 460) {
      SceneManager.switchTo('GAME');
    }
  }
});

function loop() {
  render(ctx);
  requestAnimationFrame(loop);
}
loop();
