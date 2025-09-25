const VictoryDialogLines = [
  "干得漂亮！前方还有冒险在等着你！",
  "英雄，荣耀属于你！",
  "一鼓作气，再下一城！",
  "休息片刻，继续征程。",
  "这只是开始，别松懈哦~",
  "钱袋子变鼓了，心也跟着鼓起来！",
  "回到旅店，召集更多的同伴吧!"
];
const { addItem } = require('./data/inventory.js');
let pendingGaugeAttack = false;   // 正在等待 0.5 s 计时器
let lastRemainSteps = 5;   // 上一次绘制时的剩余步数
let stepChangeTime  = 0;   // 最近一次数值变化的时间戳(ms)
let comboTextPos   = null;   // 最近一次画 Combo 飘字的位置
let gaugeCenterPos = null;   // 攻击槽中心位置
let comboCounter = 0;
let comboShowTime = 0;      // 🎥 记录当前动画的开始时间
let lastComboUpdateTime = 0; // 🕒 实际触发新 combo 的时间
let __blockSize = 0;
let __gridStartX = 0;
let __gridStartY = 0;
let popupGoldDisplayed = 0; // 用于胜利弹窗中金币滚动显示
let chestGoldEarned        = 0; // 本关累计：宝箱金币
let popupChestGoldDisplayed = 0; // 弹窗里滚动用的数字
let displayedGold = 0; // 当前动画显示的金币
let popupGoldStartTime = 0; // ⏱ 胜利弹窗金币滚动起始时间
let playerActionCounter = 0;
let heroLevelUps = [];           // 本关升级信息，供弹窗读取
let touchStart = null;     // 记录起始格子位置
let dragStartX = 0;        // 记录滑动起点 X
let dragStartY = 0;        // 记录滑动起点 Y
/* ---------- 胜利弹窗宝箱点击用 ---------- */
globalThis.victoryChestRects  = [];   // 记录每只宝箱的矩形
globalThis.victoryChestOpened = [];   // 标记宝箱是否已开
globalThis.victoryChestLoot    = [];     // ★ 清空上一关掉落
// 开箱后具体掉落显示用（与宝箱索引一一对应）
const { rollLoot } = require('./data/loot_tables.js');   // 引入

globalThis.victoryChestLoot = [];   // 与宝箱索引一一对应，用来存抽到的 {icon,qty}

/* --------------------------------------- */
let showGameOver = false;     // 是否触发失败弹窗
let victoryHeroLoaded = false;
const { drawRoundedRect } = require('./utils/canvas_utils.js');
const DEBUG = false; // 全局设置，生产时设为 false
let showVictoryPopup = false;
let earnedGold = 0;
let levelJustCompleted = 0;
let currentLevel = 1; // 🌟 当前关卡编号，需保存下来
let goldPopTime = 0; // 最近一次金币弹出时间（用于动画）
const VICTORY_POPUP_DELAY_MS = 800;  // 想更明显就调 1200/1500

let exitingGame = false;        // ☆ 新增：返回主页时置 true

// -------------------------------
// 捕捉系统支持：通过全局函数触发界面
// 当怪物生命值降至 30% 以下时，会调用 globalThis.enterCapturePhase(monster)。
// 下面实现捕捉逻辑：弹出模态框，玩家可尝试收服怪物。成功则解锁一个新英雄，
// 将该英雄的名称与头像替换为怪物信息，并标记英雄为已解锁。
globalThis.capturing = false;

/**
 * 将给定怪物转换为英雄：寻找一个尚未解锁且未隐藏的英雄占位符，
 * 覆盖其名称和头像为怪物信息，并解锁。
 * @param {Object} mon 怪物对象（只读）
 */
function captureMonsterAsHero(mon) {
  try {
    // 如果敌人来源于英雄数据，则其 heroId 指向该英雄的 ID
    if (mon && mon.heroId) {
      // 👾 捕捉敌方英雄：创建一个独立实例 ID
      const baseId     = mon.heroId;
      const instanceId = `${baseId}_${Date.now()}`;
      // 初始化实例的进度：1级、0经验、复制基础属性与 HP
      try {
        const prog = wx.getStorageSync('heroProgress') || {};
        const baseHero = HeroData.getHeroById
          ? HeroData.getHeroById(baseId)
          : (HeroData.heroes && HeroData.heroes.find(h => h.id === baseId));
        const attrs = baseHero && baseHero.attributes ? { ...baseHero.attributes } : {};
        const hpVal = baseHero && typeof baseHero.hp === 'number' ? baseHero.hp : 100;
        prog[instanceId] = {
          // 捕捉后保持当前敌人等级
          level: mon?.level ?? 1,
          exp: 0,
          attributes: attrs,
          locked: false,
          hp: hpVal,
          // 保存稀有度信息，便于成长曲线使用
          rarity: mon?.rarityTier || 'white'
        };
        wx.setStorageSync('heroProgress', prog);
      } catch (e) {
        console.warn('初始化捕捉英雄实例进度失败', e);
      }
      // 加入库存，支持重复
      try {
        const inv = wx.getStorageSync('heroInventory');
        let arr = Array.isArray(inv) ? inv.slice() : [];
        arr.push(instanceId);
        wx.setStorageSync('heroInventory', arr);
      } catch (e) {
        // ignore
      }
      // 解锁基础英雄（若未解锁）
      if (typeof unlockHero === 'function') {
        unlockHero(baseId);
      }
      // 记录捕捉的英雄实例 ID 以便后续奖励使用，并返回该 ID
      globalThis.lastCapturedHeroInstanceId = instanceId;
      return instanceId;
    }
    // 若无 heroId，则回退到寻找空槽位的旧逻辑
    const heroEntry = HeroData.heroes.find(h => h.locked && !h.hidden);
    if (!heroEntry) {
      console.log('没有可用的英雄槽位用于收服');
      return;
    }
    // 将该英雄加入库存
    try {
      const inv = wx.getStorageSync('heroInventory');
      let arr = Array.isArray(inv) ? inv.slice() : [];
      arr.push(heroEntry.id);
      wx.setStorageSync('heroInventory', arr);
    } catch (e) {}
    if (typeof unlockHero === 'function') {
      unlockHero(heroEntry.id);
    } else {
      heroEntry.locked = false;
    }
  } catch (err) {
    console.warn('捕捉怪物到英雄失败', err);
  }
}


// 读取当前精灵球数量（读不到时按 0 处理）
function getBallCount() {
    try {
        const { getQty } = require('./data/inventory.js');
      return typeof getQty === 'function' ? (getQty('capture_ball') || 0) : 0;
    } catch (_) {
      return 0;
    }
  }

  
/**
 * 进入捕捉阶段：显示“准备收服…”提示 → 延迟后弹窗
 * 新增：需要“精灵球(capture_ball)”，点击【收服】后先扣 1 个（无论成功或失败）
 */
/**
 * 进入捕捉阶段（延迟弹窗 + 精灵球消耗 + 状态提醒）
 * - 弹窗里显示“当前精灵球数量”
 * - 点击【收服】后先扣 1 个（无论成功失败）
 * - 失败/无球都会明确提醒原因；成功/失败都会提示剩余数量
 */
globalThis.enterCapturePhase = function(monster) {
    if (globalThis.capturing) return;
    globalThis.capturing = true;
  
    // 熔断棋盘
    if (typeof lockForCapture === 'function') lockForCapture();
  
    const name = monster?.name || '未知怪物';
  
    // 延迟后再弹（同时给“准备收服…”提示）
    const DELAY_MS = 1000;
    wx?.showToast?.({ title: '准备收服…', icon: 'none', duration: DELAY_MS });
    globalThis.preCaptureOverlayUntil = Date.now() + DELAY_MS;
  
    if (globalThis.captureModalTimerId) clearTimeout(globalThis.captureModalTimerId);
    globalThis.captureModalTimerId = setTimeout(() => {
      try {
        if (!globalThis.capturing || globalThis.showVictoryPopup || globalThis.exitingGame) {
          globalThis.captureModalTimerId = null;
          globalThis.preCaptureOverlayUntil = null;
          wx?.hideToast?.();
          return;
        }
  
        globalThis.preCaptureOverlayUntil = null;
        wx?.hideToast?.();
  
        const ballsNow = getBallCount();
        wx.showModal({
          title: '收服怪物',
          content: `${name} 濒临战败。\n当前精灵球：${ballsNow}（尝试收服会消耗 1 个）`,
          confirmText: '收服',
          cancelText: '放弃',
          success(res) {
            globalThis.captureModalTimerId = null;
          
            // 放弃：结束捕捉并恢复棋盘
            if (!res || !res.confirm) {
              globalThis.capturing = false;
              const needResume = !!globalThis._captureResumePending;
              globalThis._captureResumePending = false;
              if (needResume && typeof processClearAndDrop === 'function') processClearAndDrop();
              return;
            }
          
            // ① 列出可用的精灵球（只显示库存>0的）
            const { getQty, removeItem } = require('./data/inventory.js');
            const candidates = [
              { id: 'capture_ball', name: '精灵球' },
              { id: 'great_ball',   name: '高级精灵球' },
              { id: 'ultra_ball',   name: '超级精灵球' }
            ].map(b => ({ ...b, qty: (getQty && getQty(b.id)) || 0 }))
             .filter(b => b.qty > 0);
          
            if (candidates.length === 0) {
              wx.showModal({
                title: '缺少精灵球',
                content: '你没有可用的精灵球，无法收服。是否前往商店购买？',
                confirmText: '去商店', cancelText: '返回',
                success: (m) => {
                  // 退出捕捉并恢复棋盘
                  globalThis.capturing = false;
                  const needResume = !!globalThis._captureResumePending;
                  globalThis._captureResumePending = false;
                  if (needResume && typeof processClearAndDrop === 'function') processClearAndDrop();
                  if (m?.confirm) { try { globalThis.switchPage?.('shop'); } catch(_){} }
                }
              });
              return;
            }
          
            // 展示各球的加成（来自 capture_rules.js）
            let BALL_BONUS = {};
            try {
              BALL_BONUS = (require('./data/capture_rules.js').BALL_BONUS) || {};
            } catch (_) {}
          
            const itemList = candidates.map(b => {
              const bonusPct = Math.round((BALL_BONUS[b.id] || 0) * 100);
              return `${b.name} ×${b.qty}${bonusPct ? `（+${bonusPct}%）` : ''}`;
            });
          
            // ② 让玩家选择要用的精灵球
            wx.showActionSheet({
              itemList,
              success: sel => {
                const ball = candidates[sel.tapIndex];
          
                // ③ 先扣 1 个（无论成功与否都会消耗）
                try {
                  const ok = removeItem && removeItem(ball.id, 1);
                  if (!ok) throw new Error('removeItem failed');
                } catch (err) {
                  console.error('ball remove error:', err);
                  wx.showToast({ title: '背包异常，收服已取消', icon: 'none' });
                  globalThis.capturing = false;
                  const needResume = !!globalThis._captureResumePending;
                  globalThis._captureResumePending = false;
                  if (needResume && typeof processClearAndDrop === 'function') processClearAndDrop();
                  return;
                }
                const left = (getQty && getQty(ball.id)) || 0;
                wx?.showToast?.({ title: `已消耗「${ball.name}」×1（剩余：${left}）`, icon: 'none', duration: 900 });
          
                // ④ 用 capture_rules.js 计算本次概率（稀有度 × 等级 × 球加成）
                let final = 0, pct = 0;
                try {
                  const rules = require('./data/capture_rules.js');
                  const res   = rules.computeFinalCaptureChance(monster, ball.id, HeroData);
                  final = res.final; pct = Math.round(final * 100);
                } catch (err) {
                  console.error('computeFinalCaptureChance error:', err);
                  wx.showToast({ title: '捕捉规则异常，已取消', icon: 'none' });
                  globalThis.capturing = false;
                  const needResume = !!globalThis._captureResumePending;
                  globalThis._captureResumePending = false;
                  if (needResume && typeof processClearAndDrop === 'function') processClearAndDrop();
                  return;
                }
          
                // ⑤ 概率判定
                if (Math.random() < final) {
                  const instanceId = captureMonsterAsHero(monster);
          
                  // 名称友好化（沿用你现有逻辑）
                  let heroName = monster?.name || '未知怪物';
                  try {
                    const baseId = monster?.heroId;
                    let baseHero = null;
                    if (baseId) {
                      if (HeroData?.getHeroById) baseHero = HeroData.getHeroById(baseId);
                      else if (HeroData?.heroes) baseHero = HeroData.heroes.find(h => h.id === baseId);
                      if (baseHero?.name) heroName = baseHero.name;
                    }
                  } catch (_) {}
          
                  globalThis.captureRewardActive  = true;
                  globalThis.captureRewardMessage = `收服成功：${heroName}！（本次概率 ${pct}%）`;
                  globalThis.levelRewardsHeroId   = instanceId || globalThis.lastCapturedHeroInstanceId;
          
                  endBattleAfterCapture(monster);   // 你的统一胜利延迟
                  globalThis.capturing = false;
                } else {
                  wx.showModal({
                    title: '收服失败',
                    content: `可惜，挣扎逃脱。\n本次概率：${pct}%\n剩余${ball.name}：${left}`,
                    showCancel: false,
                    success: () => {
                      globalThis.capturing = false;
                      const needResume = !!globalThis._captureResumePending;
                      globalThis._captureResumePending = false;
                      if (needResume && typeof processClearAndDrop === 'function') processClearAndDrop();
                    }
                  });
                }
              },
              fail: () => {
                // 取消选择：退出捕捉并恢复棋盘
                wx.showToast({ title: '已取消收服', icon: 'none' });
                globalThis.capturing = false;
                const needResume = !!globalThis._captureResumePending;
                globalThis._captureResumePending = false;
                if (needResume && typeof processClearAndDrop === 'function') processClearAndDrop();
              }
            });
          },
          
          complete() {
            globalThis.preCaptureOverlayUntil = null;
            wx?.hideToast?.();
          }
        });
      } catch (err) {
        console.error('enterCapturePhase modal error:', err);
        globalThis.capturing = false;
        globalThis.captureModalTimerId = null;
        globalThis.preCaptureOverlayUntil = null;
        wx?.hideToast?.();
      }
    }, DELAY_MS);
  };
  
  
  

/**
 * 捕捉成功后立即结束战斗并结算奖励。
 * 模仿正常击败敌人的流程，发放金币与经验，弹出胜利弹窗。
 * @param {Object} capturedMonster - 捕捉成功的怪物对象，用于计算等级与奖励
 */
