/* ================= Prisme Fusion — noyau serveur partagé =================
   Le même moteur de règles (v7_engine.js) tourne sur le téléphone et sur le serveur.
   Ce module instancie le moteur dans un bac à sable avec l'heure du serveur, applique
   les actions du joueur et vérifie la plausibilité de ce que le téléphone a simulé.
   Aucune dépendance au DOM ni à Supabase : utilisable dans Node (tests), Deno (Edge) et Playwright. */
const PF_TAIL=`
return {get S(){return S},set S(v){S=v},get R(){return R},set TZOFF(v){TZOFF=v},CFG,UPG,ALLUP,JOKERS,SKINS,OFFERS,ONB,get DAILY(){return DAILY},WEEKLY,LOGIN,
fresh,migrate,roll,give,giftRoll,giftTake,adSparks,packSparks,buyPack,rateMin,loginState,claimLogin,upById,lvlOf,upCost,upTime,upLocked,inBuild,tickBuild,startBuild,rushBuild,rushGems,adBuild,buySlot,buyJSlot,
jokerById,jokerAvail,unlockJoker,toggleEquip,tbLvl,buyWP,wpCost,wpLvl,resetWP,ppGain,refMult,sparkMult,lootMult,prestigeGain,doPrestige,isTitanDay,titanState,titanTickets,titanReady,titanAdTicket,titanGemTicket,
offlineGains,applyOffline,questView,claim,guildQuests,guildQuestDone,guildClaimable,guildReward,rename,checkName,randomName,purchase,buyGemItem,buySkin,dayKey,weekKey,boosted,setLang,get LANG(){return LANG}};`;

function pfMakeEngine(src,nowMs){
  const code=src+'\n'+PF_TAIL;
  const now=()=>nowMs;
  const DateP=new Proxy(Date,{construct(T,a){return a.length?new T(...a):new T(now());},get(T,k){return k==='now'?now:T[k];},apply(T){return new T(now()).toString();}});
  const storage={getItem(){return null;},setItem(){},removeItem(){}};
  return new Function('Date','localStorage','cell','document','window','navigator',code)(DateP,storage,60,{documentElement:{},getElementById(){return null;}},undefined,{languages:['fr'],onLine:true});
}

/* ---- plausibilité : bornes supérieures généreuses de ce qu'un joueur peut produire ---- */
function pfMaxSparkPerSec(G){
  const S=G.S,C=G.CFG,st=Math.max(1,S.run.stage|0);
  const L=1+(S.run.tb.birth|0)+(S.up.st_birth|0)+10;                       // niveau de gemme plausible
  const sm=Math.pow(1.08,(S.run.tb.spark|0)+(S.up.st_spark|0))*Math.pow(1.1,S.up.spark|0)*2*(1+C.prestige.mult*(S.prestiges|0));
  const kill=(C.sparks.kill(st)*5*(1+0.15*(S.up.killspark|0))*sm+4*st*(1+0.08*(S.up.loot|0)))*0.5; // ≤ 1 ennemi / 2 s, compté comme boss
  const merge=3*0.15*L*2*sm;                                                  // ≤ 3 fusions manuelles / s
  const star=3*0.15*L*(1+0.5*(L/8))*(1+0.2*8)*sm*0.3;                          // étoiles
  return (kill+merge+star)*1.5+2;
}
/* dégâts par seconde plausibles et étape maximale atteignable en dt secondes (joueur parfait, boosters au maximum) */
function pfMaxDps(G,dt){
  const S=G.S,C=G.CFG,N=4+(S.up.board|0);
  const L=1+(S.run.tb.birth|0)+(S.up.st_birth|0)+2+Math.log2(1+Math.max(1,dt)*1.5); // niveau de gemme plausible après dt s de fusions (boosters vérifiés)
  const pm=Math.pow(1.12,(S.run.tb.power|0)+(S.up.st_power|0))*Math.pow(1.1,S.up.power|0)*2;
  const wp=1+0.08*8*Math.max(0,...Object.values(S.wp||{}).map(x=>x|0),0);
  const fr=(1+0.05*(S.up.cadence|0))*(1+(0.05+0.01*(S.up.combo|0))*30)*2/0.55;
  const crit=1+0.02*(S.up.crit|0)*2+0.5; // critiques + aura, généreux
  return N*N*Math.pow(C.dmg.base,L-1)*1.1*pm*wp*fr*crit*Math.pow(1.15,S.up.bossdmg|0)*3; // ×3 : brûlure, météore, marge
}
function pfMaxStage(G,from,dt){const C=G.CFG,dps=pfMaxDps(G,dt);let n=from,t=0;while(n<from+5000){const need=C.enemy.hp(n)/dps+0.4;if(t+need>dt)break;t+=need;n++;}return Math.max(from+1,n);}
const pfNum=(v,d=0)=>typeof v==='number'&&isFinite(v)?v:d;
const pfInt=(v,lo,hi,d)=>Number.isInteger(v)?Math.min(hi,Math.max(lo,v)):d;

