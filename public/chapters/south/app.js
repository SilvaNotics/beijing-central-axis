"use strict";

const DATA=[
{
 id:"tiananmen",name:"天安门广场及建筑群",
 x:50,y:9,w:18,h:15,person:"景和先生",age:54,
 poem:"一线贯南北 · 千载见京华",
 lines:[
  "远来的客人，我是景和。这一段先别急着看城楼，看它和广场是怎么摆的——门在前，场在后，一条轴从这里往南穿出去。",
  "天安门始建于明永乐十五年，原名承天门，是皇城的正门。那时它只是一座木牌楼，三层五间，没有今天这么高。",
  "天顺元年遭雷火焚毁，成化元年重建，才改成九间五进的重檐城楼。今天你看到的面阔九间、进深五间，规制就是那一次定下的。",
  "崇祯十七年，李自成攻进北京，承天门再毁一次。顺治八年重修，改名天安门，取受命于天、安邦治国的意思。",
  "城台底下五道券门，正中那道最高最宽，明清两代只有皇帝能走。门前立着汉白玉的石狮和一对华表。",
  "明清时这里是颁诏的地方。皇帝的诏书在城楼上宣读，用木雕的金凤衔着系下来，叫金凤颁诏，百官在下面跪着接。",
  "广场原来是皇城前的丁字形广场，两侧各有千步廊，平民不能进。民国初年拆改，五十年代扩建，人民英雄纪念碑一九五八年落成。",
  "一九一四年朱启钤主持改造旧城，天安门前那条土路才铺上石渣；一九二五年故宫开放，这一带才渐渐成了百姓能走到的地方。",
  "承天门、天安门，几百年间历经更名、毁损和重修。城门一直是理解这段中轴空间的重要参照。",
  "广场这边先讲到这儿。往南去是正阳门，守城人长安在那儿等着，他会告诉你什么叫一座门三重防线。"]
},
{
 id:"zhengyangmen",name:"正阳门",
 x:50,y:28,w:18,h:17,person:"守城人 · 长安",age:47,
 poem:"城门迎过客 · 街巷有余声",
 lines:[
  "客人且慢，城门前留步。我叫长安，在这儿守了半辈子门，先讲讲这座楼是怎么来的。",
  "正阳门的前身，是元大都的丽正门。永乐十七年城墙往南挪，它跟着迁到这儿；正统元年才改叫正阳门。",
  "正统四年增建箭楼和瓮城，城楼、箭楼、瓮城三重套着。一道门，就是一整套防线。",
  "它是九门里规制最高的一座：城台底宽九十五米，高十四米七；上头城楼高二十七米，灰筒瓦、绿琉璃剪边。",
  "券门是五伏五券，门洞高九米四九、宽七米零八；箭楼上开着九十四孔箭窗，战时万箭齐发。",
  "光绪二十六年庚子之变，城楼、箭楼先后被烧，光绪三十二年重建，才成了今天这个样子。",
  "一九一五年，朱启钤主持拆掉瓮城，打通前门的交通。从那以后，正阳门就孤零零立在街心，成了一个环岛。",
  "明清两代，这是京城的国门。皇帝出巡、官员赴任都走这道门；门外的前门大街，五牌楼、老字号、车马喧腾。",
  "门没了瓮城，街反而更热闹。老北京人说前门，说的不只是这座楼，是楼底下这一整片烟火气。",
  "老话说完了。城门的故事还有影像可看，点开这段视频便是；想换个地方，就回地图上挑一处。"]
},
{
 id:"xiannongtan",name:"先农坛",
 x:33,y:43,w:20,h:15,person:"耕读翁",age:68,
 poem:"春耕一畦土 · 秋收万家粮",
 lines:[
  "你来得正好。人家叫我耕读翁，一辈子跟土打交道。进了先农坛，咱先聊地，再看房。",
  "这儿建于明永乐十八年，起初叫山川坛，祭的是山川风雨；嘉靖十年在南边添了天神坛和地祇坛。",
  "万历四年才改称先农坛，清代一直用这个名字。可这坛里最要紧的不是殿，是南边那一小片田。",
  "每年仲春亥日，皇帝到这儿行亲耕礼：右手扶犁、左手执鞭，在一亩三分地里推三个来回，再上观耕台，看三公九卿把剩下的耕完。",
  "后来人们常用“一亩三分地”比喻个人的一小片天地。耤田不大，却把农事放进了国家礼仪。",
  "观耕台在乾隆十九年改成石台，台基上的石阶还留着。太岁殿里那具明代藻井，抬头看，一层一层往上收。",
  "坛西边的神仓，专门存这亩地收下来的谷子，一粒也不许糟蹋——皇帝亲手种的粮，要留着供祭祀用。",
  "民国以后坛墙残了，八十年代起陆续修缮。如今这里是北京古代建筑博物馆，太岁殿、拜殿都还在。",
  "春天来这儿看一眼就明白：这坛子不是单给神看的，是年年提醒人，别忘了下地。",
  "地里的事，一时说不尽。愿意的话，看一眼这段坛庙的影像；不愿久留，就回地图上去别处走走。"]
},
{
 id:"tiantan",name:"天坛",
 x:69,y:39,w:15,h:23,person:"观天先生",age:58,
 poem:"仰观天宇阔 · 静听古坛风",
 lines:[
  "欢迎来天坛。我是观天先生。先抬头看那片蓝顶——别处没有哪个屋顶，敢用这么纯的蓝。",
  "天坛始建于明永乐十八年，那时天地合祭，叫天地坛；嘉靖九年改成天地分祀，才定名天坛。",
  "祭天的圜丘在南，祈谷的祈年殿在北，中间一道丹陛桥连着，走上去像走在天上。",
  "祈年殿前身叫大享殿，乾隆十六年才改名。屋顶原本是上青、中黄、下绿三色瓦，也是乾隆时改成全蓝。",
  "光绪十五年八月，一道雷火把殿烧成灰；次年起重建，光绪二十二年才完工。你今天看到的祈年殿，是光绪朝的样子。",
  "殿里二十八根柱子：中间四根龙井柱应四季，中层十二根应十二月，外层十二根应十二时辰，加起来正好一年。",
  "圜丘三层，每层的台阶、栏板、铺石都用九或九的倍数，取天数；坛心那块天心石，站上去说话，声音会自己回来。",
  "皇穹宇外头那道围墙就是回音壁，直径约六十一米。两个人贴着墙说话，隔几十米也听得见。",
  "坛里还有三千多株古柏，最老的六百多岁。到这儿别只看殿，也看看树——树比殿还老。",
  "就说到这里。这一段影像可以看看，坛上的风与光，镜头里也有几分；想再走走，便回地图去。"]
},
{
 id:"road",name:"中轴线南段道路遗存",
 x:50,y:55.5,w:11,h:13,person:"寻迹人 · 墨行",age:29,
 poem:"来路藏旧事 · 足下见光阴",
 noVideo:true,
 lines:[
  "先别急着走过。我是墨行，专找那些藏在脚下的线索，这一带我走了很多遍。",
  "南段道路遗存不是一整段露天古路，而是分布在不同地点的考古发现。",
  "现有资料分别记载永定门北侧成对石路、叠压道路，以及珠市口以南的排水遗存。",
  "其中的七层叠压属于特定发掘点，不能把它说成整段道路的共同剖面。",
  "考古介绍还记载了清代石路及其铺砌形式。这些细节要放回各自的发现地点理解。",
  "路面和车辙为不同时期的通行留下线索；具体车种与每道痕迹的对应关系仍需更细资料。",
  "地图上的标记是导览位置，不是精确发掘坐标，也不表示遗存今天都能在地面看到。",
  "道路遗存经考古记录后回填或保护，眼前的城市路面不能直接当作遗址本体。",
  "沿着中轴行走，可以把这些分散发现理解为道路历史的片段；地图上的连线只是帮助辨认方向。",
  "再往南就是永定门，南城老先生在那儿等着。走吧，脚底下这条线，还没到头。"]
},
{
 id:"yongdingmen",name:"永定门",
 x:50,y:75,w:21,h:18,person:"南城老先生",age:71,
 poem:"自南望京阙 · 一路入画中",
 lines:[
  "来啦。南城人都叫我老先生。站这儿往北看，一条线笔直通到城里，那是北京的中轴。",
  "永定门建于明嘉靖三十二年，是外城的正门，也是中轴线最南的头。那年修外城，本要围一整圈，钱不够，只围了南边。",
  "嘉靖四十三年增筑瓮城；乾隆年间扩建城楼、添建箭楼，才成了城楼、瓮城、箭楼三重。",
  "城台东西三十一米四一、南北十六米九六、高八米，城楼通高二十六米零四；一个券门，宽高各五米二。",
  "皇帝去南苑围猎、往南巡幸，多从这道门出城。门一开，仪仗先行，半条街都静了。",
  "一九五一年拆除瓮城，一九五七年城楼和箭楼相继拆除，原有建筑序列由此改变。",
  "二〇〇三年，失踪几百年的永定门石匾在先农坛一带出土，原件如今藏在首都博物馆。",
  "二〇〇四年按古制在原址复建城楼，用砖二百九十余万块。瓮城和箭楼没有重建，所以你今天只看得到一座楼。",
  "城门拆除后又在原址复建。中轴空间历经变化，今天的城楼仍标示着这条南北序列的南端。",
  "这一程先陪你走到这里。想再听听看看，就点开这段影片；也可以回到地图，另访一位讲述人。"]
}
];

