/* CENTRALIZED EVENT PROXY VERSION */

import PageHome       from './js/page_home.js';
import PageHeroSelect from './js/page_hero_select.js';
import PageGame       from './js/page_game.js';

const canvas = wx.createCanvas();
const ctx     = canvas.getContext('2d');

const pages = {
  home:       PageHome,
  heroSelect: PageHeroSelect,
  game:       PageGame
};

let currentPageName   = 'home';
let currentPageModule = pages.home;

function switchPage(name){
  currentPageModule.destroy?.();
  currentPageName   = name;
  currentPageModule = pages[name];
  currentPageModule.init?.(ctx, switchPage, canvas);
}

// 初始页
switchPage('home');

// 统一事件代理
wx.onTouchStart(e => {
  currentPageModule.touchstart && currentPageModule.touchstart(e);
});

wx.onTouchMove(e => {
  currentPageModule.touchmove && currentPageModule.touchmove(e);
});

wx.onTouchEnd(e => {
  currentPageModule.touchend && currentPageModule.touchend(e);
});

// 主循环
function loop(timestamp){
  requestAnimationFrame(loop);
  currentPageModule.update?.(timestamp);
  currentPageModule.draw?.(ctx);
}
loop();
