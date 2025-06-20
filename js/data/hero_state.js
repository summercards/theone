// js/data/hero_state.js
const HeroData = require('./hero_data.js');
const { spendCoins } = require('./coin_state.js');
const { createHeroLevelUpEffect } = require('../effects_engine.js');

// ========================================================
// 单个英雄的运行时状态
// ========================================================
class HeroState {
  constructor(id) {
    const base = HeroData.getHeroById(id);
    const saved = wx.getStorageSync('heroProgress')?.[id];

    this.id     = base.id;
    this.name   = base.name;
    this.icon   = base.icon;
    this.role   = base.role;
    this.rarity = base.rarity;
    this.skill  = base.skill;
    this.levelUpConfig   = base.levelUpConfig || {};
    this.expToNextLevel  = 50 + (base.level || 1) * (base.level || 1) * 10;
    this.unlockCost      = base.unlockCost     || 0;
    this.hireCost        = base.hireCost || 200;
    this.onLevelUp = null;

    // ✅ 新增 HP（注意顺序必须在 saved 定义之后）
    this.hp = saved?.hp ?? base.hp ?? 100;

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
    while (this.level < 15) {
      const required = 50 + this.level * this.level * 10;
      if (this.exp >= required) {
        this.exp -= required;
        this.levelUp();
      } else {
        break;
      }
    }
    if (this.level >= 15) {
      this.exp = 0;
    }
    saveHeroProgress(this);
  }

  levelUp() {
    this.level++;

    // ✅ 升级加属性
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
  data[hero.id] = {
    level:      hero.level,
    exp:        hero.exp,
    attributes: hero.attributes,
    locked:     hero.locked,
    hp:         hero.hp   // ✅ 保存 HP
  };
  wx.setStorageSync('heroProgress', data);
}

export function clearSelectedHeroes () {
  setSelectedHeroes(Array(5).fill(null));
}

function getRequiredExpForLevel(level) {
  return 50 + level * level * 10;
}

module.exports = {
  HeroState,
  setSelectedHeroes,
  getSelectedHeroes,
  getRequiredExpForLevel
};
