let instance

// 宝石类型枚举
export const GemType = {
  RED: 0, BLUE: 1, GREEN: 2, YELLOW: 3, PURPLE: 4, ORANGE: 5, WHITE: 6
}

// 特殊技能枚举
export const GemSpecialType = {
  NONE: 0, BOOMBOX: 1, VINYL: 2, LASER_H: 3, LASER_V: 4
}

export default class DataBus {
  constructor() {
    if (instance) return instance
    instance = this
    this.reset()
  }

  reset() {
    this.frame = 0
    this.score = 0
    this.level = 1
    this.movesLeft = 15
    this.gameOver = false
    this.gameWin = false
    this.isFeverMode = false
    this.feverValue = 0
    this.combo = 0 // 新增：连击计数

    // 节奏评级（PERFECT / GOOD / MISS），用于结算分数
    this.lastRhythm = null

    // 待生成特殊宝石列表，供 Main.handleFall 使用
    this.pendingSpawns = []
    
    // 棋盘数据
    this.board = [] 
    this.width = 6
    this.height = 7
    this.gemSize = 0
    this.startX = 0
    this.startY = 0
    
    // 交互状态
    this.selectedGem = null
    this.isProcessing = false // 是否正在消除/下落中
    
    // 动画与特效队列
    this.animations = []     
    this.particles = []      
    this.flyTexts = []       
    this.shockwaves = []     
    this.cyberRain = []      
    this.projectiles = []    

    // 新增：动态背景方块和方形消除特效列表
    // cyberBlocks 用于存储在背景漂浮的方块（霓虹雨之外）
    // squareEffects 用于存储匹配时扩散的方形动画
    this.cyberBlocks = []
    this.squareEffects = []
    // echoWaves 用于存储额外的回响波（基于连击/节奏）
    this.echoWaves = []

    // 怪物节拍膨胀环效果队列
    this.devilBounces = []
    
    // 敌人状态
    this.enemyHp = 1000
    this.enemyMaxHp = 1000
    this.isEnemyDead = false

    // 初始可用宝石类型数量。不同关卡会覆盖此值，例如某些关卡仅使用 4 或 5 种颜色。
    this.typesCount = 6

    // 敌人闪白计时器，用于击中效果
    this.enemyFlashTimer = 0
    // 通关或失败文本计时器
    this.levelText = null

    // --- 动态节奏相关属性 ---
    // 棋盘缩放值，用于节奏鼓点时轻微放大棋盘
    this.boardScale = 1
    // 棋盘缩放计时器，>0 时表示仍处于放大动画中，会逐帧递减
    this.boardScaleTimer = 0
    // 用于根据节拍切换怪物颜色的索引
    this.devilColorIndex = 0
    // 当前怪物颜色（默认为红色），在每个节拍变化时更新
    this.devilColor = '#ef4444'

    // 怪物摇头状态：1 表示向右倾斜，-1 表示向左倾斜
    this.devilTiltState = 1
    // 怪物摇头计数，用于控制多少次摇动后变换颜色
    this.devilTiltCounter = 0

    // 怪物死亡特效队列：敌人击败后触发一次爆炸扩散效果
    this.enemyDeathEffects = []
    // 重置死亡特效播放标记
    this.enemyDeathPlayed = false

    // 标记怪物死亡特效是否已播放，用于避免重复触发
    this.enemyDeathPlayed = false

    // 怪物节拍环队列：每逢特定拍子会生成粗圈
    this.devilRings = []
  }
}