/* =============================================================
   page_ranking.js — 我的战绩 + 全服 Top100（显示昵称+最高伤害+我的排名）+ 好友占位
   ============================================================= */

/* ---------- 依赖 ---------- */
const { drawRoundedRect } = require('./utils/canvas_utils.js');
const { shareMyStats }   = require('./utils/share_utils.js');
const { setProfile }     = require('./utils/cloud_save.js');

/* ---------- 画布 & 状态缓存 ---------- */
let ctxRef, switchPageFn, canvasRef;
let rankingShareBtn, rankingReturnBtn, authorizeBtn = null;
let tab = 'global';         // 'global' | 'friends'
let globalList = [];        // Top100 数据
let scrollY = 0, startY = 0;
let userOpenId = '', myRank = '';
let pressedControl = '';
let controlPressUntil = 0;

function isPressed(key) {
  return pressedControl === key && Date.now() < controlPressUntil;
}

function flashControl(key, duration = 120) {
  pressedControl = key;
  controlPressUntil = Date.now() + duration;
  drawRankingUI();
  setTimeout(() => {
    if (pressedControl === key) {
      pressedControl = '';
      drawRankingUI();
    }
  }, duration);
}

/* =============================================================
   云函数调用：拉取 Top100 并计算我的排名
   ============================================================= */
async function fetchGlobalRanking() {
  const [{ result: loginRes }, { result: rankRes }] = await Promise.all([
    wx.cloud.callFunction({ name: 'login' }),
    wx.cloud.callFunction({ name: 'getTop100' })
  ]);
  userOpenId = loginRes;            // 当前用户 openid
  globalList = rankRes.top || [];   // 拿到 Top100 阵列

  // 计算我的排名（如在 Top100 内）
  const idx = globalList.findIndex(p => p.openid === userOpenId);
  myRank = idx >= 0 ? (idx + 1) : '>100';

  return globalList;
}

/* =============================================================
   页面初始化
   ============================================================= */
export async function initRankingPage(ctx, switchPage, canvas) {
  ctxRef       = ctx;
  switchPageFn = switchPage;
  canvasRef    = canvas;

  // 1) 先画静态框架
  drawRankingUI();

  // 2) 再拉数据 & 重绘
  await fetchGlobalRanking();
  drawRankingUI();
}

/* =============================================================
   主绘制函数
   ============================================================= */
