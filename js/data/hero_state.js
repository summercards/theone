// js/data/hero_state.js
const HeroData = require('./hero_data.js');
const { spendCoins } = require('./coin_state.js');
const { createHeroLevelUpEffect } = require('../effects_engine.js');

// ========================================================
// 单个英雄的运行时状态
// ========================================================
const MAX_LEVEL = 50;

/* --------------------- 新增：乘法成长支持（最小入侵） --------------------- */
/** 按稀有度的默认“每级倍率”（示例，可按策划调整） */
const RARITY_MULT_DEFAULT = {
  white:  { attrMul: 1.02, hpMul: 1.03 },
  green:  { attrMul: 1.03, hpMul: 1.04 },
  blue:   { attrMul: 1.05, hpMul: 1.06 },
  purple: { attrMul: 1.07, hpMul: 1.08 },
  yellow: { attrMul: 1.09, hpMul: 1.10 },
  gold:   { attrMul: 1.12, hpMul: 1.15 },
};

function _powi(b, e) {
  const base = Number(b), exp = Number(e);
  if (!isFinite(base) || base <= 0) return 1;
  if (!isFinite(exp) || exp <= 0) return 1;
  return Math.pow(base, exp);
}

/**
 * 从基础模板 + 等级 + 稀有度 计算最终属性（乘法成长）
 * 支持在英雄模板上用 growthMul / growthMulByRarity 覆盖默认倍率：
 *  - growthMul: { attrMul: 1.06, hpMul: 1.08 }
 *  - growthMul: { attrMul: {physical:1.07, magic:1.05}, hpMul:1.07 }
 *  - growthMulByRarity: { gold:{...}, blue:{...} } // 优先级更高
 */
function computeStatsByMultiplier(base, level, rarity) {
  const lvlUps = Math.max(0, (Number(level) || 1) - 1);
  const rarityKey = String(rarity || 'white').toLowerCase();

  const heroMulByRarity = base?.growthMulByRarity?.[rarityKey];
  const heroMul = heroMulByRarity || base?.growthMul || null;
  const defMul  = RARITY_MULT_DEFAULT[rarityKey] || RARITY_MULT_DEFAULT.white;

  const rawAttrMul =
    (heroMul && heroMul.attrMul != null) ? heroMul.attrMul :
    (defMul  && defMul.attrMul  != null) ? defMul.attrMul  : 1.0;

  const hpMulPerLevel =
    (heroMul && heroMul.hpMul != null) ? heroMul.hpMul :
    (defMul  && defMul.hpMul  != null) ? defMul.hpMul  : 1.0;

  const baseAttrs = { ...(base?.attributes || {}) };
  const baseHp    = (typeof base?.hp === 'number' && isFinite(base.hp)) ? base.hp : 100;

  const outAttrs = {};
  if (rawAttrMul && typeof rawAttrMul === 'object') {
    // 分属性倍率
    for (const k of Object.keys(baseAttrs)) {
      const perLevel = Number(rawAttrMul[k] ?? 1.0);
      outAttrs[k] = Math.round(Number(baseAttrs[k] || 0) * _powi(perLevel, lvlUps));
    }
  } else {
    // 统一倍率
    const perLevel = Number(rawAttrMul || 1.0);
    const mul = _powi(perLevel, lvlUps);
    for (const k of Object.keys(baseAttrs)) {
      outAttrs[k] = Math.round(Number(baseAttrs[k] || 0) * mul);
    }
  }

  const hp = Math.round(Number(baseHp) * _powi(Number(hpMulPerLevel || 1.0), lvlUps));
  return { hp, attributes: outAttrs };
}
/* --------------------- ↑ 新增逻辑仅被构造/升级调用 ↑ --------------------- */

class HeroState {
  constructor(id) {
    // 支持实例化派生ID（如 hero001_xxxxx），通过下划线前缀匹配原型
    const fullId = id;
    const baseId = String(id).split('_')[0];
    const base   = HeroData.getHeroById(baseId) || {};
    // 取出与完整ID对应的保存数据
    const saved  = wx.getStorageSync('heroProgress')?.[fullId];

    // 将实例 ID 和基础 ID 保存
    this.id     = fullId;
    this.baseId = baseId;
    this.name   = base.name;
    this.icon   = base.icon;
    this.role   = base.role;
    this.rarity = base.rarity;
    this.skill  = base.skill;
    this.levelUpConfig   = base.levelUpConfig || {};
    this.expToNextLevel  = 50 + (base.level || 1) * (base.level || 1) * 10;
    this.unlockCost      = base.unlockCost     || 0;
    // 将雇佣费用统一调整为友好的默认值：若定义了 hireCost，则不超过 10；否则默认为 10
    this.hireCost        = base.hireCost !== undefined
      ? Math.min(base.hireCost, 10)
      : 10;
    this.onLevelUp = null;

    // 捕捉得到的英雄可能带有稀有度，用于自定义成长曲线（保存为小写便于查表）
    this.rarityTier = (saved?.rarity || base.rarityTier || 'white').toLowerCase();

    // 等级/经验等仍沿用你的原有逻辑
    this.level      = saved?.level      ?? base.level ?? 1;
    this.exp        = saved?.exp        ?? base.exp   ?? 0;
    // 锁定状态：实例化的派生 ID 默认为解锁状态
    this.locked     = saved?.locked ?? base.locked ?? false;

    /* 关键改动：
       —— 忽略存档里的 hp/attributes，统一“从基础模板 + 等级 + 稀有度”重算 —— */
    const { hp, attributes } = computeStatsByMultiplier(base, this.level, this.rarityTier);

    // ✅ 新的数值作为运行时展示/战斗的来源
    this.hp = hp;

    const heroName = base.name ?? "未知英雄";
    this.attributes = new Proxy({ ...attributes }, {
      set(target, prop, value) {
        const old = target[prop];
        if (old !== value) {
          console.log(
            `%c⚠️ ${heroName} 属性变更: [${prop}] 从 ${old} ➜ ${value}`,
            'color: red; font-weight: bold; background: #fff3f3; padding: 2px 4px;'
          );


  
        }
        target[prop] = value;
        return true;
      },
      get(target, prop) {
        return target[prop];
      }
    });

    // —— 新增：构造完成后立刻把重算结果写回存档 ——
// 确保英雄池（优先读存档）能拿到“按等级×倍率重算”的最新数值
try { saveHeroProgress(this); } catch (e) { console.warn('sync hero stats to store failed', e); }

  }

