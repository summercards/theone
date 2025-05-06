import BlockConfig from '../data/block_config.js';

/**
 * 查找网格中连续3个及以上的匹配
 */
export function findMatches(grid) {
  const matched = [];
  const size = grid.length;

  for (let i = 0; i < size; i++) {
    matched[i] = new Array(size).fill(false);
  }

  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size - 2; j++) {
      const val = grid[i][j];
      if (val && val === grid[i][j + 1] && val === grid[i][j + 2]) {
        matched[i][j] = matched[i][j + 1] = matched[i][j + 2] = true;
      }
    }
  }

  for (let j = 0; j < size; j++) {
    for (let i = 0; i < size - 2; i++) {
      const val = grid[i][j];
      if (val && val === grid[i + 1][j] && val === grid[i + 2][j]) {
        matched[i][j] = matched[i + 1][j] = matched[i + 2][j] = true;
      }
    }
  }

  return matched;
}

/**
 * 应用匹配结果并触发方块对应的效果（如伤害条、治疗等）
 */
export function applyMatches(grid, matched) {
  const size = grid.length;
  let changed = false;

  // 统计每种类型的被消除数量
  const eliminatedCounts = {};

  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size; j++) {
      if (matched[i][j]) {
        const blockType = grid[i][j];
        if (blockType) {
          eliminatedCounts[blockType] = (eliminatedCounts[blockType] || 0) + 1;
        }

        grid[i][j] = null;
        changed = true;
      }
    }
  }

  // 遍历执行每种被消除方块的 onEliminate 特效
  for (const [type, count] of Object.entries(eliminatedCounts)) {
    const config = BlockConfig[type];
    if (config?.onEliminate) {
      config.onEliminate(count);
    }
  }

  return changed;
}

/**
 * 下落逻辑 + 新方块生成
 */
export function collapseGrid(grid, blocks) {
  const size = grid.length;

  for (let j = 0; j < size; j++) {
    let emptyRow = size - 1;
    for (let i = size - 1; i >= 0; i--) {
      if (grid[i][j] !== null) {
        grid[emptyRow][j] = grid[i][j];
        if (emptyRow !== i) grid[i][j] = null;
        emptyRow--;
      }
    }
    while (emptyRow >= 0) {
      grid[emptyRow][j] = blocks[Math.floor(Math.random() * blocks.length)];
      emptyRow--;
    }
  }
}
