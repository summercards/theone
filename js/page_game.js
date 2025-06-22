let comboCounter = 0;
let comboShowTime = 0;      // 🎥 记录当前动画的开始时间
let lastComboUpdateTime = 0; // 🕒 实际触发新 combo 的时间
let __blockSize = 0;
let __gridStartX = 0;
let __gridStartY = 0;
let popupGoldDisplayed = 0; // 用于胜利弹窗中金币滚动显示
let displayedGold = 0; // 当前动画显示的金币
let popupGoldStartTime = 0; // ⏱ 胜利弹窗金币滚动起始时间
let playerActionCounter = 0;
let heroLevelUps = [];           // 本关升级信息，供弹窗读取
let touchStart = null;     // 记录起始格子位置
let dragStartX = 0;        // 记录滑动起点 X
let dragStartY = 0;        // 记录滑动起点 Y

let showGameOver = false;     // 是否触发失败弹窗
let victoryHeroLoaded = false;
const { drawRoundedRect } = require('./utils/canvas_utils.js');
const DEBUG = false; // 全局设置，生产时设为 false
let showVictoryPopup = false;
let earnedGold = 0;
let levelJustCompleted = 0;
let currentLevel = 1; // 🌟 当前关卡编号，需保存下来
let goldPopTime = 0; // 最近一次金币弹出时间（用于动画）

const LevelConfigs = {
    1: { gridSize: 4, allowedBlocks: ['A', 'B', 'D', 'F'] },
    2: { gridSize: 4, allowedBlocks: ['A', 'B', 'D', 'F'] },
    3: { gridSize: 5, allowedBlocks: ['A', 'B', 'C', 'D', 'F'] },
    4: { gridSize: 5, allowedBlocks: ['A', 'B', 'C', 'D', 'F'] },
    5: { gridSize: 6, allowedBlocks: ['A', 'B', 'C', 'D', 'E', 'F'] },
  };


// === 变更：把另外两个特效工具也引进来
import { renderBlockA } from './block_effects/block_A.js';
import { renderBlockB } from './block_effects/block_B.js';
import { renderBlockC } from './block_effects/block_C.js';
import { renderBlockD } from './block_effects/block_D.js';
import { renderBlockE } from './block_effects/block_E.js';
import { renderBlockF } from './block_effects/block_F.js';
import { applySkillEffect } from './logic/skill_logic.js';
import { showDamageText } from './effects_engine.js';
import SuperBlockSystem from './data/super_block_system.js';
import { updatePlayerStats } from './utils/player_stats.js'; // ✅ 新增
import { registerGameHooks } from './utils/game_shared.js';
import { getPlayerHp, getPlayerMaxHp } from './data/player_state.js';
globalThis.renderBlockA = renderBlockA;
globalThis.renderBlockB = renderBlockB;
globalThis.renderBlockC = renderBlockC;
globalThis.renderBlockD = renderBlockD;
globalThis.renderBlockE = renderBlockE;
globalThis.renderBlockF = renderBlockF;
import {
    updateAllEffects,
    drawAllEffects,
    createProjectile,
    createFloatingText,
    createPopEffect,
    createExplosion,
    createMonsterBounce, 
    createAvatarFlash, 
    createEnergyParticles,
    createGoldParticles,         // ✅ 加上这个
    createShake, 
    createChargeReleaseEffect , 
    createSkillDialog  , 
    createMonsterAttackFlash ,   // ✅ 加这行
    createChargeGlowEffect
} from './effects_engine.js';
  
import { getSelectedHeroes } from './data/hero_state.js';
import { setCharge, getCharges } from './data/hero_charge_state.js';
// 👾 Monster system
import { loadMonster, dealDamage, isMonsterDead, getNextLevel, getMonsterGold } from './data/monster_state.js';
import { initPlayer, takeDamage, isPlayerDead } from './data/player_state.js';
import { drawPlayerHp } from './ui/player_ui.js';
import { addCoins, getSessionCoins, commitSessionCoins } from './data/coin_state.js';
import { drawMonsterSprite } from './ui/monster_ui.js';
import HeroData   from './data/hero_data.js';
import BlockConfig from './data/block_config.js';   // ← 已有就保留
import { getMonsterTimer } from './data/monster_state.js'; // ⬅️ 加入导入
import { getLogs } from './utils/battle_log.js';
import { logBattle } from './utils/battle_log.js'; // ✅ 加这一行
import { resetCharges } from './data/hero_charge_state.js';
import { getMonster, getMonsterDamage, markBossDefeated } from './data/monster_state.js';
/* ======== 英雄连招节流用状态 ======== */
let pendingHeroBurst   = false;   // 是否排队等待播放
let skillsActive = 0;   // 当前还在播放的英雄技能数量
let pendingBurstDamage = 0;       // 这一轮累积伤害
let heroBurstRunning   = false;   // 正在播放英雄连招
let clearingRunning    = false;   // 棋盘仍在连消 / 掉落动画
let gaugeCount = 0;   // ← 放到文件顶部 (全局)
let attackDisplayDamage = 0;    // 用于滚动显示的数字
let damagePopTime       = 0;    // 最近一次数值变化时刻（ms）
let gaugeFlashTime = 0;          // 0 表示不闪烁
let pendingDamage = 0;          // 等待打到怪物的数值
let monsterHitFlashTime = 0;    // 怪物受击闪白计时


/* === BlockConfig 派生工具映射 ================================= */
const BLOCK_ROLE_MAP   = Object.fromEntries(
  Object.entries(BlockConfig).map(([k, v]) => [k, v.role])
);
const BLOCK_DAMAGE_MAP = Object.fromEntries(
  Object.entries(BlockConfig).map(([k, v]) => [k, v.damage])
);
/* ============================================================ */

/* 攻击槽：累积伤害数值 */
let attackGaugeDamage = 0;

function avoidOverlap(rect, others, minGap = 12, maxTries = 5) {
    let attempt = 0;
    while (attempt < maxTries) {
      let collision = false;
      for (const o of others) {
        const overlapX = rect.x < o.x + o.width + minGap &&
                         rect.x + rect.width + minGap > o.x;
        const overlapY = rect.y < o.y + o.height + minGap &&
                         rect.y + rect.height + minGap > o.y;
        if (overlapX && overlapY) {
          rect.y = o.y + o.height + minGap;
          collision = true;
          break;
        }
      }
      if (!collision) break;
      attempt++;
    }
    return rect;
  }
  
  function scaleToAvoidOverlap(rect, others, minScale = 0.6, step = 0.05) {
    let scale = 1.0;
    while (scale >= minScale) {
      const testRect = {
        x: rect.x,
        y: rect.y,
        width: rect.width * scale,
        height: rect.height * scale
      };
      const overlaps = others.some(o =>
        testRect.x < o.x + o.width &&
        testRect.x + testRect.width > o.x &&
        testRect.y < o.y + o.height &&
        testRect.y + testRect.height > o.y
      );
      if (!overlaps) {
        return { ...testRect, scale };
      }
      scale -= step;
    }
    return { ...rect, scale: minScale };
  }
  

  export function addToAttackGauge(value) {
    if (value > 1) {
      attackGaugeDamage += value;
      damagePopTime = Date.now(); // ✅ 仅在有正向增益时触发动画
    }
  }
  



const heroImageCache = {}; // 缓存图片
let ctxRef;
let switchPageFn;
let canvasRef;

// ✅ 预加载胜利图片
const victoryHeroImage = wx.createImage();
victoryHeroImage.src = 'assets/ui/victory_hero.png';

victoryHeroImage.onload = () => {
  globalThis.imageCache = globalThis.imageCache || {};
  globalThis.imageCache.victoryHero = victoryHeroImage;

  victoryHeroLoaded = true; // ✅ 图片加载完成
};


globalThis.gridSize = 6;
let gridData = [];
let selected = null;


/* ================= 背景层：黑 → 紫渐变 =================== */
function drawBackground() {
    ctxRef.setTransform(1, 0, 0, 1, 0, 0);          // 复位矩阵
    const darkPurple = '#4C0013';                   // 最底端色
    const g = ctxRef.createLinearGradient(0, 0, 0, canvasRef.height * 0.9);
    g.addColorStop(0, '#000');                      // 顶部纯黑
    g.addColorStop(1, darkPurple);                  // 90% 处过渡到暗紫
    ctxRef.fillStyle = g;
    ctxRef.fillRect(0, 0, canvasRef.width, canvasRef.height * 0.9);
    ctxRef.fillStyle = darkPurple;                  // 余下 10%
    ctxRef.fillRect(0, canvasRef.height * 0.9, canvasRef.width, canvasRef.height * 0.1);
  }
  

