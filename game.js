import { initHomePage, updateHomePage } from './js/page_home.js';
import { initHeroSelectPage } from './js/page_hero_select.js';
import { initGamePage, updateGamePage, drawGame } from './js/page_game.js'; // ✅ 同时引入 drawGame

const canvas = wx.createCanvas();
const ctx = canvas.getContext('2d');

let currentPage = 'home';

// ✅ 页面切换函数
function switchPage(page) {
  currentPage = page;

  if (page === 'home') {
    initHomePage(ctx, switchPage, canvas);
  }

  if (page === 'heroSelect') {
    initHeroSelectPage(ctx, switchPage, canvas);
  }

  if (page === 'game') {
    initGamePage(ctx, switchPage, canvas);
    // ✅ 不用单独启动循环，统一由全局 loop 控制
  }
}

// ✅ 初始页面为 home
switchPage('home');

// ✅ 全局主循环，每帧刷新当前页面
function loop() {
  requestAnimationFrame(loop);

  if (currentPage === 'home') updateHomePage();


  if (currentPage === 'game') {
    updateGamePage(); // 更新特效生命周期
    drawGame();       // ✅ 关键：每帧重绘，让特效真正动起来
  }
}
loop();
