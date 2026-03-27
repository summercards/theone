// js/page_shop.js —— 商店页面（底部工具条 + 数量选择）
import { drawRoundedRect, getBounceScale, drawWithCenterScale } from './utils/canvas_utils.js';
import PropData from './data/prop_data.js';
import { drawPropIcon } from './ui/prop_ui.js';
import { getShopCatalog, getShopItemById } from './data/shop_data.js';
import { addItem, getItems, getQty, removeItem } from './data/inventory.js';
import { spendCoins, getTotalCoins, addCoins as addGold } from './data/coin_state.js';

/* ---------------- 安全区：解决刘海/底部横条遮挡 ---------------- */
const _sys = wx.getSystemInfoSync ? wx.getSystemInfoSync() : {};
const SAFE_TOP = Math.max(16, (_sys.statusBarHeight || 0) + 8);
const SAFE_BOTTOM = (() => {
  const sh = _sys.screenHeight || 0;
  const sb = _sys.safeArea ? (sh - _sys.safeArea.bottom) : 0;
  return Math.max(8, sb + 8);
})();

/* ---------------- 数量选择（ActionSheet） ---------------- */
function pickQuantityForBuy(unitPrice, onPicked) {
  const total = (getTotalCoins?.() || 0);
  const max = Math.max(0, Math.floor(total / unitPrice));
  if (max <= 0) { wx.showToast({ title: '金币不足', icon: 'none' }); return; }

  const opts = [1, 5, 10, 50].filter(n => n <= max);
  if (!opts.includes(max)) opts.push(max);
  const itemList = opts.map(n => `x${n}`);

  wx.showActionSheet({
    itemList,
    success: res => onPicked?.(opts[res.tapIndex]),
    fail: () => {}
  });
}

function pickQuantityForSell(ownedQty, onPicked) {
  const opts = [1, 5, 10, 50].filter(n => n <= ownedQty);
  if (!opts.includes(ownedQty)) opts.push(ownedQty);
  const itemList = opts.map(n => `x${n}`);

  wx.showActionSheet({
    itemList,
    success: res => onPicked?.(opts[res.tapIndex]),
    fail: () => {}
  });
}

/* ---------------- 状态变量 ---------------- */
let ctxRef, switchPageFn, canvasRef;

let backBtnArea = null;
let tabBuyArea = null;
let tabSellArea = null;
let listArea = null;
let currentTab = 'buy'; // 'buy' | 'sell'
let clickRect = null;
let pressedBtnKey = null;
let releasedBtnKey = null;
let releaseTime = 0;

/* ---------------- 生命周期 ---------------- */

const getBtnScale = (key) => getBounceScale(pressedBtnKey === key, releasedBtnKey === key ? releaseTime : 0, Date.now());

function init(ctx, switchPage, canvas) {
  ctxRef = ctx; switchPageFn = switchPage; canvasRef = canvas;

  const w = canvasRef.width, h = canvasRef.height;

  // 底部工具条（含安全区）
  const footerH = 60 + SAFE_BOTTOM;
  const pad = 16;
  const btnW = 88, btnH = 36;
  const yBtn = h - SAFE_BOTTOM - pad - btnH;

  backBtnArea = { x: pad, y: yBtn, width: btnW, height: btnH };
  const gap = 20;
  tabBuyArea  = { x: Math.floor(w/2 - btnW - gap/2), y: yBtn, width: btnW, height: btnH };
  tabSellArea = { x: Math.floor(w/2 + gap/2),       y: yBtn, width: btnW, height: btnH };

  // 列表区域（避开刘海与底部工具条）
  listArea = {
    x: pad,
    y: pad + SAFE_TOP,
    width:  w - pad * 2,
    height: h - footerH - (pad + SAFE_TOP)
  };
}

function update() {}

