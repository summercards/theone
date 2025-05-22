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
   * 渲染不同超级方块（带缩放和光影动画）
   */
  render(ctx, x, y, width, height, type = 'S1') {
    const now = Date.now();
    const pulse = 0.05 * Math.sin(now / 300); // 缩放幅度 ±5%
    const scale = 1 + pulse;
    const flicker = 0.85 + 0.15 * Math.sin(now / 180); // 透明度闪烁

    const centerX = x + width / 2;
    const centerY = y + height / 2;

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.scale(scale, scale);
    ctx.translate(-centerX, -centerY);

    ctx.globalAlpha = flicker;

    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 4;
    ctx.fillStyle = '#FFF';
    ctx.font = `${Math.floor(width / 2.2)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    drawRoundedRect(ctx, x + 2, y + 2, width - 4, height - 4, 8, true, true);

    ctx.fillStyle = '#222';
    const displayMap = {
      S1: '★',
      S2: '⚡',
      S3: '☢',
    };
    ctx.fillText(displayMap[type] || 'S', x + width / 2, y + height / 2);

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