const $=id=>{
 const element=document.getElementById(id);
 if(!element)throw new Error("Missing required element: #"+id);
 return element;
};
let current=null,line=0,mode="talk";
let mapVersion=0,videoVersion=0;
let visited=new Set();
const refs=new Map(),portraits=new Map();
const KEY="axis-ink-complete-v3";
const returnLink=document.querySelector("[data-return]");
if(window.parent!==window)returnLink.hidden=true;
returnLink.addEventListener("click",event=>{
 if(window.parent===window)return;
 event.preventDefault();
 window.parent.postMessage({type:"axis:return"},window.location.origin);
});

try{
 const saved=JSON.parse(localStorage.getItem(KEY)||"[]");
 const valid=new Set(DATA.map(p=>p.id));
 if(Array.isArray(saved))visited=new Set(saved.filter(id=>valid.has(id)));
}catch(_){}

function loadPortraitFiles(){
 for(const place of DATA){
  const portrait=new Image();
  portrait.onload=()=>{
   portraits.set(place.id,portrait.src);
   if(current?.id===place.id)updatePortrait();
  };
  portrait.src="./assets/portraits/"+place.id+".png";
 }
}

function updatePortrait(){
 if(!current)return;
 const src=portraits.get(current.id);
 $("portrait").hidden=!src;
 if(src){
  $("portrait").src=src;
  $("portrait").alt=current.person+"的人物立绘";
 }else $("portrait").removeAttribute("src");
}

