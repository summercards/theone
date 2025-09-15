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

// 区域等级范围：不同区域产生不同等级的敌人
const areaLevelRanges = {
  forest: { min: 1, max: 3 },
  snow:   { min: 4, max: 6 }
};

// -----------------------------------------------------------
// 敌人稀有度设定：白色、绿色、蓝色，对应属性和经验倍率
// weight 表示出现概率权重；hpMul/atkMul/expMul/goldMul 定义属性倍率
// color 用于显示名称颜色
const rarityOptions = [
  { tier: 'white', weight: 60, hpMul: 1.0, atkMul: 1.0, expMul: 1.0, goldMul: 1.0, color: '#FFFFFF' },
  { tier: 'green', weight: 30, hpMul: 1.3, atkMul: 1.3, expMul: 1.5, goldMul: 1.2, color: '#00FF00' },
  { tier: 'blue',  weight: 10, hpMul: 1.6, atkMul: 1.6, expMul: 2.0, goldMul: 1.4, color: '#00BFFF' }
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


export function loadMonster(level = 1) {
  // 探索模式：根据全局选中的区域随机抽取敌人。
  currentLevel = level;
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
    // 将英雄转换为怪物格式，传入随机等级
    const proto = heroToMonster(chosen, randLv);
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
function heroToMonster(hero = {}, level = 1) {
  const baseHp = typeof hero.hp === 'number' ? hero.hp : 100;
  const attrs = hero.attributes || {};
  const physical = typeof attrs.physical === 'number' ? attrs.physical : 0;
  const magical  = typeof attrs.magical === 'number'  ? attrs.magical  : 0;
  const lv = hero.level || level || 1;
  // 随机决定稀有度并应用倍率
  const rarityOpt = randomRarity();
  const hpMul   = rarityOpt.hpMul;
  const atkMul  = rarityOpt.atkMul;
  const expMul  = rarityOpt.expMul;
  const goldMul = rarityOpt.goldMul;
  // 生命值和攻击力倍率
  const maxHp = Math.round(baseHp * 80 * hpMul);
  const damageVal = (Math.max(physical, magical) * 5 + 10) * atkMul;
  // 经验奖励基础值按等级计算，并乘以稀有度
  const baseExp = 30 + lv * 5;
  const expReward = Math.floor(baseExp * expMul);
  const baseGold = 20 + lv * 5;
  const goldReward = Math.floor(baseGold * goldMul);
  const cooldown = 3;
  return {
    id: hero.id || `enemy_${Date.now()}`,
    level: lv,
    name: hero.name || '未知敌人',
    sprite: hero.icon ? `../icons/${hero.icon}` : 'moster1-1.png',
    spriteSize: 120,
    spriteScale: 1.5,
    maxHp,
    atk: damageVal,
    turns: cooldown,
    gold: goldReward,
    exp: expReward,
    rarityTier: rarityOpt.tier,
    rarityColor: rarityOpt.color,
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
      try {
        const canvas = globalThis.canvasRef;
  
        /* 起点：怪物中心附近 ±18px */
        const sx = canvas.width / 2 + (Math.random() - 0.5) * 36;
        const sy = globalThis.__gridStartY - 200 + (Math.random() - 0.5) * 36;
  
        /* 终点：整条头像栏随机 */
        const heroBarW = 5 * 48 + 4 * 12;                    // 5 头像 + 4 间隔
        const ex = (canvas.width - heroBarW) / 2 + Math.random() * heroBarW;
        
        const ey = globalThis.__gridStartY - 80 + 48 + -160      // ▼ 基准改到头像下
                  + (Math.random() - 0.5) * 20;                //   再 ±10px 抖动
        createLootChest(sx, sy, ex, ey, 650);                      // 0.65 s 抛物
      } catch (err) {
        console.warn('[LootChest] 生成失败', err);
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
