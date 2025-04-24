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
['touchstart','touchmove','touchend'].forEach(type=>{
  canvas.addEventListener(type,e=>{
    const fn = currentPageModule['on'+type[0].toUpperCase()+type.slice(1)];
    if (typeof fn === 'function'){
      const bubble = fn(e) === false;
      if(!bubble){
        e.preventDefault();
        e.stopPropagation();
      }
    }
  });
});

// 主循环
function loop(timestamp){
  requestAnimationFrame(loop);
  currentPageModule.update?.(timestamp);
  currentPageModule.draw?.(ctx);
}
loop();
