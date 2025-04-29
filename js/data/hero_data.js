// ✅ js/data/hero_data.js

const HeroData = {
  heroes: [
    {
      id: "hero001",
      name: "原味肠",
      icon: "swordsman.png",
      role: "战士",
      rarity: "SR",
      attributes: { physical: 500 },
    
      skill: {
        name: "破甲斩",
        description: "将自身物攻注入伤害槽",
        /* ------------------- 新写法 ------------------- */
        effect: {
          type: "addGauge",       // ← 新类型：向伤害槽加数值
          source: "physical",     // 用哪项属性：physical / magical / 固定数字
          scale: 1                // 倍率；1 = 原值，0.5 = 一半，可选
        },
        /* --------------------------------------------- */
        cooldown: 3
      }
    },
    {
      id: "hero002",
      name: "MIO",
      icon: "archer.png",
      role: "游侠",
      rarity: "R",
      attributes: {
        physical: 8,
        magical: 5
      },
      skill: {
        name: "贯穿射击",
        description: "将当前伤害池翻倍",
        effect: {
          type: "mulGauge",   // ← 新类型：乘以系数
          factor: 2           // 乘 2；改成 1.5 就是 +50%
        },
        cooldown: 2
      }
    },
    {
      id: "hero003",
      name: "凯瑟琳",
      icon: "mage.png",
      role: "法师",
      rarity: "SSR",
      attributes: {
        physical: 2,
        magical: 10
      },
      skill: {
        name: "火球术",
        description: "发射火球造成范围魔法伤害",
        effect: {
          type: "magicalDamage",
          amount: 130
        },
        cooldown: 4
      }
    },
    {
      id: "hero004",
      name: "任天堂",
      icon: "knight.png",
      role: "坦克",
      rarity: "SR",
      attributes: {
        physical: 7,
        magical: 3
      },
      skill: {
        name: "盾击",
        description: "用盾牌击晕敌人",
        effect: {
          type: "physicalDamage",
          amount: 90
        },
        cooldown: 2
      }
    },
    {
      id: "hero005",
      name: "男鼠鼠",
      icon: "assassin.png",
      role: "刺客",
      rarity: "SSR",
      attributes: {
        physical: 10,
        magical: 2
      },
      skill: {
        name: "暗影突袭",
        description: "瞬间移动并攻击敌人要害",
        effect: {
          type: "physicalDamage",
          amount: 140
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
