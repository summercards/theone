// js/data/hero_charge_state.js
// 保存 5 槽位蓄力值（0–100）
const chargeVals = [0, 0, 0, 0, 0];

export function setCharge(index, value) {
  chargeVals[index] = Math.max(0, Math.min(100, value));
}

export function getCharges() {
  return chargeVals;
}
