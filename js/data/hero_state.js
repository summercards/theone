// js/data/hero_state.js
const HeroData = require('./hero_data.js');
const { spendCoins } = require('./coin_state.js');
const { createHeroLevelUpEffect } = require('../effects_engine.js');

// ========================================================
// 单个英雄的运行时状态
// ========================================================
const MAX_LEVEL = 50;

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

    // ✅ 新增 HP（注意顺序必须在 saved 定义之后）
    this.hp = saved?.hp ?? base.hp ?? 100;

    // 📌 捕捉得到的英雄可能带有稀有度，用于自定义成长曲线
    this.rarityTier = saved?.rarity || base.rarityTier || null;

    const rawAttrs = saved?.attributes ?? { ...base.attributes };
    const heroName = base.name ?? "未知英雄";

    this.attributes = new Proxy(rawAttrs, {
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

    this.level      = saved?.level      ?? base.level ?? 1;
    this.exp        = saved?.exp        ?? base.exp   ?? 0;
    // 锁定状态：实例化的派生 ID 默认为解锁状态
    this.locked     = saved?.locked ?? base.locked ?? false;
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

    // ✅ 升级加属性
    // 捕捉英雄（带实例ID）使用基于稀有度的成长曲线；否则使用基础 levelUpConfig
    if (this.rarityTier && ['white','green','blue'].includes(this.rarityTier)) {
      // 稀有度成长表：每级属性和HP提升
      const RARITY_GROWTH = {
        white: { attribute: 1, hp: 5 },
        green: { attribute: 2, hp: 10 },
        blue:  { attribute: 3, hp: 15 }
      };
      const growthVals = RARITY_GROWTH[this.rarityTier] || { attribute: 1, hp: 5 };
      // 为每个已存在属性增加成长值
      for (const key in this.attributes) {
        this.attributes[key] += growthVals.attribute;
      }
      // 若没有属性（极端情况），给物攻+增长
      if (Object.keys(this.attributes).length === 0) {
        this.attributes.physical = growthVals.attribute;
      }
      // HP 增长
      this.hp += growthVals.hp;
    } else {
      // 使用基础配置成长
      const growth = this.levelUpConfig.attributeGrowth || {};
      for (const key in growth) {
        if (!this.attributes[key]) this.attributes[key] = 0;
        this.attributes[key] += growth[key];
      }
      // ✅ 升级加 HP
      const hpGrowth = this.levelUpConfig.hpGrowth ?? 0;
      if (hpGrowth > 0) {
        this.hp += hpGrowth;
      }
    }

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
      attributes: hero.attributes,
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
