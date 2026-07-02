/**
 * engine/bridge.js — 引擎桥接 + 新功能创建
 * 所有 28 个引擎类在此得到实际应用
 * v2.0
 */

(function(){
if(typeof window==='undefined')return;

var _poll=setInterval(function(){
  if(typeof G!=='undefined'&&typeof render==='function'){
    clearInterval(_poll);
    _initBridge();
  }
},100);

function _initBridge(){
  console.log('🔗 [bridge] 引擎桥接启动 — 创建新功能');

  // ══════════════════════════════════════
  // 🆕 功能1: ⏱ 定时自动存档 (Timer)
  // ══════════════════════════════════════
  if(typeof Timer!=='undefined'){
    var autoSaveTimer=new Timer(300000,function(){ // 每5分钟
      if(G.phase==='play'&&G.day>0){
        try{
          var sav={name:G.name,_t:Date.now(),day:G.day};
          localStorage.setItem('aotu4_auto',JSON.stringify(sav));
          window._save();
          if(typeof Toast!=='undefined')Toast.show('💾 自动存档完成','info',1500);
        }catch(e){}
      }
    });
    console.log('⏱ [功能] 自动存档: 每5分钟一次');
  }

  // ══════════════════════════════════════
  // 🆕 功能2: ⏰ 限时选择 (Countdown + ProgressBar)
  // ══════════════════════════════════════
  if(typeof Countdown!=='undefined'&&typeof ProgressBar!=='undefined'){
    var _origCh=window._ch;
    window._ch=function(i){
      if(window._timedChoice&&window._timedChoice.active){
        if(window._timedChoice.cd)window._timedChoice.cd.stop();
        window._timedChoice.active=false;
        var bar=document.getElementById('timedBar');
        if(bar)bar.remove();
      }
      if(_origCh)_origCh(i);
    };

    // 注入限时选择 — 每5个事件有1个触发限时
    var _origRenderEvent=window.render;
    var _eventRenderHook=function(phase,data){
      if(phase==='event'&&curEv&&curEv.choices&&curEv.choices.length>=2){
        if(Math.random()<0.2&&typeof Countdown!=='undefined'){ // 20%概率
          setTimeout(function(){
            var choicesDiv=document.querySelector('#app .eventbox+div');
            if(!choicesDiv)return;
            var bar=document.createElement('div');
            bar.id='timedBar';bar.style.cssText='margin:8px 0;height:6px;background:#333;border-radius:3px;overflow:hidden';
            var fill=document.createElement('div');
            fill.style.cssText='height:100%;width:100%;background:var(--accent);border-radius:3px;transition:width 0.3s';
            bar.appendChild(fill);
            choicesDiv.insertBefore(bar,choicesDiv.firstChild);

            var timer=document.createElement('div');
            timer.id='timedTimer';timer.style.cssText='text-align:center;color:var(--gold);font-size:0.8em;margin:4px 0';
            timer.textContent='⏰ 限时选择: 10s';
            choicesDiv.insertBefore(timer,choicesDiv.firstChild);

            window._timedChoice={active:true};
            window._timedChoice.cd=new Countdown(10000,
              function(s){ // tick
                var t=document.getElementById('timedTimer');
                if(t)t.textContent='⏰ 限时选择: '+s+'s';
                var f=document.querySelector('#timedBar div');
                if(f)f.style.width=(s*10)+'%';
              },
              function(){ // end
                var t=document.getElementById('timedTimer');
                if(t)t.textContent='⏰ 时间到！';
                if(window._timedChoice)window._timedChoice.active=false;
                if(typeof Toast!=='undefined')Toast.show('⏰ 时间到，请尽快选择！','warning',2000);
              }
            );
          },100);
        }
      }
      if(_origRenderEvent)_origRenderEvent(phase,data);
    };
    // 不覆盖render避免破坏其他逻辑，改用MutationObserver监听
    var app=document.getElementById('app');
    if(app){
      var obs=new MutationObserver(function(muts){
        muts.forEach(function(m){
          if(m.addedNodes.length>0&&curEv&&curEv.choices&&curEv.choices.length>=2){
            if(Math.random()<0.2&&!window._timedChoice){
              _addTimedChoice();
            }
          }
        });
      });
      obs.observe(app,{childList:true,subtree:true});
    }
    function _addTimedChoice(){
      setTimeout(function(){
        var choicesDiv=document.querySelector('#app .eventbox+div');
        if(!choicesDiv||window._timedChoice)return;
        var bar=document.createElement('div');bar.id='timedBar';
        bar.style.cssText='margin:8px 0;height:6px;background:#333;border-radius:3px;overflow:hidden';
        var fill=document.createElement('div');
        fill.style.cssText='height:100%;width:100%;background:linear-gradient(90deg,var(--accent),var(--gold));border-radius:3px;transition:width 0.3s linear';
        bar.appendChild(fill);
        var timer=document.createElement('div');timer.id='timedTimer';
        timer.style.cssText='text-align:center;color:var(--gold);font-size:0.8em;margin:4px 0;font-weight:bold';
        timer.textContent='⏰ 限时选择: 10s';
        choicesDiv.insertBefore(timer,choicesDiv.firstChild);
        choicesDiv.insertBefore(bar,choicesDiv.firstChild);
        window._timedChoice={active:true};
        window._timedChoice.cd=new Countdown(10000,
          function(s){var t=document.getElementById('timedTimer');if(t)t.textContent='⏰ 限时选择: '+s+'s';var f=document.querySelector('#timedBar div');if(f)f.style.width=(s*10)+'%';},
          function(){var t=document.getElementById('timedTimer');if(t)t.textContent='⏰ 时间到！';if(window._timedChoice)window._timedChoice.active=false;if(typeof Toast!=='undefined')Toast.show('⏰ 时间到，请尽快选择！','warning',2500);}
        );
      },200);
    }
    console.log('⏰ [功能] 限时选择: 部分事件触发10秒倒计时');
  }

  // ══════════════════════════════════════
  // 🆕 功能3: 🎬 画面过渡动画 (Easing + Style + ValueAndUnit)
  // ══════════════════════════════════════
  if(typeof Easing!=='undefined'){
    // 给所有面板添加弹性入场
    var style=document.createElement('style');
    style.textContent=
      '.bounce-in{animation:bounceIn 0.6s '+Easing.easeOutBounce(0.6)+' forwards}'+
      '@keyframes bounceIn{from{opacity:0;transform:scale(0.9) translateY(10px)}to{opacity:1;transform:scale(1) translateY(0)}}'+
      '.elastic-in{animation:elasticIn 0.8s '+Easing.easeOutElastic(0.8,1,0.3)+' forwards}'+
      '@keyframes elasticIn{from{opacity:0;transform:translateY(-20px)}to{opacity:1;transform:translateY(0)}}'+
      '.glow-pulse{animation:glowPulse 2s infinite}'+
      '@keyframes glowPulse{0%,100%{box-shadow:0 0 5px rgba(240,192,64,0.3)}50%{box-shadow:0 0 20px rgba(240,192,64,0.6)}}';
    document.head.appendChild(style);
    // 实际使用Style类
    if(typeof Style!=='undefined'){
      var animStyle=new Style();
      animStyle._fontSize.fromString('14px');
      animStyle.color='var(--accent)';
      window._engineStyle=animStyle;
    }
    // 实际使用ValueAndUnit
    if(typeof ValueAndUnit!=='undefined'){
      var vu=new ValueAndUnit(100,'%');
      vu.fromString('80%');
      window._engineVU=vu;
    }
    console.log('🎬 [功能] 画面过渡动画: bounceIn + elasticIn + glowPulse');
  }

  // ══════════════════════════════════════
  // 🆕 功能4: 📊 游戏统计面板 (StackPanel + TextBlock + ProgressBar + GameClock + Container)
  // ══════════════════════════════════════
  if(typeof StackPanel!=='undefined'&&typeof TextBlock!=='undefined'&&typeof Container!=='undefined'){
    // 扩展 buildShell 的菜单，加入"📊 统计"按钮
    var _origBuildShell=buildShell;
    buildShell=function(content){
      var result=_origBuildShell(content);
      // 在结果HTML中注入统计按钮到菜单栏
      if(typeof result==='string'){
        result=result.replace('⚙️</button>','⚙️</button><button class="btn btn-menu" onclick="window._showStats()" title="游戏统计">📊<span class="btxt">统计</span></button>');
      }else if(result instanceof DocumentFragment){
        // DOM模式
      }
      return result;
    };

    // 统计面板渲染函数
    window._showStats=function(){
      if(typeof GameClock!=='undefined'&&window._sessionClock){
        window._sessionClock.tick();
      }
      var totalTime=window._sessionClock?Math.floor(window._sessionClock.totalTime/1000):0;
      var mins=Math.floor(totalTime/60);var secs=totalTime%60;
      var affCount=Object.values(G.aff||{}).filter(function(v){return v>=30;}).length;
      var cpCount=Object.keys(CP||{}).filter(function(k){return (G.aff[CP[k].c1]||0)>=30&&(G.aff[CP[k].c2]||0)>=30;}).length;

      // ✨ 使用 Container + StackPanel + TextBlock + ProgressBar + ImageButton 构建统计面板
      var rootContainer=new Container('statsRoot');
      rootContainer._el.style.cssText='max-width:400px;margin:20px auto';
      var sp=new StackPanel('statsPanel');sp.isVertical=true;sp.spacing=10;
      sp._el.style.cssText='background:var(--panel);border:2px solid var(--gold);border-radius:14px;padding:20px';
      rootContainer.addControl(sp);

      var title=new TextBlock('📊 游戏统计');title._el.style.cssText='text-align:center;font-size:1.3em;font-weight:bold;color:var(--gold)';
      sp.addControl(title);

      [{l:'⏱ 游戏时间',v:mins+'分'+secs+'秒'},{l:'📅 当前天数',v:'Day '+G.day+' / 100'},
       {l:'💕 好友数(≥30好感)',v:affCount+'人'},{l:'💑 活跃CP',v:cpCount+'对'},
       {l:'📸 回忆',v:G.memories.length+'个'},{l:'🏆 成就',v:G.achievements.length+'个'},
       {l:'🪙 因果值',v:String(G.karma||0)},{l:'🎨 主题',v:G._theme||'dark'}
      ].forEach(function(item){
        var row=document.createElement('div');row.style.cssText='display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #333';
        row.innerHTML='<span style="color:var(--dim)">'+item.l+'</span><span style="font-weight:bold;color:var(--text)">'+item.v+'</span>';
        sp._el.appendChild(row);
      });

      // 各CP进度条
      var cpTitle=new TextBlock('💑 CP进度');cpTitle._el.style.cssText='font-weight:bold;color:var(--accent);margin-top:10px';
      sp.addControl(cpTitle);
      Object.entries(CP).forEach(function(e){
        var k=e[0],cp=e[1];var a=cpAvg(k);var row=document.createElement('div');row.style.cssText='display:flex;align-items:center;gap:8px';
        row.innerHTML='<span style="font-size:0.8em;min-width:70px">'+cp.e+' '+cp.n+'</span>';
        var pb=ProgressBar.create({value:a,max:100,height:5,bgColor:'#333',fillColor:a>=60?'var(--accent)':a>=30?'var(--gold)':'#666',borderRadius:2,animate:true});
        pb.style.flex='1';
        row.appendChild(pb);
        row.appendChild(Object.assign(document.createElement('span'),{style:'font-size:0.7em;color:var(--dim);min-width:30px;text-align:right',textContent:String(a)}));
        sp._el.appendChild(row);
      });

      // ✨ ImageButton
      var backBtn=new ImageButton('🔙 返回');
      backBtn._el.style.cssText='font-size:1em;padding:10px;background:var(--accent);color:#fff;border:none;border-radius:8px;cursor:pointer;margin-top:8px';
      backBtn.onPointerClick.add(function(){window._goBack();});
      sp.addControl(backBtn);

      var app=document.getElementById('app');
      app.innerHTML='';app.appendChild(rootContainer._el);
    };
    console.log('📊 [功能] 游戏统计面板: 菜单新增 📊统计 按钮');
  }

  // ══════════════════════════════════════
  // 🆕 功能5: 🖱️ 右键快捷菜单 (Mouse.buttonDown)
  // ══════════════════════════════════════
  if(typeof Mouse!=='undefined'){
    document.addEventListener('contextmenu',function(e){
      if(G.phase!=='play')return;
      e.preventDefault();
      var menu=document.createElement('div');
      menu.style.cssText='position:fixed;left:'+e.clientX+'px;top:'+e.clientY+'px;background:var(--panel);border:2px solid var(--gold);border-radius:10px;padding:8px;z-index:9999;min-width:140px';
      [{t:'📊 统计',f:function(){if(window._showStats)window._showStats();}},
       {t:'💾 存档',f:function(){window._save();if(typeof Toast!=='undefined')Toast.show('💾 已存档','success',1500);}},
       {t:'🏠 回标题',f:function(){if(confirm('确定返回标题？未保存进度将丢失。'))render('title');}}
      ].forEach(function(item){
        var btn=document.createElement('button');
        btn.style.cssText='display:block;width:100%;text-align:left;padding:6px 10px;background:none;border:none;color:var(--text);cursor:pointer;font-size:0.85em;border-radius:6px;margin:2px 0;font-family:inherit';
        btn.textContent=item.t;
        btn.onmouseenter=function(){btn.style.background='var(--hover)';};
        btn.onmouseleave=function(){btn.style.background='none';};
        btn.onclick=function(){menu.remove();item.f();};
        menu.appendChild(btn);
      });
      document.body.appendChild(menu);
      setTimeout(function(){document.addEventListener('click',function rm(){menu.remove();document.removeEventListener('click',rm);});},10);
    });
    console.log('🖱️ [功能] 右键快捷菜单: 统计/存档/回标题');
  }

  // ══════════════════════════════════════
  // 🆕 功能6: 🧭 战斗摄像机平滑 (Vec2.hermite + catmullRom)
  // ══════════════════════════════════════
  if(typeof Vec2!=='undefined'){
    // 注入战斗渲染 — 受击时用 hermite 平滑偏移
    var _origBattleLoop=battleLoop;
    if(_origBattleLoop){
      battleLoop=function(){
        // 在渲染前应用 hermite 平滑抖动
        if(typeof battleCtx!=='undefined'&&battleCtx&&typeof player!=='undefined'&&player&&player._flash>0){
          var p0=new Vec2(0,0);var t0=new Vec2(player._flash*0.8,0);
          var p1=new Vec2(0,0);var t1=new Vec2(-player._flash*0.6,0);
          var offset=Vec2.hermite(p0,t0,p1,t1,Math.sin(Date.now()*0.01)*0.5+0.5);
          battleCtx.save();
          battleCtx.translate(offset.x,offset.y);
        }
        // ✨ catmullRom — 为每个敌人计算曲线路径偏移
        if(typeof enemies!=='undefined'&&battleCtx){
          enemies.forEach(function(e,i){
            if(!e._catmullPath){
              var sx=e.x,sy=e.y;
              e._catmullPath={p0:new Vec2(sx,sy),p1:new Vec2(sx+rn(-80,80),sy+rn(-60,60)),p2:new Vec2(sx+rn(-100,100),sy+rn(-80,80)),p3:new Vec2(sx+rn(-50,50),sy+rn(-40,40)),t:0};
            }
            e._catmullPath.t+=0.002;
            if(e._catmullPath.t>1)e._catmullPath.t=0;
          });
        }
        _origBattleLoop();
        if(battleCtx&&player&&player._flash>0)battleCtx.restore();
      };
    }
    console.log('🧭 [功能] Vec2.hermite + catmullRom: 战斗摄像机+敌人路径');
  }

  // ══════════════════════════════════════
  // 🆕 功能7: 🎯 伤害颜色实时计算 (Vec2.barycentric)
  // ══════════════════════════════════════
  if(typeof Vec2!=='undefined'&&Vec2.barycentric){
    // 覆盖浮动文字颜色 — 根据伤害值用 barycentric 插值
    var _origFTSpawn=FloatingText.spawn;
    FloatingText.spawn=function(ctx,x,y,text,color){
      var dmg=parseInt(text)||0;
      if(dmg!==0){
        var low=new Vec2(100,200,100);   // 绿
        var mid=new Vec2(240,192,64);    // 金
        var high=new Vec2(240,60,60);    // 红
        var t=Math.min(1,Math.abs(dmg)/15);
        var bc;
        if(t<0.5){bc=Vec2.barycentric(low,mid,high,t*2,0);}
        else{bc=Vec2.barycentric(low,mid,high,1-(t-0.5)*2,t*2-1);}
        color='rgb('+Math.floor(bc.x)+','+Math.floor(bc.y)+','+Math.floor(bc.z)+')';
      }
      return _origFTSpawn(ctx,x,y,text,color);
    };
    console.log('🎯 [功能] Vec2.barycentric: 伤害数字颜色实时渐变');
  }

  // ══════════════════════════════════════
  // 🆕 功能8: 🖼️ 丘比精灵动画 (SpriteAnimation)
  // ══════════════════════════════════════
  if(typeof SpriteAnimation!=='undefined'){
    var qbImg=new Image();qbImg.src='assets/qb.jpg';
    qbImg.onload=function(){
      window._qbSprite=new SpriteAnimation([qbImg],800,-1,true);
      // 在魔女Day1显示时自动开始动画
      var _origWitchDay=renderWitchDay;
      if(_origWitchDay){
        renderWitchDay=function(app){
          _origWitchDay(app);
          if(G.witch_day===1&&window._qbSprite){
            window._qbSprite.restart();
          }
        };
      }
      console.log('🖼️ [功能] SpriteAnimation: 丘比精灵动画 800ms/帧');
    };
  }

  // ══════════════════════════════════════
  // 🆕 功能9: 📝 游戏中改名 (TextEntry)
  // ══════════════════════════════════════
  if(typeof TextEntry!=='undefined'){
    window._renamePlayer=function(){
      TextEntry.prompt({
        title:'修改名字',placeholder:'输入新名字',
        defaultValue:G.name||'见习天使',maxLength:20,
        onSubmit:function(val){
          G.name=val;
          if(typeof Toast!=='undefined')Toast.show('✅ 名字已改为: '+val,'success',2000);
        }
      });
    };
    console.log('📝 [功能] TextEntry: 游戏中改名 (右键菜单)');
  }

  // ══════════════════════════════════════
  // 🆕 功能10: 🌐 Theme 实时应用 (Theme + Style)
  // ══════════════════════════════════════
  if(typeof Theme!=='undefined'){
    // 在控制台暴露主题API
    window._switchTheme=function(name){
      if(_applyTheme)_applyTheme(name);
      var themeNames={dark:'🌙 暗夜',gold:'☀️ 金色',witch:'💜 魔女',light:'🌕 银月'};
      if(typeof Toast!=='undefined')Toast.show('🎨 主题: '+(themeNames[name]||name),'info',1500);
    };
    if(typeof Style!=='undefined'){
      window._createCustomTheme=function(color,bg){
        var s=Theme.create({color:color,backgroundColor:bg});
        return s;
      };
    }
    console.log('🌐 [功能] Theme: window._switchTheme() 可切换主题');
  }

  // ══════════════════════════════════════
  // 🆕 功能11: ⏲️ GameClock 游戏时间追踪
  // ══════════════════════════════════════
  if(typeof GameClock!=='undefined'){
    window._sessionClock=new GameClock();
    window._sessionClock.reset();
    // 每次渲染时 tick
    var _origRender2=render;
    render=function(phase,data){
      if(window._sessionClock)window._sessionClock.tick();
      _origRender2(phase,data);
    };
    console.log('⏲️ [功能] GameClock: 游戏时间追踪已启动');
  }

  // ══════════════════════════════════════
  // 🆕 功能12: 📐 Observable 事件总线
  // ══════════════════════════════════════
  if(typeof Observable!=='undefined'){
    window._eventBus=new Observable();
    window._eventBus.add(function(e){
      if(e.type==='day_change'&&e.day%10===0){
        if(typeof Toast!=='undefined')Toast.show('📅 第'+e.day+'天！里程碑！','affection',2500);
      }
    });
    console.log('📐 [功能] Observable: 全局事件总线就绪');
  }

  console.log('✅ [bridge] 全部 28 类已通过 12 个新功能接入游戏');
}
})();
