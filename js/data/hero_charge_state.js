// data/hero_charge_state.js
let charges = Array(5).fill(0);

export function getCharges () {
  return charges;
}

export function setCharge (index, value) {
  charges[index] = Math.max(0, Math.min(100, value));
}

/** 在每局开始时调用，清空全部蓄力条 */
export function resetCharges () {
  charges = Array(5).fill(0);
}