function endBattleAfterCapture(capturedMonster) {
  try {
    // 强制令当前怪物 HP 为 0
    const mon = (typeof getMonster === 'function') ? getMonster() : null;
    if (mon) {
      mon.hp = 0;
    }
    // 发放金币
    earnedGold = getMonsterGold();
    addCoins(earnedGold);
    goldPopTime = Date.now();
    displayedGold = getSessionCoins();
    levelJustCompleted = currentLevel;
    // 计算经验，根据捕捉敌人的等级决定
    // 使用怪物自身携带的经验值
    let exp;
    if (capturedMonster && typeof capturedMonster.exp === 'number') {
      exp = capturedMonster.exp;
    } else if (mon && typeof mon.exp === 'number') {
      exp = mon.exp;
    } else {
      const level = capturedMonster?.level ?? (mon?.level ?? 1);
      const isBoss = capturedMonster?.isBoss ?? (mon?.isBoss ?? false);
      exp = Math.floor(level * 5 + 10 + (isBoss ? 50 : 0));
    }
    globalThis.expGainedThisRound = exp;
    if (typeof rewardExpToHeroes === 'function') {
      rewardExpToHeroes(exp);
    }
    // 清除宝箱动画并锁定后续事件
    if (typeof clearLootChests === 'function') clearLootChests();
    if (typeof lockForVictory   === 'function') lockForVictory();
    // 准备弹窗数据
    popupGoldDisplayed = 0;
    popupGoldStartTime = Date.now();
    globalThis.victoryDialogText =
      VictoryDialogLines[Math.floor(Math.random() * VictoryDialogLines.length)];
    globalThis.levelRewards      = [];
    globalThis.currentChestStats = {};
    // 弹出胜利弹窗
    // 强制本次弹窗重新选择随机插图
globalThis._victoryPopupLevelTag = null;
globalThis.victoryPopupImage = null;
// 准备弹窗数据
popupGoldDisplayed = 0;
popupGoldStartTime = Date.now();
globalThis.victoryDialogText =
  VictoryDialogLines[Math.floor(Math.random() * VictoryDialogLines.length)];
globalThis.levelRewards      = [];
globalThis.currentChestStats = {};

// ★ 改为延迟 0.5s 再弹出胜利层
scheduleVictoryPopup(1200);

// 同步统计 & 存档 & 重绘保持不变
if (typeof updatePlayerStats === 'function') {
  updatePlayerStats({
    stage: currentLevel,
    damage: 0,
    gold: getSessionCoins()
  });
}
if (wx && typeof wx.setStorageSync === 'function') {
  wx.setStorageSync('lastLevel', currentLevel.toString());
}
if (typeof drawGame === 'function') {
  drawGame();
}

    if (typeof updatePlayerStats === 'function') {
      updatePlayerStats({
        stage: currentLevel,
        damage: 0,
        gold: getSessionCoins()
      });
    }
    if (wx && typeof wx.setStorageSync === 'function') {
      wx.setStorageSync('lastLevel', currentLevel.toString());
    }
    // 重新绘制游戏界面
    if (typeof drawGame === 'function') {
      drawGame();
    }
  } catch (err) {
    console.warn('捕捉结束战斗流程异常', err);
  }
}

function haltGame() {           // ☆ 统一熔断函数
  exitingGame      = true;      // ① 标记退出
  clearingRunning  = false;     // ② 立即停掉棋盘连锁
  pendingHeroBurst = false;     // ③ 清空等待中的连招
  heroBurstRunning = false;     // ④ 如果正播连招，也立刻视为结束
}

// 调整关卡配置信息：前几关采用更小的棋盘和较少的方块类型，以便新手快速上手。
const LevelConfigs = {
    // 关卡 1 采用 4×4 棋盘，只有 A/D/F 三种方块，匹配机会更多
    1: { gridSize: 5, allowedBlocks: ['A', 'D', 'F'] },
    // 关卡 2 添加游侠方块并维持 5×5，大幅提升可消玩法
    2: { gridSize: 5, allowedBlocks: ['A', 'B', 'F'] },
    // 关卡 3 起使用原有难度设置
    3: { gridSize: 5, allowedBlocks: ['A', 'B', 'D', 'F'] },
    4: { gridSize: 6, allowedBlocks: ['A', 'B', 'D', 'F'] },
    5: { gridSize: 6, allowedBlocks: ['A', 'B', 'D', 'F'] },
    6: { gridSize: 6, allowedBlocks: ['A', 'B', 'D', 'F'] },
    7: { gridSize: 6, allowedBlocks: ['A', 'B', 'D', 'F'] },
    8: { gridSize: 6, allowedBlocks: ['A', 'B', 'C', 'D', 'F'] },
    9: { gridSize: 6, allowedBlocks: ['A', 'B', 'C', 'D', 'F'] },
    10: { gridSize: 7, allowedBlocks: ['A', 'B', 'C', 'D', 'F'] },
  };


// === 变更：把另外两个特效工具也引进来
const { clearLootChests, createLootChest } = require('./effects_engine.js');
import { renderBlockA } from './block_effects/block_A.js';
import { renderBlockB } from './block_effects/block_B.js';
import { renderBlockC } from './block_effects/block_C.js';
import { renderBlockD } from './block_effects/block_D.js';
import { renderBlockE } from './block_effects/block_E.js';
import { renderBlockF } from './block_effects/block_F.js';
import { applySkillEffect } from './logic/skill_logic.js';
import { showDamageText } from './effects_engine.js';
import SuperBlockSystem from './data/super_block_system.js';
import { updatePlayerStats } from './utils/player_stats.js'; // ✅ 新增
import { ensureEncounter } from './data/encounters.js';

import { registerGameHooks } from './utils/game_shared.js';
import { getPlayerHp, getPlayerMaxHp } from './data/player_state.js';
import { unlockHero } from './data/hero_state.js';
globalThis.renderBlockA = renderBlockA;
globalThis.renderBlockB = renderBlockB;
globalThis.renderBlockC = renderBlockC;
globalThis.renderBlockD = renderBlockD;
globalThis.renderBlockE = renderBlockE;
globalThis.renderBlockF = renderBlockF;
import {
    updateAllEffects,
    drawAllEffects,
    createProjectile,
    createFloatingText,
    createPopEffect,
    createExplosion,
    createMonsterBounce, 
    createAvatarFlash, 
    createEnergyParticles,
    createGoldParticles,         // ✅ 加上这个
    createShake, 
    createChargeReleaseEffect , 
    createSkillDialog  , 
    createMonsterAttackFlash ,   // ✅ 加这行
    createChargeGlowEffect
} from './effects_engine.js';
  
import { getSelectedHeroes, setSelectedHeroes } from './data/hero_state.js';
import { setCharge, getCharges } from './data/hero_charge_state.js';
// 👾 Monster system
import { loadMonster, dealDamage, isMonsterDead, getNextLevel, getMonsterGold } from './data/monster_state.js';
import { initPlayer, takeDamage, isPlayerDead } from './data/player_state.js';
import { drawPlayerHp } from './ui/player_ui.js';
import { addCoins, getSessionCoins, commitSessionCoins } from './data/coin_state.js';
import { drawMonsterSprite } from './ui/monster_ui.js';
import HeroData   from './data/hero_data.js';
import BlockConfig from './data/block_config.js';   // ← 已有就保留
import { getMonsterTimer } from './data/monster_state.js'; // ⬅️ 加入导入
import { getLogs } from './utils/battle_log.js';
import { logBattle } from './utils/battle_log.js'; // ✅ 加这一行
import { resetCharges } from './data/hero_charge_state.js';
import { getMonster, getMonsterDamage, markBossDefeated } from './data/monster_state.js';

/* ===============================================================
   敌人反击机制：
   在玩家每次操作后增加进度条，达到阈值时触发敌人攻击。
   显示在 monster_ui 的 HP 条下方，通过 enemyAttackProgress 绘制。
   =============================================================== */
// 初始化全局攻击进度及阈值（默认每 5 步一次攻击，可在其他文件中调整）
globalThis.enemyAttackProgress  = globalThis.enemyAttackProgress  || 0;
globalThis.enemyAttackThreshold = globalThis.enemyAttackThreshold || 5;

/**
 * 增加敌人的攻击进度。每当玩家进行一次移动（不论是否形成消除），
 * 调用此函数以增加进度条。若进度达到阈值，则重置并立即发动一次攻击。
 */
function increaseEnemyAttackProgress() {
  globalThis.enemyAttackProgress += 1;
  if (globalThis.enemyAttackProgress >= globalThis.enemyAttackThreshold) {
    globalThis.enemyAttackProgress = 0;
    performEnemyAttack();
  }
}

/**
 * 敌人对玩家发动攻击：根据怪物攻击力扣除玩家生命，产生飘字及血条闪烁。
 */
function performEnemyAttack() {
  try {
    const dmg = (typeof getMonsterDamage === 'function' ? getMonsterDamage() : 0) || 0;
    if (dmg <= 0) return;
    // 扣减玩家生命
    takeDamage(dmg);
    logBattle(`[敌人反击] 敌人对玩家造成伤害 ${dmg}`);
    // 在玩家 HP 条附近显示伤害飘字
    const hpBar = globalThis.hpBarPos || { x: 24, y: 24, width: 280, height: 20 };
    const fx = hpBar.x + hpBar.width * 0.75;
    const fy = hpBar.y - 10;
    createFloatingText(`-${dmg}`, fx, fy, '#FF4444');
    // 触发 HP 条闪红动画
    createMonsterAttackFlash();
    // 若玩家死亡，则标记游戏结束
    if (typeof isPlayerDead === 'function' && isPlayerDead()) {
      showGameOver = true;
    }
  } catch (err) {
    console.warn('performEnemyAttack error', err);
  }
}

  
function playSound(name) {
  if (!wx.createInnerAudioContext) return;

  const sound = wx.createInnerAudioContext();
  sound.src = `sounds/${name}.mp3`;
  sound.obeyMuteSwitch = false;  // 允许静音状态播放
  sound.play();
}

function isHeroUnlocked(heroId) {
  const all = wx.getStorageSync('unlockedHeroes') || [];
  return all.includes(heroId);
}


/* ======== 英雄连招节流用状态 ======== */
let pendingHeroBurst   = false;   // 是否排队等待播放
let skillsActive = 0;   // 当前还在播放的英雄技能数量
let pendingBurstDamage = 0;       // 这一轮累积伤害
let heroBurstRunning   = false;   // 正在播放英雄连招
let clearingRunning    = false;   // 棋盘仍在连消 / 掉落动画
let gaugeCount = 0;   // ← 放到文件顶部 (全局)
let attackDisplayDamage = 0;    // 用于滚动显示的数字
let damagePopTime       = 0;    // 最近一次数值变化时刻（ms）
let gaugeFlashTime = 0;          // 0 表示不闪烁
let pendingDamage = 0;          // 等待打到怪物的数值
let monsterHitFlashTime = 0;    // 怪物受击闪白计时

/*  ================= 辅助函数：胜利时立即熔断后台循环 ================== */
function lockForVictory () {
  clearingRunning  = false;   // 停掉棋盘连锁 / 掉落
  pendingHeroBurst = false;   // 清掉等待中的连招
  heroBurstRunning = false;   // 正在播放的连招也标记结束
}
/*  ================= 捕捉弹窗：立即熔断后台循环（可恢复） ================== */
function lockForCapture () {
    // 记录暂停前是否在跑连锁/是否有空位（用于稍后恢复）
    globalThis._captureResumePending = (typeof clearingRunning !== 'undefined' && clearingRunning)
                                       || (typeof hasEmptyTiles === 'function' && hasEmptyTiles());
    // 统一关停后台循环
    clearingRunning  = false;   // 停掉棋盘连锁 / 掉落
    pendingHeroBurst = false;   // 清掉等待中的连招
    heroBurstRunning = false;   // 正在播放的连招也标记结束
  }
  
/* === BlockConfig 派生工具映射 ================================= */
const BLOCK_ROLE_MAP   = Object.fromEntries(
  Object.entries(BlockConfig).map(([k, v]) => [k, v.role])
);
const BLOCK_DAMAGE_MAP = Object.fromEntries(
  Object.entries(BlockConfig).map(([k, v]) => [k, v.damage])
);
/* ============================================================ */
/* ======== 动态方块伤害 ======== */
/* ======== 动态方块伤害 ======== */
const DAMAGE_RULES = {
  A: { role: '战士',  attrs: ['physical'] },
  B: { role: '游侠',  attrs: ['physical'] },
  C: { role: '法师',  attrs: ['magical'] },
  D: { role: '坦克',  attrs: ['physical', 'magical'] },   // 两项都加
  E: { role: '刺客',  attrs: ['physical'] },
  F: { role: '辅助',  attrs: ['healing', 'magical'] },    // 先用治疗，没有就用魔攻
};

function getBlockDamage(letter) {
  const rule = DAMAGE_RULES[letter];
  if (!rule) return BLOCK_DAMAGE_MAP[letter] || 0;

  return getSelectedHeroes()
    .filter(h => h && h.role === rule.role)
    .reduce((sum, h) =>
      sum + rule.attrs.reduce(
        (acc, key) => acc + (h.attributes?.[key] || 0), 0
      ), 0);
}

/* 攻击槽：累积伤害数值 */
let attackGaugeDamage = 0;

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
          rect.y = o.y + o.height + minGap;
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
  

  export function addToAttackGauge(value) {
    if (value > 1) {
      attackGaugeDamage += value;
      damagePopTime = Date.now(); // ✅ 仅在有正向增益时触发动画
    }
  }
  



const heroImageCache = {}; // 缓存图片
let ctxRef;
let switchPageFn;
let canvasRef;

// ✅ 预加载胜利图片
const victoryHeroImage = wx.createImage();
victoryHeroImage.src = 'assets/ui/victory_hero.png';

victoryHeroImage.onload = () => {
  globalThis.imageCache = globalThis.imageCache || {};
  globalThis.imageCache.victoryHero = victoryHeroImage;

  victoryHeroLoaded = true; // ✅ 图片加载完成
};
/* ============= 随机胜利插图图片池（来自 assets/icons） ============= */
const ICON_BASE = 'assets/icons/';
// 列出你目录里“确定存在”的文件；避免包含空格/括号的名字
const VICTORY_ICON_FILES = [
  'archer.png',
  'archer2.png',
  'archer3.png',
  'assassin.png',
  'assassin2.png',
  'assassin3.png',
  'hero1.png',
  'hero2.png',
  'icon_king.png',
  'knight.png',
  'mage.png',
  'mage2.png',
  'mage3.png',
  'priest.png',
  'priest2.png',
  'priest3.png',
  'swordsman.png',
  'swordsman2.png',
  'swordsman3.png',
  'tank2.png',
  'tank3.png',
];

// 拼接成完整路径
const VICTORY_ICON_POOL = VICTORY_ICON_FILES.map(n => ICON_BASE + n);

// 随机选图；新关卡时重新抽；失败则回退到默认图
function ensureVictoryPopupImage(levelTag) {
  if (globalThis._victoryPopupLevelTag !== levelTag) {
    globalThis._victoryPopupLevelTag = levelTag;
    globalThis.victoryPopupImage = null;
  }
  if (globalThis.victoryPopupImage) return globalThis.victoryPopupImage;

  const src = VICTORY_ICON_POOL[(Math.random() * VICTORY_ICON_POOL.length) | 0];
  const img = wx.createImage();
  img.src = src;

  img.onload = () => { globalThis.victoryPopupImage = img; drawGame?.(); };

  // 防止路径写错时报错：回退到旧的 victory_hero.png
  img.onerror = () => {
    const fallback = wx.createImage();
    fallback.src = 'assets/ui/victory_hero.png';
    fallback.onload = () => { globalThis.victoryPopupImage = fallback; drawGame?.(); };
  };

  return null; // 首帧显示“加载中…”
}
  

globalThis.gridSize = 6;
let gridData = [];
let selected = null;


/* ================= 背景层：黑 → 紫渐变 =================== */
function drawBackground() {
    ctxRef.setTransform(1, 0, 0, 1, 0, 0);
  
    // 淡紫 → 深紫（与森林背景更和谐，不与天空打架）
    const g = ctxRef.createLinearGradient(0, 0, 0, canvasRef.height);
    g.addColorStop(0, '#b993d6'); // 顶部淡紫
    g.addColorStop(0.65, '#6a5cab'); // 过渡的紫蓝
    g.addColorStop(1, '#2b1055'); // 底部深紫
  
    ctxRef.fillStyle = g;
    ctxRef.fillRect(0, 0, canvasRef.width, canvasRef.height);
  }
  

  

