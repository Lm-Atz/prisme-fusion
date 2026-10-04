// Le joueur honnête (bot du simulateur, profil très actif) ne doit jamais déclencher d'anomalie de plausibilité.
const fs=require('fs');const {pfApply,pfMergeSim,pfMakeEngine}=require('./pf_core.js');const src=require('./pf_src.js')();
let NOW=Date.UTC(2026,9,5,8,0,0);
const G=pfMakeEngine(src,0);Object.defineProperty(G,'now',{value:()=>NOW});
// moteur de jeu "téléphone" avec horloge virtuelle
const code=src+`\nreturn {get S(){return S},set S(v){S=v},get R(){return R},CFG,ALLUP,JOKERS,newRun,runTick,runMove,buyTB,tbCost,startBuild,tickBuild,upCost,upLocked,inBuild,lvlOf,doPrestige,prestigeGain,challengeBoss,useJoker,jokerNeed,roll,fresh,unlockJoker,jokerAvail,questView,claim};`;
const DateP=new Proxy(Date,{construct(t,a){return a.length?new t(...a):new t(NOW)},get(t,k){return k==='now'?()=>NOW:t[k]}});
const P=new Function('Date','localStorage','cell','document','window','navigator',code)(DateP,{getItem(){return null},setItem(){}},60,{documentElement:{}},undefined,{languages:['fr']});
let ok=0,ko=0;const T=(n,c)=>{if(c)ok++;else{ko++;console.log('KO',n);}};
const S=()=>P.S;
function mergeOnce(){const R=P.R;const seen={};const cells=R.cells.map((c,i)=>[c,i]).filter(x=>x[0]&&x[0].l&&!x[0].fog).sort((a,b)=>b[0].l-a[0].l);for(const [c,i] of cells){if(seen[c.l]!=null){P.runMove(seen[c.l],i,true);return true;}seen[c.l]=i;}return false;}
function buyAll(){for(let k=0;k<30;k++){let best=null,bc=Infinity;for(const key of ['cad','birth','auto','power','spark']){const c=P.tbCost(key);if(c<bc){bc=c;best=key;}}if(!(best&&P.buyTB(best)))break;}}
function research(){P.tickBuild(NOW);for(const u of P.ALLUP){if(S().build.length>=S().slots)break;if(P.upLocked(u)||P.inBuild(u.id))continue;const c=P.upCost(u);if(isFinite(c)&&c<=S().run.sparks*0.5)P.startBuild(u.id,NOW);}}
// état serveur miroir : on part du même état, puis on envoie la simulation toutes les 30 s
let server=JSON.parse(JSON.stringify(S()));let anomalies=[],syncs=0;
function snapshot(){const s=S();return {run:{sparks:s.run.sparks,stage:s.run.stage,max:s.run.max,tb:s.run.tb,fled:s.run.fled,brate:s.run.brate,srate:s.run.srate,krate:s.run.krate},st:s.st,day:s.day,week:s.week};}
function sync(){const prevServer=JSON.parse(JSON.stringify(server));const r=pfApply(src,server,{action:'sync',sim:snapshot(),tz:120},NOW);server=r.state;syncs++;if(r.anomalies.length){const {pfMaxStage,pfMaxDps,pfMakeEngine:mk}=require('./pf_core.js');const Gs=mk(src,NOW);Gs.S=JSON.parse(JSON.stringify(prevServer));anomalies.push([Math.round((NOW-Date.UTC(2026,9,5,8))/1000),r.anomalies,'phone stage',S().run.stage,'server before',prevServer.run.stage,'cap',pfMaxStage(Gs,prevServer.run.stage,30),'dps',pfMaxDps(Gs,30).toExponential(2),'tb',JSON.stringify(prevServer.run.tb),'up.st_birth',prevServer.up.st_birth,'cells',(S().run.cells||[]).length]);}
  // le serveur fait foi pour les recherches : on recopie up/build côté téléphone (comme le vrai client)
  S().up=JSON.parse(JSON.stringify(server.up));S().build=JSON.parse(JSON.stringify(server.build));}
