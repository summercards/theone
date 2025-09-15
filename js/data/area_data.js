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

// 计算中点，将英雄列表划分为两半。
const mid = Math.floor(heroes.length / 2);
const areaHeroes = {
  forest: heroes.slice(0, mid),
  snow:   heroes.slice(mid),
};

module.exports = areaHeroes;