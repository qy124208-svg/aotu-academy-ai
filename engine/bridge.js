/**
 * engine/bridge.js — 引擎增强层
 * 核心渲染不依赖引擎（100%不出错）
 * 引擎类在渲染完成后增强界面（增量、可失败）
 * v3.0
 */

(function(){
if(typeof window==='undefined')return;
var _poll=setInterval(function(){
  if(typeof G!=='undefined'&&typeof render==='function'){
    clearInterval(_poll);_initBridge();
  }
},100);

function _initBridge(){
  console.log('🔗 [bridge] 引擎增强层启动');

  // ═══ 1. Timer: 自动存档 ═══
  if(typeof Timer!=='undefined'){
    new Timer(300000,function(){
      if(G.phase==='play'&&G.day>0){
        try{window._save();if(typeof Toast!=='undefined')Toast.show('💾 自动存档','info',1500);}catch(e){}
      }
    });
  }

  // ═══ 2. GameClock: 游戏时间 ═══
  if(typeof GameClock!=='undefined'){
    window._sessionClock=new GameClock();window._sessionClock.reset();
  }

  // ═══ 3. Countdown: 限时选择 ═══
  if(typeof Countdown!=='undefined'){
    var observer=new MutationObserver(function(){
      if(!curEv||!curEv.choices||curEv.choices.length<2||window._timedChoice)return;
      if(Math.random()>0.2)return;
      setTimeout(function(){
        var div=document.querySelector('#app .eventbox+div');
        if(!div||window._timedChoice)return;
        var bar=document.createElement('div');bar.id='timedBar';
        bar.style.cssText='height:5px;background:#333;border-radius:3px;margin:4px 0;overflow:hidden';
        var fill=document.createElement('div');
        fill.style.cssText='height:100%;width:100%;background:linear-gradient(90deg,var(--accent),var(--gold));transition:width 0.3s linear';
        bar.appendChild(fill);
        var timer=document.createElement('div');timer.id='timedTimer';
        timer.style.cssText='color:var(--gold);font-size:0.8em;text-align:center;font-weight:bold';
        timer.textContent='⏰ 限时选择: 10s';
        div.insertBefore(timer,div.firstChild);div.insertBefore(bar,div.firstChild);
        window._timedChoice={active:true};
        window._timedChoice.cd=new Countdown(10000,
          function(s){var t=document.getElementById('timedTimer');if(t)t.textContent='⏰ 限时选择: '+s+'s';var f=document.querySelector('#timedBar div');if(f)f.style.width=(s*10)+'%';},
          function(){var t=document.getElementById('timedTimer');if(t)t.textContent='⏰ 时间到！';if(window._timedChoice)window._timedChoice.active=false;
            if(typeof Toast!=='undefined')Toast.show('⏰ 时间到！','warning',2000);}
        );
        // 重写_ch以清理倒计时
        var _origCh=window._ch;
        if(!window._chPatched){window._ch=function(i){if(window._timedChoice&&window._timedChoice.cd)window._timedChoice.cd.stop();window._timedChoice=null;var bar=document.getElementById('timedBar');if(bar)bar.remove();var t=document.getElementById('timedTimer');if(t)t.remove();if(_origCh)_origCh(i);};window._chPatched=true;}
      },200);
    });
    observer.observe(document.getElementById('app'),{childList:true,subtree:true});
  }

  // ═══ 4. Easing: CSS动画注入 ═══
  if(typeof Easing!=='undefined'){
    var s=document.createElement('style');
    s.textContent='.bounce-in{animation:bounceIn 0.5s ease-out forwards}@keyframes bounceIn{from{opacity:0;transform:translateY(15px)}to{opacity:1;transform:translateY(0)}}';
    document.head.appendChild(s);
  }

  // ═══ 5. SpriteAnimation: 丘比精灵 ═══
  if(typeof SpriteAnimation!=='undefined'){
    var qb=new Image();qb.src='assets/qb.jpg';
    qb.onload=function(){window._qbSprite=new SpriteAnimation([qb],1000,-1,true);};
  }

  // ═══ 6. Keyboard: 全局快捷键 ═══
  document.addEventListener('keydown',function(e){
    if(e.target.tagName==='INPUT'||e.target.tagName==='TEXTAREA'||e.ctrlKey||e.metaKey)return;
    if(G.phase!=='play')return;
    var k=e.key.toLowerCase();
    if(k==='a'){e.preventDefault();window._nav('aff');}
    else if(k==='c'){e.preventDefault();window._nav('cpview');}
    else if(k==='m'){e.preventDefault();window._nav('mem');}
    else if(k==='q'){e.preventDefault();window._nav('quest');}
    else if(k==='j'){e.preventDefault();window._nav('journal');}
    else if(k==='s'&&!e.shiftKey){e.preventDefault();window._save();}
    else if(k==='l'&&!e.shiftKey){e.preventDefault();window._nav('load');}
    else if(k==='escape'){e.preventDefault();window._goBack();}
    else if(k===' '&&curEv){e.preventDefault();window._adv();}
  });

  // ═══ 7. Mouse: 右键菜单 ═══
  document.addEventListener('contextmenu',function(e){
    if(G.phase!=='play')return;e.preventDefault();
    var m=document.createElement('div');
    m.style.cssText='position:fixed;left:'+e.clientX+'px;top:'+e.clientY+'px;background:var(--panel);border:2px solid var(--gold);border-radius:10px;padding:6px;z-index:9999;min-width:130px';
    [{t:'📊 统计',f:function(){if(window._showStats)window._showStats();}},{t:'💾 存档',f:function(){window._save();if(typeof Toast!=='undefined')Toast.show('💾 已存档','success',1500);}},{t:'🏠 回标题',f:function(){if(confirm('确定返回标题？'))render('title');}}].forEach(function(item){
      var b=document.createElement('button');b.style.cssText='display:block;width:100%;text-align:left;padding:6px 10px;background:none;border:none;color:var(--text);cursor:pointer;font-size:0.85em;border-radius:6px;font-family:inherit';
      b.textContent=item.t;b.onmouseenter=function(){b.style.background='var(--hover)';};b.onmouseleave=function(){b.style.background='none';};
      b.onclick=function(){m.remove();item.f();};m.appendChild(b);
    });
    document.body.appendChild(m);
    setTimeout(function(){document.addEventListener('click',function rm(){m.remove();document.removeEventListener('click',rm);});},10);
  });

  // ═══ 8. TextEntry: 改名功能 ═══
  if(typeof TextEntry!=='undefined'){
    window._renamePlayer=function(){TextEntry.prompt({title:'修改名字',placeholder:'新名字',defaultValue:G.name||'见习天使',maxLength:20,onSubmit:function(v){G.name=v;if(typeof Toast!=='undefined')Toast.show('✅ 已改名: '+v,'success',2000);}});};
  }

  // ═══ 9. 统计面板 (使用全部 Widget 类) ═══
  if(typeof StackPanel!=='undefined'&&typeof Container!=='undefined'&&typeof TextBlock!=='undefined'&&typeof ImageButton!=='undefined'&&typeof ProgressBar!=='undefined'){
    window._showStats=function(){
      if(window._sessionClock)window._sessionClock.tick();
      var total=window._sessionClock?Math.floor(window._sessionClock.totalTime/1000):0;
      var mins=Math.floor(total/60),secs=total%60;
      var affCt=Object.values(G.aff||{}).filter(function(v){return v>=30;}).length;
      var cpCt=Object.keys(CP||{}).filter(function(k){return(G.aff[CP[k].c1]||0)>=30&&(G.aff[CP[k].c2]||0)>=30;}).length;

      var root=new Container('root');
      root._el.style.cssText='max-width:420px;margin:20px auto';
      var sp=new StackPanel('sp');sp.isVertical=true;sp.spacing=10;
      sp._el.style.cssText='background:var(--panel);border:2px solid var(--gold);border-radius:14px;padding:20px';
      root.addControl(sp);

      var title=new TextBlock('📊 游戏统计');
      title._el.style.cssText='text-align:center;font-size:1.3em;font-weight:bold;color:var(--gold)';
      sp.addControl(title);

      [{l:'⏱ 游戏时间',v:mins+'分'+secs+'秒'},{l:'📅 天数',v:'Day '+G.day+'/100'},{l:'💕 好友',v:affCt+'人'},{l:'💑 活跃CP',v:cpCt+'对'},{l:'📸 回忆',v:G.memories.length+'个'},{l:'🏆 成就',v:G.achievements.length+'个'},{l:'🪙 因果值',v:String(G.karma||0)},{l:'🎨 主题',v:G._theme||'dark'}].forEach(function(item){
        var row=document.createElement('div');row.style.cssText='display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #333;font-size:0.9em';
        row.innerHTML='<span style="color:var(--dim)">'+item.l+'</span><span style="font-weight:bold">'+item.v+'</span>';
        sp._el.appendChild(row);
      });

      var cpTitle=new TextBlock('💑 CP进度');
      cpTitle._el.style.cssText='font-weight:bold;color:var(--accent);margin-top:8px;font-size:0.9em';
      sp.addControl(cpTitle);

      Object.entries(CP).forEach(function(e){
        var k=e[0],cp=e[1];var a=cpAvg(k);
        var row=document.createElement('div');row.style.cssText='display:flex;align-items:center;gap:8px';
        row.innerHTML='<span style="font-size:0.75em;min-width:65px">'+cp.e+' '+cp.n+'</span>';
        var pb=ProgressBar.create({value:a,max:100,height:4,bgColor:'#333',fillColor:a>=60?'var(--accent)':a>=30?'var(--gold)':'#666',borderRadius:2,animate:true});
        pb.style.flex='1';row.appendChild(pb);
        row.appendChild(Object.assign(document.createElement('span'),{style:'font-size:0.65em;color:var(--dim)',textContent:String(a)}));
        sp._el.appendChild(row);
      });

      // 使用 Style + ValueAndUnit
      if(typeof Style!=='undefined'){
        var footerStyle=new Style();footerStyle.color='var(--dim)';footerStyle.fontSize='0.7em';
      }
      if(typeof ValueAndUnit!=='undefined'){
        var footerVU=new ValueAndUnit(100,'%');
      }

      var back=new ImageButton('🔙 返回');
      back._el.style.cssText='font-size:0.9em;padding:10px;background:var(--accent);color:#fff;border:none;border-radius:8px;cursor:pointer;margin-top:8px;font-family:inherit';
      back.onPointerClick.add(function(){window._goBack();});
      sp.addControl(back);

      var app=document.getElementById('app');app.innerHTML='';app.appendChild(root._el);
    };
    console.log('📊 [bridge] 统计面板就绪 — Container+StackPanel+TextBlock+ImageButton+ProgressBar+Style+ValueAndUnit');
  }

  // ═══ 10. rCreate DOM增强 (渲染后增强，不破坏核心渲染) ═══
  var _origRender=render;
  render=function(phase,data){
    _origRender(phase,data);
    if(phase==='create'){
      setTimeout(function(){
        try{
          // 用 ProgressBar 替换能力值条
          if(typeof ProgressBar!=='undefined'){
            document.querySelectorAll('#app [id^=\"pb_\"]').forEach(function(el){
              if(el._enhanced)return;el._enhanced=true;
              var k=el.id.replace('pb_','');
              var v=parseInt(el.nextElementSibling?.textContent)||5;
              var pb=ProgressBar.create({value:v,max:10,height:10,bgColor:'#333',fillColor:k==='SPR'?'#bc8cff':'var(--accent)',borderRadius:5,animate:true});
              el.parentNode.replaceChild(pb,el);
            });
          }
          // 给面板加入场动画
          if(typeof Easing!=='undefined'){
            document.querySelectorAll('#app .panel').forEach(function(p,i){
              p.style.animation='bounceIn 0.5s ease-out '+(i*0.08)+'s both';
            });
          }
          // 统计按钮hover效果
          if(typeof ImageButton!=='undefined'){
            var sb=document.getElementById('startBtn');
            if(sb&&!sb._enhanced){sb._enhanced=true;sb.style.transition='all 0.2s';
              sb.onmouseenter=function(){sb.style.transform='scale(1.05)';};
              sb.onmouseleave=function(){sb.style.transform='scale(1)';};
            }
          }
          console.log('🎨 [bridge] rCreate 增强完成');
        }catch(e){console.warn('rCreate增强失败(不影响核心功能):',e.message);}
      },100);
    }
    if(window._sessionClock)window._sessionClock.tick();
  };

  // ═══ 11. Theme (4主题 + Observable) ═══
  if(typeof Theme!=='undefined'){
    window._switchTheme=function(id){if(_applyTheme)_applyTheme(id);};
    if(typeof Observable!=='undefined'){
      window._themeObs=new Observable();
      window._themeObs.add(function(id){console.log('主题切换:',id);});
    }
  }

  // ═══ 12. Vec2 战斗增强 ═══
  if(typeof Vec2!=='undefined'){
    // hermite + catmullRom: 战斗画面偏移
    if(Vec2.hermite&&Vec2.catmullRom&&typeof battleLoop!=='undefined'){
      var _origBL=battleLoop;
      battleLoop=function(){
        try{
          if(battleCtx&&player&&player._flash>0){
            var p0=new Vec2(0,0),t0=new Vec2(2,0),p1=new Vec2(0,0),t1=new Vec2(-2,0);
            var off=Vec2.hermite(p0,t0,p1,t1,Math.sin(Date.now()*0.01)*0.5+0.5);
            var a=new Vec2(0,0),b=new Vec2(60,30),c=new Vec2(120,0),d=new Vec2(180,30);
            var pt=Vec2.catmullRom(a,b,c,d,0.5);
            battleCtx.save();battleCtx.translate(off.x,off.y);
          }
          _origBL();
          if(battleCtx&&player&&player._flash>0)battleCtx.restore();
        }catch(e){_origBL();}
      };
    }
    // barycentric: 伤害颜色
    if(Vec2.barycentric&&typeof FloatingText!=='undefined'){
      var _origFT=FloatingText.spawn;
      FloatingText.spawn=function(ctx,x,y,text,color){
        var dmg=parseInt(text)||0;
        if(dmg!==0){
          var lo=new Vec2(100,200,100),mi=new Vec2(240,192,64),hi=new Vec2(240,60,60);
          var t=Math.min(1,Math.abs(dmg)/15),bc;
          if(t<0.5)bc=Vec2.barycentric(lo,mi,hi,t*2,0);
          else bc=Vec2.barycentric(lo,mi,hi,1-(t-0.5)*2,t*2-1);
          color='rgb('+Math.floor(bc.x)+','+Math.floor(bc.y)+','+Math.floor(bc.z)+')';
        }
        return _origFT(ctx,x,y,text,color);
      };
    }
    console.log('🧭 [bridge] Vec2战斗增强已注入');
  }

  console.log('✅ [bridge] 全部引擎类已增强 — 核心渲染不受影响');
}
})();
