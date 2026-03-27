// js/page_home.js — 首页逻辑（商店入口版）
// ------------------------------------------------------------

import { drawRoundedRect, drawStyledText, getBounceScale, drawWithCenterScale } from './utils/canvas_utils.js';
import { shareMyStats } from './utils/share_utils.js';
import {
  drawAllEffects, updateAllEffects, createFireParticles,
  createPersistentFireGlow, removeFireGlowEffect
} from './effects_engine.js';
import { hasDefeatedBoss2 } from './data/monster_state.js';
import { getTotalCoins } from './data/coin_state.js';

// --------------------------------------------------
// 变量区
// --------------------------------------------------
let ctxRef;
let switchPageFn;
let canvasRef;

let rankingBtnArea   = null;
let shareBtnArea     = null;
let heroIntroBtnArea = null;
let roguelikeBtnArea = null;
let musicToggleBtnArea = null;
let backpackBtnArea  = null;   // 仍沿用此变量名，实为“商店”按钮
let clearSaveBtnArea = null;    // ⭐ 清空存档按钮

let homeLoopId = null;
let fireFrameCounter = 0;
let pressedBtnKey = null;
let releasedBtnKey = null;
let releaseTime = 0;

let pageExiting = false;

let bgmAudioContext = null;
let clickSound = null;

let isMuted = wx.getStorageSync('musicMuted') === true; // 读取持久化的静音状态
globalThis.isMusicMuted = isMuted;                       // 进程内共享

const MUSIC_VOL = 0.3;

/**
 * 每日签到奖励：若玩家当天首次进入首页则发放金币奖励。
 * 奖励值固定为100金币，直接写入本地永久金币总数。
 */
function checkDailyBonus() {
  const today = new Date().toDateString();
  const lastDate = wx.getStorageSync('lastDailyBonusDate');
  if (lastDate !== today) {
    // 领取奖励并记录日期
    const total = wx.getStorageSync('totalCoins') || 0;
    wx.setStorageSync('totalCoins', total + 100);
    wx.setStorageSync('lastDailyBonusDate', today);
    // 使用模态框替代 Toast，让奖励提示更加醒目并需玩家确认
    wx.showModal({
      title: '每日签到奖励',
      content: '恭喜您获得 100 金币！点击确认领取。',
      confirmText: '领取',
      showCancel: false
    });
  }
}

// --------------------------------------------------
// 音乐静音相关
// --------------------------------------------------
function applyMuteState() {
  const ctx = globalThis.bgmAudioContext;
  if (!ctx) return;
  try {
    if (isMuted) {
      ctx.volume = 0;
      ctx.pause();
    } else {
      ctx.volume = MUSIC_VOL;
      ctx.play();
    }
  } catch (_) {}
}

function setMuted(next) {
  isMuted = !!next;
  wx.setStorageSync('musicMuted', isMuted);
  globalThis.isMusicMuted = isMuted;
  applyMuteState();
}

// --------------------------------------------------
// 初始化 / 销毁
// --------------------------------------------------
export function initHomePage(ctx, switchPage, canvas) {
  ctxRef = ctx;
  switchPageFn = switchPage;
  canvasRef = canvas;
  pageExiting = false;
  createPersistentFireGlow(canvasRef);

  // 每日登录奖励检查
  try {
    checkDailyBonus();
  } catch (_) {
    // 忽略异常，确保首页加载不受影响
  }

  // 处理背景音乐
  if (bgmAudioContext) {
    try {
      bgmAudioContext.stop();
      bgmAudioContext.destroy();
    } catch (_) {}
  }
  bgmAudioContext = wx.createInnerAudioContext();
  bgmAudioContext.src = 'sounds/bgm/further_compressed_bgm.mp3';
  bgmAudioContext.loop = true;
  bgmAudioContext.obeyMuteSwitch = false; // 只受我们自定义开关控制
  bgmAudioContext.autoplay = !isMuted;
  bgmAudioContext.volume = isMuted ? 0 : MUSIC_VOL;
  if (!isMuted) bgmAudioContext.play();
  globalThis.bgmAudioContext = bgmAudioContext;

  // 点击音效
  if (!clickSound) {
    clickSound = wx.createInnerAudioContext();
    clickSound.src = 'sounds/click.mp3';
  }

  startHomeLoop();
}

export function destroyHomePage() {
  if (homeLoopId) {
    cancelAnimationFrame(homeLoopId);
    homeLoopId = null;
  }
  removeFireGlowEffect();
  pageExiting = true;
}

// --------------------------------------------------
// 音效 & 交互辅助
// --------------------------------------------------
function playClickSound() {
  if (clickSound) {
    clickSound.stop();
    clickSound.play();
  }
}

const getBtnScale = (key) => getBounceScale(pressedBtnKey === key, releasedBtnKey === key ? releaseTime : 0, Date.now());