// mais ici le téléphone lance lui-même les recherches : on les rejoue côté serveur via l'action build
const origStart=P.startBuild;
P.newRun();const dt=0.25;let t=0;
const SESS=3*3600; // 3 h de jeu intensif d'affilée
let lastSync=0;
while(t<SESS){P.runTick(dt);t+=dt;NOW+=dt*1000;
  if(Math.random()<2.5*dt)mergeOnce(); // 2,5 fusions manuelles / s : joueur frénétique
  if(Math.random()<dt)buyAll();
  if(S().run.fled&&P.R.t-S().run.fledAt>30)P.challengeBoss();
  for(const id in P.R.jk)if(P.R.jk[id]>=P.jokerNeed(id))P.useJoker(id);
  if(Math.random()<dt*0.1){ // recherches : décidées côté serveur
    P.tickBuild(NOW);for(const u of P.ALLUP){if(server.build.length>=server.slots)break;if(P.upLocked(u)||P.inBuild(u.id))continue;const c=P.upCost(u);if(isFinite(c)&&c<=S().run.sparks*0.5){const r=pfApply(src,server,{action:'build',payload:{id:u.id},sim:snapshot()},NOW);server=r.state;if(r.result.ok){S().run.sparks=server.run.sparks;S().build=JSON.parse(JSON.stringify(server.build));}if(r.anomalies.length)anomalies.push(['build',r.anomalies]);}}}
  if(t-lastSync>=30){lastSync=t;sync();}
  const g=P.prestigeGain();if(g>0&&P.R.t>1800){const r=pfApply(src,server,{action:'prestige',sim:snapshot()},NOW);server=r.state;if(r.result.ok){P.S=JSON.parse(JSON.stringify(server));P.newRun();}}
}
console.log('étape finale',S().run.stage,'best',S().bestStage,'étincelles',Math.round(S().run.sparks),'syncs',syncs,'recherches',Object.values(S().up).reduce((a,b)=>a+b,0));
T('aucune anomalie pour un joueur honnête très actif',anomalies.length===0);if(anomalies.length)console.log(anomalies.slice(0,8));

