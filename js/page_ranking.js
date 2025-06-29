/* =============================================================
   page_ranking.js – 我的战绩 + 全服排行榜（Top 100）+ 好友榜占位
   ============================================================= */

/* ---------- 依赖 ---------- */
const { drawRoundedRect } = require('./utils/canvas_utils.js');
const { shareMyStats }   = require('./utils/share_utils.js');

/* ---------- 画布/页面句柄 ---------- */
let ctxRef, switchPageFn, canvasRef;

/* ---------- UI 坐标/尺寸缓存 ---------- */
let rankingShareBtn = null;
let rankingReturnBtn = null;

/* ---------- 排行榜状态 ---------- */
let tab = 'global';        // 'global' | 'friends'
let globalList = [];       // 云端前 100 数据
let scrollY = 0;           // 列表滚动偏移
let startY = 0;            // 记录触摸起点

/* =============================================================
   云函数 – 拉取全服排行榜
   ============================================================= */
async function fetchGlobalRanking() {
  try {
    const res = await wx.cloud.callFunction({ name: 'getTop100' });
    return res.result || [];
  } catch (e) {
    console.error('getTop100 调用失败：', e);
    return [];
  }
}

/* =============================================================
   页面初始化
   ============================================================= */
export async function initRankingPage(ctx, switchPage, canvas) {
  ctxRef = ctx;
  switchPageFn = switchPage;
  canvasRef = canvas;

  /* 第一次先画“我的战绩 + 空骨架” */
  drawRankingUI();

  /* 异步拉榜后再重绘 */
  globalList = await fetchGlobalRanking();
  drawRankingUI();
}

/* =============================================================
   主绘制函数
   ============================================================= */
function drawRankingUI() {
  if (!ctxRef || !canvasRef) return;

  ctxRef.clearRect(0, 0, canvasRef.width, canvasRef.height);

  /* ---------- 背景渐变 ---------- */
  const gradient = ctxRef.createLinearGradient(0, 0, 0, canvasRef.height);
  gradient.addColorStop(0, '#2f003d');
  gradient.addColorStop(1, '#000033');
  ctxRef.fillStyle = gradient;
  ctxRef.fillRect(0, 0, canvasRef.width, canvasRef.height);

  /* ---------- 我的战绩 ---------- */
  const stats = wx.getStorageSync('player_stats') || {
    maxStage: 0, maxDamage: 0, maxGold: 0
  };

  ctxRef.fillStyle = '#ffd700';
  ctxRef.font = 'bold 32px sans-serif';
  ctxRef.textAlign = 'center';
  ctxRef.fillText('🏆 我的战绩', canvasRef.width / 2, 60);

  const cardX = 30, cardY = 90, cardW = canvasRef.width - 60, cardH = 180;
  ctxRef.fillStyle = 'rgba(255,255,255,0.05)';
  drawRoundedRect(ctxRef, cardX, cardY, cardW, cardH, 20);
  ctxRef.fill();

  ctxRef.fillStyle = '#eeeeee';
  ctxRef.font = '24px sans-serif';
  ctxRef.textAlign = 'left';
  const baseX = 60, baseY = 130, lineH = 40;
  ctxRef.fillText(`🚩 最远关卡：${stats.maxStage}`, baseX, baseY);
  ctxRef.fillText(`💥 最高伤害：${stats.maxDamage}`, baseX, baseY + lineH);
  ctxRef.fillText(`💰 最多金币：${stats.maxGold}`, baseX, baseY + lineH * 2);

  /* ---------- 分享按钮 ---------- */
  const shareBtnW = 160, shareBtnH = 50;
  const shareBtnX = (canvasRef.width - shareBtnW) / 2;
  const shareBtnY = cardY + cardH + 30;

  const shareGradient = ctxRef.createLinearGradient(0, 0, shareBtnW, 0);
  shareGradient.addColorStop(0, '#ffcc33');
  shareGradient.addColorStop(1, '#ffaa00');
  ctxRef.fillStyle = shareGradient;
  drawRoundedRect(ctxRef, shareBtnX, shareBtnY, shareBtnW, shareBtnH, 14);
  ctxRef.fill();

  ctxRef.fillStyle = '#000';
  ctxRef.font = '22px sans-serif';
  ctxRef.textAlign = 'center';
  ctxRef.textBaseline = 'middle';
  ctxRef.fillText('📤 分享', shareBtnX + shareBtnW / 2, shareBtnY + shareBtnH / 2);

  /* ---------- 标签栏 ---------- */
  const tabH = 50;
  const tabY = shareBtnY + shareBtnH + 20;
  const tabW = canvasRef.width / 2;

  ['global', 'friends'].forEach((t, i) => {
    ctxRef.fillStyle = tab === t ? '#ffaa00' : '#555';
    drawRoundedRect(ctxRef, i * tabW + 10, tabY, tabW - 20, tabH, 12);
    ctxRef.fill();

    ctxRef.fillStyle = '#000';
    ctxRef.textAlign = 'center';
    ctxRef.textBaseline = 'middle';
    ctxRef.font = '22px sans-serif';
    ctxRef.fillText(t === 'global' ? '🏅 全服排行' : '👥 好友排行',
                    i * tabW + tabW / 2, tabY + tabH / 2);
  });

  /* ---------- 榜单滚动区 ---------- */
  const listY0 = tabY + tabH + 14;
  const rowH   = 34;
  const viewH  = canvasRef.height - listY0 - 110; // 底部留 110 给返回按钮

  ctxRef.save();
  ctxRef.beginPath();
  ctxRef.rect(0, listY0, canvasRef.width, viewH);
  ctxRef.clip();

  if (tab === 'friends') {
    ctxRef.fillStyle = '#ccc';
    ctxRef.textAlign = 'center';
    ctxRef.font = '20px sans-serif';
    ctxRef.fillText('好友排行开发中，敬请期待……',
                    canvasRef.width / 2, listY0 + viewH / 2);
  } else {
    if (!globalList.length) {
      ctxRef.fillStyle = '#888';
      ctxRef.textAlign = 'center';
      ctxRef.font = '20px sans-serif';
      ctxRef.fillText('加载中…', canvasRef.width / 2, listY0 + viewH / 2);
    } else {
      globalList.forEach((p, idx) => {
        const y = listY0 + idx * rowH + scrollY;
        if (y < listY0 - rowH || y > listY0 + viewH) return;
      
        // --- 左侧昵称：用 openid 尾 4 位当做临时昵称 ---
        const nick = p.nick || ('玩家' + p.openid.slice(-4));
      
        ctxRef.fillStyle = idx < 3 ? '#ffd700' : '#fff';
        ctxRef.textAlign = 'left';
        ctxRef.font = '20px sans-serif';
        ctxRef.fillText(`${idx + 1}. ${truncate(nick, 8)}`, 18, y);
      
        ctxRef.textAlign = 'right';
        ctxRef.fillText(`🚩${p.maxStage}`, canvasRef.width - 18, y);
      });
      
    }
  }
  ctxRef.restore();

  /* ---------- 返回按钮 ---------- */
  const returnBtnW = 160, returnBtnH = 50;
  const returnBtnX = (canvasRef.width - returnBtnW) / 2;
  const returnBtnY = canvasRef.height - returnBtnH - 30;

  ctxRef.fillStyle = '#8800aa';
  drawRoundedRect(ctxRef, returnBtnX, returnBtnY, returnBtnW, returnBtnH, 14);
  ctxRef.fill();

  ctxRef.fillStyle = '#fff';
  ctxRef.textAlign = 'center';
  ctxRef.textBaseline = 'middle';
  ctxRef.font = '22px sans-serif';
  ctxRef.fillText('🔙 返回', returnBtnX + returnBtnW / 2, returnBtnY + returnBtnH / 2);

  /* ---------- 更新交互区域缓存 ---------- */
  rankingShareBtn  = { x: shareBtnX,  y: shareBtnY,  width: shareBtnW,  height: shareBtnH };
  rankingReturnBtn = { x: returnBtnX, y: returnBtnY, width: returnBtnW, height: returnBtnH };
}

