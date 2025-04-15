export function isAdjacent([r1, c1], [r2, c2]) {
  return (Math.abs(r1 - r2) + Math.abs(c1 - c2)) === 1;
}

export function swap(grid, [r1, c1], [r2, c2]) {
  const temp = grid[r1][c1];
  grid[r1][c1] = grid[r2][c2];
  grid[r2][c2] = temp;
}