export function initGamePage(ctx, switchPage, canvas, options = {}) {

  // 停止主页 BGM（如果存在）
if (globalThis.bgmAudioContext) {
  try {
    globalThis.bgmAudioContext.stop();
    globalThis.bgmAudioContext.destroy();
  } catch (e) {}
  globalThis.bgmAudioContext = null;
}
const gameBgm = wx.createInnerAudioContext();
gameBgm.src = 'sounds/bgm/game_bgm.mp3';
gameBgm.loop = true;
gameBgm.obeyMuteSwitch = false;

const muted = (wx.getStorageSync('musicMuted') === true) || !!globalThis.isMusicMuted;
gameBgm.autoplay = !muted;
gameBgm.volume = muted ? 0 : 0.3;
if (!muted) gameBgm.play();

globalThis.bgmAudioContext = gameBgm;


    resetSessionState();      //  ← 新增
    currentLevel = options?.level || 1;  // 🌟 记录本次启动关卡
    globalThis.currentLevel = currentLevel; // 兼容其他地方万一有用到
    haltGame();                               // ☆ 立刻熔断后台循环
    wx.setStorageSync('lastLevel', currentLevel.toString());
    globalThis.expGainedThisRound = 0;
  ctxRef = ctx;
  switchPageFn = switchPage;
  canvasRef = canvas;
  globalThis.canvasRef = canvas;
  globalThis.ctxRef = ctx;
  globalThis.__gridStartY = canvas.height * 0.38;  // 头像显示行顶部的 Y 坐标（你可微调）
const { createHeroLevelUpEffect } = require('./effects_engine.js');

// ✅ 为每个出战英雄绑定升级特效回调
const heroes = getSelectedHeroes?.();
if (heroes?.length) {
  heroes.forEach((hero, index) => {
    if (hero) {
      hero.onLevelUp = () => {
        createHeroLevelUpEffect(index); // 🎉 播放升级特效
      };
    }
  });
}


// 🌟 读取当前关卡的棋盘配置（默认 6×6，全部方块）
const config = LevelConfigs[currentLevel] || {};
globalThis.gridSize = config.gridSize || 6;
globalThis.allowedBlocks = config.allowedBlocks || ['A', 'B', 'C', 'D', 'E', 'F'];


// ✅ 使用小游戏的全局触摸事件监听
wx.onTouchStart(onTouch);
wx.onTouchEnd(onTouchend);

  showGameOver = false;
  gaugeCount = 0;
  attackGaugeDamage = 0;
  attackDisplayDamage = 0;
  selected = null;

  initGrid();
  const m = loadMonster(currentLevel);
  if (typeof getMonster === 'function') ensureEncounter(currentLevel, getMonster());

  (HeroData.heroes||[]).forEach(h=>console.log(h.id, h.name, h.rarity||h.quality))
  // ★ 加这一行：按配置校正敌人（池外→池内，并重算数值）
ensureEncounter(currentLevel, getMonster());

// 若你有“胜利→继续探索→再次 loadMonster(currentLevel)”的逻辑，
// 在那次 loadMonster 后面同样补一行 ensureEncounter(...)


if (typeof enforceTutorialHP === 'function') enforceTutorialHP();

  const totalHp = heroes.reduce((sum, h) => sum + (h?.hp || 0), 0);
  initPlayer(totalHp);
  drawGame();
  registerGameHooks({
    expand: expandGridTo,
    addGauge: addToAttackGauge,
    hitFlash: monsterHitFlashTime
  });
}



function releaseAllReadySkills() {
  const charges = getCharges();
  for (let i = 0; i < gridSize; i++) {
    if (charges[i] >= 100) {
      releaseHeroSkill(i);
    }
  }
}

function initGrid() {
    const blocks = globalThis.allowedBlocks || ['A', 'B', 'C', 'D', 'E', 'F'];
  gridData = [];
  for (let i = 0; i < gridSize; i++) {
    gridData[i] = [];
    for (let j = 0; j < gridSize; j++) {
      const rand = Math.floor(Math.random() * blocks.length);
      gridData[i][j] = blocks[rand];
    }
  }

  if (!hasPossibleMatches()) {
    initGrid();
  }
}

export function drawGame() {
  if (!Array.isArray(gridData) || gridData.length < globalThis.gridSize) {
    initGrid(); // ⛑ 兜底
  }
  // ✅ 插入这行：每一帧初始化 layoutRects，避免旧数据干扰
  globalThis.layoutRects = [];
  ctxRef.setTransform(1, 0, 0, 1, 0, 0);
  // 创建背景层并清空画布


  ctxRef.setTransform(1, 0, 0, 1, 0, 0);
  ctxRef.clearRect(0, 0, canvasRef.width, canvasRef.height); // 只负责清屏




  const maxWidth = canvasRef.width * 0.9;
  const maxHeight = canvasRef.height - 420;
  const scaleMap = {
    3: 0.9,
    4: 0.9,
    5: 0.9,
    6: 1.0
  };
  const scaleFactor = scaleMap[gridSize] || 1.0;
  const blockSize = Math.floor(Math.min(maxWidth, maxHeight) / gridSize * scaleFactor);
  
  const startX = (canvasRef.width - blockSize * gridSize) / 2;
  const topSafeArea = 220; // 怪物区向上留空间
  const bottomPadding = gridSize <= 3 ? 150 :
  gridSize === 4 ? 170 :
  gridSize === 5 ? 80 : 
  gridSize === 6 ? 60 : 40;
const startY = Math.max(topSafeArea, canvasRef.height - blockSize * gridSize - bottomPadding);

  
  

  const layoutRects = globalThis.layoutRects || [];  // 🔄 读取已有布局

  let boardRect = {
    x: startX,
    y: startY,
    width: blockSize * gridSize,
    height: blockSize * gridSize
  };
  
  // ✅ 使用缩放函数来避免遮挡
  const scaledBoard = scaleToAvoidOverlap(boardRect, layoutRects);

  
  // 使用缩放后的位置与大小
  const boardX = scaledBoard.x;
  const boardY = scaledBoard.y;

  
  const boardScale = scaledBoard.scale;
  const actualBlockSize = blockSize * boardScale;
  
  // 更新全局引用
  __blockSize = actualBlockSize;
  __gridStartX = boardX;
  __gridStartY = boardY;
  globalThis.__gridStartY = boardY;
  

  globalThis.__blockSize = actualBlockSize;
globalThis.__gridStartX = boardX;
globalThis.__gridStartY = boardY;






  // 绘制方块
  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      const block = gridData[row][col];

      const x = boardX + col * actualBlockSize;
      const y = boardY + row * actualBlockSize;
      
   

      const renderMap = {
        A: globalThis.renderBlockA,
        B: globalThis.renderBlockB,
        C: globalThis.renderBlockC,
        D: globalThis.renderBlockD,
        E: globalThis.renderBlockE,
        F: globalThis.renderBlockF,
        S1: SuperBlockSystem.render,
        S2: SuperBlockSystem.render,
        S3: SuperBlockSystem.render,
      };
      const renderer = renderMap[block];
      if (renderer) {
        renderer(ctxRef, x, y, actualBlockSize, actualBlockSize, block);
      } else {
        // ✅ 无论 block 是否存在，都画一个灰底圆角方块
        ctxRef.fillStyle = BlockConfig[block]?.color || '#241b2d';
        drawRoundedRect(ctxRef, x, y, actualBlockSize - 4, actualBlockSize - 4, 6, true, false);
      
        // ✅ 仅当 block 存在（不是 null）时才画文字
        if (block) {
          ctxRef.fillStyle = 'white';
          ctxRef.font = `${Math.floor(actualBlockSize / 2.5)}px sans-serif`;
          ctxRef.fillText(block, x + actualBlockSize / 2.5, y + actualBlockSize / 1.5);
        }
      }
      

      if (selected && selected.row === row && selected.col === col) {
        ctxRef.strokeStyle = '#cf20a0';
        ctxRef.lineWidth = 4;
        drawRoundedRect(ctxRef, x, y, actualBlockSize - 4, actualBlockSize - 4, 6, false, true);
      }
    }
  }



  
  // 在单独的绘制层绘制UI元素
  drawUI();
// === 胜利弹窗绘制逻辑（纵向“升级！”版本） ===
if (showVictoryPopup) {
    const ctx = ctxRef;
    const W = canvasRef.width;
    const H = canvasRef.height;
  
    /* 1. 背景遮罩 */
    ctx.fillStyle = 'rgba(0,0,0,0.8)';
    ctx.fillRect(0, 0, W, H);
  
    /* 2. 标题 */
    const title = `胜利！`;
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 36px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const titleY = H * 0.12 ;  
    ctx.fillText(title, W / 2, titleY);
  
    /* 3. 中央插图 */
    const heroImgW = 120, heroImgH = 120;
    const heroImgX = (W - heroImgW) / 2;
    const heroImgY = titleY + 50;
  
    /* === 3-A 对白气泡（在插图头顶） ========================== */
const dialog = globalThis.victoryDialogText || "";
if (dialog) {
  ctx.save();
  ctx.font = '16px PingFang SC, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const padX = 18, padY = 10;
  const txtW = ctx.measureText(dialog).width;
  const bubbleW = txtW + padX * 2;
  const bubbleH = 40;
  const bubbleX = heroImgX + heroImgW / 2 - bubbleW / 2;
  const bubbleY = heroImgY - bubbleH - 16;      // ↑ 插图上方 16px

  // 1. 白底圆角框
  ctx.fillStyle = '#FFFFFF';
  drawRoundedRect(ctx, bubbleX, bubbleY, bubbleW, bubbleH, 10, true, false);

  // 2. 小箭头（指向插图）
  ctx.beginPath();
  ctx.moveTo(bubbleX + bubbleW / 2 - 6, bubbleY + bubbleH);   // 左脚
  ctx.lineTo(bubbleX + bubbleW / 2 + 6, bubbleY + bubbleH);   // 右脚
  ctx.lineTo(heroImgX + heroImgW / 2,    heroImgY - 2);       // 尖端
  ctx.closePath();
  ctx.fill();

  // 3. 黑字内容
  ctx.fillStyle = '#000';
  ctx.fillText(dialog, bubbleX + bubbleW / 2, bubbleY + bubbleH / 2);
  ctx.restore();
}
/* ========================================================= */

// 用“当前已过的关卡号”作为随机图的轮换标记，保证每关抽一次
const picked = ensureVictoryPopupImage(levelJustCompleted);
if (!picked) {
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '20px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('加载中...', W / 2, heroImgY + 40);
} else {
  ctx.drawImage(picked, heroImgX, heroImgY, heroImgW, heroImgH);
}

  
/* 4. 宝箱金币奖励（只统计宝箱） */
const goldY = heroImgY + heroImgH + 24;
if (popupChestGoldDisplayed < chestGoldEarned) {
  const diff = chestGoldEarned - popupChestGoldDisplayed;
  popupChestGoldDisplayed += Math.ceil(diff * 0.1);   // 滚动动画
} else {
  popupChestGoldDisplayed = chestGoldEarned;
}
const popupGoldText = `宝箱金币：+${popupChestGoldDisplayed}`;
ctx.fillStyle = '#FFD700';
ctx.font = 'bold 20px sans-serif';
ctx.textAlign = 'center';
ctx.textBaseline = 'alphabetic';
ctx.fillText(popupGoldText, W / 2, goldY);
      // ✅ 显示经验奖励
const expY = goldY + 30;

const expGained = globalThis.expGainedThisRound || 0;
const popupExpText = `获得经验：+${expGained}`;
ctx.fillStyle = '#7CF2FF';
ctx.font = 'bold 20px sans-serif';
ctx.fillText(popupExpText, W / 2, expY);
  
/* 5. 奖励文本 & 宝箱展示（图标排版） ----------------------- */
const rewards = globalThis.levelRewards || [];
let afterRewardY = goldY + 32;     // 记录当前 Y，后面还要用

// 5-A. 先画纯文字奖励（如果有别的奖励行）
ctx.fillStyle = '#FFFFFF';
ctx.font = '18px sans-serif';
rewards.forEach((txt, i) => {
  ctx.fillText(txt, W / 2, afterRewardY + i * 28);
});
afterRewardY += rewards.length * 28;   // 更新 Y 基准

// 5-B. 再画宝箱 —— 先把掉落索引按 0→2 排序（S1→S3）
const chestIdxArr = (globalThis.chestDropsThisRound || [])
                    .slice()
                    .sort((a, b) => a - b);

if (chestIdxArr.length) {
  const boxW = W * 0.74;           // 绿色框宽度（可微调）
  const iconSize = 40;               // 宝箱贴图边长
  const gap  = 8;                  // 图标间距
  const perRow = Math.floor((boxW - gap) / (iconSize + gap));
  const rows   = Math.ceil(chestIdxArr.length / perRow);
  const boxH = rows * iconSize + (rows + 1) * gap;

  const boxX = (W - boxW) / 2;
  const boxY = afterRewardY + 12;  // 留一点缓冲

/* ---------- 画宝箱（按 S1→S3 排序） ---------- */
chestIdxArr.forEach((idx, i) => {
    // ① 计算摆放坐标
    const row = Math.floor(i / perRow);
    const col = i % perRow;
    const x   = boxX + gap + col * (iconSize + gap);
    const y   = boxY + gap + row * (iconSize + gap);
  
    // ② 记录矩形，供点击检测
    if (!globalThis.victoryChestRects[i]) {
      globalThis.victoryChestRects[i] = { x, y, w: iconSize, h: iconSize };
    }
  
    // ③ 根据是否已开挑贴图
    const opened = globalThis.victoryChestOpened[i];          // undefined→false
    const imgArr = opened ? globalThis.imageCache.lootChestOpen
                          : globalThis.imageCache.lootChests;
    const img    = imgArr?.[idx];
    if (img?.complete) ctx.drawImage(img, x, y, iconSize, iconSize);
  
// ⑤ 已开宝箱 ➜ 画 Emoji + 数量（贴紧一起）
if (opened && globalThis.victoryChestLoot[i]) {
    const { icon: emoji, qty } = globalThis.victoryChestLoot[i];
  
    /* 1️⃣ 画 Emoji —— 让它垂直居中，再轻微往上提一点点 */
    ctx.font        = '28px sans-serif';       // Emoji 大小
    ctx.textAlign   = 'center';
    ctx.textBaseline= 'middle';
    ctx.fillText(emoji,
                 x + iconSize / 2,
                 y + iconSize / 2 - 4);        // -4 可调，往上提
  
    /* 2️⃣ 画数量 —— 紧贴 Emoji 下方 10px */
    ctx.font        = '18px sans-serif';
    ctx.textBaseline= 'top';
    ctx.fillStyle   = '#FFFFFF';
    ctx.fillText(`×${qty}`,
                 x + iconSize / 2,
                 y + iconSize / 2 + 6);        // +6 可调，往下挪
  }
  

  });
  /* --------------------------------------------- */
  
  afterRewardY = boxY + boxH;   // 记录绿色框底部，后面用

  /* ---------- 绘制“开启全部宝箱”按钮 ---------- */
  const allBtnW = 160;
  const allBtnH = 40;
  const allBtnX = (W - allBtnW) / 2;
  const allBtnY = afterRewardY + 12;
  // 按钮底色及文字
  ctx.fillStyle = '#5A3E8D';
  drawRoundedRect(ctx, allBtnX, allBtnY, allBtnW, allBtnH, 8, true, false);
  ctx.fillStyle = '#F3E9DB';
  ctx.font = 'bold 18px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('开启全部宝箱', allBtnX + allBtnW / 2, allBtnY + allBtnH / 2);
  // 记录按钮区域供点击检测
  globalThis.victoryOpenAllArea = { x: allBtnX, y: allBtnY, width: allBtnW, height: allBtnH };
  // 更新 afterRewardY 以便后续元素排版
  afterRewardY = allBtnY + allBtnH;
 
}
/* --------------------------------------------------------- */

// ✅ 如果有奖励英雄，则绘制头像与奖励信息
if (globalThis.levelRewardsHeroId) {
    const HeroState = require('./data/hero_state.js').HeroState;
    const hero = new HeroState(globalThis.levelRewardsHeroId);
    const iconSize = 72;
    const iconX = W / 2 - iconSize / 2;
    const rewardCount = (globalThis.levelRewards || []).length;
    const iconY = expY + 60 + rewardCount * 28;
  
    // 先按原位置绘制一次头像（不影响后续逻辑）
    drawHeroIconFull(ctx, hero, iconX, iconY, iconSize, 1.0);
  
    // 根据是否为捕捉奖励切换绘制模式
    if (globalThis.captureRewardActive) {
      // 黑底：盖住后续胜利弹窗内容，使本帧只显示头像+确认
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.80)';
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
  
      // 重新把头像绘制到黑底上方
      drawHeroIconFull(ctx, hero, iconX, iconY, iconSize, 1.0);
  
      // 捕捉奖励祝贺文字（维持你原有样式）
      const msg = globalThis.captureRewardMessage || '';
      ctx.fillStyle = '#FFD700';
      ctx.font = 'bold 18px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(msg, W / 2, iconY + iconSize + 4);
  
      // 确认按钮（维持你原有样式与位置）
      const btnW2 = 100;
      const btnH2 = 36;
      const btnX2 = (W - btnW2) / 2;
      const btnY2 = iconY + iconSize + 32;
      ctx.fillStyle = '#5A3E8D';
      drawRoundedRect(ctx, btnX2, btnY2, btnW2, btnH2, 8, true, false);
      ctx.fillStyle = '#F3E9DB';
      ctx.font = 'bold 18px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('确认', btnX2 + btnW2 / 2, btnY2 + btnH2 / 2);
  
      // 记录按钮区域供点击检测（保持不变）
      globalThis.captureConfirmArea = { x: btnX2, y: btnY2, width: btnW2, height: btnH2 };
  
      // 关键：本帧到此为止，不再绘制宝箱、经验、下一关等后续元素
      return;
    } else {
      // 默认奖励逻辑：提示加入队伍及技能信息（保持原样）
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText('已加入队伍', W / 2, iconY + iconSize + 4);
  
      const fullHero = HeroData.getHeroById(hero.id);
      const realName = fullHero?.name || '新英雄';
  
      ctx.fillStyle = '#FFD700';
      ctx.font = '18px sans-serif';
      ctx.fillText('解锁新英雄：' + realName, W / 2, iconY + iconSize + 28);
  
      const skillDesc = fullHero?.skill?.description || '';
      if (skillDesc) {
        ctx.fillStyle = '#CCCCCC';
        ctx.font = '14px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(skillDesc, W / 2, iconY + iconSize + 52);
      }
    }
  }
  
  
    /* 6. 英雄升级纵向列表 */
    const ups = globalThis.heroLevelUps || [];
    if (ups.length > 0) {
      const avatar = 42;                    // 头像尺寸
      const rowGap = 4;                    // 行距
      const startX = W * 0.18;              // 左边距，与出战栏齐
      const btnY = H - 80; // 已经存在
const totalHeight = ups.length * (avatar + rowGap);
const startY = btnY - totalHeight - 12;  // ✅ 紧贴按钮上方，留 12px 缓冲
  
      ups.forEach((up, i) => {
        const rowY = startY + i * (avatar + rowGap);
  
        /* 6.1 头像 */
         /* 6-1 头像：直接复用出战栏绘制函数 */
         drawHeroIconFull(ctx, up.hero, startX, rowY, avatar, 0.72);  // 最后一个参数是 scale（1 = 原尺寸）
  
/* 6.2 名字（头像右侧，靠上） */
const nameX = startX + avatar + 12;   // 头像右侧 12px
const nameY = rowY + 6;               // 距头像顶 6px
ctx.fillStyle   = '#FFFFFF';
ctx.font        = 'bold 12px sans-serif';
ctx.textAlign   = 'left';
ctx.textBaseline= 'top';
ctx.fillText(up.name ?? '', nameX, nameY);

/* 6.3 “升级！”（与名字同行，右对齐） */
ctx.fillStyle   = '#FFD700';
ctx.font        = 'bold 12px sans-serif';
ctx.textAlign   = 'right';
ctx.textBaseline= 'top';
ctx.fillText('升级！', W - startX, nameY);

/* 6.4 等级变化（紧贴名字下方） */
const lvlY = nameY + 20;              // 行距 
ctx.fillStyle   = '#CCCCCC';
ctx.font        = 'bold 12px sans-serif';
ctx.textAlign   = 'left';
ctx.textBaseline= 'top';
ctx.fillText(`Lv.${up.oldLevel} → Lv.${up.newLevel}`, nameX, lvlY);
      });
    }
  
    /* 7. 行动按钮：继续探索 / 回到酒馆 */
    const btnW  = 140;
    const btnH  = 48;
    const spacing = 24;
    const totalW = btnW * 2 + spacing;
    const btnY = H - 80;
    const startX = (W - totalW) / 2;

    // 继续探索按钮
    ctx.fillStyle = '#D43C44';
    drawRoundedRect(ctx, startX, btnY, btnW, btnH, 12, true, false);
    ctx.fillStyle = '#F3E9DB';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('继续探索', startX + btnW / 2, btnY + btnH / 2);

    // 回到酒馆按钮
    ctx.fillStyle = '#6D2C91';
    const secondX = startX + btnW + spacing;
    drawRoundedRect(ctx, secondX, btnY, btnW, btnH, 12, true, false);
    ctx.fillStyle = '#F3E9DB';
    ctx.fillText('回到酒馆', secondX + btnW / 2, btnY + btnH / 2);

    // 保存按钮区域供点击检测
    globalThis.victoryContinueArea = { x: startX, y: btnY, width: btnW, height: btnH };
    globalThis.victoryReturnArea  = { x: secondX, y: btnY, width: btnW, height: btnH };
  }
  
  
  
}

