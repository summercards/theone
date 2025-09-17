// js/data/monster_data.js
// ------------------------------------------------------------
// 怪物数据定义：每10关为一个体系，第10关为Boss
// ------------------------------------------------------------
export const monsters = [];

// ★ Boss 原始数据（用于关卡 20~70 及 Boss Rush）
export const bossDefs = [
  { name: 'Cavern Hydra',     baseHp: 12200, hpInc: 220, dmg: 165, cooldown: 8 },
  { name: 'Sky Lord',         baseHp: 22400, hpInc: 240, dmg: 180, cooldown: 8 },
  { name: 'Inferno Behemoth', baseHp: 22600, hpInc: 260, dmg: 195, cooldown: 8 },
  { name: 'Abyss Leviathan',  baseHp: 22800, hpInc: 280, dmg: 210, cooldown: 8 },
  { name: 'Titan Colossus',   baseHp: 33000, hpInc: 300, dmg: 225, cooldown: 8 },
  { name: 'Void Dragon',      baseHp: 33200, hpInc: 320, dmg: 240, cooldown: 8 }
];

// ★ 普通怪公式定义（第11~69关）
export const tierConfigs = [
  { hpBase: 7500,  hpPerLevel: 650, dmgBase: 175, dmgPerLevel: 35,  cooldown: 5 }, // 第11-19关
  { hpBase: 13500, hpPerLevel: 700, dmgBase: 225, dmgPerLevel: 40,  cooldown: 5 }, // 第21-29关
  { hpBase: 14500, hpPerLevel: 750, dmgBase: 275, dmgPerLevel: 45,  cooldown: 5 }, // 第31-39关
  { hpBase: 15500, hpPerLevel: 800, dmgBase: 325, dmgPerLevel: 50,  cooldown: 5 }, // 第41-49关
  { hpBase: 16500, hpPerLevel: 850, dmgBase: 375, dmgPerLevel: 55,  cooldown: 5 }, // 第51-59关
  { hpBase: 27500, hpPerLevel: 900, dmgBase: 425, dmgPerLevel: 60,  cooldown: 5 }  // 第61-69关
];

// ------------------------------------------------------------
// 工厂函数
// ------------------------------------------------------------
function createMonster({
  id,
  level,
  name,
  maxHp,
  sprite,
  damage,
  cooldown,
  isBoss = false,
  gold,
  spriteSize,
  spriteScale = 1.0 // 👈 新增这一行
}) {
  return {
    id,
    level,
    name,
    maxHp,
    sprite,
    isBoss,
    gold,
    atk: damage,           // 🆕 ① 在顶层存一份攻击力，后续 UI / 公式更直观
    spriteSize, // 👈 可选字段：用于贴图缩放
    spriteScale, // 👈 加入返回对象中
    turns: cooldown,
    skill: {
      name: isBoss ? `${name} Fury` : `${name} Strike`,
      desc: `每${cooldown}回合${isBoss ? '对全体' : ''}造成${damage}点伤害`,
      cooldown,
      damage
    }
  };
}

// ------------------------------------------------------------
// 关卡 1~10：食物怪物体系（手动定义）
// ------------------------------------------------------------
const foodMonsters = [
    '小薯条', '中薯条', '大薯条',
    '小可乐', '中可乐', '大可乐',
    '小汉堡', '双层汉堡', '巨无霸'
  ];
  
  const foodSprites = [
    'moster1-1', 'moster1-1', 'moster1-1',
    'moster1-2', 'moster1-2', 'moster1-2',
    'moster1-3', 'moster1-3', 'moster1-3'
  ];
  
  // 👇 缩放比例（scale）：0.5表示显示一半大小
  const foodScales = [0.5, 0.75, 1.0, 0.5, 0.75, 1.0, 0.5, 0.75, 1.0];
  
  // 为了减轻前期难度，我们适当降低前 1~9 关怪物的生命值与伤害，
  // 同时增加其掉落金币数量，帮助新手更快积累资源。
  for (let i = 0; i < 9; i++) {
    const lv = i + 1;
    monsters.push(createMonster({
      id: lv,
      level: lv,
      name: foodMonsters[i],
      // 原公式：2200 + i * 160 → 调整为更低的基数和增幅
      maxHp: 1800 + i * 120,
      sprite: `${foodSprites[i]}.png`,
      // 原伤害：[18 + i*5, 35 + i*5] → 调整为更柔和的增长
      damage: [12 + i * 4, 24 + i * 4],
      cooldown: 2,
      // 提高金币奖励：基础+等级×系数
      gold: 30 + lv * 3,
      spriteSize: 120,
      spriteScale: foodScales[i]
    }));
  }
  

