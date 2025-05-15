// effects_engine.js  ★★★ 完整可用基线 ★★★
const effects = [];

/* ========= 基础更新渲染 ================================================= */
export function updateAllEffects() {
  // 粒子简单老化
  effects.forEach(e => { if (e.type === 'particle') e.life--; });
  // 删除过期
  for (let i = effects.length - 1; i >= 0; i--) {
    const e = effects[i];
    if (e.type === 'particle' && e.life <= 0) effects.splice(i, 1);
  }
}

export function drawAllEffects(ctx) {
  const now = Date.now();
  const remove = [];

  effects.forEach((e, i) => {
    /* === Projectile ===================================== */
    if (e.type === 'proj') {
      const p = Math.min(1, (now - e.startTime) / e.duration);
      const x = e.x0 + (e.x1 - e.x0) * p;
      const y = e.y0 + (e.y1 - e.y0) * p;
      ctx.fillStyle = '#FFAA00';
      ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2); ctx.fill();
      if (p === 1) { e.onArrive?.(); remove.push(i); }
    }

    /* === Floating text ================================== */
    else if (e.type === 'float') {
      const t = now - e.startTime, life = 1800;
      if (t > life) { remove.push(i); return; }
      ctx.save();
      ctx.globalAlpha = 1 - t / life;
      ctx.fillStyle   = '#FF4444';
      ctx.font        = 'bold 52px sans-serif';
      ctx.textAlign   = 'center';
      ctx.fillText(e.text, e.x, e.y - t * 0.05);
      ctx.restore();
    } else if (e.type === 'pop') {
        const elapsed = now - e.startTime;
        const p = Math.min(1, elapsed / e.duration); // 计算动画的进度
        
        // 弹性缩放效果：scale 是方块的放大倍数
        const scale = 1.2 - (p * (1.1 - 0.2));  // 计算逐渐缩小的比例，结束时最小为 0.2
        
      
      
        ctx.save();
        ctx.translate(e.x, e.y);
        ctx.scale(scale, scale); // 使用计算后的 scale 进行缩放
        ctx.translate(-e.size / 2, -e.size / 2);
      
        const renderMap = {
          A: globalThis.renderBlockA,
          B: globalThis.renderBlockB,
          C: globalThis.renderBlockC,
          D: globalThis.renderBlockD,
          E: globalThis.renderBlockE,
          F: globalThis.renderBlockF,
        };
        const renderer = renderMap[e.blockType];

        if (renderer) {
          renderer(ctx, 0, 0, e.size, e.size);
        } else {
          ctx.fillStyle = '#999';
          ctx.fillRect(0, 0, e.size, e.size);
        }
        
        ctx.restore();
        
        if (p >= 1) remove.push(i);  // 动画完成，移除特效
      }

    /* === 粒子 =========================================== */
    else if (e.type === 'particle') {
      e.x += e.vx;  e.y += e.vy;
      ctx.globalAlpha = e.alpha * (e.life / 30);
      ctx.fillStyle = e.color;
      ctx.beginPath(); ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    }
  });

  // 批量移除
  for (let r = remove.length - 1; r >= 0; r--) effects.splice(remove[r],1);
}

/* ========= 工具函数 ===================================================== */
export function createProjectile(x0, y0, x1, y1, duration, onArrive) {
  effects.push({ type:'proj', x0, y0, x1, y1, duration, startTime:Date.now(), onArrive });
}
export function createFloatingText(text, x, y) {
  effects.push({ type:'float', text, x, y, startTime: Date.now() });
}

export function createExplosion(x, y, color = '#FFD700') {
    for (let i = 0; i < 8; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = Math.random() * 2 + 1;
      effects.push({
        type: 'particle',
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        radius: 4,
        color,
        alpha: 1,
        life: 30
      });
    }
  }
  

  export function createPopEffect(x, y, size, blockType, duration = 200, minScale = 0.6) {
    effects.push({
      type: 'pop',
      x,
      y,
      size,
      blockType,
      startTime: Date.now(),
      duration,
      minScale
    });
  }

  