// === 全局冷却控制（可放在文件顶部或函数外部） ===
let unlockedSlots = [true, true, true, true, true]; // 第1个槽位默认解锁
let lastAdTime = 0; // 上次点击时间戳
let shareCountToday = 0;
let lastShareDate = '';
const AD_COOLDOWN = 3 * 60 * 1000; // 3 分钟，单位毫秒
let showUpgradeButtons = false;
let showDialog = true;
let dialogInterval = null; // ✅ 放到最顶层作用域
import { updatePlayerStats } from './utils/player_stats.js';  // 顶部添加
// 🗨️ 随机台词池（酒馆NPC）
const barDialogLines = [
  "欢迎来到魅影旅店，勇者…你可真香。",
  "这些英雄啊，有的英勇，有的…惨叫得很好听～",
  "嘘——别太吵，隔壁桌刚签了灵魂契约。",
  "金币不够？没关系…我接受别的“代价”。",
  "选好了？可别怪我没提醒你，外面比我更危险哦♡",
  "你看起来…像是会噶得很精彩的人。",
  "今晚是血月…最适合来点冒险和红酒。",
  "别盯着我看啦～会迷路的。",
  "你也是来逃避命运的吗？我懂的。",
  "想听个故事吗？关于堕落的天使和他爱上的猎人…",
  "你长得这么聪明，不用我教你吧？"
];

// 🔁 页面刷新时选中一句（只选一次）
let barDialogText = barDialogLines[Math.floor(Math.random() * barDialogLines.length)];

// ======================= 资源与常量 =======================
const {  drawRoundedRect, drawStyledText } = require('./utils/canvas_utils.js');
const { getTotalCoins }   = require('./data/coin_state.js');
const {
  HeroState,            // 类
  setSelectedHeroes     // 方法
} = require('./data/hero_state.js');
const HeroData          = require('./data/hero_data.js');

const ICON       = 60;                  // 头像大小（全局常量）
const HERO_PER_PAGE = 15;                                   // 每页 15
 const TOTAL_PAGES   = Math.ceil(                           // 页数自动算
   HeroData.heroes.length / HERO_PER_PAGE
 );

const lockIconImg = wx.createImage();   // 锁图标
lockIconImg.src   = 'assets/ui/lock.png';
let clickSound = null;
let clickedKey = null;
let clickAnimationFrame = 0;

let flipSound = null;

function playFlipSound() {
  if (!flipSound) {
    flipSound = wx.createInnerAudioContext();
    flipSound.src = 'sounds/page_flip.mp3'; // ✅ 使用你上传的音效
  }
  flipSound.stop();
  flipSound.play();
}

function playClickSound() {
  if (!clickSound) {
    clickSound = wx.createInnerAudioContext();
    clickSound.src = 'sounds/click.mp3';
  }
  clickSound.stop();
  clickSound.play();
}

// ======================= 运行时状态 =======================
let selectedHeroes = [null, null, null, null, null];
let slotRects  = [];
let iconRects  = [];
let btnPrevRect = null;
let btnNextRect = null;
let btnBackRect = null; // 返回按钮区域
let pageIndex   = 0;
/* ---------- 弹窗状态 ---------- */
let unlockDialog = { show: false, hero: null, okRect: null, cancelRect: null };

function getLastLevel(callback) {
    try {
      const stored = wx.getStorageSync('lastLevel');
      const level = parseInt(stored || '1');
      callback(level > 0 ? level : 1);
    } catch (e) {
      callback(1);
    }
  }
  
function avoidOverlap(rect, others, minGap = 12, maxTries = 5) {
    let attempt = 0;
    while (attempt < maxTries) {
      let collision = false;
      for (const o of others) {
        const overlapX = rect.x < o.x + o.width + minGap &&
                         rect.x + rect.width + minGap > o.x;
        const overlapY = rect.y < o.y + o.height + minGap &&
                         rect.y + rect.height + minGap > o.y;
        if (overlapX && overlapY) {
          rect.y = o.y + o.height + minGap; // 往下偏移
          collision = true;
          break;
        }
      }
      if (!collision) break;
      attempt++;
    }
    return rect;
  }
  
  function scaleToAvoidOverlap(rect, others, minScale = 0.6, step = 0.05) {
    let scale = 1.0;
    while (scale >= minScale) {
      const testRect = {
        x: rect.x,
        y: rect.y,
        width: rect.width * scale,
        height: rect.height * scale
      };
      const overlaps = others.some(o =>
        testRect.x < o.x + o.width &&
        testRect.x + testRect.width > o.x &&
        testRect.y < o.y + o.height &&
        testRect.y + testRect.height > o.y
      );
      if (!overlaps) {
        return { ...testRect, scale };
      }
      scale -= step;
    }
    return { ...rect, scale: minScale };
  }
  

