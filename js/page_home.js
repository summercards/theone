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
  const btnWidth = 180;  // ✅ 缩小为原来的 60%
  const btnHeight = 60;
  const x = (canvasRef.width - btnWidth) / 2;
  const y = canvasRef.height * 0.8;

  // ✅ 背景图（按比例缩放并居中，不拉伸）
  const bgImg = globalThis.imageCache['bg'];
  if (bgImg && bgImg.complete) {
    const imgRatio = bgImg.width / bgImg.height;
    const canvasRatio = canvasRef.width / canvasRef.height;

    let drawWidth, drawHeight;
    if (imgRatio > canvasRatio) {
      drawHeight = canvasRef.height;
      drawWidth = drawHeight * imgRatio;
    } else {
      drawWidth = canvasRef.width;
      drawHeight = drawWidth / imgRatio;
    }

    const offsetX = (canvasRef.width - drawWidth) / 2;
    const offsetY = (canvasRef.height - drawHeight) / 2;

    ctxRef.drawImage(bgImg, offsetX, offsetY, drawWidth, drawHeight);
  } else {
    ctxRef.fillStyle = 'black';
    ctxRef.fillRect(0, 0, canvasRef.width, canvasRef.height);
  }


  // ✅ 圆角按钮
  ctxRef.fillStyle = '#f00';
  drawRoundedRect(ctxRef, x, y, btnWidth, btnHeight, 20); // 圆角半径 20
  ctxRef.fill();

  // ✅ 按钮文字
  ctxRef.fillStyle = 'white';
  ctxRef.font = '28px sans-serif';
  ctxRef.textAlign = 'center';
  ctxRef.textBaseline = 'middle';
  ctxRef.fillText('进入酒吧', x + btnWidth / 2, y + btnHeight / 2);
}

// 点击事件判断是否点中按钮
function onTouch(e) {
  const touch = e.changedTouches[0];
  const xTouch = touch.clientX;
  const yTouch = touch.clientY;

  const btnWidth = 180;  // ✅ 同样修改点击区域匹配按钮大小
  const btnHeight = 60;
  const x = (canvasRef.width - btnWidth) / 2;
  const y = canvasRef.height * 0.8;

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
  touchend: onTouchend
};