// 调整第 10 关 Boss 数据：降低生命值与伤害，并适当提升奖励
monsters.push(createMonster({
  id: 10,
  level: 10,
  name: '暴食者',
  // 原生命 18500 → 降低为 12000，减轻早期 Boss 难度
  maxHp: 12000,
  sprite: 'glutton.png',
  // 原伤害 [89,129] → 调整为 [70,100]
  damage: [70, 100],
  cooldown: 3,
  // 奖励翻倍，鼓励通关
  gold: 100,
  isBoss: true,
  spriteSize: 120,
  spriteScale: 3
}));

// ------------------------------------------------------------
// 关卡 11~20：嫉妒怪物体系（手动定义）
// ------------------------------------------------------------
const envyMonsters = [
    '她的玩偶', '窥视者', '变形鬼', '绿眼蛇', '纠结藤曼', '模仿猫', '羡慕鬼', '嫉光虫', '反射魔'
  ];
  const envySprites = [
    'moster2-1', 'moster2-1', 'moster2-1', 'moster2-2', 'moster2-2',
    'moster2-2', 'moster2-3', 'moster2-3', 'moster2-3'
  ];
  const envyScales = [0.5, 0.75, 1.0, 0.5, 0.75, 1.0, 0.5, 0.75, 1.0]; // 👈 新增
  
  for (let i = 0; i < 9; i++) {
    const lv = i + 11;
    monsters.push(createMonster({
      id: lv,
      level: lv,
      name: envyMonsters[i],
      maxHp: 4200 + i * 150,
      sprite: `${envySprites[i]}.png`,
      damage: [35 + i * 10, 50 + i * 10],
      cooldown: 3,
      gold: 190 + lv * 2,
      spriteSize: 120,
      spriteScale: envyScales[i] // 👈 新增
    }));
  }

monsters.push(createMonster({
  id: 20,
  level: 20,
  name: '镜中君主',
  maxHp: 136000,
  sprite: 'jingzhongjunzhu.png',
  damage: [169, 199],   // ❶ 变成数组即可
  cooldown: 4,
  gold: 3800,
  isBoss: true
}));

// ------------------------------------------------------------
// 关卡 21~30：贪婪怪物体系（手动定义）
// ------------------------------------------------------------
const greedMonsters = [
    '黄金史莱姆', '黄金哥布林', '金币虫', '掠夺者', '夺金手', '偷心贼', '堆金魔', '铜甲兽', '贪财怪'
  ];
  const greedSprites = [
    'moster3-1', 'moster3-1', 'moster3-1', 'moster3-2', 'moster3-2',
    'moster3-2', 'moster3-3', 'moster3-3', 'moster3-3'
  ];
  const greedScales = [0.5, 0.75, 1.0, 0.5, 0.75, 1.0, 0.5, 0.75, 1.0]; // 👈 新增
  
  for (let i = 0; i < 9; i++) {
    const lv = i + 21;
    monsters.push(createMonster({
      id: lv,
      level: lv,
      name: greedMonsters[i],
      maxHp: 5000 + i * 200,
      sprite: `${greedSprites[i]}.png`,
      damage: 220 + i * 10,
      cooldown: 3,
      gold: 270 + lv * 2,
      spriteSize: 120,
      spriteScale: greedScales[i] // 👈 新增
    }));
  }
  

monsters.push(createMonster({
  id: 30,
  level: 30,
  name: '贪欲之王',
  maxHp: 268000,
  sprite: 'tanyuzhiwang.png',
  damage: [330, 389],   // ❶ 变成数组即可
  cooldown: 4,
  gold: 6900,
  isBoss: true
}));