function drawHeroIconFull(ctx, hero, x, y, size = 48, scale = 0.8) {
    const roleToBlockLetter = {
      '战士': 'A', '游侠': 'B', '法师': 'C', '坦克': 'D', '刺客': 'E', '辅助': 'F'
    };
  
    const icon = globalThis.imageCache[hero.icon];
    const r = 6;
  
    const scaledSize = size * scale;
    const offsetX = x + (size - scaledSize) / 2;
    const offsetY = y + (size - scaledSize) / 2;
  
    // === 圆角头像区域 ===
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(offsetX + r, offsetY);
    ctx.lineTo(offsetX + scaledSize - r, offsetY);
    ctx.quadraticCurveTo(offsetX + scaledSize, offsetY, offsetX + scaledSize, offsetY + r);
    ctx.lineTo(offsetX + scaledSize, offsetY + scaledSize - r);
    ctx.quadraticCurveTo(offsetX + scaledSize, offsetY + scaledSize, offsetX + scaledSize - r, offsetY + scaledSize);
    ctx.lineTo(offsetX + r, offsetY + scaledSize);
    ctx.quadraticCurveTo(offsetX, offsetY + scaledSize, offsetX, offsetY + scaledSize - r);
    ctx.lineTo(offsetX, offsetY + r);
    ctx.quadraticCurveTo(offsetX, offsetY, offsetX + r, offsetY);
    ctx.closePath();
    ctx.clip();
  
    if (icon) {
      ctx.drawImage(icon, offsetX, offsetY, scaledSize, scaledSize);
    } else {
      ctx.fillStyle = '#555';
      ctx.fillRect(offsetX, offsetY, scaledSize, scaledSize);
    }
    ctx.restore();
  
    // === 品质边框 ===
    // 捕获/稀有度英雄使用 rarityTier (white/green/blue)，否则回退到基础稀有度 (SSR/SR/R)
    const rarityTier = hero.rarityTier || null;
    let borderColor;
    if (rarityTier) {
      const tierColorMap = {
        white: '#FFFFFF',
        green: '#00FF00',
        blue:  '#00BFFF',
        purple: '#C71585',
        yellow: '#FFC107',
        gold: '#FFD700'
      };
      borderColor = tierColorMap[rarityTier] || '#FFFFFF';
    } else {
      // 原英雄稀有度映射，保持旧配色
      const rarityMap = { R:'#FFFFFF', SR:'#00BFFF', SSR:'#C71585', UR:'#FFD700' };
      borderColor = rarityMap[hero.rarity] || '#FFFFFF';
    }
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 2;
    drawRoundedRect(ctx, offsetX, offsetY, scaledSize, scaledSize, r, false, true);
  
    // === 职业图标 ===
    const letter = roleToBlockLetter[hero.role];
    const roleIcon = globalThis.imageCache?.[`block_${letter}`];
    const iconSize = scaledSize * 0.26;
    const iconX = offsetX + 4;
    const iconY = offsetY + scaledSize - iconSize - 4;
  
    if (roleIcon && roleIcon.complete && roleIcon.width > 0) {
      ctx.save();
      ctx.fillStyle = '#222';
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
      drawRoundedRect(ctx, iconX, iconY, iconSize, iconSize, iconSize / 2, true, true);
      ctx.restore();
      ctx.drawImage(roleIcon, iconX, iconY, iconSize, iconSize);
    }

    // === 伤害属性数值显示 ===
    // 根据职业确定应当显示的攻击属性：战士/游侠/刺客/坦克 用 physical，法师/辅助 用 magical
    const roleAttrMap = {
      '战士': 'physical',
      '游侠': 'physical',
      '刺客': 'physical',
      '坦克': 'physical',
      '法师': 'magical',
      '辅助': 'magical'
    };
    const attrKey = roleAttrMap[hero.role] || 'physical';
    const attrValue = hero.attributes?.[attrKey] ?? 0;
    // 字号参考职业图标大小的 70%
    const numFontSize = iconSize * 0.7;
    // 显示数字位置改到左下角：放在职业图标右侧，与边缘保持 4px 间隔
    const textX = offsetX + 4 + iconSize + 2;
    const textY = offsetY + scaledSize - 4;
    ctx.save();
    ctx.font = `bold ${Math.floor(numFontSize)}px sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#000';
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeText(`${attrValue}`, textX, textY);
    ctx.fillText(`${attrValue}`, textX, textY);
    ctx.restore();

    // 把背景放到 UI 的最后，用 destination-over 压到最底层
ctxRef.save();
ctxRef.globalCompositeOperation = 'destination-over';
drawBackground();
ctxRef.restore();
  }
  
  
  //UI层下的图片不会闪烁，后续功能都放进这个层。 
function drawUI() {



  ctxRef.setTransform(1, 0, 0, 1, 0, 0);
  const ctx = ctxRef;
  const canvas = canvasRef;
  const layoutRects = globalThis.layoutRects || [];
  
  // 捕捉前的短暂遮罩，给玩家“即将收服”的反馈
if (globalThis.preCaptureOverlayUntil && Date.now() < globalThis.preCaptureOverlayUntil) {
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('准备收服…', canvas.width / 2, canvas.height * 0.2);
    ctx.restore();
  } else {
    globalThis.preCaptureOverlayUntil = null; // 超时后自动清理
  }
  

   // ✅ 插入：让棋盘先声明其区域
   layoutRects.push({
    x: __gridStartX,
    y: __gridStartY,
    width: __blockSize * gridSize,
    height: __blockSize * gridSize
  });

// === 棋盘底板：移到 UI 层；显示层级 = 在宝石下、在金币文字下方 ===
{
    const padding = 9;
    const borderRadius = 12;
  
    const boardBgX = __gridStartX - padding;
    const boardBgY = __gridStartY - padding;
    const boardBgW = __blockSize * gridSize + padding * 2;
    const boardBgH = __blockSize * gridSize + padding * 2;
  
    // 用 destination-over 压到当前已绘制像素之下（此时宝石已在画布上）
    ctxRef.save();
    ctxRef.globalCompositeOperation = 'destination-over';
    ctxRef.fillStyle = 'rgba(22, 12, 40, 0.66)'; // 半透明深紫
    drawRoundedRect(ctxRef, boardBgX, boardBgY, boardBgW, boardBgH, borderRadius, true, false);
    ctxRef.restore();
  
    // 外框用正常模式（在最上面显示边框）
    ctxRef.strokeStyle = '#5f3a84'; // 或 '#751b50'
    ctxRef.lineWidth = 4;
    drawRoundedRect(ctxRef, boardBgX, boardBgY, boardBgW, boardBgH, borderRadius, false, true);
  }
  

// ✅ 棋盘外围

drawMonsterSprite(ctxRef, canvasRef); 

/* === 出战栏：固定 5 槽位 + 编号（原来绿色框位置） ================ */
const heroes      = getSelectedHeroes();   // 长度固定 5
const iconSize    = 48;                    // 头像边长，可调
const spacing     = 12;                    // 槽位间隔
const totalWidth  = 5 * iconSize + 4 * spacing;
const startXHero  = (canvasRef.width - totalWidth) / 2;
const topMargin = __gridStartY - 80;               // 保持原位置

/* === 攻击槽（累计伤害） ===================================== */
const gaugeW = 180, gaugeH = 14;
const gaugeX = (canvasRef.width - gaugeW) / 2;

// 动态避让，攻击槽是一个长条
const gaugeRect = avoidOverlap({ x: gaugeX, y: 60, width: gaugeW, height: gaugeH + 30 }, layoutRects);
layoutRects.push(gaugeRect);
const gaugeY = gaugeRect.y;

/* ==== 累积伤害滚动 & 动画 ================================ */
// 1. 动态数值逼近
if (attackDisplayDamage < attackGaugeDamage) {
  const diff = attackGaugeDamage - attackDisplayDamage;
  attackDisplayDamage += Math.ceil(diff * 0.33);
} else {
  attackDisplayDamage = attackGaugeDamage;
}

// 🎯 动态缩放动画
let fontScale = 1;
const popDur = 400;
if (Date.now() - damagePopTime < popDur) {
  const p = 1 - (Date.now() - damagePopTime) / popDur;
  fontScale = 1 + 0.8 * Math.sin(p * Math.PI); // 更弹性
}

// 🎯 多层级样式设定
let baseFont = 20;
let gradient, strokeWidth;

if (attackDisplayDamage > 10000) {
  baseFont = 60;
  gradient = ctxRef.createLinearGradient(0, 0, 0, 60);
  gradient.addColorStop(0, '#FFFF00');
  gradient.addColorStop(1, '#FF0000');
  strokeWidth = 5;
  createShake?.(500, 6); // ✅ 触发震屏特效（从 effects_engine.js 来）
} else if (attackDisplayDamage > 2000) {
  baseFont = 40;
  gradient = ctxRef.createLinearGradient(0, 0, 0, 40);
  gradient.addColorStop(0, '#FF9900');
  gradient.addColorStop(1, '#FF2200');
  strokeWidth = 4;
} else if (attackDisplayDamage > 500) {
  baseFont = 28;
  gradient = ctxRef.createLinearGradient(0, 0, 0, 28);
  gradient.addColorStop(0, '#FFA500');
  gradient.addColorStop(1, '#FF4500');
  strokeWidth = 3.5;
} else {
  baseFont = 20;
  gradient = ctxRef.createLinearGradient(0, 0, 0, 20);
  gradient.addColorStop(0, '#FF4444');
  gradient.addColorStop(1, '#CC0000');
  strokeWidth = 3;
}

const fontSize = Math.floor(baseFont * fontScale);

// 🎯 绘制位置设定
const DAMAGE巢顶部 = __gridStartY - 170;
const DAMAGE巢底部 = __gridStartY - 80;
const centerY = (DAMAGE巢顶部 + DAMAGE巢底部) / 2;
gaugeCenterPos = { x: canvasRef.width / 2, y: centerY };
// 🎯 绘制
// 取消攻击槽显示：不再绘制累计伤害文本，但保留计算逻辑，以便需要时可启用
if (false) {
  ctxRef.save();
  ctxRef.setTransform(1, 0, 0, 1, 0, 0);
  ctxRef.font = `bold ${fontSize}px Impact, sans-serif`;
  ctxRef.textAlign = 'center';
  ctxRef.textBaseline = 'middle';

  ctxRef.fillStyle = gradient;
  ctxRef.lineWidth = strokeWidth;
  ctxRef.strokeStyle = '#000';
  ctxRef.strokeText(`${attackDisplayDamage}`, canvasRef.width / 2, centerY);
  ctxRef.fillText(`${attackDisplayDamage}`, canvasRef.width / 2, centerY);
  ctxRef.restore();
}

/* === 本局金币 HUD ============================== */
ctxRef.resetTransform?.(); // 防止变形残留

// 🎯 滚动逻辑
const targetGold = getSessionCoins();
if (displayedGold < targetGold) {
  const diff = targetGold - displayedGold;
  displayedGold += Math.ceil(diff * 0.2);
} else {
  displayedGold = targetGold;
}

// 🎯 放大缩放动画逻辑
let goldScale = 1;
const goldAnimDuration = 800; // 延长到 0.8 秒
if (Date.now() - goldPopTime < goldAnimDuration) {
  const p = 1 - (Date.now() - goldPopTime) / goldAnimDuration;
  goldScale = 1 + 0.6 * Math.sin(p * Math.PI); // 更大的弹跳幅度
}
const goldFontSize = Math.floor(18 * goldScale);

// 🎯 金币文本设置
const goldText = `金币: ${displayedGold}`;
ctxRef.font = `bold ${goldFontSize}px IndieFlower, sans-serif`; // ✅ 使用缩放字体
ctxRef.textAlign = 'left';
ctxRef.textBaseline = 'top';

// 🎯 描边
ctxRef.lineWidth = 2;
ctxRef.strokeStyle = '#000';
ctxRef.strokeText(goldText, 26, 70);

// 🎯 填充
ctxRef.fillStyle = '#FFD700';
ctxRef.fillText(goldText, 26, 70);
/* ============================================== */





// === 左上角返回按钮（暗灰底小圆角 + 白色箭头） ====================
const btnBackX = 20;
const btnBackY = 20;
const btnBackSize = 36;

ctxRef.fillStyle = '#333'; // 暗灰底
drawRoundedRect(ctxRef, btnBackX, btnBackY, btnBackSize, btnBackSize, 6);
ctxRef.fill();

ctxRef.fillStyle = '#FFF'; // 白色箭头
ctxRef.font = '20px sans-serif';
ctxRef.textAlign = 'center';
ctxRef.textBaseline = 'middle';
ctxRef.fillText('⟵', btnBackX + btnBackSize / 2, btnBackY + btnBackSize / 2);

// 存按钮区域
globalThis.backToHomeBtn = {
  x: btnBackX,
  y: btnBackY,
  width: btnBackSize,
  height: btnBackSize
};

/* --- 🆕 行动倒计时：圆环 + 步数（挪到头像左侧） ------------ */
// 当前版本取消行动倒计时和蓄力槽显示，故不再绘制圆环与步数
if (false) {
    // 延长行动步数，提高玩家的操作节奏容错空间
    const totalSteps  = 7;                                  // 总步数
    const remainSteps = Math.max(0, totalSteps - gaugeCount);
    const pct         = remainSteps / totalSteps;           // 0~1
  
    /* === A. 记录变化，用于弹跳 === */
    if (remainSteps !== lastRemainSteps) {
      lastRemainSteps = remainSteps;
      stepChangeTime  = Date.now();                         // 触发弹跳
    }
  
    /* === B. 计算缩放因子 (0.3 s) === */
    let scale = 1;                                          // 默认不放大
    const bounceDur = 300;                                  // 300 ms
    const dt = Date.now() - stepChangeTime;
    if (dt < bounceDur) {
      const p = dt / bounceDur;                             // 0 → 1
      scale = 1 + 0.4 * Math.sin(p * Math.PI);              // 40 % 弹幅
    }
  
    /* === ① 圆环位置 ======================================= */
    const radius  = 16;   // 原来是 22，缩小一点
    const lineW   = 3;    // 原来是 5
    const gap     = 10;   // 缩短和头像的间距                               // 圆环与第 1 个头像间距
    const cx      = startXHero - radius - gap;
    const cy      = topMargin + iconSize / 2;
  
    /* === ② 绘制圆环 ====================================== */
    ctxRef.save();
  
    // a) 背圈
    ctxRef.lineWidth   = lineW;
    ctxRef.strokeStyle = '#3e2653';
    ctxRef.beginPath();
    ctxRef.arc(cx, cy, radius, 0, Math.PI * 2);
    ctxRef.stroke();
  
    // b) 进度环（紫粉渐变）
    const grad = ctxRef.createLinearGradient(cx, cy - radius, cx, cy + radius);
    grad.addColorStop(0, '#ff66cc');                        // 亮粉
    grad.addColorStop(1, '#6a278b');                        // 深紫
    ctxRef.strokeStyle = grad;
    ctxRef.beginPath();
    ctxRef.arc(
      cx, cy, radius,
      -Math.PI / 2,                                         // 12 点方向
      -Math.PI / 2 + Math.PI * 2 * pct,                     // 逆时针收缩
      false
    );
    ctxRef.stroke();
  
 /* === ③ 数字（更粗更大 + 弹跳） =========================== */
ctxRef.save();
ctxRef.translate(cx, cy);
ctxRef.scale(scale, scale);

/* 1) 字体：900 权重 + 26 px 更大字号 */
ctxRef.font         = '900 26px "Roboto Mono", "SFMono-Regular", Menlo, monospace';
ctxRef.textAlign    = 'center';
ctxRef.textBaseline = 'middle';

/* 2) 描边＋填充，让数字更立体 */
ctxRef.lineWidth    = 2;
ctxRef.strokeStyle  = '#000000';
ctxRef.strokeText(remainSteps.toString(), 0, 0);

ctxRef.fillStyle    = '#ffffff';
ctxRef.fillText(remainSteps.toString(), 0, 0);

ctxRef.restore();
  
    /* === ④ layoutRects（可选：避免遮挡） ================= */
    layoutRects.push({
      x: cx - radius - lineW,
      y: cy - radius - lineW,
      width:  (radius + lineW) * 2,
      height: (radius + lineW) * 2
    });
  }
  








/* === 出战栏 ========================================================== */
let maxHeroBottom = 0;                // ▼ 记录头像组的最底边

for (let i = 0; i < heroes.length; i++) {
  const x = startXHero + i * (iconSize + spacing);
  const y = topMargin;

  const rawRect = { x, y, width: iconSize, height: iconSize };
  const scaled  = scaleToAvoidOverlap(rawRect, layoutRects, 0.5);   // 允许最小缩放到 50%
  layoutRects.push({ x: scaled.x, y: scaled.y, width: scaled.width, height: scaled.height });

  const sx   = scaled.x;
  const sy   = scaled.y;
  const size = scaled.width;
  maxHeroBottom = Math.max(maxHeroBottom, sy + size);               // ← 关键：不断更新底边 Y

  /* — 背板框（空位也画） — */
  ctxRef.fillStyle = '#111';
  drawRoundedRect(ctxRef, sx - 2, sy - 2, size + 4, size + 4, 6, true, false);
  ctxRef.strokeStyle = '#55557a';
  ctxRef.lineWidth   = 2;
  drawRoundedRect(ctxRef, sx - 2, sy - 2, size + 4, size + 4, 6, false, true);

  /* — 蓄力条 — */
  const charges = getCharges();
  const percent = charges[i] || 0;
  const barW    = size;
  const barH    = 6;
  const barX    = sx;
  const barY    = sy + size + 6;

  ctxRef.fillStyle = '#333';
  drawRoundedRect(ctxRef, barX, barY, barW, barH, 3, true, false);

  if (percent >= 100) {
    ctxRef.strokeStyle = (Date.now() % 500 < 250) ? '#FF0' : '#F00';
    ctxRef.lineWidth   = 4;
    ctxRef.strokeRect(sx - 4, sy - 4, size + 8, size + 8);
  }

  ctxRef.fillStyle   = '#38263d';
  ctxRef.fillRect(barX, barY, barW * (percent / 100), barH);
  ctxRef.strokeStyle = '#4250b6';
  ctxRef.lineWidth   = 1;
  drawRoundedRect(ctxRef, barX, barY, barW, barH, 3, false, true);

  /* 🌟 动态蓄力特效 */
  if (percent > 0) {
    const filledWidth = barW * (percent / 100);

    // 1. 渐变条
    const grad = ctxRef.createLinearGradient(barX, 0, barX + filledWidth, 0);
    grad.addColorStop(0, '#66DFFF');
    grad.addColorStop(1, '#0077CC');
    ctxRef.fillStyle = grad;
    ctxRef.fillRect(barX, barY, filledWidth, barH);

    // 2. 顶部高亮
    const glowGrad = ctxRef.createLinearGradient(barX, barY, barX, barY + barH);
    glowGrad.addColorStop(0, 'rgba(255,255,255,0.3)');
    glowGrad.addColorStop(0.5, 'rgba(255,255,255,0)');
    ctxRef.fillStyle = glowGrad;
    ctxRef.fillRect(barX, barY, filledWidth, barH);

    // 3. 横向能量波
    const pulseX      = barX + (Date.now() % 1000) / 1000 * filledWidth;
    const pulseWidth  = 8;
    const pulseGrad   = ctxRef.createLinearGradient(pulseX, 0, pulseX + pulseWidth, 0);
    pulseGrad.addColorStop(0, 'rgba(255,255,255,0)');
    pulseGrad.addColorStop(0.5, 'rgba(255,255,255,0.4)');
    pulseGrad.addColorStop(1, 'rgba(255,255,255,0)');
    ctxRef.fillStyle = pulseGrad;
    ctxRef.fillRect(barX, barY, filledWidth, barH);
  }

  /* — 已选英雄头像 — */
  const hero = heroes[i];
  if (hero) {
    const scaleBase  = globalThis.avatarSlotScales?.[i] || 1;
    const finalScale = scaleBase * 1.05;
    // 应用头像弹跳偏移
    const offset = (globalThis.avatarSlotOffsets && globalThis.avatarSlotOffsets[i]) || { x: 0, y: 0 };
    // 记录头像矩形以便特效使用（火球起点）
    try {
      globalThis.heroIconPositions = globalThis.heroIconPositions || {};
      globalThis.heroIconPositions[i] = { x: sx + offset.x, y: sy + offset.y, width: size, height: size };
    } catch (e) {}
    drawHeroIconFull(ctxRef, hero, sx + offset.x, sy + offset.y, size, finalScale);

    // 等级文本
    const lvText = `Lv.${hero.level}`;
    ctxRef.font           = 'bold 11px IndieFlower, sans-serif';
    ctxRef.textAlign      = 'right';
    ctxRef.textBaseline   = 'top';
    ctxRef.fillStyle      = '#FFD700';
    ctxRef.shadowColor    = '#FFA500';
    ctxRef.shadowBlur     = 4;
    ctxRef.strokeStyle    = '#000';
    ctxRef.lineWidth      = 2;
    ctxRef.strokeText(lvText, sx + size - 4, sy + 4);
    ctxRef.fillText(lvText,  sx + size - 4, sy + 4);
    ctxRef.shadowColor    = 'transparent';
    ctxRef.shadowBlur     = 0;
  }
}   // ← 头像 for-loop 结束

// 头像+蓄力条的最底边
const CHARGE_BAR_H = 6;
const heroSectionBottom = maxHeroBottom + CHARGE_BAR_H + 6;
/* === 玩家血条：固定在棋盘正上方 ================================= */
const HP_BAR_W = 280, HP_BAR_H = 20;
const hpX = (canvasRef.width - HP_BAR_W) / 2;          // 水平居中
const hpY = __gridStartY - HP_BAR_H - -5;              // 棋盘上方 14px

drawPlayerHp(ctxRef, canvasRef, hpX, hpY);
globalThis.hpBarPos = { x: hpX, y: hpY, width: HP_BAR_W, height: HP_BAR_H };
/* ================================================================= */

  

/* =============================================================== */


// ✅ 简单粗暴显示日志：取最近 6 条，左下角打印
if (DEBUG) {
  const logs = getLogs().slice(-6);
  ctxRef.font = '12px monospace';
  ctxRef.fillStyle = '#0F0';
  ctxRef.textAlign = 'left';

  for (let i = 0; i < logs.length; i++) {
    ctxRef.fillText(logs[i], 12, canvasRef.height - 100 + i * 14);
  }
}
// === Combo 显示（仅当 combo ≥ 2 且 1 秒内） ===
if (comboCounter >= 1 && Date.now() - lastComboUpdateTime < 2500) {
    const elapsed = Date.now() - comboShowTime;
    const progress = Math.min(1, elapsed / 350); // 动画周期
    const jump = 1 + 0.4 * progress; // 只放大，不缩小
  
    // 缩放比例逻辑
    let baseScale = 0.3;
    if (comboCounter <= 10) {
      baseScale = 0.3;
    } else if (comboCounter <= 20) {
      baseScale = 0.5;
    } else {
      baseScale = Math.min(0.5 + (comboCounter - 20) * 0.05, 1.0);
    }
  
    const finalScale = baseScale * jump;
  
    const ctx = ctxRef;
    const x = canvasRef.width / 2 - 90;
    const y = __gridStartY - 180;
  
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate((-20 * Math.PI) / 180);
    ctx.scale(finalScale, finalScale);
    ctx.font = `bold 80px Impact, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
  
    const grad = ctx.createLinearGradient(-100, 0, 100, 0);
    grad.addColorStop(0, '#FFF566');
    grad.addColorStop(1, '#FF8C00');
  
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#000';
    ctx.strokeText(`Combo ×${comboCounter}!`, 0, 0);
    ctx.fillStyle = grad;
    ctx.fillText(`Combo ×${comboCounter}!`, 0, 0);
  
    ctx.restore();

   // 记录飘字中心，供稍后生成飞行粒子
   comboTextPos = { x: x, y: y };       // x、y 就是上面那两个变量
  }
  
  
  

