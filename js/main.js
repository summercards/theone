import DataBus, { GemType, GemSpecialType } from './databus'
import MusicManager from './music'

const canvas = wx.createCanvas()
const ctx = canvas.getContext('2d')
const databus = new DataBus()
const music = new MusicManager()

const SCREEN_WIDTH = canvas.width
const SCREEN_HEIGHT = canvas.height
const PI2 = Math.PI * 2

// 颜色配置
const GEM_STYLES = [
  { type: 0, color: '#ef4444', ring: '#f87171', shadow: '#ef4444' }, // RED
  { type: 1, color: '#22d3ee', ring: '#22d3ee', shadow: '#22d3ee' }, // BLUE
  { type: 2, color: '#34d399', ring: '#34d399', shadow: '#34d399' }, // GREEN
  { type: 3, color: '#facc15', ring: '#facc15', shadow: '#facc15' }, // YELLOW
  { type: 4, color: '#a855f7', ring: '#c084fc', shadow: '#a855f7' }, // PURPLE
  { type: 5, color: '#f97316', ring: '#fb923c', shadow: '#f97316' }, // ORANGE
  { type: 6, color: '#ffffff', ring: '#ffffff', shadow: '#ffffff' }   // WHITE
]

// 各关卡配置表，来源于 H5 版本的 LEVELS。不同关卡对应不同的棋盘尺寸、
// 可用宝石数量、目标分数（作为敌人最大 HP）以及可用步数。
// 如果关卡号超出该表，则使用表中的最后一项配置。
const LEVEL_CONFIGS = [
  { level: 1, width: 6, height: 7, typesCount: 4, targetScore: 1000, moves: 15 },
  { level: 2, width: 6, height: 7, typesCount: 5, targetScore: 2500, moves: 20 },
  { level: 3, width: 7, height: 8, typesCount: 5, targetScore: 4000, moves: 22 },
  { level: 4, width: 7, height: 8, typesCount: 6, targetScore: 6000, moves: 25 },
  { level: 5, width: 8, height: 9, typesCount: 6, targetScore: 8000, moves: 28 },
  { level: 6, width: 8, height: 9, typesCount: 6, targetScore: 12000, moves: 30 },
  { level: 7, width: 8, height: 9, typesCount: 6, targetScore: 16000, moves: 32 },
  { level: 8, width: 8, height: 9, typesCount: 6, targetScore: 22000, moves: 35 },
  { level: 9, width: 8, height: 9, typesCount: 6, targetScore: 30000, moves: 38 },
  { level: 10, width: 8, height: 9, typesCount: 6, targetScore: 50000, moves: 40 }
]

export default class Main {
  constructor() {
    this.restart()
    wx.onTouchStart(this.touchStartHandler.bind(this))
    
    // 初始化背景雨
    for(let i=0; i<15; i++) this.spawnRain(true)

    // 初始化霓虹方块：为背景添加漂浮方形效果（进一步减少数量）
    // 之前基于 H5 版本将方块数量减半为 5，这里再减少一半至 3，使背景更加简洁
    for (let i = 0; i < 3; i++) this.spawnCyberBlock(true)
    
    // 兼容旧逻辑：部分场景仍引用 findMatches() 函数。由于微信小程序的
    // 构建流程有时会将类方法打平，这里显式将 findMatches 映射到
    // findMatchesDetailed，确保在 fillBoard 等早期调用时存在此方法。
    // 通过 bind(this) 绑定实例保证内部 this 指向一致。
    this.findMatches = this.findMatchesDetailed.bind(this)

    // 记录游戏开始时间，用于节奏指示
    this.startTime = Date.now()

    // 用于动态背景色调旋转的参数
    this.hue = 200 // 初始色调

    // 上一个节拍索引，用于检测节拍变化
    this.prevBeatIndex = -1

    // 启动主循环
    this.loop()
  }

  // 处理通关逻辑
  handleWin() {
    if (!databus.gameWin) return
    // 如果尚未创建通关弹窗，则创建
    // 计算通关分数和评级并存储，用于弹窗显示
    if (!databus.levelText) {
      // 计算得分和评级。评分按分数/目标分数比例
      const score = databus.score
      const target = databus.enemyMaxHp || 1
      const ratio = score / target
      let rating = 'C'
      if (ratio >= 2.0) rating = 'S'
      else if (ratio >= 1.5) rating = 'A'
      else if (ratio >= 1.2) rating = 'B'
      databus.levelText = { text: 'LEVEL CLEAR!', score, rating, opacity: 1 }
    }
    // 通关状态下停止棋盘处理
    databus.isProcessing = false
  }

  // 处理失败逻辑
  handleGameOver() {
    if (!databus.gameOver) return
    // 显示失败文字
    if (!databus.levelText) {
      databus.levelText = { text: 'GAME OVER', timer: 120, opacity: 1 }
    }
    if (databus.levelText && databus.levelText.timer <= 0) {
      // 重置到第一关，清空棋盘
      databus.reset()
      databus.level = 1
      databus.gameOver = false
      databus.isEnemyDead = false
      databus.levelText = null
      // 根据第一关配置初始化
      this.applyLevelConfig(databus.level)
      // 初始化棋盘布局和宝石
      this.initBoardLayout()
      this.fillBoard()
    }
  }

  restart() {
    // 重置数据并根据关卡应用配置
    databus.reset()
    // 根据当前关卡设置棋盘尺寸、宝石数量、目标分数和步数
    this.applyLevelConfig(databus.level)
    this.initBoardLayout()
    this.fillBoard()
  }

  /**
   * 根据关卡号应用配置。
   * 查找 LEVEL_CONFIGS 中对应的配置，若超出范围则使用最后一项。
   * 更新棋盘尺寸、可用宝石种类数、敌人最大 HP、敌人当前 HP、剩余步数等。
   */
  applyLevelConfig(level) {
    let config = LEVEL_CONFIGS.find(cfg => cfg.level === level)
    if (!config) config = LEVEL_CONFIGS[LEVEL_CONFIGS.length - 1]
    databus.width = config.width
    databus.height = config.height
    databus.typesCount = config.typesCount
    databus.enemyMaxHp = config.targetScore
    // 初始 HP 为 0，血条从空开始填充
    databus.enemyHp = 0
    databus.movesLeft = config.moves

    // 初始化节奏相关状态
    databus.boardScale = 1
    databus.boardScaleTimer = 0
    databus.devilColorIndex = 0
    // 默认怪物颜色与第一个宝石颜色一致
    databus.devilColor = GEM_STYLES[0].color
  }

  initBoardLayout() {
    // 根据屏幕大小动态计算棋盘布局，使棋盘始终可见且居中。
    // 预留顶部约 42% 的高度给战斗场景和节奏指示，底部预留 20px。
    const paddingX = 20
    const uiHeight = SCREEN_HEIGHT * 0.42
    const bottomPadding = 20
    const availableWidth = SCREEN_WIDTH - paddingX * 2
    const availableHeight = SCREEN_HEIGHT - uiHeight - bottomPadding
    // 根据棋盘宽高计算每个宝石的可用大小
    const sizeX = Math.floor(availableWidth / databus.width)
    const sizeY = Math.floor(availableHeight / databus.height)
    // 限制宝石尺寸不超过 60，不小于 28
    let size = Math.min(sizeX, sizeY, 60)
    if (size < 28) size = 28
    databus.gemSize = size
    // 计算棋盘整体宽度，水平居中
    const boardWidth = databus.gemSize * databus.width
    databus.startX = Math.floor((SCREEN_WIDTH - boardWidth) / 2)
    // 棋盘顶端位置位于预留 UI 区域下方
    databus.startY = uiHeight
  }

  // --- 1. 生成与初始化 ---

  fillBoard() {
    for (let x = 0; x < databus.width; x++) {
      for (let y = 0; y < databus.height; y++) {
        this.createGem(x, y)
      }
    }
    // 初始盘面检查，避免开局就有消除
    if (this.findMatches().size > 0) {
       databus.board = []
       this.fillBoard()
    }
  }

  createGem(x, y) {
    // 使用当前关卡的 typesCount 限制可用颜色数量
    const type = Math.floor(Math.random() * databus.typesCount)
    const rand = Math.random()
    let special = GemSpecialType.NONE
    let isLocked = false

    // 特殊宝石概率
    if (rand < 0.05) special = GemSpecialType.BOOMBOX
    else if (rand < 0.08) special = Math.random() > 0.5 ? GemSpecialType.LASER_H : GemSpecialType.LASER_V
    else if (rand < 0.09) special = GemSpecialType.VINYL
    
    // 锁概率 (仅普通宝石)
    if (special === GemSpecialType.NONE && Math.random() < 0.03) isLocked = true

    databus.board.push({
      id: Math.random().toString(),
      x, y,
      realX: databus.startX + x * databus.gemSize,
      realY: databus.startY + y * databus.gemSize,
      type,
      special,
      isLocked,
      scale: 1,
      alpha: 1
    })
  }

