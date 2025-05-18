/* CENTRALIZED EVENT PROXY VERSION */
import PageLoading    from './js/page_loading.js'; 
import PageHome       from './js/page_home.js';
import PageHeroSelect from './js/page_hero_select.js';
import PageGame       from './js/page_game.js';
import PageRanking    from './js/page_ranking.js';  // ✅ 正确导入模块，保持不动！

const canvas = wx.createCanvas();
const ctx    = canvas.getContext('2d');

const pages = {
  loading:    PageLoading,
  home:       PageHome,
  heroSelect: PageHeroSelect,
  game:       PageGame,
  ranking:    PageRanking   // ✅ 这里用的就是正确的模块对象
};

let currentPageName   = 'home';
let currentPageModule = pages.home;

function switchPage(name, options, onFinish) {
    currentPageModule.destroy?.();
    currentPageName = name;
    currentPageModule = pages[name];
    currentPageModule.init?.(ctx, switchPage, canvas, options);
    if (typeof onFinish === 'function') {
      setTimeout(onFinish, 0);
    }
  }
  

switchPage('loading');

wx.showShareMenu({ withShareTicket: true });

// ✅ 统一触控事件分发
wx.onTouchStart(e => {
  currentPageModule?.touchstart?.(e);
});
wx.onTouchMove(e => {
  currentPageModule?.touchmove?.(e);
});
wx.onTouchEnd(e => {
  currentPageModule?.touchend?.(e);
});

// 主循环
function loop(timestamp) {
  requestAnimationFrame(loop);
  try {
    currentPageModule.update?.(timestamp);
    currentPageModule.draw?.(ctx);
  } catch (err) {
    console.error('[主循环错误]', err);
  }
}
loop();
