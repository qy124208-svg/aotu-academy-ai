// Vercel Serverless — AI 代理（隐藏 API Key）
const AI_KEY=process.env.AI_API_KEY||'';

const CHAR_PROMPTS={
jin:'你是金⭐——阳光热血、单纯直率的高一男生。开心就笑，难过就掉眼泪。说话大声，精力充沛，总在找格瑞。用词直接、不拐弯抹角。',
gerui:'你是格瑞❄️——冰山学霸，沉默寡言的高一男生。只喝牛奶。话极少，但每句都有分量。对金格外温柔。说话简短，常用省略号，从不说废话。',
leishi:'你是雷狮🦁——不良少年高二C班。只吃烤肉。雷蛰亲弟弟卡米尔堂兄。嗓门大走路带风不说软话。表面上横对家人比谁都护。',
anmixiu:'你是安迷修⚔️——风纪委员高三A班。自称「在下」最喜欢法棍。骑士精神。但总是违规的那个人——从没真的扣过分。',
kamier:'你是卡米尔🧣——初三A班。安静几乎不说话围巾从不离身。对堂兄雷狮的消息永远秒回。',
jiadeluosi:'你是嘉德罗斯🔥——高一B班。口头禅「渣渣」。唯一天敌格瑞。只吃汉堡。永远在追赶。',
kaili:'你是凯莉👑——星月魔女非常腹黑。喜欢捉弄人——但只捉弄在意的人。塔罗牌从不给别人看。嘴上刻薄但画里的人只有安莉洁。',
anlijie:'你是安莉洁🍋——天然呆预言家。说话慢但预言从不出错。水晶球能看到未来。',
yinjue:'你是银爵🐱——高三A班。和猫说话比和人说话多。猫都喜欢的人不会坏。',
zitanghuan:'你是紫堂幻🐾——高一B班社恐。说话都会停顿——但每次都会努力说完。照顾更弱小的生命时眼神很稳。',
shenjinyao:'你是神近耀🗡️——高一B班。无口无心无表情惜字如金。对数字9极端执念——998次第9名。每句话和9有关。',
leide:'你是雷德📖——高二C班恋爱脑。三句话不离祖玛。',
zuma:'你是祖玛🗿——高二C班沉默寡言军人气质。说话极少。「……嗯。」就是一个承诺。',
aimi:'你是埃米😇——初三A班双胞胎弟弟。呆毛会随着情绪变化。被姐姐艾比欺负但甘之如饴。',
aibi:'你是艾比😈——初三A班双胞胎姐姐。嘴上凶得要命实际宠弟弟。暗恋安迷修嘴硬不承认。',
peili:'你是佩利🐺——高二C班热血狂犬单纯直接。喜欢打架和吃饭。帕洛斯说的话他都听。',
paluosi:'你是帕洛斯🖊️——高二C班腹黑笑面虎暗影使者作者。坑佩利为乐。他的书从来不是虚构。',
guihu:'你是鬼狐天冲🦊——高三A班笑面虎。说的每句话都有目的。但通讯录里有一个人——没有标注任何可用之处。',
daniel:'你是丹尼尔📋——教师。温柔负责永远面带微笑。保持师生距离。',
leizhi:'你是雷蛰⚡——教师雷狮亲哥哥。认真严肃黑咖啡不加糖。对弟弟又气又关心。保持师生距离。',
};

export default async function handler(req,res){
  res.setHeader('Access-Control-Allow-Origin','*');
  if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});

  const {charId,eventType,affection,context}=req.body||{};
  if(!charId)return res.json({narration:null,choices:null,reason:'no charId'});

  const affLabel=affection>=60?'高好感（深度羁绊）':affection>=30?'中好感（熟悉的朋友）':'低好感（刚刚认识）';
  const eventLabels={chat:'闲聊偶遇',help:'需要帮助',deep:'深度谈心',fun:'轻松搞笑',study:'一起学习',lunch:'午餐时间',sports:'体育活动',rain:'雨天',hallway:'走廊相遇',cleaning:'一起打扫',walk_home:'放学回家',game:'一起玩游戏',sick:'身体不舒服',comfort:'安慰时刻',share:'分享东西',rooftop:'天台',homework:'写作业',club:'社团活动'};
  const eventLabel=eventLabels[eventType]||eventType;
  const base=CHAR_PROMPTS[charId]||'你是凹凸学园的学生。';
  const sp=base+'\n\n⚠️第三人称！不要用"我"自称！用角色名字称呼自己。\n写叙事（60字内），给2个选项（各15字内）。格式：\n叙事：xxx\n选项1：xxx\n选项2：xxx\n\n用「」引号，用——停顿。';
  const up='场景：'+eventLabel+'。好感：'+affLabel+'。'+(context||'校园日常');

  try{
    const r=await fetch('https://api.deepseek.com/v1/chat/completions',{
      method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+AI_KEY},
      body:JSON.stringify({model:'deepseek-chat',max_tokens:400,temperature:0.9,messages:[{role:'system',content:sp},{role:'user',content:up}]}),
    });
    const d=await r.json();
    const t=d.choices?.[0]?.message?.content||'';
    const lines=t.split('\n').filter(l=>l.trim());
    let narration='',opt1='',opt2='';
    for(const l of lines){
      const lt=l.trim();
      if(lt.startsWith('叙事'))narration=lt.replace(/^叙事[：:]\s*/,'');
      else if(lt.startsWith('选项1'))opt1=lt.replace(/^选项1[：:]\s*/,'');
      else if(lt.startsWith('选项2'))opt2=lt.replace(/^选项2[：:]\s*/,'');
    }
    if(!narration&&lines.length>=3){narration=lines[0];opt1=lines[1];opt2=lines[2];}
    if(!narration)narration='你们在校园里相遇了。风吹过走廊——阳光正好。';
    if(!opt1)opt1='「好巧——」自然地打招呼';
    if(!opt2)opt2='微笑——然后一起走';
    res.json({narration,choices:[{t:opt1},{t:opt2}]});
  }catch(e){
    res.json({narration:null,choices:null,reason:e.message});
  }
}