/* fusionne ce que le téléphone a simulé (étincelles, étape, compteurs) sous contrôle de plausibilité */
function pfMergeSim(G,sim,dt,anomalies){
  if(!sim||typeof sim!=='object')return;
  const S=G.S,C=G.CFG,r=sim.run||{};
  dt=Math.max(0,dt);
  // boosters temporaires : leur coût cumulé entre deux contacts fait partie des étincelles « gagnées » à justifier
  const tbCost=tb=>{let c=0;for(const k in C.tb){const n=tb[k]|0,{c0,g}=C.tb[k];c+=c0*(Math.pow(g,n)-1)/(g-1);}return c;};
  const oldTb=Object.assign({},S.run.tb);let newTb=Object.assign({},oldTb);
  if(r.tb)for(const k in C.tb)newTb[k]=pfInt(r.tb[k],0,C.tb[k].max,oldTb[k]);
  const capGain=pfMaxSparkPerSec(G)*dt+100;let dTb=Math.max(0,tbCost(newTb)-tbCost(oldTb));
  if(dTb>capGain+S.run.sparks){anomalies.push('tb');newTb=oldTb;dTb=0;}
  S.run.tb=newTb;
  if(typeof r.sparks==='number'&&isFinite(r.sparks)){const earned=(r.sparks-S.run.sparks)+dTb;if(earned>capGain){anomalies.push('sparks');S.run.sparks=Math.max(0,S.run.sparks+capGain-dTb);}else S.run.sparks=Math.max(0,r.sparks);}
  if(Number.isInteger(r.stage)&&r.stage>=1){const cap=Math.min(S.run.stage+1+Math.floor(dt*2),pfMaxStage(G,S.run.stage,dt));if(r.stage>cap){anomalies.push('stage');S.run.stage=cap;}else S.run.stage=r.stage;}
  S.run.max=Math.max(S.run.max||1,S.run.stage);S.maxStage=Math.max(S.maxStage||1,S.run.stage);S.bestStage=Math.max(S.bestStage||1,S.run.stage);
  S.run.fled=!!r.fled;
  if(Array.isArray(r.cells)&&r.cells.length<=49&&r.cells.every(v=>v==='j'||v===0||(Number.isInteger(v)&&Math.abs(v)<=60)))S.run.cells=r.cells;
  const cap=pfMaxSparkPerSec(G);S.run.brate=Math.min(pfNum(r.brate),cap);S.run.srate=Math.min(pfNum(r.srate),cap*2);S.run.krate=Math.min(pfNum(r.krate),1);
  const up=(o,k,v,hi)=>{if(Number.isInteger(v)&&v>=(o[k]|0)){if(v>hi){anomalies.push(k);o[k]=Math.floor(hi);}else o[k]=v;}};
  const st=sim.st||{},d=sim.day||{},w=sim.week||{};
  up(S.st,'merges',st.merges,(S.st.merges|0)+3*dt+30);up(S.st,'manual',st.manual,S.st.merges);up(S.st,'kills',st.kills,(S.st.kills|0)+dt/1.5+10);up(S.st,'bosses',st.bosses,Math.floor((S.st.kills|0)/5)+2);
  up(S.st,'jokerUses',st.jokerUses,(S.st.jokerUses|0)+dt/5+5);if(Number.isInteger(st.maxCombo))S.st.maxCombo=Math.min(30,Math.max(S.st.maxCombo|0,st.maxCombo));
  if(Number.isInteger(st.tuto))S.st.tuto=Math.min(3,Math.max(S.st.tuto|0,st.tuto));if(typeof st.namePrompted==='boolean')S.st.namePrompted=st.namePrompted;if(Number.isInteger(st.hintW))S.st.hintW=Math.min(9,Math.max(0,st.hintW));
  up(S.day,'merges',d.merges,(S.day.merges|0)+3*dt+30);up(S.day,'kills',d.kills,(S.day.kills|0)+dt/1.5+10);up(S.day,'bosses',d.bosses,Math.floor((S.day.kills|0)/5)+2);
  up(S.day,'tb',d.tb,(S.day.tb|0)+Object.values(S.run.tb).reduce((a,b)=>a+b,0)+5);up(S.day,'jokers',d.jokers,(S.day.jokers|0)+dt/5+5);if(Number.isInteger(d.combo))S.day.combo=Math.min(30,Math.max(S.day.combo|0,d.combo));
  up(S.week,'kills',w.kills,(S.week.kills|0)+dt/1.5+10);
  if(sim.bestiary&&typeof sim.bestiary==='object'&&Object.keys(sim.bestiary).length<=300){const b={};for(const k in sim.bestiary){if(/^\d+$/.test(k)&&Number.isInteger(sim.bestiary[k]))b[k]=sim.bestiary[k];}S.bestiary=Object.assign(S.bestiary||{},b);}
  if(sim.settings&&typeof sim.settings==='object')for(const k of ['music','sound','fx'])if(typeof sim.settings[k]==='boolean')S.settings[k]=sim.settings[k];
  if(sim.league&&typeof sim.league==='object'&&!S.league)S.league=sim.league; // classement simulé (hors ligne) : décoratif
}