/* ---------------- 绘制 ---------------- */
function drawHeader() {
  const w = canvasRef.width, h = canvasRef.height;
  const barH = 60 + SAFE_BOTTOM;

  // 底部工具条底板
  ctxRef.fillStyle = '#1b1b1f';
  ctxRef.fillRect(0, h - barH, w, barH);

  // 返回
  const backScale = getBtnScale('back');
  drawWithCenterScale(ctxRef, backBtnArea.x, backBtnArea.y, backBtnArea.width, backBtnArea.height, backScale, () => {
    ctxRef.fillStyle = '#00bfa5';
    ctxRef.strokeStyle = '#004d40';
    drawRoundedRect(ctxRef, backBtnArea.x, backBtnArea.y, backBtnArea.width, backBtnArea.height, 10);
    ctxRef.fill(); ctxRef.stroke();
    ctxRef.fillStyle = '#00251a';
    ctxRef.font = 'bold 18px sans-serif';
    ctxRef.textAlign = 'center'; ctxRef.textBaseline = 'middle';
    ctxRef.fillText('返回', backBtnArea.x + backBtnArea.width/2, backBtnArea.y + backBtnArea.height/2);
  });

  // 购买 / 出售
  const tabStyle = (on)=>({fill:on?'#ffd166':'#34343a', stroke:on?'#8a6b00':'#222'});

  const tb = tabStyle(currentTab==='buy');
  const buyScale = getBtnScale('buy_tab');
  drawWithCenterScale(ctxRef, tabBuyArea.x, tabBuyArea.y, tabBuyArea.width, tabBuyArea.height, buyScale, () => {
    ctxRef.fillStyle = tb.fill; ctxRef.strokeStyle = tb.stroke;
    drawRoundedRect(ctxRef, tabBuyArea.x, tabBuyArea.y, tabBuyArea.width, tabBuyArea.height, 10);
    ctxRef.fill(); ctxRef.stroke();
    ctxRef.fillStyle = currentTab==='buy' ? '#3a2f00' : '#ccc';
    ctxRef.fillText('购买', tabBuyArea.x + tabBuyArea.width/2, tabBuyArea.y + tabBuyArea.height/2);
  });

  const ts = tabStyle(currentTab==='sell');
  const sellScale = getBtnScale('sell_tab');
  drawWithCenterScale(ctxRef, tabSellArea.x, tabSellArea.y, tabSellArea.width, tabSellArea.height, sellScale, () => {
    ctxRef.fillStyle = ts.fill; ctxRef.strokeStyle = ts.stroke;
    drawRoundedRect(ctxRef, tabSellArea.x, tabSellArea.y, tabSellArea.width, tabSellArea.height, 10);
    ctxRef.fill(); ctxRef.stroke();
    ctxRef.fillStyle = currentTab==='sell' ? '#3a2f00' : '#ccc';
    ctxRef.fillText('出售', tabSellArea.x + tabSellArea.width/2, tabSellArea.y + tabSellArea.height/2);
  });

  // 右下角金币总数
  const coins = getTotalCoins?.() ?? 0;
  ctxRef.textAlign = 'right';
  ctxRef.textBaseline = 'middle';
  ctxRef.fillStyle = '#ffd166';
  ctxRef.font = 'bold 18px sans-serif';
  ctxRef.fillText(`💰 ${coins}`, w - 16, h - barH/2 + 2);
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

  // 每次重绘都重置点击矩形缓存
  clickRect = [];

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
    clickRect[idx] = { x: x + 6, y: rowY, width: width - 12, height: rowH, id: it.id };
  });

  // 底部提示
  ctxRef.textAlign = 'center';
  ctxRef.fillStyle = '#80808a';
  ctxRef.font = '14px sans-serif';
  ctxRef.fillText(currentTab === 'buy' ? '点击选择数量并购买' : '点击选择数量并出售', x + width/2, y + height - 10);
}

function draw() {
  ctxRef.fillStyle = '#0f0f12';
  ctxRef.fillRect(0, 0, canvasRef.width, canvasRef.height);

  // 先画列表，再画底部工具条，避免被覆盖
  drawList();
  drawHeader();
}

function destroy() {
  clickRect = null;
}

/* ---------------- 触摸 ---------------- */
function contains(a, tx, ty) {
  return a && tx >= a.x && tx <= a.x + a.width && ty >= a.y && ty <= a.y + a.height;
}


function touchstart(e) {
  const touch = e.changedTouches?.[0] || e.touches?.[0];
  if (!touch) return;
  const tx = touch.clientX, ty = touch.clientY;
  if (contains(backBtnArea, tx, ty)) { pressedBtnKey = 'back'; }
  else if (contains(tabBuyArea, tx, ty)) { pressedBtnKey = 'buy_tab'; }
  else if (contains(tabSellArea, tx, ty)) { pressedBtnKey = 'sell_tab'; }
}

function onTouchend(e) {
  if (pressedBtnKey) {
    releasedBtnKey = pressedBtnKey;
    releaseTime = Date.now();
    const currentKey = pressedBtnKey;
    pressedBtnKey = null;

    // 延迟执行逻辑，等 Q 弹动画
    setTimeout(() => {
      if (currentKey === 'back') switchPageFn('home');
      else if (currentKey === 'buy_tab') currentTab = 'buy';
      else if (currentKey === 'sell_tab') currentTab = 'sell';
      releasedBtnKey = null;
    }, 250);
    return;
  }

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
    const p = PropData.getById(rect.id);
    if (!item || !p) return;

    pickQuantityForBuy(item.buy, (n) => {
      if (!n) return;
      const cost = item.buy * n;

      wx.showModal({
        title: '确认购买',
        content: `购买「${p.name}」x${n}，价格 ￥${cost}？`,
        success: (res) => {
          if (!res.confirm) return;
          const ok = spendCoins(cost);
          if (!ok) { wx.showToast({ title: '金币不足', icon: 'none' }); return; }
          addItem({ id: p.id, name: p.name, icon: p.iconChar, qty: n });
          wx.showToast({ title: '购买成功', icon: 'none' });
        }
      });
    });
    return;
  }

  // 出售
  if (currentTab === 'sell') {
    const p = PropData.getById(rect.id);
    const owned = getQty(rect.id);
    if (!p || owned <= 0) return;
    const sellUnit = getShopItemById(rect.id)?.sell ?? Math.floor((p.price || 0) * 0.5);

    pickQuantityForSell(owned, (n) => {
      if (!n) return;
      const income = sellUnit * n;

      wx.showModal({
        title: '确认出售',
        content: `出售「${p.name}」x${n}，获得 ￥${income}？（拥有：${owned}）`,
        success: (res) => {
          if (!res.confirm) return;
          const ok = removeItem(p.id, n);
          if (!ok) { wx.showToast({ title: '数量不足', icon: 'none' }); return; }
          // 卖出物品时，将收入直接累积到永久金币，而非本局金币
          try {
            // 读取当前永久金币并增加收益
            const cur = (getTotalCoins?.() || 0);
            const newTotal = Math.max(0, cur + income);
            if (typeof wx !== 'undefined' && wx.setStorageSync) {
              wx.setStorageSync('totalCoins', newTotal);
            }
          } catch (_e) {
            // 如果写入失败，退回旧值不影响流程
          }
          wx.showToast({ title: '出售成功', icon: 'none' });
        }
      });
    });
    return;
  }
}

/* ---------------- 导出 ---------------- */
export default {
  init,
  update,
  draw,
  destroy,
  touchstart,
  onTouchend,
  touchend: onTouchend
};
