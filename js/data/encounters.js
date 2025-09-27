// js/data/encounters.js
// 森林(1~10)遇敌控制 + 数值重算（英雄即敌人）

// —— 英雄数据入口（与你的 hero_data.js 保持一致）——
import HeroData from './hero_data.js';
const HEROES = HeroData?.heroes || (HeroData.getAllHeroes?.() || []);

// ===== 与 monster_state.js 保持一致的统一常量（只保留这一套） =====
const BASE_HP_WHITE_L1 = 100;   // 白 1级基准 HP
const HP_GROWTH        = 1.18;  // 等级成长（温和指数）
const ENEMY_GLOBAL_BUFF = 1.4;  // 敌人全局 +40%（如需关闭改为 1.0）
const RARITY_MULT = {           // 稀有度倍率（含 yellow）
    white: 1.00, green: 1.25, blue: 1.90, purple: 2.50, yellow: 3.20, gold: 4.20
};
// Boss 倍率温和，避免 10 级上万
const BOSS_MULT = 3.5;
const levelGrowth = (lv) => Math.pow(HP_GROWTH, Math.max(1, (lv|0)) - 1);

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
// 如果你要 01~05，把最后一个去掉：['01','02','03','04','05']
const FOREST_POOL = idsFromCodes(['01','02','03','04','05','06']);

/** 按本局稀有度 + 等级统一重算敌人 HP / ATK（只出整数，稳定成长） */
export function recomputeEnemyStats(enemy, hero, level, isBoss = false) {
  // ✅ 稀有度优先级：本局抽到的 > 英雄原稀有度
  const rarity = (enemy?.rarityTier || hero?.rarity || hero?.quality || 'white').toLowerCase();

  // 旧 HP 用于按比例缩放伤害
  const oldHp = Number(enemy?.maxHp || enemy?.hp || BASE_HP_WHITE_L1);

  // 统一 HP 公式（含 BUFF，取整）
  let hp = Math.round(BASE_HP_WHITE_L1 * (RARITY_MULT[rarity] || 1) * levelGrowth(level) * ENEMY_GLOBAL_BUFF);
  if (isBoss) hp = Math.round(hp * BOSS_MULT);

  // 等比缩放 ATK（保持手感）
  const ratio = oldHp > 0 ? (hp / oldHp) : 1;

  enemy.level = level | 0;
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