  // --- 2. 交互逻辑 ---

  touchStartHandler(e) {
    if (databus.isProcessing) return
    // 通关或失败状态下，只有点击按钮时才处理
    if (databus.gameOver || databus.gameWin) {
       // 如果是通关且存在下一关按钮，则检测点击是否在按钮范围内
       if (databus.gameWin && databus.nextButtonBounds) {
         const btn = databus.nextButtonBounds
         // 使用未缩放坐标检测
         const clickX = e.touches[0].clientX
         const clickY = e.touches[0].clientY
         if (clickX >= btn.x && clickX <= btn.x + btn.width && clickY >= btn.y && clickY <= btn.y + btn.height) {
           // 进入下一关
           const nextLevel = databus.level + 1
           databus.reset()
           databus.level = nextLevel
           databus.gameWin = false
           databus.isEnemyDead = false
           databus.levelText = null
           // 初始化关卡配置和棋盘
           this.applyLevelConfig(databus.level)
           this.initBoardLayout()
           this.fillBoard()
         }
       }
       // 点击屏幕其他区域忽略
       return
    }

    const touch = e.touches[0]
    const x = touch.clientX
    const y = touch.clientY

    // 考虑棋盘缩放：将点击坐标反向缩放回棋盘内部坐标
    // 计算棋盘中心
    const cx = databus.startX + (databus.width * databus.gemSize) / 2
    const cy = databus.startY + (databus.height * databus.gemSize) / 2
    // 偏移并缩放回未缩放坐标
    const dx = x - cx
    const dy = y - cy
    const unscaledX = cx + dx / databus.boardScale
    const unscaledY = cy + dy / databus.boardScale
    if (unscaledX >= databus.startX && unscaledX <= databus.startX + databus.width * databus.gemSize &&
        unscaledY >= databus.startY && unscaledY <= databus.startY + databus.height * databus.gemSize) {
      const col = Math.floor((unscaledX - databus.startX) / databus.gemSize)
      const row = Math.floor((unscaledY - databus.startY) / databus.gemSize)
      const gem = this.getGemAt(col, row)
      // 锁定的宝石无法点击
      if (gem && !gem.isLocked) this.onGemClick(gem)
      else music.playInvalid()
    }
  }

  getGemAt(x, y) { return databus.board.find(g => g.x === x && g.y === y) }

  onGemClick(gem) {
    // 节奏判定：记录此次点击的节奏评级
    const rhythm = music.checkRhythm()
    databus.lastRhythm = rhythm
    // 在宝石上方显示节奏提示
    if (rhythm === 'PERFECT') {
      this.createFlyText("PERFECT!", gem.realX + databus.gemSize / 2, gem.realY - 20)
    } else if (rhythm === 'GOOD') {
      this.createFlyText("GOOD", gem.realX + databus.gemSize / 2, gem.realY - 20)
    } else {
      this.createFlyText("MISS", gem.realX + databus.gemSize / 2, gem.realY - 20)
    }

    if (!databus.selectedGem) {
      // 点击特殊宝石直接触发
      if (gem.special !== GemSpecialType.NONE) {
          databus.movesLeft--
          this.triggerSpecialDirectly(gem)
          return
      }
      databus.selectedGem = gem
      music.playTone(600, 'sine', 0.05)
    } else {
      if (databus.selectedGem === gem) {
        databus.selectedGem = null
      } else if (Math.abs(databus.selectedGem.x - gem.x) + Math.abs(databus.selectedGem.y - gem.y) === 1) {
        this.swapGems(databus.selectedGem, gem)
        databus.selectedGem = null
      } else {
        databus.selectedGem = gem
        music.playTone(600, 'sine', 0.05)
      }
    }
  }

  triggerSpecialDirectly(gem) {
      databus.isProcessing = true
      // 构造一个只包含该特殊宝石的 Set 开始递归爆炸
      const startSet = new Set([gem])
      this.executeElimination(startSet)
  }

  swapGems(gem1, gem2) {
    databus.isProcessing = true
    music.playSwap()
    
    // 交换数据坐标
    const tX = gem1.x, tY = gem1.y
    gem1.x = gem2.x; gem1.y = gem2.y
    gem2.x = tX; gem2.y = tY

    const dest1 = { realX: databus.startX + gem1.x * databus.gemSize, realY: databus.startY + gem1.y * databus.gemSize }
    const dest2 = { realX: databus.startX + gem2.x * databus.gemSize, realY: databus.startY + gem2.y * databus.gemSize }

    // 动画
    this.addTween(gem1, dest1, 200)
    this.addTween(gem2, dest2, 200, () => {
      const { matchedSet } = this.findMatchesDetailed()
      if (matchedSet.size === 0) {
        // 无匹配，还原
        music.playInvalid()
        const tX = gem1.x, tY = gem1.y
        gem1.x = gem2.x; gem1.y = gem2.y
        gem2.x = tX; gem2.y = tY
        this.addTween(gem1, { realX: databus.startX + gem1.x * databus.gemSize, realY: databus.startY + gem1.y * databus.gemSize }, 200)
        this.addTween(gem2, { realX: databus.startX + gem2.x * databus.gemSize, realY: databus.startY + gem2.y * databus.gemSize }, 200, () => databus.isProcessing = false)
      } else {
        // 匹配成功
        databus.movesLeft--
        this.processElimination() // 开始消除流程
      }
    })
  }

  // --- 3. 核心消除算法 ---

  /**
   * 高级匹配检测：返回需要消除的宝石集合以及需要生成的特殊宝石
   * 支持检测横向/纵向 3 连起消除，并根据组合产生特殊宝石：
   *  - T/L 形交叉触发 Boombox
   *  - 4 连触发激光：横向 4 连生成竖向激光，纵向 4 连生成横向激光
   *  - 5 连触发 Vinyl
   */
  findMatchesDetailed() {
    const matchedIds = new Set()
    const specialSpawns = []
    const getGem = (x, y) => databus.board.find(g => g.x === x && g.y === y)
    const hMatches = []
    const vMatches = []
    const gemInH = new Map()
    const gemInV = new Map()
    // 横向扫描
    for (let y = 0; y < databus.height; y++) {
      let curr = []
      for (let x = 0; x < databus.width; x++) {
        const g = getGem(x, y)
        if (!g) {
          if (curr.length >= 3) hMatches.push([...curr])
          curr = []
          continue
        }
        if (curr.length === 0) {
          curr.push(g)
        } else if (curr[0].type === g.type) {
          curr.push(g)
        } else {
          if (curr.length >= 3) hMatches.push([...curr])
          curr = [g]
        }
      }
      if (curr.length >= 3) hMatches.push([...curr])
    }
    // 纵向扫描
    for (let x = 0; x < databus.width; x++) {
      let curr = []
      for (let y = 0; y < databus.height; y++) {
        const g = getGem(x, y)
        if (!g) {
          if (curr.length >= 3) vMatches.push([...curr])
          curr = []
          continue
        }
        if (curr.length === 0) {
          curr.push(g)
        } else if (curr[0].type === g.type) {
          curr.push(g)
        } else {
          if (curr.length >= 3) vMatches.push([...curr])
          curr = [g]
        }
      }
      if (curr.length >= 3) vMatches.push([...curr])
    }
    // 建立索引
    hMatches.forEach(group => group.forEach(g => {
      if (!gemInH.has(g.id)) gemInH.set(g.id, [])
      gemInH.get(g.id).push(group)
    }))
    vMatches.forEach(group => group.forEach(g => {
      if (!gemInV.has(g.id)) gemInV.set(g.id, [])
      gemInV.get(g.id).push(group)
    }))
    const processed = new Set()
    // 交叉匹配 -> Boombox
    databus.board.forEach(g => {
      if (gemInH.has(g.id) && gemInV.has(g.id) && !processed.has(g.id)) {
        specialSpawns.push({ x: g.x, y: g.y, type: GemSpecialType.BOOMBOX, gemType: g.type })
        gemInH.get(g.id).forEach(gr => gr.forEach(it => { matchedIds.add(it.id); processed.add(it.id) }))
        gemInV.get(g.id).forEach(gr => gr.forEach(it => { matchedIds.add(it.id); processed.add(it.id) }))
      }
    })
    // 处理横向组合
    hMatches.forEach(group => {
      if (group.every(g => processed.has(g.id))) return
      group.forEach(g => matchedIds.add(g.id))
      if (group.length >= 5) {
        const mid = group[2]
        specialSpawns.push({ x: mid.x, y: mid.y, type: GemSpecialType.VINYL, gemType: GemType.WHITE })
      } else if (group.length === 4) {
        const spawn = group[1]
        specialSpawns.push({ x: spawn.x, y: spawn.y, type: GemSpecialType.LASER_V, gemType: group[0].type })
      }
    })
    // 处理纵向组合
    vMatches.forEach(group => {
      if (group.every(g => processed.has(g.id))) return
      group.forEach(g => matchedIds.add(g.id))
      if (group.length >= 5) {
        const mid = group[2]
        specialSpawns.push({ x: mid.x, y: mid.y, type: GemSpecialType.VINYL, gemType: GemType.WHITE })
      } else if (group.length === 4) {
        const spawn = group[1]
        specialSpawns.push({ x: spawn.x, y: spawn.y, type: GemSpecialType.LASER_H, gemType: group[0].type })
      }
    })
    const matchedSet = new Set()
    matchedIds.forEach(id => {
      const gem = databus.board.find(g => g.id === id)
      if (gem) matchedSet.add(gem)
    })
    return { matchedSet, specialSpawns }
  }

