// js/data/inventory.js —— 玩家背包逻辑
// --------------------------------------------------
// 简易增删查存 API，自动持久化到本地存储

const STORAGE_KEY = 'player_inventory';

/** 从本地存储加载背包 */
function load() {
  const data = wx.getStorageSync(STORAGE_KEY);
  return Array.isArray(data) ? data : [];
}

/** 当前背包内容（数组里每个元素形如 {icon:'💰',name:'金币',qty:100}） */
let bag = load();

/** 将内存内容写回本地 */
function save() {
  wx.setStorageSync(STORAGE_KEY, bag);
}

/**
 * 向背包添加掉落
 * @param {{icon:string,name:string,qty:number}} loot
 */
function addItem(loot) {
  if (!loot) return;
  const found = bag.find(it => it.id === loot.id);   // 用 id 作为唯一键
  if (found) {
    found.qty += loot.qty;   // 叠堆同名物品
  } else {
    bag.push({ ...loot });
  }
  save();
}

/** 获取背包内容（深拷贝避免外部修改） */
function getItems() {
    return bag.map(it => ({ ...it }));
  }
  
  /** 根据 id 获取一条（引用拷贝） */
  function getItemById(id) {
    const it = bag.find(x => x.id === id);
    return it ? { ...it } : null;
  }
  
  /** 获取某个道具数量（没有则 0） */
  function getQty(id) {
    const it = bag.find(x => x.id === id);
    return it ? it.qty : 0;
  }
  
  /** 扣减/移除道具。成功返回 true；数量不足返回 false。 */
  function removeItem(id, qty = 1) {
    const idx = bag.findIndex(x => x.id === id);
    if (idx < 0) return false;
    if (bag[idx].qty < qty) return false;
    bag[idx].qty -= qty;
    if (bag[idx].qty <= 0) bag.splice(idx, 1);
    save();
    return true;
  }
  
  /** 清空背包（调试用） */
  function clear() {
    bag = [];
    save();
  }
  
  module.exports = { addItem, getItems, getItemById, getQty, removeItem, clear };
  