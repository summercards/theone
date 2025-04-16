// ✅ js/data/hero_data.js
const HeroData = {
  heroes: [
    { id: "hero001", name: "剑士", icon: "swordsman.png" },
    { id: "hero002", name: "弓箭手", icon: "archer.png" },
    { id: "hero003", name: "法师", icon: "mage.png" },
    { id: "hero004", name: "骑士", icon: "knight.png" },
    { id: "hero005", name: "刺客", icon: "assassin.png" },
  ],

  getHeroById(id) {
    return this.heroes.find(h => h.id === id);
  }
};

module.exports = HeroData;