let ctxRef, canvasRef, switchPageFn;






  function initHeroSelectPage(ctx, switchPage, canvas) {
    try {
      const saved = wx.getStorageSync('unlockedSlots');
      if (Array.isArray(saved)) {
        unlockedSlots = saved;
      }
    } catch (e) {
      // 保持默认值
      
    }
     // === 兜底：保证槽 4、槽 5 为已解锁 ===
  if (!unlockedSlots[3] || !unlockedSlots[4]) {   // 只在需要时改写
        unlockedSlots[3] = true;   // 槽 4（索引 3）
        unlockedSlots[4] = true;   // 槽 5（索引 4）
        wx.setStorageSync('unlockedSlots', unlockedSlots);
      }
    
    ctxRef = ctx;
    canvasRef = canvas;
    switchPageFn = switchPage;
    globalThis.canvasRef = canvas;        // ✅ 让 effects_engine.js 能读取 canvas
    globalThis.__gridStartY = canvas.height * 0.35;  // ✅ 若你的头像行高度是根据此值布局的
    
      // ⬇️ 在初始化后立即记录当前金币
  const currentGold = getTotalCoins();
  updatePlayerStats({ gold: currentGold });
  
    dialogInterval = setInterval(() => {
      barDialogText = barDialogLines[Math.floor(Math.random() * barDialogLines.length)];
      showDialog = true;
      render();
  
      setTimeout(() => {
        showDialog = false;
        render();
      }, 4500);
    }, 8500);
  
    render();
  }
  
  function destroy() {
    if (dialogInterval) {
      clearInterval(dialogInterval);
      dialogInterval = null;
    }
  }
  



