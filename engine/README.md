# engine/ — 凹凸转学记 游戏引擎模块

## 移植来源
`game-master/` — 完整 Java 2D 游戏引擎 (~8600行 Java) → JavaScript 概念移植

### 源文件对应关系

| Java 源文件 | 行数 | → | JS 目标模块 | 移植内容 |
|------------|------|---|-----------|---------|
| `GameTime.java` | 144 | → | `timer.js` | GameClock (delta+暂停恢复) |
| `Vector2.java` | 995 | → | `vec2d.js` | Vec2 + CatmullRom/Hermite/Barycentric/SmoothStep |
| `MathHelper.java` | 191 | → | `timer.js`/`vec2d.js` | clamp/lerp/smoothStep/random |
| `KeyboardInput.java` | 119 | → | `input.js` | Keyboard (keyDown/keyDownOnce 轮询) |
| `MouseInput.java` | 189 | → | `input.js` | Mouse (buttonDown/buttonDownOnce/位置) |
| 11× ease/*.java | 377 | → | `animation.js` | Easing (33个缓动函数) |
| `Game.java` | 340 | → | *(架构参考)* | 游戏主循环模式 |
| `Menu/MenuBar/MenuItem` | 550 | → | *(待移植)* | 下拉菜单系统 |
| `Rectangle.java` | 500 | → | *(已有)* | DOM getBoundingClientRect 替代 |
| `Matrix/Quaternion` | 2850 | → | *(3D不适用)* | 2D游戏不需要 |

## 模块说明

| 文件 | 功能 | 来源 |
|------|------|------|
| `timer.js` | Timer / Cooldown / Countdown / **GameClock** | GameTime.java |
| `vec2d.js` | Vec2 + **CatmullRom** + **Hermite** + **Barycentric** | Vector2.java |
| `animation.js` | SpriteAnimation / ParticleSystem / ScreenShake / **Easing(33种)** | ease/*.java |
| `input.js` | **Keyboard** / **Mouse** (keyDownOnce/buttonDownOnce) | KeyboardInput + MouseInput |
| `widgets.js` | Toast / Dialog / TextEntry / ProgressBar / FloatingText | 原创(无Java对应) |

## 视觉风格

所有视觉元素采用**程序化生成**，使用 Canvas 2D API 绘制，颜色自动匹配游戏 CSS 变量。
**不使用外部图片素材** — 特效与游戏主题完全一致。
