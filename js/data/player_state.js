// js/data/player_state.js
//------------------------------------------------------------
// 初始生命值提升至 150，增强前期生存能力
let maxHp  = 150;
let hp     = maxHp;

// 允许关卡或英雄天赋动态设定
export function initPlayer(startHp = 150) {
  // 使用更高的默认生命值，如需要也可传入其他值
  maxHp = startHp;
  hp    = maxHp;
}

export function getPlayerHp()       { return hp;     }
export function getPlayerMaxHp()    { return maxHp;  }
export function isPlayerDead()      { return hp <= 0;}

export function heal(amount = 0) {
  hp = Math.min(maxHp, hp + amount);
  return hp;
}

export function takeDamage(amount = 0) {
  hp = Math.max(0, hp - amount);
  return hp;
}

export { heal as healPlayer };