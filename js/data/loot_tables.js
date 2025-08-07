// js/data/loot_tables.js
// ------------------------------------------------------------
// 宝箱掉落表 + 结算（已修正 import 路径、返回数据、去掉金币 toast）
// ------------------------------------------------------------
import { addItem }  from './inventory.js';    // ✓ 同级目录，去掉多余 /data
import { addCoins } from './coin_state.js';
import PropData     from './prop_data.js';

/* ---------- 小工具 ---------- */
const randInt  = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
const randPick = (pool) => {
  const tot = pool.reduce((s, e) => s + e.weight, 0);
  let roll  = Math.random() * tot;
  return pool.find(e => (roll -= e.weight) < 0) || pool[0];
};

/* ---------- UI 需要的返回结构 ---------- */
function buildReturn(id, qty) {
  const def  = PropData[id] || {};
  return {
    id,                                    // <— 新增 id 字段
    icon : def.iconChar || def.icon || '❓',
    name : def.name     || def.label || id,
    qty
  };
}

/* ---------- 掉落结算 ---------- */
function settle(entry) {
  const qty = entry.qty
    ? (Array.isArray(entry.qty) ? randInt(...entry.qty) : entry.qty)
    : 1;

  if (entry.id === 'coin') {               // 金币：直接加钱包，无弹窗
    addCoins(qty);
    return buildReturn('coin', qty);       // 返回给 UI 画 🅳+数量
  }

  const lootObj = buildReturn(entry.id, qty);
  addItem(lootObj);                        // 其它物品进背包
  return lootObj;                          // 回传给胜利弹窗
}

/* ---------- 掉落表 ---------- */
export const CHEST_LOOT = {
  basic: [
    { id:'coin',         weight:60, qty:[20,60] },
    { id:'potion_small', weight:30 },
    { id:'hero_shard',   weight:10 }
  ],
  silver: [
    { id:'coin',         weight:40, qty:[60,120] },
    { id:'potion_mid',   weight:30 },
    { id:'scroll_fire',  weight:20 },
    { id:'hero_shard',   weight:10 }
  ],
  gold: [
    { id:'coin',          weight:30, qty:[120,240] },
    { id:'potion_big',    weight:25 },
    { id:'scroll_meteor', weight:20 },
    { id:'hero_shard',    weight:15 },
    { id:'elixir_attack', weight:10 }
  ]
};

/* ---------- 对外接口 ---------- */
export function rollLoot(chestType = 0) {
  const key   = ['basic','silver','gold'][chestType] ?? chestType;
  const entry = randPick(CHEST_LOOT[key] || CHEST_LOOT.basic);
  return settle(entry);                    // {id,icon,name,qty}
}
