let ctxRef;
let switchPageFn;
let canvasRef;

const { drawRoundedRect } = require('./utils/canvas_utils.js');

export function initHomePage(ctx, switchPage, canvas) {
  ctxRef = ctx;
  switchPageFn = switchPage;
  canvasRef = canvas;

  drawHomeUI();
}



function drawHomeUI() {
  const btnWidth = 300;
  const btnHeight = 100;
  const x = (canvasRef.width - btnWidth) / 2;
  const y = canvasRef.height * 0.6;

  // 背景
  ctxRef.fillStyle = 'black';
  ctxRef.fillRect(0, 0, canvasRef.width, canvasRef.height);

  // 标题
  ctxRef.fillStyle = 'white';
  ctxRef.font = '38px sans-serif';
  ctxRef.textAlign = 'center';
  ctxRef.textBaseline = 'top';
  ctxRef.fillText('欢迎来到 勇者酒吧', canvasRef.width / 2, canvasRef.height * 0.2);

  // 圆角按钮
  ctxRef.fillStyle = '#f00';
  drawRoundedRect(ctxRef, x, y, btnWidth, btnHeight, 20); // 圆角半径 20
  ctxRef.fill();

  // 按钮文字
  ctxRef.fillStyle = 'white';
  ctxRef.font = '36px sans-serif';
  ctxRef.textAlign = 'center';
  ctxRef.textBaseline = 'middle';
  ctxRef.fillText('进入酒吧', x + btnWidth / 2, y + btnHeight / 2);
}

// 点击事件判断是否点中按钮
function onTouch(e) {
  const touch = e.changedTouches[0];
  const xTouch = touch.clientX;
  const yTouch = touch.clientY;

  const btnWidth = 300;
  const btnHeight = 100;
  const x = (canvasRef.width - btnWidth) / 2;
  const y = canvasRef.height * 0.6;
  console.log('[DEBUG] 首页按钮点击检测中...');

  if (xTouch >= x && xTouch <= x + btnWidth && yTouch >= y && yTouch <= y + btnHeight) {
    switchPageFn('heroSelect');
  }
}

export function updateHomePage() {}

export function onTouchend(e) {
  onTouch(e);
}

export default {
  init: initHomePage,
  update: updateHomePage,
  draw: drawHomeUI,
  onTouchend,
  touchend: onTouchend  // ✅ 加上这一行
};