export function initGamePage(ctx, switchPage, canvas, options = {}) {
    resetSessionState();      //  ← 新增
    currentLevel = options?.level || 1;  // 🌟 记录本次启动关卡
    wx.setStorageSync('lastLevel', currentLevel.toString());
    globalThis.expGainedThisRound = 0;
  ctxRef = ctx;
  switchPageFn = switchPage;
  canvasRef = canvas;
  globalThis.canvasRef = canvas;
  globalThis.ctxRef = ctx;
  globalThis.__gridStartY = canvas.height * 0.38;  // 头像显示行顶部的 Y 坐标（你可微调）
const { createHeroLevelUpEffect } = require('./effects_engine.js');

// ✅ 为每个出战英雄绑定升级特效回调
const heroes = getSelectedHeroes?.();
if (heroes?.length) {
  heroes.forEach((hero, index) => {
    if (hero) {
      hero.onLevelUp = () => {
        createHeroLevelUpEffect(index); // 🎉 播放升级特效
      };
    }
  });
}


// 🌟 读取当前关卡的棋盘配置（默认 6×6，全部方块）
const config = LevelConfigs[currentLevel] || {};
globalThis.gridSize = config.gridSize || 6;
globalThis.allowedBlocks = config.allowedBlocks || ['A', 'B', 'C', 'D', 'E', 'F'];


// ✅ 使用小游戏的全局触摸事件监听
wx.onTouchStart(onTouch);
wx.onTouchEnd(onTouchend);

  showGameOver = false;
  gaugeCount = 0;
  attackGaugeDamage = 0;
  attackDisplayDamage = 0;
  selected = null;

  initGrid();
  const m = loadMonster(currentLevel);
 
  const totalHp = heroes.reduce((sum, h) => sum + (h?.hp || 0), 0);
  initPlayer(totalHp);
  drawGame();
  registerGameHooks({
    expand: expandGridTo,
    addGauge: addToAttackGauge,
    hitFlash: monsterHitFlashTime
  });
}



function releaseAllReadySkills() {
  const charges = getCharges();
  for (let i = 0; i < gridSize; i++) {
    if (charges[i] >= 100) {
      releaseHeroSkill(i);
    }
  }
}

function initGrid() {
    const blocks = globalThis.allowedBlocks || ['A', 'B', 'C', 'D', 'E', 'F'];
  gridData = [];
  for (let i = 0; i < gridSize; i++) {
    gridData[i] = [];
    for (let j = 0; j < gridSize; j++) {
      const rand = Math.floor(Math.random() * blocks.length);
      gridData[i][j] = blocks[rand];
    }
  }

  if (!hasPossibleMatches()) {
    initGrid();
  }
}

export function drawGame() {
  if (!Array.isArray(gridData) || gridData.length < globalThis.gridSize) {
    initGrid(); // ⛑ 兜底
  }
  // ✅ 插入这行：每一帧初始化 layoutRects，避免旧数据干扰
  globalThis.layoutRects = [];
  ctxRef.setTransform(1, 0, 0, 1, 0, 0);
  // 创建背景层并清空画布


  ctxRef.setTransform(1, 0, 0, 1, 0, 0);
  ctxRef.clearRect(0, 0, canvasRef.width, canvasRef.height); // 只负责清屏




  const maxWidth = canvasRef.width * 0.9;
  const maxHeight = canvasRef.height - 420;
  const blockSize = Math.floor(Math.min(maxWidth, maxHeight) / gridSize);
  const startX = (canvasRef.width - blockSize * gridSize) / 2;
  const topSafeArea = 220; // 怪物区向上留空间
const bottomPadding = 40; // 更贴近底部
const startY = Math.max(topSafeArea, canvasRef.height - blockSize * gridSize - bottomPadding);
  
  

  const layoutRects = globalThis.layoutRects || [];  // 🔄 读取已有布局

  let boardRect = {
    x: startX,
    y: startY,
    width: blockSize * gridSize,
    height: blockSize * gridSize
  };
  
  // ✅ 使用缩放函数来避免遮挡
  const scaledBoard = scaleToAvoidOverlap(boardRect, layoutRects);

  
  // 使用缩放后的位置与大小
  const boardX = scaledBoard.x;
  const boardY = scaledBoard.y;

  
  const boardScale = scaledBoard.scale;
  const actualBlockSize = blockSize * boardScale;
  
  // 更新全局引用
  __blockSize = actualBlockSize;
  __gridStartX = boardX;
  __gridStartY = boardY;
  globalThis.__gridStartY = boardY;
  

  globalThis.__blockSize = actualBlockSize;
globalThis.__gridStartX = boardX;
globalThis.__gridStartY = boardY;

  // 绘制方块
  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      const block = gridData[row][col];

      const x = boardX + col * actualBlockSize;
      const y = boardY + row * actualBlockSize;
      
   

      const renderMap = {
        A: globalThis.renderBlockA,
        B: globalThis.renderBlockB,
        C: globalThis.renderBlockC,
        D: globalThis.renderBlockD,
        E: globalThis.renderBlockE,
        F: globalThis.renderBlockF,
        S1: SuperBlockSystem.render,
        S2: SuperBlockSystem.render,
        S3: SuperBlockSystem.render,
      };
      const renderer = renderMap[block];
      if (renderer) {
        renderer(ctxRef, x, y, actualBlockSize, actualBlockSize, block);
      } else {
        // ✅ 无论 block 是否存在，都画一个灰底圆角方块
        ctxRef.fillStyle = BlockConfig[block]?.color || '#241b2d';
        drawRoundedRect(ctxRef, x, y, actualBlockSize - 4, actualBlockSize - 4, 6, true, false);
      
        // ✅ 仅当 block 存在（不是 null）时才画文字
        if (block) {
          ctxRef.fillStyle = 'white';
          ctxRef.font = `${Math.floor(actualBlockSize / 2.5)}px sans-serif`;
          ctxRef.fillText(block, x + actualBlockSize / 2.5, y + actualBlockSize / 1.5);
        }
      }
      

      if (selected && selected.row === row && selected.col === col) {
        ctxRef.strokeStyle = '#cf20a0';
        ctxRef.lineWidth = 4;
        drawRoundedRect(ctxRef, x, y, actualBlockSize - 4, actualBlockSize - 4, 6, false, true);
      }
    }
  }



  // 在单独的绘制层绘制UI元素
  drawUI();
// === 胜利弹窗绘制逻辑（纵向“升级！”版本） ===
if (showVictoryPopup) {
    const ctx = ctxRef;
    const W = canvasRef.width;
    const H = canvasRef.height;
  
    /* 1. 背景遮罩 */
    ctx.fillStyle = 'rgba(0,0,0,0.8)';
    ctx.fillRect(0, 0, W, H);
  
    /* 2. 标题 */
    const title = `第 ${levelJustCompleted} 关胜利！`;
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 36px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const titleY = H * 0.18;
    ctx.fillText(title, W / 2, titleY);
  
    /* 3. 中央插图 */
    const heroImgW = 120, heroImgH = 120;
    const heroImgX = (W - heroImgW) / 2;
    const heroImgY = titleY + 60;
  
    if (!globalThis.victoryHeroImage) {
      const img = wx.createImage();
      img.src = 'assets/ui/victory_hero.png';
      img.onload = () => { globalThis.victoryHeroImage = img; drawGame(); };
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '20px sans-serif';
      ctx.fillText('加载中...', W / 2, heroImgY + 40);
    } else {
      ctx.drawImage(globalThis.victoryHeroImage, heroImgX, heroImgY, heroImgW, heroImgH);
    }
  
    /* 4. 金币奖励 */
    const goldY = heroImgY + heroImgH + 24;
    if (popupGoldDisplayed < earnedGold) {
        const diff = earnedGold - popupGoldDisplayed;
        popupGoldDisplayed += Math.ceil(diff * 0.1); // ✨ 更慢滚动（从 0.2 降为 0.1）
      } else {
        popupGoldDisplayed = earnedGold;
      }
      
      const popupGoldText = `获得金币：+${popupGoldDisplayed}`;
      ctx.fillStyle = '#FFD700';
      ctx.font = 'bold 20px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText(popupGoldText, W / 2, goldY);
      // ✅ 显示经验奖励
const expY = goldY + 30;
console.log('[弹窗] 当前经验显示值：', globalThis.expGainedThisRound);

const expGained = globalThis.expGainedThisRound || 0;
const popupExpText = `获得经验：+${expGained}`;
ctx.fillStyle = '#7CF2FF';
ctx.font = 'bold 20px sans-serif';
ctx.fillText(popupExpText, W / 2, expY);
  
    /* 5. 其他奖励文本 */
    const rewards = globalThis.levelRewards || [];
    const rewardStartY = goldY + 32;
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '18px sans-serif';
    rewards.forEach((txt, i) => {
      ctx.fillText(txt, W / 2, rewardStartY + i * 28);
    });
  
    /* 6. 英雄升级纵向列表 */
    const ups = globalThis.heroLevelUps || [];
    if (ups.length > 0) {
      const avatar = 64;                    // 头像尺寸
      const rowGap = 4;                    // 行距
      const startX = W * 0.18;              // 左边距，与出战栏齐
      const startY = rewardStartY + rewards.length * 28 + 12;
  
      ups.forEach((up, i) => {
        const rowY = startY + i * (avatar + rowGap);
  
        /* 6.1 头像 */
         /* 6-1 头像：直接复用出战栏绘制函数 */
         drawHeroIconFull(ctx, up.hero, startX, rowY, avatar, 0.85);  // 最后一个参数是 scale（1 = 原尺寸）
  
/* 6.2 名字（头像右侧，靠上） */
const nameX = startX + avatar + 12;   // 头像右侧 12px
const nameY = rowY + 6;               // 距头像顶 6px
ctx.fillStyle   = '#FFFFFF';
ctx.font        = 'bold 18px sans-serif';
ctx.textAlign   = 'left';
ctx.textBaseline= 'top';
ctx.fillText(up.name ?? '', nameX, nameY);

/* 6.3 “升级！”（与名字同行，右对齐） */
ctx.fillStyle   = '#FFD700';
ctx.font        = 'bold 18px sans-serif';
ctx.textAlign   = 'right';
ctx.textBaseline= 'top';
ctx.fillText('升级！', W - startX, nameY);

/* 6.4 等级变化（紧贴名字下方） */
const lvlY = nameY + 20;              // 行距 
ctx.fillStyle   = '#CCCCCC';
ctx.font        = 'bold 18px sans-serif';
ctx.textAlign   = 'left';
ctx.textBaseline= 'top';
ctx.fillText(`Lv.${up.oldLevel} → Lv.${up.newLevel}`, nameX, lvlY);
      });
    }
  
    /* 7. “下一关”按钮 */
    const btnW = 160, btnH = 48;
    const btnX = (W - btnW) / 2;
    const btnY = H * 0.83;
  
    ctx.fillStyle = '#D43C44';
    drawRoundedRect(ctx, btnX, btnY, btnW, btnH, 12, true, false);
  
    ctx.fillStyle = '#F3E9DB';
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('下一关', W / 2, btnY + btnH / 2);
  
    globalThis.victoryBtnArea = { x: btnX, y: btnY, width: btnW, height: btnH };
  }
  
  
  
}

