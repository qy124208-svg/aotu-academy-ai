// Vercel Serverless — 批量预生成（每角色1次API调用）
const AI_KEY=process.env.AI_API_KEY||'';

const CHAR_PROMPTS={
jin:'你是金⭐——阳光热血、单纯直率的高一男生。开心就笑，难过就掉眼泪。说话大声，精力充沛，总在找格瑞。',
gerui:'你是格瑞❄️——冰山学霸，沉默寡言。只喝牛奶。话极少但每句都有分量。对金格外温柔。',
leishi:'你是雷狮🦁——不良少年高二C班。只吃烤肉。嗓门大走路带风不说软话。表面上横对家人比谁都护。',
anmixiu:'你是安迷修⚔️——风纪委员高三A班。自称「在下」最喜欢法棍。骑士精神。',
kamier:'你是卡米尔🧣——初三A班。安静几乎不说话围巾从不离身。对堂兄雷狮的消息永远秒回。',
jiadeluosi:'你是嘉德罗斯🔥——高一B班。口头禅「渣渣」。唯一天敌格瑞。只吃汉堡。',
kaili:'你是凯莉👑——星月魔女非常腹黑。喜欢捉弄人——但只捉弄在意的人。',
anlijie:'你是安莉洁🍋——天然呆预言家。说话慢但预言从不出错。水晶球能看到未来。',
yinjue:'你是银爵🐱——高三A班。和猫说话比和人说话多。猫都喜欢的人不会坏。',
zitanghuan:'你是紫堂幻🐾——高一B班社恐。说话都会停顿——但每次都会努力说完。',
shenjinyao:'你是神近耀🗡️——高一B班。无口无心无表情。对数字9极端执念。',
leide:'你是雷德📖——高二C班恋爱脑。三句话不离祖玛。',
zuma:'你是祖玛🗿——高二C班沉默寡言军人气质。说话极少。',
aimi:'你是埃米😇——初三A班双胞胎弟弟。呆毛会随着情绪变化。被姐姐欺负但甘之如饴。',
aibi:'你是艾比😈——初三A班双胞胎姐姐。嘴上凶得要命实际宠弟弟。暗恋安迷修嘴硬不承认。',
peili:'你是佩利🐺——高二C班热血狂犬单纯直接。喜欢打架和吃饭。帕洛斯说的话他都听。',
paluosi:'你是帕洛斯🖊️——高二C班腹黑笑面虎暗影使者作者。坑佩利为乐。',
guihu:'你是鬼狐天冲🦊——高三A班笑面虎。说的每句话都有目的。但通讯录里有一个人——没有标注。',
};

export default async function handler(req,res){
  res.setHeader('Access-Control-Allow-Origin','*');
  if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});

  const {charId}=req.body||{};
  if(!charId)return res.json({results:{},reason:'no charId'});

  const base=CHAR_PROMPTS[charId]||'你是凹凸学园的学生。';
  const types=['chat','help','deep','fun','study','lunch','sports','hallway','walk_home'];
  const eventLabels={chat:'闲聊偶遇',help:'帮助他人',deep:'深度谈心',fun:'轻松搞笑',study:'一起学习',lunch:'午餐时间',sports:'体育活动',hallway:'走廊相遇',walk_home:'放学回家'};

  const sp=base+'\n\n为以下10个场景各写1段叙事(40字内)和2个选项(10字内)。只输出JSON：\n{"chat":{"n":"叙事","c":["选项1","选项2"]},"help":{...},...共10个}\n用「」引号，用——停顿。不要输出其他内容。';
  const up='场景：'+types.map(t=>eventLabels[t]||t).join('、');

  try{
    const r=await fetch('https://api.deepseek.com/v1/chat/completions',{
      method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+AI_KEY},
      body:JSON.stringify({model:'deepseek-chat',max_tokens:2000,temperature:0.7,messages:[{role:'system',content:sp},{role:'user',content:up}]}),
    });
    const d=await r.json();const t=d.choices?.[0]?.message?.content||'';
    let results={};
    const types=['chat','help','deep','fun','study','lunch','sports','hallway','walk_home','rain','sick','comfort','share','game','homework'];
    // 逐行解析JSON对象
    const jsonLines=t.match(/\{[^}]*"n"[^}]*"c"[^\]]*\][^}]*\}/g)||[];
    for(const line of jsonLines){
      try{
        const obj=JSON.parse(line);
        for(const [type,val] of Object.entries(obj)){
          if(val&&val.n&&types.includes(type)){
            for(const aff of [10,50,80]){
              const k=`${charId}_${type}_${aff>=60?'hi':aff>=30?'mid':'lo'}`;
              results[k]={narration:val.n,choices:(val.c||[]).map(t=>({t}))};
            }
          }
        }
      }catch(e){}
    }
    if(Object.keys(results).length===0){
      try{
        const json=JSON.parse(t.match(/\{[\s\S]*\}/)?.[0]||t);
        for(const [type,val] of Object.entries(json)){
          if(val&&val.n){
            for(const aff of [10,50,80]){
              const k=`${charId}_${type}_${aff>=60?'hi':aff>=30?'mid':'lo'}`;
              results[k]={narration:val.n,choices:(val.c||[]).map(t=>({t}))};
            }
          }
        }
      }catch(e){}
    }
    res.json({results});
  }catch(e){
    res.json({results:{},reason:e.message});
  }
}
