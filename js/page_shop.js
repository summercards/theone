// js/page_shop.js —— 商店页面
import { drawRoundedRect } from './utils/canvas_utils.js';
import PropData from './data/prop_data.js';
import { drawPropIcon } from './ui/prop_ui.js';
import { getShopCatalog, getShopItemById } from './data/shop_data.js';
import { addItem, getItems, getQty, removeItem } from './data/inventory.js';
import { spendCoins } from './data/coin_state.js';
import { getTotalCoins, addCoins as addGold } from './data/coin_state.js';

let ctxRef, switchPageFn, canvasRef;

let backBtnArea  = null;
let tabBuyArea   = null;
let tabSellArea  = null;
let listArea     = null;
let currentTab   = 'buy'; // 'buy' | 'sell'
let clickRect    = null;

function init(ctx, switchPage, canvas) {
  ctxRef = ctx; switchPageFn = switchPage; canvasRef = canvas;

  const w = canvasRef.width, h = canvasRef.height;
  backBtnArea = { x: 20, y: 16, width: 88, height: 36 };
  tabBuyArea  = { x: 130, y: 16, width: 88, height: 36 };
  tabSellArea = { x: 230, y: 16, width: 88, height: 36 };
  listArea    = { x: 20,  y: 70, width: w - 40, height: h - 90 };
}

function update() {}

function drawHeader() {
  const w = canvasRef.width;
  // 顶栏底
  ctxRef.fillStyle = '#1b1b1f';
  ctxRef.fillRect(0, 0, w, 60);

  // 返回
  ctxRef.fillStyle = '#00bfa5';
  ctxRef.strokeStyle = '#004d40';
  drawRoundedRect(ctxRef, backBtnArea.x, backBtnArea.y, backBtnArea.width, backBtnArea.height, 10);
  ctxRef.fill(); ctxRef.stroke();
  ctxRef.fillStyle = '#00251a';
  ctxRef.font = 'bold 18px sans-serif';
  ctxRef.textAlign = 'center'; ctxRef.textBaseline = 'middle';
  ctxRef.fillText('返回', backBtnArea.x + backBtnArea.width/2, backBtnArea.y + backBtnArea.height/2);

  // 购买 / 出售 Tab
  const tabStyle = (on)=>({fill:on?'#ffd166':'#34343a', stroke:on?'#8a6b00':'#222'});
  const tb = tabStyle(currentTab==='buy');
  ctxRef.fillStyle = tb.fill; ctxRef.strokeStyle = tb.stroke;
  drawRoundedRect(ctxRef, tabBuyArea.x, tabBuyArea.y, tabBuyArea.width, tabBuyArea.height, 10);
  ctxRef.fill(); ctxRef.stroke();
  ctxRef.fillStyle = currentTab==='buy' ? '#3a2f00' : '#ccc';
  ctxRef.fillText('购买', tabBuyArea.x + tabBuyArea.width/2, tabBuyArea.y + tabBuyArea.height/2);

  const ts = tabStyle(currentTab==='sell');
  ctxRef.fillStyle = ts.fill; ctxRef.strokeStyle = ts.stroke;
  drawRoundedRect(ctxRef, tabSellArea.x, tabSellArea.y, tabSellArea.width, tabSellArea.height, 10);
  ctxRef.fill(); ctxRef.stroke();
  ctxRef.fillStyle = currentTab==='sell' ? '#3a2f00' : '#ccc';
  ctxRef.fillText('出售', tabSellArea.x + tabSellArea.width/2, tabSellArea.y + tabSellArea.height/2);

  // 金币显示
  const coins = getTotalCoins?.() ?? 0;
  ctxRef.fillStyle = '#ffd166';
  ctxRef.font = 'bold 18px sans-serif';
  ctxRef.textAlign = 'right';
  ctxRef.fillText(`💰 ${coins}`, w - 20, 40);
}

function getBuyList() {
  // 商店目录 + 物品信息
  return getShopCatalog().map(line => ({ ...line, prop: PropData.getById(line.id) }));
}
function getSellList() {
  // 背包里可卖的（PropData 有 price）
  const bag = getItems();
  return bag
    .filter(it => PropData.getById(it.id)?.price != null && it.id !== 'coin')
    .map(it => ({
      id: it.id,
      qty: it.qty,
      prop: PropData.getById(it.id),
      sell: getShopItemById(it.id)?.sell ?? Math.floor((PropData.getById(it.id).price || 0) * 0.5)
    }));
}