// ======================= 触摸 / 点击 ======================
function onTouch(e) {
  if (!e.changedTouches || !e.changedTouches[0]) return;
  const { clientX: x, clientY: y } = e.changedTouches[0];
  if (btnBackRect && hit(x, y, btnBackRect)) {
    playClickSound();
    clickedKey = 'back';
    clickAnimationFrame = 0;
    setTimeout(() => switchPageFn('home'), 180);
    return;
  }

  console.log('[DEBUG] 用户触摸了坐标：', x, y);

    // ---------- 若弹窗已开启，优先处理弹窗 ----------
    if (unlockDialog.show) {
      // 点坐标
      const px = x, py = y;
      const { okRect, cancelRect } = unlockDialog;
  
      // 点击确定
      if (hit(px, py, okRect)) {
        const hero  = unlockDialog.hero;
        const cost  = hero.unlockCost || 0;
        const coins = getTotalCoins();
        unlockDialog.show = false;
        if (coins < cost) {
          wx.showToast({ title: '金币不足', icon: 'none' });
          return render();
        }
        const st = new HeroState(hero.id);
        if (st.tryUnlock()) hero.locked = false;
        return render();
      }
  
      // 点击取消按钮或蒙层空白
      if (!hit(px, py, okRect)) {
        unlockDialog.show = false;
        return render();
      }
    }
  


  /* ---------- 已选槽位：点击移除 ---------- */
  for (let i = 0; i < slotRects.length; i++) {
    if (hit(x, y, slotRects[i])) {
      if (!unlockedSlots[i]) {
        let conditionText = '';
        switch (i) {
          case 1:
            conditionText = '通关第3关可解锁';
            break;
          case 2:
            conditionText = '消耗1000金币解锁';
            break;
          case 3:
            conditionText = '观看广告解锁';
            break;
          case 4:
            conditionText = '通过分享解锁';
            break;
          default:
            conditionText = '暂无解锁条件';
        }
        
        wx.showModal({
          title: `槽位 ${i + 1} 未解锁`,
          content: `${conditionText}，是否现在尝试解锁？`,
          success(res) {
            if (res.confirm) {
              tryUnlockSlot(i);
            }
          }
        });
        
        return;
      }
      selectedHeroes[i] = null;
      setSelectedHeroes(selectedHeroes);
      return render();
    }
  }
  

  /* ---------- 翻页按钮 ---------- */
  if (hit(x, y, btnPrevRect) && pageIndex > 0) {
    playFlipSound();          // ✅ 替换成新音效
    clickedKey = 'prev';
    clickAnimationFrame = 0;
    pageIndex--; render();
    return;
  }
  if (hit(x, y, btnNextRect) && pageIndex < TOTAL_PAGES - 1) {
    playFlipSound();          // ✅ 替换成新音效
    clickedKey = 'next';
    clickAnimationFrame = 0;
    pageIndex++; render();
    return;
  }

  /* ---------- 升级按钮显示开关 ---------- */
  const upgradeToggleRect = { x: 20, y: canvasRef.height - 80, width: 80, height: 50 };
  if (hit(x, y, upgradeToggleRect)) {
    showUpgradeButtons = !showUpgradeButtons;
    return render();
  }
// ---------- 点击“看广告得金币” ----------

// 全局冷却控制（若已声明，可略）
if (typeof globalThis.lastAdTime === 'undefined') {
  globalThis.lastAdTime = 0;
}
const AD_COOLDOWN = 30 * 1000; // 30秒冷却时间

if (hit(x, y, globalThis.adBtnRect)) {
    const now = Date.now();
    const todayStr = new Date().toDateString();
  
    // 每天首次点击，重置计数器
    if (lastShareDate !== todayStr) {
      lastShareDate = todayStr;
      shareCountToday = 0;
    }
  
    // 超过每日5次
    if (shareCountToday >= 5) {
      wx.showToast({ title: '今日分享已达5次上限', icon: 'none' });
      return;
    }
  
    // 冷却中
    if (now - lastAdTime < AD_COOLDOWN) {
      wx.showToast({ title: '冷却中，请稍后再试', icon: 'none' });
      return;
    }
  
    // === 满足条件：立刻发金币 ===
    lastAdTime = now;
    shareCountToday++;
  
    const coins = getTotalCoins();
    wx.setStorageSync('totalCoins', coins + 5000);
    wx.showToast({ title: '金币 +5000', icon: 'success' });
    render();
  
    // === 弹出分享界面（可选，但不影响奖励）===
    wx.showShareMenu({ withShareTicket: false });
    wx.shareAppMessage({
      title: '快来召唤你的勇者保卫魔界！',
      imageUrl: 'assets/ui/share_banner.png'
    });
  
    return;
  }
  



  /* ---------- 英雄头像区 ---------- */
  for (const { rect, hero } of iconRects) {
    if (hero && hit(x, y, rect)) {

// === 🔒 若英雄被锁，先弹确认框 ===
if (hero.locked) {
  const cost = hero.unlockCost || 0;
  const coins = getTotalCoins();

// === 🔒 被锁，打开自绘弹窗 ===
if (hero.locked) {
  if (hero.unlockBy === 'ad') {
    // 先弹出提示框而不是直接播放广告
    wx.showModal({
      title: '🎥 解锁英雄',
      content: `解锁「${hero.name}」需要观看一段广告，是否继续？`,
      cancelText: '取消',
      confirmText: '立即观看',
      success(res) {
        if (res.confirm) {
          const videoAd = wx.createRewardedVideoAd({ adUnitId: 'adunit-0123456789abcdef' });

          videoAd.onError(err => {
            wx.showToast({ title: '广告加载失败', icon: 'none' });
          });

          videoAd.load()
            .then(() => videoAd.show())
            .catch(() => {
              wx.showToast({ title: '广告展示失败', icon: 'none' });
            });

          videoAd.onClose(res => {
            if (res && res.isEnded) {
              const state = new HeroState(hero.id);
              if (state.tryUnlock()) {
                hero.locked = false;
                render();
              }
            } else {
              wx.showToast({ title: '观看未完成', icon: 'none' });
            }
          });
        }
      }
    });

    return; // ⛔ 防止后续加入出战队列
  } else {
    unlockDialog = { show: true, hero };
    return render();
  }
}

}

      // === 已解锁：加入出战列表 ===
      if (selectedHeroes.includes(hero.id)) return;  // 已在队列中

      // ✅ 找第一个已解锁的空槽位
      const empty = selectedHeroes.findIndex((h, idx) => h === null && unlockedSlots[idx]);
      
      if (empty !== -1) {
        selectedHeroes[empty] = hero.id;
        setSelectedHeroes(selectedHeroes);
        return render();
      } else {
        wx.showToast({ title: '没有可用槽位', icon: 'none' });
      }
    }
  }

/* ---------- 头像下方“升级”按钮 ---------- */
for (const { hero } of iconRects) {
  const btn = hero?.upgradeButtonRect;
  if (btn && hit(x, y, btn)) {
    const progress = wx.getStorageSync('heroProgress')?.[hero.id];
    const cost     = (progress?.level ?? 1) * 100;
    const coins    = getTotalCoins();

    if (coins >= cost) {
      // ✅ 升级英雄（保存到 heroProgress）
      const hs = new HeroState(hero.id);

      // 🔥 在英雄池中升级时设置升级特效坐标回调
      hs.onLevelUp = () => {
        const { createHeroLevelUpEffectAt, createFloatingTextUp } = require('./effects_engine.js');

        const rect = iconRects.find(r => r.hero?.id === hero.id)?.rect;
        if (rect) {
          const centerX = rect.x + rect.width / 2;
          const centerY = rect.y;
          createHeroLevelUpEffectAt(centerX, centerY); // 在头像正上方播放特效
          createFloatingTextUp(`+${hs.expToNextLevel} 经验`, centerX, centerY - 16, '#33AAFF', 20, 1000);

        }
      };
      
      hs.gainExp(hs.expToNextLevel);
                      // 自动保存

      wx.setStorageSync('totalCoins', coins - cost);  // 扣金币

      // ✅ 更新当前 UI 中的 hero 显示
      Object.assign(hero, hs);

      // ✅ 检查是否在出战栏中，如是则刷新出战栏缓存
      const indexInTeam = selectedHeroes.findIndex(id => id === hero.id);
      if (indexInTeam !== -1) {
        selectedHeroes[indexInTeam] = hero.id;          // 用 ID 重新覆盖
        setSelectedHeroes(selectedHeroes);              // 重建 HeroState 实例，读取最新状态
      }

      return render();
    } else {
      wx.showToast({ title: '金币不足', icon: 'none' });
    }
  }
}


  /* ---------- 确认按钮 ---------- */
  const confirmRect = globalThis.confirmRect;
  if (hit(x, y, confirmRect)) {
    const hasHero = selectedHeroes.some(id => id !== null);
    if (!hasHero) {
      wx.showToast({ title: '至少需要一名勇者', icon: 'none' });
      return;
    }
  
    playClickSound();                // ✅ 播放点击音效
    clickedKey = 'confirm';          // ✅ 触发动画缩放
    clickAnimationFrame = 0;
  
    wx.setStorageSync('unlockedSlots', unlockedSlots);
    wx.setStorageSync('selectedHeroes', selectedHeroes);
  
    setTimeout(() => {               // ✅ 稍等180ms后切页面，让动画有时间播放
      getLastLevel((level) => {
        switchPageFn('game', { level });
      });
    }, 180);
  
    return;
  }
  
  
}
function tryUnlockSlot(index) {
    const level = wx.getStorageSync('lastLevel') || 1;
    const coins = getTotalCoins();
  
    if (index === 1 && level >= 3) {
      unlockedSlots[index] = true;
    } else if (index === 2 && coins >= 1000) {
      wx.setStorageSync('totalCoins', coins - 1000);
      unlockedSlots[index] = true;
    } else if (index === 3) {
      const videoAd = wx.createRewardedVideoAd({ adUnitId: 'adunit-xxxx' });  // 替换为你的广告位ID
      videoAd.onClose(res => {
        if (res && res.isEnded) {
          unlockedSlots[index] = true;
          wx.showToast({ title: '已解锁', icon: 'success' });
          render();
        }
      });
      videoAd.load().then(() => videoAd.show());
      return;
    } else if (index === 4) {
      const isDevTools = wx.getSystemInfoSync().platform === 'devtools';
  
      if (isDevTools) {
        // ✅ 模拟环境下直接解锁（开发者工具中）
        unlockedSlots[index] = true;
        wx.setStorageSync('unlockedSlots', unlockedSlots);
        wx.showToast({ title: '已模拟解锁', icon: 'success' });
        render();
        return;
      }
  
      // ✅ 真机分享逻辑
      wx.showShareMenu({ withShareTicket: false });  // 确保展示分享菜单
      wx.shareAppMessage({
        title: '快来加入我的勇者小队，一起冒险！',
        imageUrl: 'assets/ui/share_banner.png', // 可选，确保路径存在
        success() {
          unlockedSlots[index] = true;
          wx.setStorageSync('unlockedSlots', unlockedSlots);
          wx.showToast({ title: '已通过分享解锁', icon: 'success' });
          render();
        },
        fail() {
          wx.showToast({ title: '分享失败，请重试', icon: 'none' });
        }
      });
      return;
    } else {
      wx.showToast({ title: '条件未满足', icon: 'none' });
      return;
    }
  
    wx.setStorageSync('unlockedSlots', unlockedSlots);
    render();
  }
  
  

