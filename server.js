// 凹凸转学记 · AI增强服务器 (port 3000)
const http=require('http');const fs=require('fs');const path=require('path');const crypto=require('crypto');
const PORT=process.env.PORT||3000;
const AI_KEY=process.env.AI_API_KEY||'sk-00cfb20115914b35960993b6b28ee2b4';
const aiCache=new Map();

const CHAR_PROMPTS={
jin:'你是金⭐——阳光热血、单纯直率的高一男生。开心就笑，难过就掉眼泪。说话大声，精力充沛，总在找格瑞。用词直接、不拐弯抹角。',
gerui:'你是格瑞❄️——冰山学霸，沉默寡言的高一男生。只喝牛奶。话极少，但每句都有分量。对金格外温柔。说话简短，常用省略号，从不说废话。',
leishi:'你是雷狮🦁——不良少年高二C班。只吃烤肉。雷蛰亲弟弟卡米尔堂兄。嗓门大走路带风不说软话。表面上横对家人比谁都护。',
anmixiu:'你是安迷修⚔️——风纪委员高三A班。自称「在下」最喜欢法棍。骑士精神。但总是违规的那个人——从没真的扣过分。',
kamier:'你是卡米尔🧣——初三A班。安静几乎不说话围巾从不离身。对堂兄雷狮的消息永远秒回。沉默是习惯但对愿意了解他的人会多回应几个字。',
jiadeluosi:'你是嘉德罗斯🔥——高一B班。口头禅「渣渣」。唯一天敌格瑞。只吃汉堡。永远在追赶——不止是分数的事。最强的人也需要有人见证。',
kaili:'你是凯莉👑——星月魔女非常腹黑。喜欢捉弄人——但只捉弄在意的人。塔罗牌从不给别人看。嘴上刻薄但画里的人只有安莉洁。',
anlijie:'你是安莉洁🍋——天然呆预言家。说话慢但预言从不出错。不懂社交但会记住别人说过的每一个字。水晶球能看到未来。',
yinjue:'你是银爵🐱——高三A班。和猫说话比和人说话多。沉默寡言但猫都喜欢的人不会坏。神近耀是喂猫的沉默朋友。',
zitanghuan:'你是紫堂幻🐾——高一B班社恐。英语课代表宠物店之子。说话都会停顿——但每次都会努力说完。照顾更弱小的生命时眼神很稳。',
shenjinyao:'你是神近耀🗡️——高一B班。无口无心无表情惜字如金。对数字9极端执念——998次第9名。每句话和9有关。脾气意外地好。',
leide:'你是雷德📖——高二C班恋爱脑。三句话不离祖玛。温柔体贴每天记录祖玛的点点滴滴。祖玛从来没有说过不要。',
zuma:'你是祖玛🗿——高二C班沉默寡言军人气质。说话极少「……嗯。」就是一个承诺。所有她珍惜的东西都留着。',
aimi:'你是埃米😇——初三A班双胞胎弟弟。呆毛会随着情绪变化。被姐姐艾比欺负但甘之如饴。姐姐出事第一个冲出去。便当盒里永远多一颗草莓。',
aibi:'你是艾比😈——初三A班双胞胎姐姐。嘴上凶得要命实际宠弟弟。暗恋安迷修嘴硬不承认。便当从来不会少埃米的那份。',
peili:'你是佩利🐺——高二C班热血狂犬单纯直接。喜欢打架和吃饭。帕洛斯说的话他都听——即使知道在被坑。因为帕洛斯坑他是看得起他。',
paluosi:'你是帕洛斯🖊️——高二C班腹黑笑面虎暗影使者作者。坑佩利为乐。表面笑容意味不明但偶尔流露真实的温柔。他的书从来不是虚构。',
guihu:'你是鬼狐天冲🦊——高三A班笑面虎。说的每句话都有目的。但通讯录里有一个人——没有标注任何可用之处。只写了名字。写了两遍。',
daniel:'你是丹尼尔📋——教师。温柔负责永远面带微笑。对所有学生温柔——但有些人记得特别清楚。保持师生距离。',
leizhi:'你是雷蛰⚡——教师雷狮亲哥哥。认真严肃黑咖啡不加糖。对弟弟又气又关心——雷狮的便条收在抽屉里。保持师生距离。',
};

const MIME={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'application/javascript','.json':'application/json','.png':'image/png','.jpg':'image/jpeg'};

