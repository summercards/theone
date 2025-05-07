// js/data/block_config.js

import { onEliminateRedBlock } from '../block_effects/block_A.js';
import { onEliminateBlueBlock } from '../block_effects/block_C.js';  
import { onEliminateYellowBlock } from '../block_effects/block_D.js'; 
import { onEliminateGreenBlock } from '../block_effects/block_B.js';
import { onEliminatePinkBlock } from '../block_effects/block_E.js';
import { onEliminateSupportBlock } from '../block_effects/block_F.js';

// 不同字母方块的属性定义，可根据关卡随时替换或扩展
const BlockConfig = {
  A: {
    color: '#FF4C4C',
    role: '战士',
    damage: 30,
    onEliminate: onEliminateRedBlock
  },
  B: {
    color: '#4CFF4C',
    role: '游侠',
    damage: 25,
    onEliminate: onEliminateGreenBlock  // ✅ 添加这行
  },
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
  E: {
    color: '#FF77FF',
    role: '刺客',
    damage: 22,
    onEliminate: onEliminatePinkBlock
  },
  F: {
    color: '#00FFFF',
    role: '辅助',
    damage: 20,
    onEliminate: onEliminateSupportBlock
  },
};

export default BlockConfig;
