import SceneManager from './engine/scene.js';
import drawHeroSelect from './scenes/hero-select.js';
import drawGameScene from './scenes/game-scene.js';

export default function render(ctx) {
  const scene = SceneManager.getScene();
  if (scene === 'HERO_SELECT') drawHeroSelect(ctx);
  else if (scene === 'GAME') drawGameScene(ctx);
}
