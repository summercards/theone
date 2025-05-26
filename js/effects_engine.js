import { drawRoundedRect } from './utils/canvas_utils.js'; // ✅ 添加这一行

// effects_engine.js  ★★★ 完整可用基线 ★★★
const effects = [];
let frameCount = 0;
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
      ctx.translate(x + (e.offsetX || 0), y + (e.offsetY || 0));
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
    else if (e.type === "basketball") {
      const t = now - e.startTime;
      const p = Math.min(t / e.duration, 1);
    
      const cx = e.canvasWidth / 2;
      const cy = e.canvasHeight / 2;
    
      const travelX = 160;
      const peakY = 80;
    
      // 轨迹计算
      let x, y;
      if (p < 0.5) {
        const t1 = p * 2;
        x = cx + travelX * t1;
        y = cy - Math.sin(t1 * Math.PI) * peakY;
      } else {
        const t2 = (p - 0.5) * 2;
        const targetX = cx;
        const targetY = 200;
        x = cx + travelX * (1 - t2);
        y = cy + (targetY - cy) * t2 - Math.sin(t2 * Math.PI) * 20;
      }
    
      // 🔁 动态放大半径
      const baseRadius = 22;
      const radius = baseRadius + 10 * Math.sin(p * Math.PI); // 最大变大到 32
    
      // 🔁 旋转角度
      const angle = p * Math.PI * 4;
    
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
    
      const basketballImg = globalThis.imageCache?.['basketball'];

      if (
        basketballImg &&
        typeof basketballImg.width === 'number' &&
        basketballImg.complete &&
        basketballImg.width > 0
      ) {
        ctx.drawImage(basketballImg, -radius, -radius, radius * 2, radius * 2);
      } else {
        // 图像未加载成功，回退为橙色圆球
        ctx.fillStyle = "#FFA500";
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.fill();
      }
    
      ctx.restore();
    
      // 命中判定：播放爆炸 & 闪白 & 弹跳
      if (p >= 1) {
        // ✅ 只保留视觉反馈，不处理伤害
        createExplosion(x, y); // 动画爆点
        createMonsterBounce(); // 怪物弹跳
        globalThis.monsterHitFlashTime = Date.now(); // 闪白反馈
      
        remove.push(i); // 移除动画
      }
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
    else if (e.type === 'block_pulse') {
      const t = now - e.startTime;
      const p = t / e.duration;
      if (p >= 1) return remove.push(i);
    
      const scale = 1 + 0.2 * Math.sin(p * Math.PI);
    
      ctx.save();
      ctx.translate(e.x, e.y);
      ctx.scale(scale, scale);
      ctx.translate(-e.size / 2, -e.size / 2);
    
      ctx.fillStyle = '#FFD700';
      drawRoundedRect(ctx, 0, 0, e.size, e.size, 6, true, false);
    
      ctx.restore();
    }
    else if (e.type === 'fire_glow') {
        const centerX = canvas.width / 2;
        const glowY = canvas.height - 50;
        const maxRadius = canvas.width * 0.4;
      
        // 呼吸透明度：慢慢地明暗变化
        const time = (Date.now() - e.startTime) / 1000; // 秒
        const alpha = 0.2 + 0.1 * Math.sin(time * 2 * Math.PI / 4); // 周期约4秒
      
        const gradient = ctx.createRadialGradient(centerX, glowY, 0, centerX, glowY, maxRadius);
        gradient.addColorStop(0, `rgba(255, 140, 0, ${alpha})`);
        gradient.addColorStop(1, `rgba(255, 140, 0, 0)`);
      
        ctx.save();
        ctx.fillStyle = gradient;
        ctx.fillRect(centerX - maxRadius, glowY - maxRadius, maxRadius * 2, maxRadius * 2);
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
    else if (e.type === 'charge_release') {
        const t = now - e.startTime;
        const p = Math.min(1, t / e.duration);
      
        const alpha = 1 - p;
        const glowW = e.width * (1 + p); // 扩散效果
        const glowH = e.height * (1 + p * 0.5);
      
        ctx.save();
        ctx.globalAlpha = alpha;
        const grad = ctx.createRadialGradient(
          e.x + e.width / 2, e.y + e.height / 2, 0,
          e.x + e.width / 2, e.y + e.height / 2, glowW / 2
        );
        grad.addColorStop(0, 'rgba(200,255,255,0.6)');
        grad.addColorStop(1, 'rgba(0,160,255,0)');
      
        ctx.fillStyle = grad;
        ctx.fillRect(e.x - (glowW - e.width) / 2, e.y - (glowH - e.height) / 2, glowW, glowH);
        ctx.restore();
      
        if (p >= 1) remove.push(i);
      }

      else if (e.type === 'skill_dialog') {
        const now = Date.now();
        const t = now - e.startTime;
        const life = e.duration || 1200;
        if (t > life) return remove.push(i);
      
        ctx.save();
      
        const appearDur = 200;
        const scale = t < appearDur ? 0.6 + 0.4 * (t / appearDur) : 1;
      
        const fontSize = 15;
        const padding = 10;
      
        ctx.font = `bold ${fontSize}px IndieFlower, sans-serif`; // ✅ 更轻盈风格字体
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
      
        const iconSize = 48;
        const spacing = 12;
        const totalWidth = 5 * iconSize + 4 * spacing;
        const startX = (canvas.width - totalWidth) / 2;
        const x = startX + e.slotIndex * (iconSize + spacing) + iconSize / 2;
        const y = globalThis.__gridStartY - 80;
      
        const text = e.text || '';
        const metrics = ctx.measureText(text);
        const boxWidth = metrics.width + padding * 2;
        const boxHeight = fontSize + padding * 2;
      
        const arrowW = 12;
        const arrowH = 8;
        const radius = 8;
      
        const boxTop = -boxHeight;
        const boxBottom = 0;
      
        ctx.translate(x, y);
        ctx.scale(scale, scale);
      
        // ✅ 渐变填充（白 → #fffbe8）
        const grad = ctx.createLinearGradient(0, boxTop, 0, boxBottom);
        grad.addColorStop(0, '#FFFFFF');
        grad.addColorStop(1, '#FFFBE8');
      
        ctx.beginPath();
        ctx.moveTo(-boxWidth / 2 + radius, boxTop);
        ctx.lineTo(boxWidth / 2 - radius, boxTop);
        ctx.quadraticCurveTo(boxWidth / 2, boxTop, boxWidth / 2, boxTop + radius);
        ctx.lineTo(boxWidth / 2, boxBottom - arrowH - radius);
        ctx.quadraticCurveTo(boxWidth / 2, boxBottom - arrowH, boxWidth / 2 - radius, boxBottom - arrowH);
        ctx.lineTo(arrowW / 2, boxBottom - arrowH);
        ctx.lineTo(0, boxBottom);
        ctx.lineTo(-arrowW / 2, boxBottom - arrowH);
        ctx.lineTo(-boxWidth / 2 + radius, boxBottom - arrowH);
        ctx.quadraticCurveTo(-boxWidth / 2, boxBottom - arrowH, -boxWidth / 2, boxBottom - arrowH - radius);
        ctx.lineTo(-boxWidth / 2, boxTop + radius);
        ctx.quadraticCurveTo(-boxWidth / 2, boxTop, -boxWidth / 2 + radius, boxTop);
        ctx.closePath();
      
        ctx.fillStyle = grad;
        ctx.strokeStyle = 'rgba(100, 100, 100, 0.3)'; // ✅ 柔和描边
        ctx.lineWidth = 1.5;
        ctx.shadowColor = 'rgba(0,0,0,0.1)';
        ctx.shadowBlur = 4;
        ctx.fill();
        ctx.stroke();
      
        // ✅ 文本样式美化
        ctx.shadowColor = 'transparent';
        ctx.fillStyle = '#222';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
        ctx.shadowBlur = 2;
        ctx.fillText(text, 0, boxTop + boxHeight / 2);
      
        ctx.restore();
      }
      

      
      else if (e.type === 'charge_glow') {
        const t = now - e.startTime;
        const p = Math.min(1, t / e.duration);
        const alpha = 1 - p;
      
        ctx.save();
        ctx.globalAlpha = alpha;
      
        // 蓝色描边发光
        ctx.strokeStyle = `rgba(0, 200, 255, ${0.8 * alpha})`;
        ctx.lineWidth = 4;
        ctx.shadowColor = `rgba(0, 200, 255, ${0.6 * alpha})`;
        ctx.shadowBlur = 10;
      
        drawRoundedRect(ctx, e.x - 1, e.y - 1, e.width + 2, e.height + 2, 4, false, true);
        ctx.restore();
      
        if (p >= 1) remove.push(i);
      }

      

    else if (e.type === 'energy_particle') {
        const t = now - e.startTime;
        if (t < 0) return;
        const p = Math.min(1, t / e.duration);
      
        const x = e.x0 + (e.x1 - e.x0) * p;
        const y = e.y0 + (e.y1 - e.y0) * p;
      
// 粒子缩放（在最后 20% 缩小，但不小于 60%）
const shrinkThreshold = 0.8;
const baseRadius = e.radius;
const minScale = 0.2;

const scale = (p < shrinkThreshold)
  ? 1
  : 1 - (1 - minScale) * ((p - shrinkThreshold) / (1 - shrinkThreshold));

const radius = baseRadius * scale;
      
        // 粒子颜色变化（末尾渐变为蓝色）
        let fillColor = e.color;
        if (p > shrinkThreshold) {
          const blend = (p - shrinkThreshold) / (1 - shrinkThreshold); // 0 → 1
          // 简单线性混合原始色与蓝色
          fillColor = blendColors(e.color, '#00AAFF', blend);
        }
      
        ctx.save();
        ctx.globalAlpha = 1.0; // 始终不透明
        ctx.fillStyle = fillColor;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
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
        type: 'energy_particle',
        x0, y0, x1, y1,
        startTime: now + offsetDelay,
        color,
        duration: 500 + Math.random() * 150,
        radius: 4 + Math.random() * 2
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

function blendColors(color1, color2, t) {
    // 支持 '#RRGGBB' 格式
    const c1 = hexToRgb(color1);
    const c2 = hexToRgb(color2);
    const r = Math.round(c1.r + (c2.r - c1.r) * t);
    const g = Math.round(c1.g + (c2.g - c1.g) * t);
    const b = Math.round(c1.b + (c2.b - c1.b) * t);
    return `rgb(${r},${g},${b})`;
  }
  
  function hexToRgb(hex) {
    const parsed = hex.replace('#', '');
    return {
      r: parseInt(parsed.substring(0, 2), 16),
      g: parseInt(parsed.substring(2, 4), 16),
      b: parseInt(parsed.substring(4, 6), 16),
    };
  }
  export function createChargeReleaseEffect(x, y, width, height, duration = 400) {
    effects.push({
      type: 'charge_release',
      x, y, width, height,
      startTime: Date.now(),
      duration
    });
  }
  export function createChargeGlowEffect(x, y, width, height, duration = 400) {
    effects.push({
      type: 'charge_glow',
      x, y, width, height,
      startTime: Date.now(),
      duration
    });
  }

  export function createSkillDialog(slotIndex, text, duration = 1200) {
    effects.push({
      type: 'skill_dialog',
      slotIndex,
      text,
      startTime: Date.now(),
      duration,
    });
  }

  export function playBasketballEffect(canvas) {
    const startTime = Date.now();
    effects.push({
      type: "basketball",
      startTime,
      duration: 800, // 动画总时长
      canvasWidth: canvas.width,
      canvasHeight: canvas.height,
    });
  }

  export function createBlockPulseEffect(x, y, size = 48, duration = 400) {
    effects.push({
      type: 'block_pulse',
      x,
      y,
      size,
      startTime: Date.now(),
      duration,
    });
  }
  export function createFireParticles(canvas, count = 1) {
    for (let i = 0; i < count; i++) {
      const startX = Math.random() * canvas.width;
      const startY = canvas.height - Math.random() * 40;
  
      // 判断是否为“大粒子”
      const isBig = Math.random() < 0.35;
  
      effects.push({
        type: 'particle',
        x: startX,
        y: startY,
        vx: (Math.random() - 0.5) * 0.15, // 水平轻微抖动
  
        vy: Math.random() < 0.3
          ? -0.1 - Math.random() * 0.1    // 30% 慢速：-0.1 ~ -0.2
          : -0.3 - Math.random() * 0.3,   // 70% 快速：-0.3 ~ -0.6
  
        radius: isBig
          ? 3.0 + Math.random() * 1.0     // 15% 大粒子：2.0 ~ 3.0
          : 2.0 + Math.random() * 0.5,    // 85% 普通粒子：1.0 ~ 1.5
  
        color: '#FF9933',
        alpha: 1,
  
        life: Math.random() < 0.3
          ? 220 + Math.floor(Math.random() * 10)   // 30% 短命：20-29
          : 260 + Math.floor(Math.random() * 30)   // 70% 长命：60-89
      });
    }
  }
  export function drawFireGlow(ctx, canvas, frame) {
    const centerX = canvas.width / 2;
    const centerY = canvas.height - 40;
    const radius = canvas.width * 0.4;
  
    // 使用低频率的 sin 波生成 alpha，制造“呼吸”感
    const glowAlpha = 0.25 + 0.1 * Math.sin(frame * 0.02); // 平滑变化在 0.15 ~ 0.35 之间
  
    const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
    gradient.addColorStop(0, `rgba(255, 140, 0, ${glowAlpha.toFixed(3)})`);
    gradient.addColorStop(1, `rgba(255, 140, 0, 0)`);
  
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fill();
  }
  
  export function createPersistentFireGlow(canvas) {
    // 只添加一次
    const exists = effects.some(e => e.type === 'fire_glow');
    if (!exists) {
      effects.push({
        type: 'fire_glow',
        canvas,
        startTime: Date.now()
      });
    }
  }
  

  export function createFireGlow(canvas, count = 1) {
    // 可以加参数控制频率或强度，但这里只调用一次即可
    drawFireGlow(globalThis.ctxRef || canvas.getContext('2d'), canvas, ++frameCount);
  }
  export function removeFireGlowEffect() {
    for (let i = effects.length - 1; i >= 0; i--) {
      if (effects[i].type === 'fire_glow') {
        effects.splice(i, 1);
      }
    }
  }