/* ================= réglages (tout l'équilibrage est ici) ================= */
const CFG={
  board:{spawn0:2.4,spawnMin:0.35,spawnDecay:0.9},
  dmg:{base:2.6,combo:0.12,manual:1.6},
  shards:{kill:(n,type)=>type==='boss'?4*n:type==='mini'?n:n/25}, // éclats hors Réfraction : surtout les boss
  sparks:{merge:l=>0.15*l,manual:2,kill:n=>0.8*Math.pow(1.18,n)*(1+2*Math.max(0,1-(n-1)/15))}, // coup de pouce ×3 à l'étage 1, fondu jusqu'à l'étage 16
  enemy:{hp:n=>400*Math.pow(1.6,n-1)*(n%10===0?3:n%5===0?2:1),bossTime:60,bossRetry:60,atkEvery:9,windup:3},
  tb:{ // boosters temporaires : coût de base, croissance, plafond
    cad:{c0:10,g:1.45,max:30},birth:{c0:300,g:6,max:5},auto:{c0:60,g:1.55,max:30},power:{c0:25,g:1.45,max:40},spark:{c0:50,g:1.5,max:30}},
  prestige:{minStage:30,mult:0.2,shards:n=>Math.floor(10*Math.pow(1.15,n))},
  offline:{capH:k=>2+k,rateWindow:60,factor:0.3},
  titan:{time:45,days:[2,4,6],free:2,ticketGems:20}, // jours : 0 = dimanche
  build:{gemSec:300,adCut:1800,slotGems:[200,500],jslotGems:[150,350]},
  boost:{adH:1,loginH:2,gemsH:4,gemsPrice:25},
  interstitialEvery:4,wpReset:50,
  gift:{every:[150,300],show:45},
  rate:{window:120}, // référence : étincelles gagnées sur 2 min, hors boost ×2 publicitaire
  ads:{giftMin:10,shopMin:30,floor:{gift:60,shop:200}}, // pubs = minutes de production, avec un minimum en étincelles
  league:{gems:r=>r===1?60:r===2?40:r===3?30:r<=5?20:r<=15?10:r<=25?5:2,minutes:r=>r===1?120:r<=3?60:r<=5?45:r<=15?30:r<=25?15:10,tiers:[[1,1],[2,2],[3,3],[4,5],[6,15],[16,25],[26,30]]}, // récompenses de fin de semaine (gemmes validées par le serveur, étincelles = minutes de production)
  sparkShop:{packs:[{g:15,min:30},{g:40,min:90},{g:100,min:240},{g:200,min:600}],capMin:1440}, // gemmes → étincelles, 24 h de production max par jour
};
const THEMES=[0,1,2,3,4].map(i=>({get mob(){return t('th'+i+'_mob')},get mini(){return t('th'+i+'_mini')},get boss(){return t('th'+i+'_boss')},get titan(){return t('th'+i+'_titan')},atk:['lock','burn','fog','heal','shuffle'][i],get atkT(){return t('th'+i+'_atk')}}));
const WORLDS=[{h:188,k:0},{h:22,k:-3},{h:255,k:2},{h:145,k:-5},{h:310,k:5}].map((w,i)=>Object.assign(w,{get n(){return t('w'+i)}}));
const worldOf=n=>Math.floor((n-1)/10)+1;
function worldInfo(w){const b=WORLDS[(w-1)%WORLDS.length];const cyc=Math.floor((w-1)/WORLDS.length);return {name:b.n+(cyc?' '+['II','III','IV','V','VI','VII','VIII','IX','X'][Math.min(cyc-1,8)]:''),h:b.h,k:b.k,col:`hsl(${b.h} 100% 62%)`};}

