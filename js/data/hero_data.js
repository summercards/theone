// ✅ js/data/hero_data.js
const HeroData = {
  heroes: [
    {
      id: "hero001",
      name: "原味肠",
      icon: "swordsman.png",
      role: "战士",
      rarity: "SR",
      locked: false,          // ← 默认已解锁
      unlockCost: 0,
      attributes: { physical: 10 },
      level: 1,
      exp: 0,
      expToNextLevel: 100,
      levelUpConfig: {
        attributeGrowth: { physical: 50 },
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
      rarity: "SSR",
      locked: true,
      unlockCost: 500,
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
      name: "任天堂",
      icon: "knight.png",
      role: "坦克",
      rarity: "SR",
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
        name: "盾击",
        description: "用盾牌击晕敌人",
        effect: { type: "physicalDamage", amount: 90 },
        cooldown: 2
      }
    },
    {
      id: "hero005",
      name: "男鼠鼠",
      icon: "assassin.png",
      role: "刺客",
      rarity: "SSR",
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
    }
  ],

  getHeroById(id) {
    return this.heroes.find(h => h.id === id);
  }
};

module.exports = HeroData;
