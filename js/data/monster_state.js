// js/data/monster_state.js
// 本模块不再依赖 monster_data.js。取而代之，我们使用 hero_data
// 中的英雄作为可能的敌人，并按区域划分。每个英雄会根据
// 简单规则转换为敌人的数据结构。
const HeroData = require('./hero_data.js');
// 按区域随机选择敌人：加载区域配置（heroes 列表划分）
const areaMonsters = require('./area_data.js');
import { createLootChest } from '../effects_engine.js';   // 📦LootChest
let currentLevel = 1;
let monster = null;
let turnCounter = 0;
let defeatedBossLevel = 0; // 记录击败的最高 boss 等级

// 记录区域探索中遭遇敌人的次数，用于触发必定出现首领（黄色）敌人。
let battleCounter = 0;

// 测试用传奇敌人出现概率。正式版本可以调低至 0.1。
const LEGENDARY_PROB = 0.3;

// 区域等级范围：不同区域产生不同等级的敌人
const areaLevelRanges = {
  forest: { min: 1, max: 3 },
  snow:   { min: 4, max: 6 },
  desert: { min: 7, max: 9 },
  volcano: { min: 10, max: 12 }
};

// -----------------------------------------------------------
// 敌人稀有度设定
// 基础稀有度及其出现权重、属性倍率和名称颜色。
// 额外的高阶稀有度（purple、yellow、gold）将在 heroToMonster 中根据
// 紫色基准动态计算，因此此处不需要指定倍率，只需给出权重和颜色。
const rarityOptions = [
  {
    tier: 'white',
    weight: 60,
    base: { hpMul: 1.0, atkMul: 1.0, expMul: 1.0, goldMul: 1.0, color: '#FFFFFF' }
  },
  {
    tier: 'green',
    weight: 25,
    base: { hpMul: 1.3, atkMul: 1.3, expMul: 1.5, goldMul: 1.2, color: '#00FF00' }
  },
  {
    tier: 'blue',
    weight: 10,
    base: { hpMul: 1.6, atkMul: 1.6, expMul: 2.0, goldMul: 1.4, color: '#00BFFF' }
  },
  // 基础紫色稀有度，倍率仅作为参考，其具体数值将在 heroToMonster 中使用
  {
    tier: 'purple',
    weight: 5,
    base: { hpMul: 1.9, atkMul: 1.9, expMul: 2.3, goldMul: 1.6, color: '#C71585' }
  }
];

// 随机选择稀有度
function randomRarity() {
  const total = rarityOptions.reduce((sum, o) => sum + o.weight, 0);
  const rnd   = Math.random() * total;
  let acc = 0;
  for (const opt of rarityOptions) {
    acc += opt.weight;
    if (rnd <= acc) return opt;
  }
  return rarityOptions[0];
}


export function markBossDefeated(level) {
    if (level > defeatedBossLevel) {
      defeatedBossLevel = level;
    }
  }
  
  //解锁魔界森林的条件
  export function hasDefeatedBoss2() {
    //return true;
    return defeatedBossLevel >= 20;
  }

// 解锁荒漠地图的条件（击败 ≥40 关 Boss）
export function hasDefeatedBoss3() {
  return defeatedBossLevel >= 40;
}

// 解锁火山地图的条件（击败 ≥60 关 Boss）
export function hasDefeatedBoss4() {
  return defeatedBossLevel >= 60;
}


export function loadMonster(level = 1) {
  // 探索模式：根据全局选中的区域随机抽取敌人。
  currentLevel = level;
  // 每加载一个敌人都计入战斗计数器。战斗计数达到一定次数会触发首领敌人。
  battleCounter++;
  try {
    const area = globalThis.selectedArea || 'forest';
    let pool = areaMonsters[area];
    // 如果该区域没有配置敌人，则使用所有英雄列表
    if (!pool || pool.length === 0) {
      pool = HeroData.heroes || [];
    }
    // 随机选取一个英雄作为敌人
    const hero = pool[Math.floor(Math.random() * pool.length)];
    // 如果没有英雄数据，回退到第一个英雄
    const chosen = hero || (HeroData.heroes && HeroData.heroes[0]);
    // 根据区域随机生成等级范围
    const range = areaLevelRanges[area] || { min: 1, max: 1 };
    const randLv = Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;
    // 根据战斗计数与概率，决定是否强制生成高级稀有度
    let forcedRarity = null;
    let forcedPrefix = '';
    // 传奇敌人：随机概率触发
    if (Math.random() < LEGENDARY_PROB) {
      forcedRarity = { tier: 'gold' };
      forcedPrefix = '传奇·';
      // 传奇敌人不影响首领计数
    } else if (battleCounter >= 10) {
      // 保底首领：每累计 10 场必然出现 1 只首领
      forcedRarity = { tier: 'yellow' };
      forcedPrefix = '首领·';
      battleCounter = 0;
    }

    // 将英雄转换为怪物格式，传入随机等级以及强制稀有度/前缀
    const proto = heroToMonster(chosen, randLv, forcedRarity, forcedPrefix);
    proto.level = randLv;
    // 深拷贝，避免直接改动原型
    monster = JSON.parse(JSON.stringify(proto));
    monster.hp = monster.maxHp;
    turnCounter = 0;
    // 经验字段：如果数据里没有，就用默认值
    const baseLevel = proto.level || 1;
    monster.exp = proto.exp ?? (30 + baseLevel * 5);
  } catch (err) {
    console.warn('区域加载敌人失败，退回默认逻辑', err);
    // 回退到一个默认的敌人：使用英雄列表中的第一项
    const fallbackHero = (HeroData.heroes && HeroData.heroes[0]) || {};
    const proto = heroToMonster(fallbackHero, level);
    monster = JSON.parse(JSON.stringify(proto));
    monster.hp = monster.maxHp;
    turnCounter = 0;
    monster.exp = proto.exp ?? (30 + level * 5);
  }
  return monster;
}

