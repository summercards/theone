import { expandGridTo } from '../utils/game_shared.js';
import { playBasketballEffect } from "../effects_engine.js";
import { createFloatingText } from "../effects_engine.js";  // 引入 createFloatingText 函数

export function applySkillEffect(hero, effect, context) {
  switch (effect.type) {
    case "expandGrid": {
      expandGridTo({ ...effect, hero }); // ⬅️ 传入 effect 中的 size, duration, hero
      context.log(`${hero.name} 扩展棋盘为 ${effect.size || 7}×${effect.size || 7}，持续 ${effect.duration || 2} 次操作`);
      break;
    }

    case "addGauge": {
      let add = 0;
      let usedValue = 0;
      let sourceName = "";
    
      if ('value' in effect) {
        add = effect.value;
        usedValue = add;
        sourceName = "直接数值";
      } else if (effect.source === "physical") {
        usedValue = hero.attributes.physical;
        add = usedValue * (effect.scale ?? 1);
        sourceName = "物攻";
      } else if (effect.source === "magical") {
        usedValue = hero.attributes.magical;
        add = usedValue * (effect.scale ?? 1);
        sourceName = "法攻";
      }
    
      context.addGauge(add);
    
      // 获取技能倍数（例如 X1.1, X1.2）
      const factor = effect.scale ?? 1;  // 获取技能的倍数
    
      // 调用 createFloatingText 来显示倍数
      createFloatingText(`X${factor.toFixed(1)}`, canvasRef.width / 2, 200, 'red', 48, 5000);

    
      // 详细调试日志
      console.log(`[技能释放] ${hero.name}`);
      console.log(`  ↳ 当前等级: Lv.${hero.level}`);
      console.log(`  ↳ 当前 ${sourceName}: ${usedValue}`);
      console.log(`  ↳ 技能倍率: x${effect.scale ?? 1}`);
      console.log(`  ↳ 注入攻击槽值: ${add}`);
    
      context.log(`${hero.name} 注入攻击槽：+${Math.round(add)}`);
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
    
      // 播放动画（可选）
      if (effect.animation === "basketball") {
        playBasketballEffect(context.canvas);
      }
    
      // 延迟触发伤害（如有）
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
      const { gridData, dropBlocks, fillNewBlocks, drawGame } = require("../page_game.js");
      const { createPopEffect, createExplosion, createFloatingText } = require("../effects_engine.js");
      const { __gridStartX, __gridStartY, __blockSize } = globalThis;
      const { addCoins } = require('../data/coin_state.js');
      const canvas = context.canvas;
    
      // 延迟执行主技能效果（300ms）
      setTimeout(() => {
        let cleared = 0;
        const grid = gridData;
    
        for (let r = 0; r < grid.length; r++) {
          for (let c = 0; c < grid[r].length; c++) {
            if (grid[r][c] === 'D') {
              grid[r][c] = null;
              cleared++;
            }
          }
        }
    
        for (let r = 0; r < grid.length; r++) {
          for (let c = 0; c < grid[r].length; c++) {
            if (grid[r][c] === null) {
              const x = __gridStartX + c * __blockSize + __blockSize / 2;
              const y = __gridStartY + r * __blockSize + __blockSize / 2;
              createPopEffect(x, y, __blockSize, 'D');
              createExplosion(x, y, '#FFD700');
            }
          }
        }
    
        const perBlock = (effect.coinPerBlock || 5) + (hero.level - 1);
        const total = cleared * perBlock;
        addCoins(total);
    
        // 显示金币增加效果
        createFloatingText(`+${total} 金币`, canvas.width / 2, 100, '#FFD700');
        context.log(`${hero.name} 技能清除 D 方块 ×${cleared}，每个 +${perBlock} 金币，共 ${total}`);
    
        dropBlocks();
        fillNewBlocks();
        drawGame();
      }, 500); // 延迟 300 毫秒执行技能动画与效果
    
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
