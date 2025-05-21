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
  spriteSize
}) {
  return {
    id,
    level,
    name,
    maxHp,
    sprite,
    isBoss,
    gold,
    spriteSize, // 👈 可选字段：用于贴图缩放
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
  '可乐', '薯条', '芝士', '薯片', '披萨', '汉堡', '炸鸡', '双层汉堡', '大瓶可乐'
];
const foodSprites = [
  'cola', 'fries', 'cheese', 'chips', 'pizza', 'burger', 'friedchicken', 'doubleburger', 'bigcola'
];
for (let i = 0; i < 9; i++) {
  const lv = i + 1;
  monsters.push(createMonster({
    id: lv,
    level: lv,
    name: foodMonsters[i],
    maxHp: 1200 + i * 100,
    sprite: `${foodSprites[i]}.png`,
    damage: 25 + i * 5,
    cooldown: 2,
    gold: 10 + lv * 2,
    spriteSize: 120
  }));
}

monsters.push(createMonster({
  id: 10,
  level: 10,
  name: '暴食者',
  maxHp: 10000,
  sprite: 'glutton.png',
  damage: 200,
  cooldown: 3,
  gold: 60,
  isBoss: true
}));

// ------------------------------------------------------------
// 关卡 11~20：嫉妒怪物体系（手动定义）
// ------------------------------------------------------------
const envyMonsters = [
  '镜妖', '窥视者', '变形鬼', '绿眼蛇', '暗影镜灵', '模仿猫', '羡慕鬼', '嫉光虫', '反射魔'
];
const envySprites = [
  'jingyao', 'kuishizhe', 'bianxinggui', 'lvyanshe', 'anyingjingling',
  'mofangmao', 'xianmugui', 'jiguangchong', 'fanshemo'
];
for (let i = 0; i < 9; i++) {
  const lv = i + 11;
  monsters.push(createMonster({
    id: lv,
    level: lv,
    name: envyMonsters[i],
    maxHp: 2200 + i * 150,
    sprite: `${envySprites[i]}.png`,
    damage: 60 + i * 10,
    cooldown: 3,
    gold: 15 + lv * 2,
    spriteSize: 120
  }));
}

monsters.push(createMonster({
  id: 20,
  level: 20,
  name: '镜中君主',
  maxHp: 16000,
  sprite: 'jingzhongjunzhu.png',
  damage: 300,
  cooldown: 4,
  gold: 100,
  isBoss: true
}));

// ------------------------------------------------------------
// 关卡 21~30：贪婪怪物体系（手动定义）
// ------------------------------------------------------------
const greedMonsters = [
  '金鼠', '宝箱怪', '金币虫', '掠夺者', '金牙蛇', '偷心贼', '堆金魔', '铜甲兽', '贪财怪'
];
const greedSprites = [
  'jinshu', 'baoxiangguai', 'jinbichong', 'lueduozhe', 'jinyashe',
  'touxinzei', 'duijinmo', 'tongjiashou', 'tancaiguai'
];
for (let i = 0; i < 9; i++) {
  const lv = i + 21;
  monsters.push(createMonster({
    id: lv,
    level: lv,
    name: greedMonsters[i],
    maxHp: 3000 + i * 200,
    sprite: `${greedSprites[i]}.png`,
    damage: 100 + i * 10,
    cooldown: 3,
    gold: 20 + lv * 2,
    spriteSize: 120
  }));
}

monsters.push(createMonster({
  id: 30,
  level: 30,
  name: '贪欲之王',
  maxHp: 18000,
  sprite: 'tanyuzhiwang.png',
  damage: 350,
  cooldown: 4,
  gold: 120,
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
const wrathSprites = [
  'huonuling',
  'paoxiaogou',
  'nuchuizhe',
  'baoliechong',
  'kuangfugui',
  'lieyanhun',
  'nuguangniao',
  'huohouzhe',
  'hongyanshou'
];
for (let i = 0; i < 9; i++) {
  const lv = i + 31;
  monsters.push(createMonster({
    id: lv,
    level: lv,
    name: wrathMonsters[i],
    maxHp: 4000 + i * 220,
    sprite: `${wrathSprites[i]}.png`,
    damage: 140 + i * 10,
    cooldown: 3,
    gold: 25 + lv * 2,
    spriteSize: 120
  }));
}

monsters.push(createMonster({
  id: 40,
  level: 40,
  name: '狂怒化身',
  maxHp: 20000,
  sprite: 'kuangnuhuashen.png',
  damage: 380,
  cooldown: 4,
  gold: 140,
  isBoss: true
}));
// ------------------------------------------------------------
// 关卡 41~50：懒惰怪物体系（手动定义）
// ------------------------------------------------------------
const slothMonsters = [
  '打盹鬼',
  '软泥怪',
  '懒熊',
  '梦游者',
  '慢行者',
  '懒眼龙',
  '木头人',
  '熬夜魔',
  '睡魔'
];
const slothSprites = [
  'dadungui',
  'ruanniguai',
  'lanxiong',
  'mengyouzhe',
  'manxingzhe',
  'lanyanlong',
  'mutouren',
  'aoyemo',
  'shuimo'
];
for (let i = 0; i < 9; i++) {
  const lv = i + 41;
  monsters.push(createMonster({
    id: lv,
    level: lv,
    name: slothMonsters[i],
    maxHp: 5000 + i * 250,
    sprite: `${slothSprites[i]}.png`,
    damage: 160 + i * 10,
    cooldown: 4,
    gold: 30 + lv * 2,
    spriteSize: 120
  }));
}

monsters.push(createMonster({
  id: 50,
  level: 50,
  name: '千年沉眠',
  maxHp: 22000,
  sprite: 'qiannianchenmian.png',
  damage: 400,
  cooldown: 5,
  gold: 160,
  isBoss: true
}));
// ------------------------------------------------------------
// 关卡 51~60：傲慢怪物体系（手动定义）
// ------------------------------------------------------------
const prideMonsters = [
  '镀金卫',
  '神像兵',
  '镜盔者',
  '高傲鹰',
  '金甲狮',
  '自恋魔',
  '圣殿士',
  '冠冕狐',
  '傲骨龙'
];
const prideSprites = [
  'dujinwei',
  'shenxiangbing',
  'jingkuizhe',
  'gaoao',
  'jinjiashi',
  'zilianmo',
  'shengdian',
  'guanmianhu',
  'aogulong'
];
for (let i = 0; i < 9; i++) {
  const lv = i + 51;
  monsters.push(createMonster({
    id: lv,
    level: lv,
    name: prideMonsters[i],
    maxHp: 6000 + i * 300,
    sprite: `${prideSprites[i]}.png`,
    damage: 180 + i * 10,
    cooldown: 4,
    gold: 35 + lv * 2,
    spriteSize: 120
  }));
}

monsters.push(createMonster({
  id: 60,
  level: 60,
  name: '光辉圣裁',
  maxHp: 24000,
  sprite: 'guanghuishengcai.png',
  damage: 420,
  cooldown: 5,
  gold: 180,
  isBoss: true
}));
// ------------------------------------------------------------
// 关卡 61~70：色欲怪物体系（手动定义）
// ------------------------------------------------------------
const lustMonsters = [
  '魅语者',
  '幻魅狐',
  '玫瑰蛇',
  '缠绕藤',
  '诱惑灵',
  '粉雾魔',
  '花魅',
  '媚眼猫',
  '诱心妖'
];
const lustSprites = [
  'meiyuzhe',
  'huanmeihu',
  'meiguishe',
  'chanraoteng',
  'youhuoling',
  'fenwumo',
  'huamei',
  'meiyanmao',
  'youxinyao'
];
for (let i = 0; i < 9; i++) {
  const lv = i + 61;
  monsters.push(createMonster({
    id: lv,
    level: lv,
    name: lustMonsters[i],
    maxHp: 7000 + i * 350,
    sprite: `${lustSprites[i]}.png`,
    damage: 200 + i * 10,
    cooldown: 4,
    gold: 40 + lv * 2,
    spriteSize: 120
  }));
}

monsters.push(createMonster({
  id: 70,
  level: 70,
  name: '红莲女皇',
  maxHp: 26000,
  sprite: 'hongliannvhuang.png',
  damage: 450,
  cooldown: 5,
  gold: 200,
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
    maxHp: Math.floor(src.maxHp * 1.2),
    sprite: src.sprite,
    damage: Math.floor(src.skill.damage * 1.2),
    cooldown: src.skill.cooldown,
    isBoss: true,
    gold: Math.round(src.gold * 1.2)
  }));
}