/* ---------- atelier : recherches ---------- */
/* ---------- armes : la forme de la gemme (cycle de 8) ---------- */
const WEAPONS=[['tri',0.55,0.45,'94,200,255'],['sq',1.2,1,'157,123,255'],['pen',1.5,1,'255,94,126'],['hex',1.3,1,'255,230,109'],['hep',1.3,1,'255,179,71'],['oct',1.6,1.1,'127,226,255'],['star',1.2,0.9,'108,240,194'],['dia',1.4,0.8,'212,140,255']].map(([id,rate,k,col])=>({id,rate,k,col,get t(){return t('wp_'+id)},get fx(){return t('wp_'+id+'_fx')},get d(){return t('wp_'+id+'_d')}}));
const weaponOf=l=>WEAPONS[(l-1)%8];
const rankOf=l=>Math.floor((l-1)/8);
/* points de réfraction : gagnés à chaque réfraction, dépensés librement dans les armes */
const ppGain=n=>n<CFG.prestige.minStage?0:Math.max(1,Math.floor((1+(n-CFG.prestige.minStage)/10)*(1+0.1*(S.up.eveil||0))));
const wpLvl=i=>(S.wp&&S.wp[i])||0;
const wpCost=i=>1+wpLvl(i);
function buyWP(i){const c=wpCost(i);if(S.pp<c)return false;S.pp-=c;S.wp=S.wp||{};S.wp[i]=wpLvl(i)+1;return true;}
function resetWP(){if(S.gems<CFG.wpReset)return false;S.gems-=CFG.wpReset;let back=0;for(const i in S.wp){const k=S.wp[i];back+=k*(k+1)/2;}S.wp={};S.pp+=back;return true;}
const wIdx=l=>(l-1)%8;
const effectPow=l=>(1+0.5*rankOf(l))*(1+0.2*wpLvl(wIdx(l)))*(1+0.1*(S.up.rang||0));
const wpDmg=l=>1+0.08*wpLvl(wIdx(l));
const GROUPS=['start','auto','atk','grid','eco','jok','arm'].map(id=>({id,get t(){return t('g_'+id)},get d(){return t('g_'+id+'_d')}}));
const T=(a,g,cap=2592000)=>k=>Math.min(cap,Math.round(a*Math.pow(g,k))); // plafond 30 jours : les recherches deviennent de plus en plus longues
const UPG=[
  // Départ : niveau de départ des boosters temporaires
  {id:'st_cad',g:'start',get t(){return t('u_st_cad')},d:k=>t('u_st_cad_d',{n:k+1}),c:k=>60*Math.pow(1.35,k),time:T(20,1.25),max:Infinity},
  {id:'st_auto',g:'start',get t(){return t('u_st_auto')},d:k=>t('u_st_auto_d',{n:k+1}),c:k=>150*Math.pow(1.4,k),time:T(45,1.25),max:Infinity,req:6},
  {id:'st_power',g:'start',get t(){return t('u_st_power')},d:k=>t('u_st_power_d',{n:k+1}),c:k=>120*Math.pow(1.25,k),time:T(40,1.25),max:Infinity},
  {id:'st_birth',g:'start',get t(){return t('u_st_birth')},d:k=>t('u_st_birth_d',{n:2+k}),c:k=>400*Math.pow(2.5,k),time:T(120,1.35),max:Infinity,req:12},
  {id:'st_spark',g:'start',get t(){return t('u_st_spark')},d:k=>t('u_st_spark_d',{n:k+1}),c:k=>200*Math.pow(1.4,k),time:T(60,1.25),max:Infinity,req:8},
  {id:'st_bank',g:'start',get t(){return t('u_st_bank')},d:k=>t('u_st_bank_d',{n:fmt(50*Math.pow(2.2,k))}),c:k=>90*Math.pow(1.6,k),time:T(30,1.3),max:Infinity},
  // Automatisation
  {id:'au_merge',g:'auto',get t(){return t('u_au_merge')},d:k=>t('u_au_merge_d',{n:30*(k+1)}),c:k=>300*Math.pow(1.35,k),time:T(60,1.25),max:Infinity,req:5},
  {id:'au_buy',g:'auto',get t(){return t('u_au_buy')},d:k=>k?t('u_au_buy_d',{n:Math.max(1,10-k)}):t('u_au_buy_d0'),c:k=>2500*Math.pow(1.4,k),time:T(900,1.25),max:9,req:15},
  {id:'au_joker',g:'auto',get t(){return t('u_au_joker')},d:()=>t('u_au_joker_d'),c:()=>8000,time:()=>7200,max:1,req:20},
  {id:'au_boss',g:'auto',get t(){return t('u_au_boss')},d:k=>t('u_au_boss_d',{n:Math.max(10,60-10*(k+1))}),c:k=>4000*Math.pow(1.45,k),time:T(1800,1.3),max:5,req:20},
  {id:'au_prestige',g:'auto',get t(){return t('u_au_prestige')},d:k=>t('u_au_prestige_d',{n:[100,50,25,10,5][Math.min(k,4)]}),c:k=>30000*Math.pow(1.6,k),time:T(14400,1.3),max:5,req:30},
  {id:'au_exped',g:'auto',get t(){return t('u_au_exped')},d:k=>t('u_au_exped_d',{n:2*(k+1)}),c:k=>15000*Math.pow(1.7,k),time:T(7200,1.3),max:Infinity,req:25},
  {id:'au_titan',g:'auto',get t(){return t('u_au_titan')},d:k=>t('u_au_titan_d',{n:k+1}),c:k=>20000*Math.pow(1.55,k),time:T(10800,1.3),max:5,req:35},
  // Attaque
  {id:'power',g:'atk',get t(){return t('u_power')},d:k=>t('u_power_d',{n:dec(Math.pow(1.1,k+1),1)}),c:k=>80*Math.pow(1.4,k),time:T(30,1.2),max:Infinity},
  {id:'crit',g:'atk',get t(){return t('u_crit')},d:k=>t('u_crit_d',{n:2*(k+1)}),c:k=>500*Math.pow(1.5,k),time:T(120,1.3),max:25,req:8},
  {id:'combo',g:'atk',get t(){return t('u_combo')},d:k=>t('u_combo_d',{n:5+(k+1)}),c:k=>400*Math.pow(1.5,k),time:T(90,1.3),max:20,req:6},
  {id:'bossdmg',g:'atk',get t(){return t('u_bossdmg')},d:k=>t('u_bossdmg_d',{n:dec(Math.pow(1.15,k+1),1)}),c:k=>1500*Math.pow(1.55,k),time:T(600,1.3),max:Infinity,req:10},
  {id:'pierce',g:'atk',get t(){return t('u_pierce')},d:k=>t('u_pierce_d',{n:k+1}),c:k=>20000*Math.pow(2.5,k),time:T(14400,1.4),max:4,req:20},
  // Plateau
  {id:'lucky',g:'grid',get t(){return t('u_lucky')},d:k=>t('u_lucky_d',{n:3*(k+1)}),c:k=>200*Math.pow(1.45,k),time:T(60,1.25),max:25},
  {id:'chain',g:'grid',get t(){return t('u_chain')},d:k=>t('u_chain_d',{n:3*(k+1)}),c:k=>350*Math.pow(1.5,k),time:T(90,1.3),max:25,req:8},
  {id:'gold',g:'grid',get t(){return t('u_gold')},d:k=>t('u_gold_d',{n:k+1}),c:k=>600*Math.pow(1.55,k),time:T(240,1.3),max:20,req:12},
  {id:'board',g:'grid',get t(){return t('u_board')},d:k=>k?t('u_board_d1'):t('u_board_d0'),c:k=>[400,60000][k],time:k=>[7200,86400][k],max:2,req:k=>k?30:12},
  {id:'sursis',g:'grid',get t(){return t('u_sursis')},d:k=>t('u_sursis_d',{n:k+2}),c:k=>1200*Math.pow(1.7,k),time:T(600,1.3),max:6,req:10},
  // Économie
  {id:'spark',g:'eco',get t(){return t('u_spark')},d:k=>t('u_spark_d',{n:dec(Math.pow(1.1,k+1),1)}),c:k=>100*Math.pow(1.4,k),time:T(30,1.2),max:Infinity},
  {id:'loot',g:'eco',get t(){return t('u_loot')},d:k=>t('u_loot_d',{n:8*(k+1)}),c:k=>300*Math.pow(1.4,k),time:T(120,1.25),max:Infinity},
  {id:'off',g:'eco',get t(){return t('u_off')},d:k=>t('u_off_d',{n:2+k+1}),c:k=>500*Math.pow(1.6,k),time:T(900,1.3),max:Infinity,req:5},
  {id:'killspark',g:'eco',get t(){return t('u_killspark')},d:k=>t('u_killspark_d',{n:15*(k+1)}),c:k=>800*Math.pow(1.45,k),time:T(300,1.25),max:Infinity,req:10},
  // Jokers
  {id:'catal',g:'jok',get t(){return t('u_catal')},d:k=>t('u_catal_d',{n:8*(k+1)}),c:k=>2000*Math.pow(1.6,k),time:T(900,1.35),max:8,req:8},
];
const ARMUP=[
  {id:'cadence',g:'arm',get t(){return t('u_cadence')},d:k=>t('u_cadence_d',{n:5*(k+1)}),c:k=>150*Math.pow(1.4,k),time:T(40,1.25),max:Infinity},
  {id:'rang',g:'arm',get t(){return t('u_rang')},d:k=>t('u_rang_d',{n:10*(k+1)}),c:k=>600*Math.pow(1.5,k),time:T(120,1.3),max:Infinity,req:8},
  {id:'eveil',g:'arm',get t(){return t('u_eveil')},d:k=>t('u_eveil_d',{n:10*(k+1)}),c:k=>3000*Math.pow(1.7,k),time:T(900,1.35),max:Infinity,req:20},
  {id:'brule',g:'arm',get t(){return t('u_brule')},d:k=>t('u_brule_d',{n:3+(k+1)}),c:k=>800*Math.pow(1.6,k),time:T(300,1.3),max:Infinity,req:12},
  {id:'aura',g:'arm',get t(){return t('u_aura')},d:k=>t('u_aura_d',{n:25+10*(k+1)}),c:k=>1200*Math.pow(1.6,k),time:T(300,1.3),max:Infinity,req:16},
];
UPG.push(...ARMUP);
const JOKERS=[['chameleon',8,1500,50,14,l=>t('j_chameleon_d',{p:l>=4?t('j_two'):t('j_one'),n:1+l})],['magnet',12,4000,80,22,l=>t('j_magnet_d',{n:2+l})],['surge',16,9000,110,20,l=>t('j_surge_d',{n:6+2*l})],['frost',22,20000,140,18,l=>t('j_frost_d',{n:8+2*l})],['prism',28,45000,170,22,l=>t('j_prism_d',{n:2+l})],['meteor',35,100000,200,28,l=>t('j_meteor_d',{x:l>1?', ×'+dec(1+0.5*(l-1),1):''})],['breaker',45,250000,240,16,l=>t('j_breaker_d',{n:8+3*l})]].map(([id,lvl,sh,gm,base,d])=>({id,lvl,sh,gm,base,d,get t(){return t('j_'+id)}}));
const JUPG=JOKERS.map(j=>({id:'j_'+j.id,g:'jok',joker:j.id,get t(){return j.t},d:k=>j.d(k+1),c:k=>j.sh*0.8*Math.pow(2.2,k-1),time:k=>Math.min(86400,Math.round(1200*Math.pow(2.5,k-1))),max:5}));
const ALLUP=UPG.concat(JUPG);
const TBDEF={cad:{i:'hourglass',c:'s5',n:k=>t('tb_cad_n',{n:dec(CFG.board.spawn0*Math.pow(CFG.board.spawnDecay,k),1)})},birth:{i:'gem',c:'s4',n:k=>t('tb_birth_n',{n:1+k})},auto:{i:'link',c:'s6',n:k=>k?t('tb_auto_n',{n:dec(0.12*k*(1+0.3*S.up.au_merge),2)}):t('tb_auto_0')},power:{i:'swords',c:'s1',n:k=>t('tb_power_n',{n:dec(Math.pow(1.12,k),1)})},spark:{i:'spark',c:'s3',n:k=>t('tb_spark_n',{n:dec(Math.pow(1.08,k),2)})}};
for(const k in TBDEF){Object.defineProperty(TBDEF[k],'t',{get(){return t('tb_'+k)}});Object.defineProperty(TBDEF[k],'d',{get(){return t('tb_'+k+'_d')}});}

