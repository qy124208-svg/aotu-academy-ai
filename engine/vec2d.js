/**
 * engine/vec2d.js — 2D向量数学库
 * 移植自 game-master/vec2d.py
 * 精简版：保留游戏需要的核心运算
 * v1.0
 */

class Vec2 {
  constructor(x = 0, y = null) {
    if (y === null) {
      // 支持 Vec2([x, y]) 或 Vec2({x, y})
      if (Array.isArray(x)) {
        this.x = x[0] || 0;
        this.y = x[1] || 0;
      } else if (typeof x === 'object' && x.x !== undefined) {
        this.x = x.x;
        this.y = x.y;
      } else {
        this.x = x;
        this.y = x;
      }
    } else {
      this.x = x;
      this.y = y;
    }
  }

  // ─── 基础运算 ───

  add(other) {
    if (other instanceof Vec2) { this.x += other.x; this.y += other.y; }
    else if (Array.isArray(other)) { this.x += other[0]; this.y += other[1]; }
    else { this.x += other; this.y += other; }
    return this;
  }

  sub(other) {
    if (other instanceof Vec2) { this.x -= other.x; this.y -= other.y; }
    else if (Array.isArray(other)) { this.x -= other[0]; this.y -= other[1]; }
    else { this.x -= other; this.y -= other; }
    return this;
  }

  mul(other) {
    if (other instanceof Vec2) { this.x *= other.x; this.y *= other.y; }
    else if (Array.isArray(other)) { this.x *= other[0]; this.y *= other[1]; }
    else { this.x *= other; this.y *= other; }
    return this;
  }

  div(other) {
    if (other instanceof Vec2) { this.x /= other.x; this.y /= other.y; }
    else if (Array.isArray(other)) { this.x /= other[0]; this.y /= other[1]; }
    else { this.x /= other; this.y /= other; }
    return this;
  }

  // ─── 不可变版本（返回新Vec2）───

  plus(other) {
    if (other instanceof Vec2) return new Vec2(this.x + other.x, this.y + other.y);
    if (Array.isArray(other)) return new Vec2(this.x + other[0], this.y + other[1]);
    return new Vec2(this.x + other, this.y + other);
  }

  minus(other) {
    if (other instanceof Vec2) return new Vec2(this.x - other.x, this.y - other.y);
    if (Array.isArray(other)) return new Vec2(this.x - other[0], this.y - other[1]);
    return new Vec2(this.x - other, this.y - other);
  }

  scale(s) {
    return new Vec2(this.x * s, this.y * s);
  }

  // ─── 向量属性 ───

