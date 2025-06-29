/* =============================================================
   game.js   —— 入口脚本（已精简云存档逻辑）
   ============================================================= */

   import {
    initCloud,
    queueSave
  } from './js/utils/cloud_save.js';
  
  /* ======= 云存档启动 ======= */
  initCloud();          // ① 初始化（离线时自动降级）
  // ❌ loadAll / migrateLocalToCloudOnce 移到 Loading 页面执行
  
  // ② “劫持”本地写，把以后所有 wx.setStorageSync 同步到云
  const _set = wx.setStorageSync;
  wx.setStorageSync = (k, v) => {
    _set(k, v);         // 本地如常
    queueSave(k, v);    // 追加到待同步队列
  };
  
  
  /* ---------- 页面模块 ---------- */
  import PageLoading    from './js/page_loading.js';
  import PageHome       from './js/page_home.js';
  import PageHeroSelect from './js/page_hero_select.js';
  import PageGame       from './js/page_game.js';
  import PageRanking    from './js/page_ranking.js';
  import PageHeroIntro  from './js/page_hero_intro.js';
  import RoguelikeGame  from './js/roguelike_game.js';
  
  const canvas = wx.createCanvas();
  const ctx    = canvas.getContext('2d');
  
  const pages = {
    loading:    PageLoading,
    home:       PageHome,
    heroSelect: PageHeroSelect,
    roguelike:  RoguelikeGame,
    game:       PageGame,
    heroIntro:  PageHeroIntro,
    ranking:    PageRanking
  };
  
  let currentPageName   = 'home';
  let currentPageModule = pages.home;
  
  function switchPage(name, options, onFinish) {
    currentPageModule.destroy?.();
    currentPageName   = name;
    currentPageModule = pages[name];
    currentPageModule.init?.(ctx, switchPage, canvas, options);
    if (typeof onFinish === 'function') {
      setTimeout(onFinish, 0);
    }
  }
  
  switchPage('loading');          // 先进入 Loading 页面
  wx.showShareMenu({ withShareTicket: true });
  
  /* ---------- 统一触控事件分发 ---------- */
  wx.onTouchStart(e => currentPageModule?.touchstart?.(e));
  wx.onTouchMove (e => currentPageModule?.touchmove ?. (e));
  wx.onTouchEnd  (e => currentPageModule?.touchend  ?. (e));
  
  /* ---------- 主循环 ---------- */
  function loop(timestamp) {
    requestAnimationFrame(loop);
    try {
      currentPageModule.update?.(timestamp);
      currentPageModule.draw  ?. (ctx);
    } catch (err) {
      console.error('[主循环错误]', err);
    }
  }
  loop();
  