function onTouchend(e) {
  onTouch(e); // ✅ 复用已有点击处理逻辑
}
// 命中测试
function hit(px, py, r) {
  return r && px >= r.x && px <= r.x + r.width &&
         py >= r.y && py <= r.y + r.height;
}

// ======================= 渲染 =============================
function render() {
  if (clickedKey) {
    clickAnimationFrame++;
    if (clickAnimationFrame > 10) {
      clickedKey = null;
      clickAnimationFrame = 0;
    }
  }

  const scaleBtn = (key) =>
  clickedKey === key
    ? 1.0 + 0.1 * Math.sin((clickAnimationFrame / 10) * Math.PI)
    : 1.0;


    const ctx = ctxRef;
    const canvas = canvasRef;
    const layoutRects = [];
  ctx.setTransform(1, 0, 0, 1, 0, 0); // 清除变换
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // === 自适应尺寸参数 ===
  const ICON = Math.floor(canvas.width / 7.2);  // 更大头像
  const GAP = Math.floor(ICON * 0.22);                         // 稍微紧凑
  const PAD_X = Math.floor((canvas.width - (ICON * 5 + GAP * 4)) / 2);
  const topOffset = Math.floor(canvas.height * 0.3);        // 更靠上
  const selectedY = topOffset + ICON + 20;                    // 出战槽区域位置下调一点


// 使用稍微亮一点但不过分艳的紫色
const richPurple = '#2E003E';  // 比 #2E003E 明亮一点，但不刺眼

// 渐变区域：从黑色 ➝ 紫色，从 0% 到 60%
const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height * 0.9);
gradient.addColorStop(0, '#000000');      // 顶部黑色
gradient.addColorStop(1, richPurple);     // 渐变到底部为紫色

// 上方黑色 ➝ 紫色渐变
ctx.fillStyle = gradient;
ctx.fillRect(0, 0, canvas.width, canvas.height * 0.9);

// 下方 40% 固定为纯紫色
ctx.fillStyle = richPurple;
ctx.fillRect(0, canvas.height * 0.9, canvas.width, canvas.height * 0.1);


// ✅ 英雄选择界面顶部“酒吧背景图”
const barImage = globalThis.imageCache['hero_window'];
if (barImage && barImage.complete && barImage.width) {
// 绿框大约离左右各留 20px、高宽比≈16:9
const sidePad = 20;
const IMG_W   = canvas.width - sidePad * 2;   // 宽度随屏幕自适应
const IMG_H   = IMG_W * 9 / 16;              // 保持 16:9
  const x = (canvas.width - IMG_W) / 2;
  const y = canvas.height * 0.12;  // 顶部偏移，可根据实际位置微调

  ctx.drawImage(barImage, x, y, IMG_W, IMG_H);
}

