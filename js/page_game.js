const { drawRoundedRect } = require('./utils/canvas_utils.js');


let turnsLeft; // ✅ 应加在顶部变量区，否则是隐式全局变量
let showGameOver = false;     // 是否触发失败弹窗

// === 变更：把另外两个特效工具也引进来
import {updateAllEffects,drawAllEffects,createExplosion,
    createProjectile,     // ← 飞弹
     createFloatingText    // ← 飘字
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





const heroImageCache = {}; // 缓存图片
let ctxRef;
let switchPageFn;
let canvasRef;

const gridSize = 5;
let gridData = [];
let selected = null;



export function initGamePage(ctx, switchPage, canvas) {
  ctxRef = ctx;
  switchPageFn = switchPage;
  canvasRef = canvas;

  showGameOver = false;
  gaugeCount = 0;
  attackGaugeDamage = 0;
  attackDisplayDamage = 0;
  selected = null;

  initGrid();
  const m = loadMonster(1);
  turnsLeft = m.skill.cooldown;
  drawGame();
}

function releaseAllReadySkills() {
  const charges = getCharges();
  for (let i = 0; i < 5; i++) {
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
  ctxRef.setTransform(1, 0, 0, 1, 0, 0);
  // 创建背景层并清空画布
  ctxRef.fillStyle = '#001';
  ctxRef.fillRect(0, 0, canvasRef.width, canvasRef.height);



  



  const maxWidth = canvasRef.width * 0.9;
  const maxHeight = canvasRef.height * 0.6;
  const blockSize = Math.floor(Math.min(maxWidth, maxHeight) / gridSize);
  const startX = (canvasRef.width - blockSize * gridSize) / 2;
  const startY = canvasRef.height - blockSize * gridSize - 60;

  window.__blockSize = blockSize;
  window.__gridStartX = startX;
  window.__gridStartY = startY;

  // 绘制方块
  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      const block = gridData[row][col];
      const x = startX + col * blockSize;
      const y = startY + row * blockSize;

      ctxRef.fillStyle = BlockConfig[block]?.color || '#666';
      drawRoundedRect(ctxRef, x, y, blockSize - 4, blockSize - 4, 6, true, false);

      ctxRef.fillStyle = 'white';
      ctxRef.font = `${Math.floor(blockSize / 2.5)}px sans-serif`;
      ctxRef.fillText(block, x + blockSize / 2.5, y + blockSize / 1.5);

      if (selected && selected.row === row && selected.col === col) {
        ctxRef.strokeStyle = '#00FF00';
        ctxRef.lineWidth = 4;
        drawRoundedRect(ctxRef, x, y, blockSize - 4, blockSize - 4, 6, false, true);
      }
    }
  }

// 绘制特效（在方块之上）
  drawAllEffects(ctxRef);

  // 在单独的绘制层绘制UI元素
  drawUI();
}

  //UI层下的图片不会闪烁，后续功能都放进这个层。 