if (showGameOver) {
  const boxW = 260, boxH = 160;
  const boxX = (canvasRef.width - boxW) / 2;
  const boxY = (canvasRef.height - boxH) / 2;
  

  // 背景
  ctxRef.fillStyle = 'rgba(0, 0, 0, 0.85)';
  ctxRef.fillRect(boxX, boxY, boxW, boxH);

  // 文本
  ctxRef.fillStyle = '#FFF';
  ctxRef.font = '24px sans-serif';
  ctxRef.textAlign = 'center';
  ctxRef.fillText('游戏失败', boxX + boxW / 2, boxY + 50);

  // 按钮
  ctxRef.fillStyle = '#F33';
  drawRoundedRect(ctxRef, boxX + 60, boxY + 100, 140, 40, 10, true, false);
  ctxRef.fillStyle = '#FFF';
  ctxRef.font = '18px sans-serif';
  ctxRef.fillText('回到主页', boxX + boxW / 2, boxY + 120);
  
}

  globalThis.layoutRects = layoutRects;
  drawAllEffects(ctxRef, canvasRef);
}

function animateSwap(src, dst, callback, rollback = false) {
  const steps = 10;
  let currentStep = 0;
  const blockSize = __blockSize;
  const startX = __gridStartX;
  const startY = __gridStartY;

  const drawWithOffset = (offsetX1, offsetY1, offsetX2, offsetY2) => {
    globalThis.layoutRects = [];  // ✅ 补这一句！每帧动画中也要清空 layoutRects
    ctxRef.setTransform(1, 0, 0, 1, 0, 0);
    // 只绘制当前正在移动的方块
    ctxRef.clearRect(0, 0, canvasRef.width, canvasRef.height); // 留空给 UI 层



    // 绘制网格
    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        let offsetX = 0, offsetY = 0;
        if (row === src.row && col === src.col) {
          offsetX = offsetX1;
          offsetY = offsetY1;
        } else if (row === dst.row && col === dst.col) {
          offsetX = offsetX2;
          offsetY = offsetY2;
        }

        const x = startX + col * blockSize + offsetX;
        const y = startY + row * blockSize + offsetY;
        const block = gridData[row][col];

        const renderMap = {
          A: globalThis.renderBlockA,
          B: globalThis.renderBlockB,
          C: globalThis.renderBlockC,
          D: globalThis.renderBlockD,
          E: globalThis.renderBlockE,
          F: globalThis.renderBlockF,
        };
        
        if (SuperBlockSystem.isSuper?.(block)) {
          SuperBlockSystem.render(ctxRef, x, y, blockSize, blockSize, block);
        } else {
          const renderer = renderMap[block];
          if (renderer) {
            renderer(ctxRef, x, y, blockSize, blockSize);
          } else {
            ctxRef.fillStyle = BlockConfig[block]?.color || '#666';
            drawRoundedRect(ctxRef, x, y, blockSize - 4, blockSize - 4, 6, true, false);
            if (block) {
              ctxRef.fillStyle = 'white';
              ctxRef.font = `${Math.floor(blockSize / 2.5)}px sans-serif`;
              ctxRef.fillText(block, x + blockSize / 2.5, y + blockSize / 1.5);
            }
          }
        }
        
        
        
      }
    }



    // 绘制特效
    drawAllEffects(ctxRef, canvasRef);

    // 绘制UI元素
    drawUI();
  };

  const deltaX = (dst.col - src.col) * blockSize / steps;
  const deltaY = (dst.row - src.row) * blockSize / steps;

  function step() {
    if (currentStep <= steps) {
      const offsetX1 = rollback ? deltaX * (steps - currentStep) : deltaX * currentStep;
      const offsetY1 = rollback ? deltaY * (steps - currentStep) : deltaY * currentStep;
      const offsetX2 = -offsetX1;
      const offsetY2 = -offsetY1;

      drawWithOffset(offsetX1, offsetY1, offsetX2, offsetY2);
      currentStep++;
      requestAnimationFrame(step);
    } else {
      callback && callback();
    }
  }

  step();
}

