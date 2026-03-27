

import { drawRoundedRect } from './utils/canvas_utils.js'; // ✅ 添加这一行
import { getMonster } from './data/monster_state.js';
// effects_engine.js  ★★★ 完整可用基线 ★★★
const effects = [];
let frameCount = 0;

const MAX_EFFECTS = 260;
const MAX_PARTICLES = 140;

function clamp01(v) {
  if (v <= 0) return 0;
  if (v >= 1) return 1;
  return v;
}

function easeOutCubic(t) {
  const p = 1 - clamp01(t);
  return 1 - p * p * p;
}

function easeOutQuad(t) {
  const p = clamp01(t);
  return 1 - (1 - p) * (1 - p);
}

function easeInOutSine(t) {
  const p = clamp01(t);
  return -(Math.cos(Math.PI * p) - 1) / 2;
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function countByType(type) {
  let count = 0;
  for (let i = 0; i < effects.length; i++) {
    if (effects[i].type === type) count++;
  }
  return count;
}

function canSpawnParticle(extra = 1) {
  return countByType('particle') + extra <= MAX_PARTICLES;
}

function pushEffect(effect) {
  if (effects.length >= MAX_EFFECTS) {
    const particleIndex = effects.findIndex(e => e.type === 'particle');
    if (particleIndex >= 0) effects.splice(particleIndex, 1);
    else effects.shift();
  }
  effects.push(effect);
}
/* ========= 基础更新渲染 ================================================= */
export function updateAllEffects() {
  // 粒子简单老化
  // 粒子在更新阶段统一衰减，避免在绘制阶段做过多判断

  // 删除过期
  for (let i = effects.length - 1; i >= 0; i--) {
    const e = effects[i];
    if (e.type !== 'particle') continue;
    e.life--;
    if (e.life <= 0) effects.splice(i, 1);
  }

  if (!effects.some(e => e.type === 'shake')) {
    globalThis.shakeOffset = { x: 0, y: 0 };
  }
}
/* === 📦LootChest: 创建抛物线宝箱 ======================= */
/* === 📦LootChest: 创建抛物线宝箱（带随机范围） ======================= */
export function createLootChest(x0, y0, x1, y1, duration = 600) {

    /* ---------- 可微调的随机参数 ---------- */
    const START_JITTER = 15;          // 起点 ±18px 的小方形内随机
    const DEST_HORIZONTAL_RANGE = 120;// 终点横向 ±150px（≈5 个头像总宽）
    const DEST_VERTICAL_RANGE   = 1; // 终点纵向 ±20px
  
    /* ---------- ① 起点随机 ---------- */
    x0 += (Math.random() - 0.5) * START_JITTER * 2;
    y0 += (Math.random() - 0.5) * START_JITTER * 2;
  
    /* ---------- ② 终点随机 ---------- */
    x1 += (Math.random() - 0.5) * DEST_HORIZONTAL_RANGE * 2;
    y1 += (Math.random() - 0.5) * DEST_VERTICAL_RANGE * 2;
  
    /* ---------- ③ 入列：根据当前敌人的稀有度决定宝箱类型 ---------- */
    const variants = globalThis.imageCache.lootChests;
    let idx;
    try {
      const mon = typeof getMonster === 'function' ? getMonster() : null;
      const rarity = mon?.rarityTier || 'white';
      const rand = Math.random();
      if (rarity === 'white') {
        // 白色敌人只能掉落普通宝箱
        idx = 0;
      } else if (rarity === 'green') {
        // 绿色敌人只能掉落普通或银宝箱，金箱禁掉
        // 80% 普通、20% 银
        idx = rand < 0.8 ? 0 : 1;
      } else {
        // 蓝色及以上敌人可以掉落三种宝箱
        // 60% 普通，30% 银，10% 金
        if (rand < 0.6) idx = 0;
        else if (rand < 0.9) idx = 1;
        else idx = 2;
      }
      // 若 variants 少于对应索引数量，回退到最大索引范围内
      if (!variants || idx >= variants.length) {
        idx = Math.min(idx, (variants?.length || 1) - 1);
      }
    } catch (err) {
      // 回退随机
      idx = Math.floor(Math.random() * (variants?.length || 1));
    }

    // === 记录统计 =========================
    const key = `宝箱${idx + 1}`;               // 友好的类型名，可换成自己喜欢的
    globalThis.currentChestStats = globalThis.currentChestStats || {};
    globalThis.currentChestStats[key] = (globalThis.currentChestStats[key] || 0) + 1;

    globalThis.chestDropsThisRound = globalThis.chestDropsThisRound || [];
    globalThis.chestDropsThisRound.push(idx);   // idx 为 0-based，下标越小＝S1
    // ======================================

    pushEffect({
      type: 'loot_chest',
      idx,            // 记录选中的宝箱贴图索引
      x0, y0, x1, y1,
      startTime: Date.now(),
      duration
    });
  }
  // effects_engine.js
export function clearLootChests () {
    for (let i = effects.length - 1; i >= 0; i--) {
      if (effects[i].type === 'loot_chest') effects.splice(i, 1);
    }
  }
  
export function drawAllEffects(ctx, canvas) {
  const now = Date.now();
  const remove = [];
  let hasActiveShake = false;

  effects.forEach((e, i) => {
    if (e.type === 'avatar_flash') {
      const t = now - e.startTime;
      const p = clamp01(t / e.duration);
      const slotIndex = e.slotIndex;
      if (t > e.duration) {
        globalThis.avatarSlotScales = globalThis.avatarSlotScales || {};
        globalThis.avatarSlotScales[slotIndex] = 1;
        globalThis.avatarSlotOffsets = globalThis.avatarSlotOffsets || {};
        globalThis.avatarSlotOffsets[slotIndex] = { x: 0, y: 0 };
        return remove.push(i);
      }
      let scale = (e.scale && e.scale !== 1) ? 1 + (e.scale - 1) * Math.sin(p * Math.PI) : 1;
      const dynOffsetX = (e.offsetX || 0) * Math.sin(p * Math.PI);
      const dynOffsetY = (e.offsetY || 0) * Math.sin(p * Math.PI);
      globalThis.avatarSlotScales = globalThis.avatarSlotScales || {};
      globalThis.avatarSlotOffsets = globalThis.avatarSlotOffsets || {};
      globalThis.avatarSlotScales[slotIndex] = scale;
      globalThis.avatarSlotOffsets[slotIndex] = { x: dynOffsetX, y: dynOffsetY };
    }
    else if (e.type === 'shake') {
      const t = now - e.startTime;
      const dur = Math.max(1, e.duration || 300);
      if (t > dur) return remove.push(i);
      const p = clamp01(t / dur);
      const damp = (1 - p) * (1 - p);
      const phase = e.phase || 0;
      const amp = (e.intensity || 5) * damp;
      const offsetX = Math.sin(t * 0.045 + phase) * amp;
      const offsetY = Math.sin(t * 0.06 + phase * 1.7) * amp * 0.65;
      globalThis.shakeOffset = { x: offsetX, y: offsetY };
      hasActiveShake = true;
    }
    else if (e.type === 'basketball') {
      const t = now - e.startTime;
      const p = clamp01(t / e.duration);
      const cx = e.canvasWidth / 2;
      const cy = e.canvasHeight / 2;
      const travelX = 160;
      const peakY = 80;
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
      const radius = 22 + 10 * Math.sin(p * Math.PI);
      const angle = p * Math.PI * 4;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      const basketballImg = globalThis.imageCache?.['basketball'];
      if (basketballImg && basketballImg.complete && basketballImg.width > 0) {
        ctx.drawImage(basketballImg, -radius, -radius, radius * 2, radius * 2);
      } else {
        ctx.fillStyle = '#FFA500';
        ctx.beginPath(); ctx.arc(0, 0, radius, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
      if (p >= 1) {
        createExplosion(x, y);
        createMonsterBounce();
        globalThis.monsterHitFlashTime = Date.now();
        remove.push(i);
      }
    }
    else if (e.type === 'monster_bounce') {
      const t = now - e.startTime;
      const dur = e.duration || 300;
      if (t > dur) {
        globalThis.monsterScaleX = 1.0;
        globalThis.monsterScaleY = 1.0;
        remove.push(i);
        return;
      }
      const p = clamp01(t / dur);
      const hit = easeInOutSine(Math.min(1, p * 1.2));
      const rebound = Math.sin(p * Math.PI * 2.2) * Math.exp(-2.8 * p);
      globalThis.monsterScaleX = 1 + 0.14 * hit + 0.05 * rebound;
      globalThis.monsterScaleY = 1 - 0.18 * hit - 0.04 * rebound;
    }
    else if (e.type === 'proj') {
      const duration = e.durationClamp || e.duration || 500;
      const pRaw = clamp01((now - e.startTime) / duration);
      const p = easeOutCubic(pRaw);
      const x = lerp(e.x0, e.x1, p);
      const lineY = lerp(e.y0, e.y1, p);
      const arc = Math.sin(pRaw * Math.PI) * Math.min(42, Math.abs(e.y1 - e.y0) * 0.2 + 20);
      const y = lineY - arc;
      const power = e.power || 1;
      const radius = 9 + Math.min(17, Math.sqrt(power) * 0.45);
      const tailProb = 0.22 + Math.min(0.28, power / 8000);
      ctx.save();
      ctx.shadowColor = 'rgba(255,120,0,0.9)';
      ctx.shadowBlur = radius * 1.1;
      const grad = ctx.createRadialGradient(x, y, 0, x, y, radius);
      grad.addColorStop(0.00, '#FFFFAA');
      grad.addColorStop(0.35, '#FF9933');
      grad.addColorStop(0.70, '#FF3300');
      grad.addColorStop(1.00, 'rgba(255,0,0,0)');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      if (Math.random() < tailProb && canSpawnParticle()) {
        const maxLife = 16;
        pushEffect({
          type: 'particle',
          x,
          y,
          vx: (Math.random() - 0.5) * 0.35,
          vy: (Math.random() - 0.5) * 0.35,
          radius: 1.5 + Math.random() * (power > 2000 ? 3 : 1.5),
          color: '#FF9933',
          alpha: 1,
          life: maxLife,
          maxLife
        });
      }
      if (pRaw >= 1) { e.onArrive?.(); remove.push(i); }
    }
    else if (e.type === 'float') {
      const t = now - e.startTime;
      const life = e.duration || 1000;
      if (t > life) { remove.push(i); return; }
      const progress = t / life;
      ctx.save();
      const popScale = 1 + 0.28 * Math.sin(Math.min(1, progress / 0.32) * Math.PI);
      const fade = progress < 0.74 ? 1 : 1 - (progress - 0.74) / 0.26;
      ctx.globalAlpha = Math.max(0, fade);
      const baseSize = e.size || 36;
      ctx.font = 'bold ' + Math.floor(baseSize * popScale) + 'px Impact, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const flyY = e.y - easeOutCubic(progress) * 72;
      const wobble = Math.sin(progress * Math.PI * 3 + (e.wobbleSeed || 0)) * 2.2 * (1 - progress);
      ctx.translate(e.x + wobble, flyY);
      ctx.strokeStyle = 'black'; ctx.lineWidth = 4; ctx.fillStyle = e.color || '#FF4444';
      ctx.strokeText(e.text, 0, 0); ctx.fillText(e.text, 0, 0);
      ctx.restore();
    }
    else if (e.type === 'block_pulse') {
      const totalT = now - e.startTime;
      if (totalT > e.duration) return remove.push(i);
      ctx.save();
      e.particles.forEach(p => {
        const t = now - p.startTime;
        if (t < 0 || t > p.life) return;
        const progress = t / p.life;
        const scale = 1 + 0.3 * Math.sin(progress * Math.PI);
        ctx.save();
        ctx.translate(e.x + p.offsetX, e.y + p.offsetY);
        ctx.scale(scale, scale);
        ctx.translate(-p.size / 2, -p.size / 2);
        ctx.fillStyle = e.color || '#FFD700';
        ctx.fillRect(0, 0, p.size, p.size);
        ctx.restore();
      });
      ctx.restore();
    }
    else if (e.type === 'floatUp') {
      const t = now - e.startTime;
      if (t > e.duration) return remove.push(i);
      const rise = (t / e.duration) * 20;
      ctx.save();
      ctx.font = 'bold ' + e.size + 'px Impact, sans-serif';
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillStyle = e.color;
      ctx.strokeText(e.text, e.x, e.y - rise); ctx.fillText(e.text, e.x, e.y - rise);
      ctx.restore();
    }
    else if (e.type === 'square_particle') {
      const t = now - e.startTime;
      if (t > e.duration) return remove.push(i);
      const progress = t / e.duration;
      const size = e.size * (1 - progress);
      const alpha = 1 - progress;
      const px = e.x + e.vx * t;
      const py = e.y + e.vy * t;
      ctx.save();
      ctx.globalAlpha = alpha; ctx.fillStyle = e.color;
      ctx.fillRect(px - size / 2, py - size / 2, size, size);
      ctx.restore();
    }
    else if (e.type === 'fire_glow') {
      const time = (Date.now() - e.startTime) / 1000;
      const alpha = 0.2 + 0.1 * Math.sin(time * 2 * Math.PI / 4);
      const maxRadius = canvas.width * 0.4;
      const grad = ctx.createRadialGradient(canvas.width/2, canvas.height-50, 0, canvas.width/2, canvas.height-50, maxRadius);
      grad.addColorStop(0, 'rgba(255, 140, 0, ' + alpha + ')');
      grad.addColorStop(1, 'rgba(255, 140, 0, 0)');
      ctx.save(); ctx.fillStyle = grad;
      ctx.fillRect(canvas.width/2 - maxRadius, canvas.height - 50 - maxRadius, maxRadius * 2, maxRadius * 2);
      ctx.restore();
    }
    else if (e.type === 'pop') {
      const p = Math.min(1, (now - e.startTime) / e.duration);
      const scale = 1.2 - (p * 0.9);
      ctx.save(); ctx.translate(e.x, e.y); ctx.scale(scale, scale); ctx.translate(-e.size / 2, -e.size / 2);
      const renderer = globalThis['renderBlock' + e.blockType];
      if (renderer) renderer(ctx, 0, 0, e.size, e.size);
      else { ctx.fillStyle = '#999'; ctx.fillRect(0, 0, e.size, e.size); }
      ctx.restore();
      if (p >= 1) remove.push(i);
    }
    else if (e.type === 'particle') {
      e.x += e.vx; e.y += e.vy;
      const maxLife = e.maxLife || 30;
      ctx.globalAlpha = e.alpha * Math.max(0, Math.min(1, e.life / maxLife));
      ctx.fillStyle = e.color;
      ctx.beginPath(); ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    }
    else if (e.type === 'charge_release') {
      const p = Math.min(1, (now - e.startTime) / e.duration);
      const alpha = 1 - p;
      const glowW = e.width * (1 + p);
      const glowH = e.height * (1 + p * 0.5);
      ctx.save(); ctx.globalAlpha = alpha;
      const grad = ctx.createRadialGradient(e.x+e.width/2, e.y+e.height/2, 0, e.x+e.width/2, e.y+e.height/2, glowW/2);
      grad.addColorStop(0, 'rgba(200,255,255,0.6)'); grad.addColorStop(1, 'rgba(0,160,255,0)');
      ctx.fillStyle = grad; ctx.fillRect(e.x - (glowW-e.width)/2, e.y - (glowH-e.height)/2, glowW, glowH);
      ctx.restore();
      if (p >= 1) remove.push(i);
    }
    else if (e.type === 'skill_dialog') {
      const t = now - e.startTime;
      const life = e.duration || 1200;
      if (t > life) return remove.push(i);
      ctx.save();
      const scale = t < 200 ? 0.6 + 0.4 * (t / 200) : 1;
      ctx.font = 'bold 15px IndieFlower, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const iconSize = 48, spacing = 12;
      const x = (canvas.width - (5 * iconSize + 4 * spacing)) / 2 + e.slotIndex * (iconSize + spacing) + iconSize / 2;
      const y = globalThis.__gridStartY - 80;
      const text = e.text || '';
      const boxWidth = ctx.measureText(text).width + 20, boxHeight = 15 + 20;
      ctx.translate(x, y); ctx.scale(scale, scale);
      const grad = ctx.createLinearGradient(0, -boxHeight, 0, 0);
      grad.addColorStop(0, '#FFFFFF'); grad.addColorStop(1, '#FFFBE8');
      ctx.beginPath();
      ctx.moveTo(-boxWidth / 2 + 8, -boxHeight); ctx.lineTo(boxWidth / 2 - 8, -boxHeight);
      ctx.quadraticCurveTo(boxWidth / 2, -boxHeight, boxWidth / 2, -boxHeight + 8);
      ctx.lineTo(boxWidth / 2, -8 - 8); ctx.quadraticCurveTo(boxWidth / 2, -8, boxWidth / 2 - 8, -8);
      ctx.lineTo(6, -8); ctx.lineTo(0, 0); ctx.lineTo(-6, -8);
      ctx.lineTo(-boxWidth / 2 + 8, -8); ctx.quadraticCurveTo(-boxWidth / 2, -8, -boxWidth / 2, -8 - 8);
      ctx.lineTo(-boxWidth / 2, -boxHeight + 8); ctx.quadraticCurveTo(-boxWidth / 2, -boxHeight, -boxWidth / 2 + 8, -boxHeight);
      ctx.closePath();
      ctx.fillStyle = grad; ctx.strokeStyle = 'rgba(100, 100, 100, 0.3)'; ctx.lineWidth = 1.5; ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#222'; ctx.fillText(text, 0, -boxHeight / 2);
      ctx.restore();
    }
    else if (e.type === 'staticText') {
      const t = now - e.startTime;
      if (t > e.duration) return remove.push(i);
      ctx.save(); ctx.font = 'bold ' + e.size + 'px Impact, sans-serif'; ctx.fillStyle = e.color;
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(e.text, e.x, e.y);
      ctx.restore();
    }
    else if (e.type === 'monster_attack_flash') {
      const t = now - e.startTime;
      if (t > e.duration) return remove.push(i);
      const alpha = 0.3 + 0.2 * Math.sin((t / e.duration) * Math.PI * 2);
      const hpBar = globalThis.hpBarPos || { x: 24, y: 24, width: 280, height: 20 };
      ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = 'rgba(255,0,0,0.4)';
      drawRoundedRect(ctx, hpBar.x - 2, hpBar.y - 2, hpBar.width + 4, hpBar.height + 4, 8, true, false);
      ctx.restore();
    }
    else if (e.type === 'loot_chest') {
      const img = globalThis.imageCache.lootChests?.[e.idx];
      if (!img || !img.complete) return;
      if (e.landed) { ctx.drawImage(img, e.x1 - 24, e.y1 - 24, 48, 48); return; }
      const p = Math.min(1, (now - e.startTime) / e.duration);
      const cx = (e.x0 + e.x1) / 2, peakY = Math.min(e.y0, e.y1) - 120;
      const x = (1 - p) * (1 - p) * e.x0 + 2 * (1 - p) * p * cx + p * p * e.x1;
      const y = (1 - p) * (1 - p) * e.y0 + 2 * (1 - p) * p * peakY + p * p * e.y1;
      ctx.drawImage(img, x - 24, y - 24, 48, 48);
      if (p >= 1) e.landed = true;
      return;
    }
    else if (e.type === 'charge_glow') {
      const p = Math.min(1, (now - e.startTime) / e.duration);
      const alpha = 1 - p;
      ctx.save(); ctx.globalAlpha = alpha; ctx.strokeStyle = 'rgba(0, 200, 255, ' + (0.8 * alpha) + ')';
      ctx.lineWidth = 4; ctx.shadowColor = 'rgba(0, 200, 255, ' + (0.6 * alpha) + ')'; ctx.shadowBlur = 10;
      drawRoundedRect(ctx, e.x - 1, e.y - 1, e.width + 2, e.height + 2, 4, false, true);
      ctx.restore();
      if (p >= 1) remove.push(i);
    }
    else if (e.type === 'energy_particle') {
      const t = now - e.startTime; if (t < 0) return;
      const p = Math.min(1, t / e.duration);
      const x = e.x0 + (e.x1 - e.x0) * p, y = e.y0 + (e.y1 - e.y0) * p;
      const scale = (p < 0.8) ? 1 : 1 - (1 - 0.2) * ((p - 0.8) / 0.2);
      ctx.save(); ctx.fillStyle = e.color;
      ctx.beginPath(); ctx.arc(x, y, e.radius * scale, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      if (p >= 1) remove.push(i);
    }
});

  if (!hasActiveShake) {
    globalThis.shakeOffset = { x: 0, y: 0 };
  }

  for (let r = remove.length - 1; r >= 0; r--) effects.splice(remove[r], 1);

}

/* ========= 工具函数 ===================================================== */
export function createProjectile(
      x0, y0, x1, y1, duration, onArrive,
      power = 1                       // ★ 新增参数，默认 1
    ) {
      pushEffect({
        type:'proj', x0, y0, x1, y1,
        duration, power,              // ★ 多了 power 字段
        durationClamp: Math.max(220, duration || 500),
        startTime: Date.now(), onArrive
      });
    }

/* === 能量星光粒子（Combo ➜ 伤害巢） ===================== */
export function createEnergyParticles(x0, y0, x1, y1,
  color = '#A3F4FF', // 能量蓝
  count = 10) {
const now = Date.now();
for (let i = 0; i < count; i++) {
const offset = i * 40;                 // 依次稍延迟
effects.push({
type: 'energy_particle',
x0, y0, x1, y1,
startTime: now + offset,
duration: 250,                       // 0.5 s 飞行
radius: 5 + Math.random() * 2,
color
});
}
}

  
  export function createFloatingText(text, x, y, color = '#FF4444', size = 36, duration = 1000) {
    pushEffect({ 
      type: 'float', 
      text, 
      x, 
      y, 
      color, 
      size, 
      duration, 
      startTime: Date.now(),
      wobbleSeed: Math.random() * Math.PI * 2
    });
  }

export function createExplosion(x, y, color = '#FFD700', count = 6) {
  const burstCount = Math.max(3, Math.min(10, count | 0));
  for (let i = 0; i < burstCount; i++) {
    if (!canSpawnParticle()) break;
    const a = Math.random() * Math.PI * 2;
    const s = Math.random() * 2 + 1;
    const maxLife = 20 + Math.floor(Math.random() * 8);
    pushEffect({
      type: 'particle',
      x,
      y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s,
      radius: 4,
      color,
      alpha: 1,
      life: maxLife,
      maxLife
    });
  }
}

export function createPopEffect(x, y, size, blockType, duration = 200, minScale = 0.6) {
  pushEffect({
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
  const dur = Math.max(220, Math.min(520, duration || 300));
  for (let i = effects.length - 1; i >= 0; i--) {
    if (effects[i].type === 'monster_bounce') effects.splice(i, 1);
  }
  pushEffect({
    type: 'monster_bounce',
    startTime: Date.now(),
    duration: dur
  });
}

// 支持可选偏移量：offsetX、offsetY 用于位移头像，例如攻击时向前弹出
export function createAvatarFlash(slotIndex, scale = 1.3, duration = 400, offsetX = 0, offsetY = 0) {
  pushEffect({
    type: 'avatar_flash',
    slotIndex,
    startTime: Date.now(),
    duration,
    scale,
    offsetX,
    offsetY
  });
}

export function createShake(duration = 500, intensity = 5) {
  const now = Date.now();
  const dur = Math.max(120, duration || 300);
  const amp = Math.max(1, intensity || 5);

  for (let i = effects.length - 1; i >= 0; i--) {
    if (effects[i].type !== 'shake') continue;
    effects[i].startTime = now;
    effects[i].duration = Math.max(effects[i].duration || 0, dur);
    effects[i].intensity = Math.max(effects[i].intensity || 0, amp);
    return;
  }

  pushEffect({
    type: 'shake',
    startTime: now,
    duration: dur,
    intensity: amp,
    phase: Math.random() * Math.PI * 2
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

  export function createBlockPulseEffect(x, y, size = 48, duration = 400, color = '#FFD700') {
    const particleCount = 2 + Math.floor(Math.random() * 2); // 2~3 个粒子
  
    const particles = [];
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        offsetX: (Math.random() - 0.5) * size * 0.6,
        offsetY: (Math.random() - 0.5) * size * 0.6,
        size: 10 + Math.random() * 6,
        startTime: Date.now() + i * 30,             // 每个粒子可以略微错峰
        life: 300 + Math.random() * 150             // 每个粒子生命周期
      });
    }
  
    effects.push({
      type: 'block_pulse',
      x,
      y,
      size,
      color,
      startTime: Date.now(),
      duration,
      particles,   // 💡 加上粒子数组
    });
  
    // 然后额外添加多粒子效果（小方块）
    for (let i = 0; i < 10 + Math.floor(Math.random() * 4); i++) {
      if (!canSpawnParticle()) break;
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 1.5;
  
      pushEffect({
        type: 'square_particle',
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 6,
        color: color,
        startTime: Date.now(),
        duration: 300 + Math.random() * 400
      });
    }
  }
  
  
  export function createFireParticles(canvas, count = 1) {
    for (let i = 0; i < count; i++) {
      if (!canSpawnParticle()) break;
      const startX = Math.random() * canvas.width;
      const startY = canvas.height - Math.random() * 40;
  
      // 判断是否为“大粒子”
      const isBig = Math.random() < 0.35;
      pushEffect({
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



export function withSlideInAnim(ctx, index, targetY, drawFn, from = 'top', delayPer = 100, duration = 400) {
  const startTime = globalThis.victoryPopupStartTime || 0;
  const delay = index * delayPer;
  const now = Date.now();
  const elapsed = now - startTime - delay;

  if (elapsed < 0) return;

  const p = Math.min(elapsed / duration, 1);
  const eased = 1 - Math.pow(1 - p, 3); // ease-out 动画曲线
  const offset = (1 - eased) * (from === 'top' ? -100 : 100); // 初始偏移量

  ctx.save();
  ctx.translate(0, offset + targetY);
  drawFn();
  ctx.restore();
}

export function createStaticText(text, x, y, color = '#FFFFFF', size = 20, duration = 1000) {
  effects.push({
    type: 'staticText',
    text,
    x,
    y,
    color,
    size,
    duration,
    startTime: Date.now()
  });
}
export function createFloatingTextUp(text, x, y, color = '#66CCFF', size = 20, duration = 1000) {
  effects.push({
    type: 'floatUp',
    text,
    x,
    y,
    color,
    size,
    duration,
    startTime: Date.now()
  });
}
export function createHeroLevelUpEffectAt(x, y) {
    createFloatingTextUp('升级！', x, y, '#FFD700', 26, 1000);
    for (let i = 0; i < 12; i++) {
      effects.push({
        type: 'particle',
        x: x + (Math.random() - 0.5) * 30,
        y: y + 10 + Math.random() * 10,
        vx: 0,
        vy: -0.5 - Math.random() * 0.5,
        radius: 2 + Math.random() * 1.5,
        color: '#FFD700',
        alpha: 1,
        life: 30 + Math.floor(Math.random() * 10)
      });
    }
  }
export function createHeroLevelUpEffect(slotIndex) {
    // 获取头像位置
    const size = 48;
    const spacing = 12;
    const totalWidth = 5 * size + 4 * spacing;
    const canvas = globalThis.canvasRef;
    const startX = (canvas.width - totalWidth) / 2;
    const topMargin = globalThis.__gridStartY - 80;
    const x = startX + slotIndex * (size + spacing) + size / 2;
    const y = topMargin;
  
    // 漂浮“升级”字样
    createFloatingTextUp('升级！', x, y, '#FFD700', 26, 1000);
  
    // 粒子上升特效
    for (let i = 0; i < 12; i++) {
      effects.push({
        type: 'particle',
        x: x + (Math.random() - 0.5) * 30,
        y: y + 10 + Math.random() * 10,
        vx: 0,
        vy: -0.5 - Math.random() * 0.5,
        radius: 2 + Math.random() * 1.5,
        color: '#FFD700',
        alpha: 1,
        life: 30 + Math.floor(Math.random() * 10)
      });
    }
  }
  export function createGoldParticles(x0, y0, count = 3) {
    const endX = 40 + Math.random() * 10;
    const endY = 126 + Math.random() * 6;
  
    const now = Date.now();
    for (let i = 0; i < count; i++) {
      const offsetDelay = i * 60;
      effects.push({
        type: 'energy_particle',
        x0, y0, x1: endX, y1: endY,
        startTime: now + offsetDelay,
        color: '#FFD700',
        duration: 600 + Math.random() * 200,
        radius: 6 + Math.random() * 2
      });
    }
  }
  export function createMonsterAttackFlash(duration = 400) {
    effects.push({
      type: 'monster_attack_flash',
      startTime: Date.now(),
      duration
    });
  }
  
  export function playFireballEffect(fromX, fromY, toX, toY, size = 48, duration = 500) {
    const startTime = Date.now();
  
    const canvas = globalThis.canvasRef;
    const ctx = canvas?.getContext?.('2d');
    if (!ctx) return;
  
    const img = new Image();
    img.src = 'assets/effects/fireball.png'; // ✅ 放火球图片在 assets/effects 目录下
  
    function animate() {
      const now = Date.now();
      const t = Math.min(1, (now - startTime) / duration);
  
      const x = fromX + (toX - fromX) * t;
      const y = fromY + (toY - fromY) * t;
  
      globalThis.__effects_next_frame = () => {
        if (!img.complete) return;
        ctx.save();
        ctx.globalAlpha = 1;
        ctx.drawImage(img, x - size / 2, y - size / 2, size, size);
        ctx.restore();
      };
  
      if (t < 1) requestAnimationFrame(animate);
    }
  
    animate();
  }
  
