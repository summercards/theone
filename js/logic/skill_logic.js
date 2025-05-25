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
      context.mulGauge(effect.factor ?? 1);
      context.log(`${hero.name} 翻倍攻击槽 ×${effect.factor}`);
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