function onTouch(e) {

    if (globalThis.capturing) return; // ⛔ 捕捉弹窗期间禁止点击棋盘

/* ====== 胜利弹窗：宝箱命中检测 ====== */
if (showVictoryPopup) {
    const t    = e.touches[0];
    const xPos = t.clientX;          // 如果你有 dpiScale，用 t.clientX * dpiScale
    const yPos = t.clientY;
  
    const rects  = globalThis.victoryChestRects;
    const opened = globalThis.victoryChestOpened;
  
    for (let i = 0; i < rects.length; i++) {
      const r = rects[i];
      if (r && !opened[i] &&
          xPos >= r.x && xPos <= r.x + r.w &&
          yPos >= r.y && yPos <= r.y + r.h) {
  
        openVictoryChest(i);   // 开箱
        drawGame();            // 立即刷新
        return;                // 事件到此为止
      }
    }
    return;                    // 点到弹窗其它地方
  }
  /* =================================== */
  

  const touch = e.changedTouches[0];
  const xTouch = touch.clientX;
  const yTouch = touch.clientY;

  const blockSize = __blockSize;
  const startX = __gridStartX;
  const startY = __gridStartY;
  const col = Math.floor((xTouch - startX) / blockSize);
  const row = Math.floor((yTouch - startY) / blockSize);

  if (
    row < 0 || row >= gridSize ||
    col < 0 || col >= gridSize
  ) {
    return; // ⛳️ 不合法起点，忽略
  }

  touchStart = { row, col };
  dragStartX = xTouch;
  dragStartY = yTouch;
}



// 其他函数保持不变


function checkAndClearMatches (returnColors = false) {

    
  // 捕捉期间：不参与任何清除/蓄力/伤害结算
if (globalThis.capturing) {
    return returnColors ? [] : false;
  }
  
  const superBlockSpots = [];
  let clearedCount   = 0;
  let soundPlayed = false; // ✅ 新增
  const colorCounter = {};                      // {A:3, B:1 …}
  const toClear      = Array.from({ length: gridSize }, () => Array(gridSize).fill(false));

  /* === ① 找 3 连 === */

  // 横向匹配
  for (let row = 0; row < gridSize; row++) {
    let count = 1;
    for (let col = 1; col <= gridSize; col++) {
      if (col < gridSize && gridData[row][col] === gridData[row][col - 1]) {
        count++;
      } else {
        if (count >= 3) {
          const start = col - count;
          const matches = [];
          for (let k = 0; k < count; k++) {
            matches.push({ row, col: start + k });
            toClear[row][start + k] = true;
          }
  
          if (count >= 4 && SuperBlockSystem.unlockedSuperTypes(currentLevel).length) {
            const choice = matches[Math.floor(Math.random() * matches.length)];
            superBlockSpots.push({ ...choice, type: gridData[choice.row][choice.col] });
          }
        }
        count = 1;
      }
    }
  }
  
  // 纵向匹配
  for (let col = 0; col < gridSize; col++) {
    let count = 1;
    for (let row = 1; row <= gridSize; row++) {
      if (row < gridSize && gridData[row][col] === gridData[row - 1][col]) {
        count++;
      } else {
        if (count >= 3) {
          const start = row - count;
          const matches = [];
          for (let k = 0; k < count; k++) {
            matches.push({ row: start + k, col });
            toClear[start + k][col] = true;
          }
  
          if (count >= 4 && SuperBlockSystem.unlockedSuperTypes(currentLevel).length) {
            const choice = matches[Math.floor(Math.random() * matches.length)];
            superBlockSpots.push({ ...choice, type: gridData[choice.row][choice.col] });
          }
        }
        count = 1;
        if (superBlockSpots.length > 0) {
        }
      }
    }
  }
  

  /* === ② 清除并统计 === */
  // 先排除将要变成超级块的位置（不要清除）

  superBlockSpots.forEach(({ row, col }) => {
    toClear[row][col] = false;
    const sType = SuperBlockSystem.randomType(currentLevel); // 按关卡随机
if (sType) gridData[row][col] = sType;                   // 未解锁时保持原块
  });

  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      if (!toClear[r][c]) continue;
  
      const letter = gridData[r][c]; // ✅ 只声明一次
  
      const centerX = __gridStartX + c * __blockSize + __blockSize / 2;
      const centerY = __gridStartY + r * __blockSize + __blockSize / 2;
  
      createPopEffect(centerX, centerY, __blockSize, letter); // ✅ 弹跳动画
      createExplosion(centerX, centerY, BlockConfig[letter]?.color || '#FFD700'); 
      
// 创建能量粒子飞向对应英雄职业能量槽
const blockRole = BlockConfig[letter]?.role;
const blockColor = BlockConfig[letter]?.color || '#FFD700';

const heroes = getSelectedHeroes();
const heroIndex = heroes.findIndex(h => h?.role === blockRole);

// ✅ 始终先定义目标点，防止未定义错误
const size = 48;
const spacing = 12;
const totalWidth = 5 * size + 4 * spacing;
const canvas = canvasRef;
const startX = (canvas.width - totalWidth) / 2;
const topMargin = __gridStartY - 80;
const endX = startX + heroIndex * (size + spacing) + size / 2;
const endY = topMargin + size + 8;

// 在 checkAndClearMatches 中，处理 B 方块粒子效果：
      if (letter === 'B') {
    // 绿色方块的生命恢复粒子已经转移到 block_B.js 中处理
  } else if (letter === 'D') {
    // D 方块仍保留金币粒子效果
    createGoldParticles(centerX, centerY);
  } else if (letter === 'A') {
    // 移除红色方块飞向伤害巢的能量特效
  } else if (heroIndex >= 0) {
    // 移除能量粒子飞向职业能量槽的效果
  }



      // ✅ 彩色粒子效果
  
      colorCounter[letter] = (colorCounter[letter] || 0) + 1;
      if (!soundPlayed) {
        playSound('block_clear', 0.1);  // ✅ 播放一次 + 调低音量
        soundPlayed = true;
      }
      gridData[r][c] = null;
      clearedCount++;
    }
  }
  

  /* === ③ 如果有消除，就累伤害 / 加蓄力 === */
  if (clearedCount > 0) {
    let addedTotalDamage = 0;
    Object.keys(colorCounter).forEach(letter => {
      const baseDamage = getBlockDamage(letter);
      const count = colorCounter[letter];
      const added = baseDamage * count;
      attackGaugeDamage += added;
      addedTotalDamage += added;
      console.log(`[调试] 方块消除，累计伤害巢: ${attackGaugeDamage}`);
      logBattle(`方块[${letter}] ×${count} → 攻击槽 +${added}`);

      // ✅ 触发额外方块特效
      const config = BlockConfig[letter];
      if (config?.onEliminate) {
        config.onEliminate(count, {
            gridData,
            __gridStartX,
            __gridStartY,
            __blockSize,
            dropBlocks,
            fillNewBlocks,
            checkAndClearMatches,
            gridSize: globalThis.gridSize
        });
    }
  }); // ✅ ← 这个是 .forEach 的闭合括号


  if (addedTotalDamage > 0) {
    damagePopTime = Date.now();
  }

    // b) 给英雄充能
    console.log('[调试] colorCounter =', colorCounter);
    const chargesNow = getCharges();
    const heroes     = getSelectedHeroes();

    heroes.forEach((hero, i) => {
      if (!hero) return;
      const gained = Object.keys(colorCounter)
      
      
        .filter(l => BLOCK_ROLE_MAP[l] === hero.role)
        .reduce((sum, l) => sum + colorCounter[l], 0);

        console.log(`[调试] ${hero.name}(${hero.role}) gained =`, gained); 
        
      if (gained) {
        const gain = gained * 20;
        setCharge(i, chargesNow[i] + gain);
        logBattle(`${hero.name} 蓄力 +${gain}（来源方块：${gained} 个 ${hero.role} 色）`);
      }
    });

    // ✅ 蓄力完成后，释放所有已满英雄技能
    releaseAllReadySkills();
  }

  /* === ④ 怪物回合 / 掉落新怪 === */
  if (isMonsterDead()) {
    earnedGold = getMonsterGold();
    playSound('coin_gain');
       addCoins(earnedGold);
       goldPopTime       = Date.now();
       displayedGold     = getSessionCoins();
       levelJustCompleted = currentLevel;
    

    
       lockForVictory();
       scheduleVictoryPopup();   // 统一用 VICTORY_POPUP_DELAY_MS
       return;
       
       return;
  }
  else {
    // 敌人仍存活：怪物回合已由其他逻辑处理（如 turnsLeft）
  }
  
  // ✅ 在此处根据参数返回
  if (returnColors) {
    return Object.keys(colorCounter);
  } else {
    return clearedCount > 0;
  }
  }




function dropBlocks() {
  for (let col = 0; col < gridSize; col++) {
    for (let row = gridSize - 1; row >= 0; row--) {
      if (gridData[row][col] === null) {
        for (let k = row - 1; k >= 0; k--) {
          if (gridData[k][col] !== null && gridData[k][col] !== 'S') {
            gridData[row][col] = gridData[k][col];
            gridData[k][col] = null;
            break;
          }
        }
      }
    }
  }
}

// 延迟触发胜利弹窗（带可见提示）
function scheduleVictoryPopup(delay = VICTORY_POPUP_DELAY_MS) {
    try {
      if (globalThis.victoryPopupTimerId) {
        clearTimeout(globalThis.victoryPopupTimerId);
      }
  
      // 延迟期间给“胜利结算中…”提示 + 半透明遮罩
      globalThis.preVictoryOverlayUntil = Date.now() + delay;
      wx?.showToast?.({ title: '胜利结算中…', icon: 'none', duration: delay });
  
      globalThis.victoryPopupTimerId = setTimeout(() => {
        if (globalThis.exitingGame) return; // 兜底：退出就不弹
        globalThis.preVictoryOverlayUntil = null;
        wx?.hideToast?.();
  
        showVictoryPopup = true;
        if (typeof drawGame === 'function') drawGame();
      }, delay);
    } catch (e) {
      globalThis.preVictoryOverlayUntil = null;
      wx?.hideToast?.();
      showVictoryPopup = true;
      if (typeof drawGame === 'function') drawGame();
    }
  }
  

  

function fillNewBlocks() {
    const blocks = globalThis.allowedBlocks || ['A', 'B', 'C', 'D', 'E', 'F']; // ✅ 使用配置
    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        if (gridData[row][col] === null || gridData[row][col] === undefined) {
          const rand = Math.floor(Math.random() * blocks.length);
          gridData[row][col] = blocks[rand];
        }
      }
    }
  }

function hasPossibleMatches() {
  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      const current = gridData[row][col];
      if (!current) continue;

      const trySwap = (r1, c1, r2, c2) => {
        if (
          r2 >= 0 && r2 < gridSize &&
          c2 >= 0 && c2 < gridSize
        ) {
          const temp = gridData[r1][c1];
          gridData[r1][c1] = gridData[r2][c2];
          gridData[r2][c2] = temp;

          const hasMatch = checkHasMatchAt(r1, c1) || checkHasMatchAt(r2, c2);

          gridData[r2][c2] = gridData[r1][c1];
          gridData[r1][c1] = temp;

          return hasMatch;
        }
        return false;
      };

      if (trySwap(row, col, row, col + 1)) return true;
      if (trySwap(row, col, row + 1, col)) return true;
    }
  }

  return false;
}