// ------------------------------------------------------------
// 关卡 31~40：愤怒怪物体系（手动定义）
// ------------------------------------------------------------
const wrathMonsters = [
    '火怒灵',
    '咆哮犬',
    '怒锤者',
    '爆裂虫',
    '狂斧鬼',
    '烈焰魂',
    '怒光鸟',
    '火吼者',
    '红眼兽'
  ];
  
  // 👇 三段贴图，每三只怪共用一张
  const wrathSprites = [
    'moster4-1', 'moster4-1', 'moster4-1',
    'moster4-2', 'moster4-2', 'moster4-2',
    'moster4-3', 'moster4-3', 'moster4-3'
  ];
  
  // 👇 缩放比例分布
  const wrathScales = [0.5, 0.75, 1.0, 0.5, 0.75, 1.0, 0.5, 0.75, 1.0];
  
  for (let i = 0; i < 9; i++) {
    const lv = i + 31;
    monsters.push(createMonster({
      id: lv,
      level: lv,
      name: wrathMonsters[i],
      maxHp: 24000 + i * 1220,
      sprite: `${wrathSprites[i]}.png`,   // 👈 新贴图命名
      damage: 140 + i * 10,
      cooldown: 3,
      gold: 385 + lv * 2,
      spriteSize: 120,
      spriteScale: wrathScales[i]         // 👈 新增缩放字段
    }));
  }

monsters.push(createMonster({
  id: 40,
  level: 40,
  name: '狂怒化身',
  maxHp: 420000,
  sprite: 'kuangnuhuashen.png',
  damage: [389, 469],   // ❶ 变成数组即可
  cooldown: 4,
  gold: 28000,
  isBoss: true
}));
// ------------------------------------------------------------
// 关卡 41~50：懒惰怪物体系（手动定义）
// ------------------------------------------------------------
const slothMonsters = [
    '打盹鬼', '软泥怪', '懒熊',
    '梦游者', '慢行者', '懒眼龙',
    '木头人', '熬夜魔', '睡魔'
  ];
  
  const slothSprites = [
    'moster5-1', 'moster5-1', 'moster5-1',
    'moster5-2', 'moster5-2', 'moster5-2',
    'moster5-3', 'moster5-3', 'moster5-3'
  ];
  
  const slothScales = [0.5, 0.75, 1.0, 0.5, 0.75, 1.0, 0.5, 0.75, 1.0];
  
  for (let i = 0; i < 9; i++) {
    const lv = i + 41;
    monsters.push(createMonster({
      id: lv,
      level: lv,
      name: slothMonsters[i],
      maxHp: 15000 + i * 250,
      sprite: `${slothSprites[i]}.png`,
      damage: 160 + i * 10,
      cooldown: 4,
      gold: 380 + lv * 2,
      spriteSize: 120,
      spriteScale: slothScales[i]
    }));
  }
  

monsters.push(createMonster({
  id: 50,
  level: 50,
  name: '千年沉眠',
  maxHp: 852000,
  sprite: 'qiannianchenmian.png',
  damage: [389, 529],   // ❶ 变成数组即可
  cooldown: 5,
  gold: 56000,
  isBoss: true
}));
// ------------------------------------------------------------
// 关卡 51~60：傲慢怪物体系（手动定义）
// ------------------------------------------------------------
const prideMonsters = [
    '镀金卫', '神像兵', '镜盔者',
    '高傲鹰', '金甲狮', '自恋魔',
    '圣殿士', '冠冕狐', '傲骨龙'
  ];
  
  const prideSprites = [
    'moster6-1', 'moster6-1', 'moster6-1',
    'moster6-2', 'moster6-2', 'moster6-2',
    'moster6-3', 'moster6-3', 'moster6-3'
  ];
  
  const prideScales = [0.5, 0.75, 1.0, 0.5, 0.75, 1.0, 0.5, 0.75, 1.0];
  
  for (let i = 0; i < 9; i++) {
    const lv = i + 51;
    monsters.push(createMonster({
      id: lv,
      level: lv,
      name: prideMonsters[i],
      maxHp: 36000 + i * 1300,
      sprite: `${prideSprites[i]}.png`,
      damage: 180 + i * 10,
      cooldown: 4,
      gold: 535 + lv * 2,
      spriteSize: 120,
      spriteScale: prideScales[i]
    }));
  }
  

