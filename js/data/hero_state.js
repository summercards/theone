const HeroData = require('./hero_data.js');
const { spendCoins } = require('./coin_state.js');

// ========================================================
// 单个英雄的运行时状态
// ========================================================
class HeroState {
  constructor(id) {
    const base = HeroData.getHeroById(id);

    // --- 基础数据 ---
    this.id     = base.id;
    this.name   = base.name;
    this.icon   = base.icon;
    this.role   = base.role;
    this.rarity = base.rarity;
    this.skill  = base.skill;
    this.levelUpConfig   = base.levelUpConfig || {};
    this.expToNextLevel  = base.expToNextLevel || 100;
    this.unlockCost      = base.unlockCost     || 0;
    this.hireCost        = base.hireCost || 200;  // ✅ 加上这一行

    // --- 进度（本地覆盖） ---
    const saved = wx.getStorageSync('heroProgress')?.[id];
    this.attributes = saved?.attributes ?? { ...base.attributes };
    this.level      = saved?.level      ?? base.level ?? 1;
    this.exp        = saved?.exp        ?? base.exp   ?? 0;
    this.locked     = saved?.locked ?? base.locked ?? false;
  }

  /** 尝试解锁：金币足够 → 扣款并解锁，返回 true；否则 false */
  tryUnlock() {
    if (!this.locked) return true;               // 已解锁
    if (spendCoins(this.unlockCost)) {
      this.locked = false;
      saveHeroProgress(this);
      wx.showToast({ title: '解锁成功', icon: 'success' });
      return true;
    }
    wx.showToast({ title: '金币不足', icon: 'none' });
    return false;
  }

  /** 获得经验（含自动升级 & 存档） */
  gainExp(amount) {
    this.exp += amount;
    while (this.exp >= this.expToNextLevel) {
      this.exp -= this.expToNextLevel;
      this.levelUp();
    }
    saveHeroProgress(this);
  }

  /** 升级一次 */
  levelUp() {
    this.level++;
    const growth = this.levelUpConfig.attributeGrowth || {};
    for (const key in growth) {
      if (!this.attributes[key]) this.attributes[key] = 0;
      this.attributes[key] += growth[key];
    }

    if (this.levelUpConfig.unlockSkills?.[this.level]) {
      console.log(`${this.name} 解锁技能：${this.levelUpConfig.unlockSkills[this.level]}`);
    }

    this.expToNextLevel = Math.floor(this.expToNextLevel * 1.2);
  }
}

// ========================================================
// 英雄选择（5 slot）状态管理
// ========================================================
let selectedHeroes = [null, null, null, null, null];

function setSelectedHeroes(ids) {
  selectedHeroes = ids.map(id => (id ? new HeroState(id) : null));
}

function getSelectedHeroes() {
  return selectedHeroes;
}

// ========================================================
// 存档
// ========================================================
function saveHeroProgress(hero) {
  const data = wx.getStorageSync('heroProgress') || {};
  data[hero.id] = {
    level:      hero.level,
    exp:        hero.exp,
    attributes: hero.attributes,
    locked:     hero.locked
  };
  wx.setStorageSync('heroProgress', data);
}

// ========================================================
// 导出
// ========================================================
module.exports = {
  HeroState,
  setSelectedHeroes,
  getSelectedHeroes
};