function drawRankingUI() {
  if (!ctxRef || !canvasRef) return;

  ctxRef.clearRect(0, 0, canvasRef.width, canvasRef.height);

  const bg = ctxRef.createLinearGradient(0, 0, 0, canvasRef.height);
  bg.addColorStop(0, '#2f003d');
  bg.addColorStop(1, '#000033');
  ctxRef.fillStyle = bg;
  ctxRef.fillRect(0, 0, canvasRef.width, canvasRef.height);

  const stats = wx.getStorageSync('player_stats') || { maxStage:0, maxDamage:0, maxGold:0 };
  const cardX=30, cardY=90, cardW=canvasRef.width-60, cardH=220;
  ctxRef.fillStyle = 'rgba(255,255,255,0.05)';
  drawRoundedRect(ctxRef, cardX, cardY, cardW, cardH, 20);
  ctxRef.fill();

  ctxRef.fillStyle = '#ffd700';
  ctxRef.font      = 'bold 32px sans-serif';
  ctxRef.textAlign = 'center';
  ctxRef.fillText('🏆 我的战绩', canvasRef.width/2, 60);

  ctxRef.fillStyle = '#eeeeee';
  ctxRef.font      = '24px sans-serif';
  ctxRef.textAlign = 'left';
  const baseX=60, baseY=130, lineH=40;
  ctxRef.fillText(`🚩 最远关卡：${stats.maxStage}`, baseX, baseY);
  ctxRef.fillText(`💥 最高伤害：${stats.maxDamage}`, baseX, baseY+lineH);
  ctxRef.fillText(`💰 最多金币：${stats.maxGold}`,   baseX, baseY+2*lineH);

  ctxRef.fillStyle = '#ffcc33';
  ctxRef.font      = '26px sans-serif';
  ctxRef.textAlign = 'center';
  ctxRef.fillText(`🏅 我的排名：${myRank}`, canvasRef.width/2, baseY+3*lineH);

  const shareW=160, shareH=50;
  const shareX=(canvasRef.width-shareW)/2, shareY=cardY+cardH+30;
  const shareG = ctxRef.createLinearGradient(0,0,shareW,0);
  shareG.addColorStop(0,'#ffcc33');
  shareG.addColorStop(1,'#ffaa00');
  ctxRef.fillStyle = isPressed('share') ? '#ffd85a' : shareG;
  drawRoundedRect(ctxRef, shareX, shareY, shareW, shareH, 14);
  ctxRef.fill();

  ctxRef.fillStyle    = '#000';
  ctxRef.font         = '22px sans-serif';
  ctxRef.textAlign    = 'center';
  ctxRef.textBaseline = 'middle';
  ctxRef.fillText('📤 分享', shareX+shareW/2, shareY+shareH/2);

  const tabY=shareY+shareH+20, tabH=50, tabW=canvasRef.width/2;
  ['global','friends'].forEach((t,i)=>{
    ctxRef.fillStyle = isPressed(`tab-${t}`) ? '#ffe06a' : (tab===t? '#ffaa00':'#555');
    drawRoundedRect(ctxRef, i*tabW+10, tabY, tabW-20, tabH, 12);
    ctxRef.fill();
    ctxRef.fillStyle = '#000';
    ctxRef.font      = '22px sans-serif';
    ctxRef.textAlign = 'center';
    ctxRef.textBaseline = 'middle';
    ctxRef.fillText(
      t==='global'? '🏅 全服排行' : '👥 好友排行',
      i*tabW+tabW/2, tabY+tabH/2
    );
  });

  const listY0 = tabY+tabH+60;
  const returnH = 50, returnY = canvasRef.height - returnH - 30;
  const viewH = returnY - (listY0 + 10);

  ctxRef.save();
  ctxRef.beginPath();
  ctxRef.rect(0, listY0, canvasRef.width, viewH);
  ctxRef.clip();

  if (tab==='friends') {
    ctxRef.fillStyle = '#888';
    ctxRef.font      = '20px sans-serif';
    ctxRef.textAlign = 'center';
    ctxRef.fillText('好友排行开发中，敬请期待…',
                    canvasRef.width/2, listY0+viewH/2);
  } else {
    if (!globalList.length) {
      ctxRef.fillStyle = '#888';
      ctxRef.font      = '20px sans-serif';
      ctxRef.textAlign = 'center';
      ctxRef.fillText('加载中…',
                      canvasRef.width/2, listY0+viewH/2);
    } else {
      globalList.forEach((p,idx)=>{
        const paddingTop = 20;
        const y = listY0 + paddingTop + idx * 34 + scrollY;
        if (y < listY0-34 || y > listY0+viewH) return;
        const name = (p.nick && p.nick.trim()) || ('玩家' + (p.openid || '').slice(-4));
        ctxRef.fillStyle = idx<3? '#ffd700':'#fff';
        ctxRef.font      = '20px sans-serif';
        ctxRef.textAlign = 'left';
        ctxRef.fillText(`${idx+1}. ${name}`, 18, y);
        ctxRef.textAlign = 'right';
        ctxRef.fillText(`💥 ${p.maxDamage}`, canvasRef.width-18, y);
      });
    }
  }
  ctxRef.restore();

  const authorizeW = 160, authorizeH = 50;
  const backW = 160, gap = 20;
  const totalW = authorizeW + backW + gap;
  const authorizeX = (canvasRef.width - totalW) / 2;
  const authorizeY = returnY;
  const backX = authorizeX + authorizeW + gap;

  const nick = wx.getStorageSync('nick') || '';
  if (!nick.trim()) {
    ctxRef.fillStyle = isPressed('authorize') ? '#7fe4ff' : '#33ccff';
    drawRoundedRect(ctxRef, authorizeX, authorizeY, authorizeW, authorizeH, 14);
    ctxRef.fill();
    ctxRef.fillStyle = '#000';
    ctxRef.font = '22px sans-serif';
    ctxRef.textAlign = 'center';
    ctxRef.textBaseline = 'middle';
    ctxRef.fillText('🔓 授权登录', authorizeX + authorizeW / 2, authorizeY + authorizeH / 2);
    authorizeBtn = { x: authorizeX, y: authorizeY, width: authorizeW, height: authorizeH };
  } else {
    authorizeBtn = null;
  }

  ctxRef.fillStyle = isPressed('back') ? '#b54ad0' : '#8800aa';
  drawRoundedRect(ctxRef, backX, returnY, backW, returnH, 14);
  ctxRef.fill();
  ctxRef.fillStyle    = '#fff';
  ctxRef.font         = '22px sans-serif';
  ctxRef.textAlign    = 'center';
  ctxRef.textBaseline = 'middle';
  ctxRef.fillText('🔙 返回', backX+backW/2, returnY+returnH/2);

  rankingShareBtn  = { x:shareX,  y:shareY,  width:shareW,  height:shareH };
  rankingReturnBtn = { x:backX,   y:returnY, width:backW,  height:returnH };
}