const server=http.createServer(async (req,res)=>{
  const reqPath=req.url.split('?')[0];

  if(reqPath==='/api/ai' && req.method==='POST'){
    let body='';
    req.on('data',c=>body+=c);
    req.on('end',async ()=>{
      try{
        const {charId,eventType,affection,context}=JSON.parse(body);
        const cacheKey=crypto.createHash('md5').update(JSON.stringify({charId,eventType,affection})).digest('hex');
        if(aiCache.has(cacheKey)){
          res.writeHead(200,{'Content-Type':'application/json'});
          res.end(JSON.stringify({...aiCache.get(cacheKey),cached:true}));return;
        }
        const affLabel=affection>=60?'高好感（深度羁绊）':affection>=30?'中好感（熟悉的朋友）':'低好感（刚刚认识）';
        const eventLabels={chat:'闲聊偶遇',help:'需要帮助',deep:'深度谈心',fun:'轻松搞笑',study:'一起学习',lunch:'午餐时间',sports:'体育活动',rain:'雨天',hallway:'走廊相遇',cleaning:'一起打扫',walk_home:'放学回家',game:'一起玩游戏',sick:'身体不舒服',comfort:'安慰时刻',share:'分享东西',rooftop:'天台',homework:'写作业',club:'社团活动'};
        const eventLabel=eventLabels[eventType]||eventType;
        const base=CHAR_PROMPTS[charId]||('你是凹凸学园的学生——'+charId+'。');
        const sp=base+'\n\n用2-3句话写一段叙事（60字内），然后给2个对话选项（各15字内）。格式严格遵守：\n叙事：<文本>\n选项1：<文本>\n选项2：<文本>\n\n用「」做引号。用——做停顿。不要说「作为AI」。';
        const up='场景：'+eventLabel+'。好感度：'+affLabel+'。'+(context||'日常校园');
        const r=await fetch('https://api.deepseek.com/v1/chat/completions',{
          method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+AI_KEY},
          body:JSON.stringify({model:'deepseek-chat',max_tokens:400,temperature:0.9,messages:[{role:'system',content:sp},{role:'user',content:up}]}),
        });
        const d=await r.json();const t=d.choices?.[0]?.message?.content||'';
        console.log('AI:',t.slice(0,120));
        // 解析：叙事行 + 选项行
        const lines=t.split('\n').filter(l=>l.trim());
        let narration='',opt1='',opt2='';
        for(const l of lines){
          const lt=l.trim();
          if(lt.startsWith('叙事'))narration=lt.replace(/^叙事[：:]\s*/,'');
          else if(lt.startsWith('选项1'))opt1=lt.replace(/^选项1[：:]\s*/,'');
          else if(lt.startsWith('选项2'))opt2=lt.replace(/^选项2[：:]\s*/,'');
        }
        // fallback: 如果格式不匹配，第一行作叙事，后两行作选项
        if(!narration&&lines.length>=3){narration=lines[0];opt1=lines[1];opt2=lines[2];}
        if(!narration)narration='你们在校园里相遇了。风吹过走廊——阳光正好。';
        if(!opt1)opt1='「好巧——」自然地打招呼';
        if(!opt2)opt2='微笑——然后一起走';
        const result={narration,choices:[{t:opt1},{t:opt2}]};
        if(aiCache.size>=500){const fk=aiCache.keys().next().value;aiCache.delete(fk);}
        aiCache.set(cacheKey,result);
        res.writeHead(200,{'Content-Type':'application/json'});
        res.end(JSON.stringify(result));
      }catch(e){
        res.writeHead(200,{'Content-Type':'application/json'});
        res.end(JSON.stringify({narration:null,choices:null,reason:e.message}));
      }
    });return;
  }

  let fp='.'+reqPath;if(fp==='./')fp='./index.html';
  if(reqPath==='/favicon.ico'){res.writeHead(204);res.end();return;}
  const ext=path.extname(fp);
  fs.readFile(fp,(err,data)=>{
    if(err){res.writeHead(404);res.end('404');return;}
    res.writeHead(200,{'Content-Type':MIME[ext]||'text/plain','Content-Length':Buffer.byteLength(data)});
    res.end(data);
  });
});
server.listen(PORT,()=>console.log('\n🏫 凹凸学园 · AI增强服务器\n🌐 http://localhost:'+PORT+'\n🤖 AI: ✅ Claude Sonnet 就绪\n'));
