/**
 * engine/animation.js — 帧动画 + 增强粒子特效系统
 * 移植自 game-master/simpleanimation.py
 * v1.0
 */

/**
 * SpriteAnimation — 精灵帧动画
 * 循环/单次播放图片序列
 */
class SpriteAnimation {
  /**
   * @param {Image[]} images        - 帧图片数组
   * @param {number}  frameDuration - 每帧持续时间 (毫秒)
   * @param {number}  totalDuration - 总持续时间 (毫秒), -1 无限循环
   * @param {boolean} autoStart     - 是否自动开始
   */
  constructor(images, frameDuration = 100, totalDuration = -1, autoStart = true) {
    this.images = images;
    this.frameDuration = frameDuration;
    this.totalDuration = totalDuration;
    this.active = autoStart;
    this.imgPtr = 0;
    this.elapsed = 0;
    this.totalElapsed = 0;
  }

  /**
   * 更新动画
   * @param {number} dt - 距上帧时间差 (毫秒)
   */
  update(dt) {
    if (!this.active) return;
    this.elapsed += dt;
    this.totalElapsed += dt;

    if (this.elapsed >= this.frameDuration) {
      this.elapsed -= this.frameDuration;
      this.imgPtr = (this.imgPtr + 1) % this.images.length;
    }

    if (this.totalDuration >= 0 && this.totalElapsed >= this.totalDuration) {
      this.active = false;
    }
  }

  /** 获取当前帧图片 */
  get currentFrame() {
    return this.images[this.imgPtr];
  }

  /**
   * 绘制当前帧到 Canvas
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} x - 中心x
   * @param {number} y - 中心y
   * @param {number} scale - 缩放
   * @param {number} alpha - 透明度
   */
  draw(ctx, x, y, scale = 1, alpha = 1) {
    if (!this.active || !this.currentFrame) return;
    const img = this.currentFrame;
    const w = img.width * scale, h = img.height * scale;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.drawImage(img, x - w / 2, y - h / 2, w, h);
    ctx.restore();
  }

  /** 是否活跃 */
  get isActive() { return this.active; }

  /** 重新开始 */
  restart() {
    this.active = true;
    this.imgPtr = 0;
    this.elapsed = 0;
    this.totalElapsed = 0;
  }

  stop() { this.active = false; }
}

/**
 * Particle — 单个粒子
 */
class Particle {
  constructor(x, y, vx, vy, life, color = '#fff', size = 3, alpha = 1) {
    this.x = x; this.y = y;
    this.vx = vx; this.vy = vy;
    this.life = life;
    this.maxLife = life;
    this.color = color;
    this.size = size;
    this.alpha = alpha;
    this.gravity = 0;
    this.friction = 1;
    this.shrink = false; // 粒子缩小
  }

  update(dt) {
    const dtScale = dt / 16.67; // 标准化到 60fps
    this.vy += this.gravity * dtScale;
    this.vx *= Math.pow(this.friction, dtScale);
    this.vy *= Math.pow(this.friction, dtScale);
    this.x += this.vx * dtScale;
    this.y += this.vy * dtScale;
    this.life -= dt;
  }

  get alive() { return this.life > 0; }

  get progress() { return 1 - this.life / this.maxLife; }