/**
 * 将英雄数据转换为敌人的数据结构。由于英雄属性与怪物属性差异较大，
 * 这里采用简化规则生成 maxHp、atk 等字段。
 * @param {Object} hero - 英雄基础数据
 * @param {number} level - 当前关卡或等级信息，用于经验等计算
 */
function heroToMonster(hero = {}, level = 1, forcedRarity = null, forcedPrefix = '') {
  const baseHp = typeof hero.hp === 'number' ? hero.hp : 100;
  const attrs = hero.attributes || {};
  const physical = typeof attrs.physical === 'number' ? attrs.physical : 0;
  const magical  = typeof attrs.magical === 'number'  ? attrs.magical  : 0;
  const lv = hero.level || level || 1;
  // 1. 确定稀有度：优先使用强制稀有度，否则随机
  let rarityOpt;
  if (forcedRarity && forcedRarity.tier) {
    // 基于强制稀有度构造一个稀有度对象。仅提供 tier 字段，其余将在计算时确定。
    rarityOpt = { tier: forcedRarity.tier };
  } else {
    rarityOpt = randomRarity();
  }

  // 2. 根据稀有度计算倍率和颜色
  let hpMul, atkMul, expMul, goldMul, color;
  let prefix = forcedPrefix || '';
  if (rarityOpt.tier === 'yellow' || rarityOpt.tier === 'gold') {
    // 高阶品质（黄色、金色）基于紫色倍率动态生成
    const purple = rarityOptions.find(o => o.tier === 'purple');
    const base = purple ? purple.base : { hpMul: 1.9, atkMul: 1.9, expMul: 2.3, goldMul: 1.6, color: '#C71585' };
    const factor = (rarityOpt.tier === 'yellow'
      ? (1.2 + Math.random() * 0.1)
      : (1.3 + Math.random() * 0.1));
    hpMul   = base.hpMul * factor;
    atkMul  = base.atkMul * factor;
    expMul  = base.expMul * factor;
    goldMul = base.goldMul * factor;
    color   = rarityOpt.tier === 'yellow' ? '#FFC107' : '#FFD700';
  } else if (rarityOpt.tier === 'purple') {
    const base = rarityOptions.find(o => o.tier === 'purple').base;
    hpMul   = base.hpMul;
    atkMul  = base.atkMul;
    expMul  = base.expMul;
    goldMul = base.goldMul;
    color   = base.color;
  } else {
    // 白色、绿色、蓝色
    const base = rarityOptions.find(o => o.tier === rarityOpt.tier).base;
    hpMul   = base.hpMul;
    atkMul  = base.atkMul;
    expMul  = base.expMul;
    goldMul = base.goldMul;
    color   = base.color;
  }

  // 3. 计算数值
  const maxHp = Math.round(baseHp * 80 * hpMul);
  const damageVal = (Math.max(physical, magical) * 5 + 10) * atkMul;
  // 经验奖励基础值按等级计算，并乘以稀有度
  const baseExp = 30 + lv * 5;
  const expReward = Math.floor(baseExp * expMul);
  const baseGold = 20 + lv * 5;
  const goldReward = Math.floor(baseGold * goldMul);
  const cooldown = 3;

  // 4. 构造名称，添加前缀
  const baseName = hero.name || '未知敌人';
  const name = prefix ? (prefix + baseName) : baseName;

  return {
    id: hero.id || `enemy_${Date.now()}`,
    level: lv,
    name,
    sprite: hero.icon ? `../icons/${hero.icon}` : 'icons/hero1.png',
    spriteSize: 120,
    spriteScale: 1.5,
    maxHp,
    atk: damageVal,
    turns: cooldown,
    gold: goldReward,
    exp: expReward,
    rarityTier: rarityOpt.tier,
    rarityColor: color,
    skill: {
      name: hero.skill?.name || '攻击',
      desc: hero.skill?.description || '普通攻击',
      cooldown,
      damage: damageVal
    },
    heroId: hero.id
  };
}

