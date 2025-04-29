import { updateAllEffects, drawAllEffects, createExplosion } from './effects_engine.js';
import { getSelectedHeroes } from './data/hero_state.js';
import { setCharge, getCharges } from './data/hero_charge_state.js';
// 👾 Monster system
import { loadMonster, dealDamage, isMonsterDead, monsterTurn, getNextLevel } from './data/monster_state.js';
import { drawMonsterSprite } from './ui/monster_ui.js';
import HeroData from './data/hero_data.js';

// 字母块 → 英雄职业 的映射
const BLOCK_ROLE_MAP = {
  A: '战士',   // 红
  B: '法师',   // 绿
  C: '游侠',   // 蓝
  D: '坦克',   // 黄
  E: '刺客',   // 粉
  F: '牧师'    // 青
};


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

  initGrid();
  
  // ===== Monster System =====
  loadMonster(1);
drawGame();
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



  

  const blockColors = {
    A: '#FF4C4C', B: '#4CFF4C', C: '#4C4CFF',
    D: '#FFD700', E: '#FF69B4', F: '#00FFFF'
  };

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

      ctxRef.fillStyle = blockColors[block] || '#666';
      ctxRef.fillRect(x, y, blockSize - 4, blockSize - 4);

      ctxRef.fillStyle = 'white';
      ctxRef.font = `${Math.floor(blockSize / 2.5)}px sans-serif`;
      ctxRef.fillText(block, x + blockSize / 2.5, y + blockSize / 1.5);

      if (selected && selected.row === row && selected.col === col) {
        ctxRef.strokeStyle = '#00FF00';
        ctxRef.lineWidth = 4;
        ctxRef.strokeRect(x, y, blockSize - 4, blockSize - 4);
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
  // 绘制UI元素：游戏中的提示文本
  //ctxRef.fillStyle = 'white';
  //ctxRef.font = '36px sans-serif';
  //ctxRef.fillText('游戏中：三消开发中', 50, 60); // 绘制游戏中提示文本
 
  //绘制怪物图层
  drawMonsterSprite(ctxRef, canvasRef); 

  // 绘制主页按钮
  ctxRef.fillStyle = '#888';
  ctxRef.fillRect(20, 20, 100, 60); // 绘制按钮背景
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

for (let i = 0; i < 5; i++) {
  const x = startXHero + i * (iconSize + spacing);
  const y = topMargin;

  // — 背板框（空位也画） —
  ctxRef.fillStyle = '#111';
  ctxRef.fillRect(x - 2, y - 2, iconSize + 4, iconSize + 4);
  ctxRef.strokeStyle = '#888';
  ctxRef.lineWidth   = 2;
  ctxRef.strokeRect(x - 2, y - 2, iconSize + 4, iconSize + 4);



    /* — 蓄力条 — */
    const charges = getCharges();          // [0-100]
    const percent = charges[i] || 0;       // 当前槽位蓄力
    const barW = iconSize;                 // 同头像宽
    const barH = 6;                        // 条高度
    const barX = x;                        // 与头像左对齐
    const barY = y + iconSize + 16;        // 位于编号下方少许
  
    // 背景框
    ctxRef.fillStyle = '#333';
    ctxRef.fillRect(barX, barY, barW, barH);

   // 若蓄力满，画闪烁边框
if (percent >= 100) {
  ctxRef.strokeStyle = (Date.now() % 500 < 250) ? '#FF0' : '#F00'; // 闪黄红
  ctxRef.lineWidth = 4;
  ctxRef.strokeRect(x - 4, y - 4, iconSize + 8, iconSize + 8);
}

  
    // 填充进度
    ctxRef.fillStyle = '#0F0';             // 绿色，可换
    ctxRef.fillRect(barX, barY, barW * (percent / 100), barH);
  
    // 进度边框
    ctxRef.strokeStyle = '#888';
    ctxRef.lineWidth = 1;
    ctxRef.strokeRect(barX, barY, barW, barH);
  

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

  // — 槽位编号 —
  ctxRef.fillStyle   = '#FFF';
  ctxRef.font        = '12px sans-serif';
  ctxRef.textAlign   = 'center';
  ctxRef.textBaseline= 'top';
  ctxRef.fillText(i + 1, x + iconSize / 2, y + iconSize + 2);
}
/* =============================================================== */

  
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

    const blockColors = {
      A: '#FF4C4C', B: '#4CFF4C', C: '#4C4CFF',
      D: '#FFD700', E: '#FF69B4', F: '#00FFFF'
    };

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

        ctxRef.fillStyle = blockColors[block] || '#666';
        ctxRef.fillRect(x, y, blockSize - 4, blockSize - 4);
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


function checkAndClearMatches() {
  let clearedCount = 0;
  const colorCounter = {};   // {A:3, B:1 …}
  const toClear = Array.from({ length: gridSize }, () => Array(gridSize).fill(false));

  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize - 2; col++) {
      const val = gridData[row][col];
      if (val && val === gridData[row][col + 1] && val === gridData[row][col + 2]) {
        toClear[row][col] = toClear[row][col + 1] = toClear[row][col + 2] = true;
      }
    }
  }

  for (let col = 0; col < gridSize; col++) {
    for (let row = 0; row < gridSize - 2; row++) {
      const val = gridData[row][col];
      if (val && val === gridData[row + 1][col] && val === gridData[row + 2][col]) {
        toClear[row][col] = toClear[row + 1][col] = toClear[row + 2][col] = true;
      }
    }
  }

  let cleared = false;
  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      if (toClear[row][col]) {
        const blockSize = window.__blockSize;
        const startX = window.__gridStartX;
        const startY = window.__gridStartY;
        const effectX = startX + col * blockSize + blockSize / 2;
        const effectY = startY + row * blockSize + blockSize / 2;
        createExplosion(effectX, effectY);

        const letter = gridData[row][col];                       // 记录颜色
        colorCounter[letter] = (colorCounter[letter] || 0) + 1;  // 累加
        
        gridData[row][col] = null;                               // 真正清除
        clearedCount++;
        
        cleared = true;
      }
    }
  }

  
