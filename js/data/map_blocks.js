// js/data/map_blocks.js
export const DEFAULT_BLOCKS = ['A','B','C','D','E','F']; // 全局兜底（可改）

// 每张地图允许出现的方块集合（按你项目的地图 key 改）
// 想禁用某些符号，就别写进去即可
export const MapBlockDefaults = {
  forest:  ['A','B','D','F','E'],         // 森林
  plains:  ['A','B','D','F','E'],      // 平原
  desert:  ['A','B','C','D','E','F'],           // 荒漠（例：不出 C/E）
  volcano:  ['A','B','C','D','E','F'],          // 火山（例：偏火）
  // 若你还有 snow → 可单独指定；如果你项目里把 snow 归并成 plains，这里也可直接写成与 plains 一样
  // snow: ['A','B','C','D','E','F','G']
};