// --------------------------------------------------
// 主绘制函数
// --------------------------------------------------
function drawHomeUI() {
  if (pageExiting) return;

  // --------------------------------------------------
  // 处理按钮点击后的缩放动画 & 页面跳转
  // --------------------------------------------------
  
  if (releasedBtnKey && (Date.now() - releaseTime > 250)) { // Q弹跳页
      pageExiting = true;
      cancelAnimationFrame(homeLoopId);
      homeLoopId = null;
      removeFireGlowEffect();

      const cb = releasedBtnKey;
      releasedBtnKey = null;

      if (cb === 'share') {
        pageExiting = false;
        shareMyStats();
      } else if (cb === 'clearSave') {
        pageExiting = false;
        wx.showModal({
          title: '清空存档', content: '确定要清空吗？该操作不可恢复。',
          success(res) { if (res && res.confirm) { try { wx.clearStorageSync(); } catch (_) {} wx.showToast({ title: '已清空', icon: 'none' }); } }
        });
      } else {
        switchPageFn(cb);
      }
      return;
  }


  // --------------------------------------------------
  // 背景
  // --------------------------------------------------
  const bgImg = globalThis.imageCache?.bg;
  if (bgImg && bgImg.complete) {
    const imgRatio    = bgImg.width / bgImg.height;
    const canvasRatio = canvasRef.width / canvasRef.height;
    let drawW, drawH;
    if (imgRatio > canvasRatio) {
      drawH = canvasRef.height;
      drawW = drawH * imgRatio;
    } else {
      drawW = canvasRef.width;
      drawH = drawW / imgRatio;
    }
    const bgX = (canvasRef.width  - drawW) / 2;
    const bgY = (canvasRef.height - drawH) / 2;
    ctxRef.drawImage(bgImg, bgX, bgY, drawW, drawH);
  } else {
    ctxRef.fillStyle = '#000';
    ctxRef.fillRect(0, 0, canvasRef.width, canvasRef.height);
  }

  // --------------------------------------------------
  // 火焰特效
  // --------------------------------------------------
  fireFrameCounter++;
  if (fireFrameCounter % 15 === 0) {
    createFireParticles(canvasRef, 1);
  }
  drawAllEffects(ctxRef, canvasRef);

  // --------------------------------------------------
  // 进入游戏 & Roguelike 两大按钮
  // --------------------------------------------------
  const mainBtnW = 160;
  const mainBtnH = 50;
  const xMain    = (canvasRef.width - mainBtnW) / 2;
  const yEnter   = canvasRef.height - 240;
  const yRogue   = yEnter + 80;

  // 森林探索按钮（原主关卡）
  {
    const scale = getBtnScale('heroSelect');
    
    drawWithCenterScale(ctxRef, xMain, yEnter, mainBtnW, mainBtnH, scale, () => {
      ctxRef.fillStyle = '#b3134a';
      drawRoundedRect(ctxRef, xMain, yEnter, mainBtnW, mainBtnH, 20);
      ctxRef.fill();
      drawStyledText(ctxRef, '魅影旅店', canvasRef.width / 2, yEnter + mainBtnH / 2, {
        font: 'bold 26px IndieFlower', fill: '#ffd3df', stroke: '#000'
      });
    });
  }

  // Roguelike 区域按钮（魔界森林），根据 Boss 是否击败解锁
  {
    const unlocked = hasDefeatedBoss2();
    const scale = getBtnScale('roguelike');

    drawWithCenterScale(ctxRef, xMain, yRogue, mainBtnW, mainBtnH, scale, () => {
      ctxRef.save();
      ctxRef.globalAlpha = unlocked ? 1.0 : 0.3;
      ctxRef.fillStyle = '#4B3B74';
      drawRoundedRect(ctxRef, xMain, yRogue, mainBtnW, mainBtnH, 20);
      ctxRef.fill();
      drawStyledText(ctxRef, '魔界森林', canvasRef.width / 2, yRogue + mainBtnH / 2, {
        font: 'bold 22px IndieFlower', fill: '#CCEEFF', stroke: '#000'
      });
      ctxRef.restore();
    });

    roguelikeBtnArea = unlocked ? { x: xMain, y: yRogue, width: mainBtnW, height: mainBtnH } : null;
  }

  // --------------------------------------------------
  // 四个小按钮：排行榜 / 分享 / 英雄介绍 / 商店（原“背包”）
  // --------------------------------------------------
  const smallBtnW = 100;
  const smallBtnH = 40;
  const spacing   = 16;
  const btnCount  = 5; // 增加一个“清空存档”按钮
  const totalW    = smallBtnW * btnCount + spacing * (btnCount - 1);
  const baseX     = (canvasRef.width - totalW) / 2;
  const btnY      = canvasRef.height - 80;

  const drawSmall = (label, x, key, color, textColor) => {
    const scale = getBtnScale(key);
    
    drawWithCenterScale(ctxRef, x, btnY, smallBtnW, smallBtnH, scale, () => {
      ctxRef.fillStyle = color;
      drawRoundedRect(ctxRef, x, btnY, smallBtnW, smallBtnH, 12);
      ctxRef.fill();
      drawStyledText(ctxRef, label, x + smallBtnW / 2, btnY + smallBtnH / 2, {
        font: 'bold 16px IndieFlower', fill: textColor, stroke: '#000'
      });
    });
  };

  const xRank  = baseX;
  const xShare = baseX + (smallBtnW + spacing);
  const xIntro = baseX + (smallBtnW + spacing) * 2;
  const xBag   = baseX + (smallBtnW + spacing) * 3;  // 原“背包”位置 → 作为“商店”
  const xClear = baseX + (smallBtnW + spacing) * 4;  // 新增：清空存档按钮

  drawSmall('排行榜', xRank,  'ranking',   '#6d2c91', '#f8d6ff');
  rankingBtnArea = { x: xRank, y: btnY, width: smallBtnW, height: smallBtnH };

  drawSmall('分享',   xShare, 'share',     '#7d3f98', '#fcd5d5');
  shareBtnArea   = { x: xShare, y: btnY, width: smallBtnW, height: smallBtnH };

  drawSmall('英雄介绍', xIntro, 'heroIntro', '#9c275d', '#ffe3e3');
  heroIntroBtnArea = { x: xIntro, y: btnY, width: smallBtnW, height: smallBtnH };

  // ★ 改动：把“背包”按钮改成“商店”，并把 key 改成 'shop'
  drawSmall('商店',   xBag,   'shop',      '#2b6e4f', '#eafffb');
  backpackBtnArea  = { x: xBag, y: btnY, width: smallBtnW, height: smallBtnH };

  // ⭐ 新增“清空存档”按钮
  drawSmall('清空存档', xClear, 'clearSave', '#a83b36', '#ffe7e1');
  clearSaveBtnArea = { x: xClear, y: btnY, width: smallBtnW, height: smallBtnH };

  // --------------------------------------------------
  // 右上角音乐开关
  // --------------------------------------------------
  const iconSize = 36;
  const iconPad  = 12;
  const iconX    = iconPad;
  const iconY    = iconPad;
  musicToggleBtnArea = { x: iconX, y: iconY, width: iconSize, height: iconSize };

  ctxRef.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctxRef.beginPath();
  ctxRef.arc(iconX + iconSize / 2, iconY + iconSize / 2, iconSize / 2, 0, Math.PI * 2);
  ctxRef.fill();

  ctxRef.fillStyle = '#fff';
  ctxRef.font = 'bold 20px sans-serif';
  ctxRef.textAlign = 'center';
  ctxRef.textBaseline = 'middle';
  ctxRef.fillText(isMuted ? '🔇' : '🎵', iconX + iconSize / 2, iconY + iconSize / 2);
}

