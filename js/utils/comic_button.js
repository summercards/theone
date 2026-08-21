// 高对比硬边漫画按钮：斜切角、错位黑色投影、斜纹高光与点按下沉。
const PALETTES = {
  red:    { fill: '#F1264B', accent: '#FF6C86', text: '#FFFFFF' },
  cyan:   { fill: '#00B9D8', accent: '#75F5FF', text: '#071018' },
  yellow: { fill: '#FFC928', accent: '#FFF09A', text: '#13100A' },
  purple: { fill: '#8B35D5', accent: '#D796FF', text: '#FFFFFF' },
  green:  { fill: '#27B56B', accent: '#96FFC0', text: '#06150C' },
  dark:   { fill: '#303449', accent: '#777E9E', text: '#FFFFFF' },
  gray:   { fill: '#4A4A58', accent: '#88889A', text: '#FFFFFF' }
};

function clippedPanel(ctx, x, y, width, height, cut) {
  ctx.beginPath();
  ctx.moveTo(x + cut, y);
  ctx.lineTo(x + width, y);
  ctx.lineTo(x + width - cut, y + height);
  ctx.lineTo(x, y + height);
  ctx.closePath();
}

function drawComicButton(ctx, {
  x, y, width, height, label,
  variant = 'red', pressed = false, disabled = false,
  font = 'bold 18px sans-serif', textScale = 1
}) {
  const colors = PALETTES[variant] || PALETTES.red;
  const cut = Math.max(5, Math.min(13, Math.round(height * 0.23)));
  const pressOffset = pressed ? 4 : 0;
  const px = x, py = y + pressOffset;
  const fill = disabled ? '#292935' : colors.fill;
  const text = disabled ? '#9494A0' : colors.text;

  ctx.save();
  // 右下错位黑影，提供按键厚度和硬朗的视觉锚点。
  ctx.fillStyle = '#06060A';
  clippedPanel(ctx, x + 5, y + 6, width, height, cut);
  ctx.fill();

  ctx.fillStyle = fill;
  clippedPanel(ctx, px, py, width, height, cut);
  ctx.fill();
  ctx.strokeStyle = '#08080E';
  ctx.lineWidth = 3;
  ctx.stroke();

  if (!disabled) {
    ctx.save();
    clippedPanel(ctx, px, py, width, height, cut);
    ctx.clip();
    ctx.globalAlpha = pressed ? 0.18 : 0.30;
    ctx.fillStyle = colors.accent;
    ctx.beginPath();
    ctx.moveTo(px - width * 0.12, py);
    ctx.lineTo(px + width * 0.25, py);
    ctx.lineTo(px + width * 0.08, py + height);
    ctx.lineTo(px - width * 0.29, py + height);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    ctx.strokeStyle = colors.accent;
    ctx.globalAlpha = 0.7;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(px + cut + 3, py + 4);
    ctx.lineTo(px + width - 10, py + 4);
    ctx.stroke();
  }

  ctx.globalAlpha = 1;
  ctx.font = font;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = Math.max(2, Math.round(2.5 * textScale));
  ctx.strokeStyle = '#08080E';
  ctx.strokeText(label, px + width / 2, py + height / 2 + 1);
  ctx.fillStyle = text;
  ctx.fillText(label, px + width / 2, py + height / 2 + 1);
  ctx.restore();
}

function drawComicHealthBar(ctx, {
  x, y, width, height, ratio, label,
  side = 'enemy', hit = false, boss = false, critical = false
}) {
  const safeRatio = Math.max(0, Math.min(1, Number.isFinite(ratio) ? ratio : 0));
  const cut = Math.max(4, Math.round(height * 0.28));
  const palette = side === 'player'
    ? { fill: '#FFB20F', accent: '#FFF48A', glow: '#00E6D1' }
    : { fill: '#F1264B', accent: '#FF8BA2', glow: '#FF2C70' };
  const innerX = x + 5, innerY = y + 4, innerW = width - 10, innerH = height - 8;

  ctx.save();
  // 强烈的右下阴影让状态条与按钮共享同一视觉层级。
  ctx.fillStyle = '#05050A';
  clippedPanel(ctx, x + 4, y + 4, width, height, cut);
  ctx.fill();
  ctx.fillStyle = '#171522';
  clippedPanel(ctx, x, y, width, height, cut);
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = hit ? '#FFFFFF' : '#09090F';
  ctx.stroke();

  if (safeRatio > 0) {
    const filledW = Math.max(cut, innerW * safeRatio);
    const grad = ctx.createLinearGradient(innerX, innerY, innerX + filledW, innerY);
    grad.addColorStop(0, palette.fill);
    grad.addColorStop(0.55, palette.fill);
    grad.addColorStop(1, palette.accent);
    ctx.save();
    clippedPanel(ctx, innerX, innerY, innerW, innerH, Math.max(2, cut - 3));
    ctx.clip();
    ctx.fillStyle = grad;
    ctx.fillRect(innerX, innerY, filledW, innerH);
    ctx.globalAlpha = 0.38;
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.moveTo(innerX - 8, innerY);
    ctx.lineTo(innerX + filledW * 0.48, innerY);
    ctx.lineTo(innerX + filledW * 0.30, innerY + innerH);
    ctx.lineTo(innerX - 25, innerY + innerH);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  if (boss || critical) {
    const pulse = 0.45 + (Math.sin(Date.now() / (critical ? 80 : 150)) + 1) * 0.2;
    ctx.strokeStyle = boss ? `rgba(255, 61, 104, ${pulse})` : `rgba(255, 236, 90, ${pulse})`;
    ctx.lineWidth = boss ? 3 : 2;
    ctx.shadowColor = palette.glow;
    ctx.shadowBlur = boss ? 10 : 6;
    clippedPanel(ctx, x - 2, y - 2, width + 4, height + 4, cut + 1);
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  ctx.font = `bold ${Math.max(11, Math.round(height * 0.58))}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#09090F';
  ctx.strokeText(label, x + width / 2, y + height / 2 + 1);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(label, x + width / 2, y + height / 2 + 1);
  ctx.restore();
}

module.exports = { drawComicButton, drawComicHealthBar };
