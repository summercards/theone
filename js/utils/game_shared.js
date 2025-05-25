// js/utils/game_shared.js
export let expandGridTo       = () => {};
export let addToAttackGauge   = () => {};
export let monsterHitFlashTime = 0;

export function registerGameHooks({ expand, addGauge, hitFlash }) {
  if (expand)  expandGridTo       = expand;
  if (addGauge) addToAttackGauge = addGauge;
  if (hitFlash !== undefined) monsterHitFlashTime = hitFlash;
}