/* 地图与景点入口 */
for(const place of DATA){
 const spot=document.createElement("button");
 spot.className="spot";spot.type="button";
 for(const key of ["x","y","w","h"]){
  spot.style.setProperty("--"+key,place[key]+"%");
 }
 spot.setAttribute("aria-label","探索"+place.name);
 const pin=document.createElement("span");
 pin.className="pin";pin.setAttribute("aria-hidden","true");
 const label=document.createElement("span");
 label.className="spot-label";label.textContent=place.name;
 spot.append(pin,label);
 spot.addEventListener("click",()=>openPlace(place));
 $("hotspots").append(spot);

 const button=document.createElement("button");
 button.type="button";button.className="destination";
 button.addEventListener("click",()=>openPlace(place));
 $("destinations").append(button);
 refs.set(place.id,{spot,pin,button});
}

function progress(){
 $("progress").textContent=visited.size+" / "+DATA.length;
 for(const place of DATA){
  const r=refs.get(place.id),seen=visited.has(place.id);
  r.spot.classList.toggle("visited",seen);
  r.button.classList.toggle("visited",seen);
  r.pin.textContent=seen?"✓":"+";
  r.button.textContent=(seen?"✓ ":"")+place.name;
 }
 try{localStorage.setItem(KEY,JSON.stringify([...visited]))}catch(_){}
}