/* =============================================================
   触摸事件
   ============================================================= */
function onTouchstart(e) {
  const t = e.touches[0];
  startY = t.clientY;

  /* 点到标签栏？ */
  const tabH = 50;
  const tabY = rankingShareBtn.y + rankingShareBtn.height + 20;
  if (t.clientY >= tabY && t.clientY <= tabY + tabH) {
    tab = t.clientX < canvasRef.width / 2 ? 'global' : 'friends';
    drawRankingUI();
    return;
  }
}

function onTouchmove(e) {
  if (tab !== 'global' || !globalList.length) return;

  const t = e.touches[0];
  const dy = t.clientY - startY;
  startY = t.clientY;

  const rowH = 34;
  const listY0 = rankingShareBtn.y + rankingShareBtn.height + 20 + 50 + 14;
  const viewH  = canvasRef.height - listY0 - 110;
  const contentH = globalList.length * rowH;

  const minOffset = Math.min(0, viewH - contentH);
  const maxOffset = 0;
  scrollY = Math.max(minOffset, Math.min(maxOffset, scrollY + dy));

  drawRankingUI();
}

function onTouchend(e) {
  const touch = e.changedTouches[0];
  const x = touch.clientX;
  const y = touch.clientY;

  /* 返回按钮 */
  if (
    rankingReturnBtn &&
    x >= rankingReturnBtn.x && x <= rankingReturnBtn.x + rankingReturnBtn.width &&
    y >= rankingReturnBtn.y && y <= rankingReturnBtn.y + rankingReturnBtn.height
  ) {
    switchPageFn('home');
    return;
  }

  /* 分享按钮 */
  if (
    rankingShareBtn &&
    x >= rankingShareBtn.x && x <= rankingShareBtn.x + rankingShareBtn.width &&
    y >= rankingShareBtn.y && y <= rankingShareBtn.y + rankingShareBtn.height
  ) {
    shareMyStats();
  }
}

/* =============================================================
   辅助函数
   ============================================================= */
function truncate(str, len) {
  return str.length <= len ? str : str.slice(0, len) + '…';
}

/* =============================================================
   页面循环 (可留空，兼容主循环)
   ============================================================= */
export function updateRankingPage() {}

/* =============================================================
   模块导出
   ============================================================= */
export default {
  init:        initRankingPage,
  update:      updateRankingPage,
  draw:        drawRankingUI,
  onTouchstart,
  onTouchmove,
  onTouchend,
  touchstart:  onTouchstart,
  touchmove:   onTouchmove,
  touchend:    onTouchend,
};