  draw(ctx) {
    const a = this.alpha * (this.life / this.maxLife);
    const s = this.shrink ? this.size * (this.life / this.maxLife) : this.size;
    ctx.save();
    ctx.globalAlpha = Math.max(0, a);
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, Math.max(0.5, s), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

/**
 * ParticleSystem — 粒子系统管理器
 */
class ParticleSystem {
  constructor() {
    this.particles = [];
  }

  /**
   * 生成爆炸粒子
   * @param {number} x
   * @param {number} y
   * @param {number} count
   * @param {string} color
   * @param {object} opts - {speed, life, size}
   */
  explode(x, y, count = 12, color = '#ff0', opts = {}) {
    if(this.particles.length>550)return;
    if(this.particles.length>400)count=Math.floor(count*0.4);
    else if(this.particles.length>250)count=Math.floor(count*0.7);
    const { speed = 3, life = 30, size = 3 } = opts;
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
      const spd = speed * (0.6 + Math.random() * 0.8);
      const p = new Particle(x, y, Math.cos(angle) * spd, Math.sin(angle) * spd,
        life * (0.5 + Math.random()), color, size * (0.5 + Math.random()), 0.9);
      p.friction = 0.95;
      p.shrink = true;
      this.particles.push(p);
    }
  }

  /**
   * 生成线性粒子（技能射线、冲刺痕迹）
   */
  burst(x, y, angle, count = 8, color = '#58a6ff', opts = {}) {
    if(this.particles.length>550)return;
    if(this.particles.length>400)count=Math.floor(count*0.4);
    else if(this.particles.length>250)count=Math.floor(count*0.7);
    const { speed = 4, life = 25, spread = 30, size = 2 } = opts;
    for (let i = 0; i < count; i++) {
      const a = angle + (Math.random() - 0.5) * spread * Math.PI / 180;
      const spd = speed * (0.5 + Math.random());
      const p = new Particle(x, y, Math.cos(a) * spd, Math.sin(a) * spd,
        life * (0.6 + Math.random()), color, size, 0.8);
      p.friction = 0.92;
      p.shrink = true;
      this.particles.push(p);
    }
  }

  /**
   * 生成环形粒子（冲击波）
   */
  ring(x, y, radius, count = 20, color = '#fff', opts = {}) {
    if(this.particles.length>550)return;
    if(this.particles.length>400)count=Math.floor(count*0.4);
    else if(this.particles.length>250)count=Math.floor(count*0.7);
    const { speed = 2, life = 25, size = 2 } = opts;
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count;
      const px = x + Math.cos(angle) * radius;
      const py = y + Math.sin(angle) * radius;
      const p = new Particle(px, py,
        Math.cos(angle) * speed, Math.sin(angle) * speed,
        life, color, size, 0.7);
      p.friction = 0.98;
      p.shrink = true;
      this.particles.push(p);
    }
  }

  /**
   * 生成拖尾粒子
   */
  trail(x, y, color = '#ff6', size = 2, life = 15) {
    const p = new Particle(x, y,
      (Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * 0.5,
      life, color, size, 0.4);
    p.shrink = true;
    this.particles.push(p);
  }

  /** 更新所有粒子 */
  update(dt) {
    // 粒子数量限制，防止性能问题
    if (this.particles.length > 600) {
      this.particles.splice(0, this.particles.length - 600);
    }
    for (let i = this.particles.length - 1; i >= 0; i--) {
      this.particles[i].update(dt);
      if (!this.particles[i].alive) {
        this.particles.splice(i, 1);
      }
    }
  }

  /** 绘制所有粒子 */
  draw(ctx) {
    for (const p of this.particles) {
      p.draw(ctx);
    }
  }

  /** 清空所有粒子 */
  clear() {
    this.particles.length = 0;
  }

  /** 粒子数量 */
  get count() { return this.particles.length; }
}

/**
 * ScreenShake — 屏幕震动效果
 */
class ScreenShake {
  constructor() {
    this.intensity = 0;
    this.decay = 0.9;
    this.ox = 0;
    this.oy = 0;
  }

  /**
   * 触发震动
   * @param {number} intensity - 震动强度 (像素)
   * @param {number} decay     - 衰减系数 (0-1, 越小越快)
   */
  trigger(intensity = 8, decay = 0.85) {
    this.intensity = Math.max(this.intensity, intensity);
    this.decay = decay;
  }

  /** 更新震动（每帧调用） */
  update() {
    if (this.intensity > 0.5) {
      this.ox = (Math.random() - 0.5) * 2 * this.intensity;
      this.oy = (Math.random() - 0.5) * 2 * this.intensity;
      this.intensity *= this.decay;
    } else {
      this.intensity = 0;
      this.ox = 0;
      this.oy = 0;
    }
  }

  /**
   * 应用震动到 Canvas
   */
  apply(ctx) {
    if (this.intensity > 0) {
      ctx.translate(this.ox, this.oy);
    }
  }