function loadMap(src){
 const version=++mapVersion,image=new Image();
 image.onload=()=>{
  if(version!==mapVersion)return;
  $("mapImage").src=src;
  $("mapImage").hidden=false;
  $("mapEmpty").hidden=true;
  $("hotspots").hidden=false;
  $("pageStatus").textContent="地图已加载，点击景点开始探索。";
  updateBackground();
 };
 image.onerror=()=>{
  if(version===mapVersion)$("pageStatus").textContent="地图未能载入，可直接点击下方景点。";
 };
 image.src=src;
}
$("reset").addEventListener("click",()=>{
 if(confirm("确定清空游览记录吗？")){
  visited.clear();progress();
 }
});
function updateBackground(){
 const image=$("mapImage");
 $("background").style.backgroundImage=!image.hidden
  ?"url("+JSON.stringify(image.src)+")":"none";
}

/* 声音状态 */
let bgm=null,bgmTarget=0,musicOn=true;
let voices=[],utterance=null,readToken=0,readState="idle";
const synth=("speechSynthesis" in window)?window.speechSynthesis:null;

function ensureAudio(){
 if(!bgm){
  bgm=new Audio("./assets/music/ambient.mp3");
  bgm.loop=true;
  bgm.preload="auto";
  bgm.volume=0;
 }
}
function musicTarget(){
 if(!bgm)return;
 const onMap=!$("story").open;
 const active=musicOn&&mode!=="video"&&!document.hidden;
 const duck=(readState==="speaking"||readState==="pending")?.4:1;
 /* 地图页只作背景，压到六成；进站后恢复 */
 const scene=onMap?.6:1;
 bgmTarget=active?Number($("musicVolume").value)*duck*scene:0;
 if(bgmTarget>0&&bgm.paused){
  const started=bgm.play();
  if(started&&started.catch)started.catch(()=>{});
 }
}
function startMusic(){
 ensureAudio();
 musicTarget();
}
function stopMusicLoop(){
 bgmTarget=0;
}
/* 音量做几十毫秒的渐变，避免开关时爆音 */
setInterval(()=>{
 if(!bgm)return;
 const delta=bgmTarget-bgm.volume;
 if(Math.abs(delta)>0.004){
  bgm.volume=Math.max(0,Math.min(1,bgm.volume+delta*0.3));
 }else if(bgmTarget===0&&!bgm.paused){
  bgm.pause();
 }
},90);
function syncMusicButtons(){
 const text="音乐："+(musicOn?"开":"关");
 for(const id of ["musicToggle","musicToggleHome"]){
  const el=$(id);
  if(!el)continue;
  el.textContent=text;
  el.setAttribute("aria-pressed",String(musicOn));
 }
}
function toggleMusic(){
 musicOn=!musicOn;
 syncMusicButtons();
 if(musicOn)startMusic();else stopMusicLoop();
}
$("musicToggle").addEventListener("click",toggleMusic);
$("musicToggleHome").addEventListener("click",toggleMusic);
$("musicVolume").addEventListener("input",musicTarget);

/* 浏览器不允许无交互自动出声：第一次点击/按键后再起乐 */
function unlockMusic(){
 for(const type of ["pointerdown","keydown","touchstart"])
  document.removeEventListener(type,unlockMusic);
 ensureAudio();
 musicTarget();
}
for(const type of ["pointerdown","keydown","touchstart"])
 document.addEventListener(type,unlockMusic,{once:true,passive:true});
ensureAudio();
syncMusicButtons();

/* 修订过的台词改用当前文字朗读，避免播放源目录中的旧文案。 */
const revisedLines={
 tiananmen:[9],
 xiannongtan:[5],
 road:[2,3,4,5,6,7,8,9],
 yongdingmen:[6,9]
};
const castAudio=new Audio();
castAudio.preload="auto";
let castFailed=false;
function castMode(){
 return $("voiceMode").value==="cast"&&!castFailed&&
  !revisedLines[current?.id]?.includes(line+1);
}
function castSrc(){
 return "./assets/voices/"+current.id+"-"+(line+1)+".mp3";
}
function playCast(token){
 castAudio.pause();
 castAudio.src=castSrc();
 castAudio.volume=1;
 castAudio.playbackRate=Number($("readRate").value);
 readState="pending";readUI("正在准备朗读……");
 const started_=()=>{
  if(token!==readToken)return;
  readState="speaking";readUI("正在朗读 · 音乐已降低");
 };
 castAudio.onplaying=started_;
 castAudio.onplay=started_;
 castAudio.onended=()=>{
  if(token!==readToken)return;
  readState="ended";readUI("本句朗读完毕");
 };
 castAudio.onerror=()=>{
  if(token!==readToken)return;
  castFailed=true;readState="idle";
  readUI("这一句缺少配音，已改用系统语音。");
  speakLine();
 };
 const started=castAudio.play();
 if(started&&started.then)started.then(()=>{
  started_();
 }).catch(()=>{
  if(token!==readToken)return;
  readState="idle";
  readUI("点击“重听本句”开始播放配音");
 });
}

