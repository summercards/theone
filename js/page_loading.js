/* =============================================================
   js/page_loading.js   —— 启动画面：资源 & 云存档并行加载
   ============================================================= */

   import { loadAll, migrateLocalToCloudOnce } from './utils/cloud_save.js';
   const HeroData = require('./data/hero_data.js');
   
   let ctxRef, canvasRef, switchPageFn;
   let progress = 0;
   let loadedCount = 0;
   let tipText = ''; // 当前加载页面显示的小贴士
   
   // ---------- 小贴士内容（“小贴士：”为固定前缀） ----------
   const tips = [
     '超级方块直接点击施放！',
     '部分英雄的技能可以清除特殊障碍！',
     '尝试不同的英雄配对吧',
     '不同英雄搭配，策略翻倍！',
     '多留意每步操作，节省步数才是王道！',
     '连锁越多，伤害越高！',
   ];
   
   /* ---------- ① 构建预加载列表 ---------- */
   const preloadList = HeroData.heroes.map(hero => ({
     key : hero.icon.toLowerCase(),
     path: `assets/icons/${hero.icon}`
   }));
   
   // block 方块贴图
   ['A','B','C','D','E','F'].forEach(letter => {
     preloadList.push({
       key : `block_${letter}`,
       path: `assets/blocks/${letter}.png`
     });
   });
   // 超级方块贴图
   ['S1','S2','S3'].forEach(type => {
     preloadList.push({
       key : `super_${type}`,
       path: `assets/superblocks/${type.toLowerCase()}.png`
     });
   });
   
   // 其他 UI / 场景
   preloadList.push({ key: 'lock.png', path: 'assets/ui/lock.png' });
   preloadList.push({ key: 'basketball', path: 'assets/effects/basketball.png' });
   preloadList.push({ key: 'bg',         path: 'assets/bg.png' });
   const bgCount = 7;
   for (let i = 1; i <= bgCount; i++) {
     const s = String(i).padStart(2,'0');
     preloadList.push({ key: `scene_bg${s}`, path: `assets/scene/scene-bg${s}.png` });
   }
   preloadList.push({ key: 'hero_window', path: 'assets/ui/hero-window.png' });
   
   /* ---------- ② 创建全局缓存 ---------- */
   globalThis.imageCache = {};
   
   /* ---------- ③ 资源预加载（返回 Promise） ---------- */
   function preloadAssets() {
     return new Promise(resolve => {
       for (const item of preloadList) {
         const img = wx.createImage();
         img.src   = item.path;
   
         img.onload  = () => handleFinish(img, item.key, true, resolve);
         img.onerror = () => handleFinish(img, item.key, false, resolve);
       }
     });
   }
   
   function handleFinish(img, key, ok, resolve) {
     if (ok) globalThis.imageCache[key] = img;
     loadedCount++;
     progress = Math.floor((loadedCount / preloadList.length) * 100);
     drawLoading();
   
     if (loadedCount === preloadList.length) {
       resolve();                       // 全部资源结束（成功 / 失败均算）
     }
   }
   
   /* ---------- ④ 页面初始化 ---------- */
   function initLoadingPage(ctx, switchPage, canvas) {
     ctxRef       = ctx;
     canvasRef    = canvas;
     switchPageFn = switchPage;
   
     tipText = '小贴士：' + tips[Math.floor(Math.random() * tips.length)]; // 只随机一次
     drawLoading();
   
     // 并行执行：资源加载 + 云存档
     const assetPromise = preloadAssets();
     const cloudPromise = (async () => {
       try {
         await loadAll();                 // 云 → 本地
         await migrateLocalToCloudOnce(); // 首次整体上云
       } catch (err) {
         console.error('[cloud] 读取失败', err);
       }
     })();
   
     Promise.all([assetPromise, cloudPromise]).then(() => {
       // 留 0.5 秒给玩家看到 100%，再切 Home
       setTimeout(() => switchPageFn('home'), 500);
     });
   }
   
   /* ---------- ⑤ 绘制 Loading 画面 ---------- */
   function drawLoading() {
     const ctx = ctxRef;
     const w   = canvasRef.width;
     const h   = canvasRef.height;
   
     ctx.fillStyle = '#000';
     ctx.fillRect(0, 0, w, h);
   
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
     const fillW = (progress / 100) * barW;
     roundRect(barX, barY, fillW, barH, radius);
     ctx.fillStyle = '#C2185B';
     ctx.fill();
   
     // 边框
     roundRect(barX, barY, barW, barH, radius);
     ctx.lineWidth = 4;
     ctx.strokeStyle = '#6A5ACD';
     ctx.stroke();
   
     // 百分比文字
     ctx.fillStyle = '#FFF';
     ctx.font = '20px gameFont';
     ctx.textAlign = 'center';
     ctx.shadowColor = '#000';
     ctx.shadowBlur = 2;
     ctx.fillText(`${progress}%`, w/2, barY + barH + 32);
     ctx.shadowBlur = 0;
   
     // 显示固定小贴士（只随机一次）
     ctx.fillStyle = '#FFD700';
     ctx.font = '18px gameFont';
     ctx.textAlign = 'center';
     ctx.shadowColor = '#000';
     ctx.shadowBlur = 2;
     ctx.fillText(tipText, w / 2, barY - 60);
     ctx.shadowBlur = 0;
   
     // 文案
     ctx.fillStyle = '#FF3399';
     ctx.font = 'bold 30px gameFont';
     ctx.shadowColor = '#000';
     ctx.shadowBlur = 3;
     ctx.fillText('召唤中…', w/2, barY - 20);
     ctx.shadowBlur = 0;
   }
   
   /* ---------- ⑥ 对外接口 ---------- */
   export default {
     init    : initLoadingPage,
     update  : () => {},
     draw    : drawLoading,
     destroy : () => {},
     touchend: () => {}
   };
   