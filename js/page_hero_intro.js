const pageFlipAudio = wx.createInnerAudioContext();
pageFlipAudio.src = 'sounds/page_flip.mp3';
pageFlipAudio.obeyMuteSwitch = false; // 可选：静音模式下仍播放

// js/page_hero_intro.js
const HeroData = require('./data/hero_data.js');
const { HeroState, getRequiredExpForLevel } = require('./data/hero_state.js');
const { drawRoundedRect, drawStyledText } = require('./utils/canvas_utils.js');
const lockIconImg = wx.createImage();
lockIconImg.src = 'assets/ui/lock.png';
globalThis.imageCache = globalThis.imageCache || {};
lockIconImg.onload = () => {
  globalThis.imageCache['lock'] = lockIconImg;
};
let ctxRef, canvasRef, switchPageFn;
let pageIndex = 0;
let btnPrevRect = null, btnNextRect = null, btnBackRect = null;
let heroRects = [];
let popupHero = null;
const HEROES_PER_PAGE = 5;
let pressedKey = '';
let pressUntil = 0;
let pendingAction = false;

function isPressed(key) {
  return pressedKey === key && Date.now() < pressUntil;
}

function press(key, duration = 110) {
  pressedKey = key;
  pressUntil = Date.now() + duration;
  render();
}

function init(ctx, switchPage, canvas) {
  ctxRef = ctx;
  switchPageFn = switchPage;
  canvasRef = canvas;
  render();
}

function update() {}
function destroy() {}
function touchstart(e) {
  const touch = e.touches?.[0];
  if (!touch || popupHero) return;
  const { clientX: x, clientY: y } = touch;
  if (btnPrevRect && hit(x, y, btnPrevRect) && pageIndex > 0) return press('prev');
  if (btnNextRect && hit(x, y, btnNextRect) && (pageIndex + 1) * HEROES_PER_PAGE < HeroData.heroes.length) return press('next');
  if (btnBackRect && hit(x, y, btnBackRect)) return press('back');
  const card = heroRects.find(({ rect, hero }) => !hero.locked && hit(x, y, rect));
  if (card) press(`hero-${card.hero.id}`);
}
function touchend(e) {
  const touch = e.changedTouches[0];
  const x = touch.clientX;
  const y = touch.clientY;

  if (popupHero) {
    popupHero = null;
    return render();
  }

  if (pendingAction) return;
  if (btnPrevRect && hit(x, y, btnPrevRect) && pageIndex > 0) {
    pendingAction = true;
    pageFlipAudio.play();
    return setTimeout(() => { pageIndex--; pendingAction = false; render(); }, 105);
  }
  if (btnNextRect && hit(x, y, btnNextRect) && (pageIndex + 1) * HEROES_PER_PAGE < HeroData.heroes.length) {
    pendingAction = true;
    pageFlipAudio.play();
    return setTimeout(() => { pageIndex++; pendingAction = false; render(); }, 105);
  }
  
  if (btnBackRect && hit(x, y, btnBackRect)) {
    pendingAction = true;
    return setTimeout(() => switchPageFn('home'), 105);
  }
  for (const { rect, hero } of heroRects) {
    if (hit(x, y, rect)) {
      if (hero.locked) {
        wx.showToast({ title: '英雄未解锁', icon: 'none' });
        return;
      }
      pendingAction = true;
      return setTimeout(() => { popupHero = hero; pendingAction = false; render(); }, 105);
    }
  }
}

function hit(px, py, rect) {
  return rect && px >= rect.x && px <= rect.x + rect.width && py >= rect.y && py <= rect.y + rect.height;
}

function getSkillDescription(hero) {
  const level = hero.level ?? 1;
  const effect = hero.skill?.effect ?? {};
  let text = "";

  switch (effect.type) {
    case "addGauge": {
      const source = effect.source ?? "physical";
      const scale = effect.scale ?? 1;
      const amount = Math.round((hero.attributes?.[source] ?? 0) * scale);
      text = `将${source === "physical" ? "物理攻击" : "法术攻击"}注入伤害槽，<highlight>+${amount}</highlight>`;
      break;
    }

    case "mulGauge": {
      const factor = effect.factor ?? 1;
      text = `将当前伤害翻倍：<highlight>×${factor.toFixed(2)}</highlight>`;
      break;
    }

    case "magicalDamage":
    case "physicalDamage": {
      text = `造成<highlight>${effect.amount}</highlight>点${effect.type === "magicalDamage" ? "法术" : "物理"}伤害`;
      break;
    }

    case "clearCoinBlocks": {
      const coin = (effect.coinPerBlock ?? 5) + (level - 1);
      text = `清除所有金币方块，每个获得<highlight>${coin}</highlight>金币`;
      break;
    }

    case "convertToEBlocks": {
      const count = 2 + (level - 1);
      text = `随机将<highlight>${count}</highlight>个非E方块转为E方块`;
      break;
    }

    case "convertToDBlocks": {
      const baseCount = effect.baseCount ?? effect.count ?? 3;
      const count = baseCount + (level - 1);
      text = `随机将<highlight>${count}</highlight>个非金币方块转为金币方块（D）`;
      break;
    }

    case "boostAllGauge": {
      const percent = 10 + level;
      text = `所有英雄技能条充能<highlight>+${percent}%</highlight>`;
      break;
    }

    case "multiHitPhysical": {
      const baseHits = effect.baseHits ?? 2;
      const growthPerLevel = effect.growthPerLevel ?? 1;
      const scaleStep = effect.scaleStep ?? 0.1;
      const totalHits = baseHits + Math.floor((level - 1) / growthPerLevel);
      const scales = Array.from({ length: totalHits }, (_, i) =>
        (1 + i * scaleStep).toFixed(1)
      );
      text = `连续斩击<highlight>${totalHits}</highlight>次，倍率依次为：<highlight>${scales.join(' / ')}</highlight>`;
      break;
    }

    default:
      text = hero.skill?.description ?? "未知技能";
  }

  return text;
}



