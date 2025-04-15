import databus from './databus.js';

export default {
  getScene: () => databus.scene,
  switchTo: (scene) => {
    databus.scene = scene;
  }
};
