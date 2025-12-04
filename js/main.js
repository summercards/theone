import DataBus, { GemType, GemSpecialType } from './databus'
import MusicManager from './music'

const canvas = wx.createCanvas()
const ctx = canvas.getContext('2d')
const databus = new DataBus()
const music = new MusicManager()

const SCREEN_WIDTH = canvas.width
const SCREEN_HEIGHT = canvas.height
const PI2 = Math.PI * 2
const FRAME_INTERVAL = 1000 / 30  // 目标 30FPS

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

// 各关卡配置表
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
    for (let i = 0; i < 6; i++) this.spawnRain(true)

    // 初始化霓虹方块
    for (let i = 0; i < 1; i++) this.spawnCyberBlock(true)
    
    // findMatches 兼容旧逻辑
    this.findMatches = this.findMatchesDetailed.bind(this)

    // 游戏时间 & 背景色调
    this.startTime = Date.now()
    this.hue = 200
    this.prevBeatIndex = -1

    // 帧率控制
    this.loop = this.loop.bind(this)
    this.lastFrameTime = Date.now()
    this.now = this.lastFrameTime

    // 启动主循环
    this.loop()
  }

  // 处理通关逻辑
  handleWin() {
    if (!databus.gameWin) return
    if (!databus.levelText) {
      const score = databus.score
      const target = databus.enemyMaxHp || 1
      const ratio = score / target
      let rating = 'C'
      if (ratio >= 2.0) rating = 'S'
      else if (ratio >= 1.5) rating = 'A'
      else if (ratio >= 1.2) rating = 'B'
      databus.levelText = { text: 'LEVEL CLEAR!', score, rating, opacity: 1 }
    }
    databus.isProcessing = false
  }

  // 处理失败逻辑
  handleGameOver() {
    if (!databus.gameOver) return
    if (!databus.levelText) {
      databus.levelText = { text: 'GAME OVER', timer: 120, opacity: 1 }
    }
    if (databus.levelText && databus.levelText.timer <= 0) {
      databus.reset()
      databus.level = 1
      databus.gameOver = false
      databus.isEnemyDead = false
      databus.levelText = null
      this.applyLevelConfig(databus.level)
      this.initBoardLayout()
      this.fillBoard()
    }
  }

  restart() {
    databus.reset()
    this.applyLevelConfig(databus.level)
    this.initBoardLayout()
    this.fillBoard()
  }

  applyLevelConfig(level) {
    let config = LEVEL_CONFIGS.find(cfg => cfg.level === level)
    if (!config) config = LEVEL_CONFIGS[LEVEL_CONFIGS.length - 1]
    databus.width = config.width
    databus.height = config.height
    databus.typesCount = config.typesCount
    databus.enemyMaxHp = config.targetScore
    databus.enemyHp = 0
    databus.movesLeft = config.moves

    databus.boardScale = 1
    databus.boardScaleTimer = 0
    databus.devilColorIndex = 0
    databus.devilColor = GEM_STYLES[0].color
  }

  initBoardLayout() {
    const paddingX = 20
    const uiHeight = SCREEN_HEIGHT * 0.42
    const bottomPadding = 20
    const availableWidth = SCREEN_WIDTH - paddingX * 2
    const availableHeight = SCREEN_HEIGHT - uiHeight - bottomPadding
    const sizeX = Math.floor(availableWidth / databus.width)
    const sizeY = Math.floor(availableHeight / databus.height)
    let size = Math.min(sizeX, sizeY, 60)
    if (size < 28) size = 28
    databus.gemSize = size
    const boardWidth = databus.gemSize * databus.width
    databus.startX = Math.floor((SCREEN_WIDTH - boardWidth) / 2)
    databus.startY = uiHeight
  }

  // --- 1. 生成与初始化 ---

  fillBoard() {
    for (let x = 0; x < databus.width; x++) {
      for (let y = 0; y < databus.height; y++) {
        this.createGem(x, y)
      }
    }
    // 避免开局就有消除
    if (this.findMatches().size > 0) {
      databus.board = []
      this.fillBoard()
    }
  }

  createGem(x, y) {
    const type = Math.floor(Math.random() * databus.typesCount)
    const rand = Math.random()
    let special = GemSpecialType.NONE
    let isLocked = false

    if (rand < 0.05) special = GemSpecialType.BOOMBOX
    else if (rand < 0.08) special = Math.random() > 0.5 ? GemSpecialType.LASER_H : GemSpecialType.LASER_V
    else if (rand < 0.09) special = GemSpecialType.VINYL
    
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
    // 通关/失败状态
    if (databus.gameOver || databus.gameWin) {
      if (databus.gameWin && databus.nextButtonBounds) {
        const btn = databus.nextButtonBounds
        const clickX = e.touches[0].clientX
        const clickY = e.touches[0].clientY
        if (
          clickX >= btn.x && clickX <= btn.x + btn.width &&
          clickY >= btn.y && clickY <= btn.y + btn.height
        ) {
          const nextLevel = databus.level + 1
          databus.reset()
          databus.level = nextLevel
          databus.gameWin = false
          databus.isEnemyDead = false
          databus.levelText = null
          this.applyLevelConfig(databus.level)
          this.initBoardLayout()
          this.fillBoard()
        }
      }
      return
    }

    const touch = e.touches[0]
    const x = touch.clientX
    const y = touch.clientY

    // 反向缩放点击坐标
    const cx = databus.startX + (databus.width * databus.gemSize) / 2
    const cy = databus.startY + (databus.height * databus.gemSize) / 2
    const dx = x - cx
    const dy = y - cy
    const unscaledX = cx + dx / databus.boardScale
    const unscaledY = cy + dy / databus.boardScale

    if (
      unscaledX >= databus.startX &&
      unscaledX <= databus.startX + databus.width * databus.gemSize &&
      unscaledY >= databus.startY &&
      unscaledY <= databus.startY + databus.height * databus.gemSize
    ) {
      const col = Math.floor((unscaledX - databus.startX) / databus.gemSize)
      const row = Math.floor((unscaledY - databus.startY) / databus.gemSize)
      const gem = this.getGemAt(col, row)
      if (gem && !gem.isLocked) this.onGemClick(gem)
      else music.playInvalid()
    }
  }

  getGemAt(x, y) {
    return databus.board.find(g => g.x === x && g.y === y)
  }

  onGemClick(gem) {
    const rhythm = music.checkRhythm()
    databus.lastRhythm = rhythm
    if (rhythm === 'PERFECT') {
      this.createFlyText('PERFECT!', gem.realX + databus.gemSize / 2, gem.realY - 20)
    } else if (rhythm === 'GOOD') {
      this.createFlyText('GOOD', gem.realX + databus.gemSize / 2, gem.realY - 20)
    } else {
      this.createFlyText('MISS', gem.realX + databus.gemSize / 2, gem.realY - 20)
    }

    if (!databus.selectedGem) {
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
      } else if (
        Math.abs(databus.selectedGem.x - gem.x) +
          Math.abs(databus.selectedGem.y - gem.y) === 1
      ) {
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
    const startSet = new Set([gem])
    this.executeElimination(startSet)
  }

  swapGems(gem1, gem2) {
    databus.isProcessing = true
    music.playSwap()
    
    const tX = gem1.x
    const tY = gem1.y
    gem1.x = gem2.x
    gem1.y = gem2.y
    gem2.x = tX
    gem2.y = tY

    const dest1 = {
      realX: databus.startX + gem1.x * databus.gemSize,
      realY: databus.startY + gem1.y * databus.gemSize
    }
    const dest2 = {
      realX: databus.startX + gem2.x * databus.gemSize,
      realY: databus.startY + gem2.y * databus.gemSize
    }

    this.addTween(gem1, dest1, 200)
    this.addTween(gem2, dest2, 200, () => {
      const { matchedSet } = this.findMatchesDetailed()
      if (matchedSet.size === 0) {
        music.playInvalid()
        const tX2 = gem1.x
        const tY2 = gem1.y
        gem1.x = gem2.x
        gem1.y = gem2.y
        gem2.x = tX2
        gem2.y = tY2
        this.addTween(
          gem1,
          {
            realX: databus.startX + gem1.x * databus.gemSize,
            realY: databus.startY + gem1.y * databus.gemSize
          },
          200
        )
        this.addTween(
          gem2,
          {
            realX: databus.startX + gem2.x * databus.gemSize,
            realY: databus.startY + gem2.y * databus.gemSize
          },
          200,
          () => (databus.isProcessing = false)
        )
      } else {
        databus.movesLeft--
        this.processElimination()
      }
    })
  }

  // --- 3. 核心消除算法 ---

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
    hMatches.forEach(group =>
      group.forEach(g => {
        if (!gemInH.has(g.id)) gemInH.set(g.id, [])
        gemInH.get(g.id).push(group)
      })
    )
    vMatches.forEach(group =>
      group.forEach(g => {
        if (!gemInV.has(g.id)) gemInV.set(g.id, [])
        gemInV.get(g.id).push(group)
      })
    )
    const processed = new Set()

    // 交叉匹配 -> Boombox
    databus.board.forEach(g => {
      if (gemInH.has(g.id) && gemInV.has(g.id) && !processed.has(g.id)) {
        specialSpawns.push({
          x: g.x,
          y: g.y,
          type: GemSpecialType.BOOMBOX,
          gemType: g.type
        })
        gemInH.get(g.id).forEach(gr =>
          gr.forEach(it => {
            matchedIds.add(it.id)
            processed.add(it.id)
          })
        )
        gemInV.get(g.id).forEach(gr =>
          gr.forEach(it => {
            matchedIds.add(it.id)
            processed.add(it.id)
          })
        )
      }
    })

    // 处理横向组合
    hMatches.forEach(group => {
      if (group.every(g => processed.has(g.id))) return
      group.forEach(g => matchedIds.add(g.id))
      if (group.length >= 5) {
        const mid = group[2]
        specialSpawns.push({
          x: mid.x,
          y: mid.y,
          type: GemSpecialType.VINYL,
          gemType: GemType.WHITE
        })
      } else if (group.length === 4) {
        const spawn = group[1]
        specialSpawns.push({
          x: spawn.x,
          y: spawn.y,
          type: GemSpecialType.LASER_V,
          gemType: group[0].type
        })
      }
    })

    // 处理纵向组合
    vMatches.forEach(group => {
      if (group.every(g => processed.has(g.id))) return
      group.forEach(g => matchedIds.add(g.id))
      if (group.length >= 5) {
        const mid = group[2]
        specialSpawns.push({
          x: mid.x,
          y: mid.y,
          type: GemSpecialType.VINYL,
          gemType: GemType.WHITE
        })
      } else if (group.length === 4) {
        const spawn = group[1]
        specialSpawns.push({
          x: spawn.x,
          y: spawn.y,
          type: GemSpecialType.LASER_H,
          gemType: group[0].type
        })
      }
    })

    const matchedSet = new Set()
    matchedIds.forEach(id => {
      const gem = databus.board.find(g => g.id === id)
      if (gem) matchedSet.add(gem)
    })
    return { matchedSet, specialSpawns }
  }

  findMatches() {
    const { matchedSet } = this.findMatchesDetailed()
    return matchedSet
  }

  // 递归爆炸逻辑（处理特殊宝石连锁）
  getExplodedGems(basicMatches) {
    let explodedSet = new Set(basicMatches)
    let queue = Array.from(basicMatches)
    let visited = new Set(queue.map(g => g.id))

    while (queue.length > 0) {
      const gem = queue.shift()

      if (gem.special !== GemSpecialType.NONE) {
        let targets = []

        if (gem.special === GemSpecialType.BOOMBOX) {
          music.playBoombox()
          databus.board.forEach(t => {
            if (
              Math.abs(t.x - gem.x) <= 1 &&
              Math.abs(t.y - gem.y) <= 1
            )
              targets.push(t)
          })
        } else if (gem.special === GemSpecialType.LASER_H) {
          music.playLaser()
          targets = databus.board.filter(t => t.y === gem.y)
        } else if (gem.special === GemSpecialType.LASER_V) {
          music.playLaser()
          targets = databus.board.filter(t => t.x === gem.x)
        } else if (gem.special === GemSpecialType.VINYL) {
          music.playVinyl()
          const randType = Math.floor(Math.random() * databus.typesCount)
          targets = databus.board.filter(t => t.type === randType)
        }

        targets.forEach(t => {
          if (!visited.has(t.id)) {
            visited.add(t.id)
            explodedSet.add(t)
            queue.push(t)
          }
        })
      }
    }
    return explodedSet
  }

  // 消除流程入口
  processElimination() {
    const { matchedSet, specialSpawns } = this.findMatchesDetailed()
    if (databus.gameWin || databus.gameOver) {
      databus.isProcessing = false
      return
    }
    if (matchedSet.size === 0) {
      databus.isProcessing = false
      databus.combo = 0
      if (databus.movesLeft <= 0) databus.gameOver = true
      return
    }
    if (specialSpawns && specialSpawns.length) {
      databus.pendingSpawns.push(...specialSpawns)
    }
    this.executeElimination(matchedSet)
  }

  // 执行消除与下落
  executeElimination(startSet) {
    databus.combo += 1
    const finalSet = this.getExplodedGems(startSet)
    const matchesArray = Array.from(finalSet)

    // 节奏伤害
    let rhythmMulti = 1
    const rhythm = databus.lastRhythm
    if (rhythm === 'GOOD') rhythmMulti = 1.5
    else if (rhythm === 'PERFECT') rhythmMulti = 2

    const base = matchesArray.length * 20
    const damage = Math.floor(base * databus.combo * rhythmMulti)
    databus.score += damage
    databus.enemyHp = Math.min(databus.enemyHp + damage, databus.enemyMaxHp)
    music.playMatch(databus.combo, matchesArray[0].type)

    this.createFlyText(
      damage,
      SCREEN_WIDTH / 2 + (Math.random() * 60 - 30),
      databus.startY - 50,
      databus.combo > 1
    )
    if (databus.combo > 1) {
      this.createFlyText(
        databus.combo + ' COMBO!',
        SCREEN_WIDTH / 2,
        databus.startY - 100,
        true
      )
    }
    if (rhythm === 'GOOD') {
      this.createFlyText('GOOD!', SCREEN_WIDTH / 2, databus.startY - 130)
    } else if (rhythm === 'PERFECT') {
      this.createFlyText('PERFECT!', SCREEN_WIDTH / 2, databus.startY - 130)
    }

    // 特效
    this.createShockwave(matchesArray[0].type)
    let echoCount = 0
    if (databus.combo >= 3) echoCount = 1
    if (rhythm === 'PERFECT') echoCount += 1
    if (echoCount > 0) this.createEchoWave(matchesArray[0].type, echoCount)
    this.createProjectile(matchesArray[0].type)

    databus.enemyFlashTimer = 10
    databus.lastRhythm = null

    // 消除动画
    matchesArray.forEach(gem => {
      this.createSquareEffect(
        gem.realX + databus.gemSize / 2,
        gem.realY + databus.gemSize / 2,
        GEM_STYLES[gem.type].color
      )
    })
    let count = 0
    matchesArray.forEach(gem => {
      this.createParticles(
        gem.realX + databus.gemSize / 2,
        gem.realY + databus.gemSize / 2,
        GEM_STYLES[gem.type].color
      )
      this.addTween(gem, { scale: 0, alpha: 0 }, 200, () => {
        count++
        if (count === matchesArray.length) {
          databus.board = databus.board.filter(g => !finalSet.has(g))
          this.handleFall()
        }
      })
    })
  }

  handleFall() {
    let maxTime = 0
    const FALL_DURATION = 220

    // 1. 现有宝石下落
    for (let x = 0; x < databus.width; x++) {
      let writeY = databus.height - 1
      for (let y = databus.height - 1; y >= 0; y--) {
        const gem = this.getGemAt(x, y)
        if (gem) {
          if (gem.y !== writeY) {
            gem.y = writeY
            this.addTween(
              gem,
              { realY: databus.startY + writeY * databus.gemSize },
              FALL_DURATION
            )
            maxTime = Math.max(maxTime, FALL_DURATION)
          }
          writeY--
        }
      }
      // 2. 填充新宝石
      while (writeY >= 0) {
        const type = Math.floor(Math.random() * databus.typesCount)
        let special = GemSpecialType.NONE
        if (Math.random() < 0.05) special = GemSpecialType.BOOMBOX

        const gem = {
          id: Math.random().toString(),
          x,
          y: writeY,
          realX: databus.startX + x * databus.gemSize,
          realY: databus.startY - databus.gemSize,
          type,
          special,
          isLocked: false,
          scale: 1,
          alpha: 1
        }
        databus.board.push(gem)
        this.addTween(
          gem,
          { realY: databus.startY + writeY * databus.gemSize },
          FALL_DURATION
        )
        maxTime = Math.max(maxTime, FALL_DURATION)
        writeY--
      }
    }

    setTimeout(() => {
      this.insertPendingSpecials()
      this.processElimination()
    }, maxTime + 50)
  }

  // --- 4. 渲染系统 ---

  render() {
    const now = this.now || Date.now()

    // 背景：低开销纯色（根据 hue 轻微变色）
    const hue = this.hue || 220
    ctx.fillStyle = `hsl(${hue}, 40%, 5%)`
    ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT)

    this.renderBattleScene()
    this.renderHpBar()

    // 棋盘缩放
    ctx.save()
    const boardCx = databus.startX + (databus.width * databus.gemSize) / 2
    const boardCy = databus.startY + (databus.height * databus.gemSize) / 2
    ctx.translate(boardCx, boardCy)
    ctx.scale(databus.boardScale, databus.boardScale)
    ctx.translate(-boardCx, -boardCy)
    this.renderBoardBg()
    databus.board.forEach(gem => this.renderGem(gem, now))
    ctx.restore()

    this.renderEffects()
    this.renderUI()

    // 通关/失败弹窗
    if (databus.levelText) {
      ctx.save()
      const popupW = SCREEN_WIDTH * 0.8
      const popupH = SCREEN_HEIGHT * 0.35
      const px = (SCREEN_WIDTH - popupW) / 2
      const py = (SCREEN_HEIGHT - popupH) / 2

      ctx.globalAlpha = 0.9
      ctx.fillStyle = 'rgba(0,0,0,0.8)'
      this.roundRect(ctx, px, py, popupW, popupH, 20)
      ctx.fill()
      ctx.strokeStyle = 'rgba(255,255,255,0.3)'
      ctx.lineWidth = 2
      ctx.stroke()

      ctx.globalAlpha = 1
      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 42px system-ui'
      ctx.textAlign = 'center'
      ctx.fillText(databus.levelText.text, SCREEN_WIDTH / 2, py + popupH * 0.25)

      if (typeof databus.levelText.score !== 'undefined') {
        ctx.font = 'bold 30px system-ui'
        ctx.fillStyle = '#ffffff'
        ctx.fillText(
          '分数: ' + databus.levelText.score,
          SCREEN_WIDTH / 2,
          py + popupH * 0.45
        )

        let gradeColor = '#34d399'
        if (databus.levelText.rating === 'S') gradeColor = '#facc15'
        else if (databus.levelText.rating === 'A') gradeColor = '#22d3ee'
        else if (databus.levelText.rating === 'B') gradeColor = '#a855f7'
        else gradeColor = '#f87171'
        ctx.font = 'bold 32px system-ui'
        ctx.fillStyle = gradeColor
        ctx.fillText(
          '评级: ' + databus.levelText.rating,
          SCREEN_WIDTH / 2,
          py + popupH * 0.6
        )
      }

      const btnW = 160
      const btnH = 48
      const btnX = (SCREEN_WIDTH - btnW) / 2
      const btnY = py + popupH * 0.75
      databus.nextButtonBounds = { x: btnX, y: btnY, width: btnW, height: btnH }

      ctx.fillStyle = 'rgba(255,255,255,0.1)'
      this.roundRect(ctx, btnX, btnY, btnW, btnH, 12)
      ctx.fill()
      ctx.strokeStyle = 'rgba(255,255,255,0.5)'
      ctx.lineWidth = 2
      this.roundRect(ctx, btnX, btnY, btnW, btnH, 12)
      ctx.stroke()

      ctx.fillStyle = '#facc15'
      ctx.font = 'bold 28px system-ui'
      ctx.fillText('下一关', SCREEN_WIDTH / 2, btnY + btnH * 0.65)
      ctx.restore()
    } else {
      databus.nextButtonBounds = null
    }
  }

  // —— 宝石渲染：普通简化，特殊带动画 ——
  renderGem(gem, now) {
    const size = databus.gemSize
    const pad = 4
    const x = gem.realX + pad
    const y = gem.realY + pad
    const w = size - pad * 2
    const h = size - pad * 2
    const cx = x + w / 2
    const cy = y + h / 2

    const style = GEM_STYLES[gem.type]

    ctx.save()
    ctx.translate(cx, cy)
    ctx.scale(gem.scale, gem.scale)
    ctx.globalAlpha = gem.alpha
    ctx.translate(-cx, -cy)

    // 1. 底座：单色圆角矩形（极简）
    ctx.fillStyle = style.color
    this.roundRect(ctx, x, y, w, h, 10)
    ctx.fill()

    // 选中 / 特殊描边
    if (databus.selectedGem === gem) {
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 3
      ctx.stroke()
    } else if (gem.special !== GemSpecialType.NONE) {
      ctx.strokeStyle = '#0f172a'
      ctx.lineWidth = 2
      ctx.stroke()
    }

    // 2. 图标 / 特殊动画
    ctx.fillStyle = '#0b1120'

    if (gem.special === GemSpecialType.BOOMBOX) {
      // ---- Boombox：呼吸脉冲圆圈 ----
      const t = (now % 900) / 900 // 0~1
      const pulse = 0.9 + Math.sin(t * PI2) * 0.1
      const r = (w * 0.3) * pulse

      // 内圆
      ctx.fillStyle = '#111827'
      ctx.beginPath()
      ctx.arc(cx, cy, r, 0, PI2)
      ctx.fill()

      // 外圈
      ctx.strokeStyle = '#fbbf24'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(cx, cy, r * 1.5, 0, PI2)
      ctx.stroke()

      // 中心“音箱”
      ctx.fillStyle = '#fbbf24'
      ctx.beginPath()
      ctx.arc(cx, cy, r * 0.5, 0, PI2)
      ctx.fill()
    } else if (
      gem.special === GemSpecialType.LASER_H ||
      gem.special === GemSpecialType.LASER_V
    ) {
      // ---- 激光：箭头 + 简化扫条 ----
      const dir =
        gem.special === GemSpecialType.LASER_H ? 'horizontal' : 'vertical'
      this.drawArrow(ctx, cx, cy, w / 2.2, dir)

      const stripes = 4
      const stripeSize =
        dir === 'horizontal' ? w / stripes : h / stripes
      const offset = (now / 80) % stripeSize

      ctx.save()
      ctx.globalAlpha = 0.18
      ctx.fillStyle = '#ffffff'
      if (dir === 'horizontal') {
        for (let i = 0; i < stripes; i++) {
          const sx = x + ((i * stripeSize + offset) % w)
          ctx.fillRect(sx, y, stripeSize / 2, h)
        }
      } else {
        for (let i = 0; i < stripes; i++) {
          const sy = y + ((i * stripeSize + offset) % h)
          ctx.fillRect(x, sy, w, stripeSize / 2)
        }
      }
      ctx.restore()
    } else if (gem.special === GemSpecialType.VINYL) {
      // ---- 黑胶：旋转简化版圆盘 ----
      const rotation = (now / 500) % (PI2)
      const r = w * 0.35

      ctx.save()
      ctx.translate(cx, cy)
      ctx.rotate(rotation)
      ctx.translate(-cx, -cy)

      // 外圈盘
      ctx.fillStyle = '#020617'
      ctx.beginPath()
      ctx.arc(cx, cy, r, 0, PI2)
      ctx.fill()

      // 内圈高亮
      ctx.strokeStyle = '#1f2937'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(cx, cy, r * 0.7, 0, PI2)
      ctx.stroke()

      // 中心标签
      ctx.fillStyle = '#db2777'
      ctx.beginPath()
      ctx.arc(cx, cy, r * 0.45, 0, PI2)
      ctx.fill()

      ctx.restore()
    } else {
      // ---- 普通宝石：简单图标 ----
      ctx.fillStyle = '#0b1120'
      this.drawIcon(ctx, gem.type, cx, cy, w * 0.6)
    }

    // 3. 锁
    if (gem.isLocked) {
      this.drawLock(ctx, x, y, w, h)
    }

    ctx.restore()
  }

  // 绘图辅助函数
  drawBoombox(ctx, x, y, r, color) {
    ctx.fillStyle = '#000'
    ctx.beginPath()
    ctx.arc(x, y, r, 0, PI2)
    ctx.fill()
    ctx.strokeStyle = color
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.arc(x, y, r, 0, PI2)
    ctx.stroke()
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.arc(x, y, r * 0.4, 0, PI2)
    ctx.fill()
  }

  // 已不再使用渐变，保留接口以防其他地方调用
  drawVinyl(ctx, x, y, r) {
    ctx.fillStyle = '#111'
    ctx.beginPath()
    ctx.arc(x, y, r, 0, PI2)
    ctx.fill()
    ctx.fillStyle = '#db2777'
    ctx.beginPath()
    ctx.arc(x, y, r * 0.3, 0, PI2)
    ctx.fill()
  }

  drawLock(ctx, x, y, w, h) {
    ctx.fillStyle = 'rgba(0,0,0,0.6)'
    this.roundRect(ctx, x, y, w, h, 12)
    ctx.fill()
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 3
    const cx = x + w / 2
    const cy = y + h / 2
    ctx.strokeRect(cx - 6, cy - 4, 12, 10)
    ctx.beginPath()
    ctx.arc(cx, cy - 4, 6, Math.PI, 0)
    ctx.stroke()
  }

  drawArrow(ctx, x, y, size, dir) {
    ctx.strokeStyle = '#22d3ee'
    ctx.lineWidth = 4
    ctx.lineCap = 'round'
    ctx.beginPath()
    if (dir === 'horizontal') {
      ctx.moveTo(x - size, y)
      ctx.lineTo(x + size, y)
      ctx.moveTo(x - size + 5, y - 5)
      ctx.lineTo(x - size, y)
      ctx.lineTo(x - size + 5, y + 5)
      ctx.moveTo(x + size - 5, y - 5)
      ctx.lineTo(x + size, y)
      ctx.lineTo(x + size - 5, y + 5)
    } else {
      ctx.moveTo(x, y - size)
      ctx.lineTo(x, y + size)
      ctx.moveTo(x - 5, y - size + 5)
      ctx.lineTo(x, y - size)
      ctx.lineTo(x + 5, y - size + 5)
      ctx.moveTo(x - 5, y + size - 5)
      ctx.lineTo(x, y + size)
      ctx.lineTo(x + 5, y + size - 5)
    }
    ctx.stroke()
  }

  drawIcon(ctx, type, cx, cy, size) {
    const r = size / 2
    ctx.beginPath()
    switch (type) {
      case 0: // Heart
        ctx.moveTo(cx, cy - r * 0.2)
        ctx.bezierCurveTo(
          cx - r,
          cy - r * 0.8,
          cx - r,
          cy + r * 0.5,
          cx,
          cy + r
        )
        ctx.bezierCurveTo(
          cx + r,
          cy + r * 0.5,
          cx + r,
          cy - r * 0.8,
          cx,
          cy - r * 0.2
        )
        break
      case 1: // Diamond
        ctx.moveTo(cx, cy - r)
        ctx.lineTo(cx + r * 0.8, cy)
        ctx.lineTo(cx, cy + r)
        ctx.lineTo(cx - r * 0.8, cy)
        break
      case 2: // Triangle
        ctx.moveTo(cx, cy - r * 0.8)
        ctx.lineTo(cx + r, cy + r * 0.8)
        ctx.lineTo(cx - r, cy + r * 0.8)
        break
      case 3: // Star
        for (let i = 0; i < 5; i++) {
          const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2
          const lx = cx + Math.cos(angle) * r
          const ly = cy + Math.sin(angle) * r
          if (i === 0) ctx.moveTo(lx, ly)
          else ctx.lineTo(lx, ly)
        }
        break
      case 4: // Zap
        ctx.moveTo(cx - r * 0.2, cy - r)
        ctx.lineTo(cx + r * 0.5, cy - r * 0.1)
        ctx.lineTo(cx, cy + r * 0.1)
        ctx.lineTo(cx + r * 0.2, cy + r)
        ctx.lineTo(cx - r * 0.5, cy + r * 0.1)
        ctx.lineTo(cx, cy - r * 0.1)
        break
      case 5: // Circle
        ctx.arc(cx, cy, r * 0.8, 0, PI2)
        break
    }
    ctx.closePath()
    ctx.fill()
  }

  roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath()
    ctx.moveTo(x + r, y)
    ctx.lineTo(x + w - r, y)
    ctx.quadraticCurveTo(x + w, y, x + w, y + r)
    ctx.lineTo(x + w, y + h - r)
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
    ctx.lineTo(x + r, y + h)
    ctx.quadraticCurveTo(x, y + h, x, y + h - r)
    ctx.lineTo(x, y + r)
    ctx.quadraticCurveTo(x, y, x + r, y)
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

  spawnCyberBlock(initial = false) {
    const size = 10 + Math.random() * 20
    databus.cyberBlocks.push({
      x: Math.random() * SCREEN_WIDTH,
      y: initial ? Math.random() * databus.startY * 0.7 : -size,
      size,
      speedX: 0,
      speedY: (1 + Math.random() * 1.5) * 3,
      opacity: 0.4 + Math.random() * 0.4,
      rotation: 0,
      rotationSpeed: 0
    })
  }

  createSquareEffect(x, y, color) {
    databus.squareEffects.push({
      x,
      y,
      size: databus.gemSize * 0.5,
      maxSize: databus.gemSize * 2,
      opacity: 0.8,
      color
    })
  }

  createEchoWave(type, count = 1) {
    for (let i = 0; i < count; i++) {
      databus.echoWaves.push({
        scale: 0.5,
        opacity: 0.8,
        color: GEM_STYLES[type].color,
        delay: i * 5
      })
    }
  }

  createFlyText(val, x, y, isCombo = false) {
    databus.flyTexts.push({
      val,
      x,
      y,
      life: 1,
      scale: isCombo ? 1.5 : 1,
      color: isCombo ? '#facc15' : 'white'
    })
  }

  createShockwave(type) {
    databus.shockwaves.push({
      scale: 0.5,
      opacity: 0.6,
      color: GEM_STYLES[type].color
    })
  }

  createProjectile(type) {
    const color = GEM_STYLES[type].color
    const targetXLeft = SCREEN_WIDTH / 2 - 30
    const targetXRight = SCREEN_WIDTH / 2 + 30
    const targetY = databus.startY * 0.4
    const startY =
      databus.startY + databus.gemSize * (databus.height / 2)
    databus.projectiles.push({
      x: databus.startX - 40,
      y: startY,
      targetX: targetXLeft,
      targetY: targetY,
      progress: 0,
      color
    })
    databus.projectiles.push({
      x: SCREEN_WIDTH - (databus.startX - 40),
      y: startY,
      targetX: targetXRight,
      targetY: targetY,
      progress: 0,
      color
    })
  }

  // 粒子：减少数量 + 全局上限
  createParticles(x, y, color) {
    const MAX_PARTICLES = 80
    if (databus.particles.length >= MAX_PARTICLES) return

    const COUNT = 4 // 原本 8
    for (let i = 0; i < COUNT; i++) {
      databus.particles.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 8,
        vy: (Math.random() - 0.5) * 8,
        life: 1,
        color
      })
    }
  }

  insertPendingSpecials() {
    if (!databus.pendingSpawns || databus.pendingSpawns.length === 0) return
    databus.pendingSpawns.forEach(spawn => {
      const gem = databus.board.find(
        g => g.x === spawn.x && g.y === spawn.y
      )
      if (gem) {
        gem.special = spawn.type
        if (typeof spawn.gemType !== 'undefined') gem.type = spawn.gemType
      }
    })
    databus.pendingSpawns = []
  }

  addTween(target, props, duration, cb) {
    databus.animations.push({
      target,
      props,
      start: { ...target },
      time: 0,
      duration,
      cb
    })
  }

  // --- 6. 主循环 ---

  loop() {
    const now = Date.now()
    const delta = now - this.lastFrameTime

    if (delta >= FRAME_INTERVAL) {
      const dt = Math.min(delta, 100) // 防止某帧过长
      this.lastFrameTime = now
      this.now = now

      databus.frame++
      this.updateTweens(dt)
      this.updateEffects(dt)
      this.render()
    }

    requestAnimationFrame(this.loop)
  }

  updateTweens(dt) {
    for (let i = databus.animations.length - 1; i >= 0; i--) {
      const a = databus.animations[i]
      a.time += dt
      let p = a.time / a.duration
      if (p > 1) p = 1
      const ease = p * (2 - p)
      for (let k in a.props) {
        a.target[k] =
          a.start[k] + (a.props[k] - a.start[k]) * ease
      }
      if (p === 1) {
        databus.animations.splice(i, 1)
        if (a.cb) a.cb()
      }
    }
  }

  updateEffects(dt) {
    // 敌人 HP 判定
    if (databus.enemyHp >= databus.enemyMaxHp && !databus.isEnemyDead) {
      databus.isEnemyDead = true
      databus.gameWin = true
    }
    if (databus.isEnemyDead && !databus.enemyDeathPlayed) {
      databus.enemyDeathEffects.push({
        scale: 0.5,
        opacity: 1,
        color: databus.devilColor
      })
      databus.enemyDeathPlayed = true
    }

    // 背景色调旋转
    this.hue = (this.hue + 0.1) % 360

    // 背景粒子上限
    const MAX_RAIN = 10
    const MAX_BLOCKS = 3

    if (databus.frame % 12 === 0 && databus.cyberRain.length < MAX_RAIN) {
      this.spawnRain()
    }

    if (
      databus.frame % 80 === 0 &&
      databus.cyberBlocks.length < MAX_BLOCKS
    ) {
      this.spawnCyberBlock()
    }

    // 赛博雨
    databus.cyberRain.forEach(r => {
      r.y += r.speed
    })
    databus.cyberRain = databus.cyberRain.filter(
      r => r.y < SCREEN_HEIGHT * 0.4
    )

    // 敌人闪白
    if (databus.enemyFlashTimer > 0) databus.enemyFlashTimer -= 1

    // 背景霓虹方块
    databus.cyberBlocks.forEach(b => {
      b.x += b.speedX
      b.y += b.speedY
      b.opacity -= 0.002
    })
    databus.cyberBlocks = databus.cyberBlocks.filter(
      b => b.y < databus.startY * 0.8 && b.opacity > 0
    )

    // 粒子：移动 + 更快消失
    databus.particles.forEach(p => {
      p.x += p.vx
      p.y += p.vy
      p.life -= 0.08
    })
    databus.particles = databus.particles.filter(p => p.life > 0)

    // 飘字
    databus.flyTexts.forEach(t => {
      t.y -= 2
      t.life -= 0.02
      t.scale += 0.01
    })
    databus.flyTexts = databus.flyTexts.filter(t => t.life > 0)

    // 攻击扩散波
    databus.shockwaves.forEach(w => {
      w.scale += 0.05
      w.opacity -= 0.03
    })
    databus.shockwaves = databus.shockwaves.filter(
      w => w.opacity > 0
    )

    // 附加回响波
    databus.echoWaves.forEach(w => {
      if (w.delay > 0) {
        w.delay--
      } else {
        w.scale += 0.05
        w.opacity -= 0.03
      }
    })
    databus.echoWaves = databus.echoWaves.filter(
      w => w.opacity > 0
    )

    // 投射物
    databus.projectiles.forEach(p => {
      p.progress += 0.05
    })
    databus.projectiles = databus.projectiles.filter(
      p => p.progress < 1
    )

    // 节拍 & 棋盘缩放 / 怪物摇头 / 颜色
    const beatLength = 60000 / music.bpm
    const elapsed = (this.now || Date.now()) - this.startTime
    const currentBeat = Math.floor(elapsed / beatLength)
    if (currentBeat !== this.prevBeatIndex) {
      if (currentBeat % 3 === 0) {
        databus.boardScaleTimer = 12
      }
      databus.devilTiltState = -databus.devilTiltState
      databus.devilTiltCounter += 1
      if (databus.devilTiltCounter >= 2) {
        databus.devilTiltCounter = 0
        databus.devilColorIndex =
          (databus.devilColorIndex + 1) % GEM_STYLES.length
        databus.devilColor =
          GEM_STYLES[databus.devilColorIndex].color
      }
      if (currentBeat % 4 === 0) {
        databus.devilRings.push({
          scale: 1,
          opacity: 1,
          color: databus.devilColor
        })
      }
      this.prevBeatIndex = currentBeat
    }

    // 棋盘缩放
    if (databus.boardScaleTimer > 0) {
      databus.boardScale =
        1 + 0.02 * (databus.boardScaleTimer / 12)
      databus.boardScaleTimer -= 1
    } else {
      databus.boardScale = 1
    }

    // 怪物节拍环
    databus.devilRings.forEach(r => {
      r.opacity -= 0.08
    })
    databus.devilRings = databus.devilRings.filter(
      r => r.opacity > 0
    )

    // 怪物死亡特效
    databus.enemyDeathEffects.forEach(e => {
      e.scale += 0.1
      e.opacity -= 0.05
    })
    databus.enemyDeathEffects = databus.enemyDeathEffects.filter(
      e => e.opacity > 0
    )

    // 通关 / 失败
    this.handleWin()
    this.handleGameOver()

    // 通关/失败文字渐隐
    if (
      databus.levelText &&
      typeof databus.levelText.timer !== 'undefined'
    ) {
      databus.levelText.timer -= 1
      databus.levelText.opacity = databus.levelText.timer / 120
    }

    // 方形扩散
    databus.squareEffects.forEach(s => {
      s.size += (s.maxSize - s.size) * 0.1
      s.opacity -= 0.05
    })
    databus.squareEffects = databus.squareEffects.filter(
      s => s.opacity > 0
    )
  }

  renderEffects() {
    // 1. 粒子：小方块渲染
    databus.particles.forEach(p => {
      ctx.save()
      ctx.globalAlpha = Math.max(p.life, 0)
      ctx.fillStyle = p.color
      const size = 3
      ctx.fillRect(p.x - size / 2, p.y - size / 2, size, size)
      ctx.restore()
    })

    // 2. 冲击波
    databus.shockwaves.forEach(w => {
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

    // 2b. 回响波
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

    // 2c. 节拍环
    databus.devilRings.forEach(r => {
      const cx = SCREEN_WIDTH / 2
      const cy = databus.startY * 0.4
      const hpRatio =
        databus.enemyMaxHp > 0
          ? databus.enemyHp / databus.enemyMaxHp
          : 0
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

    // 2d. 敌人死亡爆炸特效
    databus.enemyDeathEffects.forEach(e => {
      const cx = SCREEN_WIDTH / 2
      const cy = databus.startY * 0.4
      const radius = databus.gemSize * 4 * e.scale
      ctx.save()
      ctx.globalAlpha = Math.max(e.opacity * 0.6, 0)
      const col = e.color || '#ffffff'
      ctx.fillStyle = col
      ctx.beginPath()
      ctx.arc(cx, cy, radius, 0, PI2)
      ctx.fill()
      ctx.restore()
    })

    // 3. 飘字
    databus.flyTexts.forEach(t => {
      ctx.save()
      ctx.globalAlpha = Math.max(t.life, 0)
      ctx.font = `bold ${Math.floor(24 * t.scale)}px system-ui`
      ctx.textAlign = 'center'
      ctx.fillStyle = t.color
      ctx.fillText(t.val, t.x, t.y)
      ctx.restore()
    })

    // 4. 投射物
    databus.projectiles.forEach(b => {
      const px = b.x + (b.targetX - b.x) * b.progress
      const py = b.y + (b.targetY - b.y) * b.progress
      ctx.save()
      ctx.globalAlpha = 1 - b.progress
      ctx.fillStyle = b.color
      ctx.shadowColor = b.color
      ctx.shadowBlur = 15
      ctx.translate(px, py)
      ctx.rotate(Math.PI / 4)
      const size = 14
      ctx.fillRect(-size / 2, -size / 2, size, size)
      ctx.restore()
    })

    // 5. 方形扩散特效
    databus.squareEffects.forEach(s => {
      const half = s.size / 2
      ctx.save()
      ctx.globalAlpha = s.opacity
      ctx.strokeStyle = s.color
      ctx.lineWidth = 5
      const radius = Math.min(databus.gemSize * 0.2, s.size / 3)
      this.roundRect(
        ctx,
        s.x - half,
        s.y - half,
        s.size,
        s.size,
        radius
      )
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
      ctx.fillStyle = `hsla(${
        (this.hue + 180) % 360
      }, 70%, 40%, 1)`
      ctx.fillRect(
        b.x - b.size / 2,
        b.y - b.size / 2,
        b.size,
        b.size
      )
      ctx.restore()
    })

    // 赛博雨
    ctx.save()
    databus.cyberRain.forEach(r => {
      ctx.fillStyle = `rgba(34, 211, 238, ${r.opacity})`
      ctx.fillRect(r.x, r.y, 2, r.len)
    })
    ctx.restore()

    // 动态网格（保留，成本相对较小）
    ctx.save()
    ctx.beginPath()
    ctx.strokeStyle = 'rgba(255, 0, 255, 0.1)'
    const time = (this.now || Date.now()) / 1000
    const horizon = height * 0.8
    for (let i = 0; i < 5; i++) {
      const offset = (time * 50) % 50
      const y = horizon + i * 20 + offset
      if (y < height) {
        ctx.moveTo(0, y)
        ctx.lineTo(SCREEN_WIDTH, y)
      }
    }
    for (let i = 0; i < SCREEN_WIDTH; i += 60) {
      ctx.moveTo(i, horizon)
      ctx.lineTo(
        (i - SCREEN_WIDTH / 2) * 3 + SCREEN_WIDTH / 2,
        height
      )
    }
    ctx.stroke()
    ctx.restore()

    // 恶魔
    this.renderDevil(SCREEN_WIDTH / 2, height * 0.4)

    // 节奏指示灯
    this.renderRhythmIndicator()
  }

  renderRhythmIndicator() {
    const indicatorY = databus.startY * 0.2
    const baseRadius = 6
    const spacing = 20
    const beatLength = 60000 / music.bpm
    const elapsed = (this.now || Date.now()) - this.startTime
    const beatIndex = Math.floor(elapsed / beatLength) % 4
    const centerX = SCREEN_WIDTH / 2 - spacing * 1.5
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

  renderHpBar() {
    if (databus.enemyMaxHp <= 0) return
    const barWidth = SCREEN_WIDTH * 0.7
    const barHeight = 10
    const x = (SCREEN_WIDTH - barWidth) / 2
    const y = databus.startY - 30
    const ratio =
      databus.enemyMaxHp > 0
        ? databus.enemyHp / databus.enemyMaxHp
        : 0
    ctx.save()
    ctx.fillStyle = 'rgba(255,255,255,0.1)'
    this.roundRect(ctx, x, y, barWidth, barHeight, barHeight / 2)
    ctx.fill()
    ctx.strokeStyle = 'rgba(255,255,255,0.2)'
    ctx.lineWidth = 1
    this.roundRect(ctx, x, y, barWidth, barHeight, barHeight / 2)
    ctx.stroke()
    if (ratio > 0) {
      ctx.fillStyle = '#22d3ee'
      this.roundRect(
        ctx,
        x,
        y,
        barWidth * ratio,
        barHeight,
        barHeight / 2
      )
      ctx.fill()
    }
    ctx.restore()
  }

  renderDevil(cx, cy) {
    if (databus.isEnemyDead) return

    // 光晕（缩小范围，去掉 filter）
    ctx.save()
    ctx.translate(cx, cy)
    const baseRadius = databus.gemSize * 2.4
    const auraScale = 1 + 0.1 * (databus.boardScaleTimer / 12)
    const radius = baseRadius * auraScale
    const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, radius)
    grad.addColorStop(0, databus.devilColor + '55')
    grad.addColorStop(1, databus.devilColor + '00')
    ctx.globalAlpha = 0.35
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.arc(0, 0, radius, 0, PI2)
    ctx.fill()
    ctx.restore()

    const hpRatio = databus.enemyHp / databus.enemyMaxHp
    const bloat = 1 + hpRatio * 1.5
    const beatLength = 60000 / music.bpm
    const beatIndex =
      Math.floor(((this.now || Date.now()) - this.startTime) / beatLength) %
      4
    const isDownbeat = beatIndex === 0

    const scale = bloat * 1.2
    const tiltAmp = 0.12 + hpRatio * 0.18
    const tilt = databus.devilTiltState * tiltAmp

    ctx.save()
    ctx.translate(cx, cy)
    ctx.rotate(tilt)
    ctx.scale(scale, scale)
    ctx.translate(-50, -50)

    let bodyColor = databus.devilColor
    if (databus.enemyFlashTimer > 0) {
      bodyColor = '#ffffff'
    } else if (isDownbeat) {
      bodyColor = databus.devilColor
    }

    ctx.shadowBlur = 12
    ctx.shadowColor = databus.devilColor + '88'
    ctx.fillStyle = bodyColor

    // 头部两瓣
    ctx.beginPath()
    ctx.moveTo(30, 40)
    ctx.bezierCurveTo(20, 20, 10, 20, 10, 10)
    ctx.bezierCurveTo(20, 20, 30, 30, 35, 45)
    ctx.closePath()
    ctx.moveTo(70, 40)
    ctx.bezierCurveTo(80, 20, 90, 20, 90, 10)
    ctx.bezierCurveTo(80, 20, 70, 30, 65, 45)
    ctx.closePath()
    ctx.fill()
    // 头部
    ctx.beginPath()
    ctx.arc(50, 60, 35, 0, PI2)
    ctx.fill()
    // 眼睛
    ctx.fillStyle = '#ffffff'
    ctx.shadowBlur = 0
    ctx.beginPath()
    ctx.moveTo(35, 55)
    ctx.lineTo(45, 60)
    ctx.lineTo(35, 65)
    ctx.fill()
    ctx.beginPath()
    ctx.moveTo(65, 55)
    ctx.lineTo(55, 60)
    ctx.lineTo(65, 65)
    ctx.fill()
    // 嘴巴
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 3
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(40, 75)
    ctx.quadraticCurveTo(50, 85, 60, 75)
    ctx.stroke()
    ctx.restore()
  }

  renderBoardBg() {
    const w = databus.width * databus.gemSize
    const h = databus.height * databus.gemSize
    const x0 = databus.startX
    const y0 = databus.startY
    const radius = 16

    // 背景面板
    ctx.save()
    ctx.shadowBlur = 20
    ctx.shadowColor = 'rgba(0,0,0,0.6)'
    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)'
    this.roundRect(ctx, x0, y0, w, h, radius)
    ctx.fill()
    ctx.restore()

    // 外边框
    ctx.save()
    ctx.strokeStyle = 'rgba(255,255,255,0.08)'
    ctx.lineWidth = 3
    this.roundRect(ctx, x0, y0, w, h, radius)
    ctx.stroke()
    ctx.restore()

    // 网格线（去掉每格小块填充，减负）
    ctx.save()
    ctx.strokeStyle = 'rgba(255,255,255,0.05)'
    ctx.lineWidth = 1
    ctx.beginPath()
    for (let i = 0; i <= databus.width; i++) {
      const x = x0 + i * databus.gemSize
      ctx.moveTo(x, y0)
      ctx.lineTo(x, y0 + h)
    }
    for (let i = 0; i <= databus.height; i++) {
      const y = y0 + i * databus.gemSize
      ctx.moveTo(x0, y)
      ctx.lineTo(x0 + w, y)
    }
    ctx.stroke()
    ctx.restore()
  }

  renderUI() {
    const uiY = databus.startY - 70
    ctx.font = 'bold 16px Courier New'
    ctx.textBaseline = 'middle'
    // 左侧：关卡
    ctx.fillStyle = 'rgba(0,0,0,0.5)'
    ctx.beginPath()
    this.roundRect(ctx, 10, uiY - 15, 80, 30, 15)
    ctx.fill()
    ctx.fillStyle = '#94a3b8'
    ctx.textAlign = 'left'
    ctx.fillText('关卡', 20, uiY)
    ctx.fillStyle = '#c084fc'
    ctx.textAlign = 'right'
    ctx.fillText(databus.level, 80, uiY)
    // 右侧：步数
    ctx.fillStyle = 'rgba(0,0,0,0.5)'
    ctx.beginPath()
    this.roundRect(ctx, SCREEN_WIDTH - 90, uiY - 15, 80, 30, 15)
    ctx.fill()
    ctx.fillStyle = '#94a3b8'
    ctx.textAlign = 'left'
    ctx.fillText('步数', SCREEN_WIDTH - 80, uiY)
    ctx.fillStyle = databus.movesLeft < 5 ? '#ef4444' : '#22d3ee'
    ctx.textAlign = 'right'
    ctx.fillText(databus.movesLeft, SCREEN_WIDTH - 20, uiY)
  }
}