// ✅ 仅在 showDialog = true 时绘制对话气泡和箭头
if (showDialog) {
  const bubbleW = 280;
  const bubbleH = 60;
  const bubbleX = (canvas.width - bubbleW) / 2 + 20; // 居中微偏右
  const bubbleY = canvas.height * 0.08;

  // 圆角白底气泡框
  ctx.save();
  ctx.fillStyle = '#FFF';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
  ctx.shadowBlur = 4;
  drawRoundedRect(ctx, bubbleX, bubbleY, bubbleW, bubbleH, 12, true, false);
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.restore();

  // 🔻 小箭头（三角形）指向角色头像
  ctx.beginPath();
  ctx.moveTo(bubbleX + bubbleW / 2 - 6, bubbleY + bubbleH);
  ctx.lineTo(bubbleX + bubbleW / 2 + 6, bubbleY + bubbleH);
  ctx.lineTo(bubbleX + bubbleW / 2, bubbleY + bubbleH + 10);
  ctx.closePath();
  ctx.fillStyle = '#FFF';
  ctx.fill();

  // 文本内容（对白）
  drawText(ctx, barDialogText,
    bubbleX + 14, bubbleY + 18,
    '14px PingFang SC', '#000', 'left', 'top');
}





  // 顶部金币
  drawStyledText(ctx, `金币: ${getTotalCoins()}`,
  canvas.width - PAD_X, topOffset, {
    font: 'bold 18px IndieFlower',
    fill: '#FFD700',
    stroke: '#000',
    align: 'right',
    baseline: 'top'
});


  // 出战槽标题
  drawText(ctx, '出战英雄', PAD_X, selectedY - 20,
           '16px IndieFlower', '#DCC6F0', 'left', 'top');

// 出战槽（灰底 + 紫边 + 英雄头像）
slotRects.length = 0;
for (let i = 0; i < 5; i++) {
  const sx = PAD_X + i * (ICON + GAP);
  const sy = selectedY;

  ctx.fillStyle = '#2E2E2E';
  drawRoundedRect(ctx, sx, sy, ICON, ICON, 8, true, false);

  ctx.strokeStyle = '#A64AC9';
  ctx.lineWidth = 3;
  drawRoundedRect(ctx, sx, sy, ICON, ICON, 8, false, true);

  slotRects[i] = { x: sx, y: sy, width: ICON, height: ICON };

  if (!unlockedSlots[i]) {
    ctx.save();
    ctx.globalAlpha = 0.65;
    ctx.fillStyle = '#000';
    drawRoundedRect(ctx, sx, sy, ICON, ICON, 8, true, false);
    ctx.globalAlpha = 1;
    ctx.drawImage(lockIconImg,
      sx + ICON / 4,
      sy + ICON / 4,
      ICON / 2,
      ICON / 2);
    ctx.restore();
    continue;
  }

  const heroId = selectedHeroes[i];
  if (heroId) {
    const heroObj = new HeroState(heroId);
    drawIcon(ctx, heroObj, sx, sy, ICON, false);
  }
}


  // 英雄池标题
  const poolStartY = selectedY + ICON + 50;// 英雄池更贴出战区
  drawText(ctx, '英雄池', PAD_X, poolStartY - 30,
           '16px IndieFlower', '#DCC6F0', 'left', 'top');

// === 英雄池包裹框 ===
const poolCols = 5;
const poolRows = Math.ceil(HERO_PER_PAGE / poolCols);

const poolW = ICON * poolCols + GAP * (poolCols - 1);
const poolH = ICON * poolRows + ICON * 0.5 * (poolRows - 1);
const poolX = PAD_X - 8;
const poolY = poolStartY - 8;
const poolPaddingW = poolW + 16;
const poolPaddingH = poolH + 16;

ctx.strokeStyle = '#4d295c';       // 紫色描边
ctx.lineWidth = 2;
drawRoundedRect(ctx, poolX, poolY, poolPaddingW, poolPaddingH, 10, false, true);

ctx.save();
ctx.fillStyle = 'rgba(255,255,255,0.05)'; // 可选：半透明浅底
drawRoundedRect(ctx, poolX, poolY, poolPaddingW, poolPaddingH, 10, true, false);
ctx.restore();

  // 英雄池头像区域
  const startIdx = pageIndex * HERO_PER_PAGE;
  const rawHeroes = HeroData.heroes.filter(h => !h.hidden).slice(startIdx, startIdx + HERO_PER_PAGE);

  const pageHeroes = rawHeroes.map(h => h ? new HeroState(h.id) : null);
  while (pageHeroes.length < HERO_PER_PAGE) pageHeroes.push(null);

  iconRects.length = 0;
  pageHeroes.forEach((hero, i) => {
    const row = Math.floor(i / 5);
    const col = i % 5;
    let ix = PAD_X + col * (ICON + GAP);
    let iy = poolStartY + row * (ICON + ICON * 0.5);
    let iconRect = { x: ix, y: iy, width: ICON, height: ICON };
    const scaled = scaleToAvoidOverlap(iconRect, layoutRects);
    layoutRects.push({ x: scaled.x, y: scaled.y, width: scaled.width, height: scaled.height });
    
    ctx.strokeStyle = '#C084FC';
    ctx.lineWidth = 2;
    drawRoundedRect(ctx, scaled.x, scaled.y, scaled.width, scaled.height, 8, false, true);
    
    if (hero) drawIcon(ctx, hero, scaled.x, scaled.y, scaled.width, true);  // ✅ 表明是英雄池



    else {
      ctx.fillStyle = '#4B0073';
      drawRoundedRect(ctx, ix + 4, iy + 4, ICON - 8, ICON - 8, 8, true, false);
      drawText(ctx, '?', ix + ICON / 2, iy + ICON / 2,
        '20px IndieFlower', '#FFF', 'center', 'middle');
    }
    iconRects.push({ rect: { x: scaled.x, y: scaled.y, width: scaled.width, height: scaled.height }, hero });

  });
