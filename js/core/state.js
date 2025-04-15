export const gameState = {
  grid: [],
  selected: null,
  score: 0
};

export function selectCell(row, col) {
  gameState.selected = [row, col];
}

export function clearSelection() {
  gameState.selected = null;
}

export function isSelected() {
  return !!gameState.selected;
}

export function getSelected() {
  return gameState.selected;
}