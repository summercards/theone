let ctxRef;
let switchPageFn;
let canvasRef;
let rankingBtnArea = null;
let shareBtnArea = null;
let heroIntroBtnArea = null;
let roguelikeBtnArea = null;
let homeLoopId = null;

const { drawRoundedRect, drawStyledText } = require('./utils/canvas_utils.js');
const { shareMyStats } = require('./utils/share_utils.js');
const { drawAllEffects } = require('./effects_engine.js');

let buttonScales = {
  enter: 1,
  roguelike: 1,
  ranking: 1,
  share: 1,
  heroIntro: 1
};

let buttonScaleVels = {
  enter: 0,
  roguelike: 0,
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
  const btnWidth = 160;
  const btnHeight = 50;
  const x = (canvasRef.width - btnWidth) / 2;
  const yEnter = canvasRef.height - 240;
  const yRoguelike = yEnter + 80;

  updateScales();

  const scaleEnter = buttonScales.enter;
  const scaledEnterW = btnWidth * scaleEnter;
  const scaledEnterH = btnHeight * scaleEnter;
  const offsetX = x + (btnWidth - scaledEnterW) / 2;
  const offsetYEnter = yEnter + (btnHeight - scaledEnterH) / 2;

  const scaleRoguelike = buttonScales.roguelike;
  const scaledRogueW = btnWidth * scaleRoguelike;
  const scaledRogueH = btnHeight * scaleRoguelike;

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

  ctxRef.fillStyle = '#b3134a';
  drawRoundedRect(ctxRef, offsetX, offsetYEnter, scaledEnterW, scaledEnterH, 20);
  ctxRef.fill();
  drawStyledText(ctxRef, '进入酒吧', x + btnWidth / 2, yEnter + btnHeight / 2, {
    font: 'bold 26px IndieFlower', fill: '#ffd3df', stroke: '#000'
  });

  ctxRef.fillStyle = '#3344AA';
  drawRoundedRect(ctxRef, offsetX, yRoguelike, scaledRogueW, scaledRogueH, 20);
  ctxRef.fill();
  drawStyledText(ctxRef, 'Roguelike 模式', x + btnWidth / 2, yRoguelike + btnHeight / 2, {
    font: 'bold 22px IndieFlower', fill: '#CCEEFF', stroke: '#000'
  });
  roguelikeBtnArea = { x: offsetX, y: yRoguelike, width: scaledRogueW, height: scaledRogueH };

  const smallBtnWidth = 100;
  const smallBtnHeight = 40;
  const spacing = 16;
  const totalWidth = smallBtnWidth * 3 + spacing * 2;
  const baseX = (canvasRef.width - totalWidth) / 2;
  const btnY = canvasRef.height - 80;

  const xRank = baseX;
  ctxRef.fillStyle = '#6d2c91';
  drawRoundedRect(ctxRef, xRank, btnY, smallBtnWidth, smallBtnHeight, 12);
  ctxRef.fill();
  drawStyledText(ctxRef, '排行榜', xRank + smallBtnWidth / 2, btnY + smallBtnHeight / 2, {
    font: 'bold 16px IndieFlower', fill: '#f8d6ff', stroke: '#000'
  });
  rankingBtnArea = { x: xRank, y: btnY, width: smallBtnWidth, height: smallBtnHeight };

  const xShare = baseX + smallBtnWidth + spacing;
  ctxRef.fillStyle = '#7d3f98';
  drawRoundedRect(ctxRef, xShare, btnY, smallBtnWidth, smallBtnHeight, 12);
  ctxRef.fill();
  drawStyledText(ctxRef, '分享', xShare + smallBtnWidth / 2, btnY + smallBtnHeight / 2, {
    font: 'bold 16px IndieFlower', fill: '#fcd5d5', stroke: '#000'
  });
  shareBtnArea = { x: xShare, y: btnY, width: smallBtnWidth, height: smallBtnHeight };

  const xIntro = baseX + (smallBtnWidth + spacing) * 2;
  ctxRef.fillStyle = '#9c275d';
  drawRoundedRect(ctxRef, xIntro, btnY, smallBtnWidth, smallBtnHeight, 12);
  ctxRef.fill();
  drawStyledText(ctxRef, '英雄介绍', xIntro + smallBtnWidth / 2, btnY + smallBtnHeight / 2, {
    font: 'bold 16px IndieFlower', fill: '#ffe3e3', stroke: '#000'
  });
  heroIntroBtnArea = { x: xIntro, y: btnY, width: smallBtnWidth, height: smallBtnHeight };

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

  const btnWidth = 160;
  const btnHeight = 50;
  const x = (canvasRef.width - btnWidth) / 2;
  const yEnter = canvasRef.height - 240;
  const yRoguelike = yEnter + 80;

  if (xTouch >= x && xTouch <= x + btnWidth && yTouch >= yEnter && yTouch <= yEnter + btnHeight) {
    animateScale('enter');
    setTimeout(() => switchPageFn('heroSelect'), 150);
    return;
  }

  if (roguelikeBtnArea &&
      xTouch >= roguelikeBtnArea.x && xTouch <= roguelikeBtnArea.x + roguelikeBtnArea.width &&
      yTouch >= roguelikeBtnArea.y && yTouch <= roguelikeBtnArea.y + roguelikeBtnArea.height) {
    animateScale('roguelike');
    setTimeout(() => switchPageFn('roguelike'), 150);
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