// 🟡 插入在这里，确保 drawIcon 后才能访问
globalThis.layoutRects = layoutRects;
  // 翻页按钮

 // 向下再挪 12px；若想更低调，把 12 改更大
 const PAGING_SPACING = 70;  // ← 你可以改成 30、50 等更紧凑或更宽松
const btnY = poolStartY + ICON * poolRows + PAGING_SPACING;

 // 按钮缩小到 ICON 的 0.6 倍
 const BTN  = ICON * 0.65;
 btnPrevRect = { x: PAD_X,             y: btnY, width: BTN, height: BTN };
 btnNextRect = { x: canvas.width - PAD_X - BTN, y: btnY, width: BTN, height: BTN };

 const scalePrev = scaleBtn('prev');
 ctx.save();
 ctx.translate(btnPrevRect.x + btnPrevRect.width / 2, btnPrevRect.y + btnPrevRect.height / 2);
 ctx.scale(scalePrev, scalePrev);
 ctx.translate(-btnPrevRect.width / 2, -btnPrevRect.height / 2);
 ctx.fillStyle = pageIndex > 0 ? '#9c275d' : '#300';
 drawRoundedRect(ctx, 0, 0, btnPrevRect.width, btnPrevRect.height, 8, true, false);
 drawText(ctx, '<', btnPrevRect.width / 2, btnPrevRect.height / 2, 'bold 26px IndieFlower', '#f8d6ff', 'center', 'middle');
 ctx.restore();
 
  drawText(ctx, '<', btnPrevRect.x + btnPrevRect.width / 2, btnPrevRect.y + btnPrevRect.height / 2,
  'bold 26px IndieFlower', '#f8d6ff', 'center', 'middle');

  ctx.fillStyle = pageIndex < TOTAL_PAGES - 1 ? '#9c275d' : '#300';
  drawRoundedRect(ctx, btnNextRect.x, btnNextRect.y, btnNextRect.width, btnNextRect.height, 8, true, false);
  drawText(ctx, '>', btnNextRect.x + btnNextRect.width / 2, btnNextRect.y + btnNextRect.height / 2,
  'bold 26px IndieFlower', '#f8d6ff', 'center', 'middle');
  //drawText(ctx, `${pageIndex + 1} / ${TOTAL_PAGES}`,
    //canvas.width / 2, btnY + btnPrevRect.height / 2,
   // '14px IndieFlower', '#DCC6F0', 'center', 'middle');

  // 升级按钮开关
  const toggleY = canvas.height - ICON * 1.5;
  let upgradeToggleRect = {
    x: PAD_X,
    y: toggleY,
    width: ICON * 1.2,
    height: ICON * 0.8
  };
  upgradeToggleRect = avoidOverlap(upgradeToggleRect, layoutRects);
  layoutRects.push(upgradeToggleRect);
  ctx.fillStyle = '#9c275d';
  drawRoundedRect(ctx, upgradeToggleRect.x, upgradeToggleRect.y,
                  upgradeToggleRect.width, upgradeToggleRect.height, 8, true, false);
                  drawStyledText(ctx, showUpgradeButtons ? '隐藏' : '升级',
                  upgradeToggleRect.x + upgradeToggleRect.width / 2,
                  upgradeToggleRect.y + upgradeToggleRect.height / 2, {
                    font: 'bold 18px IndieFlower',
                    fill: '#ffe3e3',
                    //stroke: '#FFF',
                    align: 'center',
                    baseline: 'middle'
                });
 // ✅ 获取当前关卡等级（用于按钮显示）
let level = 1;
try {
  const stored = wx.getStorageSync('lastLevel');
  level = parseInt(stored || '1');
  if (!level || level < 1) level = 1;
} catch (e) {
  level = 1;
}               

  // 确认按钮
// ✅ 将确认按钮 Y 坐标与左侧“升级按钮”对齐
const confirmY = btnPrevRect.y - ICON * 0.1;

let confirmRect = {
  x: canvas.width / 2 - ICON * 1.5,
  y: confirmY, // 👈 替换掉原来的 toggleY
  width: ICON * 3,
  height: ICON * 0.8
};

confirmRect = avoidOverlap(confirmRect, layoutRects);
layoutRects.push(confirmRect);
globalThis.confirmRect = confirmRect;
const confirmX = confirmRect.x;
const scaleConfirm = scaleBtn('confirm');
ctx.save();
ctx.translate(confirmRect.x + confirmRect.width / 2, confirmRect.y + confirmRect.height / 2);
ctx.scale(scaleConfirm, scaleConfirm);
ctx.translate(-confirmRect.width / 2, -confirmRect.height / 2);
ctx.fillStyle = '#6d2c91';
drawRoundedRect(ctx, 0, 0, confirmRect.width, confirmRect.height, 28, true, false);
drawStyledText(ctx, `进入第${level}关`, confirmRect.width / 2, confirmRect.height / 2, {
  font: 'bold 20px IndieFlower', fill: '#f8d6ff', align: 'center', baseline: 'middle'
});
ctx.restore();