  /**
   * 向后兼容函数，返回基础匹配集合。
   * 新增的高级匹配逻辑请参见 findMatchesDetailed()。
   */
  findMatches() {
    const { matchedSet } = this.findMatchesDetailed()
    return matchedSet
  }

  // 递归爆炸逻辑（处理特殊宝石连锁）
  getExplodedGems(basicMatches) {
    let explodedSet = new Set(basicMatches)
    let queue = Array.from(basicMatches)
    let visited = new Set(queue.map(g => g.id))

    while(queue.length > 0) {
      const gem = queue.shift()
      
      // 如果被消除的是特殊宝石，触发额外效果
      if (gem.special !== GemSpecialType.NONE) {
        let targets = []
        
        if (gem.special === GemSpecialType.BOOMBOX) {
           music.playBoombox()
           databus.board.forEach(t => {
             if (Math.abs(t.x - gem.x) <= 1 && Math.abs(t.y - gem.y) <= 1) targets.push(t)
           })
        } 
        else if (gem.special === GemSpecialType.LASER_H) {
           music.playLaser()
           targets = databus.board.filter(t => t.y === gem.y)
        }
        else if (gem.special === GemSpecialType.LASER_V) {
           music.playLaser()
           targets = databus.board.filter(t => t.x === gem.x)
        }
        else if (gem.special === GemSpecialType.VINYL) {
           music.playVinyl()
           // 随机选择一种当前关卡的宝石颜色
           const randType = Math.floor(Math.random() * databus.typesCount)
           targets = databus.board.filter(t => t.type === randType)
        }

        targets.forEach(t => {
          if (!visited.has(t.id)) {
            visited.add(t.id)
            explodedSet.add(t)
            queue.push(t) // 连锁：将新炸到的宝石加入队列
          }
        })
      }
    }
    return explodedSet
  }

  // 消除流程入口
  processElimination() {
    // 使用高级匹配检测，返回匹配集合和特殊宝石生成信息
    const { matchedSet, specialSpawns } = this.findMatchesDetailed()
    // 如果已经通关或游戏结束，则直接跳过消除，保持棋盘静止
    if (databus.gameWin || databus.gameOver) {
       databus.isProcessing = false
       return
    }
    // 无匹配时结束流程，重置状态
    if (matchedSet.size === 0) {
       databus.isProcessing = false
       databus.combo = 0
       // 没有步数了判定失败
       if (databus.movesLeft <= 0) databus.gameOver = true
       return
    }
    // 记录待生成的特殊宝石，在下落后插入
    if (specialSpawns && specialSpawns.length) {
       databus.pendingSpawns.push(...specialSpawns)
    }
    this.executeElimination(matchedSet)
  }

  // 执行消除与下落
  executeElimination(startSet) {
    // 增加连击计数
    databus.combo += 1
    // 计算连锁爆炸集合
    const finalSet = this.getExplodedGems(startSet)
    const matchesArray = Array.from(finalSet)

    // 根据节奏判定计算伤害倍率
    let rhythmMulti = 1
    const rhythm = databus.lastRhythm
    if (rhythm === 'GOOD') rhythmMulti = 1.5
    else if (rhythm === 'PERFECT') rhythmMulti = 2
    // 伤害公式：数量 * 20 * 连击 * 节奏倍数
    const base = matchesArray.length * 20
    const damage = Math.floor(base * databus.combo * rhythmMulti)
    // 累加分数和敌人 HP。HP 从 0 开始累加，达到目标分数则进入胜利。
    databus.score += damage
    databus.enemyHp = Math.min(databus.enemyHp + damage, databus.enemyMaxHp)
    // 播放匹配音效，音调随连击提高
    music.playMatch(databus.combo, matchesArray[0].type)
    // 文字提示：伤害
    this.createFlyText(damage, SCREEN_WIDTH/2 + (Math.random()*60-30), databus.startY - 50, databus.combo > 1)
    // 连击提示
    if (databus.combo > 1) {
        this.createFlyText(databus.combo + " COMBO!", SCREEN_WIDTH/2, databus.startY - 100, true)
    }
    // 节奏提示
    if (rhythm === 'GOOD') {
        this.createFlyText('GOOD!', SCREEN_WIDTH/2, databus.startY - 130)
    } else if (rhythm === 'PERFECT') {
        this.createFlyText('PERFECT!', SCREEN_WIDTH/2, databus.startY - 130)
    }
    // 特效：冲击波和飞弹
    // 主冲击波
    this.createShockwave(matchesArray[0].type)
    // 附加回响波数量基于连击数或节奏等级
    let echoCount = 0
    if (databus.combo >= 3) echoCount = 1
    if (rhythm === 'PERFECT') echoCount += 1
    if (echoCount > 0) this.createEchoWave(matchesArray[0].type, echoCount)
    // 投射物从两侧发射
    this.createProjectile(matchesArray[0].type)

    // 击中敌人闪白效果
    databus.enemyFlashTimer = 10
    // 重置节奏评分，避免影响下一次消除
    databus.lastRhythm = null

    // 消除动画：逐个缩小并淡出匹配宝石，然后删除再下落
    // 创建方形扩散特效
    matchesArray.forEach(gem => {
      this.createSquareEffect(gem.realX + databus.gemSize/2, gem.realY + databus.gemSize/2, GEM_STYLES[gem.type].color)
    })
    let count = 0
    matchesArray.forEach(gem => {
      this.createParticles(gem.realX + databus.gemSize/2, gem.realY + databus.gemSize/2, GEM_STYLES[gem.type].color)
      this.addTween(gem, { scale: 0, alpha: 0 }, 200, () => {
         count++
         if (count === matchesArray.length) {
            // 从棋盘中移除所有待删除宝石
            databus.board = databus.board.filter(g => !finalSet.has(g))
            this.handleFall()
         }
      })
    })
  }

  handleFall() {
    let maxTime = 0
    // 1. 现有宝石下落
    for (let x = 0; x < databus.width; x++) {
      let writeY = databus.height - 1
      for (let y = databus.height - 1; y >= 0; y--) {
        const gem = this.getGemAt(x, y)
        if (gem) {
          if (gem.y !== writeY) {
            gem.y = writeY
            this.addTween(gem, { realY: databus.startY + writeY * databus.gemSize }, 300)
            maxTime = Math.max(maxTime, 300)
          }
          writeY--
        }
      }
      // 2. 填充新宝石
      while (writeY >= 0) {
        // 这里简化：掉落的新宝石随机生成，不带锁
        // 新宝石类型按照当前关卡限制种类
        const type = Math.floor(Math.random() * databus.typesCount)
        // 5% 概率生成新特殊宝石
        let special = GemSpecialType.NONE
        if (Math.random() < 0.05) special = GemSpecialType.BOOMBOX 
        
        const gem = {
          id: Math.random().toString(),
          x, y: writeY,
          realX: databus.startX + x * databus.gemSize,
          realY: databus.startY - databus.gemSize, // 从屏幕上方落下
          type,
          special,
          isLocked: false,
          scale: 1, alpha: 1
        }
        databus.board.push(gem)
        this.addTween(gem, { realY: databus.startY + writeY * databus.gemSize }, 300)
        maxTime = Math.max(maxTime, 300)
        writeY--
      }
    }
    // 下落动画完成后，先插入待生成的特殊宝石，再次检查是否可以连击
    setTimeout(() => {
        // 插入特殊宝石
        this.insertPendingSpecials()
        this.processElimination()
    }, maxTime + 50)
  }