function checkHasMatchAt(row, col) {
  const val = gridData[row][col];
  let count = 1;

  let c = col - 1;
  while (c >= 0 && gridData[row][c] === val) { count++; c--; }
  c = col + 1;
  while (c < gridSize && gridData[row][c] === val) { count++; c++; }
  if (count >= 3) return true;

  count = 1;
  let r = row - 1;
  while (r >= 0 && gridData[r][col] === val) { count++; r--; }
  r = row + 1;
  while (r < gridSize && gridData[r][col] === val) { count++; r++; }

  return count >= 3;
}

function processClearAndDrop() {
    // 捕捉或胜利弹窗期间：不跑任何连锁
    if (globalThis.capturing || showVictoryPopup) {
      clearingRunning = false;
      return;
    }
  
    clearingRunning = true;
  
    const comboQueue = [];
    let comboTimerActive = false;
  
    const triggerComboTick = () => {
      if (comboQueue.length === 0) return;
      comboCounter++;
      comboShowTime = Date.now();
      lastComboUpdateTime = comboShowTime;
      comboQueue.shift();
      if (comboQueue.length > 0) {
        setTimeout(triggerComboTick, 180);
      } else {
        comboTimerActive = false;
      }
    };
  
    const loop = () => {
      // 每一个阶段都要检查“捕捉/胜利熔断”
      if (globalThis.capturing || showVictoryPopup) {
        clearingRunning = false;
        return;
      }
  
      setTimeout(() => {
        if (globalThis.capturing || showVictoryPopup) { clearingRunning = false; return; }
        dropBlocks();
        drawGame();
  
        setTimeout(() => {
          if (globalThis.capturing || showVictoryPopup) { clearingRunning = false; return; }
          fillNewBlocks();
          drawGame();
  
          setTimeout(() => {
            if (globalThis.capturing || showVictoryPopup) { clearingRunning = false; return; }
  
            // 返回被清除的“颜色种类”，用于 Combo 计数
            const _cm = checkAndClearMatches(true);
            const colorMatches = Array.isArray(_cm) ? _cm : [];
            const hasNewCombo = colorMatches.length > 0;
            
  
            // ⚠️ 安全保护：避免奇怪语法残留
            try { if (hasNewCombo) comboQueue.push(...colorMatches.map(() => Date.now())); } catch(e){}
  
            const stillEmpty = hasEmptyTiles();
  
            if (hasNewCombo || stillEmpty) {
              if (!comboTimerActive && comboQueue.length > 0) {
                comboTimerActive = true;
                triggerComboTick();
              }
              loop();
            } else {
              // 收尾：你的原有逻辑保持不变……
              setTimeout(() => {
                if (!hasPossibleMatches()) {
                  setTimeout(() => {
                    initGrid();
                    drawGame();
                  }, 500);
                } else {
                  setTimeout(() => {
                    // === combo 结算逻辑，保持你的现状 ===
                    if (comboCounter > 0) {
                      const baseDamage = globalThis.comboDamageAccumulator || 0;
                      const bonus = Math.floor(baseDamage * 0.30 * comboCounter);
                      if (bonus > 0) {
                        dealDamage(bonus, { allowKill: true });
                        logBattle(`[Combo] 组合加成伤害 +${bonus}`);
                        try {
                          const canvas = globalThis.canvasRef;
                          const pos = globalThis.monsterSpritePos || { x: canvas.width / 2, y: 180 };
                          showDamageText(bonus, pos.x, pos.y + 60);
                        } catch (err) {}
                      }
                    }
                    globalThis.comboDamageAccumulator = 0;
  
                    comboQueue.length = 0;
                    comboCounter = 0;
                    drawGame();
                    clearingRunning = false;
                    tryStartHeroBurst();
                  }, 400);
                }
              }, 0);
            }
          }, 300);
        }, 300);
      }, 200);
    };
  
    loop();
  }
  
  
  
  
  
  
  function hasEmptyTiles() {
    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        if (!gridData[r][c]) return true;
      }
    }
    return false;
  }
  

function openVictoryChest(idx) {
  globalThis.victoryChestOpened[idx] = true;

  const chestType = globalThis.chestDropsThisRound[idx]; // 0/1/2
  const loot      = rollLoot(chestType);                 // {icon,name,qty}
  globalThis.victoryChestLoot[idx] = loot;
  if (loot.name === '金币' || loot.icon === '💰') {
    chestGoldEarned += loot.qty;  // ① 统计到关卡累计
    addCoins(loot.qty);           // ② HUD 数字同步增加
    goldPopTime = Date.now();     // ③ 触发跳字动画（可选）
  }
}

/*
 * 一键开启所有宝箱：逐个依次开启未打开的宝箱。
 * 调用该函数后会按顺序触发 openVictoryChest，并自动更新奖励显示。
 */
function openAllChests() {
  if (!Array.isArray(globalThis.victoryChestOpened)) return;
  // 如果已经在自动开启中，则忽略
  if (globalThis.openingAllChests) return;
  globalThis.openingAllChests = true;
  const total = globalThis.victoryChestOpened.length;
  let delay = 0;
  for (let i = 0; i < total; i++) {
    if (!globalThis.victoryChestOpened[i]) {
      // 使用闭包记住当前索引
      ((idx) => {
        setTimeout(() => {
          openVictoryChest(idx);
          if (idx === total - 1) {
            globalThis.openingAllChests = false;
          }
          drawGame();
        }, delay);
      })(i);
      delay += 300; // 每 300ms 开一个
    }
  }
  // 如果所有宝箱都已开完，也立即重置状态
  if (delay === 0) {
    globalThis.openingAllChests = false;
  }
}
  

  
export function updateGamePage() {
  updateAllEffects();
}

function onTouchend(e) {

    if (globalThis.capturing) return; // ⛔ 捕捉弹窗期间禁止交换/滑动

  const touch = e.changedTouches?.[0];
  if (!touch) return;

  const x = touch.clientX;
  const y = touch.clientY;
  // ✅ 胜利弹窗期间：点击开启全部宝箱按钮
  if (showVictoryPopup && globalThis.victoryOpenAllArea) {
    const area = globalThis.victoryOpenAllArea;
    if (x >= area.x && x <= area.x + area.width &&
        y >= area.y && y <= area.y + area.height) {
      openAllChests();
      return; // 避免继续处理其他按钮
    }
  }

  // ⭐ 捕捉奖励确认按钮：优先于其他弹窗元素处理
  if (showVictoryPopup && globalThis.captureConfirmArea) {
    const area = globalThis.captureConfirmArea;
    if (x >= area.x && x <= area.x + area.width &&
        y >= area.y && y <= area.y + area.height) {
      // 关闭捕捉奖励弹窗
      globalThis.captureRewardActive = false;
      globalThis.captureRewardMessage = null;
      globalThis.levelRewardsHeroId = null;
      globalThis.captureConfirmArea = null;
      drawGame();
      return;
    }
  }
// ✅ 点击奖励英雄头像 → 自动加入空出战栏
const icon = globalThis.rewardHeroIconRect;
if (icon && x >= icon.x && x <= icon.x + icon.width &&
            y >= icon.y && y <= icon.y + icon.height) {

  const team = wx.getStorageSync('selectedHeroes') || [null, null, null, null, null];
  const emptyIdx = team.findIndex(id => !id);
  if (emptyIdx >= 0) {
    team[emptyIdx] = icon.heroId;
    wx.setStorageSync('selectedHeroes', team);
    setSelectedHeroes(team);   // ① 立刻刷新内存中的 selectedHeroes
drawGame();                // ② (可选) 让弹窗背后的 UI 马上看到变动
setSelectedHeroes(team);                 // ↙️ 刷新内存

   // ✅ 关闭弹窗里的奖励头像，避免下一帧再画一次
   globalThis.levelRewardsHeroId = null;
   globalThis.rewardHeroIconRect = null;

   wx.showToast({ title: '已加入出战栏', icon: 'success' });
  } else {
    wx.showToast({ title: '队伍已满', icon: 'none' });
  }
  return; // ✅ 阻止点击落入“下一关”
}
    // ✅ 胜利弹窗点击“继续探索” / “回到酒馆”
    if (showVictoryPopup) {
      const cont = globalThis.victoryContinueArea;
      const ret  = globalThis.victoryReturnArea;
      // 点击继续探索按钮
      if (cont && x >= cont.x && x <= cont.x + cont.width &&
                 y >= cont.y && y <= cont.y + cont.height) {
        showVictoryPopup = false;
        clearLootChests();
        // 清空上一局宝箱全部临时状态
        globalThis.victoryChestRects   = [];
        globalThis.victoryChestOpened  = [];
        globalThis.victoryChestLoot    = [];
        globalThis.chestDropsThisRound = [];
        // 清理胜利弹窗临时状态
        globalThis.victoryDialogText   = null;
        globalThis.levelRewardsHeroId  = null;
        globalThis.rewardHeroIconRect  = null;
        globalThis.levelRewards        = [];
        globalThis.heroLevelUps        = [];
        gaugeCount = 0;
        attackGaugeDamage = 0;
        attackDisplayDamage = 0;
        // 保持当前等级不变，重新加载怪物及棋盘
        const config = LevelConfigs[currentLevel] || {};
        globalThis.gridSize = config.gridSize || 6;
        globalThis.allowedBlocks = config.allowedBlocks || ['A', 'B', 'C', 'D', 'E', 'F'];
        loadMonster(currentLevel);
 
        initGrid();
        // 重新载入最新出战英雄
        const heroes = getSelectedHeroes();
        const totalHp = heroes.reduce((sum, h) => sum + (h?.hp || 0), 0);
        initPlayer(totalHp);
        // 重新注册钩子，让新英雄技能生效
        registerGameHooks({
          expand: expandGridTo,
          addGauge: addToAttackGauge,
          hitFlash: monsterHitFlashTime
        });
        drawGame();
        return;
      }
      // 点击回到酒馆按钮
      if (ret && x >= ret.x && x <= ret.x + ret.width &&
                y >= ret.y && y <= ret.y + ret.height) {
        showVictoryPopup = false;
        clearLootChests();
        // 清空上一局宝箱全部临时状态
        globalThis.victoryChestRects   = [];
        globalThis.victoryChestOpened  = [];
        globalThis.victoryChestLoot    = [];
        globalThis.chestDropsThisRound = [];
        globalThis.victoryDialogText   = null;
        globalThis.levelRewardsHeroId  = null;
        globalThis.rewardHeroIconRect  = null;
        globalThis.levelRewards        = [];
        globalThis.heroLevelUps        = [];
        gaugeCount = 0;
        attackGaugeDamage = 0;
        attackDisplayDamage = 0;
        // 保存当前等级到存档
        wx.setStorageSync('lastLevel', currentLevel.toString());
        // 停止游戏流程
        haltGame();
        // 返回到英雄选择（酒馆）界面
        switchPageFn?.('heroSelect');
        return;
      }
      return;
    }

    
  // ✅ 点击超级方块立即触发技能（提早处理）
  const col = Math.floor((x - __gridStartX) / __blockSize);
  const row = Math.floor((y - __gridStartY) / __blockSize);

    // ✅ 点击超级方块触发技能
    if (
      row >= 0 && row < gridSize &&
      col >= 0 && col < gridSize
    ) {
      const block = gridData[row][col];
    
      if (SuperBlockSystem.isSuper?.(block)) {
        if (showVictoryPopup) return;  // ✅ 只有点击超级方块时才禁止触发
    
        SuperBlockSystem.trigger(row, col, ctxRef, gridData, gridSize);
        gridData[row][col] = null;
        drawGame();
        setTimeout(() => processClearAndDrop(), 300);
        return;
      }
    }

  

  // ✅ 失败弹窗点击“回到主页”
  if (showGameOver) {
    const boxW = 260;
    const boxH = 160;
    const boxX = (canvasRef.width - boxW) / 2;
    const boxY = (canvasRef.height - boxH) / 2;
    const btnX = boxX + 60;
    const btnY = boxY + 100;
    const btnW = 140;
    const btnH = 40;

    const inGameOverBtn =
      x >= btnX && x <= btnX + btnW &&
      y >= btnY && y <= btnY + btnH;

      if (inGameOverBtn) {
        switchPageFn?.('home', () => {
          destroyGamePage();

          if (globalThis.victoryPopupTimerId) {
            clearTimeout(globalThis.victoryPopupTimerId);
            globalThis.victoryPopupTimerId = null;
          }
          
        });
      }
      

    return; // ❗ 禁止继续滑动行为
  }

  // ✅ 检测是否点击了左上角“返回”按钮
const btn = globalThis.backToHomeBtn;
if (btn &&
    x >= btn.x && x <= btn.x + btn.width &&
    y >= btn.y && y <= btn.y + btn.height) {

        wx.setStorageSync('lastLevel', currentLevel.toString());

        
  switchPageFn?.('home', () => {
    destroyGamePage(); // 清理资源

    if (globalThis.victoryPopupTimerId) {
        clearTimeout(globalThis.victoryPopupTimerId);
        globalThis.victoryPopupTimerId = null;
      }

      
    globalThis.preCaptureOverlayUntil = null;
wx?.hideToast?.();
  });
  return; // ✅ 不再继续处理滑动
}




  if (!touchStart) return;

  // ✅ 滑动处理逻辑保持不变
  const endX = touch.clientX;
  const endY = touch.clientY;
  const dx = endX - dragStartX;
  const dy = endY - dragStartY;

  const absX = Math.abs(dx);
  const absY = Math.abs(dy);

  let target = null;

  if (absX > absY) {
    if (dx > 20 && touchStart.col < gridSize - 1) {
      target = { row: touchStart.row, col: touchStart.col + 1 };
    } else if (dx < -20 && touchStart.col > 0) {
      target = { row: touchStart.row, col: touchStart.col - 1 };
    }
  } else {
    if (dy > 20 && touchStart.row < gridSize - 1) {
      target = { row: touchStart.row + 1, col: touchStart.col };
    } else if (dy < -20 && touchStart.row > 0) {
      target = { row: touchStart.row - 1, col: touchStart.col };
    }
  }

  if (target) {
    handleSwap(touchStart, target);
  } else {
    if (!selected) {
      selected = touchStart;
    } else {
      const dx = Math.abs(selected.col - touchStart.col);
      const dy = Math.abs(selected.row - touchStart.row);
      const isAdjacent = (dx + dy === 1);
      if (isAdjacent) {
        handleSwap(selected, touchStart);
      } else {
        selected = touchStart;
      }
    }
  }

  touchStart = null;
}


function handleSwap(src, dst) {
    // 捕捉弹窗期间禁止交换
    if (globalThis.capturing) return;
  
    playSound('block_move');
    const temp = gridData[dst.row][dst.col];
    gridData[dst.row][dst.col] = gridData[src.row][src.col];
    gridData[src.row][src.col] = temp;
  
    animateSwap(src, dst, () => {
      // 动画播放完，如果此刻进入了捕捉，也不再继续任何结算
      if (globalThis.capturing) { selected = null; drawGame(); return; }
  
      // 推动敌人攻击进度（保留原逻辑）
      try { increaseEnemyAttackProgress(); } catch (e) {}
  
      if (checkAndClearMatches()) {
        selected = null;
        gaugeCount++;
  
        playerActionCounter++;
  
        const heroes = getSelectedHeroes?.() || [];
        for (const hero of heroes) {
          const fx = hero?.tempEffects;
          if (fx?.gridExpandTurnsLeft !== undefined) {
            fx.gridExpandTurnsLeft--;
            if (fx.gridExpandTurnsLeft <= 0) {
              globalThis.currentChestStats = {};
              globalThis.gridSize = 6;
              initGrid();
              drawGame();
              delete fx.gridExpandTurnsLeft;
              logBattle(`${hero.name} 的棋盘扩展结束，恢复为 6x6`);
            }
          }
        }
  
        // ……（你原来的到期检查与棋盘扩展收尾）……
  
        processClearAndDrop();
      } else {
        // 撤销交换
        const tempBack = gridData[dst.row][dst.col];
        gridData[dst.row][dst.col] = gridData[src.row][src.col];
        gridData[src.row][src.col] = tempBack;
  
        animateSwap(src, dst, () => {
          selected = null;
          drawGame();
        }, true);
      }
    });
  }
  