// === 分享得金币按钮 ===
let adBtnRect = {
  x: canvas.width - PAD_X - ICON * 1.2,
  y: toggleY,
  width: ICON * 1.2,
  height: ICON * 0.8
};
adBtnRect = avoidOverlap(adBtnRect, layoutRects);
layoutRects.push(adBtnRect);

ctx.fillStyle = '#9c275d';
drawRoundedRect(ctx, adBtnRect.x, adBtnRect.y, adBtnRect.width, adBtnRect.height, 8, true, false);
drawStyledText(ctx, '分享得金币',
  adBtnRect.x + adBtnRect.width / 2,
  adBtnRect.y + adBtnRect.height / 2, {
    font: 'bold 18px IndieFlower',
    fill: '#ffe3e3',
    align: 'center',
    baseline: 'middle'
});

globalThis.adBtnRect = adBtnRect;


// 返回按钮（左上角）
btnBackRect = { x: 16, y: 16, width: 64, height: 30 };
const scaleBack = scaleBtn('back');
ctx.save();
ctx.translate(btnBackRect.x + btnBackRect.width / 2, btnBackRect.y + btnBackRect.height / 2);
ctx.scale(scaleBack, scaleBack);
ctx.translate(-btnBackRect.width / 2, -btnBackRect.height / 2);
ctx.fillStyle = '#5e3a7d';
drawRoundedRect(ctx, 0, 0, btnBackRect.width, btnBackRect.height, 6, true, false);
drawStyledText(ctx, '返回', btnBackRect.width / 2, btnBackRect.height / 2, {
  font: '14px IndieFlower', fill: '#fff', align: 'center', baseline: 'middle'
});
ctx.restore();

const { updateAllEffects, drawAllEffects } = require('./effects_engine.js');
// 所有 UI 元素之后
drawUnlockDialog(ctx, canvas);
ctx.save();
updateAllEffects();
drawAllEffects(ctx, canvas);
ctx.restore();
}



function drawUnlockDialog(ctx, canvas) {
  if (!unlockDialog.show) return;          // 没开启不画

  const { hero } = unlockDialog;
  const cost = hero.unlockCost || 0;

  /* ——— 1. 半透明遮罩 ——— */
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.restore();

  /* ——— 2. 主卡片 ——— */
  const W = 270, H = 180, R = 14;
  const x = (canvas.width - W) / 2;
  const y = (canvas.height - H) / 2;

  ctx.fillStyle = '#4A007F';
  drawRoundedRect(ctx, x, y, W, H, R, true, false);

  /* ——— 3. 标题 ——— */
  drawText(ctx, '解锁英雄', x + W / 2, y + 36,
    'bold 20px PingFang SC', '#FFD54F', 'center', 'middle');

  /* ——— 4. 内容 ——— */
  drawText(ctx, `解锁「${hero.name}」需要`, x + W / 2, y + 76,
    '15px PingFang SC', '#FFFFFF', 'center', 'middle');
  drawText(ctx, `${cost} 金币，确定继续？`, x + W / 2, y + 100,
    '15px PingFang SC', '#FFFFFF', 'center', 'middle');

  /* ——— 5. 两个按钮 ——— */
  const btnW = 100, btnH = 36, gap = 26;
  const btnY = y + H - 56;
  const cancelX = x + (W - 2 * btnW - gap) / 2;
  const okX     = cancelX + btnW + gap;

  // 取消
  ctx.strokeStyle = '#DCC6F0';
  ctx.lineWidth   = 2;
  drawRoundedRect(ctx, cancelX, btnY, btnW, btnH, 6, false, true);
  drawText(ctx, '取消', cancelX + btnW / 2, btnY + btnH / 2 + 1,
    '15px PingFang SC', '#DCC6F0', 'center', 'middle');

  // 确定
  ctx.fillStyle = '#B44CFF';
  drawRoundedRect(ctx, okX, btnY, btnW, btnH, 6, true, false);
  drawText(ctx, '确定', okX + btnW / 2, btnY + btnH / 2 + 1,
    '15px PingFang SC', '#FFFFFF', 'center', 'middle');

  // 保存按钮热区
  unlockDialog.cancelRect = { x: cancelX, y: btnY, width: btnW, height: btnH };
  unlockDialog.okRect     = { x: okX,     y: btnY, width: btnW, height: btnH };
}