monsters.push(createMonster({
  id: 60,
  level: 60,
  name: '光辉圣裁',
  maxHp: 1024000,
  sprite: 'guanghuishengcai.png',
  damage: [589, 729],   // ❶ 变成数组即可
  cooldown: 5,
  gold: 18000,
  isBoss: true
}));
// ------------------------------------------------------------
// 关卡 61~70：色欲怪物体系（手动定义）
// ------------------------------------------------------------
const lustMonsters = [
    '魅语者', '幻魅狐', '玫瑰蛇',
    '缠绕藤', '诱惑灵', '粉雾魔',
    '花魅', '媚眼猫', '诱心妖'
  ];
  
  const lustSprites = [
    'moster7-1', 'moster7-1', 'moster7-1',
    'moster7-2', 'moster7-2', 'moster7-2',
    'moster7-3', 'moster7-3', 'moster7-3'
  ];
  
  const lustScales = [0.5, 0.75, 1.0, 0.5, 0.75, 1.0, 0.5, 0.75, 1.0];
  
  for (let i = 0; i < 9; i++) {
    const lv = i + 61;
    monsters.push(createMonster({
      id: lv,
      level: lv,
      name: lustMonsters[i],
      maxHp: 97000 + i * 350,
      sprite: `${lustSprites[i]}.png`,
      damage: 200 + i * 10,
      cooldown: 4,
      gold: 640 + lv * 2,
      spriteSize: 120,
      spriteScale: lustScales[i]
    }));
  }
  

monsters.push(createMonster({
  id: 70,
  level: 70,
  name: '红莲女皇',
  maxHp: 29226000,
  sprite: 'hongliannvhuang.png',
  damage: [989, 1129],   // ❶ 变成数组即可
  cooldown: 5,
  gold: 80000,
  isBoss: true
}));

// ------------------------------------------------------------
// 71-77：Boss Rush（每个Boss增强版）
// ------------------------------------------------------------
for (let i = 0; i < 7; i++) {
  const src = monsters.find(m => m.level === (i + 1) * 10);
  monsters.push(createMonster({
    id: 71 + i,
    level: 71 + i,
    name: `${src.name} (再临)`,
    maxHp: Math.floor(src.maxHp * 5.2),
    sprite: src.sprite,
    damage: Math.floor(src.skill.damage * 5.2),
    cooldown: src.skill.cooldown,
    isBoss: true,
    gold: Math.round(src.gold * 3.2)
  }));
}

// ---------------------------------------------------------------------------
// 为提升新手体验，对早期关卡怪物进行削弱调整，同时适当提高掉落金币。
// 关卡 1-10：怪物血量、伤害减少至原来的 60%，攻击间隔 +1（至少 3），金币 +50%
// 关卡 11-20：怪物血量、伤害减少至原来的 75%，金币 +40%
monsters.forEach(mon => {
  if (mon.level <= 10) {
    mon.maxHp = Math.floor(mon.maxHp * 0.6);
    if (mon.skill && mon.skill.damage) {
      if (Array.isArray(mon.skill.damage)) {
        mon.skill.damage = mon.skill.damage.map(d => Math.floor(d * 0.6));
      } else {
        mon.skill.damage = Math.floor(mon.skill.damage * 0.6);
      }
    }
    // 更新顶层 atk 属性用于 UI 显示
    if (Array.isArray(mon.skill?.damage)) {
      mon.atk = mon.skill.damage[0];
    } else if (mon.skill?.damage !== undefined) {
      mon.atk = mon.skill.damage;
    }
    // 延长攻击冷却，让玩家有更多回合
    mon.turns = Math.max(mon.turns + 1, 3);
    // 提高掉落金币
    mon.gold = Math.floor(mon.gold * 1.5);
  } else if (mon.level > 10 && mon.level <= 20) {
    mon.maxHp = Math.floor(mon.maxHp * 0.75);
    if (mon.skill && mon.skill.damage) {
      if (Array.isArray(mon.skill.damage)) {
        mon.skill.damage = mon.skill.damage.map(d => Math.floor(d * 0.75));
      } else {
        mon.skill.damage = Math.floor(mon.skill.damage * 0.75);
      }
    }
    if (Array.isArray(mon.skill?.damage)) {
      mon.atk = mon.skill.damage[0];
    } else if (mon.skill?.damage !== undefined) {
      mon.atk = mon.skill.damage;
    }
    mon.gold = Math.floor(mon.gold * 1.4);
  }
});

