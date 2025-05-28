const { drawRoundedRect } = require('../utils/canvas_utils.js');
const {
  createExplosion,
  createBlockPulseEffect,
  createShake,
  createFloatingText,
  createEnergyParticles,
  createChargeGlowEffect,
  createChargeReleaseEffect
} = require('../effects_engine.js');

const SUPER_TYPES = ['S1', 'S2', 'S3'];

const SuperBlockSystem = {
  isSuper(block) {
    return block?.startsWith?.('S');
  },

  randomType() {
    return SUPER_TYPES[Math.floor(Math.random() * SUPER_TYPES.length)];
  },

  render(ctx, x, y, width, height, type = 'S1') {
    const centerX = x + width / 2;
    const centerY = y + height / 2;
    const r = 6;

    const now = Date.now();
    const pulse = 0.05 * Math.sin(now / 300);
    const scale = 1 + pulse;
    const flicker = 0.85 + 0.15 * Math.sin(now / 180);

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.scale(scale, scale);
    ctx.translate(-centerX, -centerY);
    ctx.globalAlpha = flicker;

    let startColor = '#FFD700', endColor = '#FF4A6A';
    switch (type) {
      case 'S1': startColor = '#FF9A9A'; endColor = '#D84444'; break;
      case 'S2': startColor = '#8DDCFF'; endColor = '#3CA7E0'; break;
      case 'S3': startColor = '#D1B3FF'; endColor = '#8F6AE2'; break;
    }

    const gradient = ctx.createRadialGradient(centerX, centerY, width * 0.2, centerX, centerY, width / 1.5);
    gradient.addColorStop(0, startColor);
    gradient.addColorStop(1, endColor);
    ctx.fillStyle = gradient;
    drawRoundedRect(ctx, x + 2, y + 2, width - 4, height - 4, r, true, false);

    ctx.strokeStyle = '#FFF';
    ctx.lineWidth = 4;
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#FFD700';
    drawRoundedRect(ctx, x + 2, y + 2, width - 4, height - 4, r, false, true);

    ctx.shadowBlur = 0;
    ctx.fillStyle = '#222';
    ctx.font = `bold ${Math.floor(width * 0.6)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const displayMap = { S1: '★', S2: '⚡', S3: '☢' };
    ctx.fillText(displayMap[type] || 'S', centerX, centerY);
    ctx.restore();
  },

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

    // 个性效果区分
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
        const angle = i * (Math.PI * 2 / 12);
        const dx = Math.cos(angle) * 80;
        const dy = Math.sin(angle) * 80;
        createEnergyParticles(centerX, centerY, centerX + dx, centerY + dy, '#AA66CC', 2);
      }
      createChargeReleaseEffect(centerX - blockSize / 2, centerY - blockSize / 2, blockSize, blockSize, 500);
      createFloatingText('☢ 湮灭启动！', centerX, centerY - 30, '#AA66CC', 28);
    }

    // 功能逻辑
    switch (type) {
      case 'S1':
        for (let c = 0; c < gridSize; c++) gridData[row][c] = null;
        break;

      case 'S2':
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            const r = row + dr, c = col + dc;
            if (r >= 0 && r < gridSize && c >= 0 && c < gridSize) {
              const x = globalThis.__gridStartX + c * blockSize + blockSize / 2;
              const y = globalThis.__gridStartY + r * blockSize + blockSize / 2;
              createBlockPulseEffect(x, y, blockSize, 400, color);
              gridData[r][c] = null;
            }
          }
        }
        break;

      case 'S3':
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

    // 清除自身
    gridData[row][col] = null;
  }
};

module.exports = SuperBlockSystem;
