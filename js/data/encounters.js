// js/data/encounters.js
// 森林(1~10)遇敌控制 + 数值重算（英雄即敌人）

// —— 英雄数据入口（与你的 hero_data.js 保持一致）——
import HeroData from './hero_data.js';
const HEROES = HeroData?.heroes || (HeroData.getAllHeroes?.() || []);

// —— 把“编号 01~06”解析成实际 heroId ——
// 规则：优先匹配 h.code/h.no/h.serial 等字段；否则再看 id/名字尾部两位数字；最后匹配 HERO_001 这类。
function idsFromCodes(codes) {
  const want = new Set(codes.map(c => String(c).padStart(2, '0')));
  const out  = new Set();

  // pass1：显式编号字段
  for (const h of HEROES) {
    const cands = [h.code, h.no, h.serial, h.index, h.num]
      .filter(v => v != null)
      .map(v => String(v).padStart(2, '0'));
    if (cands.some(cd => want.has(cd))) out.add(h.id);
  }
  // pass2：id/名字末尾两位数字
  for (const h of HEROES) {
    if (out.has(h.id)) continue;
    const tail2 = (String(h.id).match(/(\d{2})$/)?.[1])
               || (String(h.name||'').match(/(\d{2})$/)?.[1]);
    if (tail2 && want.has(tail2)) out.add(h.id);
  }
  // pass3：HERO_001 / 1 → 01
  for (const h of HEROES) {
    if (out.has(h.id)) continue;
    const m = String(h.id).match(/(\d{1,3})$/);
    if (m && want.has(String(m[1]).padStart(2,'0'))) out.add(h.id);
  }
  return Array.from(out);
}

// —— 森林池：编号 01~06 ——
// 如果你知道精确 heroId，直接替换为 const FOREST_POOL = ['HERO_001','HERO_002',...];
const FOREST_POOL = idsFromCodes(['01','02','03','04','05','06']);

// —— 数值公式 ——
// 目标：白 1 级 ≈ 100 HP
const BASE_HP_WHITE_L1 = 100;
const RARITY_MULT = { white:1.00, green:1.25, blue:1.60, purple:2.20, orange:2.80, gold:3.20 };
const levelGrowth = (lv) => Math.pow(1.18, Math.max(1, (lv|0)) - 1);
const BOSS_MULT = 6.0; // 第 10 关 Boss 倍率（可按手感微调）

/** 按英雄稀有度与关卡等级重算敌人 HP / 攻击（等比缩放伤害，避免错位） */
export function recomputeEnemyStats(enemy, hero, level, isBoss=false) {
  const rarity = (hero?.rarity || hero?.quality || enemy?.rarityTier || 'white').toLowerCase();
  const oldHp  = Number(enemy?.maxHp || enemy?.hp || BASE_HP_WHITE_L1);

  let hp = Math.round(BASE_HP_WHITE_L1 * (RARITY_MULT[rarity] || 1) * levelGrowth(level));
  if (isBoss) hp = Math.round(hp * BOSS_MULT);

  // 等比缩放伤害
  const ratio = oldHp > 0 ? (hp / oldHp) : 1;

  enemy.level = level|0;
  enemy.isBoss = !!isBoss;
  enemy.maxHp = hp;
  enemy.hp    = hp;

  if (enemy.skill && enemy.skill.damage != null) {
    if (Array.isArray(enemy.skill.damage)) {
      enemy.skill.damage = enemy.skill.damage.map(v => Math.max(1, Math.floor(v * ratio)));
      enemy.atk = enemy.skill.damage[0];
    } else {
      enemy.skill.damage = Math.max(1, Math.floor(enemy.skill.damage * ratio));
      enemy.atk = enemy.skill.damage;
    }
  } else if (typeof enemy.atk === 'number') {
    enemy.atk = Math.max(1, Math.floor(enemy.atk * ratio));
  }

  enemy.rarityTier = rarity;
  return enemy;
}

/** 确保森林 1~10 关只出 01~06 的英雄；若不在池内则替换，并重算数值 */
export function ensureEncounter(level, enemy) {
  if (!enemy) return enemy;
  if (level < 1 || level > 10) return enemy;  // 只干预森林段

  const pool = FOREST_POOL && FOREST_POOL.length ? FOREST_POOL : [];
  if (pool.length === 0) {
    console.warn('[encounters] Forest pool empty — 请检查 01~06 的英雄编号映射');
    return enemy;
  }

  const isBoss = (level % 10 === 0);
  const inPool = pool.includes(enemy.heroId);
  const getHero = (id) =>
    (HeroData.getHeroById ? HeroData.getHeroById(id) : HEROES.find(h => h.id === id));
  const pickId  = () => pool[Math.floor(Math.random() * pool.length)];
  const targetId = inPool ? enemy.heroId : pickId();

  if (!inPool) enemy.heroId = targetId; // 替换为池内英雄
  const hero = getHero(targetId);
  return recomputeEnemyStats(enemy, hero, level, isBoss);
}
