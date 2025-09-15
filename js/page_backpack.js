// js/page_backpack.js —— 背包页面（兼容真机，遵循统一事件分发/渲染循环）
/* =============================================================
  这个版本修复了两个导致「编辑器可用、真机卡住」的根因：
  1) 移除 canvas.addEventListener（真机不支持），改为导出 touchstart/touchend
     由 game.js 的 wx.onTouch* 统一分发（项目里其它页面也是这么做的）。
  2) 移除页面内自建 requestAnimationFrame 循环，改为实现 draw()/update()
     由游戏主循环调用，避免切页后页面仍在绘制造成的“卡住/黑屏”。

  同时统一为 ESModule 默认导出，和 game.js 的 `import PageBackpack from ...` 完全匹配。
============================================================= */

import { drawRoundedRect } from './utils/canvas_utils.js';
import { getItems } from './data/inventory.js';

let ctxRef, switchPageFn, canvasRef;
let backBtnArea = null;

// 九宫格布局缓存
let grid = {
  padding: 16,
  cols: 3,
  cell: 100,
  startX: 0,
  startY: 0
};

function init(ctx, switchPage, canvas) {
  ctxRef = ctx;
  switchPageFn = switchPage;
  canvasRef = canvas;

  // 计算布局
  const w = canvasRef.width, h = canvasRef.height;
  grid.cell   = Math.min(120, Math.floor((w - grid.padding*2) / grid.cols) - 8);
  grid.startX = Math.floor((w - (grid.cell*grid.cols + 8*(grid.cols-1))) / 2);
  grid.startY = 120;

  // 返回按钮区域
  const btnW=120, btnH=44, btnX = Math.floor((w-btnW)/2), btnY = h - btnH - 24;
  backBtnArea = { x: btnX, y: btnY, width: btnW, height: btnH };
}

function update() {
  // 背包目前无动画，预留
}

function draw() {
  const w = canvasRef.width, h = canvasRef.height;

  // 背景
  ctxRef.fillStyle = '#111';
  ctxRef.fillRect(0, 0, w, h);

  // 标题
  ctxRef.fillStyle = '#ffd166';
  ctxRef.font = 'bold 28px sans-serif';
  ctxRef.textAlign = 'center';
  ctxRef.textBaseline = 'middle';
  ctxRef.fillText('🎒 背包', w/2, 52);

  // 物品网格
  const items = getItems(); // [{icon, name, qty}]
  const margin = 8;

  items.forEach((it, idx) => {
    const cx = idx % grid.cols, cy = Math.floor(idx / grid.cols);
    const x = grid.startX + cx * (grid.cell + margin);
    const y = grid.startY + cy * (grid.cell + margin);

    // 卡片
    ctxRef.fillStyle = '#263238';
    ctxRef.strokeStyle = '#000';
    drawRoundedRect(ctxRef, x, y, grid.cell, grid.cell, 12);
    ctxRef.fill();
    ctxRef.stroke();

    // 名称
    ctxRef.fillStyle = '#e0f7fa';
    ctxRef.font = '16px sans-serif';
    ctxRef.textAlign = 'center';
    ctxRef.textBaseline = 'alphabetic';
    ctxRef.fillText(it.name || '？？？', x + grid.cell/2, y + 22);

    // 图标（emoji 占位）
    ctxRef.font = '28px sans-serif';
    ctxRef.textAlign = 'center';
    ctxRef.textBaseline = 'middle';
    ctxRef.fillStyle = '#ffffff';
    ctxRef.fillText(it.icon || '📦', x + grid.cell/2, y + grid.cell*0.58);

    // 数量
    ctxRef.font = '14px sans-serif';
    ctxRef.textAlign = 'right';
    ctxRef.textBaseline = 'alphabetic';
    ctxRef.fillStyle = '#FFD700';
    ctxRef.fillText(`×${it.qty ?? 0}`, x + grid.cell - 6, y + grid.cell - 6);
  });

  // 返回按钮
  ctxRef.fillStyle = '#00bfa5';
  ctxRef.strokeStyle = '#004d40';
  drawRoundedRect(ctxRef, backBtnArea.x, backBtnArea.y, backBtnArea.width, backBtnArea.height, 12);
  ctxRef.fill();
  ctxRef.stroke();

  ctxRef.fillStyle = '#00251a';
  ctxRef.font = 'bold 20px sans-serif';
  ctxRef.textAlign = 'center';
  ctxRef.textBaseline = 'middle';
  ctxRef.fillText('返回', backBtnArea.x + backBtnArea.width/2, backBtnArea.y + backBtnArea.height/2);
}

// 触控（统一由 game.js 分发）
function onTouchstart(e) {
  const t = e.touches?.[0];
  if (!t) return;
  const x = t.clientX, y = t.clientY;
  if (x>=backBtnArea.x && x<=backBtnArea.x+backBtnArea.width &&
      y>=backBtnArea.y && y<=backBtnArea.y+backBtnArea.height) {
    switchPageFn('home');
  }
}
function onTouchend(_e){ /* 预留 */ }

function destroy() {
  // 无自建循环，无需 cancelAnimationFrame；清理引用以便 GC
  ctxRef = null;
  switchPageFn = null;
  canvasRef = null;
  backBtnArea = null;
}

const BackpackPage = {
  init,
  update,
  draw,
  destroy,
  onTouchstart,
  onTouchend,
  touchstart: onTouchstart,
  touchend: onTouchend
};

export default BackpackPage;
