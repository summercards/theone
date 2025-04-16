// effects_engine.js
import { addEffect, updateEffects, drawEffects } from './effects.js';

// 调用每帧更新所有特效
export function updateAllEffects() {
  updateEffects();
}

// 绘制所有特效（在方块之上）
export function drawAllEffects(ctx) {
  drawEffects(ctx);
}

// 创建一个缩小方块特效 + 粒子爆炸特效
export function createExplosion(x, y) {
  addEffect(x, y, 'shrink');
  for (let i = 0; i < 5; i++) {
    const angle = Math.random() * 2 * Math.PI;
    const speed = Math.random() * 2 + 1;
    addEffect(x, y, {
      type: 'particle',
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 20,
      alpha: 1
    });
  }
}