function drawIcon(ctx, hero, x, y, size = ICON, isFromPool = false) {
    const roleToBlockLetter = {
        '战士': 'A',
        '游侠': 'B',
        '法师': 'C',
        '坦克': 'D',
        '刺客': 'E',
        '辅助': 'F'
      };
      const r = 8;
      const img = heroImageCache[hero.id] || globalThis.imageCache[hero.icon];
      
      // ==== 圆角裁剪区域 ====
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + size - r, y);
      ctx.quadraticCurveTo(x + size, y, x + size, y + r);
      ctx.lineTo(x + size, y + size - r);
      ctx.quadraticCurveTo(x + size, y + size, x + size - r, y + size);
      ctx.lineTo(x + r, y + size);
      ctx.quadraticCurveTo(x, y + size, x, y + size - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
      ctx.clip();
      
      // ==== 头像图像 ====
      if (img) {
        ctx.drawImage(img, x, y, size, size);
      } else {
        ctx.fillStyle = '#444';
        ctx.fillRect(x, y, size, size);
      }
      ctx.restore();
      
      // ==== 品质描边 ====
      const rarityColor = { SSR: '#FFD700', SR: '#C0C0C0', R: '#A0522D' }[hero.rarity] || '#FFFFFF';
      ctx.strokeStyle = rarityColor;
      ctx.lineWidth = 2;
      drawRoundedRect(ctx, x, y, size, size, 8, false, true);
      
      // ==== 名称 / 职业图标 ====
      ctx.font = 'bold 10px IndieFlower';
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#000';
      ctx.fillStyle = '#FFF';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'bottom';
      
      const letter = roleToBlockLetter[hero.role];
      const icon = globalThis.imageCache?.[`block_${letter}`];
      const iconSize = size * 0.26;
      const iconX = x + 4;
      const iconY = y + size - iconSize - 4;
      
      // ✅ 职业图标 + 背框
      if (icon && icon.complete && icon.width > 0) {
        ctx.save();
        ctx.fillStyle = '#222';     // 深灰底
        ctx.strokeStyle = '#000';   // ✅ 黑色描边
        ctx.lineWidth = 2;
        drawRoundedRect(ctx, iconX, iconY, iconSize, iconSize, iconSize / 2, true, true);
        ctx.restore();
      
        ctx.drawImage(icon, iconX, iconY, iconSize, iconSize);
      
        // ✅ 名字右移
        const nameOffsetX = iconX + iconSize + 6;
        ctx.strokeText(hero.name, nameOffsetX, y + size - 3);
        ctx.fillText(hero.name,   nameOffsetX, y + size - 3);
      } else {
        // 没图标时默认名字位置
        ctx.strokeText(hero.name, x + 4, y + size - 3);
        ctx.fillText(hero.name,   x + 4, y + size - 3);
      }
      
    // ==== 等级角标 ====
    const level = saved?.level ?? hero.level ?? 1;
    ctx.font = 'bold 11px IndieFlower';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#FFD700';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.strokeText(`Lv.${level}`, x + size - 4, y + 4);
    ctx.fillText(`Lv.${level}`,   x + size - 4, y + 4);
    // ==== 锁定遮罩 ====
    if (hero.locked) {
      ctx.save();
      ctx.globalAlpha = 0.65;
      ctx.fillStyle = '#000';
      drawRoundedRect(ctx, x, y, size, size, 8, true, false);
      ctx.globalAlpha = 1;
  
      const lockSize = size * 0.5;
      ctx.drawImage(lockIconImg,
        x + (size - lockSize) / 2,
        y + (size - lockSize) / 2,
        lockSize, lockSize);
      ctx.restore();
    }
  
// // ==== 属性文本 ====
const saved = wx.getStorageSync('heroProgress')?.[hero.id];
const physical = saved?.attributes?.physical ?? hero.attributes.physical ?? 0;
const magical  = saved?.attributes?.magical  ?? hero.attributes.magical  ?? 0;
//const attrText = hero.role === '法师' ? `魔攻: ${magical}` : `物攻: ${physical}`;
//drawText(ctx, attrText, x + 4, y + size + 6, '12px IndieFlower', '#FFF', 'left', 'top');
  
    // ==== 升级按钮 ====
    if (isFromPool && showUpgradeButtons && !hero.locked) {
        // 获取当前等级（来自缓存或初始）
        const saved = wx.getStorageSync('heroProgress')?.[hero.id];
        const level = saved?.level ?? hero.level ?? 1;
        const maxLevel = 15;
        const isMax = level >= maxLevel;
      
        // 设置按钮文字和颜色
        const displayText = isMax ? '满级' : `${level * 100}金`;
        const bgColor = isMax ? '#9B59B6' : '#FFD700';
        const textColor = '#FFF';
      
        ctx.font = 'bold 12px IndieFlower';
        ctx.textBaseline = 'middle';
      
        const textWidth = ctx.measureText(displayText).width;
        const btnPadding = 8;
        const btnW = textWidth + btnPadding * 4;
        const btnH = 22;
      
        const btnRect = {
          x: x + size / 2 - btnW / 2,
          y: y + size + 3,
          width: btnW,
          height: btnH
        };
      
        // 绘制按钮背景
        ctx.fillStyle = bgColor;
        drawRoundedRect(ctx, btnRect.x, btnRect.y, btnW, btnH, 4, true, false);
      
        // 绘制按钮文字
        drawText(ctx, displayText, btnRect.x + btnW / 2, btnRect.y + btnH / 2,
          '12px IndieFlower', textColor, 'center', 'middle');
      
        // 注册点击区域（仅非满级才响应）
        hero.upgradeButtonRect = isMax
          ? null
          : { x: btnRect.x, y: btnRect.y, width: btnW, height: btnH };
      }
      
       else {
      hero.upgradeButtonRect = null;
    }
  

  }
  


// 绘制文本工具
function drawText(ctx, text, x, y,
  font = '16px IndieFlower', color = '#FFF',
  hAlign = 'left', vAlign = 'alphabetic') {
  ctx.fillStyle = color;
  ctx.font = font;
  ctx.textAlign = hAlign;
  ctx.textBaseline = vAlign;
  ctx.fillText(text, x, y);
}

// 图片缓存
const heroImageCache = {};

// ======================= 导出接口 ========================
module.exports = {
  init: initHeroSelectPage,
  update: () => {},
  draw: () => render(),
  destroy: destroy,  // ✅ 正确导出
  onTouchend,
  touchend: onTouchend
};

