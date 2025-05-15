let ctxRef;
let switchPageFn;
let canvasRef;

const { drawRoundedRect } = require('./utils/canvas_utils.js'); // ✅ 引入你的圆角工具

export function initRankingPage(ctx, switchPage, canvas) {
  ctxRef = ctx;
  switchPageFn = switchPage;
  canvasRef = canvas;

  drawRankingUI();
  canvasRef.addEventListener("touchstart", onTouch);
}

function drawRankingUI() {
  ctxRef.clearRect(0, 0, canvasRef.width, canvasRef.height);

  // 🎨 背景（深紫）
  ctxRef.fillStyle = "#2f003d";
  ctxRef.fillRect(0, 0, canvasRef.width, canvasRef.height);

  const stats = wx.getStorageSync('player_stats') || {
    maxStage: 0,
    maxDamage: 0,
    maxGold: 0
  };

  // 🏆 标题
  ctxRef.fillStyle = "#ffd700";
  ctxRef.font = "bold 28px sans-serif";
  ctxRef.textAlign = "left";
  ctxRef.fillText("我的战绩", 30, 60);

  // 📦 成绩内容区域
  const baseX = 50;
  const baseY = 120;
  const lineHeight = 40;

  ctxRef.fillStyle = "#fff";
  ctxRef.font = "24px sans-serif";
  ctxRef.textAlign = "left";
  ctxRef.fillText(`最远关卡：${stats.maxStage}`, baseX, baseY);
  ctxRef.fillText(`最高伤害：${stats.maxDamage}`, baseX, baseY + lineHeight);
  ctxRef.fillText(`最多金币：${stats.maxGold}`, baseX, baseY + lineHeight * 2);

  // 📤 分享按钮（黄底圆角）
  const shareBtnW = 140;
  const shareBtnH = 50;
  const shareBtnX = (canvasRef.width - shareBtnW) / 2;
  const shareBtnY = baseY + lineHeight * 3 + 30;

  ctxRef.fillStyle = "#ffcc00";
  drawRoundedRect(ctxRef, shareBtnX, shareBtnY, shareBtnW, shareBtnH, 12);
  ctxRef.fill();

  ctxRef.fillStyle = "#000";
  ctxRef.font = "22px sans-serif";
  ctxRef.textAlign = "center";
  ctxRef.textBaseline = "middle";
  ctxRef.fillText("分享", shareBtnX + shareBtnW / 2, shareBtnY + shareBtnH / 2);

  // 🔙 返回按钮（紫底圆角）
  const returnBtnW = 140;
  const returnBtnH = 50;
  const returnBtnX = (canvasRef.width - returnBtnW) / 2;
  const returnBtnY = canvasRef.height - returnBtnH - 30;

  ctxRef.fillStyle = "#8800aa";
  drawRoundedRect(ctxRef, returnBtnX, returnBtnY, returnBtnW, returnBtnH, 12);
  ctxRef.fill();

  ctxRef.fillStyle = "#fff";
  ctxRef.fillText("返回", returnBtnX + returnBtnW / 2, returnBtnY + returnBtnH / 2);

  // ✅ 存储按钮交互区域
  globalThis.rankingShareBtn = { x: shareBtnX, y: shareBtnY, width: shareBtnW, height: shareBtnH };
  globalThis.rankingReturnBtn = { x: returnBtnX, y: returnBtnY, width: returnBtnW, height: returnBtnH };
}

function onTouch(e) {
  const touch = e.touches[0];
  const x = touch.clientX;
  const y = touch.clientY;

  const shareBtn = globalThis.rankingShareBtn;
  const returnBtn = globalThis.rankingReturnBtn;

  if (
    returnBtn &&
    x >= returnBtn.x && x <= returnBtn.x + returnBtn.width &&
    y >= returnBtn.y && y <= returnBtn.y + returnBtn.height
  ) {
    switchPageFn("home");
    canvasRef.removeEventListener("touchstart", onTouch);
    return;
  }

  if (
    shareBtn &&
    x >= shareBtn.x && x <= shareBtn.x + shareBtn.width &&
    y >= shareBtn.y && y <= shareBtn.y + shareBtn.height
  ) {
    const { shareMyStats } = require('./utils/share_utils.js');
    shareMyStats();
    return;
  }
}
