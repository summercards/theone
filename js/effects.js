let effects = [];

export function addEffect(x, y, type = 'circle') {
  // 根据特效编号添加特效
  if (type === 'shrink') {  // 缩小特效
    effects.push({
      x,
      y,
      type,
      life: 30  // 持续30帧
    });
  } else if (type === 'circle') {  // 圆形特效
    effects.push({
      x,
      y,
      type,
      life: 30  // 持续30帧
    });
  }
  // 可以根据需要添加更多特效类型
}

export function updateEffects() {
  // 更新特效的生命值，消失后移除
  for (let i = effects.length - 1; i >= 0; i--) {
    effects[i].life -= 1;
    if (effects[i].life <= 0) {
      effects.splice(i, 1);  // 移除消失的特效
    }
  }
}

export function drawEffects(ctx) {
  // 遍历所有特效并绘制
  effects.forEach(effect => {
    if (effect.type === 'shrink') {
      const size = 20 * (effect.life / 30);  // 方块逐渐缩小
      ctx.fillStyle = '#FF0000';  // 你可以根据需求修改颜色
      ctx.fillRect(effect.x - size / 2, effect.y - size / 2, size, size);  // 绘制缩小的方块
    }
    else if (effect.type === 'circle') {
      ctx.beginPath();
      ctx.arc(effect.x, effect.y, 10, 0, Math.PI * 2);  // 绘制圆形特效
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';  // 你可以根据需求修改颜色
      ctx.fill();
    }
    // 可以为其他特效类型添加更多绘制逻辑
  });
}
