// ✅ js/data/hero_data.js
const HeroData = {
  heroes: [
    {
      id: "hero001",
      name: "原味肠",
      icon: "swordsman.png",
      role: "战士",
      rarity: "R",
      hireCost: 20,         // ✅ 新增字段
      locked: false,          // ← 默认已解锁
      unlockCost: 0,
      attributes: { physical: 8 },
      level: 1,
      exp: 0,
      expToNextLevel: 100,
      levelUpConfig: {
        attributeGrowth: { physical: 2 },
        unlockSkills: {}
      },
      skill: {
        name: "破甲斩",
        description: "将自身物攻注入伤害槽",
        effect: { type: "addGauge", source: "physical", scale: 1 },
        cooldown: 3
      }
    },

    {
      id: "hero002",
      name: "MIO",
      icon: "archer.png",
      role: "游侠",
      rarity: "R",
      hireCost: 20,         // ✅ 新增字段
      locked: true,           // ← 现在锁定
      unlockCost: 3,        // ← 解锁需要 200 金币
      attributes: { physical: 8, magical: 5 },
      level: 1,
      exp: 0,
      expToNextLevel: 100,
      levelUpConfig: {
        attributeGrowth: { physical: 2, magical: 1 },
        unlockSkills: { 3: "piercingRain" }
      },
      skill: {
        name: "贯穿射击",
        description: "将当前伤害池翻倍",
        effect: { type: "mulGauge", factor: 2 },
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
      name: "男鼠鼠",
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
        name: "暗影突袭",
        description: "瞬间移动并攻击敌人要害",
        effect: { type: "physicalDamage", amount: 140 },
        cooldown: 3
      }
    },

    {
      id: "hero006",
      name: "艾蕾娜",
      icon: "priest.png",
      role: "辅助",
      rarity: "R",
      hireCost: 20,         // ✅ 新增字段
      locked: false,
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
        name: "圣光祷言",
        description: "治疗己方全体，并提升下一回合攻击力",
        effect: {
          type: "teamHealAndBuff",
          healScale: 1.2,
          buff: { physical: 2, magical: 2 },
          duration: 1
        },
        cooldown: 3
      }
    },

    {
      id: "hero007",
      name: "狂战凯",
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
        name: "怒焰斩",
        description: "造成强力物理伤害，并注入部分攻击槽",
        effect: { type: "addGauge", source: "physical", scale: 1.5 },
        cooldown: 3
      }
    },

    {
      id: "hero008",
      name: "风刃艾玛",
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
        name: "箭雨连发",
        description: "翻倍当前伤害并小幅追加",
        effect: { type: "mulGauge", factor: 2.2 },
        cooldown: 2
      }
    },

    {
      id: "hero009",
      name: "炎咒师莱雅",
      icon: "mage2.png",
      role: "法师",
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
        name: "烈焰风暴",
        description: "大范围魔法伤害",
        effect: { type: "magicalDamage", amount: 160 },
        cooldown: 4
      }
    },

    {
      id: "hero010",
      name: "铠甲兽",
      icon: "tank2.png",
      role: "坦克",
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
        name: "冲撞",
        description: "造成物理伤害并击退敌人（效果可拓展）",
        effect: { type: "physicalDamage", amount: 100 },
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
        name: "刺骨连击",
        description: "连续造成两次高伤物攻（模拟）",
        effect: { type: "physicalDamage", amount: 160 },
        cooldown: 3
      }
    },
    
    {
      id: "hero012",
      name: "圣女菲奥娜",
      icon: "priest2.png",
      role: "牧师",
      rarity: "SR",
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
        name: "神圣祷言",
        description: "治疗并提升队友攻击力",
        effect: {
          type: "teamHealAndBuff",
          healScale: 1.5,
          buff: { physical: 3, magical: 3 },
          duration: 2
        },
        cooldown: 3
      }
    },
    
    {
      id: "hero013",
      name: "铁血帝王",
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
        description: "造成极高物理伤害并充满攻击槽",
        effect: { type: "addGauge", source: "physical", scale: 2.2 },
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
        name: "千影箭雨",
        description: "将当前攻击槽伤害提升至3倍",
        effect: { type: "mulGauge", factor: 3 },
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
        name: "星爆术",
        description: "造成极高魔法伤害",
        effect: { type: "magicalDamage", amount: 200 },
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
      name: "阿丝呆伦",
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
      name: "天启救赎",
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
        name: "神启之光",
        description: "强力全体治疗并提升攻击力",
        effect: {
          type: "teamHealAndBuff",
          healScale: 2,
          buff: { physical: 4, magical: 4 },
          duration: 2
        },
        cooldown: 3
      }
    }
    
    
  ],

  getHeroById(id) {
    return this.heroes.find(h => h.id === id);
  }
};

module.exports = HeroData;
