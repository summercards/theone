let __blockSize = 0;
let __gridStartX = 0;
let __gridStartY = 0;
let playerActionCounter = 0;

let touchStart = null;     // 记录起始格子位置
let dragStartX = 0;        // 记录滑动起点 X
let dragStartY = 0;        // 记录滑动起点 Y
let turnsLeft; // ✅ 应加在顶部变量区，否则是隐式全局变量
let showGameOver = false;     // 是否触发失败弹窗
let victoryHeroLoaded = false;
const { drawRoundedRect } = require('./utils/canvas_utils.js');
const DEBUG = false; // 全局设置，生产时设为 false
let showVictoryPopup = false;
let earnedGold = 0;
let levelJustCompleted = 0;
let currentLevel = 1; // 🌟 当前关卡编号，需保存下来
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
    createShake, 
    createChargeReleaseEffect , 
    createSkillDialog  , 
    createChargeGlowEffect
} from './effects_engine.js';
  
import { getSelectedHeroes } from './data/hero_state.js';
import { setCharge, getCharges } from './data/hero_charge_state.js';
// 👾 Monster system
import { loadMonster, dealDamage, isMonsterDead, monsterTurn, getNextLevel, getMonsterGold } from './data/monster_state.js';
import { addCoins, getSessionCoins, commitSessionCoins } from './data/coin_state.js';
import { drawMonsterSprite } from './ui/monster_ui.js';
import HeroData   from './data/hero_data.js';
import BlockConfig from './data/block_config.js';   // ← 已有就保留
import { getMonsterTimer } from './data/monster_state.js'; // ⬅️ 加入导入
import { getLogs } from './utils/battle_log.js';
import { logBattle } from './utils/battle_log.js'; // ✅ 加这一行

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
  attackGaugeDamage += value;
  damagePopTime = Date.now(); // 让数字弹跳动画正常
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


