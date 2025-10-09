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
// === 平原(原“雪地”) 购买解锁存档键 ===
const PLAINS_UNLOCK_KEY = 'plains_unlocked_v1';

// === 金币存取（与项目现有用法一致：使用 totalCoins 键） ===
function getCoins() {
  return Number(wx.getStorageSync('totalCoins') || 0);
}
function setCoins(v) {
  wx.setStorageSync('totalCoins', Math.max(0, v | 0));
}

// 是否已解锁平原（购买）
export function isPlainsUnlocked() {
  return !!wx.getStorageSync(PLAINS_UNLOCK_KEY);
}

// 花费金币尝试解锁平原，默认 2000
export function tryUnlockPlainsWithGold(cost = 2000) {
  const coins = getCoins();
  if (coins < cost) return { ok: false, reason: 'not_enough_gold' };
  setCoins(coins - cost);
  wx.setStorageSync(PLAINS_UNLOCK_KEY, 1);
  return { ok: true };
}

// 记录区域探索中遭遇敌人的次数，用于触发必定出现高稀有度敌人。
let battleCounter = 0;

// 测试用传奇敌人出现概率。正式版本可以调低至 0.1。
const LEGENDARY_PROB = 0.3;

// ===== 统一成长（稳定 & 只出整数） =====
const BASE_HP_WHITE_L1  = 100;  // 白色1级基准HP
const HP_GROWTH         = 1.18; // 等级成长系数（指数但温和）
const ENEMY_GLOBAL_BUFF = 1.4;  // 敌人全局 +40%（需要时可改 1.0）

// 稀有度 → HP 倍率（注意包含 yellow/gold）
const RARITY_HP = {
    white: 1.00, green: 1.25, blue: 1.90, purple: 2.50, yellow: 3.20, gold: 4.20
};

// 区域等级范围：不同区域产生不同等级的敌人
const areaLevelRanges = {
  forest:  { min: 1,  max: 10 },
  snow:    { min: 4,  max: 6  },
  desert:  { min: 7,  max: 9  },
  volcano: { min: 10, max: 12 }
};

// -----------------------------------------------------------
// 敌人稀有度设定（基础权重/颜色/倍率表；yellow/gold 在下方派生）
const rarityOptions = [
  { tier: 'white',  weight: 60, base: { hpMul: 1.0, atkMul: 1.0, expMul: 1.0, goldMul: 1.0, color: '#FFFFFF' } },
  { tier: 'green',  weight: 25, base: { hpMul: 1.3, atkMul: 1.3, expMul: 1.5, goldMul: 1.2, color: '#00FF00' } },
  { tier: 'blue',   weight: 10, base: { hpMul: 1.6, atkMul: 1.6, expMul: 2.0, goldMul: 1.4, color: '#00BFFF' } },
  { tier: 'purple', weight:  5, base: { hpMul: 1.9, atkMul: 1.9, expMul: 2.3, goldMul: 1.6, color: '#C71585' } },
];

// 稀有度抽取
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

// 由 tier 获取倍率与颜色（yellow/gold 基于 purple 派生）
function getBaseMultipliersForTier(tier) {
  const t = String(tier || 'white').toLowerCase();
  const found = rarityOptions.find(o => o.tier === t);
  if (found) return { ...found.base };

  // yellow 与 gold：在 purple 基础上放大（固定系数，避免范围随机）
  const purple = rarityOptions.find(o => o.tier === 'purple')?.base
              || { hpMul:1.9, atkMul:1.9, expMul:2.3, goldMul:1.6, color:'#C71585' };

  if (t === 'yellow') {
    const f = 1.25;
    return {
      hpMul: purple.hpMul * f,
      atkMul: purple.atkMul * f,
      expMul: purple.expMul * f,
      goldMul: purple.goldMul * f,
      color: '#FFC107'
    };
  }
  if (t === 'gold') {
    const f = 1.60; // 让 atkMul = 1.9 * 1.6 = 3.04
    return {
      hpMul: purple.hpMul * f,
      atkMul: purple.atkMul * f,
      expMul: purple.expMul * f,
      goldMul: purple.goldMul * f,
      color: '#FFD700'
    };
  }
  // 兜底
  return { hpMul:1.0, atkMul:1.0, expMul:1.0, goldMul:1.0, color:'#FFFFFF' };
}

