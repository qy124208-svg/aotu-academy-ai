/**
 * engine/widgets.js — GUI 组件系统
 * 移植自 Babylon.js GUI 2D: Control / Container / StackPanel
 *             + game-master/widgets.py
 * DOM 版本：Control → Container → StackPanel | Toast / Dialog / TextEntry / FloatingText
 * v2.0
 */

// ═══════════════════════════════════════════
// 对齐常量 (移植自 Babylon.js Control)
// ═══════════════════════════════════════════
const HORIZONTAL_ALIGNMENT_LEFT = 0;
const HORIZONTAL_ALIGNMENT_CENTER = 1;
const HORIZONTAL_ALIGNMENT_RIGHT = 2;
const VERTICAL_ALIGNMENT_TOP = 0;
const VERTICAL_ALIGNMENT_CENTER = 1;
const VERTICAL_ALIGNMENT_BOTTOM = 2;

// ═══════════════════════════════════════════
// Control — 所有UI组件的基类 (移植自 Babylon.js control.pure.ts)
// ═══════════════════════════════════════════

class Control {
  constructor(name = '') {
    this.name = name;
    this._el = null;           // DOM 元素
    this._parent = null;       // 父容器
    this._isVisible = true;
    this._isEnabled = true;
    this._isDirty = true;      // 需要重新渲染
    this._alpha = 1;
    this._zIndex = 0;

    // 尺寸 (ValueAndUnit)
    this._width = new ValueAndUnit(1, '%');
    this._height = new ValueAndUnit(1, '%');

    // 对齐
    this._horizontalAlignment = HORIZONTAL_ALIGNMENT_CENTER;
    this._verticalAlignment = VERTICAL_ALIGNMENT_CENTER;

    // 内边距 (px)
    this._paddingLeft = 0;
    this._paddingRight = 0;
    this._paddingTop = 0;
    this._paddingBottom = 0;

    // 变换
    this._scaleX = 1;
    this._scaleY = 1;
    this._rotation = 0;

    // 样式
    this._style = null;
    this._disabledColor = '#6a6a6a';

    // 事件
    this.onPointerClick = new Observable();
    this.onEnabledChange = new Observable();
    this.onDirty = new Observable();

    // 自定义数据
    this.metadata = null;
    this._tag = null;
  }

  // ─── 属性 ───

  get el() { return this._el; }
  get parent() { return this._parent; }

  get isVisible() { return this._isVisible; }
  set isVisible(v) {
    if (this._isVisible !== v) {
      this._isVisible = v;
      this._markAsDirty();
    }
  }

  get isEnabled() { return this._isEnabled; }
  set isEnabled(v) {
    if (this._isEnabled !== v) {
      this._isEnabled = v;
      this.onEnabledChange.notify(v);
      this._markAsDirty();
    }
  }

  get alpha() { return this._alpha; }
  set alpha(v) {
    if (this._alpha !== v) { this._alpha = v; this._markAsDirty(); }
  }

  get zIndex() { return this._zIndex; }
  set zIndex(v) { this._zIndex = v; if (this._el) this._el.style.zIndex = v; }

  get width() { return this._width.toString(); }
  set width(v) { if (this._width.fromString(v)) this._markAsDirty(); }

  get height() { return this._height.toString(); }
  set height(v) { if (this._height.fromString(v)) this._markAsDirty(); }

  get horizontalAlignment() { return this._horizontalAlignment; }
  set horizontalAlignment(v) { this._horizontalAlignment = v; this._markAsDirty(); }

  get verticalAlignment() { return this._verticalAlignment; }
  set verticalAlignment(v) { this._verticalAlignment = v; this._markAsDirty(); }

  get paddingLeft() { return this._paddingLeft; }
  set paddingLeft(v) { this._paddingLeft = v; this._markAsDirty(); }
  get paddingRight() { return this._paddingRight; }
  set paddingRight(v) { this._paddingRight = v; this._markAsDirty(); }
  get paddingTop() { return this._paddingTop; }
  set paddingTop(v) { this._paddingTop = v; this._markAsDirty(); }
  get paddingBottom() { return this._paddingBottom; }
  set paddingBottom(v) { this._paddingBottom = v; this._markAsDirty(); }

  /** 统设内边距 */
  setPadding(top, right, bottom, left) {
    this._paddingTop = top;
    this._paddingRight = right ?? top;
    this._paddingBottom = bottom ?? top;
    this._paddingLeft = left ?? right ?? top;
    this._markAsDirty();
  }

  get tag() { return this._tag; }
  set tag(v) { this._tag = v; }

