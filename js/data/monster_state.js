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
  
    /* ---------- B. 按单次伤害生成宝箱 ---------- */
    if (amount > 0 && globalThis.canvasRef && globalThis.imageCache?.lootChests?.length) { // 📦Loot
      try {
        const canvas = globalThis.canvasRef;
        const dropCount = amount >= 5000
          ? 2 + (Math.random() < 0.4 ? 1 : 0)
          : amount >= 1500
            ? 1 + (Math.random() < 0.45 ? 1 : 0)
            : amount >= 300
              ? (Math.random() < 0.75 ? 1 : 0)
              : (Math.random() < 0.3 ? 1 : 0);

        const rollChestTier = () => {
          const roll = Math.random();
          if (amount >= 5000) return roll < 0.45 ? 2 : roll < 0.8 ? 1 : 0;
          if (amount >= 1500) return roll < 0.2 ? 2 : roll < 0.65 ? 1 : 0;
          return roll < 0.15 ? 1 : 0;
        };
  
        for (let i = 0; i < dropCount; i++) {
          /* 起点：怪物中心附近 ±18px */
          const sx = canvas.width / 2 + (Math.random() - 0.5) * 36;
          const sy = globalThis.__gridStartY - 280 + (Math.random() - 0.5) * 36;
          // 落在怪物血条正上方：垂直随机偏差控制在 ±3px，且不遮挡血条。
          const bar = globalThis.monsterHpBarPos;
          const ex = (bar?.x ?? canvas.width / 2 - 140) + (bar?.width ?? 280) / 2 + (Math.random() - 0.5) * 110;
          const ey = (bar?.y ?? globalThis.__gridStartY - 165) - 30 + (Math.random() - 0.5) * 6;
          createLootChest(sx, sy, ex, ey, 650, rollChestTier());
        }
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
