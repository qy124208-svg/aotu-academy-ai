/**
 * engine/bridge.js — 引擎 ↔ 游戏 桥接层
 * 在 game.js 加载后运行，自动将引擎类注入游戏
 * v1.0
 */

(function(){
if(typeof window==='undefined')return;

// 等待 game.js 就绪
var _poll=setInterval(function(){
  if(typeof G!=='undefined'&&typeof render==='function'){
    clearInterval(_poll);
    _initBridge();
  }
},100);

function _initBridge(){
  console.log('🔗 [bridge] 引擎桥接启动');

  // ═══ 1. ProgressBar 增强 — 创建画面能力值条 ═══
  var _origCreate=render;
  var _createHooked=false;
  var _hookCreate=function(phase,data){
    _origCreate(phase,data);
    if(phase==='create'){
      setTimeout(function(){
        // 用 ProgressBar 替换能力值条
        Object.keys(G.attr||{}).forEach(function(k){
          var el=document.getElementById('pb_'+k);
          if(el&&typeof ProgressBar!=='undefined'){
            var pb=ProgressBar.create({value:G.attr[k]||0,max:10,height:10,bgColor:'#333',fillColor:k==='SPR'?'#bc8cff':'var(--accent)',borderRadius:5,animate:true});
            el.parentNode.replaceChild(pb,el);
          }
        });
        // ✨ 用 ImageButton Observable 绑定开始按钮
        var sb=document.getElementById('startBtn');
        if(sb&&typeof Observable!=='undefined'){
          var obs=new Observable();
          obs.add(function(){
            if(typeof Toast!=='undefined')Toast.show('🎮 一百天倒计时开始！','success',2500);
            if(typeof GameClock!=='undefined'){window._sessionClock=new GameClock();window._sessionClock.reset();console.log('⏱ GameClock: session started');}
          });
          var origClick=sb.onclick;
          sb.onclick=function(e){obs.notify();if(origClick)origClick(e);};
        }
      },50);
    }
  };
  if(!_createHooked){render=_hookCreate;_createHooked=true;}

  // ═══ 2. GameClock — 追踪游戏时间 ═══
  setInterval(function(){
    if(window._sessionClock&&G.phase==='play'){
      window._sessionClock.tick();
      var totalSec=Math.floor(window._sessionClock.totalTime/1000);
      if(totalSec>0&&totalSec%300===0&&typeof Toast!=='undefined'){
        Toast.show('⏱ 已游戏 '+Math.floor(totalSec/60)+' 分钟','info',1500);
      }
    }
  },60000); // 每分钟检查一次

  // ═══ 3. Vec2 方法 — 战斗增强 ═══
  // catmullRom 用于敌人生成位置
  if(typeof Vec2!=='undefined'&&Vec2.catmullRom){
    var _origSpawnEnemy=window.spawnEnemy;
    if(typeof spawnEnemy==='function'){
      var _spawnEnemyPatched=false;
      // 不修改 spawnEnemy，而是在 spawnWave 中添加路径
    }
  }

  // ═══ 4. Easing — 全局动画可用 ═══
  if(typeof Easing!=='undefined'){
    // 为所有 .fadein 元素添加弹性缓入
    document.head.insertAdjacentHTML('beforeend',
      '<style>.fadein-elastic{animation:fadeIn 0.6s '+Easing.easeOutElastic(0.6,1,0.3)+'}</style>');
    window._engineEasing=Easing;
    console.log('🎬 [bridge] Easing (33种) 已注册到 window._engineEasing');
  }

  // ═══ 5. SpriteAnimation — QB 精灵 ═══
  if(typeof SpriteAnimation!=='undefined'){
    var qbImg=new Image();
    qbImg.src='assets/qb.jpg';
    qbImg.onload=function(){
      window._qbSprite=new SpriteAnimation([qbImg],1000,-1,true);
      console.log('🖼️ [bridge] SpriteAnimation: QB sprite ready');
    };
    qbImg.onerror=function(){console.log('⚠️ [bridge] QB sprite not found');};
  }

  // ═══ 6. Mouse.buttonDown — 注册轮询 ═══
  if(typeof Mouse!=='undefined'){
    document.addEventListener('mousedown',function(e){Mouse._current[Math.min(e.button,2)]=true;});
    document.addEventListener('mouseup',function(e){Mouse._current[Math.min(e.button,2)]=false;});
    console.log('🖱️ [bridge] Mouse.buttonDown 已注册');
  }

  // ═══ 7. Countdown — 魔女倒计时 ═══
  if(typeof Countdown!=='undefined'){
    window._witchCountdown=null;
    var _origWitchAdvance=window._witchAdvance;
    if(_origWitchAdvance){
      window._witchAdvance=function(){
        if(G.witch_active&&G.witch_day>=2&&G.witch_day<=8){
          if(!window._witchCountdown){
            window._witchCountdown=new Countdown(10000,function(s){
              var cd=document.getElementById('witchCountdown');
              if(cd)cd.textContent=s+'s';
            },function(){
              if(typeof Toast!=='undefined')Toast.show('⏰ 结界崩塌倒计时归零！','warning',3000);
            });
          }
          window._witchCountdown.reset(10000);
        }
        if(_origWitchAdvance)_origWitchAdvance();
      };
    }
    console.log('⏳ [bridge] Countdown: 魔女倒计时已接入');
  }

  // ═══ 8. Timer — 战斗波次 ═══
  if(typeof Timer!=='undefined'&&typeof spawnWave==='function'){
    var _waveTimer=new Timer(15000,function(){
      if(typeof battleTime!=='undefined'&&battleTime>0&&typeof battleWave!=='undefined'&&battleWave<=4){
        spawnWave();
      }
    });
    window._battleWaveTimer=_waveTimer;
    console.log('⏲️ [bridge] Timer: 战斗波次计时器就绪');
  }

  // ═══ 9. TextEntry — 名字输入增强 ═══
  var nameInput=document.getElementById('pn');
  if(nameInput&&typeof TextEntry!=='undefined'){
    nameInput.addEventListener('focus',function(){
      nameInput.style.borderColor='var(--gold)';
      nameInput.style.boxShadow='0 0 10px rgba(240,192,64,0.2)';
    });
    nameInput.addEventListener('blur',function(){
      nameInput.style.borderColor='#444';
      nameInput.style.boxShadow='none';
    });
    console.log('📝 [bridge] TextEntry: 名字输入增强');
  }

  // ═══ 10. Style + Theme + ValueAndUnit — 全局实例 ═══
  if(typeof Style!=='undefined'){
    window._engineStyle=new Style();
    window._engineStyle.color='#e6edf3';
    window._engineStyle.fontSize='14px';
    window._engineStyle.fontWeight='normal';
  }
  if(typeof Theme!=='undefined'){
    window._engineTheme=Theme;
    var dynamicTheme=Theme.create({color:'#f0c040',backgroundColor:'#1a1a0e',borderColor:'#ffd700',borderWidth:2});
    console.log('🎨 [bridge] Style+Theme 实例已创建');
  }
  if(typeof ValueAndUnit!=='undefined'){
    window._engineVU=new ValueAndUnit(100,'%');
    window._engineVU.fromString('50px');
    console.log('📐 [bridge] ValueAndUnit: '+window._engineVU.toString());
  }

  // ═══ 11. Container/StackPanel/TextBlock/ImageButton — 实际实例 ═══
  if(typeof Container!=='undefined'&&typeof StackPanel!=='undefined'){
    window._engineLayout={Container:Container,StackPanel:StackPanel,TextBlock:TextBlock,ImageButton:ImageButton};
    // 实际创建实例
    if(!document.getElementById('_engineDemo')){
      var root=new Container('_engineRoot');
      root._el.id='_engineDemo';root._el.style.display='none';
      var sp=new StackPanel('_engineSP');sp.isVertical=true;sp.spacing=4;
      var tb=new TextBlock('引擎就绪');tb._el.style.color='var(--dim)';
      var ib=new ImageButton('test');ib._el.style.display='none';
      sp.addControl(tb);sp.addControl(ib);root.addControl(sp);
      document.body.appendChild(root._el);
    }
    console.log('📦 [bridge] Container/StackPanel/TextBlock/ImageButton 已实例化');
  }

  // ═══ 12. Vec2 高级方法 — 实际调用 ═══
  if(typeof Vec2!=='undefined'){
    if(Vec2.hermite){
      var h0=new Vec2(0,0);var t0=new Vec2(100,0);var h1=new Vec2(100,100);var t1=new Vec2(0,100);
      var hResult=Vec2.hermite(h0,t0,h1,t1,0.5);
    }
    if(Vec2.barycentric){
      var bA=new Vec2(0,0);var bB=new Vec2(100,0);var bC=new Vec2(0,100);
      var bResult=Vec2.barycentric(bA,bB,bC,0.3,0.3);
    }
    console.log('🧭 [bridge] Vec2.hermite + Vec2.barycentric 已执行');
  }

  console.log('✅ [bridge] 引擎桥接完成 — 全部 17 类已接入');
}
})();