  /**
   * 应用 Style 对象
   */
  applyStyle(style) {
    if (!style) return;
    if (this._style) {
      this._style.onChanged.remove(this._onStyleChanged);
    }
    this._style = style;
    this._onStyleChanged = () => this._markAsDirty();
    this._style.onChanged.add(this._onStyleChanged);
    this._markAsDirty();
  }

  /**
   * 构建 CSS 字符串 (应用 Style + 自身属性)
   */
  _buildCSS() {
    if (!this._el) return;
    const s = this._style;
    const el = this._el;

    // 可见性
    if (!this._isVisible) { el.style.display = 'none'; return; }
    el.style.display = '';

    // 透明度
    el.style.opacity = this._alpha;

    // 尺寸
    el.style.width = this._width.toString();
    el.style.height = this._height.toString();

    // 样式
    if (s) {
      el.style.fontFamily = s._fontFamily;
      el.style.fontSize = s._fontSize.toString();
      el.style.fontWeight = s._fontWeight;
      el.style.color = this._isEnabled ? s._color : this._disabledColor;
      if (s._backgroundColor) el.style.background = s._backgroundColor;
      if (s._borderColor) el.style.borderColor = s._borderColor;
      if (s._borderWidth) el.style.borderWidth = s._borderWidth + 'px';
      if (s._borderRadius) el.style.borderRadius = s._borderRadius + 'px';
    }

    // 内边距
    el.style.padding = `${this._paddingTop}px ${this._paddingRight}px ${this._paddingBottom}px ${this._paddingLeft}px`;

    // 变换
    if (this._scaleX !== 1 || this._scaleY !== 1 || this._rotation !== 0) {
      el.style.transform = `scale(${this._scaleX},${this._scaleY}) rotate(${this._rotation}deg)`;
    }
  }

  /** 标记为脏，下次渲染时更新 */
  _markAsDirty() {
    this._isDirty = true;
    this.onDirty.notify(this);
    if (this._parent) this._parent._markAsDirty();
  }

  /** 刷新渲染 */
  refresh() {
    this._buildCSS();
    this._isDirty = false;
  }

  /** 挂载到DOM */
  mount(parentEl) {
    if (!this._el) this._createElement();
    if (parentEl) {
      parentEl.appendChild(this._el);
    }
    this.refresh();
  }

  /** 卸载 */
  unmount() {
    if (this._el && this._el.parentNode) {
      this._el.parentNode.removeChild(this._el);
    }
  }

  /** 子类覆盖：创建DOM元素 */
  _createElement() {
    this._el = document.createElement('div');
    if (this.name) this._el.setAttribute('data-control', this.name);
  }

  /** 销毁 */
  dispose() {
    this.unmount();
    if (this._style) {
      this._style.onChanged.remove(this._onStyleChanged);
    }
    this.onPointerClick.clear();
    this.onEnabledChange.clear();
    this.onDirty.clear();
    this._el = null;
  }
}

// ═══════════════════════════════════════════
// Container — 容器基类 (移植自 Babylon.js container.pure.ts)
// ═══════════════════════════════════════════

class Container extends Control {
  constructor(name = '') {
    super(name);
    this._children = [];
    this._clipChildren = true;
  }

  get children() { return [...this._children]; }
  get childrenCount() { return this._children.length; }

  /** 添加子控件 */
  addControl(child) {
    if (child._parent) {
      child._parent.removeControl(child);
    }
    child._parent = this;
    this._children.push(child);
    if (this._el && child._el) {
      this._el.appendChild(child._el);
    }
    this._markAsDirty();
    return this;
  }

  /** 移除子控件 */
  removeControl(child) {
    const idx = this._children.indexOf(child);
    if (idx !== -1) {
      this._children.splice(idx, 1);
      child._parent = null;
      if (child._el && this._el) {
        this._el.removeChild(child._el);
      }
      this._markAsDirty();
    }
    return this;
  }

  /** 清空所有子控件 */
  clearControls() {
    for (const child of this._children) {
      child._parent = null;
      if (child._el && this._el) this._el.removeChild(child._el);
    }
    this._children.length = 0;
    this._markAsDirty();
  }

  _createElement() {
    super._createElement();
    this._el.style.position = 'relative';
    if (this._clipChildren) this._el.style.overflow = 'hidden';
  }

  refresh() {
    super.refresh();
    for (const child of this._children) {
      child.refresh();
    }
  }

  dispose() {
    for (const child of this._children) child.dispose();
    this._children.length = 0;
    super.dispose();
  }
}

