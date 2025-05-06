// js/data/block_config.js

import { onEliminateRedBlock } from '../block_effects/block_A.js';
import { onEliminateBlueBlock } from '../block_effects/block_C.js';  // 顶部加入
import { onEliminateYellowBlock } from '../block_effects/block_D.js'; // 顶部添加

// 不同字母方块的属性定义，可根据关卡随时替换或扩展
const BlockConfig = {
  A: {
    color: '#FF4C4C',
    role: '战士',
    damage: 30,
    onEliminate: onEliminateRedBlock
  },
  B: { color: '#4CFF4C', role: '游侠', damage: 25 },
  C: {
    color: '#4C4CFF',
    role: '法师',
    damage: 28,
    onEliminate: onEliminateBlueBlock
  },
  D: {
    color: '#FFD700',
    role: '坦克',
    damage: 15,
    onEliminate: onEliminateYellowBlock
  },
  E: { color: '#FF69B4', role: '刺客', damage: 35 },
  F: { color: '#00FFFF', role: '牧师', damage: 20 }
};

export default BlockConfig;
