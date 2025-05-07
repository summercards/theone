// js/block_effects/block_E.js

import { gridData, gridSize } from '../page_game.js';
import { createExplosion } from '../effects_engine.js';
import { logBattle } from '../utils/battle_log.js';

/**
 * 粉色方块消除后效果：
 * 随机选择1~2个位置，强制清除3x3区域内的所有方块
 * 即使同回合消除多个E，也最多触发两次范围爆炸
 */
export function onEliminatePinkBlock(count) {
  const blasts = Math.min(count, 2); // 限制最多触发两次

  for (let i = 0; i < blasts; i++) {
    const centerRow = Math.floor(Math.random() * gridSize);
    const centerCol = Math.floor(Math.random() * gridSize);
    let cleared = 0;

    for (let r = centerRow - 1; r <= centerRow + 1; r++) {
      for (let c = centerCol - 1; c <= centerCol + 1; c++) {
        if (r >= 0 && r < gridSize && c >= 0 && c < gridSize && gridData[r][c]) {
          createExplosion(
            window.__gridStartX + c * window.__blockSize + window.__blockSize / 2,
            window.__gridStartY + r * window.__blockSize + window.__blockSize / 2
          );
          gridData[r][c] = null;
          cleared++;
        }
      }
    }

    logBattle(`[E方块] 范围爆炸：清除 ${cleared} 格（来源E方块 ×${count}）`);
  }
}
