// 三消模块优化后保留原有boss血条逻辑
const canvas = wx.createCanvas();
const ctx = canvas.getContext('2d');

const CELL_SIZE = 60;
const GRID_SIZE = 5;
const TYPES = ['A', 'B', 'C', 'D', 'E', 'F'];
let grid = [];
let isBusy = false;
let selected = null;
let highlightTimer = 0;

const canvasWidth = canvas.width;
const canvasHeight = canvas.height;
const gridPixelSize = GRID_SIZE * CELL_SIZE;
const offsetX = (canvasWidth - gridPixelSize) / 2;
const offsetY = (canvasHeight - gridPixelSize) / 2 + 100;

// 初始化棋盘
function initGrid() {
  grid = [];
  for (let i = 0; i < GRID_SIZE; i++) {
    const row = [];
    for (let j = 0; j < GRID_SIZE; j++) {
      const rand = Math.floor(Math.random() * TYPES.length);
      row.push(TYPES[rand]);
    }
    grid.push(row);
  }
  ensureMatchableGrid();
}

// 绘制棋盘及Boss信息
function drawGrid() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Boss 血条区域
  const bossBoxX = offsetX;
  const bossBoxY = offsetY - CELL_SIZE * 3 - 40;
  const bossBoxW = CELL_SIZE * GRID_SIZE;
  const bossBoxH = CELL_SIZE * 1.4;
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  ctx.strokeRect(bossBoxX, bossBoxY, bossBoxW, bossBoxH);

  const hpBarX = offsetX;
  const hpBarY = offsetY - CELL_SIZE * 1.8 - 40;
  const hpBarW = CELL_SIZE * GRID_SIZE;
  const hpBarH = 10;
  ctx.fillStyle = '#444';
  ctx.fillRect(hpBarX, hpBarY, hpBarW, hpBarH);
  ctx.fillStyle = '#f00';
  ctx.fillRect(hpBarX, hpBarY, hpBarW * 0.8, hpBarH); // 示例80%血量

  // 提示框
  for (let i = 0; i < GRID_SIZE; i++) {
    let hx = offsetX + i * CELL_SIZE;
    let hy = offsetY - CELL_SIZE - 10;
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 2;
    ctx.strokeRect(hx, hy, CELL_SIZE - 2, CELL_SIZE - 2);
  }

  // 绘制方块
  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      const type = grid[row][col];
      const x = offsetX + col * CELL_SIZE;
      const y = offsetY + row * CELL_SIZE;
      const isSelected = selected && selected[0] === row && selected[1] === col;
      const sizeOffset = isSelected ? 4 * Math.sin(highlightTimer / 10) : 0;
      const color = getColor(type, isSelected);

      ctx.fillStyle = color;
      ctx.fillRect(x + sizeOffset / 2, y + sizeOffset / 2, CELL_SIZE - sizeOffset - 2, CELL_SIZE - sizeOffset - 2);
      ctx.fillStyle = '#000';
      ctx.font = '20px Arial';
      ctx.fillText(type, x + 20, y + 35);
    }
  }
}

// 获取颜色
function getColor(type, highlight) {
  const baseColors = {
    'A': '#f66', 'B': '#6f6', 'C': '#66f',
    'D': '#fc6', 'E': '#6ff', 'F': '#f6f'
  };
  return highlight ? '#fff' : (baseColors[type] || '#ccc');
}

// 交换两个格子
function swap(row1, col1, row2, col2) {
  const temp = grid[row1][col1];
  grid[row1][col1] = grid[row2][col2];
  grid[row2][col2] = temp;
}