/* 中文朗读 */
function loadVoices(){
 if(!synth){
  $("voiceSelect").innerHTML="<option>当前浏览器不支持朗读</option>";
  return;
 }
 const selectedName=$("voiceSelect").selectedOptions[0]?.dataset.name;
 voices=synth.getVoices().filter(v=>/^(zh|cmn)/i.test(v.lang));
 $("voiceSelect").replaceChildren();
 const automatic=document.createElement("option");
 automatic.value="";automatic.textContent="自动选择中文声音";
 $("voiceSelect").append(automatic);
 voices.forEach((voice,index)=>{
  const option=document.createElement("option");
  option.value=String(index);
  option.dataset.name=voice.name;
  option.textContent=voice.name+" · "+voice.lang;
  $("voiceSelect").append(option);
  if(selectedName===voice.name)$("voiceSelect").value=String(index);
 });
}
function readUI(text){
 if(text)$("readStatus").textContent=text;
 $("readButton").textContent=readState==="paused"?"继续朗读":
  (readState==="speaking"||readState==="pending")?"暂停朗读":"重听本句";
 musicTarget();
}
function cancelRead(){
 readToken++;
 castAudio.pause();
 if(synth)synth.cancel();
 utterance=null;readState="idle";musicTarget();
}
function speakLine(){
 cancelRead();
 if(!current||mode!=="talk"||!$("story").open)return;
 if(castMode()){playCast(readToken);return}
 if(!synth){readUI("当前浏览器不支持系统朗读。");return}
 const token=readToken;
 const u=new SpeechSynthesisUtterance(current.lines[line]);
 utterance=u;
 u.lang="zh-CN";u.rate=Number($("readRate").value);
 u.pitch=current.age>60?.85:.97;u.volume=1;
 const selected=$("voiceSelect").value;
 const voice=selected!==""?voices[Number(selected)]:
  voices.find(v=>/^zh[-_]CN$/i.test(v.lang))||voices[0];
 if(voice)u.voice=voice;
 readState="pending";readUI("正在准备朗读……");
 u.onstart=()=>{
  if(token!==readToken)return;
  readState="speaking";readUI("正在朗读 · 音乐已降低");
 };
 u.onend=()=>{
  if(token!==readToken)return;
  readState="ended";readUI("本句朗读完毕");
 };
 u.onerror=()=>{
  if(token!==readToken)return;
  readState="idle";
  readUI("朗读未能完成，可点击重听或更换中文声音。");
 };
 synth.resume();
 synth.speak(u);
}
$("readButton").addEventListener("click",()=>{
 if(castMode()){
  if(readState==="speaking"||readState==="pending"){
   castAudio.pause();readState="paused";readUI("朗读已暂停");return;
  }
  if(readState==="paused"){
   castAudio.play();readState="speaking";readUI("正在朗读");return;
  }
  speakLine();return;
 }
 if(!synth){readUI("当前浏览器不支持朗读。");return}
 if(readState==="speaking"||readState==="pending"){
  synth.pause();readState="paused";readUI("朗读已暂停");
 }else if(readState==="paused"){
  synth.resume();readState="speaking";readUI("正在朗读");
 }else speakLine();
});
$("autoRead").addEventListener("change",()=>{
 if($("autoRead").checked)speakLine();
 else{cancelRead();readUI("自动朗读已关闭")}
});
$("voiceMode").addEventListener("change",()=>{
 castFailed=false;cancelRead();
 if(current&&$("autoRead").checked&&mode==="talk")speakLine();
});
$("voiceSelect").addEventListener("change",()=>{
 if(current&&$("autoRead").checked&&mode==="talk")speakLine();
});
$("readRate").addEventListener("input",()=>{
 $("rateLabel").textContent=Number($("readRate").value).toFixed(2);
});
$("readRate").addEventListener("change",()=>{
 if(current&&$("autoRead").checked&&mode==="talk")speakLine();
});
loadVoices();
if(synth)synth.addEventListener("voiceschanged",loadVoices);