function render() {
  const ctx = ctxRef, canvas = canvasRef;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#2a003f';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const margin = 16;
  const cardW = canvas.width - margin * 2;
  const cardH = 90;
  const gap = 14;
  const startX = margin;
  const startY = 100;

  const startIdx = pageIndex * HEROES_PER_PAGE;
  const endIdx = startIdx + HEROES_PER_PAGE;
  const heroesToShow = HeroData.heroes.slice(startIdx, endIdx).map(h => new HeroState(h.id));

  heroRects = [];
  heroesToShow.forEach((hero, i) => {
    const x = startX;
    const y = startY + i * (cardH + gap);

    const rect = { x, y, width: cardW, height: cardH };
    ctx.fillStyle = isPressed(`hero-${hero.id}`) ? '#674088' : '#3e205c';
    drawRoundedRect(ctx, x, y, cardW, cardH, 10, true, false);

    const imgSize = 54;
    const imgX = x + 12;
    const imgY = y + (cardH - imgSize) / 2;
    const img = globalThis.imageCache[hero.icon];
    if (img) {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(imgX + 8, imgY);
      ctx.arcTo(imgX + imgSize, imgY, imgX + imgSize, imgY + imgSize, 8);
      ctx.arcTo(imgX + imgSize, imgY + imgSize, imgX, imgY + imgSize, 8);
      ctx.arcTo(imgX, imgY + imgSize, imgX, imgY, 8);
      ctx.arcTo(imgX, imgY, imgX + imgSize, imgY, 8);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(img, imgX, imgY, imgSize, imgSize);
      ctx.restore();

      if (hero.locked) {
        ctx.save();
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = '#000';
        drawRoundedRect(ctx, imgX, imgY, imgSize, imgSize, 8, true, false);
        ctx.globalAlpha = 1;

        const lockImg = globalThis.imageCache?.['lock'];
        if (lockImg && lockImg.complete) {
          ctx.drawImage(lockImg, imgX + 10, imgY + 10, 32, 32);
        } else {
          drawStyledText(ctx, '🔒', imgX + imgSize / 2, imgY + imgSize / 2, {
            font: '16px sans-serif', fill: '#FFF', align: 'center', baseline: 'middle'
          });
        }
        ctx.restore();
      }
    }

    const textX = imgX + imgSize + 12;
    let textY = imgY;

    drawStyledText(ctx, hero.name, textX, textY, {
      font: 'bold 16px IndieFlower', fill: '#f9c74f', align: 'left', baseline: 'top'
    });
    textY += 20;

    drawStyledText(ctx, `职业：${hero.role}`, textX, textY, {
      font: 'bold 13px IndieFlower', fill: '#fefae0', align: 'left', baseline: 'top'
    });
    textY += 20;

    const attrs = hero.attributes;
    const attrMap = { physical: '物理', magical: '法术', healing: '治疗' };
    const attrText = Object.entries(attrs)
      .map(([k, v]) => `${attrMap[k] || k}: ${v}`)
      .join('  ');
    drawStyledText(ctx, attrText, textX, textY, {
      font: 'bold 12px IndieFlower', fill: '#90e0ef', align: 'left', baseline: 'top'
    });
    

    drawStyledText(ctx, `Lv.${hero.level}`, x + cardW - 12, y + 16, {
      font: 'bold 12px IndieFlower', fill: '#00FFFF', align: 'right', baseline: 'top'
    });
// 新增：显示当前经验 / 升级所需经验
const exp = hero.exp ?? 0;
const expToNext = getRequiredExpForLevel(hero.level); // ✅ 使用统一函数计算
drawStyledText(ctx, `经验：${exp} / ${expToNext}`, x + cardW - 12, y + 36, {
  font: 'bold 12px IndieFlower',
  fill: '#90ee90',
  align: 'right',
  baseline: 'top'
});
drawStyledText(ctx, `HP：${hero.hp}`, x + cardW - 12, y + 56, {
  font: 'bold 12px IndieFlower',
  fill: '#ff6b6b',
  align: 'right',
  baseline: 'top'
});
    heroRects.push({ rect, hero });
  });

  const btnW = 90, btnH = 32;
  const centerY = canvas.height - btnH - 50;
  btnPrevRect = { x: canvas.width / 2 - btnW - 10, y: centerY, width: btnW, height: btnH };
  btnNextRect = { x: canvas.width / 2 + 10, y: centerY, width: btnW, height: btnH };
  btnBackRect = { x: 16, y: 16, width: 64, height: 30 };

  ctx.fillStyle = isPressed('prev') ? '#8a5bb1' : '#5e3a7d';
  drawRoundedRect(ctx, btnPrevRect.x, btnPrevRect.y, btnPrevRect.width, btnPrevRect.height, 6, true, false);
  ctx.fillStyle = isPressed('next') ? '#8a5bb1' : '#5e3a7d';
  drawRoundedRect(ctx, btnNextRect.x, btnNextRect.y, btnNextRect.width, btnNextRect.height, 6, true, false);
  ctx.fillStyle = isPressed('back') ? '#8a5bb1' : '#5e3a7d';
  drawRoundedRect(ctx, btnBackRect.x, btnBackRect.y, btnBackRect.width, btnBackRect.height, 6, true, false);

  drawStyledText(ctx, '< 上一页', btnPrevRect.x + btnW / 2, btnPrevRect.y + btnH / 2, { font: 'bold 14px IndieFlower', fill: '#fff', align: 'center', baseline: 'middle' });
  drawStyledText(ctx, '下一页 >', btnNextRect.x + btnW / 2, btnNextRect.y + btnH / 2, { font: 'bold 14px IndieFlower', fill: '#fff', align: 'center', baseline: 'middle' });
  drawStyledText(ctx, '返回', btnBackRect.x + btnBackRect.width / 2, btnBackRect.y + btnBackRect.height / 2, { font: 'bold 14px IndieFlower', fill: '#fff', align: 'center', baseline: 'middle' });

  if (popupHero) drawPopup(ctx, canvas, popupHero);
}