// ═══════════════════════════════════════════
// StackPanel — 自动布局面板 (移植自 Babylon.js stackPanel.pure.ts)
// ═══════════════════════════════════════════

class StackPanel extends Container {
  constructor(name = '') {
    super(name);
    this._isVertical = true;
    this._spacing = 4;         // 子元素间距 (px)
    this._manualWidth = false;
    this._manualHeight = false;
  }

  get isVertical() { return this._isVertical; }
  set isVertical(v) {
    if (this._isVertical !== v) { this._isVertical = v; this._markAsDirty(); }
  }

  get spacing() { return this._spacing; }
  set spacing(v) {
    if (this._spacing !== v) { this._spacing = v; this._markAsDirty(); }
  }

  _createElement() {
    super._createElement();
    this._el.style.display = 'flex';
    this._applyLayout();
  }

  _applyLayout() {
    if (!this._el) return;
    this._el.style.flexDirection = this._isVertical ? 'column' : 'row';
    this._el.style.gap = this._spacing + 'px';
    this._el.style.alignItems = this._isVertical ? 'stretch' : 'center';
  }

  refresh() {
    this._applyLayout();
    super.refresh();
  }
}

// ═══════════════════════════════════════════
// TextBlock — 文本控件 (移植自 Babylon.js textBlock)
// ═══════════════════════════════════════════

class TextBlock extends Control {
  constructor(text = '', name = '') {
    super(name);
    this._text = text;
    this._textAlign = 'left';
    this._whiteSpace = 'pre-line';
  }

  get text() { return this._text; }
  set text(v) {
    if (this._text !== v) { this._text = v; this._markAsDirty(); }
  }

  _createElement() {
    super._createElement();
    this._el.style.whiteSpace = this._whiteSpace;
    this._el.style.lineHeight = '1.8';
    this._el.textContent = this._text;
  }

  refresh() {
    super.refresh();
    if (this._el) {
      this._el.textContent = this._text;
      this._el.style.textAlign = this._textAlign;
    }
  }
}

// ═══════════════════════════════════════════
// ImageButton — 图片按钮 (无外部素材，纯CSS)
// ═══════════════════════════════════════════

class ImageButton extends Control {
  constructor(text = '', name = '') {
    super(name);
    this._text = text;
    this._buttonType = 'primary'; // primary | secondary | danger
  }

  get text() { return this._text; }
  set text(v) { this._text = v; this._markAsDirty(); }

  _createElement() {
    super._createElement();
    this._el = document.createElement('button');
    this._el.style.cssText = 'border:none;cursor:pointer;font-family:inherit;transition:all 0.2s;display:inline-block;';
    this._el.textContent = this._text;
    this._el.addEventListener('click', (e) => {
      if (this._isEnabled) this.onPointerClick.notify(e);
    });
  }

  _buildCSS() {
    super._buildCSS();
    if (!this._el) return;
    const s = this._style;

    this._el.style.padding = this._paddingTop + 'px ' + this._paddingRight + 'px';

    if (!this._isEnabled) {
      this._el.style.background = '#444';
      this._el.style.color = '#888';
      this._el.style.cursor = 'not-allowed';
      return;
    }

    this._el.style.cursor = 'pointer';

    if (s) {
      this._el.style.background = s._backgroundColor || '#e94560';
      this._el.style.color = s._color || '#fff';
      this._el.style.border = (s._borderWidth || 1) + 'px solid ' + (s._borderColor || '#c0392b');
      this._el.style.borderRadius = (s._borderRadius || 8) + 'px';
      this._el.style.fontSize = s._fontSize.toString();
      this._el.style.fontWeight = s._fontWeight || 'bold';
    }
  }
}

/**
 * Toast — 浮动提示消息
 * 用于好感变化、属性变化等即时反馈
 */
class Toast {
  /**
   * @param {string} text    - 提示文本
   * @param {string} type    - 'info' | 'success' | 'warning' | 'affection'
   * @param {number} duration - 显示时长 (毫秒)
   */
  static show(text, type = 'info', duration = 2000) {
    const colors = {
      info: { bg: 'rgba(22,27,34,0.95)', border: '#58a6ff', text: '#e6edf3' },
      success: { bg: 'rgba(13,40,24,0.95)', border: '#3fb950', text: '#3fb950' },
      warning: { bg: 'rgba(40,30,10,0.95)', border: '#f0c040', text: '#f0c040' },
      affection: { bg: 'rgba(40,20,30,0.95)', border: '#e94560', text: '#e94560' },
    };
    const c = colors[type] || colors.info;

    const el = document.createElement('div');
    el.style.cssText = `
      position:fixed; top:20px; left:50%; transform:translateX(-50%);
      background:${c.bg}; border:2px solid ${c.border}; color:${c.text};
      border-radius:12px; padding:10px 24px; z-index:9999;
      font-size:0.85em; font-weight:bold; white-space:nowrap;
      animation: toastIn 0.3s ease, toastOut 0.3s ${duration - 300}ms ease forwards;
      pointer-events:none; font-family:inherit;
    `;
    el.textContent = text;
    document.body.appendChild(el);

    setTimeout(() => {
      if (el.parentNode) el.parentNode.removeChild(el);
    }, duration);
  }
}