function drawHeroIconFull(ctx, hero, x, y, size = 48, scale = 0.8) {
    const roleToBlockLetter = {
      '战士': 'A', '游侠': 'B', '法师': 'C', '坦克': 'D', '刺客': 'E', '辅助': 'F'
    };
  
    const icon = globalThis.imageCache[hero.icon];
    const r = 6;
  
    const scaledSize = size * scale;
    const offsetX = x + (size - scaledSize) / 2;
    const offsetY = y + (size - scaledSize) / 2;
  
    // === 圆角头像区域 ===
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(offsetX + r, offsetY);
    ctx.lineTo(offsetX + scaledSize - r, offsetY);
    ctx.quadraticCurveTo(offsetX + scaledSize, offsetY, offsetX + scaledSize, offsetY + r);
    ctx.lineTo(offsetX + scaledSize, offsetY + scaledSize - r);
    ctx.quadraticCurveTo(offsetX + scaledSize, offsetY + scaledSize, offsetX + scaledSize - r, offsetY + scaledSize);
    ctx.lineTo(offsetX + r, offsetY + scaledSize);
    ctx.quadraticCurveTo(offsetX, offsetY + scaledSize, offsetX, offsetY + scaledSize - r);
    ctx.lineTo(offsetX, offsetY + r);
    ctx.quadraticCurveTo(offsetX, offsetY, offsetX + r, offsetY);
    ctx.closePath();
    ctx.clip();
  
    if (icon) {
      ctx.drawImage(icon, offsetX, offsetY, scaledSize, scaledSize);
    } else {
      ctx.fillStyle = '#555';
      ctx.fillRect(offsetX, offsetY, scaledSize, scaledSize);
    }
    ctx.restore();
  
    // === 品质边框 ===
    const rarityColor = { SSR: '#FFD700', SR: '#C0C0C0', R: '#A0522D' }[hero.rarity] || '#FFF';
    ctx.strokeStyle = rarityColor;
    ctx.lineWidth = 2;
    drawRoundedRect(ctx, offsetX, offsetY, scaledSize, scaledSize, r, false, true);
  
    // === 职业图标 ===
    const letter = roleToBlockLetter[hero.role];
    const roleIcon = globalThis.imageCache?.[`block_${letter}`];
    const iconSize = scaledSize * 0.26;
    const iconX = offsetX + 4;
    const iconY = offsetY + scaledSize - iconSize - 4;
  
    if (roleIcon && roleIcon.complete && roleIcon.width > 0) {
      ctx.save();
      ctx.fillStyle = '#222';
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
      drawRoundedRect(ctx, iconX, iconY, iconSize, iconSize, iconSize / 2, true, true);
      ctx.restore();
      ctx.drawImage(roleIcon, iconX, iconY, iconSize, iconSize);
    }
  }
  
  
  //UI层下的图片不会闪烁，后续功能都放进这个层。 