  tryUnlock() {
    if (!this.locked) return true;
    if (spendCoins(this.unlockCost)) {
      this.locked = false;
      saveHeroProgress(this);
      wx.showToast({ title: '解锁成功', icon: 'success' });
      return true;
    }
    wx.showToast({ title: '金币不足', icon: 'none' });
    return false;
  }

  gainExp(amount) {
    this.exp += amount;
    // 当积累的经验达到升级需求时循环升级，直到达到上限
    while (this.level < MAX_LEVEL) {
      const required = 50 + this.level * this.level * 10;
      if (this.exp >= required) {
        this.exp -= required;
        this.levelUp();
      } else {
        break;
      }
    }
    // 如果已达等级上限，则清零经验避免溢出
    if (this.level >= MAX_LEVEL) {
      this.exp = 0;
    }
    saveHeroProgress(this);
  }

  levelUp() {
    this.level++;

    /* 关键改动：
       —— 不做“在当前值上加/乘”的增量运算 —— 
       —— 而是把 level+1 后，直接从基础模板重算（避免误差、统一口径） —— */
    const base = HeroData.getHeroById(this.baseId) || {};
    const { hp, attributes } = computeStatsByMultiplier(base, this.level, this.rarityTier);

    // 覆盖到当前数值（保持其余事件/特效逻辑不变）
    this.hp = hp;
    // 同步每个属性键
    for (const k of Object.keys(attributes)) this.attributes[k] = attributes[k];
    // 删除可能不存在的旧属性键（若基础模板调整过）
    for (const k of Object.keys(this.attributes)) if (!(k in attributes)) delete this.attributes[k];

    // —— 下面保持你原有的升级事件/特效/解锁等逻辑不变 —— //
    // 特例处理
    if (this.id === 'hero002') {
      const skillEffect = this.skill.effect;
      if (skillEffect && skillEffect.type === "mulGauge") {
        skillEffect.factor += 0.05;
      }
    }

    if (this.levelUpConfig.unlockSkills?.[this.level]) {
      console.log(`${this.name} 解锁技能：${this.levelUpConfig.unlockSkills[this.level]}`);
    }

    if (typeof getSelectedHeroes === 'function') {
      const index = getSelectedHeroes().findIndex(h => h?.id === this.id);
      if (index >= 0) {
        createHeroLevelUpEffect(index);
      }
    }

    if (typeof this.onLevelUp === 'function') {
      this.onLevelUp();
    }

    this.expToNextLevel = 50 + this.level * this.level * 10;
    saveHeroProgress(this);
  }
}

let selectedHeroes = [null, null, null, null, null];

function setSelectedHeroes(ids) {
  selectedHeroes = ids.map(id => (id ? new HeroState(id) : null));
}

function getSelectedHeroes() {
  return selectedHeroes;
}
function saveHeroProgress(hero) {
    const data = wx.getStorageSync('heroProgress') || {};
    const old  = data[hero.id] || {};
  
    // 保留已存在的 rarity（white/green/blue/purple/yellow/gold），
    // 若没有则用当前实例的 rarityTier。
    const rarityToSave = (typeof old.rarity !== 'undefined' && old.rarity !== null)
      ? old.rarity
      : (hero.rarityTier || null);
  
    data[hero.id] = {
      ...old,                 // 先保留旧字段，避免丢失
      level:      hero.level,
      exp:        hero.exp,
      attributes: { ...hero.attributes },
      locked:     hero.locked,
      hp:         hero.hp,
      rarity:     rarityToSave
    };
    wx.setStorageSync('heroProgress', data);
  }
  

export function clearSelectedHeroes () {
  setSelectedHeroes(Array(5).fill(null));
}

function getRequiredExpForLevel(level) {
  return 50 + level * level * 10;
}

function unlockHero(heroId) {
    const hero = new HeroState(heroId);
    if (!hero.locked) return;
  
    hero.locked = false;
    saveHeroProgress(hero);
    console.log(`✅ 英雄 ${hero.name} 解锁成功`);
  }

  
module.exports = {
  HeroState,
  setSelectedHeroes,
  getSelectedHeroes,
  getRequiredExpForLevel,
  unlockHero // ✅ 新增导出
};
