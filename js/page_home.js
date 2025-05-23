let ctxRef;
let switchPageFn;
let canvasRef;
let rankingBtnArea = null;
let shareBtnArea = null;
let heroIntroBtnArea = null;
let homeLoopId = null;

const { drawRoundedRect, drawStyledText } = require('./utils/canvas_utils.js');
const { shareMyStats } = require('./utils/share_utils.js');
const { drawAllEffects } = require('./effects_engine.js');

let buttonScales = {
  enter: 1,
  ranking: 1,
  share: 1,
  heroIntro: 1
};

let buttonScaleVels = {
  enter: 0,
  ranking: 0,
  share: 0,
  heroIntro: 0
};

export function initHomePage(ctx, switchPage, canvas) {
  ctxRef = ctx;
  switchPageFn = switchPage;
  canvasRef = canvas;
  startHomeLoop();
}

function drawHomeUI() {
  const btnWidth = 180;
  const btnHeight = 60;
  const x = (canvasRef.width - btnWidth) / 2;
  const y = canvasRef.height * 0.75;

  updateScales();

  const scaleEnter = buttonScales.enter;
  const scaledEnterW = btnWidth * scaleEnter;
  const scaledEnterH = btnHeight * scaleEnter;
  const offsetX = x + (btnWidth - scaledEnterW) / 2;
  const offsetY = y + (btnHeight - scaledEnterH) / 2;

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

    const bgOffsetX = (canvasRef.width - drawWidth) / 2;
    const bgOffsetY = (canvasRef.height - drawHeight) / 2;
    ctxRef.drawImage(bgImg, bgOffsetX, bgOffsetY, drawWidth, drawHeight);
  } else {
    ctxRef.fillStyle = 'black';
    ctxRef.fillRect(0, 0, canvasRef.width, canvasRef.height);
  }

  ctxRef.fillStyle = '#f00';
  drawRoundedRect(ctxRef, offsetX, offsetY, scaledEnterW, scaledEnterH, 20);
  ctxRef.fill();
  drawStyledText(ctxRef, '进入酒吧', x + btnWidth / 2, y + btnHeight / 2, {
    font: 'bold 26px IndieFlower',
    fill: '#FFF',
    stroke: '#000',
  });

  const smallBtnWidth = 140;
  const smallBtnHeight = 50;
  const spacing = 20;
  const totalWidth = smallBtnWidth * 3 + spacing * 2;
  const baseX = (canvasRef.width - totalWidth) / 2;
  const btnY = y + btnHeight + 20;

  // 排行榜按钮
  const scaleRanking = buttonScales.ranking;
  const wRank = smallBtnWidth * scaleRanking;
  const hRank = smallBtnHeight * scaleRanking;
  const xRank = baseX + (smallBtnWidth - wRank) / 2;
  const yRank = btnY + (smallBtnHeight - hRank) / 2;
  ctxRef.fillStyle = '#333';
  drawRoundedRect(ctxRef, xRank, yRank, wRank, hRank, 16);
  ctxRef.fill();
  drawStyledText(ctxRef, '排行榜', baseX + smallBtnWidth / 2, btnY + smallBtnHeight / 2, {
    font: 'bold 20px IndieFlower', fill: '#FFF', stroke: '#000'
  });
  rankingBtnArea = { x: baseX, y: btnY, width: smallBtnWidth, height: smallBtnHeight };

  // 分享按钮
  const shareX = baseX + smallBtnWidth + spacing;
  const scaleShare = buttonScales.share;
  const wShare = smallBtnWidth * scaleShare;
  const hShare = smallBtnHeight * scaleShare;
  const xShare = shareX + (smallBtnWidth - wShare) / 2;
  const yShare = btnY + (smallBtnHeight - hShare) / 2;
  ctxRef.fillStyle = '#0066cc';
  drawRoundedRect(ctxRef, xShare, yShare, wShare, hShare, 16);
  ctxRef.fill();
  drawStyledText(ctxRef, '分享', shareX + smallBtnWidth / 2, btnY + smallBtnHeight / 2, {
    font: 'bold 20px IndieFlower', fill: '#FFF', stroke: '#000'
  });
  shareBtnArea = { x: shareX, y: btnY, width: smallBtnWidth, height: smallBtnHeight };

  // 英雄介绍按钮
  const heroIntroX = shareX + smallBtnWidth + spacing;
  const scaleHeroIntro = buttonScales.heroIntro;
  const wIntro = smallBtnWidth * scaleHeroIntro;
  const hIntro = smallBtnHeight * scaleHeroIntro;
  const xIntro = heroIntroX + (smallBtnWidth - wIntro) / 2;
  const yIntro = btnY + (smallBtnHeight - hIntro) / 2;
  ctxRef.fillStyle = '#FF9900';
  drawRoundedRect(ctxRef, xIntro, yIntro, wIntro, hIntro, 16);
  ctxRef.fill();
  drawStyledText(ctxRef, '英雄介绍', heroIntroX + smallBtnWidth / 2, btnY + smallBtnHeight / 2, {
    font: 'bold 20px IndieFlower', fill: '#FFF', stroke: '#000'
  });
  heroIntroBtnArea = { x: heroIntroX, y: btnY, width: smallBtnWidth, height: smallBtnHeight };

  drawAllEffects(ctxRef, canvasRef);
}

