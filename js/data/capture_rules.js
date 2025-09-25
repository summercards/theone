// js/data/capture_rules.js  —— 使用 CommonJS (module.exports)，配合 require
const RARITY_BASE = {
    white: 0.60,  '白': 0.60,
    green: 0.50,  '绿': 0.50,
    blue:  0.40,  '蓝': 0.40,
    purple:0.30,  '紫': 0.30,
    orange:0.20,  '橙': 0.20,
    gold:  0.10,  '金': 0.10
  };
  
  const LEVEL_DECAY = 0.015;     // 每升1级 -1.5%
  const MIN_BASE_CHANCE = 0.05;  // 基础下限 5%
  
  const BALL_BONUS = {
    capture_ball: 0.00, // 普通球
    great_ball:   0.20, // +20%
    ultra_ball:   0.50  // +50%
  };
  
  function normalizeRarity(monster, HeroData) {
    let r = monster?.rarity || monster?.quality || monster?.rank;
    if (!r && monster?.heroId && HeroData) {
      try {
        let baseHero = null;
        if (HeroData.getHeroById) baseHero = HeroData.getHeroById(monster.heroId);
        else if (HeroData.heroes) baseHero = HeroData.heroes.find(h => h.id === monster.heroId);
        r = baseHero?.rarity || baseHero?.quality || baseHero?.rank;
      } catch (_) {}
    }
    if (typeof r === 'number') {
      const MAP = {1:'白',2:'绿',3:'蓝',4:'紫',5:'橙',6:'金'};
      r = MAP[r] || r;
    }
    return (typeof r === 'string') ? r.trim().toLowerCase() : 'white';
  }
  
  function computeBaseChance(monster, HeroData) {
    const key = normalizeRarity(monster, HeroData);
    const base0 = RARITY_BASE[key] ?? 0.40;
    const level = Math.max(1, Number(monster?.level || 1));
    const base = base0 - (level - 1) * LEVEL_DECAY;
    return Math.max(MIN_BASE_CHANCE, +base.toFixed(4));
  }
  
  function computeFinalCaptureChance(monster, ballId, HeroData) {
    const base  = computeBaseChance(monster, HeroData);
    const bonus = BALL_BONUS[ballId] ?? 0;
    const final = Math.min(0.95, Math.max(0.01, +(base * (1 + bonus)).toFixed(4)));
    return { base, bonus, final };
  }
  
  module.exports = {
    BALL_BONUS,
    LEVEL_DECAY,
    MIN_BASE_CHANCE,
    computeBaseChance,
    computeFinalCaptureChance
  };
  