function drawUI() {
    /* —— 背景始终放在 UI 最底层 —— */
ctxRef.save();
ctxRef.globalCompositeOperation = 'destination-over'; // 后画但显示在最底
drawBackground();                                     // 调用刚写的新函数
ctxRef.restore();


  ctxRef.setTransform(1, 0, 0, 1, 0, 0);
  const ctx = ctxRef;
  const canvas = canvasRef;
  const layoutRects = globalThis.layoutRects || [];
  

   // ✅ 插入：让棋盘先声明其区域
   layoutRects.push({
    x: __gridStartX,
    y: __gridStartY,
    width: __blockSize * gridSize,
    height: __blockSize * gridSize
  });

// ✅ 棋盘外围
const padding = 9;       // 调整距离
const borderRadius = 12; // 调整圆角

const boardX = __gridStartX - padding;
const boardY = __gridStartY - padding;
const boardW = __blockSize * gridSize + padding * 2;
const boardH = __blockSize * gridSize + padding * 2;

ctxRef.strokeStyle = '#751b50'; // 绿色
ctxRef.lineWidth = 4;
drawRoundedRect(ctxRef, boardX, boardY, boardW, boardH, borderRadius, false, true);
// ✅ 棋盘外围

drawMonsterSprite(ctxRef, canvasRef); 

/* === 出战栏：固定 5 槽位 + 编号（原来绿色框位置） ================ */
const heroes      = getSelectedHeroes();   // 长度固定 5
const iconSize    = 48;                    // 头像边长，可调
const spacing     = 12;                    // 槽位间隔
const totalWidth  = 5 * iconSize + 4 * spacing;
const startXHero  = (canvasRef.width - totalWidth) / 2;
const topMargin = __gridStartY - 80;               // 保持原位置

/* === 攻击槽（累计伤害） ===================================== */
const gaugeW = 180, gaugeH = 14;
const gaugeX = (canvasRef.width - gaugeW) / 2;

// 动态避让，攻击槽是一个长条
const gaugeRect = avoidOverlap({ x: gaugeX, y: 60, width: gaugeW, height: gaugeH + 30 }, layoutRects);
layoutRects.push(gaugeRect);
const gaugeY = gaugeRect.y;

/* ==== 累积伤害滚动 & 动画 ================================ */
// 1. 动态数值逼近
if (attackDisplayDamage < attackGaugeDamage) {
  const diff = attackGaugeDamage - attackDisplayDamage;
  attackDisplayDamage += Math.ceil(diff * 0.33);
} else {
  attackDisplayDamage = attackGaugeDamage;
}

// 🎯 动态缩放动画
let fontScale = 1;
const popDur = 400;
if (Date.now() - damagePopTime < popDur) {
  const p = 1 - (Date.now() - damagePopTime) / popDur;
  fontScale = 1 + 0.8 * Math.sin(p * Math.PI); // 更弹性
}

// 🎯 多层级样式设定
let baseFont = 20;
let gradient, strokeWidth;

if (attackDisplayDamage > 10000) {
  baseFont = 60;
  gradient = ctxRef.createLinearGradient(0, 0, 0, 60);
  gradient.addColorStop(0, '#FFFF00');
  gradient.addColorStop(1, '#FF0000');
  strokeWidth = 5;
  createShake?.(500, 6); // ✅ 触发震屏特效（从 effects_engine.js 来）
} else if (attackDisplayDamage > 2000) {
  baseFont = 40;
  gradient = ctxRef.createLinearGradient(0, 0, 0, 40);
  gradient.addColorStop(0, '#FF9900');
  gradient.addColorStop(1, '#FF2200');
  strokeWidth = 4;
} else if (attackDisplayDamage > 500) {
  baseFont = 28;
  gradient = ctxRef.createLinearGradient(0, 0, 0, 28);
  gradient.addColorStop(0, '#FFA500');
  gradient.addColorStop(1, '#FF4500');
  strokeWidth = 3.5;
} else {
  baseFont = 20;
  gradient = ctxRef.createLinearGradient(0, 0, 0, 20);
  gradient.addColorStop(0, '#FF4444');
  gradient.addColorStop(1, '#CC0000');
  strokeWidth = 3;
}

const fontSize = Math.floor(baseFont * fontScale);

// 🎯 绘制位置设定
const DAMAGE巢顶部 = __gridStartY - 170;
const DAMAGE巢底部 = __gridStartY - 80;
const centerY = (DAMAGE巢顶部 + DAMAGE巢底部) / 2;

// 🎯 绘制
ctxRef.save();
ctxRef.setTransform(1, 0, 0, 1, 0, 0);
ctxRef.font = `bold ${fontSize}px Impact, sans-serif`;
ctxRef.textAlign = 'center';
ctxRef.textBaseline = 'middle';

ctxRef.fillStyle = gradient;
ctxRef.lineWidth = strokeWidth;
ctxRef.strokeStyle = '#000';
ctxRef.strokeText(`${attackDisplayDamage}`, canvasRef.width / 2, centerY);
ctxRef.fillText(`${attackDisplayDamage}`, canvasRef.width / 2, centerY);
ctxRef.restore();

/* === 本局金币 HUD ============================== */
ctxRef.resetTransform?.(); // 防止变形残留

// 🎯 滚动逻辑
const targetGold = getSessionCoins();
if (displayedGold < targetGold) {
  const diff = targetGold - displayedGold;
  displayedGold += Math.ceil(diff * 0.2);
} else {
  displayedGold = targetGold;
}

// 🎯 放大缩放动画逻辑
let goldScale = 1;
const goldAnimDuration = 800; // 延长到 0.8 秒
if (Date.now() - goldPopTime < goldAnimDuration) {
  const p = 1 - (Date.now() - goldPopTime) / goldAnimDuration;
  goldScale = 1 + 0.6 * Math.sin(p * Math.PI); // 更大的弹跳幅度
}
const goldFontSize = Math.floor(18 * goldScale);

// 🎯 金币文本设置
const goldText = `金币: ${displayedGold}`;
ctxRef.font = `bold ${goldFontSize}px IndieFlower, sans-serif`; // ✅ 使用缩放字体
ctxRef.textAlign = 'left';
ctxRef.textBaseline = 'top';

// 🎯 描边
ctxRef.lineWidth = 2;
ctxRef.strokeStyle = '#000';
ctxRef.strokeText(goldText, 26, 116);

// 🎯 填充
ctxRef.fillStyle = '#FFD700';
ctxRef.fillText(goldText, 26, 116);
/* ============================================== */





// === 左上角返回按钮（暗灰底小圆角 + 白色箭头） ====================
const btnBackX = 20;
const btnBackY = 20;
const btnBackSize = 36;

ctxRef.fillStyle = '#333'; // 暗灰底
drawRoundedRect(ctxRef, btnBackX, btnBackY, btnBackSize, btnBackSize, 6);
ctxRef.fill();

ctxRef.fillStyle = '#FFF'; // 白色箭头
ctxRef.font = '20px sans-serif';
ctxRef.textAlign = 'center';
ctxRef.textBaseline = 'middle';
ctxRef.fillText('⟵', btnBackX + btnBackSize / 2, btnBackY + btnBackSize / 2);

// 存按钮区域
globalThis.backToHomeBtn = {
  x: btnBackX,
  y: btnBackY,
  width: btnBackSize,
  height: btnBackSize
};




/* --- 操作计数展示 --- */
const countDown = Math.max(0, 5 - gaugeCount);   // 还剩几次操作
const countText = `操作次数: ${countDown}`;
// === 操作计数展示（固定在棋盘上方） ===
const rightPad = 26;        // 距离右边缘
const countX   = canvasRef.width - rightPad;
const countY   = 116;       // 与“金币”文字同一行

// 闪烁：触发后 600 ms 内黄白交替
let color = '#FFF';
if (gaugeFlashTime && Date.now() - gaugeFlashTime < 600) {
  color = (Date.now() % 200 < 100) ? '#FFD700' : '#FFF';
} else if (gaugeFlashTime && Date.now() - gaugeFlashTime >= 600) {
  gaugeFlashTime = 0;
}

// 设置文字样式
ctxRef.font = 'bold 16px sans-serif';
ctxRef.textAlign = 'right';
ctxRef.textBaseline = 'middle';

// 描边
ctxRef.lineWidth = 2;
ctxRef.strokeStyle = '#000';
ctxRef.strokeText(countText, countX, countY);

// 填充
ctxRef.fillStyle = color;
ctxRef.fillText(countText, countX, countY);



/* === 出战栏 ========================================================== */
let maxHeroBottom = 0;                // ▼ 记录头像组的最底边

for (let i = 0; i < heroes.length; i++) {
  const x = startXHero + i * (iconSize + spacing);
  const y = topMargin;

  const rawRect = { x, y, width: iconSize, height: iconSize };
  const scaled  = scaleToAvoidOverlap(rawRect, layoutRects, 0.5);   // 允许最小缩放到 50%
  layoutRects.push({ x: scaled.x, y: scaled.y, width: scaled.width, height: scaled.height });

  const sx   = scaled.x;
  const sy   = scaled.y;
  const size = scaled.width;
  maxHeroBottom = Math.max(maxHeroBottom, sy + size);               // ← 关键：不断更新底边 Y

  /* — 背板框（空位也画） — */
  ctxRef.fillStyle = '#111';
  drawRoundedRect(ctxRef, sx - 2, sy - 2, size + 4, size + 4, 6, true, false);
  ctxRef.strokeStyle = '#55557a';
  ctxRef.lineWidth   = 2;
  drawRoundedRect(ctxRef, sx - 2, sy - 2, size + 4, size + 4, 6, false, true);

  /* — 蓄力条 — */
  const charges = getCharges();
  const percent = charges[i] || 0;
  const barW    = size;
  const barH    = 6;
  const barX    = sx;
  const barY    = sy + size + 6;

  ctxRef.fillStyle = '#333';
  drawRoundedRect(ctxRef, barX, barY, barW, barH, 3, true, false);

  if (percent >= 100) {
    ctxRef.strokeStyle = (Date.now() % 500 < 250) ? '#FF0' : '#F00';
    ctxRef.lineWidth   = 4;
    ctxRef.strokeRect(sx - 4, sy - 4, size + 8, size + 8);
  }

  ctxRef.fillStyle   = '#38263d';
  ctxRef.fillRect(barX, barY, barW * (percent / 100), barH);
  ctxRef.strokeStyle = '#4250b6';
  ctxRef.lineWidth   = 1;
  drawRoundedRect(ctxRef, barX, barY, barW, barH, 3, false, true);

  /* 🌟 动态蓄力特效 */
  if (percent > 0) {
    const filledWidth = barW * (percent / 100);

    // 1. 渐变条
    const grad = ctxRef.createLinearGradient(barX, 0, barX + filledWidth, 0);
    grad.addColorStop(0, '#66DFFF');
    grad.addColorStop(1, '#0077CC');
    ctxRef.fillStyle = grad;
    ctxRef.fillRect(barX, barY, filledWidth, barH);

    // 2. 顶部高亮
    const glowGrad = ctxRef.createLinearGradient(barX, barY, barX, barY + barH);
    glowGrad.addColorStop(0, 'rgba(255,255,255,0.3)');
    glowGrad.addColorStop(0.5, 'rgba(255,255,255,0)');
    ctxRef.fillStyle = glowGrad;
    ctxRef.fillRect(barX, barY, filledWidth, barH);

    // 3. 横向能量波
    const pulseX      = barX + (Date.now() % 1000) / 1000 * filledWidth;
    const pulseWidth  = 8;
    const pulseGrad   = ctxRef.createLinearGradient(pulseX, 0, pulseX + pulseWidth, 0);
    pulseGrad.addColorStop(0, 'rgba(255,255,255,0)');
    pulseGrad.addColorStop(0.5, 'rgba(255,255,255,0.4)');
    pulseGrad.addColorStop(1, 'rgba(255,255,255,0)');
    ctxRef.fillStyle = pulseGrad;
    ctxRef.fillRect(barX, barY, filledWidth, barH);
  }

  /* — 已选英雄头像 — */
  const hero = heroes[i];
  if (hero) {
    const scaleBase  = globalThis.avatarSlotScales?.[i] || 1;
    const finalScale = scaleBase * 1.05;
    drawHeroIconFull(ctxRef, hero, sx, sy, size, finalScale);

    // 等级文本
    const lvText = `Lv.${hero.level}`;
    ctxRef.font           = 'bold 11px IndieFlower, sans-serif';
    ctxRef.textAlign      = 'right';
    ctxRef.textBaseline   = 'top';
    ctxRef.fillStyle      = '#FFD700';
    ctxRef.shadowColor    = '#FFA500';
    ctxRef.shadowBlur     = 4;
    ctxRef.strokeStyle    = '#000';
    ctxRef.lineWidth      = 2;
    ctxRef.strokeText(lvText, sx + size - 4, sy + 4);
    ctxRef.fillText(lvText,  sx + size - 4, sy + 4);
    ctxRef.shadowColor    = 'transparent';
    ctxRef.shadowBlur     = 0;
  }
}   // ← 头像 for-loop 结束

// 头像+蓄力条的最底边
const CHARGE_BAR_H = 6;
const heroSectionBottom = maxHeroBottom + CHARGE_BAR_H + 6;
/* === 玩家血条：固定在棋盘正上方 ================================= */
const HP_BAR_W = 280, HP_BAR_H = 20;
const hpX = (canvasRef.width - HP_BAR_W) / 2;          // 水平居中
const hpY = __gridStartY - HP_BAR_H - -5;              // 棋盘上方 14px

drawPlayerHp(ctxRef, canvasRef, hpX, hpY);
globalThis.hpBarPos = { x: hpX, y: hpY, width: HP_BAR_W, height: HP_BAR_H };
/* ================================================================= */

  

/* =============================================================== */


// ✅ 简单粗暴显示日志：取最近 6 条，左下角打印
if (DEBUG) {
  const logs = getLogs().slice(-6);
  ctxRef.font = '12px monospace';
  ctxRef.fillStyle = '#0F0';
  ctxRef.textAlign = 'left';

  for (let i = 0; i < logs.length; i++) {
    ctxRef.fillText(logs[i], 12, canvasRef.height - 100 + i * 14);
  }
}
// === Combo 显示（仅当 combo ≥ 2 且 1 秒内） ===
if (comboCounter >= 1 && Date.now() - lastComboUpdateTime < 2500) {
    const elapsed = Date.now() - comboShowTime;
    const progress = Math.min(1, elapsed / 350); // 动画周期
    const jump = 1 + 0.4 * progress; // 只放大，不缩小
  
    // 缩放比例逻辑
    let baseScale = 0.3;
    if (comboCounter <= 10) {
      baseScale = 0.3;
    } else if (comboCounter <= 20) {
      baseScale = 0.5;
    } else {
      baseScale = Math.min(0.5 + (comboCounter - 20) * 0.05, 1.0);
    }
  
    const finalScale = baseScale * jump;
  
    const ctx = ctxRef;
    const x = canvasRef.width / 2 - 90;
    const y = __gridStartY - 180;
  
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate((-20 * Math.PI) / 180);
    ctx.scale(finalScale, finalScale);
    ctx.font = `bold 80px Impact, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
  
    const grad = ctx.createLinearGradient(-100, 0, 100, 0);
    grad.addColorStop(0, '#FFF566');
    grad.addColorStop(1, '#FF8C00');
  
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#000';
    ctx.strokeText(`Combo ×${comboCounter}!`, 0, 0);
    ctx.fillStyle = grad;
    ctx.fillText(`Combo ×${comboCounter}!`, 0, 0);
  
    ctx.restore();
  }
  
  
  

if (showGameOver) {
  const boxW = 260, boxH = 160;
  const boxX = (canvasRef.width - boxW) / 2;
  const boxY = (canvasRef.height - boxH) / 2;
  

  // 背景
  ctxRef.fillStyle = 'rgba(0, 0, 0, 0.85)';
  ctxRef.fillRect(boxX, boxY, boxW, boxH);

  // 文本
  ctxRef.fillStyle = '#FFF';
  ctxRef.font = '24px sans-serif';
  ctxRef.textAlign = 'center';
  ctxRef.fillText('游戏失败', boxX + boxW / 2, boxY + 50);

  // 按钮
  ctxRef.fillStyle = '#F33';
  drawRoundedRect(ctxRef, boxX + 60, boxY + 100, 140, 40, 10, true, false);
  ctxRef.fillStyle = '#FFF';
  ctxRef.font = '18px sans-serif';
  ctxRef.fillText('回到主页', boxX + boxW / 2, boxY + 120);
  
}

  globalThis.layoutRects = layoutRects;
  drawAllEffects(ctxRef, canvasRef);
}

function animateSwap(src, dst, callback, rollback = false) {
  const steps = 10;
  let currentStep = 0;
  const blockSize = __blockSize;
  const startX = __gridStartX;
  const startY = __gridStartY;

  const drawWithOffset = (offsetX1, offsetY1, offsetX2, offsetY2) => {
    globalThis.layoutRects = [];  // ✅ 补这一句！每帧动画中也要清空 layoutRects
    ctxRef.setTransform(1, 0, 0, 1, 0, 0);
    // 只绘制当前正在移动的方块
    ctxRef.clearRect(0, 0, canvasRef.width, canvasRef.height); // 留空给 UI 层



    // 绘制网格
    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        let offsetX = 0, offsetY = 0;
        if (row === src.row && col === src.col) {
          offsetX = offsetX1;
          offsetY = offsetY1;
        } else if (row === dst.row && col === dst.col) {
          offsetX = offsetX2;
          offsetY = offsetY2;
        }

        const x = startX + col * blockSize + offsetX;
        const y = startY + row * blockSize + offsetY;
        const block = gridData[row][col];

        const renderMap = {
          A: globalThis.renderBlockA,
          B: globalThis.renderBlockB,
          C: globalThis.renderBlockC,
          D: globalThis.renderBlockD,
          E: globalThis.renderBlockE,
          F: globalThis.renderBlockF,
        };
        
        if (SuperBlockSystem.isSuper?.(block)) {
          SuperBlockSystem.render(ctxRef, x, y, blockSize, blockSize, block);
        } else {
          const renderer = renderMap[block];
          if (renderer) {
            renderer(ctxRef, x, y, blockSize, blockSize);
          } else {
            ctxRef.fillStyle = BlockConfig[block]?.color || '#666';
            drawRoundedRect(ctxRef, x, y, blockSize - 4, blockSize - 4, 6, true, false);
            if (block) {
              ctxRef.fillStyle = 'white';
              ctxRef.font = `${Math.floor(blockSize / 2.5)}px sans-serif`;
              ctxRef.fillText(block, x + blockSize / 2.5, y + blockSize / 1.5);
            }
          }
        }
        
        
        
      }
    }



    // 绘制特效
    drawAllEffects(ctxRef);

    // 绘制UI元素
    drawUI();
  };

  const deltaX = (dst.col - src.col) * blockSize / steps;
  const deltaY = (dst.row - src.row) * blockSize / steps;

  function step() {
    if (currentStep <= steps) {
      const offsetX1 = rollback ? deltaX * (steps - currentStep) : deltaX * currentStep;
      const offsetY1 = rollback ? deltaY * (steps - currentStep) : deltaY * currentStep;
      const offsetX2 = -offsetX1;
      const offsetY2 = -offsetY1;

      drawWithOffset(offsetX1, offsetY1, offsetX2, offsetY2);
      currentStep++;
      requestAnimationFrame(step);
    } else {
      callback && callback();
    }
  }

  step();
}

function onTouch(e) {
  if (showGameOver || showVictoryPopup) return; // ✅ 游戏结束/胜利，不允许开始滑动

  const touch = e.changedTouches[0];
  const xTouch = touch.clientX;
  const yTouch = touch.clientY;

  const blockSize = __blockSize;
  const startX = __gridStartX;
  const startY = __gridStartY;
  const col = Math.floor((xTouch - startX) / blockSize);
  const row = Math.floor((yTouch - startY) / blockSize);

  if (
    row < 0 || row >= gridSize ||
    col < 0 || col >= gridSize
  ) {
    return; // ⛳️ 不合法起点，忽略
  }

  touchStart = { row, col };
  dragStartX = xTouch;
  dragStartY = yTouch;
}



// 其他函数保持不变


function checkAndClearMatches (returnColors = false) {
  
  const superBlockSpots = [];
  let clearedCount   = 0;
  const colorCounter = {};                      // {A:3, B:1 …}
  const toClear      = Array.from({ length: gridSize }, () => Array(gridSize).fill(false));

  /* === ① 找 3 连 === */

  // 横向匹配
  for (let row = 0; row < gridSize; row++) {
    let count = 1;
    for (let col = 1; col <= gridSize; col++) {
      if (col < gridSize && gridData[row][col] === gridData[row][col - 1]) {
        count++;
      } else {
        if (count >= 3) {
          const start = col - count;
          const matches = [];
          for (let k = 0; k < count; k++) {
            matches.push({ row, col: start + k });
            toClear[row][start + k] = true;
          }
  
          if (count >= 4 && SuperBlockSystem.unlockedSuperTypes(currentLevel).length) {
            const choice = matches[Math.floor(Math.random() * matches.length)];
            superBlockSpots.push({ ...choice, type: gridData[choice.row][choice.col] });
          }
        }
        count = 1;
      }
    }
  }
  
  // 纵向匹配
  for (let col = 0; col < gridSize; col++) {
    let count = 1;
    for (let row = 1; row <= gridSize; row++) {
      if (row < gridSize && gridData[row][col] === gridData[row - 1][col]) {
        count++;
      } else {
        if (count >= 3) {
          const start = row - count;
          const matches = [];
          for (let k = 0; k < count; k++) {
            matches.push({ row: start + k, col });
            toClear[start + k][col] = true;
          }
  
          if (count >= 4 && SuperBlockSystem.unlockedSuperTypes(currentLevel).length) {
            const choice = matches[Math.floor(Math.random() * matches.length)];
            superBlockSpots.push({ ...choice, type: gridData[choice.row][choice.col] });
          }
        }
        count = 1;
        if (superBlockSpots.length > 0) {
        }
      }
    }
  }
  

  /* === ② 清除并统计 === */
  // 先排除将要变成超级块的位置（不要清除）

  superBlockSpots.forEach(({ row, col }) => {
    toClear[row][col] = false;
    const sType = SuperBlockSystem.randomType(currentLevel); // 按关卡随机
if (sType) gridData[row][col] = sType;                   // 未解锁时保持原块
  });

  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      if (!toClear[r][c]) continue;
  
      const letter = gridData[r][c]; // ✅ 只声明一次
  
      const centerX = __gridStartX + c * __blockSize + __blockSize / 2;
      const centerY = __gridStartY + r * __blockSize + __blockSize / 2;
  
      createPopEffect(centerX, centerY, __blockSize, letter); // ✅ 弹跳动画
      createExplosion(centerX, centerY, BlockConfig[letter]?.color || '#FFD700'); 
      
// 创建能量粒子飞向对应英雄职业能量槽
const blockRole = BlockConfig[letter]?.role;
const blockColor = BlockConfig[letter]?.color || '#FFD700';

const heroes = getSelectedHeroes();
const heroIndex = heroes.findIndex(h => h?.role === blockRole);

// ✅ 始终先定义目标点，防止未定义错误
const size = 48;
const spacing = 12;
const totalWidth = 5 * size + 4 * spacing;
const canvas = canvasRef;
const startX = (canvas.width - totalWidth) / 2;
const topMargin = __gridStartY - 80;
const endX = startX + heroIndex * (size + spacing) + size / 2;
const endY = topMargin + size + 8;

// 在 checkAndClearMatches 中，处理 B 方块粒子效果：
if (letter === 'B') {
    const cur = getPlayerHp();
    const max = getPlayerMaxHp();
  
    if (cur < max) {
      const hpBar = globalThis.hpBarPos;
      if (hpBar) {
        const targetX = hpBar.x + hpBar.width / 2;
        const targetY = hpBar.y + hpBar.height / 2;
        createEnergyParticles(centerX, centerY, targetX, targetY, blockColor, 6);
      }
    }
  } else if (letter === 'D') {
    createGoldParticles(centerX, centerY);
  } else if (letter === 'A') {
    const targetX = canvas.width / 2;
    const targetY = __gridStartY - 125;
    createEnergyParticles(centerX, centerY, targetX, targetY, blockColor, 6);
  } else if (heroIndex >= 0) {
    createEnergyParticles(centerX, centerY, endX, endY, blockColor, 6);
  }



      // ✅ 彩色粒子效果
  
      colorCounter[letter] = (colorCounter[letter] || 0) + 1;
      gridData[r][c] = null;
      clearedCount++;
    }
  }
  

  /* === ③ 如果有消除，就累伤害 / 加蓄力 === */
  if (clearedCount > 0) {
    let addedTotalDamage = 0;
    Object.keys(colorCounter).forEach(letter => {
      const baseDamage = (BLOCK_DAMAGE_MAP[letter] || 0);
      const count = colorCounter[letter];
      const added = baseDamage * count;
      attackGaugeDamage += added;
      addedTotalDamage += added;
      console.log(`[调试] 方块消除，累计伤害巢: ${attackGaugeDamage}`);
      logBattle(`方块[${letter}] ×${count} → 攻击槽 +${added}`);

      // ✅ 触发额外方块特效
      const config = BlockConfig[letter];
      if (config?.onEliminate) {
        config.onEliminate(count, {
            gridData,
            __gridStartX,
            __gridStartY,
            __blockSize,
            dropBlocks,
            fillNewBlocks,
            checkAndClearMatches,
            gridSize: globalThis.gridSize
        });
    }
  }); // ✅ ← 这个是 .forEach 的闭合括号


  if (addedTotalDamage > 0) {
    damagePopTime = Date.now();
  }

    // b) 给英雄充能
    console.log('[调试] colorCounter =', colorCounter);
    const chargesNow = getCharges();
    const heroes     = getSelectedHeroes();

    heroes.forEach((hero, i) => {
      if (!hero) return;
      const gained = Object.keys(colorCounter)
      
      
        .filter(l => BLOCK_ROLE_MAP[l] === hero.role)
        .reduce((sum, l) => sum + colorCounter[l], 0);

        console.log(`[调试] ${hero.name}(${hero.role}) gained =`, gained); 
        
      if (gained) {
        const gain = gained * 20;
        setCharge(i, chargesNow[i] + gain);
        logBattle(`${hero.name} 蓄力 +${gain}（来源方块：${gained} 个 ${hero.role} 色）`);
      }
    });

    // ✅ 蓄力完成后，释放所有已满英雄技能
    releaseAllReadySkills();
  }

  /* === ④ 怪物回合 / 掉落新怪 === */
  if (isMonsterDead()) {
        earnedGold = getMonsterGold();
        addCoins(earnedGold);
        goldPopTime = Date.now();              // ← 加这一行
        displayedGold = getSessionCoins(); // 让动画从当前金币值开始
        levelJustCompleted = currentLevel;
    

        showVictoryPopup = true;           // ★ 再弹窗
        goldPopTime = Date.now(); // ✨ 胜利弹窗金币弹跳
    return;                                // 暂停，等待点击继续
  }
  else {
    // 敌人仍存活：怪物回合已由其他逻辑处理（如 turnsLeft）
  }
  
  // ✅ 在此处根据参数返回
  if (returnColors) {
    return Object.keys(colorCounter);
  } else {
    return clearedCount > 0;
  }
  }




function dropBlocks() {
  for (let col = 0; col < gridSize; col++) {
    for (let row = gridSize - 1; row >= 0; row--) {
      if (gridData[row][col] === null) {
        for (let k = row - 1; k >= 0; k--) {
          if (gridData[k][col] !== null && gridData[k][col] !== 'S') {
            gridData[row][col] = gridData[k][col];
            gridData[k][col] = null;
            break;
          }
        }
      }
    }
  }
}
function fillNewBlocks() {
    const blocks = globalThis.allowedBlocks || ['A', 'B', 'C', 'D', 'E', 'F']; // ✅ 使用配置
    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        if (gridData[row][col] === null || gridData[row][col] === undefined) {
          const rand = Math.floor(Math.random() * blocks.length);
          gridData[row][col] = blocks[rand];
        }
      }
    }
  }

function hasPossibleMatches() {
  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      const current = gridData[row][col];
      if (!current) continue;

      const trySwap = (r1, c1, r2, c2) => {
        if (
          r2 >= 0 && r2 < gridSize &&
          c2 >= 0 && c2 < gridSize
        ) {
          const temp = gridData[r1][c1];
          gridData[r1][c1] = gridData[r2][c2];
          gridData[r2][c2] = temp;

          const hasMatch = checkHasMatchAt(r1, c1) || checkHasMatchAt(r2, c2);

          gridData[r2][c2] = gridData[r1][c1];
          gridData[r1][c1] = temp;

          return hasMatch;
        }
        return false;
      };

      if (trySwap(row, col, row, col + 1)) return true;
      if (trySwap(row, col, row + 1, col)) return true;
    }
  }

  return false;
}

function checkHasMatchAt(row, col) {
  const val = gridData[row][col];
  let count = 1;

  let c = col - 1;
  while (c >= 0 && gridData[row][c] === val) { count++; c--; }
  c = col + 1;
  while (c < gridSize && gridData[row][c] === val) { count++; c++; }
  if (count >= 3) return true;

  count = 1;
  let r = row - 1;
  while (r >= 0 && gridData[r][col] === val) { count++; r--; }
  r = row + 1;
  while (r < gridSize && gridData[r][col] === val) { count++; r++; }

  return count >= 3;
}

function processClearAndDrop() {
    clearingRunning = true;
    const comboQueue = [];
    let comboTimerActive = false;
  
    const triggerComboTick = () => {
      if (comboQueue.length === 0) return;
  
      comboCounter++;
      comboShowTime = Date.now();
      lastComboUpdateTime = comboShowTime;
      comboQueue.shift();
  
      if (comboQueue.length > 0) {
        setTimeout(triggerComboTick, 180);
      } else {
        comboTimerActive = false;
      }
    };
  
    const loop = () => {
      setTimeout(() => {
        dropBlocks();
        drawGame();
  
        setTimeout(() => {
          fillNewBlocks();
          drawGame();
  
          setTimeout(() => {
            let hasNewCombo = false;
  
            // 🚀 返回消除的颜色种类（每个触发一次 combo）
            const colorMatches = checkAndClearMatches(true);
            hasNewCombo = colorMatches.length > 0;
            comboQueue.push(...colorMatches.map(() => Date.now()));
  
            // ✅ 调试输出（高亮）
            if (hasNewCombo) {
              console.log('🔶🔥🔥🔥【Combo 匹配颜色种类】:', colorMatches);
              console.log('🔷📈📈📈【Combo 队列状态】:', comboQueue);
            }
  
            const stillEmpty = hasEmptyTiles();
  
            if (hasNewCombo || stillEmpty) {
              if (!comboTimerActive && comboQueue.length > 0) {
                comboTimerActive = true;
                // ❌ 不再重置 comboCounter
                triggerComboTick();
              }
  
              loop();
            } else {
              if (!hasPossibleMatches()) {
                setTimeout(() => {
                  initGrid();
                  drawGame();
                }, 500);
              } else {
                setTimeout(() => {
                  comboQueue.length = 0;
                  comboCounter = 0; // ✅ 只在结算完再重置
                  drawGame();
                }, 2000);
  
                clearingRunning = false;
                tryStartHeroBurst();
              }
            }
          }, 300);
        }, 300);
      }, 200);
    };
  
    loop();
  }
  
  
  
  
  
  function hasEmptyTiles() {
    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        if (!gridData[r][c]) return true;
      }
    }
    return false;
  }
  

export function updateGamePage() {
  updateAllEffects();
}

function onTouchend(e) {
  const touch = e.changedTouches?.[0];
  if (!touch) return;

  const x = touch.clientX;
  const y = touch.clientY;

    // ✅ 胜利弹窗点击“下一关”
    if (showVictoryPopup) {
      const btn = globalThis.victoryBtnArea;
      if (btn && x >= btn.x && x <= btn.x + btn.width &&
                 y >= btn.y && y <= btn.y + btn.height) {
        showVictoryPopup = false;
    
        currentLevel = currentLevel + 1; // ✅ 明确用本地 currentLevel 推进
        const config = LevelConfigs[currentLevel] || {};
globalThis.gridSize = config.gridSize || 6;
globalThis.allowedBlocks = config.allowedBlocks || ['A', 'B', 'C', 'D', 'E', 'F'];
        levelJustCompleted = currentLevel;  // ✅ 更新胜利用变量
        attackGaugeDamage = 0;
        attackDisplayDamage = 0;
        const monster = loadMonster(currentLevel); // ✅ 使用正确关卡加载怪物
     
    
        initGrid();
        drawGame();
      }
      return;
    }

    
  // ✅ 点击超级方块立即触发技能（提早处理）
  const col = Math.floor((x - __gridStartX) / __blockSize);
  const row = Math.floor((y - __gridStartY) / __blockSize);

    // ✅ 点击超级方块触发技能
    if (
      row >= 0 && row < gridSize &&
      col >= 0 && col < gridSize
    ) {
      const block = gridData[row][col];
    
      if (SuperBlockSystem.isSuper?.(block)) {
        if (showVictoryPopup) return;  // ✅ 只有点击超级方块时才禁止触发
    
        SuperBlockSystem.trigger(row, col, ctxRef, gridData, gridSize);
        gridData[row][col] = null;
        drawGame();
        setTimeout(() => processClearAndDrop(), 300);
        return;
      }
    }

  

  // ✅ 失败弹窗点击“回到主页”
  if (showGameOver) {
    const boxW = 260;
    const boxH = 160;
    const boxX = (canvasRef.width - boxW) / 2;
    const boxY = (canvasRef.height - boxH) / 2;
    const btnX = boxX + 60;
    const btnY = boxY + 100;
    const btnW = 140;
    const btnH = 40;

    const inGameOverBtn =
      x >= btnX && x <= btnX + btnW &&
      y >= btnY && y <= btnY + btnH;

      if (inGameOverBtn) {
        switchPageFn?.('home', () => {
          destroyGamePage();
        });
      }
      

    return; // ❗ 禁止继续滑动行为
  }

  // ✅ 检测是否点击了左上角“返回”按钮
const btn = globalThis.backToHomeBtn;
if (btn &&
    x >= btn.x && x <= btn.x + btn.width &&
    y >= btn.y && y <= btn.y + btn.height) {

        wx.setStorageSync('lastLevel', currentLevel.toString());

        
  switchPageFn?.('home', () => {
    destroyGamePage(); // 清理资源
  });
  return; // ✅ 不再继续处理滑动
}




  if (!touchStart) return;

  // ✅ 滑动处理逻辑保持不变
  const endX = touch.clientX;
  const endY = touch.clientY;
  const dx = endX - dragStartX;
  const dy = endY - dragStartY;

  const absX = Math.abs(dx);
  const absY = Math.abs(dy);

  let target = null;

  if (absX > absY) {
    if (dx > 20 && touchStart.col < gridSize - 1) {
      target = { row: touchStart.row, col: touchStart.col + 1 };
    } else if (dx < -20 && touchStart.col > 0) {
      target = { row: touchStart.row, col: touchStart.col - 1 };
    }
  } else {
    if (dy > 20 && touchStart.row < gridSize - 1) {
      target = { row: touchStart.row + 1, col: touchStart.col };
    } else if (dy < -20 && touchStart.row > 0) {
      target = { row: touchStart.row - 1, col: touchStart.col };
    }
  }

  if (target) {
    handleSwap(touchStart, target);
  } else {
    if (!selected) {
      selected = touchStart;
    } else {
      const dx = Math.abs(selected.col - touchStart.col);
      const dy = Math.abs(selected.row - touchStart.row);
      const isAdjacent = (dx + dy === 1);
      if (isAdjacent) {
        handleSwap(selected, touchStart);
      } else {
        selected = touchStart;
      }
    }
  }

  touchStart = null;
}



function handleSwap(src, dst) {
  const temp = gridData[dst.row][dst.col];
  gridData[dst.row][dst.col] = gridData[src.row][src.col];
  gridData[src.row][src.col] = temp;

  animateSwap(src, dst, () => {
    if (checkAndClearMatches()) {
      selected = null;
      gaugeCount++;

      playerActionCounter++;

      const heroes = getSelectedHeroes?.() || [];
      for (const hero of heroes) {
        const fx = hero?.tempEffects;
        if (fx?.gridExpandTurnsLeft !== undefined) {
          fx.gridExpandTurnsLeft--;
    
          if (fx.gridExpandTurnsLeft <= 0) {
            globalThis.gridSize = 6;
            initGrid();
            drawGame();
            delete fx.gridExpandTurnsLeft;
            logBattle(`${hero.name} 的棋盘扩展结束，恢复为 6x6`);
          }
        }
      }

      
     // ✅ 每个英雄可能拥有自己的棋盘扩展技能，检查是否到期
     for (const hero of heroes) {
      const fx = hero?.tempEffects;
      if (!fx?.gridExpandGaugeBase) continue;
    
      const passed = gaugeCount - fx.gridExpandGaugeBase;
      if (passed >= fx.gridExpandSteps) {
        globalThis.gridSize = 6;
        delete fx.gridExpandGaugeBase;
        delete fx.gridExpandSteps;
        initGrid();
        drawGame();
        logBattle(`${hero.name} 的棋盘扩展结束，恢复为 6x6`);
      }
    }


      if (globalThis.gridExpandGaugeBase !== undefined) {
        const stepsPassed = gaugeCount - globalThis.gridExpandGaugeBase;
        if (stepsPassed >= 2) {
          globalThis.gridSize = 6;
          delete globalThis.gridExpandGaugeBase;
          initGrid();
          drawGame();
          logBattle("棋盘扩展效果结束，恢复为 6x6");
        }
      }
   
      if (gaugeCount >= 5) {
        gaugeFlashTime = Date.now();
        pendingHeroBurst = true;
        pendingBurstDamage = attackGaugeDamage;
      
        // 防止多次触发
        const currentCount = gaugeCount;
        gaugeCount = 9999; // 临时设置一个非法大值，防止继续触发
      
        setTimeout(() => {
          gaugeCount = 0; // 重置回 0
          tryStartHeroBurst();
        }, 2000); // 等待2秒再触发
      }

      
      
      processClearAndDrop();
    } else {
      // 撤销交换
      const tempBack = gridData[dst.row][dst.col];
      gridData[dst.row][dst.col] = gridData[src.row][src.col];
      gridData[src.row][src.col] = tempBack;

      animateSwap(src, dst, () => {
        selected = null;
        drawGame();
      }, true);
    }
  });
}


function destroyGamePage() {
  // ✅ 解绑触摸事件，避免重复绑定或内存泄漏
  wx.offTouchStart(onTouch);
  wx.offTouchEnd(onTouchend);

  // ✅ 结算金币
  commitSessionCoins();
}
export { expandGridTo };  // ✅ 添加这行

  export default {
    init: initGamePage,
    update: updateGamePage,
    draw: drawGame,
    onTouchend,
    touchend: onTouchend, 
    destroy: destroyGamePage
  };

/**
 * 依次播放 5 个英雄技能并在尾声结算伤害
 * @param {number} dmg - 进入连招前累计的攻击槽伤害
 */
function startHeroBurst(dmg) {
    heroBurstRunning = true;
  
    const heroes     = getSelectedHeroes();     // 长度固定 5
    const interval   = 650;                     // 英雄间隔
    const startDelay = 650;                     // 开场停顿
    let   idx        = 0;
  
    /* 递归播放 */
    function releaseNext() {
      if (idx >= heroes.length) return;
      heroes[idx] && releaseHeroSkill(idx);
      idx++;
      if (idx < heroes.length) setTimeout(releaseNext, interval);
    }
    setTimeout(releaseNext, startDelay);
  
    /* 总时长 = 起始停顿 + 有效英雄数 × 间隔 + 收尾缓冲 */
    const liveCount = heroes.filter(h => h).length;
 
  
    function waitSkillsThenFinish() {
        if (skillsActive === 0) {
          startAttackEffect(attackGaugeDamage); // ✅ 使用最新伤害巢值
          drawGame();
          heroBurstRunning = false;
          tryStartHeroBurst();      // 检查队列
        } else {
          // 50 ms 轮询一次，直到 skillsActive 归 0
          setTimeout(waitSkillsThenFinish, 50);
        }
      }
      
      setTimeout(waitSkillsThenFinish, startDelay + liveCount * interval);
  }
  
  function tryStartHeroBurst() {
    if (pendingHeroBurst && !heroBurstRunning && !clearingRunning) {
      pendingHeroBurst = false;
      const heroes = getSelectedHeroes();
const interval = 600;            // 每个英雄动画的间隔
const startDelay = 600;          // 首次释放前延迟
const totalHeroes = heroes.filter(h => h).length;
const totalDuration = startDelay + totalHeroes * interval + 300;

let i = 0;
function releaseNext() {
  if (i >= heroes.length) return;
  if (heroes[i]) releaseHeroSkill(i);
  i++;
  setTimeout(releaseNext, interval);
}

setTimeout(releaseNext, startDelay);

// 💥 等所有技能释放后再结算攻击
// 延迟后开始轮询动画是否结束
setTimeout(() => {
  function waitForAllSkills() {
    if (skillsActive === 0) {
      startAttackEffect(attackGaugeDamage);  // ✅ 动画播完 + 最新值
    } else {
      setTimeout(waitForAllSkills, 50);      // 继续等待
    }
  }
  waitForAllSkills();
}, totalDuration);
    }
  }
  function releaseHeroSkill(slotIndex) {
    skillsActive++;                 // 技能开始 → +1
    const hero = getSelectedHeroes()[slotIndex];
    if (!hero) return;

      // ✅ 添加技能对话特效
  const skillName = HeroData.heroes.find(h => h.id === hero.id)?.skill?.name || '技能';
  createSkillDialog(slotIndex, skillName);
  
    const eff = hero.skill?.effect;
    if (!eff) return;

    console.log("释放技能：", hero.name, hero.skill?.effect);
    const context = {
      dealDamage,
      log: logBattle,
      canvas: canvasRef,
      addGauge: (value) => {
        const delta = Math.round(value);
        attackGaugeDamage += delta;
        pendingBurstDamage += delta;
        damagePopTime = Date.now();
      },
      mulGauge: (factor) => {
        attackGaugeDamage = Math.round(attackGaugeDamage * factor);
        pendingBurstDamage = attackGaugeDamage;
        damagePopTime = Date.now();
      }
    };
    
  
    applySkillEffect(hero, eff, context);
    // 添加释放特效（在能量条清空前）
const size = 48;
const spacing = 12;
const totalWidth = 5 * size + 4 * spacing;
const startX = (canvasRef.width - totalWidth) / 2;
const topMargin = __gridStartY - 80;
const barW = size;
const barH = 6;
const barX = startX + slotIndex * (size + spacing);
const barY = topMargin + size + 6;
// 🌟 添加蓝色能量高亮边框
createChargeGlowEffect(barX - 1, barY - 1, barW + 2, barH + 2);
createChargeReleaseEffect(barX, barY, barW, barH);

    setCharge(slotIndex, 0);
    createExplosion(canvasRef.width / 2, canvasRef.height / 2);

    const SKILL_END_MS = 1200;
setTimeout(() => {
  skillsActive--;
}, SKILL_END_MS);


      // ✅ 技能表现：触发头像动画（默认样式）
      createAvatarFlash(slotIndex, 1.3, 500); 

  // ✅ 可扩展技能特效表现
  if (hero.id === 'hero003') {
    // 示例：法师英雄释放火球术
    createFloatingText('火球术！', canvasRef.width / 2, 160, '#FF6600');
    createExplosion(canvasRef.width / 2, 140, '#FF3300');
  } else if (hero.id === 'hero006') {
    // 示例：牧师英雄释放圣光祷言
    createFloatingText('圣光祷言', canvasRef.width / 2, 160, '#66FFFF');
  }

  }
  


function startAttackEffect(dmg) {
  if (dmg <= 0) return;

  // ① 清零界面累计
  attackGaugeDamage   = 0;
  attackDisplayDamage = 0;

  // ② 记录待结算伤害
  pendingDamage = dmg;

  // ③ 发射飞弹：起点 = 伤害数字中心，终点 = 怪物中心
  const startX = canvasRef.width / 2;
  const startY = __gridStartY - 40;  // 让它从计数器区域或头像栏中飞出                           
  const endX   = canvasRef.width / 2;
  const endY   = 180;                           // 怪物中心高度，按你的 UI 调

  createProjectile(startX, startY, endX, endY, 500, () => {
      
    // 飞弹到达 ⇒ 怪物掉血 & 受击闪
    dealDamage(pendingDamage, { allowKill: true });
    createMonsterBounce(); // ✅ 添加弹性缩放动画
    createExplosion(endX, endY);                // 爆点可复用现有效果
    monsterHitFlashTime = Date.now();

    // 飘字
  // 🎯 根据伤害值动态设定颜色和大小
const color = pendingDamage > 10000 ? '#FFFF00'
: pendingDamage > 2000 ? '#FF6600'
: '#FF4444';

const size = pendingDamage > 10000 ? 64
: pendingDamage > 2000 ? 48
: 36;

showDamageText(pendingDamage, endX, endY + 50);

    pendingDamage = 0;

    if (isMonsterDead()) {
        const monster = getMonster();
        if (monster.isBoss) {
          markBossDefeated(monster.level);
        }
        setTimeout(() => {
            earnedGold = getMonsterGold();
            addCoins(earnedGold);
            goldPopTime = Date.now();
            displayedGold = getSessionCoins();
            levelJustCompleted = currentLevel;
          
            // ✅ 经验逻辑（统一写在这里）
            const monster = loadMonster(currentLevel);  // 或 getMonster()
            const level = monster?.level ?? 1;
            const isBoss = monster?.isBoss ?? false;
            const exp = Math.floor(level * 5 + 10 + (isBoss ? 50 : 0));
          
            globalThis.expGainedThisRound = exp;       // ✅ 设置给弹窗读取
            rewardExpToHeroes(exp);                    // 分发经验
          
            // ✅ 胜利弹窗
            showVictoryPopup = true;
            popupGoldDisplayed = 0;
            popupGoldStartTime = Date.now();
          
            updatePlayerStats({
              stage: currentLevel,
              damage: dmg,
              gold: getSessionCoins()
            });
          
            wx.setStorageSync('lastLevel', currentLevel.toString());
          
            drawGame(); // ✅ 一定要放在最后触发弹窗绘制
          }, 600);
          
          
    
      return; // ❗很重要：停止继续 loadMonster
    } else {
      setTimeout(() => {
        monsterRetaliate();
      }, 1000); // 延迟 1000ms 后再反击
    }
    if ((globalThis.gridExpandTurns || 0) > 0) {
      globalThis.gridExpandTurns--;
      if (globalThis.gridExpandTurns === 0) {
        globalThis.gridSize = 6;
        initGrid();
        drawGame();
        logBattle("棋盘扩展效果结束，恢复为 6x6");
      }
    }
    
}, pendingDamage);
}

function monsterRetaliate() {
    const monster = getMonster();
    if (!monster || monster.hp <= 0) return;
  
    const dmg = getMonsterDamage();
    if (dmg <= 0) return;
  
    showDamageText(dmg, canvasRef.width / 2, 110);
    takeDamage(dmg);
    createShake?.(300, 4);
    createMonsterAttackFlash();
    createMonsterBounce();
    const hp = globalThis.hpBarPos || { x: 24, y: 24 };
    createExplosion(hp.x + hp.width / 2, hp.y + hp.height / 2, '#FF4444');
    drawPlayerHp(ctxRef, canvasRef, hp.x, hp.y);
  
    if (isPlayerDead()) {
      showGameOver = true;
    }
  }
  

function expandGridTo({ size = 7, steps = 3, hero }) {
  globalThis.gridSize = size;

  hero.tempEffects = hero.tempEffects || {};
  hero.tempEffects.gridExpandTurnsLeft = steps;  // ✅ 设置倒计时次数为3

  initGrid();
  drawGame();
}

/**
 * 给上阵英雄分配经验，并收集“谁升了级”
 * @param {number} expAmount - 要分配的经验值
 */


function rewardExpToHeroes(expAmount) {
    console.log('📘📘📘【经验分发】英雄获得经验 +%d', expAmount);
    heroLevelUps = [];                           // 先清空上一关的数据
  
    const heroes = getSelectedHeroes();          // 你自己已有的函数，返回本关参战英雄数组
  
    heroes.forEach(hero => {
      if (!hero) return;
  
      const oldLv = hero.level;                  // 记录旧等级
      hero.gainExp(expAmount);                   // 原有经验逻辑
  
      if (hero.level > oldLv) {                  // 只有真正升级才记录
        // 头像，如果已经在全局缓存里，就用；否则留空，弹窗那边会用灰色占位
        const avatar = globalThis.imageCache?.[hero.icon] || null;
  
         heroLevelUps.push({
               hero,         
               name : hero.name,                                  // 直接塞整只英雄对象
               oldLevel: oldLv,
               newLevel: hero.level
        });
      }
    });
  
    // 给弹窗用（drawGame 会读取）
    globalThis.heroLevelUps = heroLevelUps;
  }
  
function resetSessionState () {
    gaugeCount = 0;
    attackGaugeDamage = 0;
    pendingDamage = 0;
    playerActionCounter = 0;
    resetCharges();        // ★ 普通关只需要清蓄力，不清英雄
  }
  


  export {
    monsterHitFlashTime,
    gridData,
    dropBlocks,
    fillNewBlocks,
    checkAndClearMatches  // ✅ 不要再重复 export drawGame
  };
