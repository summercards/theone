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

    default:
      console.warn("未知技能类型：", effect.type);
  }
}
