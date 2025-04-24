let ctxRef;
let switchPageFn;
let canvasRef;

export function initHomePage(ctx, switchPage, canvas) {
  ctxRef = ctx;
  switchPageFn = switchPage;
  canvasRef = canvas;

  drawHomeUI();
}

// 辅助函数：绘制圆角矩形
function drawRoundedRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
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
  onTouchend
};