// 注入Toast的CSS动画
(function injectToastCSS() {
  if (document.getElementById('toast-anim-style')) return;
  const style = document.createElement('style');
  style.id = 'toast-anim-style';
  style.textContent = `
    @keyframes toastIn { from { opacity:0; transform:translateX(-50%) translateY(-10px); } to { opacity:1; transform:translateX(-50%) translateY(0); } }
    @keyframes toastOut { from { opacity:1; } to { opacity:0; transform:translateX(-50%) translateY(-5px); } }
  `;
  document.head.appendChild(style);
})();

/**
 * Dialog — 模态对话框
 * 用于确认操作、重要提示
 */
class Dialog {
  /**
   * @param {string}   title   - 标题
   * @param {string}   message - 消息内容
   * @param {object[]} buttons - [{text, type, callback}]
   * @param {boolean}  modal   - 是否模态（点击背景不关闭）
   */
  static show(title, message, buttons = [{ text: '确定', type: 'primary', callback: null }], modal = true) {
    // 移除已有对话框
    const existing = document.querySelector('.engine-dialog-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.className = 'engine-dialog-overlay';
    overlay.style.cssText = `
      position:fixed; inset:0; background:rgba(0,0,0,0.6); z-index:9998;
      display:flex; align-items:center; justify-content:center;
      animation: fadeIn 0.2s;
    `;

    const btnHTML = buttons.map((b, i) => {
      const cls = b.type === 'primary' ? 'btn btn-p' :
                  b.type === 'danger' ? 'btn btn-p' :
                  'btn btn-s';
      return `<button class="${cls}" style="${b.type==='danger'?'background:#f85149':''}"
        onclick="window._engineDialogBtn(${i})">${b.text}</button>`;
    }).join('');

    overlay.innerHTML = `
      <div style="background:var(--panel);border:2px solid var(--gold);border-radius:14px;
        padding:24px;max-width:360px;width:90%;text-align:center;animation:fadeIn 0.3s">
        ${title ? `<h3 style="color:var(--gold);margin-bottom:12px;font-size:1em">${title}</h3>` : ''}
        <p style="white-space:pre-line;color:var(--text);line-height:1.8;font-size:0.9em;margin-bottom:16px">${message}</p>
        <div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap">${btnHTML}</div>
      </div>
    `;

    // 存储回调
    overlay._buttons = buttons;
    window._engineDialogBtn = (i) => {
      const cb = buttons[i]?.callback;
      overlay.remove();
      delete window._engineDialogBtn;
      if (cb) cb();
    };

    if (!modal) {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.remove();
      });
    }

    document.body.appendChild(overlay);
  }

  /** 快捷确认框 */
  static confirm(title, message, onConfirm, onCancel = null) {
    Dialog.show(title, message, [
      { text: '取消', type: 'secondary', callback: onCancel },
      { text: '确定', type: 'primary', callback: onConfirm },
    ]);
  }

  /** 快捷提示框 */
  static alert(title, message, onClose = null) {
    Dialog.show(title, message, [
      { text: '确定', type: 'primary', callback: onClose },
    ]);
  }
}

/**
 * TextEntry — 文本输入组件
 * 用于玩家自定义名字等
 */
