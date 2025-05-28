const { drawRoundedRect } = require('../utils/canvas_utils.js');
const { createExplosion, createBlockPulseEffect } = require('../effects_engine.js');

const SUPER_TYPES = ['S1', 'S2', 'S3'];

const SuperBlockSystem = {
  isSuper(block) {
    return block?.startsWith?.('S');
  },

  randomType() {
    return SUPER_TYPES[Math.floor(Math.random() * SUPER_TYPES.length)];
  },

  /**
   * 渲染不同超级方块（带缩放和光影动画 + 类型底色区分）
   */
  render(ctx, x, y, width, height, type = 'S1') {
    const centerX = x + width / 2;
    const centerY = y + height / 2;
    const r = 6;

    // 动态缩放 + 闪烁动画
    const now = Date.now();
    const pulse = 0.05 * Math.sin(now / 300);
    const scale = 1 + pulse;
    const flicker = 0.85 + 0.15 * Math.sin(now / 180);

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.scale(scale, scale);
    ctx.translate(-centerX, -centerY);
    ctx.globalAlpha = flicker;

    // 类型底色区分（更扁平化）
    let startColor = '#FFD700', endColor = '#FF4A6A';
    switch (type) {
      case 'S1':
        startColor = '#FF9A9A'; endColor = '#D84444'; break; // 红系
      case 'S2':
        startColor = '#8DDCFF'; endColor = '#3CA7E0'; break; // 蓝系
      case 'S3':
        startColor = '#D1B3FF'; endColor = '#8F6AE2'; break; // 紫系
    }

    const gradient = ctx.createRadialGradient(centerX, centerY, width * 0.2, centerX, centerY, width / 1.5);
    gradient.addColorStop(0, startColor);
    gradient.addColorStop(1, endColor);
    ctx.fillStyle = gradient;
    drawRoundedRect(ctx, x + 2, y + 2, width - 4, height - 4, r, true, false);

    // 白色发光描边
    ctx.strokeStyle = '#FFF';
    ctx.lineWidth = 4;
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#FFD700';
    drawRoundedRect(ctx, x + 2, y + 2, width - 4, height - 4, r, false, true);

    // 中央图标
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#222';
    ctx.font = `bold ${Math.floor(width * 0.6)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const displayMap = {
      S1: '★',
      S2: '⚡',
      S3: '☢',
    };
    ctx.fillText(displayMap[type] || 'S', centerX, centerY);

    ctx.restore();
  },

  /**
   * 不同超级方块的触发逻辑
   */
  trigger(row, col, ctx, gridData, gridSize) {
    const type = gridData[row][col];
    console.log(`⚡ 触发超级方块 ${type} at (${row}, ${col})`);

    const blockSize = globalThis.__blockSize || 48;
    const centerX = globalThis.__gridStartX + col * blockSize + blockSize / 2;
    const centerY = globalThis.__gridStartY + row * blockSize + blockSize / 2;

    // 中心爆炸 + 主 pulse 动画
    createExplosion(centerX, centerY, '#FFD700');
    createExplosion(centerX, centerY, '#FFD700');
    createBlockPulseEffect(centerX, centerY, blockSize);
    console.log('[特效] 播放 block_pulse at:', centerX, centerY, blockSize);

    switch (type) {
      case 'S1': // 清除整行
        for (let c = 0; c < gridSize; c++) {
          gridData[row][c] = null;
        }
        break;

      case 'S2': // 清除九宫格 + 每个格子播放 pulse
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            const r = row + dr, c = col + dc;
            if (r >= 0 && r < gridSize && c >= 0 && c < gridSize) {
              const x = globalThis.__gridStartX + c * blockSize + blockSize / 2;
              const y = globalThis.__gridStartY + r * blockSize + blockSize / 2;
              createBlockPulseEffect(x, y, blockSize);
              gridData[r][c] = null;
            }
          }
        }
        break;

      case 'S3': // 概率性全场清除 + 有概率播放 pulse
        for (let r = 0; r < gridSize; r++) {
          for (let c = 0; c < gridSize; c++) {
            if (Math.random() < 0.1) {
              const x = globalThis.__gridStartX + c * blockSize + blockSize / 2;
              const y = globalThis.__gridStartY + r * blockSize + blockSize / 2;
              createBlockPulseEffect(x, y, blockSize);
              gridData[r][c] = null;
            }
          }
        }
        break;
    }
  }
};

module.exports = SuperBlockSystem;
