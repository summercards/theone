const { drawRoundedRect } = require('../utils/canvas_utils.js');

// 支持的超级方块类型
const SUPER_TYPES = ['S1', 'S2', 'S3'];

const SuperBlockSystem = {
  isSuper(block) {
    return block?.startsWith?.('S');
  },

  randomType() {
    return SUPER_TYPES[Math.floor(Math.random() * SUPER_TYPES.length)];
  },

  /**
   * 渲染不同超级方块
   */
  render(ctx, x, y, width, height, type = 'S1') {
    ctx.save();
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 4;
    ctx.fillStyle = '#FFF';
    ctx.font = `${Math.floor(width / 2.2)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    drawRoundedRect(ctx, x + 2, y + 2, width - 4, height - 4, 8, true, true);

    ctx.fillStyle = '#222';
    const displayMap = {
      S1: '★', // 星星
      S2: '⚡', // 闪电
      S3: '☢', // 辐射
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

    switch (type) {
      case 'S1':
        for (let c = 0; c < gridSize; c++) {
          gridData[row][c] = null;
        }
        break;
      case 'S2':
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            const r = row + dr, c = col + dc;
            if (r >= 0 && r < gridSize && c >= 0 && c < gridSize) {
              gridData[r][c] = null;
            }
          }
        }
        break;
      case 'S3':
        for (let r = 0; r < gridSize; r++) {
          for (let c = 0; c < gridSize; c++) {
            if (Math.random() < 0.1) gridData[r][c] = null;
          }
        }
        break;
    }

    // 可以加动画或粒子
  }
};

module.exports = SuperBlockSystem;
