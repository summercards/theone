// js/data/player_state.js
//------------------------------------------------------------
let maxHp  = 100;
let hp     = maxHp;

// 允许关卡或英雄天赋动态设定
export function initPlayer(startHp = 100) {
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