/* ================= état du joueur ================= */
const SKINS=[{id:'cyan',price:0,c:'#3ef2ff'},{id:'rose',price:40,c:'#ff3ec8'},{id:'or',price:80,c:'#ffd23e'},{id:'prisme',price:150,c:'rainbow'}].map(k=>Object.assign(k,{get label(){return t('skin_'+k.id)}}));
function fresh(){
  const now=Date.now();
  return {v:3,gems:20,maxStage:1,bestStage:1,prestiges:0,
    run:{sparks:0,stage:1,tb:{cad:0,birth:0,auto:0,power:0,spark:0},max:1,fled:false,fledAt:0,rate:0,srate:0},
    up:Object.fromEntries(UPG.map(u=>[u.id,0])),jk:{},equip:[],jslots:1,build:[],slots:1,
    pp:0,wp:{},lastSeen:now,boostUntil:0,titan:null,lootX2:false,noAds:false,starter:false,adCount:0,
    name:randomName(),nameChanges:0,flagged:0,skin:'cyan',skins:['cyan'],
    st:{tuto:0,merges:0,manual:0,kills:0,bosses:0,collects:0,bought:0,started:0,jokerUses:0,maxCombo:0,days:1,lastDay:dayKey(),titans:0,titanBest:0,namePrompted:false,hintW:1},
    day:{k:dayKey(),merges:0,kills:0,bosses:0,ads:0,buildAds:0,collects:0,jokers:0,titans:0,tb:0,gifts:0,combo:0,prestiges:0,claimed:[]},
    week:{k:weekKey(),best:0,kills:0,prestiges:0,collects:0,titans:0,claimed:[]},
    onb:[],league:null,bestiary:{},login:{streak:0,last:'',claimed:''},offerAt:0,settings:{music:true,sound:true,fx:true}};
}
let S=fresh();
const KEY='prisme-fusion-v7';
function load(){try{const r=localStorage.getItem(KEY);if(r){const o=JSON.parse(r);if(o&&o.v===3){const f=fresh();const merged=Object.assign({},f,o);for(const k of ['up','st','settings','run','day','week','login','wp'])merged[k]=Object.assign({},f[k],o[k]||{});merged.run.tb=Object.assign({},f.run.tb,(o.run||{}).tb||{});migrate(merged);S=merged;}}}catch(e){}}
function snapBoard(){if(!R||!R.cells)return;S.run.cells=R.cells.map(c=>!c?0:c.l?(c.k==='gold'?-c.l:c.l):c.k==='joker'?'j':0);}
function migrate(m){delete m.idle;if(m.shards>0){m.run.sparks=(m.run.sparks||0)+m.shards;}delete m.shards;return m;} // v8.4 : les éclats deviennent des étincelles
function save(){S.lastSeen=Date.now();snapBoard();try{localStorage.setItem(KEY,JSON.stringify(S));}catch(e){}}
function roll(){if(S.st.lastDay!==dayKey()){S.st.days++;S.st.lastDay=dayKey();}if(S.day.k!==dayKey()){S.day={k:dayKey(),merges:0,kills:0,bosses:0,ads:0,buildAds:0,collects:0,jokers:0,titans:0,tb:0,gifts:0,combo:0,prestiges:0,claimed:[]};}if(!DAILY.length||DAILY.k!==S.day.k){pickDaily();DAILY.k=S.day.k;}if(S.week.k!==weekKey()){S.week={k:weekKey(),best:0,kills:0,prestiges:0,collects:0,titans:0,claimed:[]};S.league=null;}}
function give(r){if(!r)return;if(r.g)S.gems+=r.g;if(r.s)S.run.sparks+=r.s;if(r.sp)S.run.sparks+=r.sp;if(r.b)S.boostUntil=Math.max(Date.now(),S.boostUntil)+r.b*3600e3;}
function rewardHtml(r){const o=[];if(r.g)o.push(`<span>${I.g}${r.g}</span>`);if(r.s)o.push(`<span>${ic('spark','ie')}${fmt(r.s)}</span>`);if(r.sp)o.push(`<span>${ic('spark','ie')}${fmt(r.sp)}</span>`);if(r.b)o.push(`<span>${ic('bolt','ie')}${t('boost_h',{n:r.b})}</span>`);return `<span class="rew">${o.join('')}</span>`;}
const boosted=()=>Date.now()<S.boostUntil;
/* ---------- cadeaux : une bulle apparaît de temps en temps, une pub = un bonus ---------- */
function giftRoll(){
  const r=Math.random(),st=Math.max(S.bestStage,1);
  if(r<0.6)return {k:'sp',v:adSparks('gift')};
  if(r<0.85)return {k:'g',v:5+Math.floor(Math.random()*6)};
  return {k:'b',v:0.5};
}
function giftOK(){roll();return true;}
const pushBase=sp=>pushWin(R.baseWin,R.t,sp/(boosted()?2:1),CFG.rate.window);
const rateMin=()=>(S.run.brate||0)*60; // étincelles par minute, référence des pubs et des packs
const adSparks=kind=>Math.max(CFG.ads.floor[kind],Math.floor(rateMin()*CFG.ads[kind+'Min']));
const packSparks=p=>Math.max(CFG.ads.floor.shop,Math.floor(rateMin()*p.min));
function buyPack(i){roll();const p=CFG.sparkShop.packs[i];if(!p||S.gems<p.g)return false;if((S.day.spMin||0)+p.min>CFG.sparkShop.capMin)return 'cap';S.gems-=p.g;S.day.spMin=(S.day.spMin||0)+p.min;S.run.sparks+=packSparks(p);return true;}
function giftTake(gf){roll();S.day.gifts=(S.day.gifts||0)+1;S.st.gifts=(S.st.gifts||0)+1;S.day.ads++;if(gf.k==='s')S.run.sparks+=gf.v;else if(gf.k==='sp')S.run.sparks+=gf.v;else if(gf.k==='g')S.gems+=gf.v;else give({b:gf.v});}

/* ================= calendrier de connexion ================= */
const LOGIN=[{g:10},{b:2},{s:300},{g:20},{b:4},{s:2000},{joker:true}];
function loginState(){roll();const today=dayKey();if(S.login.last===today)return {day:S.login.streak,claimedToday:S.login.claimed===today};
  const y=new Date();y.setDate(y.getDate()-1);const consecutive=S.login.last===dayKey(y.getTime());
  S.login.streak=consecutive?(S.login.streak%7)+1:1;S.login.last=today;return {day:S.login.streak,claimedToday:false};}
function claimLogin(){const st=loginState();if(st.claimedToday)return false;S.login.claimed=dayKey();const r=LOGIN[st.day-1];
  if(r.joker){const j=JOKERS.find(x=>!S.jk[x.id]);if(j){S.jk[j.id]=1;if(S.equip.length<S.jslots)S.equip.push(j.id);}else S.gems+=50;}else give(r);return true;}


