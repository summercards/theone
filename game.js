/* CENTRALIZED EVENT PROXY VERSION */
import PageLoading    from './js/page_loading.js'; 
import PageHome       from './js/page_home.js';
import PageHeroSelect from './js/page_hero_select.js';
import PageGame       from './js/page_game.js';
import { initRankingPage } from './js/page_ranking'; // 新增

const canvas = wx.createCanvas();
const ctx     = canvas.getContext('2d');

// 排行榜页面封装为模块形式，统一接口
const PageRanking = {
  init: initRankingPage,
  update: () => {},
  draw: () => {},
  touchend: () => {}
};

const pages = {
  loading:    PageLoading,
  home:       PageHome,
  heroSelect: PageHeroSelect,
  game:       PageGame,
  ranking:    PageRanking       // ✅ 注册排行榜页面
};

let currentPageName   = 'home';
let currentPageModule = pages.home;

function switchPage(name, onFinish) {
  currentPageModule.destroy?.();
  currentPageName   = name;
  currentPageModule = pages[name];
  currentPageModule.init?.(ctx, switchPage, canvas);
  if (typeof onFinish === 'function') {
    setTimeout(onFinish, 0);
  }
}

// 初始页
switchPage('loading');

wx.showShareMenu({
  withShareTicket: true
});
// 统一事件代理
wx.onTouchStart(e => {
  if (typeof currentPageModule?.touchstart === 'function') {
    currentPageModule.touchstart(e);
  }
});

wx.onTouchMove(e => {
  if (typeof currentPageModule?.touchmove === 'function') {
    currentPageModule.touchmove(e);
  }
});

wx.onTouchEnd(e => {
  if (typeof currentPageModule?.touchend === 'function') {
    currentPageModule.touchend(e);
  }
});

// 主循环
function loop(timestamp) {
  requestAnimationFrame(loop);

  if (currentPageModule?.update && currentPageModule?.draw) {
    try {
      currentPageModule.update(timestamp);
      currentPageModule.draw(ctx);
    } catch (err) {
      console.error('[主循环错误]', err);
    }
  }
}
loop();
