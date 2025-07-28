// data/hero_charge_state.js
let charges = Array(5).fill(0);
import HeroData from './hero_data.js';
export function getCharges () {
  return charges;
}


export function setCharge (index, value) {
    const maxCharge = HeroData.heroes[index]?.maxCharge || 100;
    charges[index] = Math.max(0, Math.min(maxCharge, value));
  }

/** 在每局开始时调用，清空全部蓄力条 */
export function resetCharges () {
  charges = Array(5).fill(0);
}
