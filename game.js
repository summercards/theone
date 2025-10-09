/* =============================================================
   game.js   —— 入口脚本（Loading 静态导入，其他全部懒加载）
   ============================================================= */

   import { initCloud, queueSave } from './js/utils/cloud_save.js';

   // 由 Loading 页加载完成后置 true；游戏页可据此早退绘制
   globalThis.ASSETS_READY = false;
   
   /* ======= 云存档启动（读取逻辑放到 Loading 页里） ======= */
   initCloud(); // 初始化（离线时自动降级）
   
   // “劫持”本地写，把以后所有 wx.setStorageSync 同步到云
   const _set = wx.setStorageSync;
   wx.setStorageSync = (k, v) => {
     _set(k, v);       // 本地如常
     queueSave(k, v);  // 追加到待同步队列
   };
   
   /* ---------- 仅 Loading 静态导入，避免其它页面顶层代码过早执行 ---------- */
   import PageLoading from './js/page_loading.js';
   
   // 兼容 default / 非 default 导出
   function loadModule(path) {
     const m = require(path);
     return (m && (m.default || m));
   }
   
   const pageLoaders = {
     loading   : () => PageLoading,
     home      : () => loadModule('./js/page_home.js'),
     heroSelect: () => loadModule('./js/page_hero_select.js'),
     roguelike : () => loadModule('./js/roguelike_game.js'),
     shop      : () => loadModule('./js/page_shop.js'),
     game      : () => loadModule('./js/page_game.js'),
     heroIntro : () => loadModule('./js/page_hero_intro.js'),
     ranking   : () => loadModule('./js/page_ranking.js'),
     backpack  : () => loadModule('./js/page_backpack.js')
   };
   
   const canvas = wx.createCanvas();
   const ctx    = canvas.getContext('2d');
   
   let currentPageName   = null;
   let currentPageModule = null;
   
   function switchPage(name, options, onFinish) {
     try {
       currentPageModule?.destroy?.();
     } catch (e) {
       console.warn('[switchPage] destroy error on', currentPageName, e);
     }
   
     currentPageName = name;
   
     try {
       currentPageModule = pageLoaders[name]();
       if (!currentPageModule) throw new Error('page module not found: ' + name);
   
       // init(ctx, switchPage, canvas, options)
       currentPageModule.init?.(ctx, switchPage, canvas, options);
   
       if (typeof onFinish === 'function') setTimeout(onFinish, 0);
     } catch (err) {
       console.error('[switchPage] failed to load page:', name, err);
       wx.showToast({ title: `页面加载失败: ${name}`, icon: 'none' });
     }
   }
   
   // 初始进入 Loading 页
   switchPage('loading');
   wx.showShareMenu({ withShareTicket: true });
   
   /* ---------- 统一触控事件分发 ---------- */
   wx.onTouchStart(e => currentPageModule?.touchstart?.(e));
   wx.onTouchMove (e => currentPageModule?.touchmove ?. (e));
   wx.onTouchEnd  (e => currentPageModule?.touchend  ?. (e));
   
   /* ---------- 主循环 ---------- */
   function loop(ts) {
     requestAnimationFrame(loop);
     try {
       // 若是游戏页且资源未就绪，先跳过一帧避免 broken image
       if (currentPageName === 'game' && !globalThis.ASSETS_READY) return;
   
       currentPageModule?.update?.(ts);
       // 注意：很多页面导出的 draw(ctx) 签名不同，这里统一传 ctx
       currentPageModule?.draw?.(ctx);
     } catch (err) {
       console.error('[主循环错误]', err);
     }
   }
   loop();
   