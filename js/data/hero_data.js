// ✅ js/data/hero_data.js
const HeroData = {
  heroes: [
    {
      id: "hero001",
      name: "勇者",
      icon: "swordsman.png",
      role: "战士",
      rarity: "R",
      hireCost: 20,         // ✅ 新增字段
      locked: false,          // ← 默认已解锁
      unlockCost: 0,
      hp: 80, // ✅ 新增
      attributes: { physical: 5 },
      level: 1,
      exp: 0,
      expToNextLevel: 100,
      levelUpConfig: {
        attributeGrowth: { physical: 2 },
        hpGrowth: 10, // ✅ 新增，每升一级增加 10 点 HP
        unlockSkills: {}
      },
      skill: {
        name: "破甲斩",
        description: "将自身物攻注入伤害槽",
        effect: { type: "addGauge", source: "physical", scale: 10 },
        cooldown: 3
      }
    },

    {
      id: "hero002",
      name: "阿紫",
      icon: "archer.png",
      role: "游侠",
      rarity: "R",
      hireCost: 20,         // ✅ 新增字段
      locked: true,           // ← 现在锁定
      unlockCost: 3,        // ← 解锁需要 200 金币
      hp: 80, // ✅ 新增
      attributes: { physical: 8, magical: 5 },
      level: 1,
      exp: 0,
      expToNextLevel: 100,
      levelUpConfig: {
        attributeGrowth: { physical: 2, magical: 1 },
        unlockSkills: { 3: "piercingRain" }
      },
      skill: {
        name: "精灵悦动",
        description: "将当前伤害池翻倍",
        effect: { type: "mulGauge", factor: 1.1 },
        cooldown: 2
      }
    },
    {
      id: "hero003",
      name: "凯瑟琳",
      icon: "mage.png",
      role: "法师",
      rarity: "R",
      hireCost: 20,         // ✅ 新增字段
      locked: true,
      hp: 80, // ✅ 新增
      unlockBy: "ad",
      attributes: { physical: 2, magical: 10 },
      level: 1,
      exp: 0,
      expToNextLevel: 100,
      levelUpConfig: {
        attributeGrowth: { magical: 3 },
        unlockSkills: { 4: "meteorStorm" }
      },
      skill: {
        name: "火球术",
        description: "发射火球造成范围魔法伤害",
        effect: { type: "magicalDamage", amount: 130 },
        cooldown: 4
      }
    },
    {
      id: "hero004",
      name: "旺财",
      icon: "knight.png",
      role: "坦克",
      rarity: "R",
      hireCost: 20,         // ✅ 新增字段
      locked: true,
      unlockCost: 300,
      attributes: { physical: 7, magical: 3 },
      level: 1,
      exp: 0,
      expToNextLevel: 100,
      levelUpConfig: {
        attributeGrowth: { physical: 3, magical: 1 },
        unlockSkills: {}
      },
      skill: {
        name: "汪！",
        description: "清除所有金币方块，每个金币方块获得5金币",
        effect: { type: "clearCoinBlocks", coinPerBlock: 5 },
        cooldown: 3
      }
      
    },
    {
      id: "hero005",
      name: "鼠鼠",
      icon: "assassin.png",
      role: "刺客",
      rarity: "R",
      hireCost: 20,         // ✅ 新增字段
      locked: true,
      unlockCost: 600,
      attributes: { physical: 10, magical: 2 },
      level: 1,
      exp: 0,
      expToNextLevel: 100,
      levelUpConfig: {
        attributeGrowth: { physical: 4 },
        unlockSkills: { 5: "shadowKill" }
      },
      skill: {
        name: "爆炸咯！",
        description: "随机将棋盘上的若干方块变成刺客方块（E），每级增加一个",
        effect: { type: "convertToEBlocks" },
        cooldown: 3
      }
    },

    {
      id: "hero006",
      name: "小蘑菇",
      icon: "priest.png",
      role: "辅助",
      rarity: "R",
      hireCost: 20,         // ✅ 新增字段
      locked: true,
      unlockCost: 0,
      attributes: { magical: 7, healing: 10 },
      level: 1,
      exp: 0,
      expToNextLevel: 100,
      levelUpConfig: {
        attributeGrowth: { magical: 2, healing: 3 },
        unlockSkills: { 3: "divineGrace" }
      },
      skill: {
        name: "能量共鸣",
        description: "所有在场英雄的技能条增加 10% + 等级%",
        effect: { type: "boostAllGauge" },
        cooldown: 3
      }
      
    },

    {
      id: "hero007",
      name: "地狱吼",
      icon: "swordsman2.png",
      role: "战士",
      rarity: "SR",
      hireCost: 20,         // ✅ 新增字段
      locked: true,
      unlockCost: 400,
      attributes: { physical: 12 },
      level: 1,
      exp: 0,
      expToNextLevel: 100,
      levelUpConfig: {
        attributeGrowth: { physical: 3 }
      },
      skill: {
        name: "狂热连斩",
        description: "连续斩击，初始2次，每级+1，每次造成自身物攻伤害，后续每击提升10%。",
        effect: {
          type: "multiHitPhysical",
          baseHits: 2,
          baseScale: 1.0,
          scaleStep: 0.1,
          delayStep: 300,
          growthPerLevel: 1   // ⬅️ 新增字段
        },
        cooldown: 3
      }
      
      
      
      
    },

    {
      id: "hero008",
      name: "塞尔达",
      icon: "archer2.png",
      role: "游侠",
      rarity: "SR",
      hireCost: 20,         // ✅ 新增字段
      locked: true,
      unlockCost: 300,
      attributes: { physical: 9, magical: 6 },
      level: 1,
      exp: 0,
      expToNextLevel: 100,
      levelUpConfig: {
        attributeGrowth: { physical: 2, magical: 1 }
      },
      skill: {
        name: "你再叫我……",
        description: "翻倍当前伤害并小幅追加",
        effect: { type: "mulGauge", factor: 2.2 },
        cooldown: 2
      }
    },

    {
      id: "hero009",
      name: "来福",
      icon: "mage2.png",
      role: "坦克",
      rarity: "SR",
      hireCost: 20,         // ✅ 新增字段

      locked: true,
      unlockCost: 600,
      attributes: { magical: 12 },
      level: 1,
      exp: 0,
      expToNextLevel: 100,
      levelUpConfig: {
        attributeGrowth: { magical: 4 }
      },
      skill: {
        name: "嗷呜！",
        effect: { type: "convertToDBlocks", baseCount: 3 },
        description: "随机将棋盘上的若干非金币方块变成金币方块（D），每级增加一个",
        cooldown: 3
      }
    },

    {
      id: "hero010",
      name: "小画师",
      icon: "tank2.png",
      role: "法师",
      rarity: "SR",
      hireCost: 20,         // ✅ 新增字段

      locked: true,
      unlockCost: 350,
      attributes: { physical: 10 },
      level: 1,
      exp: 0,
      expToNextLevel: 100,
      levelUpConfig: {
        attributeGrowth: { physical: 3 }
      },
      skill: {
        name: "点金妙笔",
        description: "随机将棋盘上的3个非金币方块变成魔法方块",
        effect: { type: "convertToDBlocks", count: 3 },
        cooldown: 3
      }
    },

    {
      id: "hero011",
      name: "影刃",
      icon: "assassin2.png",
      role: "刺客",
      rarity: "SR",
      hireCost: 20,         // ✅ 新增字段

      locked: true,
      unlockCost: 600,
      attributes: { physical: 12 },
      level: 1,
      exp: 0,
      expToNextLevel: 100,
      levelUpConfig: {
        attributeGrowth: { physical: 4 }
      },
      skill: {
        name: "爆裂感应",
        description: "每个炸弹方块使其注入自身攻击的伤害值",
        effect: {
          type: "addGaugeByDBlockCount"
        },
        cooldown: 3
      }  
    },
    
    {
      id: "hero012",
      name: "冰魔女",
      icon: "priest2.png",
      role: "辅助",
      rarity: "SSR",
      hireCost: 20,         // ✅ 新增字段
      locked: true,
      unlockCost: 200,
      attributes: { magical: 8, healing: 12 },
      level: 1,
      exp: 0,
      expToNextLevel: 100,
      levelUpConfig: {
        attributeGrowth: { magical: 2, healing: 3 }
      },
      skill: {
        name: "寒冰侵蚀",
        description: "随机将棋盘上的若干方块变成寒冰方块（F），每级增加一个",
        effect: { type: "convertToFBlocks" },
        cooldown: 3
      }
    },
    
    {
      id: "hero013",
      name: "狮子",
      icon: "swordsman3.png",
      role: "战士",
      rarity: "SR",
      hireCost: 20,         // ✅ 新增字段
      locked: true,
      unlockCost: 800,
      attributes: { physical: 15 },
      level: 1,
      exp: 0,
      expToNextLevel: 100,
      levelUpConfig: {
        attributeGrowth: { physical: 4 }
      },
      skill: {
        name: "帝王裁决",
        description: "每有一个战士，伤害增加自身攻击力乘以场上战士数量。",
        effect: { type: "addGaugeWithWarriorMultiplier", source: "physical", scale: 2.2 },
        cooldown: 2
      }
    },
    {
      id: "hero014",
      name: "夜影之箭",
      icon: "archer3.png",
      role: "游侠",
      rarity: "SSR",
      hireCost: 20,         // ✅ 新增字段
      locked: true,
      unlockCost: 700,
      attributes: { physical: 11, magical: 7 },
      level: 1,
      exp: 0,
      expToNextLevel: 100,
      levelUpConfig: {
        attributeGrowth: { physical: 3, magical: 2 }
      },
      skill: {
        name: "影袭连爆",
        description: "将当前攻击槽伤害翻倍，每存在1名游侠，额外提升20%。",
        effect: {
          type: "mulGaugeByRangerCount",
          baseFactor: 1.0,
          bonusPerRanger: 0.2,
          maxBonus: 2.0
        },
        cooldown: 2
      }
    },
    {
      id: "hero015",
      name: "星辉法皇",
      icon: "mage3.png",
      role: "法师",
      rarity: "UR",
      hireCost: 20,         // ✅ 新增字段
      locked: true,
      unlockCost: 900,
      attributes: { magical: 15 },
      level: 1,
      exp: 0,
      expToNextLevel: 100,
      levelUpConfig: {
        attributeGrowth: { magical: 5 }
      },
      skill: {
        name: "星辰共鸣",
        description: "造成魔法伤害，强度与场上法师数量相关。",
        effect: {
          type: "mageCountMagicDamage",
          scale: 1.5
        },
        cooldown: 3
      }
    },
    {
      id: "hero016",
      name: "坤坤",
      icon: "tank3.png",
      role: "坦克",
      rarity: "SSR",
      hireCost: 20,         // ✅ 新增字段
      locked: true,
      unlockCost: 700,
      attributes: { physical: 12 },
      level: 1,
      exp: 0,
      expToNextLevel: 100,
      levelUpConfig: {
        attributeGrowth: { physical: 4 }
      },
      skill: {
        name: "你干嘛～",
        description: "投出篮球击中怪物，造成2.5倍物理伤害",
        effect: {
          type: "delayedDamage",
          source: "physical",
          scale: 2.5,
          animation: "basketball",
          delay: 600
        },
        cooldown: 4
      }
      
    },
    {
      id: "hero017",
      name: "呆伦",
      icon: "assassin3.png",
      role: "刺客",
      rarity: "UR",
      hireCost: 20,         // ✅ 新增字段
      locked: true,
      unlockCost: 1000,
      attributes: { physical: 14 },
      level: 1,
      exp: 0,
      expToNextLevel: 100,
      levelUpConfig: {
        attributeGrowth: { physical: 5 }
      },
      skill: {
        name: "鬼影穿心",
        description: "扩展棋盘为 7x7，持续 3 回合",
        effect: {
          type: "expandGrid",
          size: 7,
          duration: 2
        },
        cooldown: 3
      }
      
    },
    {
      id: "hero018",
      name: "米酷酱",
      icon: "priest3.png",
      role: "辅助",
      rarity: "SSR",
      hireCost: 20,         // ✅ 新增字段
      locked: true,
      unlockCost: 600,
      attributes: { magical: 10, healing: 14 },
      level: 1,
      exp: 0,
      expToNextLevel: 100,
      levelUpConfig: {
        attributeGrowth: { magical: 3, healing: 4 }
      },
      skill: {
        name: "歌唱吧！",
        description: "为所有在场英雄随机提升30~40%技能槽，每升一级+1%。",
        effect: {
          type: "randomBoostAllGauge",
          baseMin: 30,
          baseMax: 40
        },
        cooldown: 3
      }
    },
    {
      id: 'hero019',
      name: '国王',
      icon: 'icon_king.png',  // 图标可自定义
      role: '坦克',
      rarity: 'SSR',
      level: 1,
      exp: 0,
      locked: true,
      hireCost: 20,         // ✅ 新增字段
      unlockCost: 600,
      attributes: {
        physical: 50,
      },
      skill: {
        name: '王之领域',
        description: "扩展棋盘为 8x8，持续 3 回合",
        cooldown: 3,
        effect: {
          type: 'expandGrid',
          size: 8,          // ✅ 与呆伦不同之处
          duration: 2
        }
      }
    }
    
  ],

  getHeroById(id) {
    return this.heroes.find(h => h.id === id);
  }
};

module.exports = HeroData;
