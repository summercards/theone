let effects = [];

export function addEffect(x, y, config) {
  const effect = {
    x,
    y,
    ...config,
    totalLife: config.life || 30 // ✅ 存储特效总时长
  };
  effects.push(effect);
}

export function updateEffects() {
  for (let i = effects.length - 1; i >= 0; i--) {
    const e = effects[i];
    e.life--;

    // ✅ 粒子移动和衰减
    if (e.type === 'particle') {
      e.x += e.vx;
      e.y += e.vy;
      e.alpha *= 0.95;
      e.radius *= 0.97;
    }

    // ✅ 生命周期结束或粒子透明度太低就移除
    if (e.life <= 0 || (e.alpha !== undefined && e.alpha < 0.05)) {
      effects.splice(i, 1);
    }
  }
}

export function drawEffects(ctx) {
  effects.forEach(e => {
    if (e.type === 'shrink') {
      const progress = e.life / e.totalLife; // ✅ 使用总时长计算缩放比例
      const size = 40 * progress;
      ctx.fillStyle = e.color || '#FF0000';
      ctx.fillRect(e.x - size / 2, e.y - size / 2, size, size);
    } else if (e.type === 'particle') {
      ctx.globalAlpha = e.alpha;
      ctx.fillStyle = e.color || '#FFF';
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.radius || 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  });
}