/* ================= atelier : chantiers ================= */
const upById=id=>ALLUP.find(x=>x.id===id);
const lvlOf=u=>u.joker?(S.jk[u.joker]||0):S.up[u.id];
const upCost=u=>(u.joker&&!S.jk[u.joker])||lvlOf(u)>=u.max?Infinity:u.c(lvlOf(u));
const upTime=u=>u.time(lvlOf(u));
const upReq=u=>typeof u.req==='function'?u.req(lvlOf(u.id)):u.req;
const upLocked=u=>upReq(u)&&S.bestStage<upReq(u);
const inBuild=id=>S.build.find(b=>b.id===id);
function applyUp(id){const u=upById(id);if(u.joker)S.jk[u.joker]=(S.jk[u.joker]||0)+1;else S.up[u.id]++;S.st.bought++;if(u.id==='board')growBoard();}
function growBoard(){if(!R)return;const N=boardN(),M=R.N;if(N<=M)return;const cells=Array(N*N).fill(null);R.cells.forEach((c,i)=>{if(c)cells[Math.floor(i/M)*N+(i%M)]=c;});R.N=N;R.cells=cells;snapBoard();hooks.grow&&hooks.grow(N);}
function tickBuild(now=Date.now()){const done=[];S.build=S.build.filter(b=>{if(now>=b.until){applyUp(b.id);done.push(b.id);return false;}return true;});return done;}
function startBuild(id,now=Date.now()){
  tickBuild(now);const u=upById(id);if(!u)return 'none';
  if(upLocked(u))return 'locked';if(inBuild(id))return 'busy';
  const c=upCost(u);if(!isFinite(c))return 'max';
  if(S.build.length>=S.slots)return 'slots';if(S.run.sparks<c)return 'poor';
  S.run.sparks-=c;S.st.started++;const d=upTime(u);S.build.push({id,until:now+d*1000,dur:d});return 'ok';
}
const rushGems=(b,now=Date.now())=>Math.max(1,Math.ceil((b.until-now)/1000/CFG.build.gemSec));
function rushBuild(id,now=Date.now()){const b=inBuild(id);if(!b)return false;const g=rushGems(b,now);if(S.gems<g)return false;S.gems-=g;b.until=now;tickBuild(now);return true;}
function adBuild(id,now=Date.now()){roll();const b=inBuild(id);if(!b)return false;S.day.buildAds++;b.until-=CFG.build.adCut*1000;tickBuild(now);return true;}
function buySlot(){const i=S.slots-1;if(i>=CFG.build.slotGems.length)return false;const g=CFG.build.slotGems[i];if(S.gems<g)return false;S.gems-=g;S.slots++;return true;}
const jokerById=id=>JOKERS.find(j=>j.id===id);
const jokerAvail=j=>S.bestStage>=j.lvl;
function unlockJoker(id,cur){const j=jokerById(id);if(!j||S.jk[id]||!jokerAvail(j))return false;if(cur==='g'){if(S.gems<j.gm)return false;S.gems-=j.gm;}else{if(S.run.sparks<j.sh)return false;S.run.sparks-=j.sh;}S.jk[id]=1;if(S.equip.length<S.jslots)S.equip.push(id);if(R)R.jk[id]=0;return true;}
function toggleEquip(id){if(!S.jk[id])return false;const i=S.equip.indexOf(id);if(i>=0){S.equip.splice(i,1);if(R)delete R.jk[id];return true;}if(S.equip.length>=S.jslots)return false;S.equip.push(id);if(R)R.jk[id]=0;return true;}
function buyJSlot(){const i=S.jslots-1;if(i>=CFG.build.jslotGems.length)return false;const g=CFG.build.jslotGems[i];if(S.gems<g)return false;S.gems-=g;S.jslots++;return true;}
const jokerNeed=id=>{const j=jokerById(id),l=S.jk[id]||1;return Math.max(4,Math.ceil(j.base*(1-0.08*S.up.catal))-(l-1));};

/* ================= boosters temporaires ================= */
const tbLvl=k=>S.run.tb[k]+(S.up['st_'+k]||0);
const tbCost=k=>S.run.tb[k]>=CFG.tb[k].max?Infinity:CFG.tb[k].c0*Math.pow(CFG.tb[k].g,S.run.tb[k]);
function buyTB(k){const c=tbCost(k);if(!isFinite(c)||S.run.sparks<c)return false;S.run.sparks-=c;S.run.tb[k]++;S.day.tb=(S.day.tb||0)+1;if(k==='birth'&&R)bumpBoard();hooks.tb(k);return true;}
function autoBuyTick(dt){if(!S.up.au_buy)return;R.buyT=(R.buyT||0)+dt;const every=Math.max(1,10-S.up.au_buy);if(R.buyT<every)return;R.buyT=0;
  let best=null,bc=Infinity;for(const k in CFG.tb){const c=tbCost(k);if(c<bc){bc=c;best=k;}}if(best&&S.run.sparks>=bc)buyTB(best);}
const spawnLevel=()=>1+tbLvl('birth');
const spawnInterval=()=>Math.max(CFG.board.spawnMin,CFG.board.spawn0*Math.pow(CFG.board.spawnDecay,tbLvl('cad')));
const autoRate=()=>{const a=tbLvl('auto');if(!a)return 0;return 0.12*a*(1+0.3*S.up.au_merge);};
const powerMult=()=>Math.pow(1.12,tbLvl('power'))*Math.pow(1.1,S.up.power)*(boosted()?2:1);
const refMult=()=>1+CFG.prestige.mult*S.prestiges; // multiplicateur permanent d'étincelles gagné à chaque Réfraction
const sparkMult=()=>Math.pow(1.08,tbLvl('spark'))*Math.pow(1.1,S.up.spark)*(boosted()?2:1)*refMult();
const lootMult=()=>(1+0.08*S.up.loot)*(S.lootX2?2:1);
const boardN=()=>4+S.up.board;