function drawList() {
  const items = currentTab === 'buy' ? getBuyList() : getSellList();
  const { x, y, width, height } = listArea;

  // 背板
  ctxRef.fillStyle = '#141417';
  ctxRef.fillRect(x, y, width, height);

  const rowH = 64, gap = 10;
  items.forEach((it, idx) => {
    const rowY = y + idx * (rowH + gap);
    if (rowY + rowH > y + height) return; // 简易裁剪（无滚动）

    // 行底
    ctxRef.fillStyle = '#23232a';
    ctxRef.strokeStyle = '#101014';
    drawRoundedRect(ctxRef, x + 6, rowY, width - 12, rowH, 10);
    ctxRef.fill(); ctxRef.stroke();

    // 图标
    drawPropIcon(ctxRef, it.prop, x + 22, rowY + 8, 48, false, 1);

    // 名称 + 描述
    ctxRef.fillStyle = '#fff';
    ctxRef.font = 'bold 18px sans-serif';
    ctxRef.textAlign = 'left';
    ctxRef.fillText(it.prop?.name || it.id, x + 80, rowY + 24);
    ctxRef.fillStyle = '#ccc';
    ctxRef.font = '14px sans-serif';
    const desc = it.prop?.desc || '';
    ctxRef.fillText(desc.length > 16 ? (desc.slice(0, 16) + '…') : desc, x + 80, rowY + 44);

    // 价格 / 数量
    ctxRef.textAlign = 'right';
    ctxRef.fillStyle = currentTab === 'buy' ? '#ffd166' : '#9eff7a';
    ctxRef.font = 'bold 18px sans-serif';
    if (currentTab === 'buy') {
      ctxRef.fillText(`￥${it.buy}`, x + width - 20, rowY + 24);
    } else {
      ctxRef.fillText(`出售 ￥${it.sell} ×${it.qty}`, x + width - 20, rowY + 24);
    }

    // 点击区域缓存
    // 每一行作为一个点击矩形
    if (!clickRect) clickRect = [];
    clickRect[idx] = { x: x + 6, y: rowY, width: width - 12, height: rowH, id: it.id };
  });

  // 底部提示
  ctxRef.textAlign = 'center';
  ctxRef.fillStyle = '#80808a';
  ctxRef.font = '14px sans-serif';
  ctxRef.fillText(currentTab === 'buy' ? '点击购买' : '点击出售', x + width/2, y + height - 10);
}

function draw() {
  ctxRef.fillStyle = '#0f0f12';
  ctxRef.fillRect(0, 0, canvasRef.width, canvasRef.height);
  drawHeader();
  drawList();
}

function destroy() {
  clickRect = null;
}

function contains(a, tx, ty) {
  return tx >= a.x && tx <= a.x + a.width && ty >= a.y && ty <= a.y + a.height;
}

function onTouchend(e) {
  const touch = e.changedTouches?.[0] || e.touches?.[0];
  if (!touch) return;
  const tx = touch.clientX, ty = touch.clientY;

  // 返回
  if (contains(backBtnArea, tx, ty)) {
    switchPageFn('home');
    return;
  }
  // Tab 切换
  if (contains(tabBuyArea, tx, ty)) { currentTab = 'buy';  return; }
  if (contains(tabSellArea, tx, ty)) { currentTab = 'sell'; return; }

  // 列表点击
  const rect = (clickRect || []).find(r => contains(r, tx, ty));
  if (!rect) return;

  if (currentTab === 'buy') {
    const item = getShopCatalog().find(x => x.id === rect.id);
    const p    = PropData.getById(rect.id);
    if (!item || !p) return;

    wx.showModal({
      title: '确认购买',
      content: `购买「${p.name}」x1，价格 ￥${item.buy}？`,
      success: (res) => {
        if (!res.confirm) return;
        const ok = spendCoins(item.buy);
        if (!ok) {
          wx.showToast({ title: '金币不足', icon: 'none' });
          return;
        }
        addItem({ id: p.id, name: p.name, icon: p.iconChar, qty: 1 });
        wx.showToast({ title: '购买成功', icon: 'none' });
      }
    });
  } else {
    // 出售
    const p = PropData.getById(rect.id);
    const qty = getQty(rect.id);
    if (!p || qty <= 0) return;
    const sell = getShopItemById(rect.id)?.sell ?? Math.floor((p.price || 0) * 0.5);

    wx.showModal({
      title: '确认出售',
      content: `出售「${p.name}」x1，获得 ￥${sell}？（拥有：${qty}）`,
      success: (res) => {
        if (!res.confirm) return;
        const ok = removeItem(p.id, 1);
        if (!ok) {
          wx.showToast({ title: '数量不足', icon: 'none' });
          return;
        }
        addGold(sell); // 把卖出收入加入总金币
        wx.showToast({ title: '出售成功', icon: 'none' });
      }
    });
  }
}

export default {
  init,
  update,
  draw,
  destroy,
  onTouchend,
  touchend: onTouchend
};