/* ---------- 触摸处理 ---------- */
function onTouchstart(e) {
  const t = e.touches[0];
  startY = t.clientY;
  const tabY = rankingShareBtn.y+rankingShareBtn.height+20;
  if (t.clientY>=tabY && t.clientY<=tabY+50) {
    tab = t.clientX < canvasRef.width / 2 ? 'global' : 'friends';
    scrollY = 0;
    flashControl(`tab-${tab}`);
    return;
  }
}
function onTouchmove(e) {
  if (tab!=='global' || !globalList.length) return;
  const t = e.touches[0], dy = t.clientY - startY;
  startY = t.clientY;
  const listY0 = rankingShareBtn.y+rankingShareBtn.height+20+50+14;
  const returnY= canvasRef.height-50-30;
  const viewH = returnY - (listY0 + 10);
  const contentH = globalList.length*34;
  const minY = Math.min(0, viewH - contentH), maxY = 0;
  scrollY = Math.max(minY, Math.min(maxY, scrollY + dy));
  drawRankingUI();
}
function onTouchend(e) {
  const t = e.changedTouches[0], x=t.clientX, y=t.clientY;

  if (x>=rankingReturnBtn.x && x<=rankingReturnBtn.x+rankingReturnBtn.width &&
      y>=rankingReturnBtn.y && y<=rankingReturnBtn.y+rankingReturnBtn.height) {
    flashControl('back');
    setTimeout(() => switchPageFn('home'), 120);
    return;
  }

  if (x>=rankingShareBtn.x && x<=rankingShareBtn.x+rankingShareBtn.width &&
      y>=rankingShareBtn.y && y<=rankingShareBtn.y+rankingShareBtn.height) {
    flashControl('share');
    shareMyStats();
    return;
  }

  if (authorizeBtn &&
    x >= authorizeBtn.x && x <= authorizeBtn.x + authorizeBtn.width &&
    y >= authorizeBtn.y && y <= authorizeBtn.y + authorizeBtn.height) {
  flashControl('authorize');
  console.log('[授权按钮] 命中点击区域', x, y);
  wx.getUserProfile({
    desc: '用于展示排行榜昵称和头像',
    success: res => {
      console.log('[授权成功]', res);
      setProfile({
        nick: res.userInfo.nickName,
        avatar: res.userInfo.avatarUrl,
      });
      authorizeBtn = null;
      drawRankingUI();
    },
    fail: err => {
      console.warn('[授权失败]', err);
    }
  });
  return;
}
}

function truncate(s,l){ return s.length<=l? s: s.slice(0,l)+'…'; }

export function updateRankingPage() {}

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