// ---- règles unitaires du noyau ----
{const src2=src.replace('days:[2,4,6]','days:[0,1,2,3,4,5,6]');let now=Date.UTC(2026,9,5,8);
 let r=pfApply(src2,null,{action:'hello',lang:'en',tz:120},now);let S=r.state;T('création : 20 gemmes, nom anglais',r.result.created&&S.gems===20&&/^[A-Z]/.test(S.name));
 r=pfApply(src2,S,{action:'sync',sim:{run:{sparks:30,stage:2},st:{merges:10,kills:2}}},now+30000);S=r.state;T('sync plausible acceptée',r.anomalies.length===0&&S.run.sparks===30&&S.run.stage===2);
 r=pfApply(src2,S,{action:'sync',sim:{run:{sparks:1e9,stage:200}}},now+60000);T('triche : étincelles et étape plafonnées',r.anomalies.includes('sparks')&&r.anomalies.includes('stage')&&r.state.run.stage<40&&r.state.anom===2);S=r.state;
 r=pfApply(src2,S,{action:'build',payload:{id:'au_prestige'}},now+61000);T('recherche verrouillée refusée',r.result.err==='locked');
 r=pfApply(src2,S,{action:'build',payload:{id:'st_cad'}},now+61000);T('recherche lancée',r.result.ok&&r.state.build.length===1);S=r.state;
 r=pfApply(src2,S,{action:'build',payload:{id:'st_power'}},now+61000);T('un seul emplacement',r.result.err==='slots');
 r=pfApply(src2,S,{action:'wp',payload:{i:0}},now+61000);T('arme sans point refusée',r.result.err==='pp');
 r=pfApply(src2,S,{action:'purchase',payload:{id:'g80'}},now+61000);T('achat non certifié refusé',r.result.err==='store');
 r=pfApply(src2,S,{action:'purchase',payload:{id:'g80'},demo:true},now+61000);T('achat démo accepté',r.result.ok&&r.state.gems===100);S=r.state;
 r=pfApply(src2,S,{action:'gift_offer'},now+62000);T('cadeau tiré par le serveur',r.result.gift&&r.state.gift);S=r.state;
 r=pfApply(src2,S,{action:'gift_offer'},now+63000);T('même cadeau tant qu\'il est affiché',r.result.gift&&r.result.gift.at===S.gift.at);
 r=pfApply(src2,S,{action:'ad',payload:{kind:'gift'}},now+70000);T('pub cadeau : accordée',r.result.ok&&!r.state.gift);S=r.state;
 r=pfApply(src2,S,{action:'ad',payload:{kind:'gift'}},now+71000);T('pub cadeau : pas deux fois',r.result.err==='nogift');
 r=pfApply(src2,S,{action:'gift_offer'},now+72000);T('prochain cadeau : attente imposée',r.result.err==='wait'&&r.result.wait>60);
 r=pfApply(src2,S,{action:'ad',payload:{kind:'shop'}},now+72000);T('pub boutique : plancher 200',r.result.sparks===200);S=r.state;
 r=pfApply(src2,S,{action:'ad',payload:{kind:'shop'}},now+80000);T('pub boutique : 40 s entre deux',r.result.err==='cooldown');
 r=pfApply(src2,S,{action:'sync'},now+200000);T('recherche appliquée au terme',r.state.up.st_cad===1&&r.state.build.length===0);S=r.state;
 r=pfApply(src2,S,{action:'pack',payload:{i:0}},now+200000);T('pack 15 gemmes : étincelles créditées',r.result.ok&&r.state.gems===S.gems-15&&r.state.run.sparks>=S.run.sparks+200);if(!r.result.ok)console.log(r.result,S.gems);S=r.state;
 S.day.spMin=1440;r=pfApply(src2,S,{action:'pack',payload:{i:0}},now+200000);T('plafond 24 h / jour',r.result.err==='cap');S.day.spMin=0;
 S.run.max=35;S.run.stage=35;r=pfApply(src2,S,{action:'prestige'},now+200000);T('réfraction : ×1,2, 1 point, trésor',r.result.ok&&r.state.prestiges===1&&r.state.pp===1&&r.state.run.stage===1&&r.state.run.sparks>=600);S=r.state;
 r=pfApply(src2,S,{action:'prestige'},now+200000);T('réfraction à l\'étape 1 refusée',r.result.err==='stage');
 r=pfApply(src2,S,{action:'titan_end',payload:{score:100}},now+200000);T('score sans combat refusé',r.result.err==='norun');
 r=pfApply(src2,S,{action:'titan_start'},now+200000);T('titan : ticket consommé',r.result.ok&&r.state.titan.used===1);S=r.state;
 r=pfApply(src2,S,{action:'titan_end',payload:{score:1e30}},now+230000);T('score absurde refusé',r.result.err==='implausible');
 r=pfApply(src2,S,{action:'titan_end',payload:{score:3000}},now+230000);T('score plausible accepté',r.result.ok&&r.state.week.best===3000&&r.result.effects[0].titan===3000);S=r.state;
 r=pfApply(src2,S,{action:'league',payload:{gems:40,minutes:60}},now+230000);T('ligue : réservé au serveur',r.result.err==='trusted');
 r=pfApply(src2,S,{action:'league',payload:{gems:40,minutes:60}},now+230000,true);T('ligue : +40 gemmes et étincelles',r.result.ok&&r.state.gems===S.gems+40&&r.result.sparks>=200);
 r=pfApply(src2,S,{action:'rename',payload:{name:'ab'}},now+230000);T('pseudo trop court refusé',!r.result.ok);
 r=pfApply(src2,S,{action:'rename',payload:{name:'Nova Vive'}},now+230000);T('pseudo accepté (1er gratuit)',r.result.ok&&r.state.name==='Nova Vive'&&r.result.effects[0].name==='Nova Vive');S=r.state;
 r=pfApply(src2,S,{action:'claim',payload:{kind:'o',i:0}},now+230000);T('quête non remplie refusée',r.result.err==='claim');
 S.st.manual=10;r=pfApply(src2,S,{action:'claim',payload:{kind:'o',i:0},sim:{st:{manual:10,merges:10}}},now+230000);T('quête remplie : +10 gemmes',r.result.ok&&r.state.gems===S.gems+10);S=r.state;
 r=pfApply(src2,S,{action:'claim',payload:{kind:'o',i:0}},now+230000);T('quête déjà réclamée',r.result.err==='claim');
 r=pfApply(src2,S,{action:'login'},now+230000);T('calendrier : jour 1',r.result.ok);S=r.state;r=pfApply(src2,S,{action:'login'},now+230000);T('calendrier : une fois par jour',r.result.err==='claimed');
 r=pfApply(src2,S,{action:'hack'},now+230000);T('action inconnue refusée',r.result.err==='action');
 S.lastSeen=now+230000;S.run.srate=3;r=pfApply(src2,S,{action:'hello',sim:{run:{sparks:S.run.sparks}}},now+230000+5*3600e3);T('hors-ligne : 2 h max, ×0,3, débit mémorisé',r.result.offline&&r.result.offline.sparks===Math.floor(3*7200*0.3)&&r.state.run.sparks>=S.run.sparks+6000);S=r.state;
 r=pfApply(src2,S,{action:'ad',payload:{kind:'offline'}},now+230000+5*3600e3+10000);T('pub hors-ligne : doublé une fois',r.result.ok&&r.result.sparks===6480);S=r.state;r=pfApply(src2,S,{action:'ad',payload:{kind:'offline'}},now+230000+5*3600e3+20000);T('…pas deux',r.result.err==='nooff');
}
console.log(`t7core : ${ok} OK, ${ko} KO`);