function drawUI() {
  ctxRef.setTransform(1, 0, 0, 1, 0, 0);

 
  //绘制怪物图层
  drawMonsterSprite(ctxRef, canvasRef); 

  // 绘制主页按钮
  ctxRef.fillStyle = '#888';
  drawRoundedRect(ctxRef, 20, 20, 100, 60, 10, true, false); // 圆角半径为 10
  ctxRef.fillStyle = 'white';
  ctxRef.font = '24px sans-serif';
  //ctxRef.fillText('主页', 40, 60); // 绘制按钮文本

/* === 出战栏：固定 5 槽位 + 编号（原来绿色框位置） ================ */
const heroes      = getSelectedHeroes();   // 长度固定 5
const iconSize    = 48;                    // 头像边长，可调
const spacing     = 12;                    // 槽位间隔
const totalWidth  = 5 * iconSize + 4 * spacing;
const startXHero  = (canvasRef.width - totalWidth) / 2;
const topMargin   = 350;                   // 保持原位置

/* === 攻击槽（累计伤害） ===================================== */
const gaugeW = 180, gaugeH = 14;
const gaugeX = (canvasRef.width - gaugeW) / 2;
const gaugeY = topMargin - 39;

/* ==== 累积伤害滚动 & 动画 ================================ */
// 1. 动态数值逼近
if (attackDisplayDamage < attackGaugeDamage) {
  const diff = attackGaugeDamage - attackDisplayDamage;
  attackDisplayDamage += Math.ceil(diff * 0.33);
} else {
  attackDisplayDamage = attackGaugeDamage;
}

// 2. 缩放动画
let fontScale = 1;
const popDur = 400;
if (Date.now() - damagePopTime < popDur) {
  const p = 1 - (Date.now() - damagePopTime) / popDur;
  fontScale = 1 + 0.6 * p;
}

// 3. 样式设置（根据伤害值调整）
const baseFont = attackDisplayDamage > 500 ? 28 : 20;
const fontSize = Math.floor(baseFont * fontScale);

ctxRef.save();
ctxRef.font = `bold ${fontSize}px sans-serif`;
ctxRef.textAlign = 'center';
ctxRef.textBaseline = 'middle';

// 渐变色与发光根据伤害等级调整
let gradient, shadowColor;
if (attackDisplayDamage > 500) {
  gradient = ctxRef.createLinearGradient(0, 0, 0, fontSize);
  gradient.addColorStop(0, '#FFA500'); // 橙
  gradient.addColorStop(1, '#FF4500'); // 深橙红
  shadowColor = '#FF6600';
} else {
  gradient = ctxRef.createLinearGradient(0, 0, 0, fontSize);
  gradient.addColorStop(0, '#FF4444');
  gradient.addColorStop(1, '#CC0000');
  shadowColor = '#FF3333';
}

ctxRef.fillStyle = gradient;
ctxRef.shadowColor = shadowColor;
ctxRef.shadowBlur = attackDisplayDamage > 500 ? 12 : 6;

// 描边（黑边加粗）
ctxRef.lineWidth = 4;
ctxRef.strokeStyle = '#000';

// 平移 + 缩放
ctxRef.translate(gaugeX + gaugeW / 2, gaugeY + gaugeH / 2);
ctxRef.scale(fontScale, fontScale);

// 渲染描边 + 填充
ctxRef.strokeText(`${attackDisplayDamage}`, 0, 0);
ctxRef.fillText(`${attackDisplayDamage}`, 0, 0);

ctxRef.restore();



  /* === 本局金币 HUD ============================== */
  ctxRef.resetTransform?.();      // 小程序 2.32 起支持；低版本可再 setTransform(1…)
  ctxRef.fillStyle   = '#FFD700';
  ctxRef.font        = '18px IndieFlower, sans-serif';
  ctxRef.textAlign   = 'left';
  ctxRef.textBaseline= 'top';
  ctxRef.fillText(`金币: ${getSessionCoins()}`, 26, 116);
ctxRef.restore();
/* ======================================================== */

// === 回合 HUD ===
ctxRef.fillStyle = '#FFA';
ctxRef.font = '18px sans-serif';
ctxRef.textAlign = 'right';
ctxRef.fillText(`回合: ${turnsLeft}`, canvasRef.width - 24, 116);

/* --- 操作计数展示 --- */
const countText = `${gaugeCount}/5`;
// 文字位置：伤害数字下方 18px，可自行调整
const countY = gaugeY + gaugeH + 18;

// 闪烁：触发后 600 ms 内黄白交替
let color = '#FFF';
if (gaugeFlashTime && Date.now() - gaugeFlashTime < 600) {
  color = (Date.now() % 200 < 100) ? '#FFD700' : '#FFF';
} else if (gaugeFlashTime && Date.now() - gaugeFlashTime >= 600) {
  gaugeFlashTime = 0;            // 结束闪烁
}

ctxRef.fillStyle   = color;
ctxRef.font        = '14px sans-serif';
ctxRef.textAlign   = 'center';
ctxRef.textBaseline= 'middle';
ctxRef.fillText(countText, gaugeX + gaugeW / 2, countY);


for (let i = 0; i < 5; i++) {
  const x = startXHero + i * (iconSize + spacing);
  const y = topMargin;

  // — 背板框（空位也画） —
  ctxRef.fillStyle = '#111';
  drawRoundedRect(ctxRef, x - 2, y - 2, iconSize + 4, iconSize + 4, 6, true, false);
  ctxRef.strokeStyle = '#888';
  ctxRef.lineWidth = 2;
  drawRoundedRect(ctxRef, x - 2, y - 2, iconSize + 4, iconSize + 4, 6, false, true);
  



    /* — 蓄力条 — */
    const charges = getCharges();          // [0-100]
    const percent = charges[i] || 0;       // 当前槽位蓄力
    const barW = iconSize;                 // 同头像宽
    const barH = 6;                        // 条高度
    const barX = x;                        // 与头像左对齐
    const barY = y + iconSize + 6;        // 位于编号下方少许
  
    // 背景框
    ctxRef.fillStyle = '#333';
    drawRoundedRect(ctxRef, barX, barY, barW, barH, 3, true, false);

   // 若蓄力满，画闪烁边框
if (percent >= 100) {
  ctxRef.strokeStyle = (Date.now() % 500 < 250) ? '#FF0' : '#F00'; // 闪黄红
  ctxRef.lineWidth = 4;
  ctxRef.strokeRect(x - 4, y - 4, iconSize + 8, iconSize + 8);
}

// === 蓄力满自动释放技能（单独一层） ===
for (let idx = 0; idx < 5; idx++) {
  if (getCharges()[idx] >= 100) {
    releaseHeroSkill(idx);
  }
}

  
    // 填充进度
    ctxRef.fillStyle = '#0F0';             // 绿色，可换
    ctxRef.fillRect(barX, barY, barW * (percent / 100), barH);
  
    // 进度边框
    ctxRef.strokeStyle = '#888';
    ctxRef.lineWidth = 1;
    drawRoundedRect(ctxRef, barX, barY, barW, barH, 3, false, true);
  

  // — 已选英雄头像 —
  const hero = heroes[i];
  if (hero) {
    if (heroImageCache[hero.id]) {
      ctxRef.drawImage(heroImageCache[hero.id], x, y, iconSize, iconSize);
    } else {
      const img = wx.createImage();
      img.src   = `assets/icons/${hero.icon}`;
      img.onload = () => { heroImageCache[hero.id] = img; };
    }
  }

}
/* =============================================================== */

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
  
}

