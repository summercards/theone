// js/page_home.js — 首页逻辑（含背包按钮改动完整版本）
// ------------------------------------------------------------

import { drawRoundedRect, drawStyledText } from './utils/canvas_utils.js';
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
let backpackBtnArea  = null;   // ★ 新增
let clearSaveBtnArea = null;    // ⭐ 清空存档按钮

let homeLoopId = null;
let fireFrameCounter = 0;
let clickedButton = null;
let clickAnimationFrame = 0;
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

const scaleBtn = (key) => clickedButton === key
  ? 1.0 + 0.1 * Math.sin((clickAnimationFrame / 10) * Math.PI)
  : 1.0;

// --------------------------------------------------
// 主绘制函数
// --------------------------------------------------
function drawHomeUI() {
  if (pageExiting) return;

    // --------------------------------------------------
  // 处理按钮点击后的缩放动画 & 页面跳转
  // --------------------------------------------------
  if (clickedButton) {
    clickAnimationFrame++;

    // 动画 10 帧后执行真正跳页
    if (clickAnimationFrame > 10) {
      pageExiting = true;
      cancelAnimationFrame(homeLoopId);
      homeLoopId = null;
      removeFireGlowEffect();

      const cb = clickedButton;       // 记录再清空，防止递归
      clickedButton = null;
      clickAnimationFrame = 0;

      if (cb === 'share') {
        pageExiting = false;          // 分享完还留在本页
        shareMyStats();
      } else {
        switchPageFn(cb);             // 进入目标页面（'ranking' / 'backpack' 等）
      }
      return;                         // 本帧后续绘制不用再跑
    }
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
    const scale = scaleBtn('heroSelect');
    const w = mainBtnW * scale;
    const h = mainBtnH * scale;
    const x = (canvasRef.width - w) / 2;
    const y = yEnter - (h - mainBtnH) / 2;

    ctxRef.fillStyle = '#b3134a';
    drawRoundedRect(ctxRef, x, y, w, h, 20);
    ctxRef.fill();
    drawStyledText(ctxRef, '魅影旅店', canvasRef.width / 2, y + h / 2, {
      font: 'bold 26px IndieFlower', fill: '#ffd3df', stroke: '#000'
    });
  }

  // Roguelike 区域按钮（魔界森林），根据 Boss 是否击败解锁
  {
    const unlocked = hasDefeatedBoss2();
    const scale = scaleBtn('roguelike');
    const w = mainBtnW * scale;
    const h = mainBtnH * scale;
    const x = (canvasRef.width - w) / 2;
    const y = yRogue - (h - mainBtnH) / 2;

    ctxRef.save();
    ctxRef.globalAlpha = unlocked ? 1.0 : 0.3;
    ctxRef.fillStyle = '#4B3B74';
    drawRoundedRect(ctxRef, x, y, w, h, 20);
    ctxRef.fill();
    drawStyledText(ctxRef, '魔界森林', canvasRef.width / 2, y + h / 2, {
      font: 'bold 22px IndieFlower', fill: '#CCEEFF', stroke: '#000'
    });
    ctxRef.restore();

    roguelikeBtnArea = unlocked ? { x: xMain, y: yRogue, width: mainBtnW, height: mainBtnH } : null;
  }

  // --------------------------------------------------
  // 四个小按钮：排行榜 / 分享 / 英雄介绍 / 背包
  // --------------------------------------------------
  const smallBtnW = 100;
  const smallBtnH = 40;
  const spacing   = 16;
  const btnCount  = 5; // 增加一个“清空存档”按钮
  const totalW    = smallBtnW * btnCount + spacing * (btnCount - 1);
  const baseX     = (canvasRef.width - totalW) / 2;
  const btnY      = canvasRef.height - 80;

  const drawSmall = (label, x, key, color, textColor) => {
    const scale = scaleBtn(key);
    const w = smallBtnW * scale;
    const h = smallBtnH * scale;
    const dx = x - (w - smallBtnW) / 2;
    const dy = btnY - (h - smallBtnH) / 2;
    ctxRef.fillStyle = color;
    drawRoundedRect(ctxRef, dx, dy, w, h, 12);
    ctxRef.fill();
    drawStyledText(ctxRef, label, dx + w / 2, dy + h / 2, {
      font: 'bold 16px IndieFlower', fill: textColor, stroke: '#000'
    });
  };

  const xRank  = baseX;
  const xShare = baseX + (smallBtnW + spacing);
  const xIntro = baseX + (smallBtnW + spacing) * 2;
  const xBag   = baseX + (smallBtnW + spacing) * 3;  // ★ 新增位置
  const xClear = baseX + (smallBtnW + spacing) * 4;  // 新增：清空存档按钮

  drawSmall('排行榜', xRank,  'ranking',   '#6d2c91', '#f8d6ff');
  rankingBtnArea = { x: xRank, y: btnY, width: smallBtnW, height: smallBtnH };

  drawSmall('分享',   xShare, 'share',     '#7d3f98', '#fcd5d5');
  shareBtnArea   = { x: xShare, y: btnY, width: smallBtnW, height: smallBtnH };

  drawSmall('英雄介绍', xIntro, 'heroIntro', '#9c275d', '#ffe3e3');
  heroIntroBtnArea = { x: xIntro, y: btnY, width: smallBtnW, height: smallBtnH };

  drawSmall('背包',   xBag,   'backpack', '#2b6e4f', '#eafffb');
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
function onTouch(e) {
  if (pageExiting) return;

  const t = e.changedTouches[0];
  const xTouch = t.clientX;
  const yTouch = t.clientY;

  const inArea = (area) => xTouch >= area.x && xTouch <= area.x + area.width &&
                            yTouch >= area.y && yTouch <= area.y + area.height;

  // 音乐按钮
  if (musicToggleBtnArea && inArea(musicToggleBtnArea)) {
    setMuted(!isMuted);
    return;
  }

  // 主按钮：进入主关卡 / Roguelike
  {
    const btnWidth = 160;
    const btnHeight = 50;
    const xMain = (canvasRef.width - btnWidth) / 2;
    const yEnter = canvasRef.height - 240;
    const yRogue = yEnter + 80;

    // 第一个大按钮：进入英雄选择（魅影旅店）
    if (xTouch >= xMain && xTouch <= xMain + btnWidth &&
        yTouch >= yEnter && yTouch <= yEnter + btnHeight) {
      playClickSound();
      clickedButton = 'heroSelect';
      clickAnimationFrame = 0;
      return;
    }

    // 第二个大按钮：进入 Roguelike 区域（魔界森林）
    if (xTouch >= xMain && xTouch <= xMain + btnWidth &&
        yTouch >= yRogue && yTouch <= yRogue + btnHeight) {
      if (hasDefeatedBoss2()) {
        playClickSound();
        clickedButton = 'roguelike';
        clickAnimationFrame = 0;
      } else {
        wx.showToast?.({ title: '您还未探索到该地区', icon: 'none' });
      }
      return;
    }
  }

  // 小按钮区
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
  if (backpackBtnArea && inArea(backpackBtnArea)) {
    playClickSound();
    clickedButton = 'backpack';
    clickAnimationFrame = 0;
    return;
  }

  // ⭐ 清空存档按钮
  if (clearSaveBtnArea && inArea(clearSaveBtnArea)) {
    playClickSound();
    wx.showModal({
      title: '清空存档',
      content: '确定要清空存档吗？该操作不可恢复。',
      confirmText: '清空',
      cancelText: '取消',
      success(res) {
        if (res && res.confirm) {
          try {
            wx.clearStorageSync();
          } catch (_) {}
          wx.showToast({ title: '存档已清空', icon: 'none' });
        }
      }
    });
    return;
  }
}

// --------------------------------------------------
// 主循环
// --------------------------------------------------
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
  onTouchend,
  touchend: onTouchend
};
