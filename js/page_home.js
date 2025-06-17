let ctxRef;
let switchPageFn;
let canvasRef;
let rankingBtnArea = null;
let shareBtnArea = null;
let heroIntroBtnArea = null;
let roguelikeBtnArea = null;
let homeLoopId = null;
let frameCount = 0;

const { drawRoundedRect, drawStyledText } = require('./utils/canvas_utils.js');
const { shareMyStats } = require('./utils/share_utils.js');
import { drawAllEffects, updateAllEffects, createFireParticles, createFireGlow, createPersistentFireGlow, removeFireGlowEffect } from './effects_engine.js';
import { hasDefeatedBoss2 } from './data/monster_state.js';
let fireFrameCounter = 0;

export function initHomePage(ctx, switchPage, canvas) {
  ctxRef = ctx;
  switchPageFn = switchPage;
  canvasRef = canvas;
  createPersistentFireGlow(canvasRef);
  startHomeLoop();
}

function drawHomeUI() {
  const btnWidth = 160;
  const btnHeight = 50;
  const x = (canvasRef.width - btnWidth) / 2;
  const yEnter = canvasRef.height - 240;
  const yRoguelike = yEnter + 80;

  const scaledEnterW = btnWidth;
  const scaledEnterH = btnHeight;
  const offsetX = x;
  const offsetYEnter = yEnter;

  const scaledRogueW = btnWidth;
  const scaledRogueH = btnHeight;

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

  fireFrameCounter++;
  if (fireFrameCounter % 15 === 0) {
    createFireParticles(canvasRef, 1);
  }

  drawAllEffects(ctxRef, canvasRef);

  ctxRef.fillStyle = '#b3134a';
  drawRoundedRect(ctxRef, offsetX, offsetYEnter, scaledEnterW, scaledEnterH, 20);
  ctxRef.fill();
  drawStyledText(ctxRef, '魅影旅店', x + btnWidth / 2, yEnter + btnHeight / 2, {
    font: 'bold 26px IndieFlower', fill: '#ffd3df', stroke: '#000'
  });

  const unlocked = hasDefeatedBoss2();
  ctxRef.save();
  ctxRef.globalAlpha = unlocked ? 1.0 : 0.3; // 变灰显示
  ctxRef.fillStyle = '#4B3B74';
  drawRoundedRect(ctxRef, offsetX, yRoguelike, scaledRogueW, scaledRogueH, 20);
  ctxRef.fill();
  drawStyledText(ctxRef, '魔界森林', x + btnWidth / 2, yRoguelike + btnHeight / 2, {
    font: 'bold 22px IndieFlower', fill: '#CCEEFF', stroke: '#000'
  });
  ctxRef.restore();
  
  // ✅ 只有解锁时才启用点击区域
  roguelikeBtnArea = unlocked
    ? { x: offsetX, y: yRoguelike, width: scaledRogueW, height: scaledRogueH }
    : null;
  

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
    removeFireGlowEffect();
    setTimeout(() => switchPageFn('heroSelect'), 150);
    return;
  }

  if (xTouch >= x && xTouch <= x + btnWidth &&
    yTouch >= yRoguelike && yTouch <= yRoguelike + btnHeight) {
  if (hasDefeatedBoss2()) {
    removeFireGlowEffect();
    setTimeout(() => switchPageFn('roguelike'), 150);
  } else {
    wx.showToast?.({
      title: '您还未探索到该地区',
      icon: 'none'
    });
  }
  return;
}

  if (rankingBtnArea &&
      xTouch >= rankingBtnArea.x && xTouch <= rankingBtnArea.x + rankingBtnArea.width &&
      yTouch >= rankingBtnArea.y && yTouch <= rankingBtnArea.y + rankingBtnArea.height) {
    removeFireGlowEffect();
    setTimeout(() => switchPageFn('ranking'), 150);
    return;
  }

  if (shareBtnArea &&
      xTouch >= shareBtnArea.x && xTouch <= shareBtnArea.x + shareBtnArea.width &&
      yTouch >= shareBtnArea.y && yTouch <= shareBtnArea.y + shareBtnArea.height) {
    removeFireGlowEffect();
    setTimeout(() => shareMyStats(), 150);
    return;
  }

  if (heroIntroBtnArea &&
      xTouch >= heroIntroBtnArea.x && xTouch <= heroIntroBtnArea.x + heroIntroBtnArea.width &&
      yTouch >= heroIntroBtnArea.y && yTouch <= heroIntroBtnArea.y + heroIntroBtnArea.height) {
    removeFireGlowEffect();
    setTimeout(() => switchPageFn('heroIntro'), 150);
    return;
  }
}

function startHomeLoop() {
  createPersistentFireGlow(canvasRef);
  function loop() {
    updateAllEffects();
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
  removeFireGlowEffect();
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
