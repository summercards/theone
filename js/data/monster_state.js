// js/data/monster_state.js
import { monsters } from './monster_data.js';
import { createLootChest } from '../effects_engine.js';   // 📦LootChest
let currentLevel = 1;
let monster = null;
let turnCounter = 0;
let defeatedBossLevel = 0; // 记录击败的最高 boss 等级


export function markBossDefeated(level) {
    if (level > defeatedBossLevel) {
      defeatedBossLevel = level;
    }
  }
  
  //解锁魔界森林的条件
  export function hasDefeatedBoss2() {
    //return true;
    return defeatedBossLevel >= 20;
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

/* ============================================================
   伤害结算：任何一次调用都会掉落 1 只宝箱
   ============================================================ */
   export function dealDamage(amount, { allowKill = false } = {}) {
    if (!monster) return 0;
  
    /* ---------- A. 正常扣血 ---------- */
    const nextHP = monster.hp - amount;
    if (!allowKill && nextHP <= 0) {
      monster.hp = 1;
    } else {
      monster.hp = Math.max(0, nextHP);
    }
  
    /* ---------- B. 生成宝箱 ---------- */
    if (amount > 0 && globalThis.canvasRef && globalThis.imageCache?.lootChests?.length) { // 📦Loot
      try {
        const canvas = globalThis.canvasRef;
  
        /* 起点：怪物中心附近 ±18px */
        const sx = canvas.width / 2 + (Math.random() - 0.5) * 36;
        const sy = globalThis.__gridStartY - 200 + (Math.random() - 0.5) * 36;
  
        /* 终点：整条头像栏随机 */
        const heroBarW = 5 * 48 + 4 * 12;                    // 5 头像 + 4 间隔
        const ex = (canvas.width - heroBarW) / 2 + Math.random() * heroBarW;
        
        const ey = globalThis.__gridStartY - 80 + 48 + -160      // ▼ 基准改到头像下
                  + (Math.random() - 0.5) * 20;                //   再 ±10px 抖动
        createLootChest(sx, sy, ex, ey, 650);                      // 0.65 s 抛物
      } catch (err) {
        console.warn('[LootChest] 生成失败', err);
      }
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
  const raw = monster?.atk ?? monster?.skill?.damage ?? 0;

  // 如果传进来的是 [min,max] 数组 → 在区间内抽一个整数
  if (Array.isArray(raw) && raw.length === 2) {
    const [min, max] = raw;
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  return raw;   // 仍兼容旧写法（单一数字）
}
