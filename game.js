/* CENTRALIZED EVENT PROXY VERSION */
import PageLoading    from './js/page_loading.js'; 
import PageHome       from './js/page_home.js';
import PageHeroSelect from './js/page_hero_select.js';
import PageGame       from './js/page_game.js';

const canvas = wx.createCanvas();
const ctx     = canvas.getContext('2d');

const pages = {
  loading:    PageLoading,      // 注册加载页面
  home:       PageHome,
  heroSelect: PageHeroSelect,
  game:       PageGame
};

let currentPageName   = 'home';
let currentPageModule = pages.home;

function switchPage(name, onFinish) {
  currentPageModule.destroy?.();
  currentPageName   = name;
  currentPageModule = pages[name];
  currentPageModule.init?.(ctx, switchPage, canvas);
  if (typeof onFinish === 'function') {
    setTimeout(onFinish, 0); // 👈 确保切换后再执行回调
  }
}


// 初始页
switchPage('loading'); // ⬅️ 启动先进入 loading 页面

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

  // ✅ 判断是否存在当前页面并具备 update 和 draw 方法
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
