// js/data/monster_state.js
import { monsters } from './monster_data.js';

let currentLevel = 1;
let monster = null;
let turnCounter = 0;
let defeatedBossLevel = 0; // 记录击败的最高 boss 等级


export function markBossDefeated(level) {
    if (level > defeatedBossLevel) {
      defeatedBossLevel = level;
    }
  }
  
  export function hasDefeatedBoss2() {
    return true;
    //return defeatedBossLevel >= 20;
  }


export function loadMonster(level = 1) {
  currentLevel = level;
  const proto = monsters.find(m => m.level === level) || monsters.at(-1);
  // 深拷贝，避免直接改动原型
  monster = JSON.parse(JSON.stringify(proto));
  monster.hp = monster.maxHp;
  turnCounter = 0;
    // ✅ 加入经验字段（如果数据里没有，就用默认值）
    monster.exp = proto.exp ?? (30 + level * 5);  // 你可以改为固定值如 50
  return monster;
}

export function getMonster() {
  return monster;
}

export function dealDamage(amount, { allowKill = false } = {}) {
  if (!monster) return 0;

  const nextHP = monster.hp - amount;

  // 非终结伤害不能击杀
  if (!allowKill && nextHP <= 0) {
    monster.hp = 1;
  } else {
    monster.hp = Math.max(0, nextHP);
  }

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


// 当前怪物的掉落金币
export function getMonsterGold() {
  return monster?.gold ?? 0;
}

export function getMonsterDamage() {
  return monster?.atk ?? monster?.skill?.damage ?? 0;
}