function animateSwap(src, dst, callback, rollback = false) {
  const steps = 10;
  let currentStep = 0;
  const blockSize = window.__blockSize;
  const startX = window.__gridStartX;
  const startY = window.__gridStartY;

  const drawWithOffset = (offsetX1, offsetY1, offsetX2, offsetY2) => {
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

        ctxRef.fillStyle = BlockConfig[block]?.color || '#666';
        drawRoundedRect(ctxRef, x, y, blockSize - 4, blockSize - 4, 6, true, false);
        ctxRef.fillStyle = 'white';
        ctxRef.font = `${Math.floor(blockSize / 2.5)}px sans-serif`;
        ctxRef.fillText(block, x + blockSize / 2.5, y + blockSize / 1.5);
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
  const touch = e.changedTouches[0];
  const xTouch = touch.clientX;
  const yTouch = touch.clientY;

  if (showGameOver) {
    const boxX = (canvasRef.width - 260) / 2;
    const boxY = (canvasRef.height - 160) / 2;
  
  
    const btnX = boxX + 60;
    const btnY = boxY + 100;
    const btnW = 140;
    const btnH = 40;
  
    if (
      xTouch >= btnX && xTouch <= btnX + btnW &&
      yTouch >= btnY && yTouch <= btnY + btnH
    ) {
      switchPageFn('home'); // ✅ 返回主页
    }
  
    return; // 🚫 拦截所有后续点击行为
  }
  
  if (xTouch >= 20 && xTouch <= 120 && yTouch >= 20 && yTouch <= 80) {
    switchPageFn('home');
    return;
  }

  /* === 点击头像 → 释放必杀 =============================== */
{
  const iconSize = 48;
  const spacing  = 12;
  const totalWidth = 5 * iconSize + 4 * spacing;
  const startXHero = (canvasRef.width - totalWidth) / 2;
  const topMargin  = 350;

  const heroes = getSelectedHeroes();
  for (let i = 0; i < 5; i++) {
    const xIcon = startXHero + i * (iconSize + spacing);
    const yIcon = topMargin;

    if (
      xTouch >= xIcon && xTouch <= xIcon + iconSize &&
      yTouch >= yIcon && yTouch <= yIcon + iconSize
    ) {
      if (getCharges()[i] >= 100) {
        releaseHeroSkill(i);  // 调用我们在步骤 2 新增的函数
        drawGame();           // 立即刷新
      }
      return; // 点中了头像，无论是否释放技能，都不再处理网格点击
    }
  }
}
/* ===================================================== */


  const blockSize = window.__blockSize;
  const startX = window.__gridStartX;
  const startY = window.__gridStartY;

  const col = Math.floor((xTouch - startX) / blockSize);
  const row = Math.floor((yTouch - startY) / blockSize);

  if (row >= 0 && row < gridSize && col >= 0 && col < gridSize) {
    if (!selected) {
      selected = { row, col };
      drawGame();
    } else {
      const dx = Math.abs(selected.col - col);
      const dy = Math.abs(selected.row - row);
      const isAdjacent = (dx + dy === 1);

      if (isAdjacent) {
        const src = { ...selected };
        const dst = { row, col };

        const temp = gridData[dst.row][dst.col];
        gridData[dst.row][dst.col] = gridData[src.row][src.col];
        gridData[src.row][src.col] = temp;

        animateSwap(src, dst, () => {
          if (checkAndClearMatches()) {
            selected = null;

                // === 玩家本次有效消除计数 ===
              gaugeCount++;
              if (gaugeCount >= 5) {
                startAttackEffect(attackGaugeDamage);
                gaugeCount = 0;
                gaugeFlashTime = Date.now();
              

              }              

           
            processClearAndDrop();
          } else {
            const tempBack = gridData[dst.row][dst.col];
            gridData[dst.row][dst.col] = gridData[src.row][src.col];
            gridData[src.row][src.col] = tempBack;

            animateSwap(src, dst, () => {
              selected = null;
              drawGame();
            }, true);
          }
        });
      } else {
        selected = { row, col };
        drawGame();
      }
    }
  }
}

// 其他函数保持不变


function checkAndClearMatches () {
  let clearedCount   = 0;
  const colorCounter = {};                      // {A:3, B:1 …}
  const toClear      = Array.from({ length: gridSize }, () => Array(gridSize).fill(false));

  /* === ① 找 3 连 === */
  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize - 2; col++) {
      const v = gridData[row][col];
      if (v && v === gridData[row][col + 1] && v === gridData[row][col + 2]) {
        toClear[row][col] = toClear[row][col + 1] = toClear[row][col + 2] = true;
      }
    }
  }
  for (let col = 0; col < gridSize; col++) {
    for (let row = 0; row < gridSize - 2; row++) {
      const v = gridData[row][col];
      if (v && v === gridData[row + 1][col] && v === gridData[row + 2][col]) {
        toClear[row][col] = toClear[row + 1][col] = toClear[row + 2][col] = true;
      }
    }
  }

  /* === ② 清除并统计 === */
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      if (!toClear[r][c]) continue;

      createExplosion(
        window.__gridStartX + c * window.__blockSize + window.__blockSize / 2,
        window.__gridStartY + r * window.__blockSize + window.__blockSize / 2
      );

      const letter            = gridData[r][c];
      colorCounter[letter]  = (colorCounter[letter] || 0) + 1;
      gridData[r][c]         = null;
      clearedCount++;
    }
  }

  /* === ③ 如果有消除，就累伤害 / 加蓄力 === */
  if (clearedCount > 0) {
    // a) 累伤害
    Object.keys(colorCounter).forEach(letter => {
      attackGaugeDamage += colorCounter[letter] * (BLOCK_DAMAGE_MAP[letter] || 0);
    });
    damagePopTime = Date.now();

    // b) 给英雄充能
    const chargesNow = getCharges();
    // === 技能释放应该在伤害前处理 ===
releaseAllReadySkills();
    const heroes     = getSelectedHeroes();

    heroes.forEach((hero, i) => {
      if (!hero) return;
      const gained = Object.keys(colorCounter)
        .filter(l => BLOCK_ROLE_MAP[l] === hero.role)
        .reduce((sum, l) => sum + colorCounter[l], 0);
      if (gained) setCharge(i, chargesNow[i] + gained * 20);      // 20% × 方块数
    });
  }

