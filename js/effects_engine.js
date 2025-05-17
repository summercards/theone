

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

export function drawAllEffects(ctx, canvas) {
  const now = Date.now();
  const remove = [];

  effects.forEach((e, i) => {
    if (e.type === 'avatar_flash') {
      const t = now - e.startTime;
      const p = t / e.duration;
      if (p > 1) return remove.push(i);

      const slotIndex = e.slotIndex;
      const scale = 1 + (e.scale - 1) * Math.sin(p * Math.PI);

      // 计算头像位置
      const size = 48;
      const spacing = 12;
      const totalWidth = 5 * size + 4 * spacing;
      const startX = (canvas?.width || 400 - totalWidth) / 2;
      const topMargin = globalThis.__gridStartY - 80;
      const x = startX + slotIndex * (size + spacing) + size / 2;
      const y = topMargin + size / 2;

      ctx.save();
      ctx.translate(x, y);
      ctx.scale(scale, scale);

      // 记录放大状态
      globalThis.avatarSlotScales = globalThis.avatarSlotScales || {};
      globalThis.avatarSlotScales[slotIndex] = scale;

      ctx.restore();
    }

    else if (e.type === 'shake') {
      const t = now - e.startTime;
      if (t > e.duration) return remove.push(i);

      const p = t / e.duration;
      const amp = e.intensity * (1 - p); // 衰减震动
      const offsetX = (Math.random() - 0.5) * amp * 2;
      const offsetY = (Math.random() - 0.5) * amp * 2;
      globalThis.shakeOffset = { x: offsetX, y: offsetY };
    }

    else if (e.type === 'monster_bounce') {
      const t = now - e.startTime;
      if (t > e.duration) {
        globalThis.monsterScale = 1;
        remove.push(i);
        return;
      }
      const p = t / e.duration;
      const scale = 1 + 0.2 * Math.sin(p * Math.PI);
      globalThis.monsterScale = scale;
    }

    else if (e.type === 'proj') {
      const p = Math.min(1, (now - e.startTime) / e.duration);
      const x = e.x0 + (e.x1 - e.x0) * p;
      const y = e.y0 + (e.y1 - e.y0) * p;
      ctx.fillStyle = '#FFAA00';
      ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2); ctx.fill();
      if (p === 1) { e.onArrive?.(); remove.push(i); }
    }

    else if (e.type === 'float') {
      const t = now - e.startTime;
      const life = e.duration || 1000;
      if (t > life) { remove.push(i); return; }

      ctx.save();
      ctx.globalAlpha = 1 - t / life;

      // ✅ 使用 Impact 字体，大小动态
      const baseSize = e.size || 36;
      const fontSize = Math.floor(baseSize * (1 + 0.2 * Math.sin((1 - t / life) * Math.PI)));

      ctx.font = `bold ${fontSize}px Impact, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      ctx.translate(e.x, e.y - t * 0.05);

      // ✅ 黑色描边 + 彩色填充
      ctx.strokeStyle = 'black';
      ctx.lineWidth = 4;
      ctx.fillStyle = e.color || '#FF4444';

      ctx.strokeText(e.text, 0, 0);
      ctx.fillText(e.text, 0, 0);

      ctx.restore();
    }

    else if (e.type === 'pop') {
      const elapsed = now - e.startTime;
      const p = Math.min(1, elapsed / e.duration);
      const scale = 1.2 - (p * (1.1 - 0.2));

      ctx.save();
      ctx.translate(e.x, e.y);
      ctx.scale(scale, scale);
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
      if (p >= 1) remove.push(i);
    }

    else if (e.type === 'particle') {
      e.x += e.vx;
      e.y += e.vy;
      ctx.globalAlpha = e.alpha * (e.life / 30);
      ctx.fillStyle = e.color;
      ctx.beginPath(); ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    }
    else if (e.type === 'energy_particle') {
        const t = now - e.startTime;
        if (t < 0) return; // 延迟未到
        const p = Math.min(1, t / e.duration);
        const x = e.x0 + (e.x1 - e.x0) * p;
        const y = e.y0 + (e.y1 - e.y0) * p;
      
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(e.rotation);
        
        // ✨ 控制渐变只在末尾 20% 进行
        let finalColor;
        if (p < 0.8) {
          finalColor = e.color; // 前 80% 保持原色
        } else {
          // 末尾 20% 渐变为蓝色
          const lerpT = (p - 0.8) / 0.2; // 映射到 [0, 1]
          finalColor = lerpColor(e.color, '#00BFFF', lerpT);
        }
        
        // 🎨 渐变函数（RGB 线性插值）
        function lerpColor(startColor, endColor, t) {
          const parse = (c) => c.length === 4
            ? c.match(/[0-9a-f]/gi).map(ch => parseInt(ch + ch, 16))
            : c.match(/[0-9a-f]{2}/gi).map(hex => parseInt(hex, 16));
        
          const [r1, g1, b1] = parse(startColor.replace('#', ''));
          const [r2, g2, b2] = parse(endColor.replace('#', ''));
        
          const r = Math.round(r1 + (r2 - r1) * t);
          const g = Math.round(g1 + (g2 - g1) * t);
          const b = Math.round(b1 + (b2 - b1) * t);
          return `rgb(${r},${g},${b})`;
        }
        
        // 🔹 缩放：飞行过程中粒子逐渐变小
        const scale = 1 - p * 0.4;
        const size = e.radius * 2 * scale;
        
        ctx.fillStyle = finalColor;
        ctx.globalAlpha = 1;
        ctx.fillRect(-size / 2, -size / 2, size, size);
        
        ctx.restore();
      
        if (p >= 1) remove.push(i);
      }
  });

  for (let r = remove.length - 1; r >= 0; r--) effects.splice(remove[r], 1);
  
}

/* ========= 工具函数 ===================================================== */
export function createProjectile(x0, y0, x1, y1, duration, onArrive) {
  effects.push({ type: 'proj', x0, y0, x1, y1, duration, startTime: Date.now(), onArrive });
}

export function createEnergyParticles(x0, y0, x1, y1, color = '#FFD700', count = 6) {
    const now = Date.now();
    for (let i = 0; i < count; i++) {
      const offsetDelay = i * 50; // 每个粒子稍有延迟
      effects.push({
        rotation: Math.random() * Math.PI * 2,
        type: 'energy_particle',
        x0, y0, x1, y1,
        startTime: now + offsetDelay,
        color,
        duration: 500 + Math.random() * 150,
        radius: (4 + Math.random() * 2) * 1
      });
    }
  }
  
export function createFloatingText(text, x, y, color = '#FF4444', size = 36, duration = 1000) {
  effects.push({ type: 'float', text, x, y, color, size, duration, startTime: Date.now() });
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

export function createMonsterBounce(duration = 300) {
  effects.push({
    type: 'monster_bounce',
    startTime: Date.now(),
    duration
  });
}

export function createAvatarFlash(slotIndex, scale = 1.3, duration = 400) {
  effects.push({
    type: 'avatar_flash',
    slotIndex,
    startTime: Date.now(),
    duration,
    scale
  });
}

export function createShake(duration = 500, intensity = 5) {
  effects.push({
    type: 'shake',
    startTime: Date.now(),
    duration,
    intensity
  });
}

export function showDamageText(damage, x, y) {
  const color = damage > 10000 ? '#FFFF00'
              : damage > 2000 ? '#FF6600'
              : '#FF4444';

  const size = damage > 10000 ? 64
              : damage > 2000 ? 48
              : 36;

  createFloatingText(`-${damage}`, x, y, color, size);
}