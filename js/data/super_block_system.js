// js/data/super_block_system.js
// ──────────────────────────────────────────
// ★★  各超级方块的解锁关卡  ★★
const SUPER_UNLOCK_LEVEL = {
    S1: 5,   // 第 5 关 / 层起可用
    S2: 15,  // 第 15 关 / 层起可用
    S3: 25,  // 第 25 关 / 层起可用
  };
  // ──────────────────────────────────────────
  
  const { drawRoundedRect } = require('../utils/canvas_utils.js');
  const {
    createExplosion,
    createBlockPulseEffect,
    createShake,
    createFloatingText,
    createEnergyParticles,
    createChargeGlowEffect,
    createChargeReleaseEffect,
  } = require('../effects_engine.js');
  // 从全局缓存里取贴图，没有时返回 null
function getSuperTexture(type) {
    return (globalThis.imageCache && globalThis.imageCache[`super_${type}`]) || null;
  }
  // 外部若有用到可继续保留
  const SUPER_TYPES = ['S1', 'S2', 'S3'];
  
  const SuperBlockSystem = {
    /* 判定是否为超级方块 */
    isSuper(block) {
      return block?.startsWith?.('S');
    },
  
    /* 返回当前关卡 / 楼层已解锁的 S 方块列表 */
    unlockedSuperTypes(level) {
      return ['S1', 'S2', 'S3'].filter((t) => level >= SUPER_UNLOCK_LEVEL[t]);
    },
  
    /* 随机 1 个已解锁的 S 方块；若还未解锁返回 null */
    randomType(level) {
      const pool = this.unlockedSuperTypes(level);
      if (!pool.length) return null;
      return pool[Math.floor(Math.random() * pool.length)];
    },
  
    /* 渲染外观 */
    /* 渲染超级方块（贴图优先 + 脉动闪烁 + 描边） */
render(ctx, x, y, width, height, type = 'S1') {
    // 公用坐标 & 动态参数
    const centerX = x + width / 2;
    const centerY = y + height / 2;
    const now      = Date.now();
    const pulse    = 0.05 * Math.sin(now / 300);      // 6% 呼吸
    const scale    = 1 + pulse;
    const flicker  = 0.85 + 0.15 * Math.sin(now / 180);
  
    /* ——— 开始通用变换 (缩放 + 透明闪) ——— */
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.scale(scale, scale);
    ctx.translate(-centerX, -centerY);
    ctx.globalAlpha = flicker;
  
    /* ——— ① 优先绘制贴图 ——— */
    const tex = getSuperTexture(type);
    if (tex) {
          // —— 贴图发光版 —— //
          ctx.save();
        
          // 根据类型给不同色光，也可固定白色
          const glowMap = { S1: '#FFB04D', S2: '#66CCFF', S3: '#C785FF' };
          ctx.shadowBlur  = width * 0.18;                 // 羽化半径，≈宝石 18% 大小
          ctx.shadowColor = glowMap[type] || '#FFFFFF';   // 发光颜色
        
          // 关键：再画一次贴图，阴影会沿透明边缘外扩
          ctx.drawImage(tex, x, y, width, height);
        
          ctx.restore();             // 关掉阴影，接着往下走
    } else {
      /* ② 兜底：用旧的渐变符号 ——— */
      let startColor = '#FF0066', endColor = '#FF3366';
      switch (type) {
        case 'S1': startColor = '#FF0033'; endColor = '#FF3344'; break;
        case 'S2': startColor = '#0099FF'; endColor = '#33BBFF'; break;
        case 'S3': startColor = '#A071FF'; endColor = '#7B4CE8'; break;
      }
  
      const gradient = ctx.createRadialGradient(centerX, centerY, width * 0.2,
                                                centerX, centerY, width / 1.5);
      gradient.addColorStop(0, startColor);
      gradient.addColorStop(1, endColor);
  
      drawRoundedRect(ctx, x + 2, y + 2, width - 4, height - 4, 6, true, false);
  
      ctx.fillStyle   = gradient;
      ctx.strokeStyle = '#FFF';
      ctx.lineWidth   = 4;
      ctx.shadowBlur  = 10;
      ctx.shadowColor = '#FFD700';
      drawRoundedRect(ctx, x + 2, y + 2, width - 4, height - 4, 6, false, true);
  
      // 中心符号
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#222';
      ctx.font = `bold ${Math.floor(width * 0.6)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const displayMap = { S1: '★', S2: '⚡', S3: '☢' };
      ctx.fillText(displayMap[type] || 'S', centerX, centerY);
    }
  
    ctx.restore();   // ← 一并恢复 scale / alpha
  },
  
  
    /* 触发效果 & 清版逻辑 */
    trigger(row, col, ctx, gridData, gridSize) {
      const type = gridData[row][col];
      const blockSize = globalThis.__blockSize || 48;
      const centerX = globalThis.__gridStartX + col * blockSize + blockSize / 2;
      const centerY = globalThis.__gridStartY + row * blockSize + blockSize / 2;
  
      const colorMap = {
        S1: '#FF4444',
        S2: '#3EC0FF',
        S3: '#B478F1',
      };
      const color = colorMap[type] || '#FFD700';
  
      createShake(500, 6);
      createBlockPulseEffect(centerX, centerY, blockSize, 500, color);
  
      /* —— 个性化特效 —— */
      if (type === 'S1') {
        createExplosion(centerX, centerY, color);
        for (let i = 0; i < 6; i++) {
          const angle = Math.random() * Math.PI * 2;
          const dx = Math.cos(angle) * 60;
          const dy = Math.sin(angle) * 60;
          createEnergyParticles(centerX, centerY, centerX + dx, centerY + dy, color, 4);
        }
        createFloatingText('🔥 火力全开！', centerX, centerY - 30, color, 32);
      }
  
      if (type === 'S2') {
        createExplosion(centerX, centerY, color);
        for (let i = 0; i < 8; i++) {
          const dx = (Math.random() - 0.5) * 150;
          const dy = (Math.random() - 0.5) * 150;
          createEnergyParticles(centerX, centerY, centerX + dx, centerY + dy, '#66CCFF', 3);
        }
        createChargeGlowEffect(centerX - blockSize / 2, centerY - blockSize / 2, blockSize, blockSize, 500);
        createFloatingText('⚡ 电流释放！', centerX, centerY - 30, '#66CCFF', 28);
      }
  
      if (type === 'S3') {
        createExplosion(centerX, centerY, color);
        for (let i = 0; i < 12; i++) {
          const angle = (i * Math.PI * 2) / 12;
          const dx = Math.cos(angle) * 80;
          const dy = Math.sin(angle) * 80;
          createEnergyParticles(centerX, centerY, centerX + dx, centerY + dy, '#AA66CC', 2);
        }
        createChargeReleaseEffect(centerX - blockSize / 2, centerY - blockSize / 2, blockSize, blockSize, 500);
        createFloatingText('☢ 湮灭启动！', centerX, centerY - 30, '#AA66CC', 28);
      }
  
      /* —— 清屏规则 —— */
      switch (type) {
        case 'S1': // 横排炸
          for (let c = 0; c < gridSize; c++) gridData[row][c] = null;
          break;
  
        case 'S2': // 3×3 区域
          for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
              const r = row + dr,
                c = col + dc;
              if (r >= 0 && r < gridSize && c >= 0 && c < gridSize) {
                const x = globalThis.__gridStartX + c * blockSize + blockSize / 2;
                const y = globalThis.__gridStartY + r * blockSize + blockSize / 2;
                createBlockPulseEffect(x, y, blockSize, 400, color);
                gridData[r][c] = null;
              }
            }
          }
          break;
  
        case 'S3': // 全图随机 10%
          for (let r = 0; r < gridSize; r++) {
            for (let c = 0; c < gridSize; c++) {
              if (Math.random() < 0.1) {
                const x = globalThis.__gridStartX + c * blockSize + blockSize / 2;
                const y = globalThis.__gridStartY + r * blockSize + blockSize / 2;
                createBlockPulseEffect(x, y, blockSize, 400, color);
                gridData[r][c] = null;
              }
            }
          }
          break;
      }
  
      // 把自身清空
      gridData[row][col] = null;
    },
  };
  
  module.exports = SuperBlockSystem;
  