/* 剧情 */
function renderLine(){
 cancelRead();
 $("speaker").textContent=current.person;
 $("speech").textContent=current.lines[line];
 $("lineCount").textContent=(line+1)+" / "+current.lines.length+" · 空格继续";
 $("previous").disabled=line===0;
 $("next").textContent=line===current.lines.length-1?(current.noVideo?"回到地图 ▸":"观看视频 ▸"):"继续 ▸";
 document.querySelector(".dialogue-content").scrollTop=0;
 if($("autoRead").checked)speakLine();
 else readUI("自动朗读已关闭 · 可点击重听");
}
function openPlace(place){
 ensureAudio();cancelRead();stopVideo();
 current=place;line=0;mode="talk";
 visited.add(place.id);progress();
 $("storyTitle").textContent=place.name;
 $("poem").textContent=place.poem;
 updateBackground();updatePortrait();$("openVideo").hidden=!!place.noVideo;
 $("stage").hidden=false;$("videoView").hidden=true;
 $("story").setAttribute("aria-labelledby","storyTitle");
 closeSettings();
 if(!$("story").open)$("story").showModal();
 startMusic();renderLine();
}
function showTalk(){
 stopVideo();mode="talk";
 $("stage").hidden=false;$("videoView").hidden=true;
 $("story").setAttribute("aria-labelledby","storyTitle");
 startMusic();renderLine();
}
function nextLine(){
 if(!current)return;
 if(line<current.lines.length-1){line++;renderLine()}
 else if(current.noVideo)$("story").close();
 else showVideo();
}
$("next").addEventListener("click",nextLine);
$("previous").addEventListener("click",()=>{
 if(line>0){line--;renderLine()}
});
$("openVideo").addEventListener("click",showVideo);
$("backToTalk").addEventListener("click",showTalk);
$("closeStory").addEventListener("click",()=>$("story").close());
$("closeVideo").addEventListener("click",()=>$("story").close());

function closeSettings(){
 $("settings").hidden=true;
 $("settingsToggle").setAttribute("aria-expanded","false");
}
$("settingsToggle").addEventListener("click",()=>{
 $("settings").hidden=!$("settings").hidden;
 $("settingsToggle").setAttribute("aria-expanded",String(!$("settings").hidden));
});
$("closeSettings").addEventListener("click",closeSettings);

/* 视频 */
function stopVideo(){
 videoVersion++;
 const player=$("player");
 player.onloadedmetadata=null;player.onerror=null;
 player.pause();player.removeAttribute("src");player.load();player.hidden=true;
}
function showVideo(){
 if(!current||current.noVideo)return;
 mode="video";cancelRead();stopMusicLoop();closeSettings();
 $("stage").hidden=true;$("videoView").hidden=false;
 $("videoTitle").textContent=current.name+" · 景点视频";
 $("story").setAttribute("aria-labelledby","videoTitle");
 loadVideo();
}
function loadVideo(){
 stopVideo();
 const version=videoVersion,place=current,player=$("player");
 const path="./assets/videos/"+place.id+".mp4";
 $("videoEmpty").hidden=false;
 $("emptyTitle").textContent="正在读取视频";
 $("emptyText").textContent="正在载入景点影像，请稍候。";
 $("videoStatus").textContent="正在载入"+place.name+"的视频。";
 player.onloadedmetadata=()=>{
  if(version!==videoVersion)return;
  player.hidden=false;$("videoEmpty").hidden=true;
  const d=player.duration;
  $("videoStatus").textContent=place.name+" · "+
   (Number.isFinite(d)?Math.floor(d/60)+" 分 "+Math.floor(d%60)+" 秒":"时长未知")+
   " · 点击播放按钮开始。";
 };
 player.onerror=()=>{
  if(version!==videoVersion)return;
  player.hidden=true;$("videoEmpty").hidden=false;
  $("emptyTitle").textContent="尚未添加可播放视频";
  $("emptyText").textContent="请检查本地视频资源是否完整。";
  $("videoStatus").textContent="没有实际视频时，地图与人物对话仍可使用。";
 };
 player.src=path;player.load();
}
/* 窗口与页面生命周期 */
$("story").addEventListener("close",()=>{
 mode="talk";
 cancelRead();stopVideo();closeSettings();startMusic();
});
$("story").addEventListener("click",event=>{
 if(event.target!==$("story"))return;
 const r=$("story").getBoundingClientRect();
 if(event.clientX<r.left||event.clientX>r.right||
    event.clientY<r.top||event.clientY>r.bottom)$("story").close();
});
document.addEventListener("keydown",event=>{
 if(!$("story").open||mode!=="talk"||
    event.code!=="Space"||event.repeat)return;
 if(event.target instanceof Element&&
    event.target.closest("button,input,select,textarea,a"))return;
 event.preventDefault();nextLine();
});
document.addEventListener("visibilitychange",()=>{
 if(document.hidden){
  cancelRead();$("player").pause();musicTarget();
  if(current&&mode==="talk")readUI("已停止朗读 · 可点击重听");
 }else musicTarget();
});
window.addEventListener("pagehide",()=>{
 cancelRead();stopMusicLoop();
 if(bgm&&!bgm.paused)bgm.pause();
});
window.addEventListener("pageshow",()=>{
 if($("story").open&&mode==="talk")startMusic();
});

