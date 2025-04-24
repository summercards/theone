import { updateAllEffects, drawAllEffects, createExplosion } from './effects_engine.js';
import { getSelectedHeroes } from './data/hero_state.js';
// 👾 Monster system
import { loadMonster, dealDamage, isMonsterDead, monsterTurn, getNextLevel } from './data/monster_state.js';
import { drawMonsterSprite } from './ui/monster_ui.js';


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
  canvasRef.addEventListener('touchend', onTouch);
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
  // 创建背景层并清空画布
  ctxRef.fillStyle = '#001';
  ctxRef.fillRect(0, 0, canvasRef.width, canvasRef.height);

  // ✅ 添加：绘制出战英雄头像
  const selectedHeroes = getSelectedHeroes();
  const iconSize = 40;
  const spacing = 10;
  const totalWidth = selectedHeroes.length * iconSize + (selectedHeroes.length - 1) * spacing;
  const startXHero = (canvasRef.width - totalWidth) / 2;
  const topMargin = 100; // 离顶部留白，避免和UI重叠
  
  selectedHeroes.forEach((hero, index) => {
    if (!hero) return;
  
    const x = startX + index * (iconSize + spacing);
    const y = topMargin;
  
    if (!heroImageCache[hero.id]) {
      const img = wx.createImage();
      img.src = `assets/icons/${hero.icon}`;
      img.onload = () => {
        heroImageCache[hero.id] = img;
        // ❌ 不触发 drawGame，不打断当前状态
      };
      return; // 不绘制头像
    }
    
    // ✅ 头像已缓存，同步绘制
    ctxRef.drawImage(heroImageCache[hero.id], x, y, iconSize, iconSize);
  });
  

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
  // 绘制UI元素：游戏中的提示文本
  ctxRef.fillStyle = 'white';
  ctxRef.font = '36px sans-serif';
  ctxRef.fillText('游戏中：三消开发中', 50, 60); // 绘制游戏中提示文本
 
  //绘制怪物图层
  drawMonsterSprite(ctxRef, canvasRef); 

  // 绘制主页按钮
  ctxRef.fillStyle = '#888';
  ctxRef.fillRect(20, 20, 100, 60); // 绘制按钮背景
  ctxRef.fillStyle = 'white';
  ctxRef.font = '24px sans-serif';
  ctxRef.fillText('主页', 40, 60); // 绘制按钮文本

    // ✅ 头像绘制补进来
    const selectedHeroes = getSelectedHeroes();
    const iconSize = 50;
    const spacing = 10;
    const totalWidth = selectedHeroes.length * iconSize + (selectedHeroes.length - 1) * spacing;
    const startXHero = (canvasRef.width - totalWidth) / 2;
    const topMargin = 350;
  
    selectedHeroes.forEach((hero, index) => {
      if (!hero) return;
  
      const x = startXHero + index * (iconSize + spacing);
      const y = topMargin;
  
      // 稀有度边框颜色
      let borderColor = '#888';
      if (hero.rarity === 'SSR') borderColor = '#FFD700';   // 金
      else if (hero.rarity === 'SR') borderColor = '#C0C0C0'; // 银
      else if (hero.rarity === 'R') borderColor = '#8B4513';  // 铜
  
      // 背景框（可选）
      ctxRef.fillStyle = '#222';
      ctxRef.fillRect(x - 4, y - 4, iconSize + 8, iconSize + 8);
  
      // 绘头像
      if (heroImageCache[hero.id]) {
        ctxRef.drawImage(heroImageCache[hero.id], x, y, iconSize, iconSize);
      }
  
      // 绘边框
      ctxRef.strokeStyle = borderColor;
      ctxRef.lineWidth = 3;
      ctxRef.strokeRect(x - 2, y - 2, iconSize + 4, iconSize + 4);
  
      // 绘制职业标签
      //ctxRef.fillStyle = 'white';
      //ctxRef.font = '12px sans-serif';
      //ctxRef.fillText(hero.role, x, y + iconSize + 14);
  
      // 绘制物理/魔法数值
      //ctxRef.fillStyle = '#AAA';
      //ctxRef.font = '11px sans-serif';
      //const phys = hero.attributes?.physical ?? 0;
      //const magic = hero.attributes?.magical ?? 0;
      //ctxRef.fillText(`物:${phys} 魔:${magic}`, x, y + iconSize + 28);
    });
  
}

function animateSwap(src, dst, callback, rollback = false) {
  const steps = 10;
  let currentStep = 0;
  const blockSize = window.__blockSize;
  const startX = window.__gridStartX;
  const startY = window.__gridStartY;

  const drawWithOffset = (offsetX1, offsetY1, offsetX2, offsetY2) => {
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
    canvasRef.removeEventListener('touchend', onTouch);
    switchPageFn('home');
    return;
  }

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

        gridData[row][col] = null;
        clearedCount++;
        cleared = true;
      }
    }
  }

  
if (clearedCount > 0) {
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
const effectX = startX + col * blockSize + blockSize / 2;
const effectY = startY + k * blockSize + blockSize / 2;
createExplosion(effectX, effectY);

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