/* ================= moteur de partie ================= */
let R=null;
const hooks={harvest(){},tb(){},milestone(){},joker(){},merge(){},kill(){},bossStart(){},bossFled(){},spawn(){},unlock(){},bomb(){},full(){},hit(){},attack(){},phase(){},windup(){},prestige(){},titanEnd(){},offline(){},evolve(){}};
const dmgOf=l=>Math.pow(CFG.dmg.base,l-1);
const themeIdx=n=>(worldOf(n)-1)%THEMES.length;
const weekTheme=()=>{const d=new Date(weekKey());return Math.floor(d.getTime()/(7*86400e3))%THEMES.length;};
function enemyFor(n){
  const type=n%10===0?'boss':n%5===0?'mini':'mob',th=themeIdx(n),max=CFG.enemy.hp(n);
  return {type,th,name:THEMES[th][type],hp:max,max,phase:1,shieldL:0,atkT:CFG.enemy.atkEvery,atkEvery:CFG.enemy.atkEvery,str:type==='boss'?2:1,stage:n};
}
function titanEnemy(){const th=weekTheme();return {type:'titan',th,name:THEMES[th].titan,hp:Infinity,max:Infinity,phase:1,shieldL:0,atkT:99,atkEvery:99,str:1,stage:0};}
function newRun(){
  const N=boardN();
  R={N,cells:Array(N*N).fill(null),t:0,spawnT:0,autoT:0,combo:0,comboT:0,jk:{},surgeUntil:0,frostUntil:0,breakUntil:0,paused:false,hold:false,
    mode:'farm',bossT:0,titanT:0,titanDmg:0,dmgWin:[],sparkWin:[],baseWin:[],killWin:[],buyT:0};
  for(const id of S.equip)if(S.jk[id])R.jk[id]=0;
  if(S.run.fled)S.run.fledAt=0;
  R.E=S.run.fled?enemyFor(S.run.stage-1):enemyFor(S.run.stage);
  if(S.run.fled&&R.E.type==='boss')R.E=enemyFor(S.run.stage-1);
  if(S.run.stage%10===0&&!S.run.fled){R.mode='boss';R.bossT=CFG.enemy.bossTime;}
  const sv=S.run.cells;
  const M=Array.isArray(sv)?Math.round(Math.sqrt(sv.length)):0;
  if(M&&M*M===sv.length&&M<=N&&sv.some(Boolean)){ // plateau conservé d'une session à l'autre (recopié si la grille a grandi)
    sv.forEach((v,i)=>{const j=M===N?i:(Math.floor(i/M))*N+(i%M);if(v==='j')R.cells[j]={k:'joker'};else if(typeof v==='number'&&v){R.cells[j]={l:Math.abs(v)};if(v<0)R.cells[j].k='gold';}});
  }else for(let i=0;i<3;i++)spawnOne();
  return R;
}
const emptyCells=()=>R.cells.map((c,i)=>c?-1:i).filter(i=>i>=0);
const shapes=()=>R.cells.map((c,i)=>[c,i]).filter(x=>x[0]&&x[0].l);
function bumpBoard(){const sl=spawnLevel();for(let i=0;i<R.cells.length;i++){const c=R.cells[i];if(c&&c.l&&c.l<sl){c.l=sl;hooks.spawn(i);}}}
function spawnOne(){
  let e=emptyCells();
  if(!e.length){ // plateau plein : les plus petites gemmes se recyclent (1 de base, plus avec Sursis)
    const n=1+S.up.sursis;const small=shapes().sort((a,b)=>a[0].l-b[0].l).slice(0,n);if(!small.length)return -1;small.forEach(([c,i])=>{R.cells[i]=null;hooks.bomb(i,[i]);});e=emptyCells();}
  const i=e[Math.floor(Math.random()*e.length)];
  const l=spawnLevel()+(Math.random()<0.03*S.up.lucky?1:0);R.cells[i]={l};if(Math.random()<0.01*S.up.gold)R.cells[i].k='gold';
  hooks.spawn(i);return i;
}
const nb=i=>{const N=R.N,x=i%N,y=Math.floor(i/N),o=[];if(x>0)o.push(i-1);if(x<N-1)o.push(i+1);if(y>0)o.push(i-N);if(y<N-1)o.push(i+N);return o;};
function bossAttack(){
  const E=R.E,kind=THEMES[E.th].atk,s=E.str,hit=[];
  if(kind==='lock'){let e=emptyCells().sort(()=>Math.random()-.5);for(let k=0;k<s;k++){let i=e.pop();if(i==null){const sh=shapes().sort((a,b)=>a[0].l-b[0].l)[0];if(!sh)break;i=sh[1];}R.cells[i]={k:'lock',until:R.t+25};hit.push(i);}}
  else if(kind==='burn'){shapes().sort((a,b)=>a[0].l-b[0].l).slice(0,s+1).forEach(([c,i])=>{R.cells[i]=null;hit.push(i);});}
  else if(kind==='fog'){shapes().sort(()=>Math.random()-.5).slice(0,2*s+1).forEach(([c,i])=>{c.fog=R.t+8;hit.push(i);});}
  else if(kind==='heal'){E.hp=Math.min(E.max,E.hp+E.max*0.05*s);}
  else if(kind==='shuffle'){const idx=R.cells.map((c,i)=>i).filter(i=>!R.cells[i]||R.cells[i].k!=='lock');const vals=idx.map(i=>R.cells[i]).sort(()=>Math.random()-.5);idx.forEach((i,k)=>R.cells[i]=vals[k]);shapes().filter(([c])=>c.l>spawnLevel()).sort(()=>Math.random()-.5).slice(0,s).forEach(([c,i])=>{c.l--;hit.push(i);});}
  hooks.attack(kind,hit);
}
function pushWin(arr,t,v,w=CFG.offline.rateWindow){arr.push([t,v]);while(arr.length&&arr[0][0]<t-w)arr.shift();}
function measureRates(){const w=CFG.offline.rateWindow;S.run.srate=R.sparkWin.reduce((a,x)=>a+x[1],0)/w;S.run.brate=R.baseWin.reduce((a,x)=>a+x[1],0)/CFG.rate.window;S.run.rate=R.dmgWin.reduce((a,x)=>a+x[1],0)/w;S.run.krate=R.killWin.length/w;}
function runTick(dt){
  if(!R||R.paused||R.hold)return;
  R.t+=dt;
  if(R.comboT>0){R.comboT-=dt;if(R.comboT<=0)R.combo=0;}
  for(let i=0;i<R.cells.length;i++){const c=R.cells[i];if(!c)continue;if(c.fog&&c.fog<=R.t)delete c.fog;if(c.k==='lock'&&c.until<=R.t){R.cells[i]=null;hooks.unlock(i);}}
  const E=R.E;
  if(R.mode==='boss'){R.bossT-=dt;if(R.t>=R.frostUntil){const b=E.atkT;E.atkT-=dt;if(b>CFG.enemy.windup&&E.atkT<=CFG.enemy.windup)hooks.windup();if(E.atkT<=0){E.atkT=E.atkEvery;bossAttack();}}
    if(R.bossT<=0){bossFlee();}}
  else if(R.mode==='titan'){R.titanT-=dt;if(R.titanT<=0)endTitan();}
  else if(S.run.fled&&S.up.au_boss){R.retryT=(R.retryT||0)+dt;if(R.retryT>=Math.max(10,60-10*S.up.au_boss)){R.retryT=0;challengeBoss();}}
  R.spawnT+=dt;const iv=spawnInterval();
  while(R.spawnT>=iv){R.spawnT-=iv;if(spawnOne()<0){R.spawnT=0;hooks.full();break;}}
  fireTick(dt);if(!R)return;
  const ar=autoRate();if(ar>0){R.autoT+=dt;const ai=1/ar;while(R.autoT>=ai){R.autoT-=ai;autoMerge();}}
  autoBuyTick(dt);
  if(S.up.au_joker)for(const id in R.jk)if(R.jk[id]>=jokerNeed(id))useJoker(id);
  R.rateT=(R.rateT||0)+dt;if(R.rateT>1){R.rateT=0;pushWin(R.dmgWin,R.t,0);pushWin(R.sparkWin,R.t,0);pushWin(R.baseWin,R.t,0,CFG.rate.window);measureRates();}
}
function autoMerge(){const seen={};const o=shapes().filter(x=>!x[0].fog).sort((a,b)=>a[0].l-b[0].l);for(const [c,i] of o){if(seen[c.l]!=null){runMove(seen[c.l],i,false);return true;}seen[c.l]=i;}
  const j=R.cells.findIndex(c=>c&&c.k==='joker');if(j>=0){const cap=jokerCap(),t=o.filter(x=>x[0].l<=cap).pop();if(t){runMove(j,t[1],false);return true;}}return false;}
