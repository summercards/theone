const HeroData = require('./hero_data.js');

class HeroState {
  constructor(id) {
    const baseData = HeroData.getHeroById(id);

    this.id = baseData.id;
    this.name = baseData.name;
    this.icon = baseData.icon;
    this.role = baseData.role;
    this.rarity = baseData.rarity;
    this.skill = baseData.skill;
    this.levelUpConfig = baseData.levelUpConfig || {};
    this.expToNextLevel = baseData.expToNextLevel || 100;

    // ✅ 加载保存的进度（如有），否则使用初始属性
    const saved = wx.getStorageSync('heroProgress')?.[id];
    this.attributes = saved?.attributes || { ...baseData.attributes };
    this.level = saved?.level || baseData.level || 1;
    this.exp = saved?.exp || baseData.exp || 0;
  }

  gainExp(amount) {
    this.exp += amount;
    let leveledUp = false;
    while (this.exp >= this.expToNextLevel) {
      this.exp -= this.expToNextLevel;
      this.levelUp();
      leveledUp = true;
    }
  
    // ✅ 即使没升级，也保存进度
    if (!leveledUp) {
      saveHeroProgress(this);
    }
  }

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
    saveHeroProgress(this);
  }
}

// ================== 英雄选择状态管理 ==================
let selectedHeroes = [null, null, null, null, null];

/**
 * 设置选中的英雄 ID 列表，转换为 HeroState 实例
 * @param {Array<string>} heroes - 英雄ID数组（最多5个）
 */
function setSelectedHeroes(heroes) {
  selectedHeroes = heroes.map(id => {
    return id ? new HeroState(id) : null;
  });
}

/**
 * 获取当前的 HeroState 实例数组
 * @returns {Array<HeroState|null>}
 */
function getSelectedHeroes() {
  return selectedHeroes;
}

module.exports = {
  HeroState,
  setSelectedHeroes,
  getSelectedHeroes
};

function saveHeroProgress(hero) {
  let data = wx.getStorageSync('heroProgress') || {};
  data[hero.id] = {
    level: hero.level,
    exp: hero.exp,
    attributes: hero.attributes
  };
  wx.setStorageSync('heroProgress', data);
}