progress();
loadMap("./assets/map.png");
loadPortraitFiles();

(function startInkOpening(){
  "use strict";

  const overlay=document.getElementById("axis-ink-opening");
  if(!overlay)return;

  let done=false;
  let frameID=0;

  function finish(){
    if(done)return;
    done=true;
    cancelAnimationFrame(frameID);
    overlay.remove();
  }

  // 即使脚本执行或浏览器动画出现问题，也不会永久挡住页面。
  const safety=setTimeout(finish,4200);

  const reduced=window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  );

  if(reduced.matches){
    clearTimeout(safety);
    finish();
    return;
  }

  try{
    const hole=overlay.querySelector("[data-ink-hole]");
    const halo=overlay.querySelector("[data-ink-halo]");
    const edge=overlay.querySelector("[data-ink-edge]");
    const title=overlay.querySelector("[data-ink-title]");

    if(!hole||!halo||!edge){
      clearTimeout(safety);
      finish();
      return;
    }

    const start=performance.now();
    const duration=2600;

    function easeInOut(t){
      return t<.5
        ?4*t*t*t
        :1-Math.pow(-2*t+2,3)/2;
    }

    function animate(now){
      if(done)return;

      const progress=Math.min(1,(now-start)/duration);

      /*
        viewBox 为 1000 × 1000。
        扩散半径最终超过四角距离，保证完整揭幕。
      */
      const spread=Math.max(
        0,Math.min(1,(progress-.13)/.79)
      );
      const radius=960*easeInOut(spread);

      hole.setAttribute("r",radius);
      halo.setAttribute("r",radius+20);
      edge.setAttribute("r",Math.max(0,radius-5));

      // 外圈墨色先出现，随后随扩散淡去。
      const bloom=spread<.08
        ?spread/.08
        :Math.max(0,1-spread);

      halo.style.opacity=String(.17*bloom);
      edge.style.opacity=String(.13*bloom);

      if(title){
        const titleOpacity=progress<.16
          ?Math.min(1,progress/.1)
          :Math.max(0,1-(progress-.16)/.24);

        title.style.opacity=String(titleOpacity*.72);
        title.style.transform=
          "translateY("+(-progress*12)+"px)";
      }

      // 末段整体柔和收尾，避免边角残留。
      overlay.style.opacity=progress>.85
        ?String(Math.max(0,(1-progress)/.15))
        :"1";

      if(progress<1){
        frameID=requestAnimationFrame(animate);
      }else{
        clearTimeout(safety);
        finish();
      }
    }

    frameID=requestAnimationFrame(animate);

    // iframe 或页面进入后台时，不保留一个未完成的遮罩。
    document.addEventListener("visibilitychange",()=>{
      if(document.hidden){
        clearTimeout(safety);
        finish();
      }
    },{once:true});

  }catch(error){
    clearTimeout(safety);
    finish();
  }
})();