export function markBossDefeated(level) {
  if (level > defeatedBossLevel) {
    defeatedBossLevel = level;
  }
}

// 解锁地图条件
export function hasDefeatedBoss2() { return defeatedBossLevel >= 20; } // 魔界森林
export function hasDefeatedBoss3() { return defeatedBossLevel >= 40; } // 荒漠
export function hasDefeatedBoss4() { return defeatedBossLevel >= 60; } // 火山

export function loadMonster(level = 1) {
  // 探索模式：根据全局选中的区域随机抽取敌人。
  currentLevel = level;
  // 每加载一个敌人都计入战斗计数器。战斗计数达到一定次数会触发高稀有度。
  battleCounter++;
  try {
    const area = globalThis.selectedArea || 'forest';
    let pool = areaMonsters[area];
    if (!pool || pool.length === 0) pool = HeroData.heroes || [];

    // 随机选取一个英雄作为敌人（若空回退第一个）
    const hero   = pool[Math.floor(Math.random() * pool.length)];
    const chosen = hero || (HeroData.heroes && HeroData.heroes[0]) || {};

    // 根据区域随机生成等级范围
    const range  = areaLevelRanges[area] || { min: 1, max: 1 };
    const randLv = Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;

    // 稀有度强制：第10次必紫（不被传奇覆盖）；否则按概率出金
    let forcedRarity = null;
    let forcedPrefix = '';
    if (battleCounter >= 10) {
      forcedRarity = { tier: 'purple' };
      forcedPrefix = '紫色·';
      battleCounter = 0;
    } else if (Math.random() < LEGENDARY_PROB) {
      forcedRarity = { tier: 'gold' };
      forcedPrefix = '传奇·';
    }

    // 将英雄转换为怪物格式
    const proto  = heroToMonster(chosen, randLv, forcedRarity, forcedPrefix);
    proto.level  = randLv;

    // 深拷贝，避免直接改动原型
    monster      = JSON.parse(JSON.stringify(proto));
    monster.hp   = monster.maxHp;
    turnCounter  = 0;

    // 经验字段：如果数据里没有，就用默认值
    const baseLevel = proto.level || 1;
    monster.exp     = proto.exp ?? (30 + baseLevel * 5);

  } catch (err) {
    console.warn('区域加载敌人失败，退回默认逻辑', err);
    const fallbackHero = (HeroData.heroes && HeroData.heroes[0]) || {};
    const proto = heroToMonster(fallbackHero, level);
    monster     = JSON.parse(JSON.stringify(proto));
    monster.hp  = monster.maxHp;
    turnCounter = 0;
    monster.exp = proto.exp ?? (30 + level * 5);
  }
  return monster;
}

/**
 * 将英雄数据转换为敌人的数据结构。统一使用“稳定成长 + 取整”规则，避免数值爆炸/小数。
 * @param {Object} hero - 英雄基础数据
 * @param {number} level - 当前关卡或等级信息，用于经验/金币等计算
 * @param {Object|null} forcedRarity - 可选强制稀有度（{tier:'purple'|'gold'|...}）
 * @param {string} forcedPrefix - 显示名前缀
 */