export function getMonster() {
  return monster;
}

/* ============================================================
   伤害结算：任何一次调用都会掉落 1 只宝箱
   ============================================================ */
   export function dealDamage(amount, { allowKill = false } = {}) {
    if (!monster) return 0;
  
    /* ---------- A. 正常扣血 ---------- */
    const nextHP = monster.hp - amount;
    if (!allowKill && nextHP <= 0) {
      monster.hp = 1;
    } else {
      monster.hp = Math.max(0, nextHP);
    }
  
    /* ---------- B. 生成宝箱 ---------- */
    if (amount > 0 && globalThis.canvasRef && globalThis.imageCache?.lootChests?.length) { // 📦Loot
      // 掉落宝箱概率调整：仅以一定概率生成宝箱
      const CHEST_DROP_PROB = 0.2; // 10%~25%之间取值，可根据需要调整
      if (Math.random() < CHEST_DROP_PROB) {
        try {
          const canvas = globalThis.canvasRef;
          // 起点：以当前怪物贴图中心为起始，添加少许随机抖动。
          // 如果 monsterSpritePos 不存在，回退到玩家 HP 条中心。
          let sx, sy;
          const sprite = globalThis.monsterSpritePos;
          if (sprite && typeof sprite.x === 'number' && typeof sprite.y === 'number') {
            sx = sprite.x + (Math.random() - 0.5) * 36;
            sy = sprite.y + (Math.random() - 0.5) * 36;
          } else {
            const hpBar = globalThis.hpBarPos || { x: canvas.width / 2 - 140, y: globalThis.__gridStartY - 20, width: 280, height: 20 };
            sx = hpBar.x + hpBar.width / 2 + (Math.random() - 0.5) * 36;
            sy = hpBar.y + hpBar.height / 2 + (Math.random() - 0.5) * 36;
          }

          // 终点：伤害槽区域（隐藏的计数槽）内随机位置，减少高度散布范围 40%。
          const gaugeTop = globalThis.__gridStartY - 170;
          const gaugeBottom = globalThis.__gridStartY - 80;
          // 将范围缩小到原来的 60%，并以中心为基准
          const fullRange = gaugeBottom - gaugeTop;
          const reducedRange = fullRange * 0.6;
          const centerY = gaugeTop + fullRange / 2;
          const eyMin = centerY - reducedRange / 2;
          const eyMax = centerY + reducedRange / 2;
          const ey = eyMin + Math.random() * (eyMax - eyMin);

          // 在水平方向上增加可视区域的随机散布，使用 5 个头像栏宽度相仿的范围
          const range = 5 * 48 + 4 * 12;
          const ex = (canvas.width - range) / 2 + Math.random() * range;

          createLootChest(sx, sy, ex, ey, 650); // 0.65 s 抛物
        } catch (err) {
          console.warn('[LootChest] 生成失败', err);
        }
      }
    }
  
    /* ---------- C. 捕捉系统触发 ---------- */
    // 当怪物生命降至 30% 以下且未触发过捕捉阶段时，回调捕捉界面。
    try {
      if (monster && !monster.isBoss && typeof monster.maxHp === 'number') {
        const threshold = monster.maxHp * 0.3;
        if (!monster._captureTriggered && monster.hp > 0 && monster.hp <= threshold) {
          monster._captureTriggered = true;
          if (typeof globalThis.enterCapturePhase === 'function') {
            // 将当前怪物信息传入捕捉界面。复制对象以免外部改动原怪物状态。
            globalThis.enterCapturePhase({ ...monster });
          }
        }
      }
    } catch (err) {
      console.warn('捕捉系统触发异常', err);
    }

    return monster.hp;
  }
  


export function isMonsterDead() {
  return !!monster && monster.hp <= 0;
}

export function monsterTurn() {
  if (!monster || !monster.skill) return null;
  turnCounter += 1;
  if (turnCounter >= monster.skill.cooldown) {
    turnCounter = 0;
    return monster.skill; // 调用方自行处理伤害 / 动画
  }
  return null;
}

export function getNextLevel() {
  return currentLevel + 1;
}


// 当前怪物的掉落金币
export function getMonsterGold() {
  return monster?.gold ?? 0;
}

export function getMonsterDamage() {
  const raw = monster?.atk ?? monster?.skill?.damage ?? 0;

  // 如果传进来的是 [min,max] 数组 → 在区间内抽一个整数
  if (Array.isArray(raw) && raw.length === 2) {
    const [min, max] = raw;
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  return raw;   // 仍兼容旧写法（单一数字）
}
