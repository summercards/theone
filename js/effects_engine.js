// effects_engine.js
import { addEffect, updateEffects, drawEffects } from './effects.js';

// 每帧更新所有特效（可扩展传入 deltaTime）
export function updateAllEffects() {
  updateEffects();
}

// 绘制所有特效（在方块之上）
export function drawAllEffects(ctx) {
  drawEffects(ctx);
}

// 创建一个缩小方块特效 + 爆炸粒子
export function createExplosion(x, y, color = '#FFD700') {
  addEffect(x, y, { type: 'shrink', color, life: 45 }); // ⏳ 更慢缩放

  for (let i = 0; i < 8; i++) {
    const angle = Math.random() * 2 * Math.PI;
    const speed = Math.random() * 2 + 1;
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed;
    addEffect(x, y, {
      type: 'particle',
      vx,
      vy,
      radius: 4,
      color,
      alpha: 1,
      life: 30
    });
  }
}
