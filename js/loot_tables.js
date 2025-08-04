// loot_tables.js —— 宝箱掉落表（使用系统 Emoji）
// --------------------------------------------------
const lootTables = {
    0: [ // S1 普通宝箱
      { icon: '💰', name: '金币',     min: 80, max: 150, weight: 60 },
      { icon: '🧪', name: '药水',     min:  1, max:   2, weight: 40 },
    ],
    1: [ // S2 进阶宝箱
      { icon: '💎', name: '钻石',     min:  1, max:   3, weight: 50 },
      { icon: '📜', name: '英雄碎片', min:  2, max:   4, weight: 50 },
    ],
    2: [ // S3 稀有宝箱
      { icon: '🛡️', name: '稀有装备', min:  1, max:   1, weight:100 },
    ],
  };
  
  /** rollLoot(chestId) → {icon, name, qty} */
  function rollLoot(chestId) {
    const pool  = lootTables[chestId] || [];
    const total = pool.reduce((s, v) => s + v.weight, 0);
    let r       = Math.random() * total;
    for (const it of pool) {
      if ((r -= it.weight) <= 0) {
        const qty = it.min + Math.floor(Math.random() * (it.max - it.min + 1));
        return { icon: it.icon, name: it.name, qty };
      }
    }
    return { icon: '❓', name: '未知物品', qty: 0 };   // 兜底
  }
  
  module.exports = { rollLoot };
  