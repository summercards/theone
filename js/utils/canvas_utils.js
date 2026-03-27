
function _drawRoundedRect(ctx, x, y, width, height, radius = 8, fill = true, stroke = true) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
  if (fill) ctx.fill();
  if (stroke) ctx.stroke();
}

function _drawStyledText(ctx, text, x, y, {
  font = 'bold 18px IndieFlower',
  fill = '#FFD700',
  stroke = '#000',
  align = 'center',
  baseline = 'middle',
  lineWidth = 2
} = {}) {
  ctx.save();
  ctx.font = font;
  ctx.textAlign = align;
  ctx.textBaseline = baseline;
  ctx.lineWidth = lineWidth;
  ctx.strokeStyle = stroke;
  ctx.fillStyle = fill;
  ctx.strokeText(text, x, y);
  ctx.fillText(text, x, y);
  ctx.restore();
}

function getBounceScale(isPressed, releaseTime, currentTime) {
  if (isPressed) return 0.92;
  if (!releaseTime) return 1.0;
  const dt = currentTime - releaseTime;
  const duration = 300;
  if (dt < duration) {
    const progress = dt / duration;
    const amplitude = 0.2 * (1 - progress);
    return 1.0 + amplitude * Math.sin(progress * Math.PI * 3);
  }
  return 1.0;
}

function drawWithCenterScale(ctx, x, y, w, h, scale, drawCallback) {
  if (scale === 1.0) {
    drawCallback();
    return;
  }
  const cx = x + w / 2;
  const cy = y + h / 2;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);
  ctx.translate(-cx, -cy);
  drawCallback();
  ctx.restore();
}

module.exports = {
  drawRoundedRect: _drawRoundedRect,
  drawStyledText: _drawStyledText,
  getBounceScale,
  drawWithCenterScale
};