// ✅ 在这里释放所有准备好的技能（蓄力满）
releaseAllReadySkills();

  /* === ④ 怪物回合 / 掉落新怪 === */
  if (isMonsterDead()) {
    addCoins(getMonsterGold());   // 改为读取怪物自身掉落
    const nextLevel = getNextLevel();   // ✅ 定义 nextLevel
    const m = loadMonster(nextLevel);   // ✅ 正确传入
    turnsLeft = m.skill.cooldown;
  } else {

  }

  return clearedCount > 0;
}




function dropBlocks() {
  for (let col = 0; col < gridSize; col++) {
    for (let row = gridSize - 1; row >= 0; row--) {
      if (gridData[row][col] === null) {
        for (let k = row - 1; k >= 0; k--) {
          if (gridData[k][col] !== null) {
            gridData[row][col] = gridData[k][col];
            const blockSize = window.__blockSize;
const startX = window.__gridStartX;
const startY = window.__gridStartY;


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
      if (gridData[row][col] === null) {
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

export function onTouchend(e){
  onTouch(e);
}



function destroyGamePage() {
    commitSessionCoins();
  }
  
  export default {
    init: initGamePage,
    update: updateGamePage,
    draw: drawGame,
    onTouchend,
    destroy: destroyGamePage
  };

function releaseHeroSkill(slotIndex) {
  const hero = getSelectedHeroes()[slotIndex];
  if (!hero) return;

  const eff = hero.skill?.effect;
  if (!eff) return;

  switch (eff.type) {
    /* ----------------- ① 通用伤害 ----------------- */
    case 'physicalDamage':
    case 'magicalDamage':
      dealDamage(eff.amount);
      break;

        /* ---------- 新增：翻倍伤害槽 ---------- */
  case 'mulGauge':
    attackGaugeDamage = Math.round(attackGaugeDamage * (eff.factor ?? 1));
    damagePopTime     = Date.now();   // 触发数字弹跳
    break;

    /* --------------- ② 新增 addGauge -------------- */
    case 'addGauge': {
      let add = 0;
      if ('value' in eff)          add = eff.value;                       // 固定值
      else if (eff.source === 'physical')
        add = hero.attributes.physical * (eff.scale ?? 1);
      else if (eff.source === 'magical')
        add = hero.attributes.magical * (eff.scale ?? 1);

      attackGaugeDamage += Math.round(add);
      damagePopTime      = Date.now();    // 让数字弹跳
      break;
    }

    /* ---------------- ③ 预留其它 ------------------ */
    default:
      console.warn('未知技能类型', eff.type);
  }

  /* 收尾：清蓄力 & 特效 */
  setCharge(slotIndex, 0);
  createExplosion(canvasRef.width / 2, canvasRef.height / 2);
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
  const startY = 290;                            
  const endX   = canvasRef.width / 2;
  const endY   = 120;                           // 怪物中心高度，按你的 UI 调

  createProjectile(startX, startY, endX, endY, 500, () => {
    // 飞弹到达 ⇒ 怪物掉血 & 受击闪
    dealDamage(pendingDamage);
    createExplosion(endX, endY);                // 爆点可复用现有效果
    monsterHitFlashTime = Date.now();

    // 飘字
    createFloatingText(`-${pendingDamage}`, endX, endY - 40);

    pendingDamage = 0;

    if (isMonsterDead()) {
      addCoins(getMonsterGold());
      const nextLevel = getNextLevel();
      const m = loadMonster(nextLevel);
      turnsLeft = m.skill.cooldown;
    } else {
      turnsLeft--; // 🟡 仅当怪物未死时扣回合

      if (turnsLeft <= 0) {
        showGameOver = true;
      } else {
        monsterTurn(); // 回合怪物出手
      }
    }

  });
}

export { monsterHitFlashTime };

