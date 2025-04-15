const blocks = ['A', 'B', 'C', 'D', 'E', 'F'];
const gridSize = 5;

export function createGrid() {
  const grid = [];
  for (let i = 0; i < gridSize; i++) {
    grid[i] = [];
    for (let j = 0; j < gridSize; j++) {
      const rand = Math.floor(Math.random() * blocks.length);
      grid[i][j] = blocks[rand];
    }
  }

  return grid;
}

export function hasPossibleMatches(grid) {
  const size = grid.length;
  const isSame = (a, b, c) => a === b && b === c;

  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size; j++) {
      if (
        j + 2 < size &&
        isSame(grid[i][j], grid[i][j + 1], grid[i][j + 2])
      ) return true;

      if (
        i + 2 < size &&
        isSame(grid[i][j], grid[i + 1][j], grid[i + 2][j])
      ) return true;
    }
  }

  return false;
}

export const getGridSize = () => gridSize;