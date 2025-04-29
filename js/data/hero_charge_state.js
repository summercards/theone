// js/data/hero_charge_state.js
let chargeVals = [0, 0, 0, 0, 0];   // 对应 5 槽位，单位 0-100

function setCharge(index, value) { chargeVals[index] = Math.max(0, Math.min(100, value)); }
function getCharges() { return chargeVals; }

module.exports = { setCharge, getCharges };
