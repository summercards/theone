const { drawRoundedRect } = require('../utils/canvas_utils.js');

const SuperBlockSystem = {
  /**
   * 判断是否为超级方块
   * @param {string} block
   * @returns {boolean}
   */
  isSuper(block) {
    return block === 'S';
  },

  /**
   * 超级方块触发逻辑（保留）
   * @param {number} row
   * @param {number} col
   * @param {CanvasRenderingContext2D} ctx
   */
  trigger(row, col, ctx) {
    console.log(`⚡ 超级方块触发 at (${row}, ${col})`);
    // TODO: 添加爆炸、清行等功能
  },

  /**
   * 渲染超级方块样式
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} x
   * @param {number} y
   * @param {number} width
   * @param {number} height
   */
  render(ctx, x, y, width, height) {
    ctx.save();

    ctx.strokeStyle = '#FFD700'; // 金色边
    ctx.lineWidth = 4;
    ctx.fillStyle = '#FFF';      // 白色底
    ctx.font = `${Math.floor(width / 2.2)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    drawRoundedRect(ctx, x + 2, y + 2, width - 4, height - 4, 8, true, true);

    ctx.fillStyle = '#222';      // 黑色字体
    ctx.fillText('S', x + width / 2, y + height / 2);

    ctx.restore();
  }
};

module.exports = SuperBlockSystem;
