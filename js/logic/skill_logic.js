import { expandGridTo } from '../utils/game_shared.js';
import { playBasketballEffect } from "../effects_engine.js";


export function applySkillEffect(hero, effect, context) {
  switch (effect.type) {
    case "expandGrid": {
      expandGridTo({ ...effect, hero }); // ⬅️ 传入 effect 中的 size, duration, hero
      context.log(`${hero.name} 扩展棋盘为 ${effect.size || 7}×${effect.size || 7}，持续 ${effect.duration || 2} 次操作`);
      break;
    }

    case "addGauge": {
      let add = 0;
      if ('value' in effect) add = effect.value;
      else if (effect.source === "physical")
        add = hero.attributes.physical * (effect.scale ?? 1);
      else if (effect.source === "magical")
        add = hero.attributes.magical * (effect.scale ?? 1);

      context.addGauge(add); // 用函数更新外部 gauge
      context.log(`${hero.name} 注入攻击槽：+${Math.round(add)}`);
      break;
    }

    case "mulGauge": {
      const factor = effect.factor ?? 1;
      context.mulGauge(factor);
      context.log(`${hero.name} 翻倍攻击槽 ×${factor}`);
    
      // MIO 专属：显示技能倍数飘字
      if (hero.id === 'hero002' && context.canvas) {
        const { createFloatingTextUp } = require('../effects_engine.js');
        const factor = hero.skill?.effect?.factor ?? effect.factor ?? 1;
        const text = `X${factor.toFixed(2)}`;
      
        // ✅ 以画布中心为基准，向右偏移
        const centerX = context.canvas.width / 2;
        const baseY = globalThis.__gridStartY - 100;
      
        const x = centerX + 80;   // 👉 向右偏移 80 像素
        const y = baseY;
      
        createFloatingTextUp(text, x, y, '#2DAD5A', 32, 620);
      }
      
    
      break;
    }
 
    case "mulGaugeByRangerCount": {
      const { baseFactor = 1.0, bonusPerRanger = 0.2, maxBonus = 2.0 } = effect;
      const { getSelectedHeroes } = require('../data/hero_state.js');
    
      const allHeroes = getSelectedHeroes(); // ✅ 获取真实上场英雄
      const rangerCount = allHeroes.filter(h => h?.role?.trim() === '游侠').length;
    
      const bonus = Math.min(bonusPerRanger * rangerCount, maxBonus);
      const finalFactor = baseFactor + bonus;
    
      context.mulGauge(finalFactor);
      context.log(`${hero.name} 技能触发，发现 ${rangerCount} 名游侠，攻击槽 ×${finalFactor.toFixed(2)}`);
    
      if (context.canvas) {
        const { createFloatingTextUp } = require('../effects_engine.js');
        const centerX = context.canvas.width / 2;
        const baseY = globalThis.__gridStartY - 100;
        const x = centerX + 80;
        const y = baseY;
        createFloatingTextUp(`×${finalFactor.toFixed(2)}`, x, y, '#2DAD5A', 32, 620);
      }
    
      break;
    }

    case "randomBoostAllGauge": {
        const { getSelectedHeroes } = require('../data/hero_state.js');
        const { getCharges, setCharge } = require('../data/hero_charge_state.js');
      
        const allHeroes = getSelectedHeroes();
        const charges = getCharges();
      
        const baseMin = effect.baseMin ?? 30;
        const baseMax = effect.baseMax ?? 40;
        const level = hero.level ?? 1;
      
        const realMin = baseMin + level;
        const realMax = baseMax + level;
      
        for (let i = 0; i < allHeroes.length; i++) {
          const h = allHeroes[i];
          if (!h) continue;
      
          const percent = Math.floor(Math.random() * (realMax - realMin + 1)) + realMin;
          const currentCharge = charges[i] ?? 0;
          const after = Math.min(100, currentCharge + percent);
      
          setCharge(i, after);
          context.log(`${hero.name} 为 ${h.name} 注入技能槽：+${percent}%（原 ${currentCharge} → ${after}）`);
        }
      
        break;
      }
      
      
    case "mageCountMagicDamage": {
      const { getSelectedHeroes } = require('../data/hero_state.js');
      const allHeroes = getSelectedHeroes();
      const mageCount = allHeroes.filter(h => h?.role?.trim() === '法师').length;
    
      const scale = effect.scale ?? 1.0;
      const damage = hero.attributes.magical * scale * mageCount;
    
      context.dealDamage(damage);
      context.log(`${hero.name} 造成 ${Math.round(damage)} 点魔法伤害（${mageCount} 名法师加成）`);
    
      // ✅ 飘字
      if (context.canvas) {
        const { createFloatingTextUp } = require('../effects_engine.js');
        const centerX = context.canvas.width / 2;
        const centerY = context.canvas.height * 0.3;
        const x = centerX + (Math.random() * 20 - 10);
        const y = centerY + (Math.random() * 10 - 5);
        createFloatingTextUp(`-${Math.round(damage)}`, x, y, '#66CCFF', 32, 500);
      }
    
      break;
    }
    
    
    case "multiHitPhysical": {
      const {
        baseHits = 2,
        // growthPerLevel = 3, // 等级成长功能已注释
        baseScale = 1.0,
        scaleStep = 0.1,
        delayStep = 300
      } = effect;
    
      const level = hero.level ?? 1;
      const growthPerLevel = effect.growthPerLevel ?? 1;
      const totalHits = baseHits + Math.floor((level - 1) / growthPerLevel);
    
      const canvas = context.canvas;
      const { createFloatingTextUp } = require('../effects_engine.js');
    
      for (let i = 0; i < totalHits; i++) {
        const delay = i * delayStep;
        const scale = baseScale + i * scaleStep;
    
        setTimeout(() => {
          const damage = Math.round(hero.attributes.physical * scale);
          context.dealDamage(damage);
          context.log(`${hero.name} 第 ${i + 1} 次斩击造成 ${damage} 点物理伤害`);
    
          if (canvas) {
            const centerX = canvas.width / 2;
            const centerY = canvas.height * 0.3;
            const x = centerX + (Math.random() * 20 - 10);
            const y = centerY + (Math.random() * 10 - 5);
            createFloatingTextUp(`-${damage}`, x, y, '#FF3333', 32, 500);
          }
        }, delay);
      }
    
      break;
    }
   
    
    case "addGaugeWithWarriorMultiplier": {
      const { getSelectedHeroes } = require('../data/hero_state.js');
      const allHeroes = getSelectedHeroes();
      const warriorCount = allHeroes.filter(h => h?.role?.trim() === '战士').length;
    
      const baseDamage = hero.attributes.physical * (effect.scale ?? 1);
      const totalDamage = baseDamage * warriorCount;
    
      context.addGauge(totalDamage);
      context.log(`${hero.name} 注入攻击槽：+${Math.round(totalDamage)} （包含 ${warriorCount} 个战士的伤害加成）`);
      break;
    }
    
    
    

    case "physicalDamage":
    case "magicalDamage": {
      context.dealDamage(effect.amount);
      context.log(`${hero.name} 造成 ${effect.amount} 点${effect.type === "physicalDamage" ? "物理" : "法术"}伤害`);
      break;
    }

    case "delayedDamage": {
      const base =
        effect.source === "physical" ? hero.attributes.physical :
        effect.source === "magical" ? hero.attributes.magical :
        0;
    
      const damage = effect.amount ?? Math.round(base * (effect.scale ?? 1));
    
      globalThis.__delayedSkillDamage = damage; // 给动画使用（可选）
    
      // ✅ 播放动画（可选）
      if (effect.animation === "basketball") {
        playBasketballEffect(context.canvas);
      }
    
      // ✅ 延迟触发伤害（如有）
      if (effect.delay && typeof globalThis.startAttackEffect === "function") {
        setTimeout(() => {
          globalThis.startAttackEffect(damage);
        }, effect.delay);
      } else {
        context.dealDamage(damage);
      }
    
      context.log(`${hero.name} 技能造成 ${damage} 点${effect.source === "magical" ? "法术" : "物理"}伤害`);
      break;
    }

    case "convertToFBlocks": {
      const pageGame = (() => {
        try {
          return require("../page_game.js");
        } catch {
          return {};
        }
      })();
    
      const { createPopEffect } = require("../effects_engine.js");
      const grid = context.gridData ?? pageGame.gridData ?? globalThis.gridData;
      const startX = context.__gridStartX ?? globalThis.__gridStartX ?? 0;
      const startY = context.__gridStartY ?? globalThis.__gridStartY ?? 0;
      const blockSize = context.__blockSize ?? globalThis.__blockSize ?? 48;
    
      if (!Array.isArray(grid)) {
        context.log("技能失败：未检测到棋盘");
        break;
      }
    
      const candidates = [];
      for (let r = 0; r < grid.length; r++) {
        for (let c = 0; c < grid[r].length; c++) {
          if (grid[r][c] && grid[r][c] !== 'F') {
            candidates.push({ r, c });
          }
        }
      }
    
      const count = 2 + (hero.level - 1);  // 初始2个，每级+1
      const shuffled = candidates.sort(() => Math.random() - 0.5);
      const selected = shuffled.slice(0, count);
    
      for (const { r, c } of selected) {
        grid[r][c] = 'F';
        const x = startX + c * blockSize + blockSize / 2;
        const y = startY + r * blockSize + blockSize / 2;
        createPopEffect(x, y, blockSize, 'F');
      }
    
      context.log(`${hero.name} 将 ${selected.length} 个方块变成了寒冰方块（F）`);
    
      try {
        (context.drawGame ?? pageGame.drawGame)?.();
      } catch {}
    
      break;
    }

    
    case "clearCoinBlocks": {
      const { createPopEffect, createExplosion, createFloatingText } = require("../effects_engine.js");
      const { addCoins } = require('../data/coin_state.js');
      const canvas = context.canvas;
      const pageGame = (() => {
        try {
          return require("../page_game.js");
        } catch {
          return {};
        }
      })();
      const grid = context.gridData ?? pageGame.gridData ?? globalThis.gridData;
      const startX = context.__gridStartX ?? globalThis.__gridStartX ?? 0;
      const startY = context.__gridStartY ?? globalThis.__gridStartY ?? 0;
      const blockSize = context.__blockSize ?? globalThis.__blockSize ?? 48;
      
    
      setTimeout(() => {
        if (!Array.isArray(grid)) {
          context.log("清除金币失败：未检测到棋盘");
          return;
        }
    
        let cleared = 0;
    
        for (let r = 0; r < grid.length; r++) {
          for (let c = 0; c < grid[r].length; c++) {
            if (grid[r][c] === 'D') {
              grid[r][c] = null;
              cleared++;
              const x = startX + c * blockSize + blockSize / 2;
              const y = startY + r * blockSize + blockSize / 2;
              createPopEffect(x, y, blockSize, 'D');
              createExplosion(x, y, '#FFD700');
            }
          }
        }
    
        const perBlock = (effect.coinPerBlock || 5) + (hero.level - 1);
        const total = cleared * perBlock;
        addCoins(total);
    
        createFloatingText(`+${total} 金币`, canvas.width / 2, 100, '#FFD700');
        context.log(`${hero.name} 技能清除 D 方块 ×${cleared}，每个 +${perBlock} 金币，共 ${total}`);
    
        try {
          const pageGame = require("../page_game.js");
          pageGame.dropBlocks?.();
          pageGame.fillNewBlocks?.();
          (context.drawGame ?? pageGame.drawGame)?.();

        } catch (err) {
          // 忽略错误：说明当前非 page_game 模式
        }
    
      }, 500);
    
      break;
    }
    
    case "convertToDBlocks": {
        const pageGame = (() => {
          try {
            return require("../page_game.js");
          } catch {
            return {};
          }
        })();
      

        const { createPopEffect, createExplosion } = require("../effects_engine.js");
        const grid = context.gridData ?? pageGame.gridData ?? globalThis.gridData;
        const startX = context.__gridStartX ?? globalThis.__gridStartX ?? 0;
        const startY = context.__gridStartY ?? globalThis.__gridStartY ?? 0;
        const blockSize = context.__blockSize ?? globalThis.__blockSize ?? 48;
        
      
        if (!Array.isArray(grid)) {
          context.log("技能失败：未检测到棋盘");
          break;
        }
      
        const candidates = [];
        for (let r = 0; r < grid.length; r++) {
          for (let c = 0; c < grid[r].length; c++) {
            if (grid[r][c] && grid[r][c] !== 'C') {
              candidates.push({ r, c });
            }
          }
        }
      
        const baseCount = effect.baseCount ?? effect.count ?? 3;
        const count = baseCount + (hero.level - 1);
        const shuffled = candidates.sort(() => Math.random() - 0.5);
        const selected = shuffled.slice(0, count);
      
        for (const { r, c } of selected) {
          grid[r][c] = 'D';
          const x = startX + c * blockSize + blockSize / 2;
          const y = startY + r * blockSize + blockSize / 2;
          createPopEffect(x, y, blockSize, 'D');
          createExplosion(x, y, '#FFD700');
        }
        
        try {
          (context.drawGame ?? pageGame.drawGame)?.();
        } catch {}
      
        context.log(`${hero.name} 将 ${selected.length} 个方块变成了魔法方块（D）`);
        break;
      }
      
      case "addGaugeByDBlockCount": {
        const pageGame = (() => {
          try {
            return require("../page_game.js");
          } catch {
            return {};
          }
        })();
      
        const grid = context.gridData ?? pageGame.gridData ?? globalThis.gridData;
        if (!Array.isArray(grid)) {
          context.log("技能失败：未检测到棋盘");
          break;
        }
      
        let count = 0;
        for (let r = 0; r < grid.length; r++) {
          for (let c = 0; c < grid[r].length; c++) {
            if (grid[r][c] === 'D') {
              count++;
            }
          }
        }
      
        const base = hero.attributes.physical ?? 0;
        const total = base * count;
      
        context.addGauge(total);
        context.log(`${hero.name} 技能触发，发现 ${count} 个炸弹方块，注入伤害槽 +${total}`);
      
        // ✅ 飘字提示
        if (context.canvas) {
          const { createFloatingTextUp } = require('../effects_engine.js');
          const centerX = context.canvas.width / 2;
          const baseY = globalThis.__gridStartY - 100;
          const x = centerX + 80;
          const y = baseY;
          createFloatingTextUp(`+${total}`, x, y, '#FFAA00', 32, 620);
        }
      
        break;
      }
      
      
    
    case "teamHealAndBuff": {
      context.allies?.forEach(ally => {
        ally.hp += hero.attributes.healing * effect.healScale;
        ally.buffs.push({ ...effect.buff, duration: effect.duration });
      });
      context.log(`${hero.name} 释放群体治疗`);
      break;
    }

    case "convertToEBlocks": {
      const pageGame = (() => {
        try {
          return require("../page_game.js");
        } catch {
          return {};
        }
      })();


      const { createPopEffect } = require("../effects_engine.js");
      const grid = context.gridData ?? pageGame.gridData ?? globalThis.gridData;
      const startX = context.__gridStartX ?? globalThis.__gridStartX ?? 0;
      const startY = context.__gridStartY ?? globalThis.__gridStartY ?? 0;
      const blockSize = context.__blockSize ?? globalThis.__blockSize ?? 48;
      

      if (!Array.isArray(grid)) {
        context.log("技能失败：未检测到棋盘");
        break;
      }

      // 收集所有非E方块位置
      const candidates = [];
      for (let r = 0; r < grid.length; r++) {
        for (let c = 0; c < grid[r].length; c++) {
          if (grid[r][c] && grid[r][c] !== 'E') {
            candidates.push({ r, c });
          }
        }
      }

      // 随机打乱，选出 N 个目标
      const count = 2 + (hero.level - 1);
      const shuffled = candidates.sort(() => Math.random() - 0.5);
      const selected = shuffled.slice(0, count);

      for (const { r, c } of selected) {
        grid[r][c] = 'E';
        const x = startX + c * blockSize + blockSize / 2;
        const y = startY + r * blockSize + blockSize / 2;
        createPopEffect(x, y, blockSize, 'E');
      }

      context.log(`${hero.name} 将 ${selected.length} 个方块变成了刺客方块（E）`);

      try {
        (context.drawGame ?? pageGame.drawGame)?.();

      } catch {}
      break;
    }

    case "boostAllGauge": {
      const percent = 10 + (hero.level - 1); // 每级 +1%
      const gaugeFraction = percent / 100;

      const allHeroes = [hero, ...(context.allies ?? [])];

      for (const h of allHeroes) {
        const max = h.skill?.cooldown ?? 3;
        const gain = Math.ceil(max * gaugeFraction);
        h.skillGauge = Math.min((h.skillGauge ?? 0) + gain, max);
      }

      context.log(`${hero.name} 技能触发，所有英雄的技能槽增加 ${percent}%`);
      break;
    }
    case "healPlayer": {
      const base = effect.baseHeal ?? 20;
      const growth = effect.growthRate ?? 0.1;
      const level = hero.level ?? 1;
    
      const healAmount = Math.floor(base * (1 + growth * (level - 1)));
    
      const { getPlayerHp, getPlayerMaxHp, healPlayer } = require('../data/player_state.js');
      const curHp = getPlayerHp();
      const maxHp = getPlayerMaxHp();
      const after = Math.min(maxHp, curHp + healAmount);
    
      healPlayer(healAmount);
      context.log(`${hero.name} 为玩家恢复 ${healAmount} 点生命（当前 ${curHp} → ${after}）`);
    
      if (context.canvas) {
        const { createFloatingTextUp } = require('../effects_engine.js');
        const centerX = context.canvas.width / 2;
        const centerY = context.canvas.height * 0.25;
        createFloatingTextUp(`+${healAmount} HP`, centerX, centerY, '#66FF99', 32, 600);
      }
    
      break;
    }
    
    default:
      console.warn("未知技能类型：", effect.type);
  }
}
