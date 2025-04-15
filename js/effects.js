
let effects = [];

export function addEffect(x, y, type = 'circle') {
  effects.push({
    x,
    y,
    type,
    life: 30 // 帧数持续时间
  });
}

export function updateEffects() {
  for (let i = effects.length - 1; i >= 0; i--) {
    effects[i].life -= 1;
    if (effects[i].life <= 0) {
      effects.splice(i, 1);
    }
  }
}

export function drawEffects(ctx) {
  effects.forEach(effect => {
    if (effect.type === 'circle') {
      ctx.beginPath();
      ctx.arc(effect.x, effect.y, 10, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.fill();
    }
  });
}
