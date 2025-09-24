// js/data/shop_data.js
import PropData from './prop_data.js';

/**
 * 商店目录：默认把 PropData 中带 price 的条目纳入。
 * 你也可以在 overrides 里为个别道具自定义 buy/sell 价、是否上架。
 */
const overrides = {
  coin: { enabled: false },  // 不卖“金币”本身
  // 例：自定义某个道具售价为采购价的 80%、出售价 60%
  // 'attr_boost': { buy: 24, sell: 18, enabled: true }
};

function computeSellPrice(buy) {
  return Math.max(1, Math.floor(buy * 0.5)); // 默认对折回收
}

export function getShopCatalog() {
  const list = PropData.getAll()
    .filter(p => typeof p.price === 'number') // 只收录带 price 的
    .map(p => {
      const o = overrides[p.id] || {};
      const buy  = (typeof o.buy  === 'number') ? o.buy  : p.price;
      const sell = (typeof o.sell === 'number') ? o.sell : computeSellPrice(buy);
      const enabled = o.enabled !== false;
      return { id: p.id, buy, sell, enabled };
    })
    .filter(x => x.enabled);

  return list;
}

export function getShopItemById(id) {
  return getShopCatalog().find(x => x.id === id);
}