function updateScales() {
  for (let key in buttonScales) {
    const target = 1;
    const scale = buttonScales[key];
    const vel = buttonScaleVels[key] || 0;
    const spring = 0.15;
    const damping = 0.8;
    const force = (target - scale) * spring;
    const newVel = (vel + force) * damping;
    buttonScaleVels[key] = newVel;
    buttonScales[key] += newVel;
  }
}

function animateScale(key) {
  buttonScales[key] = 0.85;
  buttonScaleVels[key] = 0.15;
}

function onTouch(e) {
  const touch = e.changedTouches[0];
  const xTouch = touch.clientX;
  const yTouch = touch.clientY;

  const btnWidth = 180;
  const btnHeight = 60;
  const x = (canvasRef.width - btnWidth) / 2;
  const y = canvasRef.height * 0.75;

  if (xTouch >= x && xTouch <= x + btnWidth && yTouch >= y && yTouch <= y + btnHeight) {
    animateScale('enter');
    setTimeout(() => switchPageFn('heroSelect'), 150);
    return;
  }

  if (rankingBtnArea &&
      xTouch >= rankingBtnArea.x && xTouch <= rankingBtnArea.x + rankingBtnArea.width &&
      yTouch >= rankingBtnArea.y && yTouch <= rankingBtnArea.y + rankingBtnArea.height) {
    animateScale('ranking');
    setTimeout(() => switchPageFn('ranking'), 150);
    return;
  }

  if (shareBtnArea &&
      xTouch >= shareBtnArea.x && xTouch <= shareBtnArea.x + shareBtnArea.width &&
      yTouch >= shareBtnArea.y && yTouch <= shareBtnArea.y + shareBtnArea.height) {
    animateScale('share');
    setTimeout(() => shareMyStats(), 150);
    return;
  }

  if (heroIntroBtnArea &&
      xTouch >= heroIntroBtnArea.x && xTouch <= heroIntroBtnArea.x + heroIntroBtnArea.width &&
      yTouch >= heroIntroBtnArea.y && yTouch <= heroIntroBtnArea.y + heroIntroBtnArea.height) {
    animateScale('heroIntro');
    setTimeout(() => switchPageFn('heroIntro'), 150);
    return;
  }
}

function startHomeLoop() {
  function loop() {
    drawHomeUI();
    homeLoopId = requestAnimationFrame(loop);
  }
  loop();
}

function destroyHomePage() {
  if (homeLoopId) {
    cancelAnimationFrame(homeLoopId);
    homeLoopId = null;
  }
}

export function updateHomePage() {}
export function onTouchend(e) { onTouch(e); }

export default {
  init: initHomePage,
  update: updateHomePage,
  draw: drawHomeUI,
  destroy: destroyHomePage,
  onTouchend,
  touchend: onTouchend
};