export function initGamePage(ctx, switchPage, canvas, options = {}) {
    currentLevel = options?.level || 1;  // 🌟 记录本次启动关卡
  ctxRef = ctx;
  switchPageFn = switchPage;
  canvasRef = canvas;

  const heroes = getSelectedHeroes?.();
if (heroes?.length) {
  heroes.forEach(h => {
    if (h?.tempEffects) {
      delete h.tempEffects.gridExpandGaugeBase;
      delete h.tempEffects.gridExpandSteps;
    }
  });
}
globalThis.gridSize = 6;  // ✅ 强制还原为 6×6


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
  turnsLeft = m.skill.cooldown;
  drawGame();
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
  const blocks = ['A', 'B', 'C', 'D', 'E', 'F'];
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
  ctxRef.fillStyle = '#001';
  ctxRef.fillRect(0, 0, canvasRef.width, canvasRef.height);

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
  


  __blockSize   = actualBlockSize;
  __gridStartX  = boardX;
  __gridStartY  = boardY;

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
        ctxRef.fillStyle = BlockConfig[block]?.color || '#666';
        drawRoundedRect(ctxRef, x, y, actualBlockSize - 4, actualBlockSize - 4, 6, true, false);
      
        // ✅ 仅当 block 存在（不是 null）时才画文字
        if (block) {
          ctxRef.fillStyle = 'white';
          ctxRef.font = `${Math.floor(actualBlockSize / 2.5)}px sans-serif`;
          ctxRef.fillText(block, x + actualBlockSize / 2.5, y + actualBlockSize / 1.5);
        }
      }
      

      if (selected && selected.row === row && selected.col === col) {
        ctxRef.strokeStyle = '#00FF00';
        ctxRef.lineWidth = 4;
        drawRoundedRect(ctxRef, x, y, actualBlockSize - 4, actualBlockSize - 4, 6, false, true);
      }
    }
  }



  // 在单独的绘制层绘制UI元素
  drawUI();
    // 👇 胜利弹窗绘制逻辑
    if (showVictoryPopup) {
      const canvasW = canvasRef.width;
      const canvasH = canvasRef.height;

      // === 1. 黑色半透明背景遮罩（保留旧视觉）
      ctxRef.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctxRef.fillRect(0, 0, canvasW, canvasH);
    
      // === 2. 主体区域背景（改为紫色，无透明度）
      const bannerHeight = 260;
      const bannerY = (canvasH - bannerHeight) / 2;
      ctxRef.fillStyle = 'rgba(51, 17, 68, 1.0)';  // 半透明紫色
      ctxRef.fillRect(0, bannerY, canvasW, bannerHeight);
    
      // === 3. 标题文字（白色）
      const title = `第 ${levelJustCompleted} 关胜利！`;
      ctxRef.fillStyle = '#FFFFFF';
      ctxRef.font = 'bold 36px sans-serif';
      ctxRef.textAlign = 'center';
      ctxRef.textBaseline = 'top';
      ctxRef.fillText(title, canvasW / 2, bannerY - 60);
    
      // === 4. 中间插图（美术角色图）
// === 4. 中间插图（美术角色图）
// === 4. 中间插图（美术角色图）
if (!globalThis.victoryHeroImage) {
  const img = wx.createImage();
  img.src = 'assets/ui/victory_hero.png';
  img.onload = () => {
    globalThis.victoryHeroImage = img;
    drawGame(); // 加载成功后强制刷新
  };

  // 加载中提示
  ctxRef.fillStyle = '#FFFFFF';
  ctxRef.font = '20px sans-serif';
  ctxRef.textAlign = 'center';
  ctxRef.fillText('加载中...', canvasW / 2, bannerY + 100);
} else {
  const img = globalThis.victoryHeroImage;
  const imgW = 120;
  const imgH = 120;
  const imgX = (canvasW - imgW) / 2;
  const imgY = bannerY + 52;
  ctxRef.drawImage(img, imgX, imgY, imgW, imgH);
}




    
      // === 5. 奖励金币文字
      ctxRef.fillStyle = '#FFD700';
      ctxRef.font = '20px sans-serif';
      ctxRef.fillText(`获得金币：+${earnedGold}`, canvasW / 2, bannerY + 180);
    
      // === 6. “下一关”按钮
      const btnW = 140, btnH = 42;
      const btnX = (canvasW - btnW) / 2;
      const btnY = bannerY + 320;
    
      ctxRef.fillStyle = '#FFD700';
      drawRoundedRect(ctxRef, btnX, btnY, btnW, btnH, 10, true, false);
    
      ctxRef.fillStyle = '#000';
      ctxRef.font = 'bold 18px sans-serif';
      ctxRef.fillText('下一关', canvasW / 2, btnY + btnH / 2);
    
      // === 7. 存按钮区域以供点击判断
      globalThis.victoryBtnArea = {
        x: btnX, y: btnY, width: btnW, height: btnH
      };
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
  ctxRef.resetTransform?.();      // 小程序 2.32 起支持；低版本可再 setTransform(1…)
  ctxRef.font = 'bold 18px IndieFlower, sans-serif';
  ctxRef.textAlign = 'left';
  ctxRef.textBaseline = 'top';
  
  // 描边
  ctxRef.lineWidth = 2;
  ctxRef.strokeStyle = '#000';
  ctxRef.strokeText(`金币: ${getSessionCoins()}`, 26, 116);
  
  // 填充
  ctxRef.fillStyle = '#FFD700';
  ctxRef.fillText(`金币: ${getSessionCoins()}`, 26, 116);
ctxRef.restore();
/* ======================================================== */

// === 回合 HUD ===
// === 回合 HUD（加粗 + 描边） ===
ctxRef.font = 'bold 18px sans-serif';
ctxRef.textAlign = 'right';
ctxRef.textBaseline = 'top';

// 描边
ctxRef.lineWidth = 2;
ctxRef.strokeStyle = '#000';
ctxRef.strokeText(`回合: ${turnsLeft}`, canvasRef.width - 24, 116);

// 填充
ctxRef.fillStyle = '#FFA';
ctxRef.fillText(`回合: ${turnsLeft}`, canvasRef.width - 24, 116);


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
// === 操作计数展示（固定在棋盘上方） ===
const countText = `${gaugeCount}/5`;

// 闪烁：触发后 600 ms 内黄白交替
let color = '#FFF';
if (gaugeFlashTime && Date.now() - gaugeFlashTime < 600) {
  color = (Date.now() % 200 < 100) ? '#FFD700' : '#FFF';
} else if (gaugeFlashTime && Date.now() - gaugeFlashTime >= 600) {
  gaugeFlashTime = 0;
}

// 设置文字样式
ctxRef.font = 'bold 16px sans-serif';
ctxRef.textAlign = 'center';
ctxRef.textBaseline = 'middle';

// 描边
ctxRef.lineWidth = 2;
ctxRef.strokeStyle = '#000';
ctxRef.strokeText(countText, countX, countY);

// 填充
ctxRef.fillStyle = color;
ctxRef.fillText(countText, countX, countY);

// ✅ 直接居中固定在棋盘上方 20px
const countX = canvasRef.width / 2;
const countY = __gridStartY - 10;

ctxRef.fillText(countText, countX, countY);




for (let i = 0; i < heroes.length; i++) {
    const x = startXHero + i * (iconSize + spacing);
    const y = topMargin;
  
    const rawRect = { x, y, width: iconSize, height: iconSize };
    const scaled = scaleToAvoidOverlap(rawRect, layoutRects, 0.5); // 允许最小缩放到 50%
    layoutRects.push({ x: scaled.x, y: scaled.y, width: scaled.width, height: scaled.height });
  
    const sx = scaled.x;
    const sy = scaled.y;
    const size = scaled.width;
  
    // — 背板框（空位也画） —
    ctxRef.fillStyle = '#111';
    drawRoundedRect(ctxRef, sx - 2, sy - 2, size + 4, size + 4, 6, true, false);
    ctxRef.strokeStyle = '#888';
    ctxRef.lineWidth = 2;
    drawRoundedRect(ctxRef, sx - 2, sy - 2, size + 4, size + 4, 6, false, true);
  
    // — 蓄力条 —
    const charges = getCharges();
    const percent = charges[i] || 0;
    const barW = size;
    const barH = 6;
    const barX = sx;
    const barY = sy + size + 6;
  
    ctxRef.fillStyle = '#333';
    drawRoundedRect(ctxRef, barX, barY, barW, barH, 3, true, false);
  
    if (percent >= 100) {
      ctxRef.strokeStyle = (Date.now() % 500 < 250) ? '#FF0' : '#F00';
      ctxRef.lineWidth = 4;
      ctxRef.strokeRect(sx - 4, sy - 4, size + 8, size + 8);
    }
  
    ctxRef.fillStyle = '#00BFFF';
    ctxRef.fillRect(barX, barY, barW * (percent / 100), barH);
    ctxRef.strokeStyle = '#888';
    ctxRef.lineWidth = 1;
    drawRoundedRect(ctxRef, barX, barY, barW, barH, 3, false, true);

    // 🌟 追加视觉特效：渐变、光晕、能量脉冲
if (percent > 0) {
    const filledWidth = barW * (percent / 100);
  
    // 1. 渐变条替代蓝色
    const grad = ctxRef.createLinearGradient(barX, 0, barX + filledWidth, 0);
    grad.addColorStop(0, '#66DFFF');
    grad.addColorStop(1, '#0077CC');
  
    ctxRef.fillStyle = grad;
    ctxRef.fillRect(barX, barY, filledWidth, barH);
  
    // 2. 顶部发光高亮（模拟光带）
    const glowGrad = ctxRef.createLinearGradient(barX, barY, barX, barY + barH);
    glowGrad.addColorStop(0, 'rgba(255,255,255,0.3)');
    glowGrad.addColorStop(0.5, 'rgba(255,255,255,0)');
    ctxRef.fillStyle = glowGrad;
    ctxRef.fillRect(barX, barY, filledWidth, barH);
  
    // 3. 动态脉冲光线（横向能量波）
    const pulseX = barX + (Date.now() % 1000) / 1000 * filledWidth;
    const pulseWidth = 8;
    const pulseGrad = ctxRef.createLinearGradient(pulseX, 0, pulseX + pulseWidth, 0);
    pulseGrad.addColorStop(0, 'rgba(255,255,255,0)');
    pulseGrad.addColorStop(0.5, 'rgba(255,255,255,0.4)');
    pulseGrad.addColorStop(1, 'rgba(255,255,255,0)');
    ctxRef.fillStyle = pulseGrad;
    ctxRef.fillRect(barX, barY, filledWidth, barH);
  }
  
  
    // — 已选英雄头像 —
    const hero = heroes[i];
    if (hero) {
      const scaleBase = globalThis.avatarSlotScales?.[i] || 1;  // ← 保留技能动画放大值
      const finalScale = scaleBase * 1.05;                         // ← 添加基础视觉放大
      drawHeroIconFull(ctxRef, hero, sx, sy, size, finalScale);   // ✅ 替换原调用
    
      // 等级文本保持不变
      const lvText = `Lv.${hero.level}`;
      ctxRef.font = 'bold 11px IndieFlower, sans-serif';
      ctxRef.textAlign = 'right';
      ctxRef.textBaseline = 'top';
      ctxRef.fillStyle = '#FFD700';
      ctxRef.shadowColor = '#FFA500';
      ctxRef.shadowBlur = 4;
      ctxRef.strokeStyle = '#000';
      ctxRef.lineWidth = 2;
      ctxRef.strokeText(lvText, sx + size - 4, sy + 4);
      ctxRef.fillText(lvText, sx + size - 4, sy + 4);
      ctxRef.shadowColor = 'transparent';
      ctxRef.shadowBlur = 0;
    }
    
  }
  
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
    ctxRef.fillStyle = '#001';
    ctxRef.fillRect(0, 0, canvasRef.width, canvasRef.height);



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


function checkAndClearMatches () {
  
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
  
          if (count >= 4) {
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
  
          if (count >= 4) {
            const choice = matches[Math.floor(Math.random() * matches.length)];
            superBlockSpots.push({ ...choice, type: gridData[choice.row][choice.col] });
          }
        }
        count = 1;
        if (superBlockSpots.length > 0) {
          console.log('生成超级块:', superBlockSpots);
        }
      }
    }
  }
  

  /* === ② 清除并统计 === */
  // 先排除将要变成超级块的位置（不要清除）

  superBlockSpots.forEach(({ row, col }) => {
    toClear[row][col] = false;
    gridData[row][col] = SuperBlockSystem.randomType(); // 随机 S1/S2/S3
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
if (heroIndex >= 0) {
  const size = 48, spacing = 12;
  const totalWidth = 5 * size + 4 * spacing;
  const canvas = canvasRef;
  const startX = (canvas.width - totalWidth) / 2;
  const topMargin = __gridStartY - 80;
  const endX = startX + heroIndex * (size + spacing) + size / 2;
  const endY = topMargin + size + 8;

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
    Object.keys(colorCounter).forEach(letter => {
      const baseDamage = (BLOCK_DAMAGE_MAP[letter] || 0);
      const count = colorCounter[letter];
      const added = baseDamage * count;
      attackGaugeDamage += added;

      logBattle(`方块[${letter}] ×${count} → 攻击槽 +${added}`);

      // ✅ 触发额外方块特效
      const config = BlockConfig[letter];
      if (config?.onEliminate) {
        config.onEliminate(count);
      }
    });

    damagePopTime = Date.now();

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
    earnedGold = getMonsterGold();         // 获取金币
    addCoins(earnedGold);                  // 加入金币池
    levelJustCompleted = getNextLevel() - 1; // 显示当前完成的是哪一关
    showVictoryPopup = true;               // 显示胜利弹窗
    return;                                // 暂停，等待点击继续
  }
   else {
    // 敌人仍存活：怪物回合已由其他逻辑处理（如 turnsLeft）
  }

  return clearedCount > 0;
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
  const blocks = ['A', 'B', 'C', 'D', 'E', 'F'];
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
  const loop = () => {
    setTimeout(() => {
      dropBlocks();
      drawGame();

      setTimeout(() => {
        fillNewBlocks();
        drawGame();

        setTimeout(() => {
          if (checkAndClearMatches()) {

            loop();
          } else if (!hasPossibleMatches()) {
            setTimeout(() => {
              initGrid();
              drawGame();
            }, 500);
          }
        }, 300);
      }, 300);
    }, 200);
  };

  loop();
}

export function updateGamePage() {
  updateAllEffects();
}

function onTouchend(e) {
  const touch = e.changedTouches?.[0];
  if (!touch) return;

  const x = touch.clientX;
  const y = touch.clientY;
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
        SuperBlockSystem.trigger(row, col, ctxRef, gridData, gridSize);

        gridData[row][col] = null;
        drawGame();
        setTimeout(() => processClearAndDrop(), 300);
        return;
      }
    }
  // ✅ 胜利弹窗点击“下一关”
  if (showVictoryPopup) {
    const btn = globalThis.victoryBtnArea;
    if (btn && x >= btn.x && x <= btn.x + btn.width &&
               y >= btn.y && y <= btn.y + btn.height) {
      showVictoryPopup = false;
  
      currentLevel = getNextLevel();      // ✅ 更新当前关卡编号
      levelJustCompleted = currentLevel;  // ✅ 更新胜利用变量
  
      const monster = loadMonster(currentLevel); // ✅ 使用正确关卡加载怪物
      turnsLeft = monster.skill.cooldown;
  
      initGrid();
      drawGame();
    }
    return;
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
        const dmgToDeal = attackGaugeDamage;
        gaugeFlashTime = Date.now();
        gaugeCount = 0;
      
        const heroes = getSelectedHeroes(); // 获取出战英雄（长度始终是 5）
        const interval = 650;
        const startDelay = 650;
      
        let currentIndex = 0;
        const totalHeroes = heroes.filter(h => h).length; // 只统计有效英雄
        const totalDuration = startDelay + totalHeroes * interval + 350;
      
        function releaseNextHero() {
          if (currentIndex >= heroes.length) return;
          if (heroes[currentIndex]) {
            releaseHeroSkill(currentIndex);
          }
          currentIndex++;
          if (currentIndex < heroes.length) {
            setTimeout(releaseNextHero, interval);
          }
        }
      
        setTimeout(releaseNextHero, startDelay);
      
        // 粗暴写死整段释放 + 缓冲后再结算伤害
        setTimeout(() => {
          startAttackEffect(dmgToDeal);
          drawGame();
        }, totalDuration);
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

  function releaseHeroSkill(slotIndex) {
    const hero = getSelectedHeroes()[slotIndex];
    if (!hero) return;

      // ✅ 添加技能对话特效
  const skillName = HeroData.heroes.find(h => h.id === hero.id)?.skill?.name || '技能';
  createSkillDialog(slotIndex, skillName);
  
    const eff = hero.skill?.effect;
    if (!eff) return;
    const context = {
      dealDamage,
      log: logBattle,
      canvas: canvasRef,   // ✅ 加上这行！
      addGauge: (value) => {
        attackGaugeDamage += Math.round(value);
        damagePopTime = Date.now();
      },
      mulGauge: (factor) => {
        attackGaugeDamage = Math.round(attackGaugeDamage * factor);
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
  const endY   = 120;                           // 怪物中心高度，按你的 UI 调

  createProjectile(startX, startY, endX, endY, 500, () => {
    // 飞弹到达 ⇒ 怪物掉血 & 受击闪
    dealDamage(pendingDamage);
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
        setTimeout(() => {
            earnedGold = getMonsterGold();
            addCoins(earnedGold);
            levelJustCompleted = currentLevel;  // ✅ 不再用 getNextLevel()
            showVictoryPopup = true;
          
            rewardExpToHeroes(50);
          
            // ✅ 保存最高记录
            updatePlayerStats({
                stage: currentLevel,              // ✅ 用 currentLevel 作为最远关卡
              damage: dmg,
              gold: getSessionCoins()
            });
          
            // ✅ 保存继续关卡
            wx.setStorageSync('lastLevel', currentLevel.toString());
          
            drawGame();
          }, 600);
          
    
      return; // ❗很重要：停止继续 loadMonster
    } else {
      turnsLeft--;
    
      if (turnsLeft <= 0) {
        showGameOver = true;
      } else {
        monsterTurn();
      }
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
    
  });
}
function expandGridTo({ size = 7, steps = 3, hero }) {
  globalThis.gridSize = size;

  hero.tempEffects = hero.tempEffects || {};
  hero.tempEffects.gridExpandTurnsLeft = steps;  // ✅ 设置倒计时次数为3

  initGrid();
  drawGame();
}

function rewardExpToHeroes(expAmount) {
  const heroes = getSelectedHeroes();
  heroes.forEach(hero => {
    if (hero) {
      hero.gainExp(expAmount);
      console.log(`${hero.name} 获得经验 +${expAmount}，当前等级 Lv.${hero.level}`);
    }
  });
}



export { monsterHitFlashTime };
export { gridData };
export { dropBlocks, fillNewBlocks, checkAndClearMatches };
