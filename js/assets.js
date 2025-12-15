// 资源管理：用贴图替换“代码绘制”的普通宝石与怪物
//
// 约定：
// - 普通宝石：/images/gems/gem_red.png ...
// - 怪物：/images/monsters/devil.png
//
// 说明：微信小游戏里使用 wx.createImage() 加载本地资源。

import { GemType } from './databus'

export default class Assets {
  constructor() {
    this.gemSrcByType = []
    this.gemSrcByType[GemType.RED] = 'images/gems/gem_red.png'
    this.gemSrcByType[GemType.BLUE] = 'images/gems/gem_blue.png'
    this.gemSrcByType[GemType.GREEN] = 'images/gems/gem_green.png'
    this.gemSrcByType[GemType.YELLOW] = 'images/gems/gem_yellow.png'
    this.gemSrcByType[GemType.PURPLE] = 'images/gems/gem_purple.png'
    this.gemSrcByType[GemType.ORANGE] = 'images/gems/gem_orange.png'
    this.gemSrcByType[GemType.WHITE] = 'images/gems/gem_white.png'

    this.monsterSrc = {
      devil: 'images/monsters/devil.png'
    }

    this.gems = new Array(this.gemSrcByType.length)
    this.monsters = {}

    // 记录加载失败项（不阻塞游戏）
    this.errors = []

    this.total = 0
    this.loaded = 0
  }

  get progress() {
    return this.total <= 0 ? 1 : this.loaded / this.total
  }

  // 统一预加载（不阻塞游戏逻辑；Main 会在未加载完成时自动回退到“代码绘制”）
  loadAll() {
    const tasks = []
    this.total = 0
    this.loaded = 0

    // gems
    this.gemSrcByType.forEach((src, type) => {
      if (!src) return
      this.total += 1
      tasks.push(
        this._loadImage(src)
          .then(img => {
            this.gems[type] = img
          })
          .catch(err => {
            this.gems[type] = null
            this.errors.push({ kind: 'gem', type, src, err })
          })
          .then(() => {
            this.loaded += 1
          })
      )
    })

    // monsters
    Object.keys(this.monsterSrc).forEach(key => {
      const src = this.monsterSrc[key]
      if (!src) return
      this.total += 1
      tasks.push(
        this._loadImage(src)
          .then(img => {
            this.monsters[key] = img
          })
          .catch(err => {
            this.monsters[key] = null
            this.errors.push({ kind: 'monster', name: key, src, err })
          })
          .then(() => {
            this.loaded += 1
          })
      )
    })

    // 注意：这里始终 resolve，避免因为缺一张图导致全部资源不可用
    return Promise.all(tasks)
  }

  getGem(type) {
    return this.gems[type]
  }

  getMonster(name = 'devil') {
    return this.monsters[name]
  }

  _loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = wx.createImage()
      img.onload = () => resolve(img)
      img.onerror = e => reject(e)
      img.src = src
    })
  }
}
