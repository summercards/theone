export default function drawHeroSelect(ctx) {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.fillStyle = '#111';
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  ctx.fillStyle = '#fff';
  ctx.font = '28px Arial';
  ctx.fillText('请选择你的英雄', 100, 100);

  for (let i = 0; i < 5; i++) {
    let x = 60 + i * 130;
    ctx.fillStyle = '#ccc';
    ctx.fillRect(x, 200, 100, 100);
    ctx.fillStyle = '#000';
    ctx.fillText('H' + (i + 1), x + 30, 260);
  }
}
