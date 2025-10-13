// js/data/area_data.js
// ------------------------------------------------------------
// 区域配置：用于“探索/地图”按区域随机选择敌人（用英雄做敌人池）。
// 本模块基于 hero_data，而不是独立的怪物表。

const HeroData = require('./hero_data.js');

// 小工具：把 ID 数组转为对象数组并过滤无效 ID
function idsToObjs(ids) {
  return ids
    .map(id => (typeof HeroData.getHeroById === 'function'
      ? HeroData.getHeroById(id)
      : null))
    .filter(Boolean);
}

/**
 * 固定分布（按你的要求）：
 * - forest : hero001 - hero005
 * - plains : hero006 - hero010
 * - desert : hero011 - hero015
 * - volcano: hero015 - hero019   // 15 同时属于荒漠与火山
 */
const areaHeroes = {
  forest:  idsToObjs(['hero001','hero002','hero003','hero004','hero005']),
  plains:  idsToObjs(['hero006','hero007','hero008','hero009','hero010']),
  desert:  idsToObjs(['hero011','hero012','hero013','hero014','hero015']),
  volcano: idsToObjs(['hero015','hero016','hero017','hero018','hero019']),
};

// 兜底：如果某个区域为空（比如对应 ID 在 hero_data 中不存在），退回全列表
const heroes = Array.isArray(HeroData.heroes) ? HeroData.heroes.slice() : [];
for (const key of Object.keys(areaHeroes)) {
  if (!Array.isArray(areaHeroes[key]) || areaHeroes[key].length === 0) {
    areaHeroes[key] = heroes.slice();
  }
}

module.exports = areaHeroes;
