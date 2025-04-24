// js/data/monster_data.js
// 定义所有关卡怪物基础数据 —— 可随时追加新关卡
export const monsters = [
  {
    id: 1,
    level: 1,
    name: 'Forest Golem',
    maxHp: 500,
    sprite: 'golem.png',            // 贴图文件放在 assets/monsters/
    skill: {
      name: 'Vine Grasp',           // 技能名
      desc: '每3回合对全体造成50点伤害',
      cooldown: 3,
      damage: 50
    }
  },
  {
    id: 2,
    level: 2,
    name: 'Sand Worm',
    maxHp: 800,
    sprite: 'sand_worm.png',
    skill: {
      name: 'Burrow',
      desc: '每2回合偷袭造成80点伤害',
      cooldown: 2,
      damage: 80
    }
  }
  // … 继续添加
];
