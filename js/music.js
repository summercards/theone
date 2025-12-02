let instance

export default class MusicManager {
  constructor() {
    if (instance) return instance
    instance = this

    // 微信小游戏音频上下文
    this.ctx = wx.createWebAudioContext()
    this.masterGain = this.ctx.createGain()
    this.masterGain.gain.value = 0.4
    this.masterGain.connect(this.ctx.destination)
    
    this.bpm = 125
    this.isPlaying = false
  }

  // 核心：节奏检测
  checkRhythm() {
    const now = Date.now() / 1000
    const spb = 60 / this.bpm
    const beatPos = (now % spb) / spb 
    
    // 容差判定: 接近0或1为准
    if (beatPos < 0.15 || beatPos > 0.85) return 'PERFECT'
    if (beatPos < 0.3 || beatPos > 0.7) return 'GOOD'
    return 'MISS'
  }

  playTone(freq, type, duration, startTime = 0) {
    if (this.ctx.state === 'suspended') this.ctx.resume()
    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()
    
    osc.type = type
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime + startTime)
    
    gain.gain.setValueAtTime(0.2, this.ctx.currentTime + startTime)
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + startTime + duration)
    
    osc.connect(gain)
    gain.connect(this.masterGain)
    osc.start(this.ctx.currentTime + startTime)
    osc.stop(this.ctx.currentTime + startTime + duration + 0.1)
  }

  playMatch(combo, typeIndex) {
    // 连击越高，音调越高
    const pitchMod = 1 + (combo * 0.1)
    const freqs = [440, 110, 261.63, 261.63, 110, 440, 880] 
    const types = ['sawtooth', 'square', 'triangle', 'triangle', 'square', 'sawtooth', 'sine']
    const idx = Math.min(typeIndex, freqs.length - 1)
    this.playTone(freqs[idx] * pitchMod, types[idx], 0.3)
  }

  playSwap() { this.playTone(600, 'sine', 0.05) }
  playInvalid() { this.playTone(150, 'sawtooth', 0.2) }
  playBoombox() { this.playTone(50, 'square', 0.6) } // 低音轰鸣
  playLaser() { this.playTone(1200, 'sawtooth', 0.15) } // 激光音
  playVinyl() { this.playTone(800, 'sine', 0.5) } // 刮擦声模拟
}