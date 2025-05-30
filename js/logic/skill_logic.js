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
    
    case "addGaugeWithWarriorMultiplier": {
        // 确保 context.allies 存在，如果不存在，使用空数组作为默认值
        let warriorsOnField = 0;
        const allHeroes = (context.allies || []).concat(hero); // 确保所有英雄（包括当前英雄自己）都被计算在内
    
        console.log("所有英雄：", allHeroes); // 输出所有英雄，检查是否包括战士
        
        allHeroes.forEach(h => {
            console.log("英雄角色：", h.role); // 输出每个英雄的角色，确认它们是否正确
            if (h.role.trim().toLowerCase() === '战士'.toLowerCase()) {  // 确保 role 不包含空格并正确匹配
                warriorsOnField++;
            }
        });
    
        // 计算伤害加成：物理攻击力 * 每个战士的数量
        const baseDamage = hero.attributes.physical * effect.scale;
        const totalDamage = baseDamage * warriorsOnField; // 根据战士数量计算总伤害
    
        context.addGauge(totalDamage);
        context.log(`${hero.name} 注入攻击槽：+${Math.round(totalDamage)} （包含 ${warriorsOnField} 个战士的伤害加成）`);
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
      const grid = pageGame.gridData ?? globalThis.gridData;
      

      const startX = globalThis.__gridStartX ?? 0;
      const startY = globalThis.__gridStartY ?? 0;
      const blockSize = globalThis.__blockSize ?? 48;
    
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
          pageGame.drawGame?.();
        } catch (err) {
          // 忽略错误：说明当前非 page_game 模式
        }
    
      }, 500);
    
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

      const grid = pageGame.gridData ?? globalThis.gridData;
      const { createPopEffect } = require("../effects_engine.js");
      const startX = globalThis.__gridStartX ?? 0;
      const startY = globalThis.__gridStartY ?? 0;
      const blockSize = globalThis.__blockSize ?? 48;

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
        pageGame.drawGame?.();
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

    default:
      console.warn("未知技能类型：", effect.type);
  }
}
