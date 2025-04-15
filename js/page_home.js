let ctxRef;
let switchPageFn;
let canvasRef;

export function initHomePage(ctx, switchPage, canvas) {
  ctxRef = ctx;
  switchPageFn = switchPage;
  canvasRef = canvas;

  drawHomeUI();
  canvasRef.addEventListener('touchend', onTouch);
}

function drawHomeUI() {
  const btnWidth = 300;
  const btnHeight = 100;
  const x = (canvasRef.width - btnWidth) / 2;
  const y = canvasRef.height * 0.6;

  ctxRef.fillStyle = 'black';
  ctxRef.fillRect(0, 0, canvasRef.width, canvasRef.height);

  ctxRef.fillStyle = 'white';
  ctxRef.font = '48px sans-serif';
  ctxRef.fillText('欢迎来到 勇者地狱酒吧', canvasRef.width * 0.1, canvasRef.height * 0.2);

  ctxRef.fillStyle = '#f00';
  ctxRef.fillRect(x, y, btnWidth, btnHeight);

  ctxRef.fillStyle = 'white';
  ctxRef.font = '36px sans-serif';
  ctxRef.fillText('进入酒吧', x + 60, y + 65);
}

function onTouch(e) {
  const touch = e.changedTouches[0];
  const xTouch = touch.clientX;
  const yTouch = touch.clientY;

  const btnWidth = 300;
  const btnHeight = 100;
  const x = (canvasRef.width - btnWidth) / 2;
  const y = canvasRef.height * 0.6;

  if (xTouch >= x && xTouch <= x + btnWidth && yTouch >= y && yTouch <= y + btnHeight) {
    canvasRef.removeEventListener('touchend', onTouch);
    switchPageFn('heroSelect');
  }
}

export function updateHomePage() {}