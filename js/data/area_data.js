// js/data/area_data.js
// ------------------------------------------------------------
// 区域配置：用于“探索”模式下按区域随机选择敌人。
// 本模块基于 hero_data 而非怪物数据，
// 将英雄列表按索引划分到不同区域，作为可能遇到的敌人池。

const HeroData = require('./hero_data.js');

/**
 * 区域与可遇敌人的映射。可根据需要扩展更多区域。
 * 这里采用简单的索引划分：
 * forest 区域包括英雄列表中前半部分；
 * snow 区域包括英雄列表中后半部分。
 * 如需更复杂的划分，可根据 hero.id 或自定义字段筛选。
 */
const heroes = HeroData.heroes || [];

// 计算四等分索引，尽量平均地划分英雄池
const total = heroes.length;
const quarter = Math.max(1, Math.floor(total / 4));
const areaHeroes = {
  forest: heroes.slice(0, quarter),
  snow:   heroes.slice(quarter, quarter * 2),
  desert: heroes.slice(quarter * 2, quarter * 3),
  volcano: heroes.slice(quarter * 3)
};
// 兜底：如果某个区域没有英雄，则退回全列表
for (const key of Object.keys(areaHeroes)) {
  if (!Array.isArray(areaHeroes[key]) || areaHeroes[key].length === 0) {
    areaHeroes[key] = heroes.slice();
  }
}

module.exports = areaHeroes;