if (clearedCount > 0) {
  // === 新增：给所有已上阵英雄增加蓄力 ===
  const chargesNow = getCharges();          // 当前蓄力
  const heroes = getSelectedHeroes();       // 5 槽位
  
  for (let i = 0; i < 5; i++) {
    const hero = heroes[i];
    if (!hero) continue;
  
    // 找出映射到该职业的所有颜色字母
    const gainedBlocks = Object.keys(colorCounter)
      .filter(letter => BLOCK_ROLE_MAP[letter] === hero.role)
      .reduce((sum, letter) => sum + colorCounter[letter], 0);
  
    if (gainedBlocks > 0) {
      // 每消一块奖励 20%（系数可自己调）
      setCharge(i, chargesNow[i] + gainedBlocks * 20);
    }

    // === 蓄力满自动释放技能 ===
  for (let i = 0; i < 5; i++) {
  if (getCharges()[i] >= 100) {
    releaseHeroSkill(i);
  }
}

  }
  
  
  const damage = clearedCount * 20;
  dealDamage(damage);
  
  if (isMonsterDead()) {
    loadMonster(getNextLevel());
  } else {
    const skill = monsterTurn();
    // TODO: handle skill damage / effects
  }
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

export default {
  init: initGamePage,
  update: updateGamePage,
  draw: drawGame,
  onTouchend
};

function releaseHeroSkill(slotIndex) {
  const hero = getSelectedHeroes()[slotIndex];
  if (!hero) return;

  const { effect } = hero.skill;
  if (!effect) return;

  switch (effect.type) {
    case 'physicalDamage':
    case 'magicalDamage':
      dealDamage(effect.amount);
      break;
    // 若以后要支持 buff/heal，可继续扩展
    default:
      console.warn('未知技能类型', effect.type);
  }

  // 清零蓄力
  setCharge(slotIndex, 0);

  // TODO: 可在此触发动画或特效
  createExplosion(canvasRef.width / 2, canvasRef.height / 2); // 简单爆炸示例
}