// 检查是否存在三连
function checkMatches() {
  const marked = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(false));
  let matched = false;

  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE - 2; col++) {
      const t = grid[row][col];
      if (t && t === grid[row][col + 1] && t === grid[row][col + 2]) {
        marked[row][col] = marked[row][col + 1] = marked[row][col + 2] = true;
        matched = true;
      }
    }
  }

  for (let col = 0; col < GRID_SIZE; col++) {
    for (let row = 0; row < GRID_SIZE - 2; row++) {
      const t = grid[row][col];
      if (t && t === grid[row + 1][col] && t === grid[row + 2][col]) {
        marked[row][col] = marked[row + 1][col] = marked[row + 2][col] = true;
        matched = true;
      }
    }
  }

  if (matched) {
    isBusy = true;
    setTimeout(() => {
      for (let row = 0; row < GRID_SIZE; row++) {
        for (let col = 0; col < GRID_SIZE; col++) {
          if (marked[row][col]) grid[row][col] = '';
        }
      }
      drawGrid();
      setTimeout(() => {
        applyGravity();
        drawGrid();
        setTimeout(() => {
          if (checkMatches()) return;
          isBusy = false;
        }, 200);
      }, 200);
    }, 300);
  }
  return matched;
}

// 方块下落
function applyGravity() {
  for (let col = 0; col < GRID_SIZE; col++) {
    const stack = [];
    for (let row = GRID_SIZE - 1; row >= 0; row--) {
      if (grid[row][col]) stack.push(grid[row][col]);
    }
    for (let row = GRID_SIZE - 1; row >= 0; row--) {
      grid[row][col] = stack[GRID_SIZE - 1 - row] || TYPES[Math.floor(Math.random() * TYPES.length)];
    }
  }
}

// 监听点击
canvas.addEventListener('touchstart', (e) => {
  if (isBusy) return;
  const x = e.touches[0].clientX;
  const y = e.touches[0].clientY;
  const col = Math.floor((x - offsetX) / CELL_SIZE);
  const row = Math.floor((y - offsetY) / CELL_SIZE);
  if (row >= GRID_SIZE || col >= GRID_SIZE || row < 0 || col < 0) return;

  if (selected) {
    const [sr, sc] = selected;
    if ((Math.abs(sr - row) === 1 && sc === col) || (Math.abs(sc - col) === 1 && sr === row)) {
      isBusy = true;
      swap(sr, sc, row, col);
      drawGrid();
      setTimeout(() => {
        if (!checkMatches()) {
          swap(sr, sc, row, col);
          drawGrid();
          isBusy = false;
        }
      }, 200);
    }
    selected = null;
  } else {
    selected = [row, col];
  }
});

// 动画循环
function loop() {
  highlightTimer++;
  drawGrid();
  requestAnimationFrame(loop);
}

// 初始加载
initGrid();
loop();

// 保证初始棋盘可交换
function ensureMatchableGrid() {
  let attempts = 0;
  while (!canMatch()) {
    initGrid();
    attempts++;
    if (attempts > 10) break;
  }
}

// 检查棋盘是否存在可交换组合
function canMatch() {
  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      const current = grid[row][col];
      if (!current) continue;
      if (col + 1 < GRID_SIZE) {
        [grid[row][col], grid[row][col + 1]] = [grid[row][col + 1], grid[row][col]];
        if (checkPotentialMatch()) return true;
        [grid[row][col + 1], grid[row][col]] = [grid[row][col], grid[row][col + 1]];
      }
      if (row + 1 < GRID_SIZE) {
        [grid[row][col], grid[row + 1][col]] = [grid[row + 1][col], grid[row][col]];
        if (checkPotentialMatch()) return true;
        [grid[row + 1][col], grid[row][col]] = [grid[row][col], grid[row + 1][col]];
      }
    }
  }
  return false;
}

// 是否组成三连（模拟交换后）
function checkPotentialMatch() {
  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE - 2; col++) {
      const t = grid[row][col];
      if (t && t === grid[row][col + 1] && t === grid[row][col + 2]) return true;
    }
  }
  for (let col = 0; col < GRID_SIZE; col++) {
    for (let row = 0; row < GRID_SIZE - 2; row++) {
      const t = grid[row][col];
      if (t && t === grid[row + 1][col] && t === grid[row + 2][col]) return true;
    }
  }
  return false;
}
