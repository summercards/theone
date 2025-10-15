// js/data/exp_state.js
// ------------------------------------------------------------
// 经验系统（芯片经验池 + 英雄等级/经验）

/** 存档键 */
const KEY_LEVELS = 'heroLevels';     // { [heroId]: number }
const KEY_EXPS   = 'heroExps';       // { [heroId]: number }
const KEY_POOL   = 'chipExpPool';    // number，可分配的“芯片经验”总量

/* ---------------- 存取工具 ---------------- */
function readJSON(key, defVal) {
  try { const v = wx.getStorageSync(key); return (v && typeof v === 'object') ? v : (Array.isArray(v) ? v : (typeof v === 'number' ? v : defVal)); }
  catch(e) { return defVal; }
}
function writeJSON(key, val) {
  try { wx.setStorageSync(key, val); } catch(e) {}
}

/* ---------------- 经验曲线 ---------------- */
/** 升下一级所需经验：lv→lv+1
 *  lv=1 需100；lv=2 需150；lv=3 需200；…… 线性递增，手感平滑
 */
export function expNeedFor(lv) { return 100 + (lv - 1) * 50; }

/* ---------------- 芯片经验池（用道具增加） ---------------- */
export function getChipExp() {
  const n = readJSON(KEY_POOL, 0);
  return (typeof n === 'number' && n >= 0) ? n : 0;
}
export function addChipExp(delta) {
  const now = getChipExp();
  const next = Math.max(0, Math.floor(now + (delta || 0)));
  writeJSON(KEY_POOL, next);
  return next;
}

/* ---------------- 英雄等级 / 经验 ---------------- */
export function getHeroLevel(heroId) {
  const map = readJSON(KEY_LEVELS, {});
  return Math.max(1, Math.floor(map[heroId] || 1));
}
export function setHeroLevel(heroId, lv) {
  const map = readJSON(KEY_LEVELS, {});
  map[heroId] = Math.max(1, Math.floor(lv || 1));
  writeJSON(KEY_LEVELS, map);
}

export function getHeroExp(heroId) {
  const map = readJSON(KEY_EXPS, {});
  return Math.max(0, Math.floor(map[heroId] || 0));
}
export function setHeroExp(heroId, exp) {
  const map = readJSON(KEY_EXPS, {});
  map[heroId] = Math.max(0, Math.floor(exp || 0));
  writeJSON(KEY_EXPS, map);
}

/** 查询：距下一级还差多少经验 */
export function expToNext(heroId) {
  const lv  = getHeroLevel(heroId);
  const cur = getHeroExp(heroId);
  const need = expNeedFor(lv);
  return Math.max(0, need - cur);
}

/** 把芯片经验池用于指定英雄升级（可一次升多级）
 *  @param heroId string
 *  @param maxLevels number | undefined  限制最多升几级（按钮一次升1级可传1）
 *  @returns { gainedLevels, leftoverPool, newLevel, newExp, usedExp }
 */
export function tryLevelUp(heroId, maxLevels) {
  let pool  = getChipExp();
  let lv    = getHeroLevel(heroId);
  let cur   = getHeroExp(heroId);
  let gained = 0;
  const capLevels = Math.max(1, Math.floor(maxLevels || 99));

  while (gained < capLevels) {
    const need = expNeedFor(lv);
    if (cur >= need) {
      // 进级
      lv += 1; cur -= need; gained += 1;
      continue;
    }
    const remain = need - cur;
    if (pool < remain) break; // 池子不够升到下一级
    // 用池子补齐并升级
    pool -= remain;
    lv   += 1;
    cur   = 0;
    gained += 1;
  }

  // 写回
  setHeroLevel(heroId, lv);
  setHeroExp(heroId, cur);
  writeJSON(KEY_POOL, pool);

  return {
    gainedLevels: gained,
    leftoverPool: pool,
    newLevel: lv,
    newExp: cur,
    usedExp: (getChipExp() + (gained ? 0 : 0)) // 兼容占位
  };
}
