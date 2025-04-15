const canvas = wx.createCanvas();
const ctx = canvas.getContext('2d');

const CELL_SIZE = 60;
const GRID_SIZE = 5;
const TYPES = ['A', 'B', 'C', 'D', 'E', 'F'];
let grid = [];
let selected = null;
let highlightTimer = 0;

const canvasWidth = canvas.width;
const canvasHeight = canvas.height;
const gridPixelSize = GRID_SIZE * CELL_SIZE;
const offsetX = (canvasWidth - gridPixelSize) / 2;
const offsetY = (canvasHeight - gridPixelSize) / 2 + 100;

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
}

function drawGrid() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 绘制 Boss 显示区域
  const bossBoxX = offsetX;
  const bossBoxY = offsetY - CELL_SIZE * 3 - 40;
  const bossBoxW = CELL_SIZE * GRID_SIZE;
  const bossBoxH = CELL_SIZE * 1.4;
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  ctx.strokeRect(bossBoxX, bossBoxY, bossBoxW, bossBoxH);

  // 绘制 Boss 血条（占位逻辑）
  const hpBarX = offsetX;
  const hpBarY = offsetY - CELL_SIZE * 1.8 - 40;
  const hpBarW = CELL_SIZE * GRID_SIZE;
  const hpBarH = 10;

  ctx.fillStyle = '#444'; // 血条背景
  ctx.fillRect(hpBarX, hpBarY, hpBarW, hpBarH);

  ctx.fillStyle = '#f00'; // 血条值（80% 血量）
  ctx.fillRect(hpBarX, hpBarY, hpBarW * 0.8, hpBarH);

  // 绘制英雄头像槽位
  for (let i = 0; i < GRID_SIZE; i++) {
    let hx = offsetX + i * CELL_SIZE;
    let hy = offsetY - CELL_SIZE - 10;
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 2;
    ctx.strokeRect(hx, hy, CELL_SIZE - 2, CELL_SIZE - 2);
  }

  
  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      const type = grid[row][col];
      let x = offsetX + col * CELL_SIZE;
      let y = offsetY + row * CELL_SIZE;
      let isSelected = selected && selected[0] === row && selected[1] === col;

      // 动画效果：缩放 + 高亮闪动
      let sizeOffset = isSelected ? 4 * Math.sin(highlightTimer / 10) : 0;
      let color = getColor(type, isSelected);

      ctx.fillStyle = color;
      ctx.fillRect(x + sizeOffset / 2, y + sizeOffset / 2, CELL_SIZE - sizeOffset - 2, CELL_SIZE - sizeOffset - 2);

      ctx.fillStyle = '#000';
      ctx.font = '20px Arial';
      ctx.fillText(type, x + 20, y + 35);
    }
  }
}

function getColor(type, highlight) {
  let base;
  switch (type) {
    case 'A': base = '#f66'; break;
    case 'B': base = '#6f6'; break;
    case 'C': base = '#66f'; break;
    case 'D': base = '#fc6'; break;
    case 'E': base = '#6ff'; break;
    case 'F': base = '#f6f'; break;
    default: base = '#ccc';
  }
  if (highlight) {
    return '#fff'; // 点击时高亮颜色
  }
  return base;
}

function swap(row1, col1, row2, col2) {
  const temp = grid[row1][col1];
  grid[row1][col1] = grid[row2][col2];
  grid[row2][col2] = temp;
}

function checkMatches() {
  const marked = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(false));

  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE - 2; col++) {
      const t = grid[row][col];
      if (t && t === grid[row][col + 1] && t === grid[row][col + 2]) {
        marked[row][col] = marked[row][col + 1] = marked[row][col + 2] = true;
      }
    }
  }

  for (let col = 0; col < GRID_SIZE; col++) {
    for (let row = 0; row < GRID_SIZE - 2; row++) {
      const t = grid[row][col];
      if (t && t === grid[row + 1][col] && t === grid[row + 2][col]) {
        marked[row][col] = marked[row + 1][col] = marked[row + 2][col] = true;
      }
    }
  }

  let changed = false;
  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      if (marked[row][col]) {
        grid[row][col] = '';
        changed = true;
      }
    }
  }

  if (changed) {
    applyGravity();
    setTimeout(() => {
      drawGrid();
      checkMatches();
    }, 200);
  }
}

function applyGravity() {
  for (let col = 0; col < GRID_SIZE; col++) {
    let stack = [];
    for (let row = GRID_SIZE - 1; row >= 0; row--) {
      if (grid[row][col]) stack.push(grid[row][col]);
    }
    for (let row = GRID_SIZE - 1; row >= 0; row--) {
      grid[row][col] = stack[GRID_SIZE - 1 - row] || TYPES[Math.floor(Math.random() * TYPES.length)];
    }
  }
}

canvas.addEventListener('touchstart', (e) => {
  const x = e.touches[0].clientX;
  const y = e.touches[0].clientY;
  const col = Math.floor((x - offsetX) / CELL_SIZE);
  const row = Math.floor((y - offsetY) / CELL_SIZE);
  if (row >= GRID_SIZE || col >= GRID_SIZE || row < 0 || col < 0) return;

  if (selected) {
    const [sr, sc] = selected;
    if ((Math.abs(sr - row) === 1 && sc === col) || (Math.abs(sc - col) === 1 && sr === row)) {
      swap(sr, sc, row, col);
      drawGrid();
      setTimeout(() => {
        checkMatches();
      }, 100);
    }
    selected = null;
  } else {
    selected = [row, col];
  }
});

function loop() {
  highlightTimer++;
  drawGrid();
  requestAnimationFrame(loop);
}

initGrid();
loop();