  /** 向量长度 */
  get length() {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  /** 设置向量长度（保持方向） */
  set length(val) {
    const len = this.length;
    if (len > 0) {
      this.x *= val / len;
      this.y *= val / len;
    }
  }

  /** 长度的平方（避免sqrt） */
  get lengthSq() {
    return this.x * this.x + this.y * this.y;
  }

  /** 角度（度） */
  get angle() {
    return Math.atan2(this.y, this.x) * 180 / Math.PI;
  }

  /** 设置角度（保持长度） */
  set angle(deg) {
    const len = this.length;
    const rad = deg * Math.PI / 180;
    this.x = Math.cos(rad) * len;
    this.y = Math.sin(rad) * len;
  }

  // ─── 向量方法 ───

  /** 归一化（返回自身） */
  normalize() {
    const len = this.length;
    if (len > 0) { this.x /= len; this.y /= len; }
    return this;
  }

  /** 返回归一化后的新向量 */
  normalized() {
    const len = this.length;
    if (len === 0) return new Vec2(0, 0);
    return new Vec2(this.x / len, this.y / len);
  }

  /** 旋转（度），修改自身 */
  rotate(deg) {
    const rad = deg * Math.PI / 180;
    const cos = Math.cos(rad), sin = Math.sin(rad);
    const x = this.x * cos - this.y * sin;
    const y = this.x * sin + this.y * cos;
    this.x = x; this.y = y;
    return this;
  }

  /** 旋转（度），返回新向量 */
  rotated(deg) {
    const rad = deg * Math.PI / 180;
    const cos = Math.cos(rad), sin = Math.sin(rad);
    return new Vec2(this.x * cos - this.y * sin, this.x * sin + this.y * cos);
  }

  /** 点积 */
  dot(other) {
    const o = other instanceof Vec2 ? other : new Vec2(other);
    return this.x * o.x + this.y * o.y;
  }

  /** 叉积（2D标量） */
  cross(other) {
    const o = other instanceof Vec2 ? other : new Vec2(other);
    return this.x * o.y - this.y * o.x;
  }

  /** 距离 */
  distTo(other) {
    const o = other instanceof Vec2 ? other : new Vec2(other);
    return Math.sqrt((this.x - o.x) ** 2 + (this.y - o.y) ** 2);
  }

  /** 距离的平方 */
  distToSq(other) {
    const o = other instanceof Vec2 ? other : new Vec2(other);
    return (this.x - o.x) ** 2 + (this.y - o.y) ** 2;
  }

  /** 到另一向量的角度（度） */
  angleTo(other) {
    const o = other instanceof Vec2 ? other : new Vec2(other);
    return Math.atan2(o.y - this.y, o.x - this.x) * 180 / Math.PI;
  }

  /** 线性插值 */
  lerp(other, t) {
    const o = other instanceof Vec2 ? other : new Vec2(other);
    return new Vec2(this.x + (o.x - this.x) * t, this.y + (o.y - this.y) * t);
  }

  /** 投影到另一向量 */
  projectOnto(other) {
    const o = other instanceof Vec2 ? other : new Vec2(other);
    const lenSq = o.lengthSq;
    if (lenSq === 0) return new Vec2(0, 0);
    return o.scale(this.dot(o) / lenSq);
  }

  /** 垂直向量（逆时针90度） */
  perpendicular() {
    return new Vec2(-this.y, this.x);
  }

  /** 反射（关于法线） */
  reflect(normal) {
    const n = normal instanceof Vec2 ? normal.normalized() : new Vec2(normal).normalize();
    return this.minus(n.scale(2 * this.dot(n)));
  }

  // ─── 静态工厂 ───

  /** 从角度和长度创建 */
  /** 从任意格式创建 Vec2 */
  static from(val) {
    if (val instanceof Vec2) return new Vec2(val.x, val.y);
    if (Array.isArray(val)) return new Vec2(val[0], val[1]);
    if (val && typeof val.x !== 'undefined') return new Vec2(val.x, val.y);
    return new Vec2(val, val);
  }

  static fromAngle(deg, length = 1) {
    const rad = deg * Math.PI / 180;
    return new Vec2(Math.cos(rad) * length, Math.sin(rad) * length);
  }

  /** 随机方向 */
  static random(length = 1) {
    const angle = Math.random() * Math.PI * 2;
    return new Vec2(Math.cos(angle) * length, Math.sin(angle) * length);
  }

  /** 两点之间的向量 */
  static between(from, to) {
    const f = from instanceof Vec2 ? from : new Vec2(from);
    const t = to instanceof Vec2 ? to : new Vec2(to);
    return new Vec2(t.x - f.x, t.y - f.y);
  }

  // ─── 工具方法 ───

  clone() {
    return new Vec2(this.x, this.y);
  }

  /** 限制长度不超过max */
  clampLength(max) {
    if (this.lengthSq > max * max) {
      this.length = max;
    }
    return this;
  }

  /** 转为数组 */
  toArray() {
    return [this.x, this.y];
  }

  /** 转为简单对象 */
  toObject() {
    return { x: this.x, y: this.y };
  }

  toString() {
    return `Vec2(${this.x.toFixed(2)}, ${this.y.toFixed(2)})`;
  }

  // ─── 高级插值 (移植自 game-master Vector2.java) ───

  /**
   * Catmull-Rom 样条插值
   * 通过4个控制点生成平滑曲线
   */
  static catmullRom(p0, p1, p2, p3, t) {
    const a = new Vec2(p0), b = new Vec2(p1), c = new Vec2(p2), d = new Vec2(p3);
    const t2 = t * t, t3 = t2 * t;
    return new Vec2(
      0.5 * ((2 * b.x) + (-a.x + c.x) * t + (2 * a.x - 5 * b.x + 4 * c.x - d.x) * t2 + (-a.x + 3 * b.x - 3 * c.x + d.x) * t3),
      0.5 * ((2 * b.y) + (-a.y + c.y) * t + (2 * a.y - 5 * b.y + 4 * c.y - d.y) * t2 + (-a.y + 3 * b.y - 3 * c.y + d.y) * t3)
    );
  }

  /**
   * Hermite 样条插值
   * @param {Vec2} p1 - 起点
   * @param {Vec2} t1 - 起点切线
   * @param {Vec2} p2 - 终点
   * @param {Vec2} t2 - 终点切线
   * @param {number} amount - 权重 0-1
   */
  static hermite(p1, t1, p2, t2, amount) {
    const a = new Vec2(p1), ta = new Vec2(t1), b = new Vec2(p2), tb = new Vec2(t2);
    const a2 = amount * amount, a3 = a2 * amount;
    const h1 = 2 * a3 - 3 * a2 + 1;
    const h2 = -2 * a3 + 3 * a2;
    const h3 = a3 - 2 * a2 + amount;
    const h4 = a3 - a2;
    return new Vec2(
      h1 * a.x + h2 * b.x + h3 * ta.x + h4 * tb.x,
      h1 * a.y + h2 * b.y + h3 * ta.y + h4 * tb.y
    );
  }

  /**
   * 重心坐标插值
   * @param {Vec2} v1, v2, v3 - 三角形顶点
   * @param {number} b2, b3 - 面积坐标
   */
  static barycentric(v1, v2, v3, b2, b3) {
    const a = new Vec2(v1), b = new Vec2(v2), c = new Vec2(v3);
    const b1 = 1 - b2 - b3;
    return new Vec2(b1 * a.x + b2 * b.x + b3 * c.x, b1 * a.y + b2 * b.y + b3 * c.y);
  }

  /**
   * SmoothStep 插值
   */
  static smoothStep(a, b, amount) {
    const t = amount * amount * (3 - 2 * amount); // 3t² - 2t³
    return new Vec2(a).lerp(b, t);
  }
}

// 兼容性别名
const vec2d = Vec2;

console.log('[engine/vec2d] Vec2 — 就绪');
