// js/page_backpack.js  —— 简易背包页面（九宫格展示）
let ctxRef, switchPageFn, canvasRef;
let loopId = null;

const { getItems } = require('./data/inventory.js');
const { drawRoundedRect } = require('./utils/canvas_utils.js');

function init(ctx, switchPage, canvas) {
  ctxRef = ctx;
  switchPageFn = switchPage;
  canvasRef = canvas;

  canvas.addEventListener('touchstart', handleTouch);
  loopId = requestAnimationFrame(draw);
}

function destroy() {
  cancelAnimationFrame(loopId);
  canvasRef.removeEventListener('touchstart', handleTouch);
}

function handleTouch(e) {
  // 任何点击都返回首页（可自行改为判定按钮）
  switchPageFn('home', destroy);
}

function draw() {
  ctxRef.clearRect(0, 0, canvasRef.width, canvasRef.height);
  const bag = getItems();

  // 标题
  ctxRef.textAlign = 'center';
  ctxRef.font = 'bold 28px sans-serif';
  ctxRef.fillStyle = '#ffffff';
  ctxRef.fillText('背包', canvasRef.width / 2, 60);

  // 九宫格参数
  const cols = 5;
  const gap  = 10;
  const cell = (canvasRef.width - gap * (cols + 1)) / cols;
  const startY = 100;

  bag.forEach((it, i) => {
    const r = Math.floor(i / cols);
    const c = i % cols;
    const x = gap + c * (cell + gap);
    const y = startY + r * (cell + gap);

    // 格子背景
    drawRoundedRect(ctxRef, x, y, cell, cell, 8, '#333');

    // 图标
    ctxRef.font = `${cell * 0.6}px sans-serif`;
    ctxRef.textAlign = 'center';
    ctxRef.fillStyle = '#ffffff';
    ctxRef.fillText(it.icon, x + cell / 2, y + cell * 0.6);

    // 数量
    ctxRef.font = '14px sans-serif';
    ctxRef.textAlign = 'right';
    ctxRef.fillStyle = '#FFD700';
    ctxRef.fillText(`×${it.qty}`, x + cell - 4, y + cell - 4);
  });

  loopId = requestAnimationFrame(draw);
}

module.exports = { init, destroy };