// ------------------------------------------------------------
// 统一怪物和英雄的形象：使用英雄头像替代怪物贴图
// 我们从 hero_data 中读取所有英雄的 icon 字符串，循环赋值给每个怪物的 sprite 字段。
try {
  const HeroData = require('./hero_data.js');
  const heroIcons = HeroData.heroes.map(h => h.icon);
  for (let i = 0; i < monsters.length; i++) {
    const icon = heroIcons[i % heroIcons.length];
    if (icon) {
      monsters[i].sprite = icon;
    }
  }
} catch (err) {
  console.warn('加载英雄图标失败，怪物头像未替换', err);
}

// ★ 兜底：把第 1 关普通怪的 maxHp 也钳到 95–105（构建期）
// 说明：运行时我们还会在 page_game.js 再钳一次，双保险
try {
    const m1 = monsters.find(m => m.level === 1 && !m.isBoss);
    if (m1) {
      m1.maxHp = 95 + Math.floor(Math.random() * 11); // 95~105
      // m1.skill.damage 保持不变；UI 的顶层 atk 你已有同步逻辑
    }
  } catch (_) {}
  
  // ------------------------------------------------------------
// 森林（1~10关）数值重算：稀有度成长 × 等级成长
// 目标：白色1级 ≈ 100 HP
// 放置位置：monster_data.js 文件末尾（确保 monsters 已经构建完成）
// ------------------------------------------------------------
(function rebalanceForestByRarity() {
    // 1) 拿到怪物数组（无论是局部变量还是挂到全局）
    const MONS =
      (typeof monsters !== 'undefined' && monsters) ||
      (typeof globalThis !== 'undefined' && globalThis.monsters);
    if (!Array.isArray(MONS)) return;
  
    // 2) 基准与倍率（按需可在这里微调）
    const BASE_HP_WHITE_L1 = 100; // 白色1级基准HP
  
    const RARITY_MULT = {        // 稀有度倍率
      white: 1.00,
      green: 1.25,
      blue:  1.60,
      purple:2.20,
      orange:2.80,
      gold:  3.20
    };
  
    const BOSS_MULT = 6.0;       // 1~10段 Boss 的额外倍率（一般是第10关）
  
    // 等级成长：1级=1；10级≈4.47（温和指数）
    function levelGrowth(lv) {
      const n = Math.max(1, lv | 0);
      return Math.pow(1.18, n - 1);
    }
  
    // 若数据里没写稀有度，则按 1~10 的站位做个推断（可改成你自己的规则）
    // 1~3=白，4~6=绿，7~8=蓝，9=紫；10通常是Boss→橙
    function inferRarity(mon) {
      if (mon.isBoss) return 'orange';
      const pos = ((mon.level - 1) % 10) + 1;
      if (pos <= 3) return 'white';
      if (pos <= 6) return 'green';
      if (pos <= 8) return 'blue';
      return 'purple';
    }
  
    // 3) 对 1~10 关逐只重算
    MONS.forEach(mon => {
      if (!mon || mon.level < 1 || mon.level > 10) return;
  
      const rarity = mon.rarityTier || inferRarity(mon);
      mon.rarityTier = rarity; // 保存，方便其它系统读取（例如捕捉/掉落）
  
      const oldHp = mon.maxHp || BASE_HP_WHITE_L1;
  
      let hp = Math.round(
        BASE_HP_WHITE_L1 *
        levelGrowth(mon.level) *
        (RARITY_MULT[rarity] || 1.0)
      );
  
      // 第10关 Boss 再给强化
      if (mon.isBoss && mon.level === 10) {
        hp = Math.round(hp * BOSS_MULT);
      }
  
      // 应用新HP
      mon.maxHp = hp;
      mon.hp    = hp;
  
      // 伤害按HP比例等比缩放，避免“血多/少但伤害不匹配”
      const ratio = oldHp > 0 ? (hp / oldHp) : 1;
      if (mon.skill && mon.skill.damage != null) {
        if (Array.isArray(mon.skill.damage)) {
          mon.skill.damage = mon.skill.damage.map(v => Math.max(1, Math.floor(v * ratio)));
          // 同步顶层 atk（如果你用它展示伤害）
          mon.atk = mon.skill.damage[0];
        } else {
          mon.skill.damage = Math.max(1, Math.floor(mon.skill.damage * ratio));
          mon.atk = mon.skill.damage;
        }
      } else if (typeof mon.atk === 'number') {
        mon.atk = Math.max(1, Math.floor(mon.atk * ratio));
      }
    });
  })();
  