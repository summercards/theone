let ctxRef;
let switchPageFn;
let canvasRef;

const { drawRoundedRect } = require('./utils/canvas_utils.js');
const { shareMyStats } = require('./utils/share_utils.js');

let rankingShareBtn = null;
let rankingReturnBtn = null;

export function initRankingPage(ctx, switchPage, canvas) {
  ctxRef = ctx;
  switchPageFn = switchPage;
  canvasRef = canvas;

  drawRankingUI();
}

function drawRankingUI() {
  ctxRef.clearRect(0, 0, canvasRef.width, canvasRef.height);

  // 🎨 背景渐变（从深紫到深蓝）
  const gradient = ctxRef.createLinearGradient(0, 0, 0, canvasRef.height);
  gradient.addColorStop(0, "#2f003d");
  gradient.addColorStop(1, "#000033");
  ctxRef.fillStyle = gradient;
  ctxRef.fillRect(0, 0, canvasRef.width, canvasRef.height);

  const stats = wx.getStorageSync('player_stats') || {
    maxStage: 0,
    maxDamage: 0,
    maxGold: 0
  };

  // 🏆 标题
  ctxRef.fillStyle = "#ffd700";
  ctxRef.font = "bold 32px sans-serif";
  ctxRef.textAlign = "center";
  ctxRef.fillText("🏆 我的战绩", canvasRef.width / 2, 60);

  // 📦 成绩内容区域卡片背景
  const cardX = 30;
  const cardY = 90;
  const cardW = canvasRef.width - 60;
  const cardH = 180;

  ctxRef.fillStyle = "rgba(255, 255, 255, 0.05)";
  drawRoundedRect(ctxRef, cardX, cardY, cardW, cardH, 20);
  ctxRef.fill();

  // 成绩内容
  const baseX = 60;
  const baseY = 130;
  const lineHeight = 40;

  ctxRef.fillStyle = "#eeeeee";
  ctxRef.font = "24px sans-serif";
  ctxRef.textAlign = "left";
  ctxRef.fillText(`🚩 最远关卡：${stats.maxStage}`, baseX, baseY);
  ctxRef.fillText(`💥 最高伤害：${stats.maxDamage}`, baseX, baseY + lineHeight);
  ctxRef.fillText(`💰 最多金币：${stats.maxGold}`, baseX, baseY + lineHeight * 2);

  // 📤 分享按钮
  const shareBtnW = 160;
  const shareBtnH = 50;
  const shareBtnX = (canvasRef.width - shareBtnW) / 2;
  const shareBtnY = cardY + cardH + 30;

  const shareGradient = ctxRef.createLinearGradient(0, 0, shareBtnW, 0);
  shareGradient.addColorStop(0, "#ffcc33");
  shareGradient.addColorStop(1, "#ffaa00");
  ctxRef.fillStyle = shareGradient;
  drawRoundedRect(ctxRef, shareBtnX, shareBtnY, shareBtnW, shareBtnH, 14);
  ctxRef.fill();

  ctxRef.fillStyle = "#000";
  ctxRef.font = "22px sans-serif";
  ctxRef.textAlign = "center";
  ctxRef.textBaseline = "middle";
  ctxRef.fillText("📤 分享", shareBtnX + shareBtnW / 2, shareBtnY + shareBtnH / 2);

  // 🔙 返回按钮
  const returnBtnW = 160;
  const returnBtnH = 50;
  const returnBtnX = (canvasRef.width - returnBtnW) / 2;
  const returnBtnY = canvasRef.height - returnBtnH - 30;

  ctxRef.fillStyle = "#8800aa";
  drawRoundedRect(ctxRef, returnBtnX, returnBtnY, returnBtnW, returnBtnH, 14);
  ctxRef.fill();

  ctxRef.fillStyle = "#fff";
  ctxRef.fillText("🔙 返回", returnBtnX + returnBtnW / 2, returnBtnY + returnBtnH / 2);

  // ✅ 存储交互区域
  rankingShareBtn = { x: shareBtnX, y: shareBtnY, width: shareBtnW, height: shareBtnH };
  rankingReturnBtn = { x: returnBtnX, y: returnBtnY, width: returnBtnW, height: returnBtnH };
}

function onTouch(e) {
  const touch = e.changedTouches[0];
  const x = touch.clientX;
  const y = touch.clientY;

  if (
    rankingReturnBtn &&
    x >= rankingReturnBtn.x && x <= rankingReturnBtn.x + rankingReturnBtn.width &&
    y >= rankingReturnBtn.y && y <= rankingReturnBtn.y + rankingReturnBtn.height
  ) {
    switchPageFn("home");
    return;
  }

  if (
    rankingShareBtn &&
    x >= rankingShareBtn.x && x <= rankingShareBtn.x + rankingShareBtn.width &&
    y >= rankingShareBtn.y && y <= rankingShareBtn.y + rankingShareBtn.height
  ) {
    shareMyStats();
    return;
  }
}

export function updateRankingPage() {}

export function onTouchend(e) {
  onTouch(e);
}

export default {
  init: initRankingPage,
  update: updateRankingPage,
  draw: drawRankingUI,
  onTouchend,
  touchend: onTouchend,
};
