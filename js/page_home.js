let ctxRef;
let switchPageFn;
let canvasRef;
let rankingBtnArea = null;
let shareBtnArea = null;
let heroIntroBtnArea = null;
let roguelikeBtnArea = null;
let homeLoopId = null;
let frameCount = 0;
let bgmAudioContext = null;
let clickSound = null;
let fireFrameCounter = 0;
let clickedButton = null;
let clickAnimationFrame = 0;
let pageExiting = false;

const { drawRoundedRect, drawStyledText } = require('./utils/canvas_utils.js');
const { shareMyStats } = require('./utils/share_utils.js');
import {
  drawAllEffects, updateAllEffects, createFireParticles,
  createPersistentFireGlow, removeFireGlowEffect
} from './effects_engine.js';
import { hasDefeatedBoss2 } from './data/monster_state.js';

export function initHomePage(ctx, switchPage, canvas) {
  ctxRef = ctx;
  switchPageFn = switchPage;
  canvasRef = canvas;
  pageExiting = false;
  createPersistentFireGlow(canvasRef);

  if (!bgmAudioContext) {
    bgmAudioContext = wx.createInnerAudioContext();
    bgmAudioContext.src = 'sounds/bgm/further_compressed_bgm.mp3';
    bgmAudioContext.loop = true;
    bgmAudioContext.autoplay = true;
    bgmAudioContext.play();
  }

  if (!clickSound) {
    clickSound = wx.createInnerAudioContext();
    clickSound.src = 'sounds/click.mp3';
  }

  startHomeLoop();
}

function playClickSound() {
  if (clickSound) {
    clickSound.stop();
    clickSound.play();
  }
}

function drawHomeUI() {
  if (pageExiting) return;

  const btnWidth = 160;
  const btnHeight = 50;
  const x = (canvasRef.width - btnWidth) / 2;
  const yEnter = canvasRef.height - 240;
  const yRoguelike = yEnter + 80;

  if (clickedButton) {
    clickAnimationFrame++;
    if (clickAnimationFrame > 10) {
      pageExiting = true;
      cancelAnimationFrame(homeLoopId);
      homeLoopId = null;
      removeFireGlowEffect();

      const cb = clickedButton;
      clickedButton = null;
      clickAnimationFrame = 0;

      if (cb === 'share') {
        pageExiting = false;
        shareMyStats();
      } else {
        switchPageFn(cb);
      }
      return;
    }
  }

  const scaleBtn = (key) => clickedButton === key ? 1.0 + 0.1 * Math.sin((clickAnimationFrame / 10) * Math.PI) : 1.0;

  const scaleEnter = scaleBtn('heroSelect');
  const scaledEnterW = btnWidth * scaleEnter;
  const scaledEnterH = btnHeight * scaleEnter;
  const offsetX = (canvasRef.width - scaledEnterW) / 2;
  const offsetYEnter = yEnter - (scaledEnterH - btnHeight) / 2;

  const scaleRogue = scaleBtn('roguelike');
  const scaledRogueW = btnWidth * scaleRogue;
  const scaledRogueH = btnHeight * scaleRogue;
  const offsetYRogue = yRoguelike - (scaledRogueH - btnHeight) / 2;

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
  drawStyledText(ctxRef, '魅影旅店', canvasRef.width / 2, offsetYEnter + scaledEnterH / 2, {
    font: 'bold 26px IndieFlower', fill: '#ffd3df', stroke: '#000'
  });

  const unlocked = hasDefeatedBoss2();
  ctxRef.save();
  ctxRef.globalAlpha = unlocked ? 1.0 : 0.3;
  ctxRef.fillStyle = '#4B3B74';
  drawRoundedRect(ctxRef, offsetX, offsetYRogue, scaledRogueW, scaledRogueH, 20);
  ctxRef.fill();
  drawStyledText(ctxRef, '魔界森林', canvasRef.width / 2, offsetYRogue + scaledRogueH / 2, {
    font: 'bold 22px IndieFlower', fill: '#CCEEFF', stroke: '#000'
  });
  ctxRef.restore();

  roguelikeBtnArea = unlocked
    ? { x: offsetX, y: yRoguelike, width: btnWidth, height: btnHeight }
    : null;

  const smallBtnWidth = 100;
  const smallBtnHeight = 40;
  const spacing = 16;
  const totalWidth = smallBtnWidth * 3 + spacing * 2;
  const baseX = (canvasRef.width - totalWidth) / 2;
  const btnY = canvasRef.height - 80;

  const drawSmallBtn = (label, x, key, color, textColor) => {
    const scale = scaleBtn(key);
    ctxRef.fillStyle = color;
    drawRoundedRect(ctxRef, x - (smallBtnWidth * (scale - 1)) / 2, btnY - (smallBtnHeight * (scale - 1)) / 2,
      smallBtnWidth * scale, smallBtnHeight * scale, 12);
    ctxRef.fill();
    drawStyledText(ctxRef, label, x + smallBtnWidth / 2, btnY + smallBtnHeight / 2, {
      font: 'bold 16px IndieFlower', fill: textColor, stroke: '#000'
    });
  };

  const xRank = baseX;
  const xShare = baseX + smallBtnWidth + spacing;
  const xIntro = baseX + (smallBtnWidth + spacing) * 2;

  drawSmallBtn('排行榜', xRank, 'ranking', '#6d2c91', '#f8d6ff');
  rankingBtnArea = { x: xRank, y: btnY, width: smallBtnWidth, height: smallBtnHeight };

  drawSmallBtn('分享', xShare, 'share', '#7d3f98', '#fcd5d5');
  shareBtnArea = { x: xShare, y: btnY, width: smallBtnWidth, height: smallBtnHeight };

  drawSmallBtn('英雄介绍', xIntro, 'heroIntro', '#9c275d', '#ffe3e3');
  heroIntroBtnArea = { x: xIntro, y: btnY, width: smallBtnWidth, height: smallBtnHeight };
}

