// js/data/monster_state.js
import { monsters } from './monster_data.js';

let currentLevel = 1;
let monster = null;
let turnCounter = 0;

export function loadMonster(level = 1) {
  currentLevel = level;
  const proto = monsters.find(m => m.level === level) || monsters.at(-1);
  // 深拷贝，避免直接改动原型
  monster = JSON.parse(JSON.stringify(proto));
  monster.hp = monster.maxHp;
  turnCounter = 0;
  return monster;
}

export function getMonster() {
  return monster;
}

export function dealDamage(amount) {
  if (!monster) return 0;
  monster.hp = Math.max(0, monster.hp - amount);
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
