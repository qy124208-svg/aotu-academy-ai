/**
 * engine/input.js — 键盘 + 鼠标 输入轮询系统
 * 移植自 game-master/src/game/input/KeyboardInput.java + MouseInput.java
 * 核心特性: keyDown (持续按住) vs keyDownOnce (按下瞬间)
 * v1.0
 */

/**
 * Keyboard — 键盘状态轮询
 *
 * 用法:
 *   Keyboard.poll()          // 每帧调用一次
 *   Keyboard.keyDown('a')    // a键是否被按住
 *   Keyboard.keyDownOnce(' ') // 空格是否刚按下（只触发一次）
 */
const Keyboard = {
  _current: {},   // 当前帧按键状态
  _state: {},     // 轮询后状态: RELEASED/PRESSED/ONCE

  /** 每帧开始时调用，轮询键盘状态 */
  poll() {
    for (const key in this._current) {
      if (this._current[key]) {
        // 上帧是 RELEASED → 这一帧标记为 ONCE
        // 上帧已经按下 → 这一帧标记为 PRESSED
        this._state[key] = (this._state[key] === 'RELEASED' || !this._state[key]) ? 'ONCE' : 'PRESSED';
      } else {
        this._state[key] = 'RELEASED';
      }
    }
  },

  /** 按键是否被按住 (持续) */
  keyDown(key) {
    const s = this._state[key];
    return s === 'ONCE' || s === 'PRESSED';
  },

  /** 按键是否刚按下 (单次触发) */
  keyDownOnce(key) {
    return this._state[key] === 'ONCE';
  },

  /** 标记按键按下 (由 DOM 事件调用) */
  _onKeyDown(e) {
    this._current[e.key.toLowerCase()] = true;
    // 同时存 keyCode 版本
    if (e.code) this._current['code:' + e.code] = true;
  },

  /** 标记按键释放 (由 DOM 事件调用) */
  _onKeyUp(e) {
    this._current[e.key.toLowerCase()] = false;
    if (e.code) this._current['code:' + e.code] = false;
  },

  /** 初始化 DOM 事件监听 */
  init(target = window) {
    target.addEventListener('keydown', (e) => this._onKeyDown(e));
    target.addEventListener('keyup', (e) => this._onKeyUp(e));
    // 窗口失焦时重置所有按键
    window.addEventListener('blur', () => { this._current = {}; });
  },

  /** 检查是否有任意键被按下 */
  anyKey() {
    return Object.values(this._state).some(s => s === 'ONCE' || s === 'PRESSED');
  },
};

/**
 * Mouse — 鼠标状态轮询
 *
 * 用法:
 *   Mouse.poll()              // 每帧调用一次
 *   Mouse.getPosition()       // 返回 {x, y}
 *   Mouse.buttonDown(0)       // 左键是否按住
 *   Mouse.buttonDownOnce(0)   // 左键是否刚点击
 *   Mouse.buttonDown(2)       // 右键是否按住
 */
const Mouse = {
  _current: [false, false, false], // 左/中/右
  _state: ['RELEASED', 'RELEASED', 'RELEASED'],
  _pos: { x: 0, y: 0 },
  _prevPos: { x: 0, y: 0 },
  _wheel: 0,

  /** 每帧开始时调用 */
  poll() {
    // 保存上一帧位置
    this._prevPos = { ...this._pos };
    // 轮询按键
    for (let i = 0; i < 3; i++) {
      if (this._current[i]) {
        this._state[i] = (this._state[i] === 'RELEASED') ? 'ONCE' : 'PRESSED';
      } else {
        this._state[i] = 'RELEASED';
      }
    }
    // 重置滚轮
    this._wheel = 0;
  },

  /** 获取鼠标位置 */
  getPosition() {
    return { ...this._pos };
  },

  /** 鼠标移动量（本帧位置 - 上帧位置） */
  getDelta() {
    return { x: this._pos.x - this._prevPos.x, y: this._pos.y - this._prevPos.y };
  },

  /** 按钮是否按住 */
  buttonDown(button = 0) {
    const s = this._state[button];
    return s === 'ONCE' || s === 'PRESSED';
  },

  /** 按钮是否刚点击 */
  buttonDownOnce(button = 0) {
    return this._state[button] === 'ONCE';
  },

  /** 滚轮值 */
  getWheel() { return this._wheel; },

  /** 鼠标移动 (DOM 事件) */
  _onMouseMove(e) {
    this._pos.x = e.clientX;
    this._pos.y = e.clientY;
  },

  /** 鼠标按下 */
  _onMouseDown(e) {
    const btn = Math.min(e.button, 2);
    this._current[btn] = true;
  },

  /** 鼠标释放 */
  _onMouseUp(e) {
    const btn = Math.min(e.button, 2);
    this._current[btn] = false;
  },

  /** 滚轮 */
  _onWheel(e) {
    this._wheel = e.deltaY > 0 ? -1 : 1;
  },

  /** 初始化 DOM 事件监听 */
  init(target = window) {
    target.addEventListener('mousemove', (e) => this._onMouseMove(e));
    target.addEventListener('mousedown', (e) => this._onMouseDown(e));
    target.addEventListener('mouseup', (e) => this._onMouseUp(e));
    target.addEventListener('wheel', (e) => this._onWheel(e), { passive: true });
    // 触摸也更新位置
    target.addEventListener('touchmove', (e) => {
      if (e.touches[0]) { this._pos.x = e.touches[0].clientX; this._pos.y = e.touches[0].clientY; }
    }, { passive: true });
  },
};

// 自动初始化
if (typeof window !== 'undefined') {
  Keyboard.init();
  Mouse.init();
}

console.log('[engine/input] Keyboard | Mouse — 就绪 (自动初始化)');