function applyDamage(into,d,crit,w,silent){
  const E=R.E;if(R.mode==='farm'&&S.run.fled&&E.type==='boss')return;
  E.hp-=d;pushWin(R.dmgWin,R.t,d);
  if(R.mode==='titan'){R.titanDmg+=d;}
  if(!silent)hooks.hit(into,d,false,crit,w);
  if(E.type==='boss'&&E.phase===1&&E.hp<=E.max/2&&E.hp>0){E.phase=2;E.shieldL=Math.max(1,spawnLevel()+3-S.up.pierce);E.str=3;hooks.phase('shield');}
  if(E.hp<=0&&E.type!=='titan')onKill();
}
function fireRate(){const c=R.comboT>0?1+(0.05+0.01*S.up.combo)*R.combo:1;return (1+0.05*S.up.cadence)*c*(R.t<R.surgeUntil?2:1);}
function fireOne(i,C){
  const E=R.E,l=C.l,w=weaponOf(l),p=effectPow(l);
  if(E.shieldL&&l<E.shieldL&&R.t>=R.breakUntil&&w.id!=='sq'){hooks.hit(i,0,true,false,w);return;}
  let d=dmgOf(l)*w.k*powerMult()*wpDmg(l);
  if(E.type==='boss')d*=Math.pow(1.15,S.up.bossdmg);
  if(w.id==='dia'){}else{for(const j of nb(i)){const B=R.cells[j];if(B&&B.l&&weaponOf(B.l).id==='dia')d*=1+(0.25+0.1*S.up.aura)*effectPow(B.l);}}
  let crit=Math.random()<0.02*S.up.crit;if(w.id==='hep'&&Math.random()<Math.min(0.9,0.25*p))crit=true;if(crit)d*=3;
  if(w.id==='pen'){R.burn={dps:Math.max(R.burn&&R.burn.until>R.t?R.burn.dps:0,d*0.35*p),until:R.t+3+S.up.brule};}
  if(w.id==='hex')for(const id in R.jk)R.jk[id]=Math.min(jokerNeed(id),R.jk[id]+0.5*p);
  if(w.id==='oct'&&R.mode==='boss'){R.bossT=Math.min(R.bossT+0.4*p,CFG.enemy.bossTime);}
  if(w.id==='star'){const sp=0.15*l*p*sparkMult();S.run.sparks+=sp;pushWin(R.sparkWin,R.t,sp);pushBase(sp);hooks.harvest(i,sp);}
  applyDamage(i,d,crit,w);
}
function fireTick(dt){
  const fr=fireRate();
  for(let i=0;i<R.cells.length;i++){const C=R.cells[i];if(!C||!C.l||C.fog)continue;C.ft=(C.ft||0)+dt*fr;const w=weaponOf(C.l);if(C.ft>=w.rate){C.ft-=w.rate;fireOne(i,C);if(!R)return;}}
  if(R.burn&&R.burn.until>R.t){applyDamage(null,R.burn.dps*dt,false,null,true);}
}
function doMerge(into,l,gold,manual){
  R.cells[into]={l};if(gold)R.cells[into].k='gold';
  S.st.merges++;S.day.merges++;if(manual){S.st.manual++;R.combo=Math.min(R.combo+1,30);R.comboT=3;if(R.combo>S.st.maxCombo)S.st.maxCombo=R.combo;if(R.combo>(S.day.combo||0))S.day.combo=R.combo;}
  const sp=CFG.sparks.merge(l)*sparkMult()*(manual?CFG.sparks.manual:1);S.run.sparks+=sp;pushWin(R.sparkWin,R.t,sp);pushBase(sp);
  if(gold)S.run.sparks+=Math.max(1,Math.round(l*lootMult()));
  for(const id in R.jk)R.jk[id]=Math.min(jokerNeed(id),R.jk[id]+1);
  for(const j of nb(into))if(R.cells[j]&&R.cells[j].k==='lock'){R.cells[j]=null;hooks.unlock(j);}
  hooks.merge(into,l,gold,manual);
  R.cells[into].ft=weaponOf(l).rate*0.8; // la gemme née tire presque tout de suite
  if(Math.random()<0.03*S.up.chain){const k=R.cells.findIndex((c,i)=>i!==into&&c&&c.l===l&&c.k!=='lock');if(k>=0){const g2=R.cells[k].k==='gold';R.cells[k]=null;doMerge(into,l+1,gold||g2,false);}}
}
const jokerCap=()=>spawnLevel()+1+(S.jk.chameleon||1);
function runMove(a,b,manual=true){
  if(!R||a===b)return 'none';
  const A=R.cells[a],B=R.cells[b];
  if(!A||A.k==='lock')return 'none';
  if(B&&B.k==='lock')return 'none';
  if(!B){R.cells[b]=A;R.cells[a]=null;return 'move';}
  if(A.k==='joker'&&B.l&&B.l<=jokerCap()){R.cells[a]=null;doMerge(b,B.l+1,B.k==='gold',manual);return 'merge';}
  if(B.k==='joker'&&A.l&&A.l<=jokerCap()){R.cells[a]=null;doMerge(b,A.l+1,A.k==='gold',manual);return 'merge';}
  if(A.l&&B.l&&A.l===B.l&&!A.fog&&!B.fog){R.cells[a]=null;doMerge(b,A.l+1,A.k==='gold'||B.k==='gold',manual);return 'merge';}
  return 'back';
}
/* cible aimantée : la gemme compatible la plus proche du point de dépôt (rayon 0,6 case) */
function snapTarget(from,x,y){
  const A=R.cells[from];if(!A)return null;let best=null,bd=0.6*cell;
  for(let i=0;i<R.cells.length;i++){const B=R.cells[i];if(i===from||!B||B.k==='lock')continue;
    const okm=(A.l&&B.l===A.l&&!A.fog&&!B.fog)||(A.k==='joker'&&B.l&&B.l<=jokerCap())||(B.k==='joker'&&A.l&&A.l<=jokerCap());if(!okm)continue;
    const cx2=(i%R.N+.5)*cell,cy2=(Math.floor(i/R.N)+.5)*cell,d=Math.hypot(cx2-x,cy2-y);if(d<bd){bd=d;best=i;}}
  return best;
}
function onKill(){
  const E=R.E,n=E.stage;S.st.kills++;S.day.kills++;S.week.kills++;
  const sp=CFG.sparks.kill(n)*(E.type==='boss'?5:E.type==='mini'?2:1)*(1+0.15*S.up.killspark)*sparkMult();S.run.sparks+=sp;pushWin(R.sparkWin,R.t,sp);pushBase(sp);pushWin(R.killWin,R.t,1);
  if(E.type!=='mob'){const k=String(n);if(!S.bestiary[k]||R.bossT>S.bestiary[k])S.bestiary[k]=Math.round(E.type==='boss'?CFG.enemy.bossTime-R.bossT:0);if(E.type==='boss'){S.st.bosses++;S.day.bosses++;}}
  const sh=CFG.shards.kill(n,E.type)*lootMult();if(sh>0){S.run.sparks+=sh;R.shardAcc=(R.shardAcc||0)+sh;}
  hooks.kill(E,sp,sh);
  if(R.mode==='boss'){R.mode='farm';S.run.fled=false;clearLocks();}
  if(S.run.fled){R.E=enemyFor(n);R.E.hp=R.E.max;return;} // ferme sur l'étape précédente
  S.run.stage=n+1;S.run.max=Math.max(S.run.max,S.run.stage);if(S.run.stage>S.maxStage)S.maxStage=S.run.stage;if(S.run.stage>S.bestStage){S.bestStage=S.run.stage;hooks.evolve();}
  R.E=enemyFor(S.run.stage);
  if(S.run.stage%10===0){R.mode='boss';R.bossT=CFG.enemy.bossTime;R.E.atkT=CFG.enemy.atkEvery;hooks.bossStart(R.E);}
  if(S.up.au_prestige)maybeAutoPrestige();
}
function clearLocks(){for(let i=0;i<R.cells.length;i++)if(R.cells[i]&&R.cells[i].k==='lock'){R.cells[i]=null;hooks.unlock(i);}}
function bossFlee(voluntary){clearLocks();R.mode='farm';S.run.fled=true;S.run.fledAt=R.t;R.retryT=0;R.E=enemyFor(S.run.stage-1);hooks.bossFled(voluntary);}
function retreat(){if(!R||R.mode!=='boss')return false;bossFlee(true);return true;} // repli volontaire : on retourne farmer l'étape précédente
function challengeBoss(){if(!R||R.mode!=='farm'||!S.run.fled)return false;S.run.fled=false;R.mode='boss';R.bossT=CFG.enemy.bossTime;R.E=enemyFor(S.run.stage);R.E.atkT=CFG.enemy.atkEvery;hooks.bossStart(R.E);return true;}
/* ---------- Titan ---------- */
const TITAN_DAYS={get 0(){return dayName(0)},get 1(){return dayName(1)},get 2(){return dayName(2)},get 3(){return dayName(3)},get 4(){return dayName(4)},get 5(){return dayName(5)},get 6(){return dayName(6)}};
const dayName=i=>(I18N[LANG]._days||I18N.fr._days)[i];
const isTitanDay=(t=Date.now())=>CFG.titan.days.includes(new Date(t).getDay());
function nextTitanDay(t=Date.now()){for(let k=1;k<=7;k++){const d=new Date(t);d.setDate(d.getDate()+k);if(isTitanDay(d.getTime()))return TITAN_DAYS[d.getDay()];}return '';}
function titanState(){roll();if(!S.titan||S.titan.k!==dayKey())S.titan={k:dayKey(),used:0,ad:0,gem:0};return S.titan;}
const titanTickets=()=>{const t=titanState();return CFG.titan.free+(S.up.au_titan||0)+t.ad+t.gem-t.used;};
const titanReady=()=>isTitanDay()&&titanTickets()>0;
function titanAdTicket(){const t=titanState();if(t.ad>=1)return false;t.ad++;return true;}
function titanGemTicket(){const t=titanState();if(t.gem>=1||S.gems<CFG.titan.ticketGems)return false;S.gems-=CFG.titan.ticketGems;t.gem++;return true;}
function startTitan(){if(!R||R.mode!=='farm'||!titanReady())return false;R.saved=R.E;R.E=titanEnemy();R.mode='titan';R.titanT=CFG.titan.time;R.titanDmg=0;titanState().used++;S.st.titans++;S.day.titans++;S.week.titans++;return true;}
function endTitan(){const d=Math.floor(R.titanDmg);S.week.best+=d;if(d>S.st.titanBest)S.st.titanBest=d;R.E=R.saved||enemyFor(S.run.stage);R.mode='farm';hooks.titanEnd(d);}
/* ---------- prestige ---------- */
const prestigeGain=()=>S.run.max>=CFG.prestige.minStage?Math.floor(CFG.prestige.shards(S.run.max)*lootMult()):0;
function doPrestige(){
  const g=prestigeGain();if(!g)return 0;
  S.prestiges++;S.pp=(S.pp||0)+ppGain(S.run.max);roll();S.day.prestiges++;S.week.prestiges++;
  S.run={sparks:g+50*Math.pow(2.2,S.up.st_bank)*(S.up.st_bank?1:0),stage:1,tb:{cad:0,birth:0,auto:0,power:0,spark:0},max:1,fled:false,fledAt:0,rate:0,srate:0,krate:0};
  S.run.cells=null;if(R){R.cells.fill(null);R.mode='farm';R.E=enemyFor(1);R.combo=0;R.burn=null;R.dmgWin=[];R.sparkWin=[];R.baseWin=[];R.killWin=[];for(let i=0;i<3;i++)spawnOne();}
  hooks.prestige(g);return g;
}
function maybeAutoPrestige(){const g=prestigeGain(),thr=[1,0.5,0.25,0.1,0.05][Math.min(S.up.au_prestige-1,4)];if(g>0&&g>=Math.max(50,S.run.sparks*thr))doPrestige();}
/* ---------- hors-ligne ---------- */
function offlineGains(now=Date.now()){
  const el=(now-S.lastSeen)/1000;if(el<30)return null;
  const capS=(2+S.up.off)*3600,sec=Math.min(el,capS);
  const sparks=Math.floor((S.run.srate||0)*sec*CFG.offline.factor);
  let stages=0;if(S.up.au_exped&&S.run.krate){const expS=Math.min(el,2*S.up.au_exped*3600);stages=Math.floor(S.run.krate*expS*0.5);
    const maxAdv=Math.max(0,(Math.floor((S.run.stage-1)/10)+1)*10-1-S.run.stage); // jamais au-delà du prochain boss
    stages=Math.min(stages,maxAdv);}
  return {sec,sparks,stages,elapsed:el};
}
function applyOffline(o,mult=1){S.run.sparks+=o.sparks*mult;if(o.stages){S.run.stage+=o.stages;S.run.max=Math.max(S.run.max,S.run.stage);S.maxStage=Math.max(S.maxStage,S.run.stage);S.bestStage=Math.max(S.bestStage,S.run.stage);if(R){R.E=enemyFor(S.run.stage);}}}
/* ---------- jokers ---------- */
function placeJokerPiece(){if(R.cells.filter(c=>c&&c.k==='joker').length>=3)return -1;let e=emptyCells();let i;if(e.length)i=e[Math.floor(Math.random()*e.length)];else{i=R.cells.reduce((m,c,j)=>c&&c.l&&(m<0||c.l<R.cells[m].l)?j:m,-1);if(i<0)return -1;}R.cells[i]={k:'joker'};hooks.spawn(i);return i;}
function useJoker(id){
  if(!R||R.jk[id]==null||R.jk[id]<jokerNeed(id))return false;
  const l=S.jk[id]||1;R.jk[id]=0;S.st.jokerUses++;roll();S.day.jokers++;
  if(id==='chameleon'){placeJokerPiece();if(l>=4)placeJokerPiece();}
  else if(id==='magnet'){let n=2+l;while(n-->0){if(!autoMerge())break;}}
  else if(id==='surge'){R.surgeUntil=R.t+6+2*l;}
  else if(id==='frost'){R.frostUntil=R.t+8+2*l;if(R.mode==='boss')R.bossT+=4+l;}
  else if(id==='prism'){shapes().sort((a,b)=>a[0].l-b[0].l).slice(0,2+l).forEach(([c,i])=>{c.l++;hooks.spawn(i);});}
  else if(id==='meteor'){const best=Math.max(spawnLevel(),...shapes().map(x=>x[0].l));applyDamage(null,dmgOf(best+2)*(1+0.5*(l-1))*powerMult(),false,null);}
  else if(id==='breaker'){R.breakUntil=R.t+8+3*l;}
  hooks.joker(id);return true;
}

