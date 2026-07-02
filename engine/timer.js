/**
 * engine/timer.js — 时间驱动定时器系统
 * 移植自 game-master/utils.py Timer 类
 * v1.0
 */

class Timer {
  /**
   * @param {number}  interval  - 定时间隔 (毫秒)
   * @param {function} callback - 回调函数
   * @param {boolean}  oneshot  - true=单次触发, false=循环触发
   */
  constructor(interval, callback, oneshot = false) {
    this.interval = interval;
    this.callback = callback;
    this.oneshot = oneshot;
    this.time = 0;
    this.alive = true;
  }

  /**
   * 更新计时器 — 每帧调用
   * @param {number} dt - 距上帧的时间差 (毫秒)
   */
  update(dt) {
    if (!this.alive) return;
    this.time += dt;
    if (this.time >= this.interval) {
      this.time -= this.interval;
      this.callback();
      if (this.oneshot) this.alive = false;
    }
  }

  /** 重置计时器 */
  reset() {
    this.time = 0;
    this.alive = true;
  }

  /** 停止计时器 */
  stop() {
    this.alive = false;
  }

  /** 恢复计时器 */
  start() {
    this.alive = true;
  }
}

/**
 * GameClock — 游戏时钟 (移植自 GameTime.java)
 * 追踪总游戏时间 + delta time + 暂停/恢复
 */
class GameClock {
  constructor() {
    this._baseTime = 0;
    this._pausedTime = 0;
    this._stopTime = 0;
    this._prevTime = 0;
    this._currTime = 0;
    this._stopped = false;
    this.deltaTime = 0;      // 毫秒
    this.deltaTimeSeconds = 0; // 秒
  }

  /** 启动/重置时钟 */
  reset() {
    const now = performance.now();
    this._baseTime = now;
    this._prevTime = now;
    this._stopTime = 0;
    this._stopped = false;
    this.deltaTime = 0;
    this.deltaTimeSeconds = 0;
  }

  /** 每帧调用，计算 delta */
  tick() {
    if (this._stopped) {
      this.deltaTime = 0;
      this.deltaTimeSeconds = 0;
      return;
    }

    this._currTime = performance.now();
    this.deltaTime = this._currTime - this._prevTime;
    this._prevTime = this._currTime;

    if (this.deltaTime < 0) this.deltaTime = 0;
    this.deltaTimeSeconds = this.deltaTime / 1000;
  }

  /** 获取游戏运行总时间（不含暂停） */
  get totalTime() {
    if (this._stopped) {
      return this._stopTime - this._baseTime;
    }
    return (this._currTime - this._pausedTime) - this._baseTime;
  }

  /** 暂停 */
  pause() {
    if (!this._stopped) {
      this._stopTime = performance.now();
      this._stopped = true;
    }
  }

  /** 恢复 */
  resume() {
    if (this._stopped) {
      const now = performance.now();
      this._pausedTime += (now - this._stopTime);
      this._prevTime = now;
      this._stopTime = 0;
      this._stopped = false;
    }
  }

  get paused() { return this._stopped; }
}

/**
 * Cooldown — 冷却计时器（简化版 Timer）
 * 用于技能冷却、攻击间隔等
 */
class Cooldown {
  /**
   * @param {number} cooldownMs - 冷却时间 (毫秒)
   */
  constructor(cooldownMs) {
    this.cooldownMs = cooldownMs;
    this.elapsed = cooldownMs; // 初始就绪
  }

  /**
   * 更新冷却
   * @param {number} dt - 距上帧的时间差 (毫秒)
   */
  update(dt) {
    if (this.elapsed < this.cooldownMs) {
      this.elapsed += dt;
    }
  }

  /** 是否冷却就绪 */
  get ready() {
    return this.elapsed >= this.cooldownMs;
  }

  /** 触发冷却（重置计时） */
  trigger() {
    this.elapsed = 0;
  }

  /** 立即就绪 */
  reset() {
    this.elapsed = this.cooldownMs;
  }

  /** 获取进度 0-1（0=刚触发, 1=就绪） */
  get progress() {
    return Math.min(1, this.elapsed / this.cooldownMs);
  }
}

/**
 * Countdown — 倒计时器
 * 用于限时选项、战斗倒计时等
 */
class Countdown {
  /**
   * @param {number}   durationMs - 倒计时总时长 (毫秒)
   * @param {function} onTick     - 每秒回调 (remainingSeconds)
   * @param {function} onEnd      - 倒计时结束回调
   */
  constructor(durationMs, onTick = null, onEnd = null) {
    this.durationMs = durationMs;
    this.remaining = durationMs;
    this.onTick = onTick;
    this.onEnd = onEnd;
    this.alive = true;
    this._lastSecond = Math.ceil(durationMs / 1000);
  }

  /**
   * 更新倒计时
   * @param {number} dt - 时间差 (毫秒)
   */
  update(dt) {
    if (!this.alive) return;
    this.remaining -= dt;
    if (this.remaining <= 0) {
      this.remaining = 0;
      this.alive = false;
      if (this.onEnd) this.onEnd();
      return;
    }
    // 每秒tick
    const sec = Math.ceil(this.remaining / 1000);
    if (sec !== this._lastSecond) {
      this._lastSecond = sec;
      if (this.onTick) this.onTick(sec);
    }
  }

  /** 获取剩余秒数 */
  get seconds() {
    return Math.ceil(this.remaining / 1000);
  }

  /** 获取进度 0-1 */
  get progress() {
    return this.remaining / this.durationMs;
  }

  stop() { this.alive = false; }
  reset(durationMs = null) {
    if (durationMs !== null) this.durationMs = durationMs;
    this.remaining = this.durationMs;
    this.alive = true;
    this._lastSecond = Math.ceil(this.durationMs / 1000);
  }
}

// 导出为全局（兼容现有架构）
console.log('[engine/timer] Timer | Cooldown | Countdown — 就绪');