  // --- 4. 渲染系统 ---

  render() {
    // 背景：使用动态径向渐变
    const hue = this.hue
    const grad = ctx.createRadialGradient(
      SCREEN_WIDTH/2,
      databus.startY * 0.2,
      50,
      SCREEN_WIDTH/2,
      databus.startY * 0.2,
      Math.max(SCREEN_WIDTH, SCREEN_HEIGHT)
    )
    const c1 = `hsla(${(hue + 0) % 360}, 60%, 10%, 1)`
    const c2 = `hsla(${(hue + 30) % 360}, 60%, 20%, 1)`
    const c3 = `hsla(${(hue + 60) % 360}, 60%, 5%, 1)`
    grad.addColorStop(0, c1)
    grad.addColorStop(0.5, c2)
    grad.addColorStop(1, c3)
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT)

    this.renderBattleScene()
    // 绘制怪物 HP 条
    this.renderHpBar()
    // 在节奏下对棋盘进行缩放。先保存状态，再以棋盘中心缩放，然后绘制棋盘背景和宝石。
    ctx.save()
    const boardCx = databus.startX + (databus.width * databus.gemSize) / 2
    const boardCy = databus.startY + (databus.height * databus.gemSize) / 2
    ctx.translate(boardCx, boardCy)
    ctx.scale(databus.boardScale, databus.boardScale)
    ctx.translate(-boardCx, -boardCy)
    // 绘制棋盘背景和宝石
    this.renderBoardBg()
    databus.board.forEach(gem => this.renderGem(gem))
    ctx.restore()

    this.renderEffects()
    this.renderUI()