/* ================= forme du joueur ================= */
const TIERS={length:10};for(let i=0;i<10;i++)Object.defineProperty(TIERS,i,{get(){return t('tier'+i)}});
function tierOf(stage){const k=Math.floor((stage-1)/10);return k>=TIERS.length?{sides:0,name:t('circle')}:{sides:3+k,name:TIERS[k]};}
const layers=()=>Math.min(5,Math.floor((S.bestStage-1)/10));

/* ================= quêtes ================= */
const DPOOL=[
  {k:'q_kill',a:{n:20},v:()=>S.day.kills,n:20,r:{g:10}},
  {k:'q_merge',a:{n:200},v:()=>S.day.merges,n:200,r:{s:80}},
  {k:'q_ad',v:()=>S.day.ads,n:1,r:{b:1}},
  {k:'q_boss1',v:()=>S.day.bosses,n:1,r:{g:10}},
  {k:'q_tb',a:{n:15},v:()=>S.day.tb||0,n:15,r:{g:10}},
  {k:'q_gift',a:{n:2},v:()=>S.day.gifts||0,n:2,r:{s:60}},
  {k:'q_jok3',v:()=>S.day.jokers,n:3,r:{s:150}},
  {k:'q_combo',a:{n:8},v:()=>S.day.combo,n:8,r:{b:1}},
  {k:'q_pre1',v:()=>S.day.prestiges,n:1,r:{g:15}},
  {k:'q_kill',a:{n:60},v:()=>S.day.kills,n:60,r:{s:300}},
].map(q=>Object.assign(q,{get t(){return t(q.k,q.a)}}));
const dayHash=k=>{let h=0;for(const ch of k)h=(h*31+ch.charCodeAt(0))>>>0;return h;};
let DAILY=[];
function pickDaily(){const h=dayHash(S.day.k),base=DPOOL.slice(0,4),extra=DPOOL.slice(4);const a=base[h%4],b=base[(h>>2)%4]===a?base[(h%4+1)%4]:base[(h>>2)%4];
  DAILY=[a,b,extra[h%extra.length],{get t(){return t('q_bonus')},v:()=>DAILY.slice(0,3).every(q=>q.v()>=q.n)?1:0,n:1,r:{g:15}}];}