function onTouch(e) {
  if (pageExiting) return;

  const touch = e.changedTouches[0];
  const xTouch = touch.clientX;
  const yTouch = touch.clientY;

  const btnWidth = 160;
  const btnHeight = 50;
  const x = (canvasRef.width - btnWidth) / 2;
  const yEnter = canvasRef.height - 240;
  const yRoguelike = yEnter + 80;

  if (xTouch >= x && xTouch <= x + btnWidth && yTouch >= yEnter && yTouch <= yEnter + btnHeight) {
    playClickSound();
    clickedButton = 'heroSelect';
    clickAnimationFrame = 0;
    return;
  }

  if (xTouch >= x && xTouch <= x + btnWidth &&
      yTouch >= yRoguelike && yTouch <= yRoguelike + btnHeight) {
    if (hasDefeatedBoss2()) {
      playClickSound();
      clickedButton = 'roguelike';
      clickAnimationFrame = 0;
    } else {
      wx.showToast?.({
        title: '您还未探索到该地区',
        icon: 'none'
      });
    }
    return;
  }

  const inArea = (area) => xTouch >= area.x && xTouch <= area.x + area.width && yTouch >= area.y && yTouch <= area.y + area.height;

  if (rankingBtnArea && inArea(rankingBtnArea)) {
    playClickSound();
    clickedButton = 'ranking';
    clickAnimationFrame = 0;
    return;
  }

  if (shareBtnArea && inArea(shareBtnArea)) {
    playClickSound();
    clickedButton = 'share';
    clickAnimationFrame = 0;
    return;
  }

  if (heroIntroBtnArea && inArea(heroIntroBtnArea)) {
    playClickSound();
    clickedButton = 'heroIntro';
    clickAnimationFrame = 0;
    return;
  }
}

function startHomeLoop() {
  createPersistentFireGlow(canvasRef);
  function loop() {
    updateAllEffects();
    drawHomeUI();
    if (!pageExiting) {
      homeLoopId = requestAnimationFrame(loop);
    }
  }
  loop();
}

function destroyHomePage() {
  if (homeLoopId) {
    cancelAnimationFrame(homeLoopId);
    homeLoopId = null;
  }
  removeFireGlowEffect();
  pageExiting = true;
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
