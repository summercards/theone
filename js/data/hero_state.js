let selectedHeroes = [null, null, null, null, null];

function setSelectedHeroes(heroes) {
  selectedHeroes = heroes;
}

function getSelectedHeroes() {
  return selectedHeroes;
}

module.exports = {
  setSelectedHeroes,
  getSelectedHeroes
};