/* ---- une requête = état d'entrée + action → état de sortie + résultat ---- */
const PF_ACTIONS=new Set(['hello','sync','build','rush','adbuild','slot','jslot','wp','wpreset','joker','equip','pack','gift_offer','ad','claim','login','prestige','titan_gem','titan_start','titan_end','purchase','gemitem','skin','rename','league','offline_x2','report','gquest','guild_pay','guild_reward']);
function pfApply(src,stateIn,body,nowMs,trusted){
  const G=pfMakeEngine(src,nowMs);
  const anomalies=[],res={ok:true};
  if(typeof body.lang==='string')try{G.setLang(body.lang.slice(0,2));}catch(e){}
  let S=stateIn&&stateIn.v===3?G.migrate(Object.assign(G.fresh(),stateIn)):G.fresh();
  if(!(stateIn&&stateIn.v===3))res.created=true;
  // sous-objets manquants (anciennes versions)
  const f=G.fresh();for(const k of ['up','st','settings','run','day','week','login','wp'])S[k]=Object.assign({},f[k],S[k]||{});S.run.tb=Object.assign({},f.run.tb,S.run.tb||{});
  G.S=S;
  if(Number.isInteger(body.tz)&&Math.abs(body.tz)<=840){S.tz=body.tz;}G.TZOFF=Number.isInteger(S.tz)?S.tz:0;
  const action=String(body.action||'sync'),p=body.payload||{};
  if(!PF_ACTIONS.has(action))return {state:S,result:{ok:false,err:'action'},anomalies};
  G.roll();
  const last=S.lastSeen||nowMs,dt=Math.max(0,(nowMs-last)/1000);
  const off=action==='hello'?G.offlineGains(nowMs):null; // réveil : hors-ligne calculé par le serveur, au débit mémorisé à la fermeture
  pfMergeSim(G,body.sim,dt,anomalies); // ce que le téléphone a simulé depuis le dernier contact, borné
  if(off&&(off.sparks>0||off.stages>0)){G.applyOffline(off,1);S.pendingOff={sparks:off.sparks,stages:off.stages,at:nowMs};res.offline=off;}
  G.tickBuild(nowMs);
  const need=(cond,err)=>{if(!cond){res.ok=false;res.err=err;}return cond;};
  switch(action){
    case 'hello':case 'sync':break;
    case 'build':{const r=G.startBuild(String(p.id),nowMs);res.ok=r==='ok';if(!res.ok)res.err=r;break;}
    case 'rush':res.ok=G.rushBuild(String(p.id),nowMs);if(!res.ok)res.err='rush';break;
    case 'adbuild':if(need(pfAdOK(S,'build',nowMs,15),'cooldown')){res.ok=G.adBuild(String(p.id),nowMs);S.day.ads=(S.day.ads|0)+1;}break;
    case 'slot':res.ok=G.buySlot();if(!res.ok)res.err='slot';break;
    case 'jslot':res.ok=G.buyJSlot();if(!res.ok)res.err='jslot';break;
    case 'wp':{const i=pfInt(p.i,0,7,-1);res.ok=i>=0&&G.buyWP(i);if(!res.ok)res.err='pp';break;}
    case 'wpreset':res.ok=G.resetWP();if(!res.ok)res.err='gems';break;
    case 'joker':res.ok=G.unlockJoker(String(p.id),p.cur==='g'?'g':'s');if(!res.ok)res.err='joker';break;
    case 'equip':res.ok=G.toggleEquip(String(p.id));if(!res.ok)res.err='equip';break;
    case 'pack':{const r=G.buyPack(pfInt(p.i,0,9,-1));res.ok=r===true;if(!res.ok)res.err=r==='cap'?'cap':'gems';break;}
    case 'gift_offer':{ // le serveur tire le cadeau et le date ; le téléphone ne fait qu'afficher
      const C=G.CFG.gift;if(S.gift&&nowMs-S.gift.at<(C.show+5)*1000){res.gift=S.gift;break;}
      if(S.giftAt&&nowMs<S.giftAt){res.ok=false;res.err='wait';res.wait=Math.ceil((S.giftAt-nowMs)/1000);break;}
      const g=G.giftRoll();S.gift={k:g.k,v:g.v,at:nowMs};S.giftAt=nowMs+(C.every[0]+Math.random()*(C.every[1]-C.every[0]))*1000;res.gift=S.gift;break;}
    case 'ad':{const kind=String(p.kind);
      if(kind==='gift'){if(need(S.gift&&nowMs-S.gift.at<(G.CFG.gift.show+150)*1000,'nogift')){const gf=S.gift;S.gift=null;G.giftTake(gf);res.gift=gf;}}
      else if(kind==='shop'){if(need(pfAdOK(S,'shop',nowMs,40),'cooldown')){const v=G.adSparks('shop');S.run.sparks+=v;S.day.ads=(S.day.ads|0)+1;res.sparks=v;}}
      else if(kind==='boost'){if(need(pfAdOK(S,'boost',nowMs,40),'cooldown')){G.give({b:G.CFG.boost.adH});S.day.ads=(S.day.ads|0)+1;}}
      else if(kind==='titan'){res.ok=G.titanAdTicket();if(res.ok)S.day.ads=(S.day.ads|0)+1;else res.err='ticket';}
      else if(kind==='offline'){if(need(S.pendingOff&&nowMs-S.pendingOff.at<600e3,'nooff')){S.run.sparks+=S.pendingOff.sparks;res.sparks=S.pendingOff.sparks;S.pendingOff=null;S.day.ads=(S.day.ads|0)+1;}}
      else{res.ok=false;res.err='kind';}
      break;}
    case 'offline_x2':res.ok=false;res.err='use ad';break;
    case 'claim':res.ok=G.claim(String(p.kind),pfInt(p.i,0,99,-1));if(!res.ok)res.err='claim';break;
    case 'login':res.ok=G.claimLogin();if(!res.ok)res.err='claimed';break;
    case 'prestige':{const g=G.doPrestige();res.ok=g>0;res.gain=g;if(!res.ok)res.err='stage';break;}
    case 'titan_gem':res.ok=G.titanGemTicket();if(!res.ok)res.err='gems';break;
    case 'titan_start':if(need(G.titanReady(),'ticket')&&need(!S.titanRun||nowMs-S.titanRun.at>120e3,'running')){G.titanState().used++;S.st.titans=(S.st.titans|0)+1;S.day.titans=(S.day.titans|0)+1;S.week.titans=(S.week.titans|0)+1;S.titanRun={at:nowMs};}break;
    case 'titan_end':{const sc=Math.floor(pfNum(p.score));const cap=Math.min(1e6*Math.pow(1.9,Math.min(400,S.bestStage|0)),pfMaxDps(G,G.CFG.titan.time)*G.CFG.titan.time*3);
      if(need(S.titanRun&&nowMs-S.titanRun.at<(G.CFG.titan.time+90)*1000,'norun')&&need(sc>=0&&sc<=cap,'implausible')){S.titanRun=null;S.week.best=(S.week.best|0)+sc;if(sc>(S.st.titanBest|0))S.st.titanBest=sc;res.effects=[{titan:sc,best:S.bestStage}];}
      if(res.err==='implausible'){anomalies.push('titan');S.titanRun=null;}break;}
    case 'purchase':if(need(trusted||body.demo===true,'store')){res.ok=G.purchase(String(p.id));if(!res.ok)res.err='owned';}break;
    case 'gemitem':res.ok=G.buyGemItem(String(p.id));if(!res.ok)res.err='gems';break;
    case 'skin':res.ok=G.buySkin(String(p.id));if(!res.ok)res.err='gems';break;
    case 'rename':{const r=G.rename(String(p.name||''));res.ok=!!r.ok;if(!r.ok)res.err=r.msg||'name';else res.effects=[{name:S.name}];break;}
    case 'report':res.effects=[{report:String(p.target||'')}];break;
    case 'gquest':{const i=pfInt(p.i,0,99,-1);const pts=i>=0?G.guildQuestDone(i):0;if(pts>0){res.pts=pts;res.effects=[{gpts:pts,i}];}else{res.ok=false;res.err='quest';}break;}
    case 'guild_pay':if(need(trusted,'trusted')){const g=pfInt(p.gems,0,500,0);if(need(S.gems>=g,'gems'))S.gems-=g;}break;
    case 'guild_reward':if(need(trusted,'trusted')){const r=G.guildReward(pfInt(p.tier,1,9,0));if(need(!!r,'tier')){S.gems+=r.g;S.run.sparks+=r.sparks;if(r.b)G.give({b:r.b});res.reward=r;}}break;
    case 'league':if(need(trusted,'trusted')){const gems=pfInt(p.gems,0,1000,0),minutes=pfInt(p.minutes,0,1000,0);const sp=Math.max(G.CFG.ads.floor.shop,Math.floor(G.rateMin()*minutes));S.gems+=gems;S.run.sparks+=sp;res.gems=gems;res.sparks=sp;}break;
  }
  S.lastSeen=nowMs;if(anomalies.length)S.anom=(S.anom|0)+anomalies.length;
  return {state:S,result:res,anomalies};
}
const pfLeagueMinutes=r=>r===1?120:r<=3?60:r<=5?45:r<=15?30:r<=25?15:10;
function pfAdOK(S,kind,nowMs,gapS){S.adAt=S.adAt||{};const last=S.adAt[kind]||0;if(nowMs-last<gapS*1000)return false;S.adAt[kind]=nowMs;return true;}

if(typeof module!=='undefined')module.exports={pfMakeEngine,pfApply,pfMergeSim,pfMaxSparkPerSec,pfMaxDps,pfMaxStage,pfLeagueMinutes,PF_TAIL};