const WEEKLY=[
  {k:'q_kill',a:{n:300},v:()=>S.week.kills,n:300,r:{g:50}},
  {k:'q_titan4',v:()=>S.week.titans,n:4,r:{b:4}},
  {k:'q_top10',v:()=>myRank()<=10?1:0,n:1,r:{g:30}},
  {k:'q_pre3',v:()=>S.week.prestiges,n:3,r:{s:2000}},
].map(q=>Object.assign(q,{get t(){return t(q.k,q.a)}}));
const bossTotal=()=>S.st.bosses;
const jokersOwned=()=>Object.keys(S.jk).length;
const maxJokerLvl=()=>Math.max(0,...Object.values(S.jk));
const Q=(k,v,n,r,a)=>({k,a,v,n,r,get t(){return t(k,a)}});
const ONB=[
  Q('o1',()=>S.st.manual,10,{g:10}),
  Q('q_kill',()=>S.st.kills,3,{sp:100},{n:3}),
  Q('o3',()=>Object.values(S.run.tb).reduce((a,b)=>a+b,0)+S.prestiges*5,1,{s:50}),
  Q('o4',()=>S.bestStage,5,{g:10},{n:5}),
  Q('o5',()=>S.st.started,1,{s:100}),
  Q('o6',()=>S.bestStage,6,{sp:400}),
  Q('o7',()=>S.st.gifts||0,1,{g:10}),
  Q('o4',()=>S.bestStage,10,{g:20},{n:10}),
  Q('o9',bossTotal,1,{s:300}),
  Q('o10',()=>S.prestiges,1,{g:30,b:2}),
  Q('o11',()=>S.st.bought,3,{s:200},{n:3}),
  Q('o12',()=>Math.max(S.run.tb.auto,S.up.st_auto,S.up.au_merge),1,{g:20}),
  Q('o13',()=>S.st.titans,1,{g:15}),
  Q('o14',jokersOwned,1,{sp:2000}),
  Q('o15',()=>S.st.maxCombo,10,{g:15}),
  Q('o4',()=>S.bestStage,20,{s:800},{n:20}),
  Q('o17',()=>S.prestiges,3,{g:25},{n:3}),
  Q('o18',()=>S.up.st_power,5,{s:1500}),
  Q('q_kill',()=>S.st.kills,100,{b:2},{n:100}),
  Q('o20',()=>S.st.days,2,{g:20},{n:2}),
  Q('o4',()=>S.bestStage,30,{s:3000},{n:30}),
  Q('o11',()=>S.st.bought,12,{g:30},{n:12}),
  Q('o23',()=>S.up.au_buy,1,{g:40}),
  Q('o24',()=>S.st.jokerUses,15,{s:4000}),
  Q('o17',()=>S.prestiges,6,{g:30},{n:6}),
  Q('o26',bossTotal,5,{s:6000},{n:5}),
  Q('o20',()=>S.st.days,3,{b:4},{n:3}),
  Q('o4',()=>S.bestStage,40,{g:40},{n:40}),
  Q('o29',jokersOwned,2,{s:10000},{n:2}),
  Q('o30',()=>S.st.titanBest,1e6,{g:30},{n:fmt(1e6)}),
  Q('o31',()=>S.up.au_joker,1,{g:50}),
  Q('o11',()=>S.st.bought,25,{s:20000},{n:25}),
  Q('o17',()=>S.prestiges,10,{g:40},{n:10}),
  Q('q_kill',()=>S.st.kills,500,{b:6},{n:500}),
  Q('o4',()=>S.bestStage,50,{s:40000},{n:50}),
  Q('o20',()=>S.st.days,5,{g:40},{n:5}),
  Q('o37',()=>S.up.au_exped,1,{g:60}),
  Q('o38',maxJokerLvl,3,{s:60000}),
  Q('o29',jokersOwned,4,{g:60},{n:4}),
  Q('o26',bossTotal,10,{s:100000},{n:10}),
  Q('o4',()=>S.bestStage,60,{g:60},{n:60}),
  Q('o42',()=>S.up.au_prestige,1,{g:80}),
  Q('o11',()=>S.st.bought,40,{s:200000},{n:40}),
  Q('o30',()=>S.st.titanBest,1e8,{b:8},{n:fmt(1e8)}),
  Q('o17',()=>S.prestiges,20,{g:60},{n:20}),
  Q('o20',()=>S.st.days,7,{g:80,b:8},{n:7}),
  Q('o4',()=>S.bestStage,75,{s:500000},{n:75}),
  Q('o26',bossTotal,20,{g:80},{n:20}),
  Q('o11',()=>S.st.bought,60,{s:1000000},{n:60}),
  Q('o4',()=>S.bestStage,100,{g:200,b:12},{n:100}),
];
function questView(){
  roll();
  const mk=(arr,claimed,kind)=>arr.map((q,i)=>({i,kind,t:q.t,p:Math.min(q.v(),q.n),n:q.n,r:q.r,done:claimed.includes(i)}));
  const onb=mk(ONB,S.onb,'o').filter(q=>!q.done).slice(0,3);
  return {onb,onbLeft:ONB.length-S.onb.length,d:mk(DAILY,S.day.claimed,'d'),w:mk(WEEKLY,S.week.claimed,'w')};
}
function claim(kind,i){
  roll();const arr={o:ONB,d:DAILY,w:WEEKLY}[kind],cl={o:S.onb,d:S.day.claimed,w:S.week.claimed}[kind];
  const q=arr[i];if(!q||cl.includes(i)||q.v()<q.n)return false;
  if(kind==='o'){const vis=ONB.map((_,j)=>j).filter(j=>!S.onb.includes(j)).slice(0,3);if(!vis.includes(i))return false;}
  cl.push(i);give(q.r);return true;
}
const claimable=()=>{const v=questView();return v.onb.concat(v.d,v.w).some(q=>!q.done&&q.p>=q.n);};

/* ================= ligue simulée ================= */
function ensureLeague(){
  roll();if(S.league&&S.league.k===S.week.k)return;
  const base=Math.max(S.st.titanBest*0.8,2000);
  S.league={k:S.week.k,start:Date.now(),base,div:'Bronze',bots:Array.from({length:29},()=>({name:randomName(),k:Math.exp(rnd(-1.3,1.1)),ph:rnd(0,6.28),sides:3+Math.floor(rnd(0,8)),hue:Math.floor(rnd(0,360))}))};
}
function standings(){
  ensureLeague();const el=(Date.now()-S.league.start)/1000;const g=Math.min(1,0.25+el/(3*86400));
  const rows=S.league.bots.map(b=>({name:b.name,score:Math.floor(S.league.base*b.k*g*(1+0.08*Math.sin(el/3600+b.ph))*(1+el/86400)),sides:b.sides,hue:b.hue}));
  rows.push({name:S.name,score:S.week.best,sides:tierOf(S.bestStage).sides,me:true});
  rows.sort((a,b)=>b.score-a.score||(a.me?1:-1));return rows;
}
const myRank=()=>standings().findIndex(r=>r.me)+1;

/* ================= pseudo, boutique ================= */
const RENAME=30;
function rename(raw){const c=checkName(raw);if(!c.ok)return c;if(S.nameChanges>0){if(S.gems<RENAME)return {ok:false,msg:t('name_cost',{n:RENAME})};S.gems-=RENAME;}S.nameChanges++;S.name=c.name;S.flagged=0;return {ok:true};}
function reportMe(){S.flagged++;if(S.flagged>=3){S.name=randomName();S.flagged=0;return 'reset';}return 'noted';}
const OFFERS=[
  {id:'starter',price:1.99,once:()=>S.starter,give(){give({g:150,b:6});S.starter=true;},get t(){return t('of_starter')},get d(){return t('of_starter_d')}},
  {id:'loot',price:4.99,once:()=>S.lootX2,give(){S.lootX2=true;},get t(){return t('of_loot')},get d(){return t('of_loot_d')}},
  {id:'noads',price:3.99,once:()=>S.noAds,give(){S.noAds=true;},get t(){return t('of_noads')},get d(){return t('of_noads_d')}},
  {id:'g80',price:0.99,n:80,give(){S.gems+=80;},get t(){return t('of_gems',{n:grp(80)})},get d(){return t('of_small')}},
  {id:'g500',price:4.99,n:500,give(){S.gems+=500;},get t(){return t('of_gems',{n:grp(500)})},get d(){return t('of_more',{n:25})}},
  {id:'g1200',price:9.99,n:1200,give(){S.gems+=1200;},get t(){return t('of_gems',{n:grp(1200)})},get d(){return t('of_more',{n:50})}},
  {id:'g2600',price:19.99,n:2600,give(){S.gems+=2600;},get t(){return t('of_gems',{n:grp(2600)})},get d(){return t('of_more',{n:60})}},
  {id:'g7000',price:49.99,n:7000,give(){S.gems+=7000;},get t(){return t('of_gems',{n:grp(7000)})},get d(){return t('of_more',{n:75})}},
  {id:'g15000',price:99.99,n:15000,give(){S.gems+=15000;},get t(){return t('of_gems',{n:grp(15000)})},get d(){return t('of_big')}},
];
/* prix affichés : devise locale de démonstration (dans l'app réelle, le store fournit le prix) */
const CUR={fr:'EUR',de:'EUR',es:'EUR',it:'EUR',pt:'EUR',en:'USD',ja:'JPY',ko:'KRW',zh:'CNY',ru:'RUB',tr:'TRY',pl:'PLN',id:'IDR',hi:'INR',ar:'USD',nl:'EUR',sv:'SEK'};
const RATE={EUR:1,USD:1,JPY:150,KRW:1400,CNY:7.5,RUB:100,TRY:35,PLN:4.3,IDR:16000,INR:85,SEK:11.5};
function priceOf(o){const cur=CUR[LANG]||'USD',v=o.price*(RATE[cur]||1);try{return new Intl.NumberFormat(LANG,{style:'currency',currency:cur,maximumFractionDigits:cur==='JPY'||cur==='KRW'||cur==='IDR'?0:2}).format(cur==='JPY'||cur==='KRW'||cur==='IDR'?Math.round(v/10)*10-1:v);}catch(e){return o.price+' €';}}
function purchase(id){const o=OFFERS.find(x=>x.id===id);if(!o||(o.once&&o.once()))return false;o.give();return true;}
function buyGemItem(id){
  if(id==='boost'){if(S.gems<CFG.boost.gemsPrice)return false;S.gems-=CFG.boost.gemsPrice;give({b:CFG.boost.gemsH});return true;}
  if(id==='titan')return titanGemTicket();
  return false;
}
function buySkin(id){const k=SKINS.find(s=>s.id===id);if(S.skins.includes(id)){S.skin=id;return true;}if(S.gems<k.price)return false;S.gems-=k.price;S.skins.push(id);S.skin=id;return true;}
