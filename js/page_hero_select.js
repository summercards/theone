let ctxRef;
let switchPageFn;
let canvasRef;

export function initHeroSelectPage(ctx, switchPage, canvas) {
  ctxRef = ctx;
  switchPageFn = switchPage;
  canvasRef = canvas;

  drawHeroPage();
  canvasRef.addEventListener('touchend', onTouch);
}

function drawHeroPage() {
  const btnWidth = 300;
  const btnHeight = 100;
  const x = (canvasRef.width - btnWidth) / 2;
  const y = canvasRef.height * 0.6;

  ctxRef.fillStyle = '#222';
  ctxRef.fillRect(0, 0, canvasRef.width, canvasRef.height);

  ctxRef.fillStyle = 'white';
  ctxRef.font = '48px sans-serif';
  ctxRef.fillText('请选择你的英雄', canvasRef.width * 0.1, canvasRef.height * 0.2);

  ctxRef.fillStyle = '#0a0';
  ctxRef.fillRect(x, y, btnWidth, btnHeight);
  ctxRef.fillStyle = 'white';
  ctxRef.font = '36px sans-serif';
  ctxRef.fillText('进入战斗', x + 60, y + 65);
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
    switchPageFn('game');
  }
}

export function updateHeroSelectPage() {}