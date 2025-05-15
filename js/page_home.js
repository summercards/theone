let ctxRef;
let switchPageFn;
let canvasRef;
let rankingBtnArea = null;
let shareBtnArea = null;

const { drawRoundedRect } = require('./utils/canvas_utils.js');
const { shareMyStats } = require('./utils/share_utils.js');

export function initHomePage(ctx, switchPage, canvas) {
  ctxRef = ctx;
  switchPageFn = switchPage;
  canvasRef = canvas;

  drawHomeUI();
}

function drawHomeUI() {
  const btnWidth = 180;
  const btnHeight = 60;
  const x = (canvasRef.width - btnWidth) / 2;
  const y = canvasRef.height * 0.75;

  // 背景图
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

  // "进入酒吧"按钮
  ctxRef.fillStyle = '#f00';
  drawRoundedRect(ctxRef, x, y, btnWidth, btnHeight, 20);
  ctxRef.fill();

  ctxRef.fillStyle = 'white';
  ctxRef.font = '28px sans-serif';
  ctxRef.textAlign = 'center';
  ctxRef.textBaseline = 'middle';
  ctxRef.fillText('进入酒吧', x + btnWidth / 2, y + btnHeight / 2);

  // 横排按钮（排行榜 + 分享）
  const smallBtnWidth = 140;
  const smallBtnHeight = 50;
  const spacing = 20;
  const totalWidth = smallBtnWidth * 2 + spacing;
  const baseX = (canvasRef.width - totalWidth) / 2;
  const btnY = y + btnHeight + 20;

  // 排行榜按钮（左）
  ctxRef.fillStyle = '#333';
  drawRoundedRect(ctxRef, baseX, btnY, smallBtnWidth, smallBtnHeight, 16);
  ctxRef.fill();
  ctxRef.fillStyle = 'white';
  ctxRef.font = '22px sans-serif';
  ctxRef.fillText('排行榜', baseX + smallBtnWidth / 2, btnY + smallBtnHeight / 2);
  rankingBtnArea = {
    x: baseX,
    y: btnY,
    width: smallBtnWidth,
    height: smallBtnHeight
  };

  // 分享按钮（右）
  const shareX = baseX + smallBtnWidth + spacing;
  ctxRef.fillStyle = '#0066cc';
  drawRoundedRect(ctxRef, shareX, btnY, smallBtnWidth, smallBtnHeight, 16);
  ctxRef.fill();
  ctxRef.fillStyle = 'white';
  ctxRef.fillText('分享', shareX + smallBtnWidth / 2, btnY + smallBtnHeight / 2);
  shareBtnArea = {
    x: shareX,
    y: btnY,
    width: smallBtnWidth,
    height: smallBtnHeight
  };
}

function onTouch(e) {
  const touch = e.changedTouches[0];
  const xTouch = touch.clientX;
  const yTouch = touch.clientY;

  const btnWidth = 180;
  const btnHeight = 60;
  const x = (canvasRef.width - btnWidth) / 2;
  const y = canvasRef.height * 0.75;

  console.log('[DEBUG] 首页按钮点击检测中...');

  // 点击“进入酒吧”
  if (xTouch >= x && xTouch <= x + btnWidth && yTouch >= y && yTouch <= y + btnHeight) {
    switchPageFn('heroSelect');
    return;
  }

  // 点击“排行榜”
  if (rankingBtnArea &&
      xTouch >= rankingBtnArea.x && xTouch <= rankingBtnArea.x + rankingBtnArea.width &&
      yTouch >= rankingBtnArea.y && yTouch <= rankingBtnArea.y + rankingBtnArea.height) {
    switchPageFn('ranking');
    return;
  }

  // 点击“分享”
  if (shareBtnArea &&
      xTouch >= shareBtnArea.x && xTouch <= shareBtnArea.x + shareBtnArea.width &&
      yTouch >= shareBtnArea.y && yTouch <= shareBtnArea.y + shareBtnArea.height) {
    shareMyStats();
    return;
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
