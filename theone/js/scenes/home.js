export default function drawHome(ctx) {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  ctx.fillStyle = '#fff';
  ctx.font = '40px Arial';
  ctx.fillText('勇者传说', 120, 200);

  ctx.fillStyle = '#0f0';
  ctx.fillRect(100, 400, 200, 60);
  ctx.fillStyle = '#000';
  ctx.font = '24px Arial';
  ctx.fillText('开始游戏', 140, 440);
}