  get isShaking() { return this.intensity > 0; }
}

/**
 * Easing — 缓动函数库
 */
/**
 * Easing — Robert Penner 缓动函数全集
 * 移植自 game-master/src/game/animation/ease/*.java
 * 11种缓动类型 × 3种模式(in/out/inOut) = 33个函数
 */
const Easing = {
  // ─── Linear ───
  linear: t => t,
  easeInLinear: t => t,
  easeOutLinear: t => t,
  easeInOutLinear: t => t,

  // ─── Quadratic ───
  easeInQuad: t => t * t,
  easeOutQuad: t => t * (2 - t),
  easeInOutQuad: t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,

  // ─── Cubic ───
  easeInCubic: t => t * t * t,
  easeOutCubic: t => { const t1 = t - 1; return t1 * t1 * t1 + 1; },
  easeInOutCubic: t => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,

  // ─── Quartic ───
  easeInQuart: t => t * t * t * t,
  easeOutQuart: t => { const t1 = t - 1; return 1 - t1 * t1 * t1 * t1; },
  easeInOutQuart: t => t < 0.5 ? 8 * t * t * t * t : 1 - 8 * (--t) * t * t * t,

  // ─── Quintic ───
  easeInQuint: t => t * t * t * t * t,
  easeOutQuint: t => { const t1 = t - 1; return 1 + t1 * t1 * t1 * t1 * t1; },
  easeInOutQuint: t => t < 0.5 ? 16 * t * t * t * t * t : 1 + 16 * (--t) * t * t * t * t,

  // ─── Sinusoidal ───
  easeInSine: t => 1 - Math.cos(t * Math.PI / 2),
  easeOutSine: t => Math.sin(t * Math.PI / 2),
  easeInOutSine: t => (1 - Math.cos(Math.PI * t)) / 2,

  // ─── Exponential ───
  easeInExpo: t => t === 0 ? 0 : Math.pow(2, 10 * (t - 1)),
  easeOutExpo: t => t === 1 ? 1 : 1 - Math.pow(2, -10 * t),
  easeInOutExpo: t => {
    if (t === 0 || t === 1) return t;
    if (t < 0.5) return Math.pow(2, 20 * t - 10) / 2;
    return (2 - Math.pow(2, -20 * t + 10)) / 2;
  },

  // ─── Circular ───
  easeInCirc: t => 1 - Math.sqrt(1 - t * t),
  easeOutCirc: t => Math.sqrt(1 - (t - 1) * (t - 1)),
  easeInOutCirc: t => t < 0.5
    ? (1 - Math.sqrt(1 - 4 * t * t)) / 2
    : (Math.sqrt(1 - (2 * t - 2) * (2 * t - 2)) + 1) / 2,

  // ─── Back (overshoot) ───
  easeInBack: (t, s = 1.70158) => t * t * ((s + 1) * t - s),
  easeOutBack: (t, s = 1.70158) => { const t1 = t - 1; return t1 * t1 * ((s + 1) * t1 + s) + 1; },
  easeInOutBack: (t, s = 1.70158) => {
    const s2 = s * 1.525;
    if (t < 0.5) return (t *= 2) * t * ((s2 + 1) * t - s2) / 2;
    return ((t = t * 2 - 2) * t * ((s2 + 1) * t + s2) + 2) / 2;
  },

  // ─── Bounce ───
  easeInBounce: t => 1 - Easing.easeOutBounce(1 - t),
  easeOutBounce: t => {
    if (t < 1 / 2.75) return 7.5625 * t * t;
    if (t < 2 / 2.75) { t -= 1.5 / 2.75; return 7.5625 * t * t + 0.75; }
    if (t < 2.5 / 2.75) { t -= 2.25 / 2.75; return 7.5625 * t * t + 0.9375; }
    t -= 2.625 / 2.75;
    return 7.5625 * t * t + 0.984375;
  },
  easeInOutBounce: t => t < 0.5
    ? Easing.easeInBounce(t * 2) * 0.5
    : Easing.easeOutBounce(t * 2 - 1) * 0.5 + 0.5,

  // ─── Elastic ───
  easeInElastic: (t, a, p) => {
    if (t === 0 || t === 1) return t;
    const period = p || 0.3;
    const amplitude = a || 1;
    const s = period / 4;
    return -(amplitude * Math.pow(2, 10 * (t -= 1)) * Math.sin((t - s) * (2 * Math.PI) / period));
  },
  easeOutElastic: (t, a, p) => {
    if (t === 0 || t === 1) return t;
    const period = p || 0.3;
    const amplitude = a || 1;
    const s = period / 4;
    return amplitude * Math.pow(2, -10 * t) * Math.sin((t - s) * (2 * Math.PI) / period) + 1;
  },
  easeInOutElastic: (t, a, p) => {
    if (t === 0 || t === 1) return t;
    const period = (p || 0.3) * 1.5;
    const amplitude = a || 1;
    const s = period / 4;
    if (t < 0.5) {
      return -0.5 * (amplitude * Math.pow(2, 10 * (t = t * 2 - 2)) * Math.sin((t - s) * (2 * Math.PI) / period));
    }
    return amplitude * Math.pow(2, -10 * (t = t * 2 - 1)) * Math.sin((t - s) * (2 * Math.PI) / period) * 0.5 + 1;
  },
};

console.log('[engine/animation] SpriteAnimation | ParticleSystem | ScreenShake | Easing — 就绪');
