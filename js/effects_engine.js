

import { drawRoundedRect } from './utils/canvas_utils.js'; // ✅ 添加这一行
import { getMonster } from './data/monster_state.js';
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

    effects.push({
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

  effects.forEach((e, i) => {
    if (e.type === 'avatar_flash') {
      // 头像闪动/弹跳效果
      const t = now - e.startTime;
      const p = t / e.duration;
      const slotIndex = e.slotIndex;
      // 动画结束：重置缩放与偏移
      if (p > 1) {
        // 动画结束时重置缩放和偏移
        globalThis.avatarSlotScales = globalThis.avatarSlotScales || {};
        globalThis.avatarSlotScales[slotIndex] = 1;
        globalThis.avatarSlotOffsets = globalThis.avatarSlotOffsets || {};
        globalThis.avatarSlotOffsets[slotIndex] = { x: 0, y: 0 };
        return remove.push(i);
      }
      // 如果传入的 scale 为 1，则不缩放，若大于 1 则按正弦曲线变化
      let scale;
      if (e.scale && e.scale !== 1) {
        scale = 1 + (e.scale - 1) * Math.sin(p * Math.PI);
      } else {
        scale = 1;
      }

      // 动态位移：根据正弦曲线完成从 0 到偏移量再返回 0 的过程
      const dynOffsetX = (e.offsetX || 0) * Math.sin(p * Math.PI);
      const dynOffsetY = (e.offsetY || 0) * Math.sin(p * Math.PI);

      // 更新全局偏移量与缩放供 UI 层使用
      globalThis.avatarSlotScales = globalThis.avatarSlotScales || {};
      globalThis.avatarSlotOffsets = globalThis.avatarSlotOffsets || {};
      globalThis.avatarSlotScales[slotIndex] = scale;
      globalThis.avatarSlotOffsets[slotIndex] = { x: dynOffsetX, y: dynOffsetY };

      // 无需在 effects 层应用 translate/scale，因为 UI 层会读取全局变量绘制
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
      const baseScale = (getMonster()?.spriteScale ?? 1.0); // ✅ 获取怪物原始缩放
      if (t > e.duration) {
        globalThis.monsterScale = undefined; // ✅ 恢复为 undefined，让绘图函数重新读取 spriteScale
        remove.push(i);
        return;
      }
      const p = t / e.duration;
      const bounce = 1 + 0.2 * Math.sin(p * Math.PI); // 弹性缩放因子
      globalThis.monsterScale = bounce * baseScale;  // ✅ 动态缩放基于原始倍数
    }
    

/* ==== 旧的 6px 黄色点 → 新的火球 ==== */
/* ==== 火球（大小随 power 变化） ==== */
else if (e.type === 'proj') {
    const now = Date.now();
    const p   = Math.min(1, (now - e.startTime) / e.duration);
  
    // 轨迹插值
    const x = e.x0 + (e.x1 - e.x0) * p;
    const y = e.y0 + (e.y1 - e.y0) * p;
  
    /* === 1) 根据伤害计算半径 === */
    const power = e.power || 1;                     // 没传时回落到 1
    const radius    = 10 + Math.min(20, Math.sqrt(power) * 0.5); // 10-30 px
    const tailProb  = 0.4 + Math.min(0.4, power / 5000);         // 0.4-0.8
  
    /* === 2) 火球本体 === */
    ctx.save();
    ctx.shadowColor = 'rgba(255,120,0,0.9)';
    ctx.shadowBlur  = radius * 1.5;
    const grad = ctx.createRadialGradient(x, y, 0, x, y, radius);
    grad.addColorStop(0.00, '#FFFFAA');
    grad.addColorStop(0.35, '#FF9933');
    grad.addColorStop(0.70, '#FF3300');
    grad.addColorStop(1.00, 'rgba(255,0,0,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  
    /* === 3) 粒子拖尾 === */
    if (Math.random() < tailProb) {
      effects.push({
        type:'particle',
        x, y,
        vx:(Math.random()-0.5)*0.4,
        vy:(Math.random()-0.5)*0.4,
        radius: 2 + Math.random() * (power > 2000 ? 4 : 2),
        color:'#FF9933',
        alpha:1,
        life:20
      });
    }
  
    /* === 4) 终点判定 === */
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
      const now = Date.now();
      const totalT = now - e.startTime;
      if (totalT > e.duration) return remove.push(i);
    
      ctx.save();
    
      e.particles.forEach(p => {
        const t = now - p.startTime;
        const life = p.life;
        if (t < 0 || t > life) return; // 尚未开始 或 已结束
    
        const progress = t / life; // 0~1
        const scale = 1 + 0.3 * Math.sin(progress * Math.PI); // 呼吸式缩放
    
        // alpha 渐隐可加可不加
        ctx.save();
        ctx.globalAlpha = 1.0; // 或: 1 - progress
    
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
    
      const rise = (t / e.duration) * 20; // ⬆️ 总共上升 30 像素
      
      const PARTICLE_PRESETS = { energySpark: {
        sprite: null,          // 用纯色圆
        colorStart: 'rgba(173, 255, 255, 0.9)', // 青蓝高光
        colorEnd:   'rgba(80,  150, 255, 0.0)', // 渐隐
        size: 20,              // 初始直径
        shrink: 0.92,          // 每帧收缩
        trail: true            // 让 drawParticle 画半透明拖尾
      },
     }
      ctx.save();
      ctx.globalAlpha = 1.0; // ❗始终不透明
    
      ctx.font = `bold ${e.size}px Impact, sans-serif`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = e.color;
    
      ctx.strokeText(e.text, e.x, e.y - rise);
      ctx.fillText(e.text, e.x, e.y - rise);
      ctx.restore();
    }
    

    else if (e.type === 'square_particle') {
      const t = now - e.startTime;
      if (t > e.duration) return;
    
      const progress = t / e.duration;
      const size = e.size * (1 - progress);         // 粒子逐渐变小
      const alpha = 1 - progress;                   // 逐渐透明
    
      const px = e.x + e.vx * t;
      const py = e.y + e.vy * t;
    
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = e.color;
      ctx.fillRect(px - size / 2, py - size / 2, size, size);
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
      
      else if (e.type === 'staticText') {
        const t = now - e.startTime;
        if (t > e.duration) return remove.push(i);
      
        ctx.save();
        ctx.globalAlpha = 1.0; // ❗ 不透明
        ctx.font = `bold ${e.size}px Impact, sans-serif`;
        ctx.fillStyle = e.color;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(e.text, e.x, e.y);
        ctx.restore();
      }
      
      else if (e.type === 'monster_attack_flash') {
        const t = now - e.startTime;
        const dur = e.duration;
        if (t > dur) return remove.push(i);
      
        const alpha = 0.3 + 0.2 * Math.sin((t / dur) * Math.PI * 2);
        const hpBar = globalThis.hpBarPos || { x: 24, y: 24, width: 280, height: 20 };
      
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = 'rgba(255,0,0,0.4)';
        drawRoundedRect(ctx, hpBar.x - 2, hpBar.y - 2, hpBar.width + 4, hpBar.height + 4, 8, true, false);
        ctx.restore();
      }
      else if (e.type === 'loot_chest') {            // 📦LootChest
        const img = globalThis.imageCache.lootChests?.[e.idx];
        if (!img || !img.complete) return;           // 图片还没加载好
      
        if (e.landed) {                              // ★落地后：直接画静止
          ctx.drawImage(img, e.x1 - 24, e.y1 - 24, 48, 48);
          return;                                    // 别进删除逻辑
        }
      
        // ★飞行中：抛物线插值
        const t = now - e.startTime;
        const p = Math.min(1, t / e.duration);
      
        const cx = (e.x0 + e.x1) / 2;                // 二次贝塞尔控制点
        const peakY = Math.min(e.y0, e.y1) - 120;    // 抬高 120 像素
        const x = (1 - p) * (1 - p) * e.x0 + 2 * (1 - p) * p * cx + p * p * e.x1;
        const y = (1 - p) * (1 - p) * e.y0 + 2 * (1 - p) * p * peakY + p * p * e.y1;
      
        ctx.drawImage(img, x - 24, y - 24, 48, 48);
      
        if (p >= 1) e.landed = true;                 // ★到站：改状态，不删
        return;                                      // 跳过统一 remove
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
        //if (p > shrinkThreshold) {
         // const blend = (p - shrinkThreshold) / (1 - shrinkThreshold); // 0 → 1
          // 简单线性混合原始色与蓝色
         // fillColor = blendColors(e.color, '#00AAFF', blend);
        //}
      
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
export function createProjectile(
      x0, y0, x1, y1, duration, onArrive,
      power = 1                       // ★ 新增参数，默认 1
    ) {
      effects.push({
        type:'proj', x0, y0, x1, y1,
        duration, power,              // ★ 多了 power 字段
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
    effects.push({ 
      type: 'float', 
      text, 
      x, 
      y, 
      color, 
      size, 
      duration, 
      startTime: Date.now() 
    });
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

// 支持可选偏移量：offsetX、offsetY 用于位移头像，例如攻击时向前弹出
export function createAvatarFlash(slotIndex, scale = 1.3, duration = 400, offsetX = 0, offsetY = 0) {
  effects.push({
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
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 1.5;
  
      effects.push({
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
  