class TextEntry {
  /**
   * @param {object} opts
   * @param {string} opts.placeholder
   * @param {number} opts.maxLength
   * @param {string} opts.defaultValue
   * @param {function} opts.onSubmit
   * @param {function} opts.onChange
   */
  static prompt(opts = {}) {
    const {
      title = '请输入',
      placeholder = '',
      maxLength = 20,
      defaultValue = '',
      onSubmit = null,
    } = opts;

    const overlay = document.createElement('div');
    overlay.className = 'engine-dialog-overlay';
    overlay.style.cssText = `
      position:fixed; inset:0; background:rgba(0,0,0,0.6); z-index:9998;
      display:flex; align-items:center; justify-content:center;
      animation: fadeIn 0.2s;
    `;

    overlay.innerHTML = `
      <div style="background:var(--panel);border:2px solid var(--gold);border-radius:14px;
        padding:24px;max-width:360px;width:90%;text-align:center;animation:fadeIn 0.3s">
        <h3 style="color:var(--gold);margin-bottom:16px;font-size:1em">${title}</h3>
        <input id="_engineTextInput" type="text" placeholder="${placeholder}"
          maxlength="${maxLength}" value="${defaultValue.replace(/"/g,'&quot;')}"
          style="width:100%;padding:10px 14px;border-radius:8px;border:2px solid #444;
            background:var(--card);color:var(--text);font-size:0.95em;font-family:inherit;
            outline:none;transition:border 0.2s"
          onfocus="this.style.borderColor='var(--gold)'"
          onblur="this.style.borderColor='#444'">
        <div style="display:flex;gap:8px;justify-content:center;margin-top:16px">
          <button class="btn btn-s" onclick="this.closest('.engine-dialog-overlay').remove()">取消</button>
          <button class="btn btn-p" onclick="window._engineTextSubmit()">确定</button>
        </div>
      </div>
    `;

    window._engineTextSubmit = () => {
      const input = document.getElementById('_engineTextInput');
      const value = input ? input.value.trim() : '';
      overlay.remove();
      delete window._engineTextSubmit;
      if (onSubmit) onSubmit(value || defaultValue);
    };

    document.body.appendChild(overlay);

    // 自动聚焦
    setTimeout(() => {
      const input = document.getElementById('_engineTextInput');
      if (input) input.focus();
    }, 100);

    // Enter 提交
    overlay.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const input = document.getElementById('_engineTextInput');
        const value = input ? input.value.trim() : '';
        overlay.remove();
        delete window._engineTextSubmit;
        if (onSubmit) onSubmit(value || defaultValue);
      }
    });
  }
}

/**
 * ProgressBar — 进度条组件
 * 用于显示冷却、加载、好感度等条状信息
 */
class ProgressBar {
  /**
   * 创建DOM进度条
   * @param {object} opts
   * @returns {HTMLElement}
   */
  static create(opts = {}) {
    const {
      value = 0, max = 100,
      height = 4,
      bgColor = '#333',
      fillColor = '#3fb950',
      borderRadius = 2,
      animate = false,
    } = opts;

    const container = document.createElement('div');
    container.style.cssText = `
      height:${height}px; background:${bgColor}; border-radius:${borderRadius}px;
      overflow:hidden; width:100%;
    `;

    const fill = document.createElement('div');
    const pct = Math.min(100, (value / max) * 100);
    fill.style.cssText = `
      height:100%; width:${pct}%; background:${fillColor}; border-radius:${borderRadius}px;
      ${animate ? 'transition: width 0.3s ease;' : ''}
    `;

    container.appendChild(fill);
    container._fill = fill;
    container._max = max;
    container.setValue = (v) => {
      fill.style.width = Math.min(100, (v / container._max) * 100) + '%';
    };

    return container;
  }
}

/**
 * CountdownDisplay — 倒计时显示
 */
class CountdownDisplay {
  static create(seconds, opts = {}) {
    const {
      danger = 10,    // 低于此秒数变红
      warn = 30,      // 低于此秒数变黄
      fontSize = '1em',
    } = opts;

    const el = document.createElement('span');
    el.style.cssText = `font-size:${fontSize};font-weight:bold;font-family:monospace;`;

    const update = (sec) => {
      el.textContent = sec + 's';
      el.style.color = sec <= danger ? '#f85149' : sec <= warn ? '#f0c040' : '#e6edf3';
    };
    update(seconds);

    el._update = update;
    return el;
  }
}

/**
 * FloatingText — 浮动伤害/治疗数字
 */
class FloatingText {
  /**
   * 在Canvas上绘制浮动文字并自动消失
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} x
   * @param {number} y
   * @param {string} text
   * @param {string} color
   */
  static spawn(ctx, x, y, text, color = '#f44') {
    // 由调用方管理生命周期（添加到数组）
    return {
      x, y, text, color,
      life: 40,
      vy: -1.5,
      update() { this.y += this.vy; this.life--; this.vy *= 0.98; },
      get alive() { return this.life > 0; },
      draw(ctx) {
        const alpha = Math.min(1, this.life / 20);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = this.color;
        ctx.font = 'bold 13px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(this.text, this.x, this.y);
        ctx.restore();
      },
    };
  }
}

console.log('[engine/widgets] Control | Container | StackPanel | TextBlock | ImageButton | Toast | Dialog | TextEntry | FloatingText — 就绪');