function drawPopup(ctx, canvas, hero) {
  const maxWidth = canvas.width * 0.85;
  const padding = 20;
  const lineHeight = 24;
  const innerWidth = maxWidth - padding * 2;

  const desc = getSkillDescription(hero);
  const rawSegments = desc.split(/<highlight>|<\/highlight>/);
  const wrappedLines = [];
  const highlightFlags = [];

  const font = 'bold 13px IndieFlower';
  ctx.font = font;

  rawSegments.forEach((segment, idx) => {
    if (!segment.trim()) return;
    const isHighlight = idx % 2 === 1;
    let line = '';
    for (const ch of segment) {
      const testLine = line + ch;
      if (ctx.measureText(testLine).width > innerWidth) {
        wrappedLines.push(line);
        highlightFlags.push(isHighlight);
        line = ch;
      } else {
        line = testLine;
      }
    }
    if (line) {
      wrappedLines.push(line);
      highlightFlags.push(isHighlight);
    }
  });

  const dynamicHeight = padding * 2 + (wrappedLines.length + 3) * lineHeight;
  const W = maxWidth;
  const H = dynamicHeight;
  const x = (canvas.width - W) / 2;
  const y = (canvas.height - H) / 2;

  ctx.fillStyle = '#222';
  drawRoundedRect(ctx, x, y, W, H, 10, true, false);

  let cy = y + padding;

  drawStyledText(ctx, `${hero.name}（等级 ${hero.level}）`, x + padding, cy, {
    font: 'bold 16px IndieFlower', fill: '#FFD700', align: 'left', baseline: 'top'
  });
  cy += lineHeight;

  drawStyledText(ctx, `职业：${hero.role}`, x + padding, cy, {
    font: 'bold 14px IndieFlower', fill: '#FFF', align: 'left', baseline: 'top'
  });
  cy += lineHeight;

  drawStyledText(ctx, `技能：${hero.skill.name}`, x + padding, cy, {
    font: 'bold 14px IndieFlower', fill: '#66CCFF', align: 'left', baseline: 'top'
  });
  cy += lineHeight;

  wrappedLines.forEach((line, i) => {
    drawStyledText(ctx, line, x + padding, cy, {
      font,
      fill: highlightFlags[i] ? '#FFD700' : '#EEE',
      align: 'left',
      baseline: 'top'
    });
    cy += lineHeight;
  });

  drawStyledText(ctx, '点击任意处关闭', x + W / 2, y + H - padding, {
    font: 'bold 12px IndieFlower', fill: '#AAA', align: 'center', baseline: 'top'
  });
}

export default {
  init,
  update,
  draw: render,
  destroy,
  touchstart,
  touchend
};