function destroyGamePage () {

    /* 1. 停止并销毁 BGM */
    if (globalThis.bgmAudioContext) {
      try {
        globalThis.bgmAudioContext.stop();
        globalThis.bgmAudioContext.destroy();
      } catch (e) {}
      globalThis.bgmAudioContext = null;
    }
  
    /* 2. 清除所有关卡临时特效 / 掉落数组 */
    clearLootChests();                       // 移除画面上残留宝箱动画
  
    globalThis.victoryChestRects   = [];
    globalThis.victoryChestOpened  = [];
    globalThis.chestDropsThisRound = [];
    globalThis.victoryChestLoot    = [];     // ★ 关键：清掉上一关掉落
  
    /* 3. 解绑触摸事件，防止重复绑定或内存泄漏 */
    wx.offTouchStart(onTouch);
    wx.offTouchEnd(onTouchend);
  
    // 🧹 捕捉延迟弹窗的定时器清理
if (globalThis.captureModalTimerId) {
    clearTimeout(globalThis.captureModalTimerId);
    globalThis.captureModalTimerId = null;
  }
  // 退出时确保不再处于捕捉态
  globalThis.capturing = false;

  
    /* 4. 结算本局获得的金币 */
    commitSessionCoins();
  }
  
export { expandGridTo };  // ✅ 添加这行

  export default {
    init: initGamePage,
    update: updateGamePage,
    draw: drawGame,
    onTouchend,
    touchend: onTouchend, 
    destroy: destroyGamePage
  };


/**
 * 依次播放 5 个英雄技能并在尾声结算伤害
 * @param {number} dmg - 进入连招前累计的攻击槽伤害
 */


function startHeroBurst(dmg) {
    heroBurstRunning = true;
  
    const heroes     = getSelectedHeroes();     // 长度固定 5
    const interval   = 650;                     // 英雄间隔
    const startDelay = 650;                     // 开场停顿
    let   idx        = 0;
  
    /* 递归播放 */
    function releaseNext() {
      if (idx >= heroes.length) return;
      heroes[idx] && releaseHeroSkill(idx);
      idx++;
      if (idx < heroes.length) setTimeout(releaseNext, interval);
    }
    setTimeout(releaseNext, startDelay);
  
    /* 总时长 = 起始停顿 + 有效英雄数 × 间隔 + 收尾缓冲 */
    const liveCount = heroes.filter(h => h).length;
 
  // ======== 计算动态方块伤害 ========

    function waitSkillsThenFinish() {
        if (skillsActive === 0) {
          startAttackEffect(attackGaugeDamage); // ✅ 使用最新伤害巢值
          drawGame();
          heroBurstRunning = false;
          tryStartHeroBurst();      // 检查队列
        } else {
          // 50 ms 轮询一次，直到 skillsActive 归 0
          setTimeout(waitSkillsThenFinish, 50);
        }
      }
      
      setTimeout(waitSkillsThenFinish, startDelay + liveCount * interval);
  }
  
  function tryStartHeroBurst() {
    if (showVictoryPopup) return;      // ★ 胜利时禁止再开连招
    if (pendingHeroBurst && !heroBurstRunning && !clearingRunning) {
      pendingHeroBurst = false;
      const heroes = getSelectedHeroes();
const interval = 600;            // 每个英雄动画的间隔
const startDelay = 600;          // 首次释放前延迟
const totalHeroes = heroes.filter(h => h).length;
const totalDuration = startDelay + totalHeroes * interval + 300;

let i = 0;
function releaseNext() {
  if (i >= heroes.length) return;
  if (heroes[i]) releaseHeroSkill(i);
  i++;
  setTimeout(releaseNext, interval);
}

setTimeout(releaseNext, startDelay);

// 💥 等所有技能释放后再结算攻击
// 延迟后开始轮询动画是否结束
setTimeout(() => {
  function waitForAllSkills() {
    if (skillsActive === 0) {
      startAttackEffect(attackGaugeDamage);  // ✅ 动画播完 + 最新值
    } else {
      setTimeout(waitForAllSkills, 50);      // 继续等待
    }
  }
  waitForAllSkills();
}, totalDuration);
    }
  }
  function releaseHeroSkill(slotIndex) {
    skillsActive++;                 // 技能开始 → +1
    const hero = getSelectedHeroes()[slotIndex];
    if (!hero) return;
  
    // ✅ 添加技能对话特效
    const skillName = HeroData.heroes.find(h => h.id === hero.id)?.skill?.name || '技能';
    createSkillDialog(slotIndex, skillName);
  
    const eff = hero.skill?.effect;
    if (!eff) return;
  
    console.log("释放技能：", hero.name, hero.skill?.effect);
  
    // ⛳️ 关键：把 dealDamage 包装为永远 allowKill
    const context = {
      dealDamage: (value, options = {}) => {
        // 无论技能是否传 options，都强制允许击杀
        return dealDamage(value, { ...options, allowKill: true });
      },
      log: logBattle,
      canvas: canvasRef,
      addGauge: (value) => {
        const delta = Math.round(value);
        attackGaugeDamage += delta;
        pendingBurstDamage += delta;
        damagePopTime = Date.now();
      },
      mulGauge: (factor) => {
        attackGaugeDamage = Math.round(attackGaugeDamage * factor);
        pendingBurstDamage = attackGaugeDamage;
        damagePopTime = Date.now();
      }
    };
  
    applySkillEffect(hero, eff, context);
  
    // 添加释放特效（在能量条清空前）
    const size = 48;
    const spacing = 12;
    const totalWidth = 5 * size + 4 * spacing;
    const startX = (canvasRef.width - totalWidth) / 2;
    const topMargin = __gridStartY - 80;
    const barW = size;
    const barH = 6;
    const barX = startX + slotIndex * (size + spacing);
    const barY = topMargin + size + 6;
  
    // 🌟 能量高亮
    createChargeGlowEffect(barX - 1, barY - 1, barW + 2, barH + 2);
    createChargeReleaseEffect(barX, barY, barW, barH);
  
    setCharge(slotIndex, 0);
    createExplosion(canvasRef.width / 2, canvasRef.height / 2);
  
    const SKILL_END_MS = 1200;
    setTimeout(() => {
      skillsActive--;
    }, SKILL_END_MS);
  
    // ✅ 技能表现：触发头像动画（默认样式）
    createAvatarFlash(slotIndex, 1.3, 500);
  
    // ✅ 可扩展技能特效表现（保留你的原逻辑）
    if (hero.id === 'hero002') {
      createFloatingText('火球术！', canvasRef.width / 2, 160, '#FF6600');
      createExplosion(canvasRef.width / 2, 140, '#FF3300');
    } else if (hero.id === 'hero006') {
      createFloatingText('圣光祷言', canvasRef.width / 2, 160, '#66FFFF');
    }
  }
  
  


  function startAttackEffect(dmg) {
    // 🛟 兜底：如果技能阶段已经把怪物打死，而槽伤害为 0
    if (dmg <= 0) {
      if (isMonsterDead && isMonsterDead()) {
        const monster = getMonster && getMonster();
        if (monster?.isBoss && typeof markBossDefeated === 'function') {
          markBossDefeated(monster.level);
        }
        setTimeout(() => {
          earnedGold = getMonsterGold();
          addCoins(earnedGold);
          goldPopTime   = Date.now();
          displayedGold = getSessionCoins();
          levelJustCompleted = currentLevel;
  
          // 经验结算（沿用你现有的计算方式）
          const currentMonster = typeof getMonster === 'function' ? getMonster() : null;
          const exp = currentMonster?.exp ?? (function () {
            const lv = currentMonster?.level ?? 1;
            const isBoss = currentMonster?.isBoss ?? false;
            return Math.floor(lv * 5 + 10 + (isBoss ? 50 : 0));
          })();
          globalThis.expGainedThisRound = exp;
          if (typeof rewardExpToHeroes === 'function') {
            rewardExpToHeroes(exp);
          }
  
          // 弹窗 & 状态（与你原胜利流程保持一致）
          globalThis.levelRewards = [];
          globalThis.victoryDialogText =
            VictoryDialogLines[Math.floor(Math.random() * VictoryDialogLines.length)];
  
            scheduleVictoryPopup();   // 统一用全局延迟

          clearLootChests?.();
          lockForVictory?.();
          popupGoldDisplayed = 0;
          popupGoldStartTime = Date.now();
  
          updatePlayerStats?.({
            stage: currentLevel,
            damage: 0,                   // 此次由技能击杀，槽伤害为 0
            gold: getSessionCoins()
          });
  
          if (wx && typeof wx.setStorageSync === 'function') {
            wx.setStorageSync('lastLevel', currentLevel.toString());
          }
          drawGame?.();
        }, 600);
      }
      return; // 原有的 return 保留
    }
  
    // ===== 下面保持你原有的槽伤害投射 & 结算逻辑不变 =====
  
    if (dmg <= 0) return;
  
    // ① 清零界面累计
    attackGaugeDamage   = 0;
    attackDisplayDamage = 0;
  
    // ② 记录待结算伤害
    pendingDamage = dmg;
  
    // ③ 发射飞弹：起点 = 伤害数字中心，终点 = 怪物中心
    const startX = canvasRef.width / 2;
    const startY = __gridStartY - 40;
    const endX   = canvasRef.width / 2;
    const endY   = 180;
  
    createProjectile(startX, startY, endX, endY, 500, () => {
  
      // 飞弹到达 ⇒ 怪物掉血 & 受击闪
      dealDamage(pendingDamage, { allowKill: true });
      playSound('monster_hit');
      createMonsterBounce();
      createExplosion(endX, endY);
      monsterHitFlashTime = Date.now();
  
      // 飘字（保留你的表现）
      const color = pendingDamage > 10000 ? '#FFFF00'
                   : pendingDamage > 2000  ? '#FF6600'
                   : '#FF4444';
      const size  = pendingDamage > 10000 ? 64
                   : pendingDamage > 2000  ? 48
                   : 36;
      showDamageText(pendingDamage, endX, endY + 50);
  
      pendingDamage = 0;
      setTimeout(() => { gaugeCount = 0; }, 500);
  
      if (isMonsterDead()) {
        const monster = getMonster();
        if (monster.isBoss) {
          markBossDefeated(monster.level);
        }
      
        // 这些统计和结算仍然“立刻”执行
        earnedGold = getMonsterGold();
        addCoins(earnedGold);
        goldPopTime       = Date.now();
        displayedGold     = getSessionCoins();
      
        if (typeof rewardExpToHeroes === 'function') {
          rewardExpToHeroes(exp);
        }
      
        globalThis.levelRewards = [];
        globalThis.victoryDialogText =
          VictoryDialogLines[Math.floor(Math.random() * VictoryDialogLines.length)];
      
        clearLootChests?.();
        lockForVictory?.();
        popupGoldDisplayed = 0;
        popupGoldStartTime = Date.now();
      
        updatePlayerStats?.({
          stage: currentLevel,
          damage: dmg,
          gold: getSessionCoins()
        });
      
        wx?.setStorageSync?.('lastLevel', currentLevel.toString());
        drawGame?.();
      
        // ★ 统一延迟弹窗（改这里）
        scheduleVictoryPopup();   // 用你的全局延迟，比如 800/1000ms
      
        return; // ❗ 停止继续 loadMonster
      }
       else {
        setTimeout(() => { monsterRetaliate(); }, 1000);
      }
  
      if ((globalThis.gridExpandTurns || 0) > 0) {
        globalThis.gridExpandTurns--;
        if (globalThis.gridExpandTurns === 0) {
          globalThis.gridSize = 6;
          initGrid();
          drawGame();
          logBattle("棋盘扩展效果结束，恢复为 6x6");
        }
      }
    }, pendingDamage);
  }
  

function monsterRetaliate() {
  const monster = getMonster();
  if (!monster || monster.hp <= 0) return;

  const dmg = getMonsterDamage();
  if (dmg <= 0) return;

  const hp = globalThis.hpBarPos || { x: 24, y: 24, width: 280, height: 20 };
  const floatX = hp.x + hp.width / 2;
  const floatY = hp.y + hp.height / 2;

  showDamageText(dmg, floatX, floatY);
  takeDamage(dmg);
  playSound('player_hurt');
  createShake?.(300, 4);
  createMonsterAttackFlash();
  createMonsterBounce();

  createExplosion(hp.x + hp.width / 2, hp.y + hp.height / 2, '#FF4444');
  drawPlayerHp(ctxRef, canvasRef, hp.x, hp.y);

  if (isPlayerDead()) {
    showGameOver = true;
  }
}

  

function expandGridTo({ size = 7, steps = 3, hero }) {
  globalThis.gridSize = size;

  hero.tempEffects = hero.tempEffects || {};
  hero.tempEffects.gridExpandTurnsLeft = steps;  // ✅ 设置倒计时次数为3

  initGrid();
  drawGame();
}

/**
 * 给上阵英雄分配经验，并收集“谁升了级”
 * @param {number} expAmount - 要分配的经验值
 */


function rewardExpToHeroes(expAmount) {
    console.log('📘📘📘【经验分发】英雄获得经验 +%d', expAmount);
    heroLevelUps = [];                           // 先清空上一关的数据
  
    const heroes = getSelectedHeroes();          // 你自己已有的函数，返回本关参战英雄数组
  
    heroes.forEach(hero => {
      if (!hero) return;
  
      const oldLv = hero.level;                  // 记录旧等级
      hero.gainExp(expAmount);                   // 原有经验逻辑
  
      if (hero.level > oldLv) {                  // 只有真正升级才记录
        // 头像，如果已经在全局缓存里，就用；否则留空，弹窗那边会用灰色占位
        const avatar = globalThis.imageCache?.[hero.icon] || null;
  
         heroLevelUps.push({
               hero,         
               name : hero.name,                                  // 直接塞整只英雄对象
               oldLevel: oldLv,
               newLevel: hero.level
        });
      }
    });
  
    // 给弹窗用（drawGame 会读取）
    globalThis.heroLevelUps = heroLevelUps;
  }
  
function resetSessionState () {
    gaugeCount = 0;
    attackGaugeDamage = 0;
    pendingDamage = 0;
    playerActionCounter = 0;
    resetCharges();
    globalThis.currentChestStats = {};          // 清掉统计
    globalThis.victoryChestRects  = [];
    globalThis.victoryChestOpened = [];
    globalThis.victoryChestLoot   = [];
    globalThis.victoryOpenAllArea = null;
    chestGoldEarned        = 0;
popupChestGoldDisplayed = 0;
  }
  


  export {
    monsterHitFlashTime,
    gridData,
    dropBlocks,
    fillNewBlocks,
    checkAndClearMatches  // ✅ 不要再重复 export drawGame
  };