// --------------------------------------------------
// 触摸处理
// --------------------------------------------------
function touchstart(e) {
  if (pageExiting) return;
  const t = e.changedTouches[0];
  const xTouch = t.clientX;
  const yTouch = t.clientY;
  const inArea = (area) => area && xTouch >= area.x && xTouch <= area.x + area.width && yTouch >= area.y && yTouch <= area.y + area.height;
  
  if (inArea({ x: (canvasRef.width - 160)/2, y: canvasRef.height - 240, width: 160, height: 50 })) { pressedBtnKey = 'heroSelect'; playClickSound(); }
  else if (inArea({ x: (canvasRef.width - 160)/2, y: canvasRef.height - 240 + 80, width: 160, height: 50 }) && hasDefeatedBoss2()) { pressedBtnKey = 'roguelike'; playClickSound(); }
  else if (inArea(rankingBtnArea)) { pressedBtnKey = 'ranking'; playClickSound(); }
  else if (inArea(shareBtnArea)) { pressedBtnKey = 'share'; playClickSound(); }
  else if (inArea(heroIntroBtnArea)) { pressedBtnKey = 'heroIntro'; playClickSound(); }
  else if (inArea(backpackBtnArea)) { pressedBtnKey = 'shop'; playClickSound(); }
  else if (inArea(clearSaveBtnArea)) { pressedBtnKey = 'clearSave'; playClickSound(); }
}

function onTouch(e) {
  if(pressedBtnKey) {
    releasedBtnKey = pressedBtnKey;
    releaseTime = Date.now();
    pressedBtnKey = null;
  }
  if (pageExiting) return;

  const t = e.changedTouches[0];
  const inArea = (area) => area && t.clientX >= area.x && t.clientX <= area.x + area.width && t.clientY >= area.y && t.clientY <= area.y + area.height;

  if (musicToggleBtnArea && inArea(musicToggleBtnArea)) {
    setMuted(!isMuted);
  }
}

function startHomeLoop() {
  createPersistentFireGlow(canvasRef);
  const loop = () => {
    updateAllEffects();
    drawHomeUI();
    if (!pageExiting) homeLoopId = requestAnimationFrame(loop);
  };
  loop();
}

// --------------------------------------------------
// 更新 & 导出接口
// --------------------------------------------------
export function updateHomePage() {}
export function onTouchend(e) { onTouch(e); }

export default {
  init: initHomePage,
  update: updateHomePage,
  draw: drawHomeUI,
  destroy: destroyHomePage,
  touchstart,
  onTouchend,
  touchend: onTouchend
};
