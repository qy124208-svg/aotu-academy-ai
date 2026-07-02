/**
 * engine/style.js — 样式系统 + Observable 事件
 * 移植自 Babylon.js GUI: style.ts, valueAndUnit.ts, observable.ts
 * v1.0
 */

// ═══════════════════════════════════════════
// Observable — 观察者模式 (移植自 Babylon.js Observable)
// ═══════════════════════════════════════════

class Observable {
  constructor() {
    this._observers = [];
  }

  /** 添加监听 */
  add(callback) {
    this._observers.push(callback);
    return callback; // 返回用于后续移除
  }

  /** 移除监听 */
  remove(callback) {
    const idx = this._observers.indexOf(callback);
    if (idx !== -1) this._observers.splice(idx, 1);
  }

  /** 通知所有观察者 */
  notify(data) {
    for (const cb of this._observers) {
      try { cb(data); } catch (e) { console.warn('[Observable] 回调异常:', e); }
    }
  }

  /** 清空 */
  clear() {
    this._observers.length = 0;
  }

  /** 是否有人监听 */
  get hasObservers() {
    return this._observers.length > 0;
  }
}

// ═══════════════════════════════════════════
// ValueAndUnit — 值+单位解析 (移植自 Babylon.js)
// ═══════════════════════════════════════════

class ValueAndUnit {
  static UNITMODE_PIXEL = 'px';
  static UNITMODE_PERCENTAGE = '%';

  constructor(value = 0, unit = 'px') {
    this._value = value;
    this._unit = unit;
    this._originalString = '';
  }

  /** 从字符串解析 "100px" / "50%" / "auto" */
  fromString(str) {
    if (typeof str === 'number') {
      this._value = str;
      this._unit = 'px';
      return true;
    }
    this._originalString = String(str);
    const match = String(str).match(/^(-?[\d.]+)\s*(px|%)?$/);
    if (match) {
      this._value = parseFloat(match[1]);
      this._unit = match[2] || 'px';
      return true;
    }
    return false;
  }

  get value() { return this._value; }
  set value(v) { this._value = v; }

  get unit() { return this._unit; }

  /** 是否像素单位 */
  get isPixel() { return this._unit === 'px'; }

  /** 是否百分比 */
  get isPercentage() { return this._unit === '%'; }

  /** 转为像素值 (需要父容器尺寸做百分比计算) */
  toPixels(parentSize = 0) {
    if (this._unit === '%') {
      return (this._value / 100) * parentSize;
    }
    return this._value;
  }

  toString() {
    return this._value + this._unit;
  }
}

// ═══════════════════════════════════════════
// Style — 主题样式 (移植自 Babylon.js Style)
// ═══════════════════════════════════════════

class Style {
  constructor() {
    this._fontSize = new ValueAndUnit(16, 'px');
    this._fontFamily = '"Microsoft YaHei", "PingFang SC", sans-serif';
    this._fontWeight = 'normal';
    this._fontStyle = 'normal';
    this._color = '#e6edf3';
    this._backgroundColor = '';
    this._borderColor = '';
    this._borderWidth = 0;
    this._borderRadius = 8;
    this._padding = { top: 0, right: 0, bottom: 0, left: 0 };
    this._alpha = 1;

    /** 样式变化时触发 */
    this.onChanged = new Observable();
  }

  // ─── 字体 ───
  get fontSize() { return this._fontSize.toString(); }
  set fontSize(val) {
    if (this._fontSize.fromString(val)) this.onChanged.notify('fontSize');
  }

  get fontFamily() { return this._fontFamily; }
  set fontFamily(val) {
    if (this._fontFamily !== val) { this._fontFamily = val; this.onChanged.notify('fontFamily'); }
  }

  get fontWeight() { return this._fontWeight; }
  set fontWeight(val) {
    if (this._fontWeight !== val) { this._fontWeight = val; this.onChanged.notify('fontWeight'); }
  }

  get color() { return this._color; }
  set color(val) {
    if (this._color !== val) { this._color = val; this.onChanged.notify('color'); }
  }

  // ─── 背景 ───
  get backgroundColor() { return this._backgroundColor; }
  set backgroundColor(val) {
    if (this._backgroundColor !== val) { this._backgroundColor = val; this.onChanged.notify('backgroundColor'); }
  }

  // ─── 边框 ───
  get borderColor() { return this._borderColor; }
  set borderColor(val) {
    if (this._borderColor !== val) { this._borderColor = val; this.onChanged.notify('borderColor'); }
  }

  get borderWidth() { return this._borderWidth; }
  set borderWidth(val) {
    if (this._borderWidth !== val) { this._borderWidth = val; this.onChanged.notify('borderWidth'); }
  }

  // ─── 透明度 ───
  get alpha() { return this._alpha; }
  set alpha(val) {
    if (this._alpha !== val) { this._alpha = val; this.onChanged.notify('alpha'); }
  }

  /** 设置统一 padding */
  setPadding(top, right, bottom, left) {
    this._padding = { top, right, bottom: bottom ?? top, left: left ?? right ?? top };
    this.onChanged.notify('padding');
  }

  /** 克隆 */
  clone() {
    const s = new Style();
    Object.assign(s._fontSize, this._fontSize);
    s._fontFamily = this._fontFamily;
    s._fontWeight = this._fontWeight;
    s._color = this._color;
    s._backgroundColor = this._backgroundColor;
    s._borderColor = this._borderColor;
    s._borderWidth = this._borderWidth;
    s._borderRadius = this._borderRadius;
    s._padding = { ...this._padding };
    s._alpha = this._alpha;
    return s;
  }
}

// ═══════════════════════════════════════════
// Theme — 预设主题 (匹配凹凸学园配色)
// ═══════════════════════════════════════════

const Theme = {
  /** 默认暗色主题 */
  dark: (() => {
    const s = new Style();
    s.color = '#e6edf3';
    s.backgroundColor = '#1c2128';
    s.borderColor = '#30363d';
    s.borderWidth = 1;
    return s;
  })(),

  /** 魔女主题 */
  witch: (() => {
    const s = new Style();
    s.color = '#e6edf3';
    s.backgroundColor = '#1a0a1e';
    s.borderColor = '#bc8cff';
    s.borderWidth = 2;
    s._fontSize = new ValueAndUnit(15, 'px');
    return s;
  })(),

  /** 金色强调 */
  gold: (() => {
    const s = new Style();
    s.color = '#0d1117';
    s.backgroundColor = '#f0c040';
    s.borderColor = '#d4a017';
    s.borderWidth = 2;
    s.fontWeight = 'bold';
    return s;
  })(),

  /** 危险/警告 */
  danger: (() => {
    const s = new Style();
    s.color = '#fff';
    s.backgroundColor = '#e94560';
    s.borderColor = '#c0392b';
    s.borderWidth = 1;
    return s;
  })(),

  /** 创建自定义主题 */
  create(overrides = {}) {
    const s = Theme.dark.clone();
    Object.keys(overrides).forEach(k => {
      if (k in s && typeof s[k] !== 'function') s[k] = overrides[k];
    });
    return s;
  },
};

console.log('[engine/style] Observable | ValueAndUnit | Style | Theme — 就绪');