function heroToMonster(hero = {}, level = 1, forcedRarity = null, forcedPrefix = '') {
  const baseHp   = typeof hero.hp === 'number' ? hero.hp : 100;
  const attrs    = hero.attributes || {};
  const physical = typeof attrs.physical === 'number' ? attrs.physical : 0;
  const magical  = typeof attrs.magical  === 'number' ? attrs.magical  : 0;

  // 等级取法：优先关卡传入，其次英雄自带，最后 1
  const lv = (typeof level === 'number' ? level : hero.level) || 1;

  // 1) 稀有度：优先使用强制稀有度，否则随机
  let rarityOpt;
  if (forcedRarity && forcedRarity.tier) {
    rarityOpt = { tier: forcedRarity.tier };
  } else {
    rarityOpt = randomRarity();
  }

  // 2) 成长与稀有度倍率（HP 统一用 RARITY_HP，颜色/其余倍率来自表/派生）
  const growth       = Math.pow(HP_GROWTH, Math.max(1, (lv | 0)) - 1);
  const rarityTier   = (rarityOpt?.tier || 'white').toLowerCase();
  const hpMulUnified = RARITY_HP[rarityTier] ?? 1.0;

  const baseMultipliers = getBaseMultipliersForTier(rarityTier); // {hpMul, atkMul, expMul, goldMul, color}
  const atkMul  = baseMultipliers.atkMul || 1.0;
  const expMul  = baseMultipliers.expMul || 1.0;
  const goldMul = baseMultipliers.goldMul || 1.0;
  const color   = baseMultipliers.color   || '#FFFFFF';

  // 3) 最终数值（全部取整，无小数）
  // HP：统一基准 * 稀有度 * 等级成长 * 敌人全局BUFF
  const maxHp = Math.max(1, Math.round(BASE_HP_WHITE_L1 * hpMulUnified * growth * ENEMY_GLOBAL_BUFF));

  // ATK：英雄攻击底子 * 稀有度 ATK 倍数 * 线性等级成长（每级+6%）* 全局BUFF
  const baseDmg   = Math.max(1, (Math.max(physical, magical) * 5 + 10));
  const dmgGrowth = 1 + 0.06 * (Math.max(1, (lv | 0)) - 1);
  const damageVal = Math.max(1, Math.floor(baseDmg * atkMul * dmgGrowth * ENEMY_GLOBAL_BUFF));

  // EXP/GOLD：把 BUFF 放进 floor，保证整数
  const expReward  = Math.max(1, Math.floor((30 + lv * 5) * expMul  * ENEMY_GLOBAL_BUFF));
  const goldReward = Math.max(1, Math.floor((20 + lv * 5) * goldMul * ENEMY_GLOBAL_BUFF));

  // 4) 名称（保留前缀）
  const prefix   = forcedPrefix || (rarityTier === 'gold' ? '传奇·' : (rarityTier === 'yellow' ? '首领·' : ''));
  const baseName = hero.name || '未知敌人';
  const name     = prefix ? (prefix + baseName) : baseName;

  const cooldown = 3; // 出手冷却（保持不变）

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
    rarityTier,
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
   伤害结算：任何一次调用都会有概率掉落 1 只宝箱
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
    // 掉落宝箱概率（可调整）
    const CHEST_DROP_PROB = 0.2;
    if (Math.random() < CHEST_DROP_PROB) {
      try {
        const canvas = globalThis.canvasRef;
        // 起点：以当前怪物贴图中心为起始，添加少许随机抖动
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

        // 终点：伤害槽区域内随机位置，减少高度散布范围
        const gaugeTop    = globalThis.__gridStartY - 170;
        const gaugeBottom = globalThis.__gridStartY - 80;
        const fullRange   = gaugeBottom - gaugeTop;
        const reduced     = fullRange * 0.6;
        const centerY     = gaugeTop + fullRange / 2;
        const eyMin       = centerY - reduced / 2;
        const eyMax       = centerY + reduced / 2;
        const ey          = eyMin + Math.random() * (eyMax - eyMin);

        // 水平方向随机
        const range = 5 * 48 + 4 * 12;
        const ex    = (canvas.width - range) / 2 + Math.random() * range;

        createLootChest(sx, sy, ex, ey, 650); // 0.65 s 抛物
      } catch (err) {
        console.warn('[LootChest] 生成失败', err);
      }
    }
  }

  /* ---------- C. 捕捉系统触发 ---------- */
  try {
    if (monster && !monster.isBoss && typeof monster.maxHp === 'number') {
      const threshold = monster.maxHp * 0.3;
      if (!monster._captureTriggered && monster.hp > 0 && monster.hp <= threshold) {
        monster._captureTriggered = true;
        if (typeof globalThis.enterCapturePhase === 'function') {
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
  // 区间伤害 → 在区间内抽一个整数
  if (Array.isArray(raw) && raw.length === 2) {
    const [min, max] = raw;
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
  return raw; // 单值
}