    // 渲染通关/失败弹窗
    if (databus.levelText) {
      ctx.save()
      // 弹窗尺寸与位置
      const popupW = SCREEN_WIDTH * 0.8
      // 增加弹窗高度以容纳分数和评级
      const popupH = SCREEN_HEIGHT * 0.35
      const px = (SCREEN_WIDTH - popupW) / 2
      const py = (SCREEN_HEIGHT - popupH) / 2
      // 半透明黑色背景
      ctx.globalAlpha = 0.9
      ctx.fillStyle = 'rgba(0,0,0,0.8)'
      this.roundRect(ctx, px, py, popupW, popupH, 20)
      ctx.fill()
      // 边框
      ctx.strokeStyle = 'rgba(255,255,255,0.3)'
      ctx.lineWidth = 2
      ctx.stroke()
      // 标题文本
      ctx.globalAlpha = 1
      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 42px system-ui'
      ctx.textAlign = 'center'
      // 将标题位置上移一些
      ctx.fillText(databus.levelText.text, SCREEN_WIDTH / 2, py + popupH * 0.25)
      // 若有分数和评级，显示在弹窗中部
      if (databus.levelText && typeof databus.levelText.score !== 'undefined') {
        ctx.font = 'bold 30px system-ui'
        ctx.fillStyle = '#ffffff'
        ctx.fillText('分数: ' + databus.levelText.score, SCREEN_WIDTH / 2, py + popupH * 0.45)
        // 根据评级选择颜色
        let gradeColor = '#34d399'
        if (databus.levelText.rating === 'S') gradeColor = '#facc15'
        else if (databus.levelText.rating === 'A') gradeColor = '#22d3ee'
        else if (databus.levelText.rating === 'B') gradeColor = '#a855f7'
        else gradeColor = '#f87171'
        ctx.font = 'bold 32px system-ui'
        ctx.fillStyle = gradeColor
        ctx.fillText('评级: ' + databus.levelText.rating, SCREEN_WIDTH / 2, py + popupH * 0.60)
      }
      // 绘制下一关按钮
      const btnW = 160
      const btnH = 48
      const btnX = (SCREEN_WIDTH - btnW) / 2
      // 将按钮放在更靠下的位置，避免与文本重叠
      const btnY = py + popupH * 0.75
      // 将按钮范围保存到 databus，以便检测点击
      databus.nextButtonBounds = { x: btnX, y: btnY, width: btnW, height: btnH }
      // 按钮背景
      ctx.fillStyle = 'rgba(255,255,255,0.1)'
      this.roundRect(ctx, btnX, btnY, btnW, btnH, 12)
      ctx.fill()
      ctx.strokeStyle = 'rgba(255,255,255,0.5)'
      ctx.lineWidth = 2
      this.roundRect(ctx, btnX, btnY, btnW, btnH, 12)
      ctx.stroke()
      // 按钮文本
      ctx.fillStyle = '#facc15'
      ctx.font = 'bold 28px system-ui'
      ctx.fillText('下一关', SCREEN_WIDTH / 2, btnY + btnH * 0.65)
      ctx.restore()
    } else {
      // 没有弹窗时清除按钮范围
      databus.nextButtonBounds = null
    }
  }

  renderGem(gem) {
    const size = databus.gemSize
    const pad = 4
    const x = gem.realX + pad
    const y = gem.realY + pad
    const w = size - pad*2
    const h = size - pad*2
    const cx = x + w/2
    const cy = y + h/2

    ctx.save()
    ctx.translate(cx, cy)
    ctx.scale(gem.scale, gem.scale)
    ctx.globalAlpha = gem.alpha
    ctx.translate(-cx, -cy)

    const style = GEM_STYLES[gem.type]
    
    // 1. 底座
    this.roundRect(ctx, x, y, w, h, 12)
    const grad = ctx.createLinearGradient(x, y, x+w, y+h)
    
    // 特殊宝石底座颜色
    if (gem.special === GemSpecialType.BOOMBOX) {
       grad.addColorStop(0, '#444'); grad.addColorStop(1, '#000')
       ctx.shadowColor = '#fbbf24'; ctx.shadowBlur = 10
    } else if (gem.special === GemSpecialType.VINYL) {
       grad.addColorStop(0, '#333'); grad.addColorStop(1, '#000')
       ctx.shadowColor = '#d946ef'; ctx.shadowBlur = 10
    } else if (gem.special !== GemSpecialType.NONE) {
       grad.addColorStop(0, '#0f172a'); grad.addColorStop(1, style.color)
       ctx.shadowColor = style.color; ctx.shadowBlur = 10
    } else {
       grad.addColorStop(0, style.color + '44'); grad.addColorStop(1, style.color + '88')
    }
    
    ctx.fillStyle = grad
    ctx.fill()
    
    // 边框
    if (databus.selectedGem === gem) {
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.stroke()
    } else if (gem.special !== GemSpecialType.NONE) {
        ctx.strokeStyle = style.color; ctx.lineWidth = 2; ctx.stroke()
    }

    // 2. 图标绘制
    ctx.shadowBlur = 0
    ctx.fillStyle = style.color
    
    if (gem.special === GemSpecialType.BOOMBOX) {
        // 动态脉冲圆环
        const t = (Date.now() % 1000) / 1000
        const pulse = 0.9 + Math.sin(t * Math.PI * 2) * 0.1
        this.drawBoombox(ctx, cx, cy, (w/2) * pulse, '#fbbf24')
    } else if (gem.special === GemSpecialType.LASER_H || gem.special === GemSpecialType.LASER_V) {
        // 激光宝石：绘制箭头并覆盖扫描条纹
        const dir = gem.special === GemSpecialType.LASER_H ? 'horizontal' : 'vertical'
        this.drawArrow(ctx, cx, cy, w/2, dir)
        // 扫描条纹
        const stripes = 6
        const offset = (Date.now()/50) % (w/stripes)
        ctx.save()
        ctx.globalAlpha = 0.2
        ctx.fillStyle = '#ffffff'
        for (let i=0; i<stripes; i++) {
            if (dir === 'horizontal') {
               const sx = x + ((i * (w/stripes) + offset) % w)
               ctx.fillRect(sx, y, w/stripes/2, h)
            } else {
               const sy = y + ((i * (h/stripes) + offset) % h)
               ctx.fillRect(x, sy, w, h/stripes/2)
            }
        }
        ctx.restore()
    } else if (gem.special === GemSpecialType.VINYL) {
        // 黑胶宝石：旋转绘制
        const rotation = (Date.now() / 500) % (Math.PI * 2)
        ctx.save()
        ctx.translate(cx, cy)
        ctx.rotate(rotation)
        ctx.translate(-cx, -cy)
        this.drawVinyl(ctx, cx, cy, w/2)
        ctx.restore()
    } else {
        this.drawIcon(ctx, gem.type, cx, cy, w * 0.6)
    }

    // 3. 普通宝石的高光与阴影
    if (gem.special === GemSpecialType.NONE && !gem.isLocked) {
        // 顶部左侧高光
        ctx.save()
        ctx.globalAlpha = 0.35
        ctx.fillStyle = '#ffffff'
        ctx.beginPath()
        ctx.ellipse(cx - w * 0.25, cy - h * 0.3, w * 0.25, h * 0.12, -0.5, 0, PI2)
        ctx.fill()
        // 底部阴影
        ctx.globalAlpha = 0.12
        const gradShade = ctx.createLinearGradient(x, y + h * 0.5, x, y + h)
        gradShade.addColorStop(0, 'rgba(255,255,255,0)')
        gradShade.addColorStop(1, 'rgba(0,0,0,0.8)')
        ctx.fillStyle = gradShade
        ctx.fillRect(x, y + h * 0.5, w, h * 0.5)
        ctx.restore()
    }

    // 4. 锁的绘制
    if (gem.isLocked) {
        this.drawLock(ctx, x, y, w, h)
    }

    ctx.restore()
  }

  // 绘图辅助函数
  drawBoombox(ctx, x, y, r, color) {
      ctx.fillStyle = '#000'
      ctx.beginPath(); ctx.arc(x, y, r, 0, PI2); ctx.fill()
      ctx.strokeStyle = color; ctx.lineWidth = 3
      ctx.beginPath(); ctx.arc(x, y, r, 0, PI2); ctx.stroke()
      ctx.fillStyle = color
      ctx.beginPath(); ctx.arc(x, y, r*0.4, 0, PI2); ctx.fill()
  }

  drawVinyl(ctx, x, y, r) {
      ctx.fillStyle = '#111'
      ctx.beginPath(); ctx.arc(x, y, r, 0, PI2); ctx.fill()
      const grad = ctx.createRadialGradient(x, y, r*0.2, x, y, r)
      grad.addColorStop(0, '#111'); grad.addColorStop(0.5, '#333'); grad.addColorStop(1, '#111')
      ctx.fillStyle = grad; ctx.fill()
      ctx.fillStyle = '#db2777'; ctx.beginPath(); ctx.arc(x, y, r*0.3, 0, PI2); ctx.fill()
  }

  drawLock(ctx, x, y, w, h) {
      ctx.fillStyle = 'rgba(0,0,0,0.6)'
      this.roundRect(ctx, x, y, w, h, 12); ctx.fill()
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 3
      const cx = x + w/2, cy = y + h/2
      ctx.strokeRect(cx - 6, cy - 4, 12, 10)
      ctx.beginPath(); ctx.arc(cx, cy - 4, 6, Math.PI, 0); ctx.stroke()
  }

  drawArrow(ctx, x, y, size, dir) {
      ctx.strokeStyle = '#22d3ee'; ctx.lineWidth = 4; ctx.lineCap = 'round'
      ctx.beginPath()
      if (dir === 'horizontal') {
          ctx.moveTo(x - size, y); ctx.lineTo(x + size, y)
          ctx.moveTo(x - size + 5, y - 5); ctx.lineTo(x - size, y); ctx.lineTo(x - size + 5, y + 5)
          ctx.moveTo(x + size - 5, y - 5); ctx.lineTo(x + size, y); ctx.lineTo(x + size - 5, y + 5)
      } else {
          ctx.moveTo(x, y - size); ctx.lineTo(x, y + size)
          ctx.moveTo(x - 5, y - size + 5); ctx.lineTo(x, y - size); ctx.lineTo(x + 5, y - size + 5)
          ctx.moveTo(x - 5, y + size - 5); ctx.lineTo(x, y + size); ctx.lineTo(x + 5, y + size - 5)
      }
      ctx.stroke()
  }

  drawIcon(ctx, type, cx, cy, size) {
      const r = size / 2
      ctx.beginPath()
      switch(type) {
          case 0: // Heart
             ctx.moveTo(cx, cy - r*0.2)
             ctx.bezierCurveTo(cx - r, cy - r*0.8, cx - r, cy + r*0.5, cx, cy + r)
             ctx.bezierCurveTo(cx + r, cy + r*0.5, cx + r, cy - r*0.8, cx, cy - r*0.2)
             break;
          case 1: // Diamond
             ctx.moveTo(cx, cy - r); ctx.lineTo(cx + r*0.8, cy); ctx.lineTo(cx, cy + r); ctx.lineTo(cx - r*0.8, cy); 
             break;
          case 2: // Triangle
             ctx.moveTo(cx, cy - r*0.8); ctx.lineTo(cx + r, cy + r*0.8); ctx.lineTo(cx - r, cy + r*0.8);
             break;
          case 3: // Star
             for(let i=0; i<5; i++) {
                 const angle = (i * 4 * Math.PI) / 5 - Math.PI/2
                 const lx = cx + Math.cos(angle) * r
                 const ly = cy + Math.sin(angle) * r
                 if (i===0) ctx.moveTo(lx, ly); else ctx.lineTo(lx, ly)
             }
             break;
          case 4: // Zap
             ctx.moveTo(cx - r*0.2, cy - r); ctx.lineTo(cx + r*0.5, cy - r*0.1); ctx.lineTo(cx, cy + r*0.1); ctx.lineTo(cx + r*0.2, cy + r); ctx.lineTo(cx - r*0.5, cy + r*0.1); ctx.lineTo(cx, cy - r*0.1);
             break;
          case 5: // Circle
             ctx.arc(cx, cy, r*0.8, 0, PI2)
             break;
      }
      ctx.closePath()
      ctx.fill()
  }

  roundRect(ctx, x, y, w, h, r) {
      ctx.beginPath()
      ctx.moveTo(x+r, y); ctx.lineTo(x+w-r, y); ctx.quadraticCurveTo(x+w, y, x+w, y+r)
      ctx.lineTo(x+w, y+h-r); ctx.quadraticCurveTo(x+w, y+h, x+w-r, y+h)
      ctx.lineTo(x+r, y+h); ctx.quadraticCurveTo(x, y+h, x, y+h-r)
      ctx.lineTo(x, y+r); ctx.quadraticCurveTo(x, y, x+r, y)
      ctx.closePath()
  }

  // --- 5. 特效与工具函数 ---

  spawnRain(randomY = false) {
     databus.cyberRain.push({
        x: Math.random() * SCREEN_WIDTH,
        y: randomY ? Math.random() * SCREEN_HEIGHT * 0.4 : -50,
        speed: 2 + Math.random() * 4,
        len: 10 + Math.random() * 20,
        opacity: 0.1 + Math.random() * 0.3
     })
  }

  /**
   * 生成漂浮的霓虹方块
   * 如果 initial = true，则在随机位置生成；否则在屏幕顶部外随机横向位置生成
   */
  spawnCyberBlock(initial = false) {
    const size = 10 + Math.random() * 20
    databus.cyberBlocks.push({
      x: Math.random() * SCREEN_WIDTH,
      y: initial ? Math.random() * databus.startY * 0.7 : -size,
      size,
      speedX: 0,
      // 增加下落速度 3 倍，让粒子更快下落
      speedY: (1 + Math.random() * 1.5) * 3,
      opacity: 0.4 + Math.random() * 0.4,
      rotation: 0,
      rotationSpeed: 0
    })
  }

  /**
   * 在消除时创建方形扩散特效
   * @param {number} x 屏幕 x 坐标
   * @param {number} y 屏幕 y 坐标
   * @param {string} color 颜色
   */
  createSquareEffect(x, y, color) {
    databus.squareEffects.push({
      x, y,
      size: databus.gemSize * 0.5,
      maxSize: databus.gemSize * 2,
      opacity: 0.8,
      color
    })
  }

  /**
   * 生成附加回响波，根据连击或节奏
   * @param {number} type 宝石类型用于颜色
   * @param {number} count 回响波数量
   */
  createEchoWave(type, count = 1) {
    for (let i = 0; i < count; i++) {
      databus.echoWaves.push({
        scale: 0.5,
        opacity: 0.8,
        color: GEM_STYLES[type].color,
        delay: i * 5 // 帧延迟，逐个放大
      })
    }
  }

  createFlyText(val, x, y, isCombo = false) {
      databus.flyTexts.push({ 
          val, x, y, life: 1, scale: isCombo ? 1.5 : 1, 
          color: isCombo ? '#facc15' : 'white' 
      })
  }

  createShockwave(type) {
      databus.shockwaves.push({ 
        // 初始缩放较小，透明度稍低，避免刺眼
        scale: 0.5, opacity: 0.6, color: GEM_STYLES[type].color 
      })
  }

  createProjectile(type) {
      const color = GEM_STYLES[type].color
      // 敌人中心位置作为投射目标
      const targetXLeft = SCREEN_WIDTH / 2 - 30
      const targetXRight = SCREEN_WIDTH / 2 + 30
      const targetY = databus.startY * 0.4
      const startY = databus.startY + databus.gemSize * (databus.height / 2)
      // 从左侧发射
      databus.projectiles.push({
          x: databus.startX - 40,
          y: startY,
          targetX: targetXLeft,
          targetY: targetY,
          progress: 0,
          color
      })
      // 从右侧发射
      databus.projectiles.push({
          x: SCREEN_WIDTH - (databus.startX - 40),
          y: startY,
          targetX: targetXRight,
          targetY: targetY,
          progress: 0,
          color
      })
  }

  createParticles(x, y, color) {
    for(let i=0; i<8; i++) {
      databus.particles.push({
        x, y, vx: (Math.random()-0.5)*10, vy: (Math.random()-0.5)*10,
        life: 1, color
      })
    }
  }

  /**
   * 插入待生成的特殊宝石。
   * 在消除结算后，下落完成之前会将特殊宝石信息存入 databus.pendingSpawns。
   * 这里根据 x/y 定位到对应格子，如果存在宝石则更新其特殊属性和类型。
   */
  insertPendingSpecials() {
    if (!databus.pendingSpawns || databus.pendingSpawns.length === 0) return
    databus.pendingSpawns.forEach(spawn => {
      const gem = databus.board.find(g => g.x === spawn.x && g.y === spawn.y)
      if (gem) {
        gem.special = spawn.type
        // 如果指定了 gemType，则替换颜色；否则保留原有颜色
        if (typeof spawn.gemType !== 'undefined') gem.type = spawn.gemType
      }
    })
    // 清空待生成列表
    databus.pendingSpawns = []
  }

  addTween(target, props, duration, cb) {
    databus.animations.push({ target, props, start: {...target}, time: 0, duration, cb })
  }

  // --- 6. 主循环 ---

  loop() {
    databus.frame++
    this.updateTweens()
    this.updateEffects()
    this.render()
    requestAnimationFrame(this.loop.bind(this))
  }

  updateTweens() {
      for (let i = databus.animations.length - 1; i >= 0; i--) {
        const a = databus.animations[i]
        a.time += 16.6 
        let p = a.time / a.duration
        if (p > 1) p = 1
        const ease = p * (2 - p) 
        for (let k in a.props) a.target[k] = a.start[k] + (a.props[k] - a.start[k]) * ease
        if (p === 1) {
            databus.animations.splice(i, 1)
            if (a.cb) a.cb()
        }
      }
  }

  updateEffects() {
      // 当敌人 HP 填满（达到目标分数）时判定胜利
      if (databus.enemyHp >= databus.enemyMaxHp && !databus.isEnemyDead) {
          databus.isEnemyDead = true
          databus.gameWin = true
      }
      // 当敌人死亡时触发死亡爆炸特效（只触发一次）
      if (databus.isEnemyDead && !databus.enemyDeathPlayed) {
          // 怪物死亡时生成柔和爆炸特效，颜色取当前怪物颜色
          databus.enemyDeathEffects.push({ scale: 0.5, opacity: 1, color: databus.devilColor })
          // 设置已播放标记，避免重复触发
          databus.enemyDeathPlayed = true
      }

      // 随时间增加背景色调，实现霓虹色轮旋转
      this.hue = (this.hue + 0.1) % 360

      // 每隔 8 帧生成一条赛博雨，减少数量
      if (databus.frame % 8 === 0) this.spawnRain()
      // 每 20 帧生成一个霓虹方块（数量减少一半）
      // 每 40 帧生成一个霓虹方块（再次降低生成频率），数量减少一半
      if (databus.frame % 40 === 0) this.spawnCyberBlock()
      databus.cyberRain.forEach(r => r.y += r.speed)
      databus.cyberRain = databus.cyberRain.filter(r => r.y < SCREEN_HEIGHT * 0.5)

      // 敌人闪白计时器
      if (databus.enemyFlashTimer > 0) databus.enemyFlashTimer -= 1

      // 更新背景霓虹方块
      databus.cyberBlocks.forEach(b => {
        b.x += b.speedX
        b.y += b.speedY
        // 不旋转，保持直线下落
        // b.rotation += b.rotationSpeed
        // 缓慢减小透明度
        b.opacity -= 0.002
      })
      databus.cyberBlocks = databus.cyberBlocks.filter(b => b.y < databus.startY * 0.8 && b.opacity > 0)

      databus.particles.forEach(p => { p.x+=p.vx; p.y+=p.vy; p.life-=0.05 })
      databus.particles = databus.particles.filter(p => p.life > 0)

      databus.flyTexts.forEach(t => { t.y -= 2; t.life -= 0.02; t.scale += 0.01 })
      databus.flyTexts = databus.flyTexts.filter(t => t.life > 0)

      // 更新攻击扩散波：放慢扩散速度并降低透明度
      databus.shockwaves.forEach(w => {
        w.scale += 0.05
        w.opacity -= 0.03
      })
      databus.shockwaves = databus.shockwaves.filter(w => w.opacity > 0)

      // 更新附加回响波
      databus.echoWaves.forEach(w => {
        if (w.delay > 0) {
          w.delay--
        } else {
          w.scale += 0.05
          w.opacity -= 0.03
        }
      })
      databus.echoWaves = databus.echoWaves.filter(w => w.opacity > 0)
      databus.projectiles.forEach(p => {
        p.progress += 0.05
      })
      databus.projectiles = databus.projectiles.filter(p => p.progress < 1)

      // --- 节拍检测与棋盘缩放/怪物左右摇摆/颜色更新 ---
      // 计算当前拍索引（从 0 开始），用于检测新节拍
      const beatLength = 60000 / music.bpm
      const elapsed = Date.now() - this.startTime
      const currentBeat = Math.floor(elapsed / beatLength)
      if (currentBeat !== this.prevBeatIndex) {
        // 新节拍
        // 每 3 拍触发一次棋盘缩放，略微加快频率
        if (currentBeat % 3 === 0) {
          databus.boardScaleTimer = 12
        }
        // 怪物在每拍摇头，频率翻倍
        databus.devilTiltState = -databus.devilTiltState
        databus.devilTiltCounter += 1
        // 每两次摇头切换颜色，但不再固定与环生成绑定
        if (databus.devilTiltCounter >= 2) {
          databus.devilTiltCounter = 0
          databus.devilColorIndex = (databus.devilColorIndex + 1) % GEM_STYLES.length
          databus.devilColor = GEM_STYLES[databus.devilColorIndex].color
        }
        // 每 4 拍（重拍）生成节拍环特效，频率减半
        if (currentBeat % 4 === 0) {
          databus.devilRings.push({ scale: 1, opacity: 1, color: databus.devilColor })
        }
        this.prevBeatIndex = currentBeat
      }
      // 更新棋盘缩放：计时器>0 时放大幅度渐减，最大幅度 2%
      if (databus.boardScaleTimer > 0) {
        databus.boardScale = 1 + 0.02 * (databus.boardScaleTimer / 12)
        databus.boardScaleTimer -= 1
      } else {
        databus.boardScale = 1
      }

      // 更新怪物节拍环特效：不再增长，仅透明度衰减
      databus.devilRings.forEach(r => {
        // 环保持原始尺寸，只淡出。较慢的衰减使频率降低时视觉更柔和
        r.opacity -= 0.08
      })
      databus.devilRings = databus.devilRings.filter(r => r.opacity > 0)

      // 更新怪物死亡特效：缩放扩散并淡出。为了柔和，仅小幅增长并减小不那么刺眼
      databus.enemyDeathEffects.forEach(e => {
        e.scale += 0.1
        e.opacity -= 0.05
      })
      databus.enemyDeathEffects = databus.enemyDeathEffects.filter(e => e.opacity > 0)

      // 检查通关/失败状态
      this.handleWin()
      this.handleGameOver()

      // 更新通关/失败文字的渐隐
      // 仅当 levelText 含有 timer 字段时才进行计时器更新
      if (databus.levelText && typeof databus.levelText.timer !== 'undefined') {
        databus.levelText.timer -= 1
        databus.levelText.opacity = databus.levelText.timer / 120
      }

      // 更新方形扩散特效
      databus.squareEffects.forEach(s => {
        s.size += (s.maxSize - s.size) * 0.1
        s.opacity -= 0.05
      })
      databus.squareEffects = databus.squareEffects.filter(s => s.opacity > 0)
  
    }

  renderEffects() {
    // 1. 粒子
    databus.particles.forEach(p => {
      ctx.save()
      ctx.globalAlpha = Math.max(p.life, 0)
      ctx.fillStyle = p.color
      ctx.beginPath()
      ctx.arc(p.x, p.y, 3, 0, PI2)
      ctx.fill()
      ctx.restore()
    })

    // 2. 冲击波（中心在敌人位置）
    databus.shockwaves.forEach(w => {
      // 敌人的中心位于棋盘上方 40% 位置
      const cx = SCREEN_WIDTH / 2
      const cy = databus.startY * 0.4
      const radius = databus.gemSize * 3 * w.scale

      ctx.save()
      ctx.globalAlpha = Math.max(w.opacity, 0)
      ctx.strokeStyle = w.color
      ctx.lineWidth = 6
      ctx.beginPath()
      ctx.arc(cx, cy, radius, 0, PI2)
      ctx.stroke()
      ctx.restore()
    })

    // 2b. 回响波：多个同心扩散波
    databus.echoWaves.forEach(w => {
      if (w.delay > 0) return
      const cx = SCREEN_WIDTH / 2
      const cy = databus.startY * 0.4
      const radius = databus.gemSize * 2.5 * w.scale
      ctx.save()
      ctx.globalAlpha = Math.max(w.opacity, 0)
      ctx.strokeStyle = w.color
      ctx.lineWidth = 4
      ctx.beginPath()
      ctx.arc(cx, cy, radius, 0, PI2)
      ctx.stroke()
      ctx.restore()
    })

    // 2c. 节拍环：在怪物周围出现的粗圈，用于节拍提示
    databus.devilRings.forEach(r => {
      const cx = SCREEN_WIDTH / 2
      const cy = databus.startY * 0.4
      // 计算敌人的膨胀程度，环半径随怪物大小变化
      const hpRatio = databus.enemyMaxHp > 0 ? databus.enemyHp / databus.enemyMaxHp : 0
      const bloat = 1 + hpRatio * 1.5
      const radius = databus.gemSize * 2.5 * bloat * r.scale
      ctx.save()
      ctx.globalAlpha = Math.max(r.opacity, 0)
      ctx.strokeStyle = r.color
      ctx.lineWidth = 8
      ctx.beginPath()
      ctx.arc(cx, cy, radius, 0, PI2)
      ctx.stroke()
      ctx.restore()
    })

    // 2d. 敌人死亡爆炸特效：柔和扩散圆圈，颜色随怪物颜色
    databus.enemyDeathEffects.forEach(e => {
      const cx = SCREEN_WIDTH / 2
      const cy = databus.startY * 0.4
      const radius = databus.gemSize * 4 * e.scale
      ctx.save()
      // 效果透明度略低，避免刺眼
      ctx.globalAlpha = Math.max(e.opacity * 0.6, 0)
      // 使用特效自身的颜色字段，无字母则默认为白色
      const col = e.color || '#ffffff'
      ctx.fillStyle = col
      ctx.beginPath()
      ctx.arc(cx, cy, radius, 0, PI2)
      ctx.fill()
      ctx.restore()
    })

    // 3. 飘字（PERFECT / 伤害 / COMBO）
    databus.flyTexts.forEach(t => {
      ctx.save()
      ctx.globalAlpha = Math.max(t.life, 0)
      // 所有文本使用加粗字体
      ctx.font = `bold ${Math.floor(24 * t.scale)}px system-ui`
      ctx.textAlign = 'center'
      ctx.fillStyle = t.color
      ctx.fillText(t.val, t.x, t.y)
      ctx.restore()
    })

    // 4. 投射物（从棋盘飞向敌人）
    databus.projectiles.forEach(b => {
      const px = b.x + (b.targetX - b.x) * b.progress
      const py = b.y + (b.targetY - b.y) * b.progress
      ctx.save()
      ctx.globalAlpha = 1 - b.progress
      // 发光投射物颜色和阴影
      ctx.fillStyle = b.color
      ctx.shadowColor = b.color
      ctx.shadowBlur = 15
      // 绘制方形投射物并旋转增强动感
      ctx.translate(px, py)
      ctx.rotate(Math.PI / 4)
      const size = 14
      ctx.fillRect(-size/2, -size/2, size, size)
      ctx.restore()
    })

    // 5. 方形扩散特效：匹配时生成，使用圆角和更粗的边框
    databus.squareEffects.forEach(s => {
      const half = s.size / 2
      ctx.save()
      ctx.globalAlpha = s.opacity
      ctx.strokeStyle = s.color
      // 边框略微加粗
      ctx.lineWidth = 5
      // 圆角半径根据宝石大小决定
      const radius = Math.min(databus.gemSize * 0.2, s.size / 3)
      // 使用自带的 roundRect 绘制圆角矩形
      this.roundRect(ctx, s.x - half, s.y - half, s.size, s.size, radius)
      ctx.stroke()
      ctx.restore()
    })
  }


  renderBattleScene() {
     const height = databus.startY
     
     // 漂浮霓虹方块
     databus.cyberBlocks.forEach(b => {
         ctx.save()
         ctx.globalAlpha = b.opacity
         ctx.fillStyle = `hsla(${(this.hue + 180) % 360}, 70%, 40%, 1)`
         ctx.fillRect(b.x - b.size/2, b.y - b.size/2, b.size, b.size)
         ctx.restore()
     })

     // 赛博雨
     ctx.save()
     databus.cyberRain.forEach(r => {
         ctx.fillStyle = `rgba(34, 211, 238, ${r.opacity})` 
         ctx.fillRect(r.x, r.y, 2, r.len)
     })
     ctx.restore()

     // 动态网格
     ctx.save()
     ctx.beginPath()
     ctx.strokeStyle = 'rgba(255, 0, 255, 0.1)' 
     const time = Date.now() / 1000
     const horizon = height * 0.8
     for(let i=0; i<5; i++) {
         const offset = (time * 50) % 50
         const y = horizon + i * 20 + offset
         if (y < height) {
             ctx.moveTo(0, y); ctx.lineTo(SCREEN_WIDTH, y)
         }
     }
     for(let i=0; i<SCREEN_WIDTH; i+=60) {
         ctx.moveTo(i, horizon); ctx.lineTo((i - SCREEN_WIDTH/2)*3 + SCREEN_WIDTH/2, height)
     }
     ctx.stroke()
     ctx.restore()

     // 恶魔
     this.renderDevil(SCREEN_WIDTH/2, height * 0.4)

     // 节奏指示灯
     this.renderRhythmIndicator()
  }

  /**
   * 绘制顶部节奏指示灯
   * 根据 BPM 计算当前节拍索引，每小节 4 拍
   */
  renderRhythmIndicator() {
    const indicatorY = databus.startY * 0.2
    const baseRadius = 6
    const spacing = 20
    // 计算节拍索引
    const beatLength = 60000 / music.bpm // 毫秒每拍
    const elapsed = Date.now() - this.startTime
    const beatIndex = Math.floor(elapsed / beatLength) % 4
    const centerX = SCREEN_WIDTH / 2 - (spacing * 1.5)
    for (let i = 0; i < 4; i++) {
      const x = centerX + i * spacing
      ctx.save()
      if (beatIndex === i) {
        ctx.fillStyle = '#22d3ee'
        ctx.shadowColor = '#22d3ee'
        ctx.shadowBlur = 10
        ctx.beginPath()
        ctx.arc(x, indicatorY, baseRadius * 1.4, 0, PI2)
        ctx.fill()
      } else {
        ctx.fillStyle = '#334155'
        ctx.beginPath()
        ctx.arc(x, indicatorY, baseRadius, 0, PI2)
        ctx.fill()
      }
      ctx.restore()
    }
  }

  /**
   * 绘制怪物 HP 条。
   * HP 条位于棋盘上方，用长度表示当前 HP 比例，并采用渐变色从蓝到红。
   */
  renderHpBar() {
    // 如果敌人已死亡或当前关卡还未设定敌人 HP，则不绘制
    if (databus.enemyMaxHp <= 0) return
    // 调整位置和样式：放在棋盘上方紧贴战斗场景底部
    const barWidth = SCREEN_WIDTH * 0.7
    const barHeight = 10
    const x = (SCREEN_WIDTH - barWidth) / 2
    // 放置在棋盘顶部上方 30px 处
    const y = databus.startY - 30
    const ratio = databus.enemyMaxHp > 0 ? (databus.enemyHp / databus.enemyMaxHp) : 0
    ctx.save()
    // 背景
    ctx.fillStyle = 'rgba(255,255,255,0.1)'
    this.roundRect(ctx, x, y, barWidth, barHeight, barHeight / 2)
    ctx.fill()
    // 边框
    ctx.strokeStyle = 'rgba(255,255,255,0.2)'
    ctx.lineWidth = 1
    this.roundRect(ctx, x, y, barWidth, barHeight, barHeight / 2)
    ctx.stroke()
    // 填充部分
    if (ratio > 0) {
      // 单色填充 HP 条
      ctx.fillStyle = '#22d3ee'
      this.roundRect(ctx, x, y, barWidth * ratio, barHeight, barHeight / 2)
      ctx.fill()
    }
    ctx.restore()
  }

  renderDevil(cx, cy) {
      // 若敌人已死亡不渲染（但死亡特效在 renderEffects 中处理）
      if (databus.isEnemyDead) return

      // 当怪物存活时，绘制其背景光晕，并根据节拍颜色变化
      if (!databus.isEnemyDead) {
        ctx.save()
        ctx.translate(cx, cy)
        // 光晕半径基于宝石大小，可随棋盘缩放略微脉冲。减小范围使光晕更紧凑
        const baseRadius = databus.gemSize * 3
        const auraScale = 1 + 0.1 * (databus.boardScaleTimer / 12)
        const radius = baseRadius * auraScale
        const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, radius)
        // 内圈使用当前怪物颜色，透明度降低
        grad.addColorStop(0, databus.devilColor + '66')
        // 外圈完全透明
        grad.addColorStop(1, databus.devilColor + '00')
        // 整体降低光晕强度
        ctx.globalAlpha = 0.4
        ctx.fillStyle = grad
        ctx.beginPath()
        ctx.arc(0, 0, radius, 0, PI2)
        ctx.fill()
        ctx.restore()
      }

      // 当前生命比率
      const hpRatio = databus.enemyHp / databus.enemyMaxHp
      // 血量越高膨胀越大，范围 [1, 2.5]
      const bloat = 1 + hpRatio * 1.5
      // 移除呼吸抖动，不再随时间放大缩小
      // 当前拍索引
      const beatLength = 60000 / music.bpm
      const beatIndex = Math.floor((Date.now() - this.startTime) / beatLength) % 4
      const isDownbeat = beatIndex === 0
      // 基础缩放：仅根据血量，不随节拍或呼吸变化
      let scale = bloat * 1.2
      // 头部左右倾斜角度：根据状态离散取值，不使用正弦连续动画
      // 摇摆幅度基于血量，HP 越高摇摆越大，但仅取两个离散方向
      const tiltAmp = 0.12 + hpRatio * 0.18
      const tilt = databus.devilTiltState * tiltAmp

      ctx.save()
      ctx.translate(cx, cy)
      // 旋转实现左右歪头
      ctx.rotate(tilt)
      ctx.scale(scale, scale)
      ctx.translate(-50, -50)
      // 击中闪白
      if (databus.enemyFlashTimer > 0) {
        ctx.filter = 'brightness(2)'
      } else if (isDownbeat) {
        // 重拍稍微提高亮度
        ctx.filter = 'brightness(1.2)'
      } else {
        ctx.filter = 'none'
      }
      // 阴影使用当前怪物颜色
      ctx.shadowBlur = 20
      ctx.shadowColor = databus.devilColor + '99'
      // 身体填充颜色根据节拍从 databus.devilColor 读取
      ctx.fillStyle = databus.devilColor
      // 头部两瓣
      ctx.beginPath()
      ctx.moveTo(30, 40); ctx.bezierCurveTo(20,20, 10,20, 10,10); ctx.bezierCurveTo(20,20, 30,30, 35,45); ctx.closePath()
      ctx.moveTo(70, 40); ctx.bezierCurveTo(80,20, 90,20, 90,10); ctx.bezierCurveTo(80,20, 70,30, 65,45); ctx.closePath()
      ctx.fill()
      // 头部
      ctx.beginPath(); ctx.arc(50, 60, 35, 0, PI2); ctx.fill()
      // 眼睛
      ctx.fillStyle = '#ffffff'; ctx.shadowBlur = 0
      ctx.beginPath(); ctx.moveTo(35,55); ctx.lineTo(45,60); ctx.lineTo(35,65); ctx.fill()
      ctx.beginPath(); ctx.moveTo(65,55); ctx.lineTo(55,60); ctx.lineTo(65,65); ctx.fill()
      // 嘴巴
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3; ctx.lineCap = 'round'
      ctx.beginPath(); ctx.moveTo(40,75); ctx.quadraticCurveTo(50,85, 60,75); ctx.stroke()
      ctx.restore()
  }

  renderBoardBg() {
      // 棋盘背景带圆角和阴影
      const w = databus.width * databus.gemSize
      const h = databus.height * databus.gemSize
      const x0 = databus.startX
      const y0 = databus.startY
      const radius = 16

      // 背景与阴影
      ctx.save()
      ctx.shadowBlur = 20
      ctx.shadowColor = 'rgba(0,0,0,0.6)'
      ctx.fillStyle = 'rgba(15, 23, 42, 0.8)'
      this.roundRect(ctx, x0, y0, w, h, radius)
      ctx.fill()
      ctx.restore()

      // 边框
      ctx.save()
      ctx.strokeStyle = 'rgba(255,255,255,0.08)'
      ctx.lineWidth = 3
      this.roundRect(ctx, x0, y0, w, h, radius)
      ctx.stroke()
      ctx.restore()

      // 网格背景交错填充
      for (let row = 0; row < databus.height; row++) {
        for (let col = 0; col < databus.width; col++) {
          const cellX = x0 + col * databus.gemSize
          const cellY = y0 + row * databus.gemSize
          // 交错深浅
          ctx.fillStyle = ((row + col) % 2 === 0) ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.06)'
          ctx.fillRect(cellX, cellY, databus.gemSize, databus.gemSize)
        }
      }

      // 网格线
      ctx.save()
      ctx.strokeStyle = 'rgba(255,255,255,0.05)'
      ctx.lineWidth = 1
      ctx.beginPath()
      for(let i=0; i<=databus.width; i++) {
         let x = x0 + i*databus.gemSize
         ctx.moveTo(x, y0); ctx.lineTo(x, y0+h)
      }
      for(let i=0; i<=databus.height; i++) {
         let y = y0 + i*databus.gemSize
         ctx.moveTo(x0, y); ctx.lineTo(x0+w, y)
      }
      ctx.stroke()
      ctx.restore()
  }

  renderUI() {
    // 将关卡和步数 UI 放置在血条上方
    // 显示位置在血条上方约 35 像素处，使关卡和步数信息不会覆盖血条
    const uiY = databus.startY - 70
    ctx.font = 'bold 16px Courier New'
    ctx.textBaseline = 'middle'
    // 左侧：关卡
    ctx.fillStyle = 'rgba(0,0,0,0.5)'
    ctx.beginPath(); this.roundRect(ctx, 10, uiY - 15, 80, 30, 15); ctx.fill()
    ctx.fillStyle = '#94a3b8'; ctx.textAlign = 'left'; ctx.fillText('关卡', 20, uiY)
    ctx.fillStyle = '#c084fc'; ctx.textAlign = 'right'; ctx.fillText(databus.level, 80, uiY)
    // 右侧：步数
    ctx.fillStyle = 'rgba(0,0,0,0.5)'
    ctx.beginPath(); this.roundRect(ctx, SCREEN_WIDTH - 90, uiY - 15, 80, 30, 15); ctx.fill()
    ctx.fillStyle = '#94a3b8'; ctx.textAlign = 'left'; ctx.fillText('步数', SCREEN_WIDTH - 80, uiY)
    ctx.fillStyle = databus.movesLeft < 5 ? '#ef4444' : '#22d3ee'
    ctx.textAlign = 'right'; ctx.fillText(databus.movesLeft, SCREEN_WIDTH - 20, uiY)
  }
}