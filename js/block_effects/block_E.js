const img_E = wx.createImage();
img_E.src = "assets/blocks/E.png";

export function renderBlockE(ctx, x, y, width, height) {
  if (img_E.complete) {
    ctx.drawImage(img_E, x, y, width, height);
  } else {
    ctx.fillStyle = '#FF77FF';
    ctx.fillRect(x, y, width, height);
    ctx.fillStyle = '#FFF';
    ctx.font = `${Math.floor(height / 2.5)}px sans-serif`;
    ctx.fillText('E', x + width / 3, y + height * 0.65);
  }
}

import {
  gridData, __gridStartX, __gridStartY, __blockSize,
  dropBlocks, fillNewBlocks, checkAndClearMatches
} from '../page_game.js';

import { createExplosion } from '../effects_engine.js';
import { logBattle } from '../utils/battle_log.js';

export function onEliminatePinkBlock(count) {
  const blasts = Math.min(count, 2);
  const size = globalThis.gridSize; // ✅ 动态读取当前棋盘大小

  for (let i = 0; i < blasts; i++) {
    const centerRow = Math.floor(Math.random() * size);
    const centerCol = Math.floor(Math.random() * size);
    let cleared = 0;

    for (let r = centerRow - 1; r <= centerRow + 1; r++) {
      for (let c = centerCol - 1; c <= centerCol + 1; c++) {
        if (r >= 0 && r < size && c >= 0 && c < size && gridData[r][c]) {
          createExplosion(
            __gridStartX + c * __blockSize + __blockSize / 2,
            __gridStartY + r * __blockSize + __blockSize / 2
          );
          gridData[r][c] = null;
          cleared++;
        }
      }
    }

    logBattle(`[E方块] 范围爆炸：清除 ${cleared} 格（来源E方块 ×${count}）`);
  }

  setTimeout(() => {
    dropBlocks();
    fillNewBlocks();
    setTimeout(() => {
      checkAndClearMatches();
    }, 180);
  }, 180);
}
