/* =============================================================
   js/page_loading.js   —— 启动画面：资源 & 云存档并行加载
   ============================================================= */

   import { loadAll, migrateLocalToCloudOnce } from './utils/cloud_save.js';
   const HeroData = require('./data/hero_data.js');
   
   // —— 旧稀有度到新稀有度的迁移（保持你原逻辑）
   function migrateRarityScheme() {
     try {
       const prog = wx.getStorageSync('heroProgress') || {};
       let changed = false;
       const mapOldToNew = { R:'white', SR:'blue', SSR:'purple', UR:'gold' };
       for (const k in prog) {
         const r = prog[k]?.rarity;
         if (!r) continue;
         if (mapOldToNew[r]) {
           prog[k].rarity = mapOldToNew[r];
           changed = true;
         }
       }
       if (changed) wx.setStorageSync('heroProgress', prog);
     } catch (e) { console.warn('[migrate] rarity scheme failed', e); }
   }
   
   let ctxRef, canvasRef, switchPageFn;
   let progress = 0;        // 逐项预加载进度 0~100
   let loadedCount = 0;
   let tipText = '';
   
   let subpkgProgress = 0;  // 分包下载 0~100
   
   const tips = [
     '超级方块直接点击施放！',
     '部分英雄的技能可以清除特殊障碍！',
     '尝试不同的英雄配对吧',
     '不同英雄搭配，策略翻倍！',
     '多留意每步操作，节省步数才是王道！',
     '连锁越多，伤害越高！'
   ];
   
   /* ---------- 预加载清单（保持你的原始清单） ---------- */
   const preloadList = HeroData.heroes.map(hero => ({
     key : hero.icon.toLowerCase(),
     path: `assets/icons/${hero.icon}`
   }));
   
   ['A','B','C','D','E','F'].forEach(letter => {
     preloadList.push({ key: `block_${letter}`, path: `assets/blocks/${letter}.png` });
   });
   
   ['S1','S2','S3','S4','S5','S6'].forEach(type => {
     preloadList.push({ key: `super_${type}`, path: `assets/superblocks/${type.toLowerCase()}.png` });
   });
   
   // 📦 superblocks 4-6 做宝箱
   ['s4','s5','s6'].forEach((fname, idx) => {
     preloadList.push({ key: `loot_chest_${idx}`, path: `assets/superblocks/${fname}.png` });
   });
   
   // 其他 UI / 场景
   preloadList.push({ key: 'lock.png',   path: 'assets/ui/lock.png' });
   preloadList.push({ key: 'basketball', path: 'assets/effects/basketball.png' });
   preloadList.push({ key: 'bg',         path: 'assets/bg.png' });
   
   const bgCount = 7;
   for (let i = 1; i <= bgCount; i++) {
     const s = String(i).padStart(2,'0');
     preloadList.push({ key: `scene_bg${s}`, path: `assets/scene/scene-bg${s}.png` });
   }
   preloadList.push({ key: 'hero_window', path: 'assets/ui/hero-window.png' });
   
   /* ---------- 全局缓存 ---------- */
   globalThis.imageCache = {};
   globalThis.imageCache.lootChests = [];
   
   /* ---------- 逐项预加载（分包完成后再调用） ---------- */
   function preloadAssets() {
     return new Promise(resolve => {
       for (const item of preloadList) {
         const img = wx.createImage();
         img.src   = item.path;
   
         img.onload  = () => handleFinish(img, item.key, true, resolve);
         img.onerror = () => {
           console.error('[preload] fail:', item.path); // 便于排查大小写/路径
           handleFinish(img, item.key, false, resolve);
         };
       }
     });
   }
   
   function handleFinish(img, key, ok, resolve) {
     if (ok) {
       globalThis.imageCache[key] = img;
       if (key.startsWith('loot_chest_')) {
         const idx = Number(key.split('_').pop());
         globalThis.imageCache.lootChests[idx] = img;
       }
     }
     loadedCount++;
     progress = Math.floor((loadedCount / preloadList.length) * 100);
     drawLoading();
   
     if (loadedCount === preloadList.length) resolve();
   }
   
   /* ---------- 先加载分包，再开始逐项预加载 ---------- */
   function loadAssetsSubpackage(onProgress) {
     return new Promise((resolve, reject) => {
       const task = wx.loadSubpackage({
         name: 'assets',
         success: () => {
           console.log('[assets subpackage] loaded');
           resolve();
         },
         fail: (err) => reject(err)
       });
       if (task && typeof task.onProgressUpdate === 'function' && typeof onProgress === 'function') {
         task.onProgressUpdate(({ progress }) => onProgress(progress));
       }
     });
   }
   
   /* ---------- 页面初始化 ---------- */
   function initLoadingPage(ctx, switchPage, canvas) {
     ctxRef       = ctx;
     canvasRef    = canvas;
     switchPageFn = switchPage;
   
     tipText = '小贴士：' + tips[Math.floor(Math.random() * tips.length)];
     drawLoading();
   
     // A) 先下载 assets 分包
     const subpkgPromise = loadAssetsSubpackage((p) => {
       subpkgProgress = p;   // 0~100
       drawLoading();
     }).catch(err => {
       console.error('[subpackage] 下载失败：', err);
       wx.showToast({ title: '资源包下载失败', icon: 'none' });
       throw err;
     });
   
     // B) 分包成功后再逐项预加载
     const assetPromise = subpkgPromise.then(() => preloadAssets());
   
     // C) 云存档并行
     const cloudPromise = (async () => {
       try {
         await loadAll();                 // 云 → 本地
         await migrateLocalToCloudOnce(); // 首次整体上云
       } catch (err) {
         console.error('[cloud] 读取失败', err);
       }
     })();
   
     Promise.allSettled([assetPromise, cloudPromise]).then(() => {
       // ✅ 资源准备完成
       globalThis.ASSETS_READY = true;
   
       try { migrateRarityScheme(); } catch(_) {}
       setTimeout(() => switchPageFn('home'), 500);
     });
   }
   
   /* ---------- 绘制 Loading 画面 ---------- */
   function drawLoading() {
     const ctx = ctxRef;
     const w   = canvasRef.width;
     const h   = canvasRef.height;
   
     ctx.fillStyle = '#000';
     ctx.fillRect(0, 0, w, h);
   
     // 合并显示进度：分包 30% + 逐项 70%
     const overall = Math.min(100, Math.floor(0.3 * subpkgProgress + 0.7 * progress));
   
     const barW = w * 0.6;
     const barH = 22;
     const barX = (w - barW) / 2;
     const barY = h * 0.5;
     const radius = 10;
   
     function roundRect(x,y,wid,hei,r) {
       ctx.beginPath();
       ctx.moveTo(x+r, y);
       ctx.lineTo(x+wid-r, y);
       ctx.quadraticCurveTo(x+wid, y, x+wid, y+r);
       ctx.lineTo(x+wid, y+hei-r);
       ctx.quadraticCurveTo(x+wid, y+hei, x+wid-r, y+hei);
       ctx.lineTo(x+r, y+hei);
       ctx.quadraticCurveTo(x, y+hei, x, y+hei-r);
       ctx.lineTo(x, y+r);
       ctx.quadraticCurveTo(x, y, x+r, y);
       ctx.closePath();
     }
   
     // 背景条
     roundRect(barX, barY, barW, barH, radius);
     ctx.fillStyle = '#1a1a1a';
     ctx.fill();
   
     // 填充条
     const fillW = (overall / 100) * barW;
     roundRect(barX, barY, fillW, barH, radius);
     ctx.fillStyle = '#C2185B';
     ctx.fill();
   
     // 边框
     roundRect(barX, barY, barW, barH, radius);
     ctx.lineWidth = 4;
     ctx.strokeStyle = '#6A5ACD';
     ctx.stroke();
   
     // 百分比
     ctx.fillStyle = '#FFF';
     ctx.font = '20px sans-serif';
     ctx.textAlign = 'center';
     ctx.fillText(`${overall}%`, w/2, barY + barH + 32);
   
     // 小贴士
     ctx.fillStyle = '#FFD700';
     ctx.font = '18px sans-serif';
     ctx.fillText(tipText, w / 2, barY - 60);
   
     // 阶段文案
     const stageText = subpkgProgress < 100 ? '下载资源包…' : '加载素材…';
     ctx.fillStyle = '#FF3399';
     ctx.font = 'bold 26px sans-serif';
     ctx.fillText(stageText, w/2, barY - 20);
   }
   
   /* ---------- 对外接口 ---------- */
   export default {
     init    : initLoadingPage,
     update  : () => {},
     draw    : drawLoading,
     destroy : () => {},
     touchend: () => {}
   };
   