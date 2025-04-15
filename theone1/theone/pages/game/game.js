Page({
  data: {
    grid: [],
    selected: null
  },

  onLoad() {
    this.initGrid();
  },

  initGrid() {
    const types = ['A', 'B', 'C', 'D', 'E', 'F'];
    const grid = [];
    for (let row = 0; row < 5; row++) {
      const line = [];
      for (let col = 0; col < 5; col++) {
        const rand = Math.floor(Math.random() * types.length);
        line.push(types[rand]);
      }
      grid.push(line);
    }
    this.setData({ grid });
  },

  onCellTap(e) {
    const row = e.currentTarget.dataset.row;
    const col = e.currentTarget.dataset.col;
    const selected = this.data.selected;

    if (selected) {
      const [sr, sc] = selected;
      if ((Math.abs(sr - row) === 1 && sc === col) || (Math.abs(sc - col) === 1 && sr === row)) {
        this.swapAndCheck(sr, sc, row, col);
      }
      this.setData({ selected: null });
    } else {
      this.setData({ selected: [row, col] });
    }
  },

  swapAndCheck(r1, c1, r2, c2) {
    const grid = this.data.grid.map(row => row.slice());
    const temp = grid[r1][c1];
    grid[r1][c1] = grid[r2][c2];
    grid[r2][c2] = temp;
    this.setData({ grid }, () => {
      setTimeout(() => this.checkMatches(), 100);
    });
  },

  checkMatches() {
    let grid = this.data.grid;
    const marked = Array.from({ length: 5 }, () => Array(5).fill(false));

    // 检查横向匹配
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 3; col++) {
        const type = grid[row][col];
        if (type && type === grid[row][col + 1] && type === grid[row][col + 2]) {
          marked[row][col] = marked[row][col + 1] = marked[row][col + 2] = true;
        }
      }
    }

    // 检查纵向匹配
    for (let col = 0; col < 5; col++) {
      for (let row = 0; row < 3; row++) {
        const type = grid[row][col];
        if (type && type === grid[row + 1][col] && type === grid[row + 2][col]) {
          marked[row][col] = marked[row + 1][col] = marked[row + 2][col] = true;
        }
      }
    }

    // 如果有标记则清除并下落
    let changed = false;
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 5; col++) {
        if (marked[row][col]) {
          grid[row][col] = '';
          changed = true;
        }
      }
    }

    if (changed) {
      this.setData({ grid }, () => {
        setTimeout(() => this.applyGravity(), 200);
      });
    }
  },

  applyGravity() {
    const types = ['A', 'B', 'C', 'D', 'E', 'F'];
    const grid = this.data.grid.map(row => row.slice());

    for (let col = 0; col < 5; col++) {
      let empty = 0;
      for (let row = 4; row >= 0; row--) {
        if (!grid[row][col]) {
          empty++;
        } else if (empty > 0) {
          grid[row + empty][col] = grid[row][col];
          grid[row][col] = '';
        }
      }
      for (let row = 0; row < 5; row++) {
        if (!grid[row][col]) {
          const rand = Math.floor(Math.random() * types.length);
          grid[row][col] = types[rand];
        }
      }
    }

    this.setData({ grid }, () => {
      setTimeout(() => this.checkMatches(), 200);
    });
  }
});