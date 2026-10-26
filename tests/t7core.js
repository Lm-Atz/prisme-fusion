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
 r=pfApply(src2,S,{action:'purchase',payload:{id:'g100'}},now+61000);T('achat non certifié refusé',r.result.err==='store');
 r=pfApply(src2,S,{action:'purchase',payload:{id:'g100'},demo:true},now+61000);T('v10.5 : achat accepté sans âge déclaré',r.result.ok);
 r=pfApply(src2,S,{action:'sync',sim:{settings:{age:'a',cap:50,stats:false,notif:true}}},now+61000);S=r.state;T('v10.6 : stats, notifs enregistrés, âge et plafond ignorés',S.settings.age===undefined&&S.settings.cap===undefined&&S.settings.stats===false&&S.settings.notif===true);
 r=pfApply(src2,S,{action:'sync',sim:{settings:{age:'c',cap:7}}},now+61000);S=r.state;
 r=pfApply(src2,S,{action:'purchase',payload:{id:'g100'},demo:true},now+61000);T('achat démo accepté : premier pack doublé (200 gemmes), dépense notée',r.result.ok&&r.state.gems===220&&r.state.firstX2===true&&r.state.spend.eur===0.99);S=r.state;
 r=pfApply(src2,S,{action:'purchase',payload:{id:'g100'},demo:true},now+61000);T('v10 : ×2 une seule fois',r.result.ok&&r.state.gems===320&&r.state.spend.eur===1.98);S=r.state;S.gems=120;
 r=pfApply(src2,S,{action:'gift_offer'},now+62000);T('cadeau tiré par le serveur',r.result.gift&&r.state.gift);S=r.state;
 r=pfApply(src2,S,{action:'gift_offer'},now+63000);T('même cadeau tant qu\'il est affiché',r.result.gift&&r.result.gift.at===S.gift.at);
 r=pfApply(src2,S,{action:'ad',payload:{kind:'gift'}},now+70000);T('pub cadeau : accordée',r.result.ok&&!r.state.gift);S=r.state;
 r=pfApply(src2,S,{action:'ad',payload:{kind:'gift'}},now+71000);T('pub cadeau : pas deux fois',r.result.err==='nogift');
 r=pfApply(src2,S,{action:'gift_offer'},now+72000);T('prochain cadeau : attente imposée',r.result.err==='wait'&&r.result.wait>60);
 r=pfApply(src2,S,{action:'ad',payload:{kind:'shop'}},now+72000);T('pub boutique : plancher 200',r.result.sparks===200);S=r.state;
 r=pfApply(src2,S,{action:'ad',payload:{kind:'shop'}},now+80000);T('pub boutique : 40 s entre deux',r.result.err==='cooldown');
 r=pfApply(src2,S,{action:'sync'},now+200000);T('recherche appliquée au terme',r.state.up.st_cad===1&&r.state.build.length===0);S=r.state;
 r=pfApply(src2,S,{action:'pack',payload:{i:0}},now+200000);T('pack 20 gemmes : étincelles créditées',r.result.ok&&r.state.gems===S.gems-20&&r.state.run.sparks>=S.run.sparks+200);if(!r.result.ok)console.log(r.result,S.gems);S=r.state;
 S.day.spMin=1440;r=pfApply(src2,S,{action:'pack',payload:{i:0}},now+200000);T('plafond 24 h / jour',r.result.err==='cap');S.day.spMin=0;
 S.run.max=35;S.run.stage=35;S.up.crit=3;r=pfApply(src2,S,{action:'prestige'},now+200000);T('réfraction : ×1,2, 2 points (+50 %) + 2 offerts, trésor',r.result.ok&&r.state.prestiges===1&&r.state.pp===4&&r.state.run.stage===1&&r.state.run.sparks>=600);S=r.state;
 T('v12.2 : réfraction : Attaque remise à zéro',S.up.crit===0);
 S.run.sparks=1e6;r=pfApply(src2,S,{action:'build',payload:{id:'crit'}},now+200000);T('v12.2 : serveur : amélioration de partie immédiate, sans emplacement ni minuteur, prix ×3',r.result.ok!==false&&r.state.up.crit===1&&r.state.build.length===S.build.length&&Math.abs((S.run.sparks-r.state.run.sparks)-500*3)<1e-6);S=r.state;
 r=pfApply(src2,S,{action:'restore'},now+200000);T('serveur : rien à restaurer → refus',!r.result.ok);
 r=pfApply(src2,S,{action:'build',payload:{id:'au_merge'}},now+200000);T('serveur : automatisation payée en points, immédiate',r.result.ok&&r.state.up.au_merge===1&&r.state.pp===3&&r.state.build.length===0);S=r.state;
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
 { const c0=S.chest|0;S.st.manual=10; }
 r=pfApply(src2,S,{action:'login'},now+230000);T('calendrier : jour 1',r.result.ok);S=r.state;T('serveur : le calendrier remplit le coffre',(S.chest|0)>0);r=pfApply(src2,S,{action:'login'},now+230000);T('calendrier : une fois par jour',r.result.err==='claimed');
 r=pfApply(src2,S,{action:'hack'},now+230000);T('action inconnue refusée',r.result.err==='action');
 S.lastSeen=now+230000;S.run.srate=3;r=pfApply(src2,S,{action:'hello',sim:{run:{sparks:S.run.sparks}}},now+230000+5*3600e3);T('hors-ligne : 2 h max, ×0,3, débit mémorisé',r.result.offline&&r.result.offline.sparks===Math.floor(3*7200*0.3)&&r.state.run.sparks>=S.run.sparks+6000);S=r.state;
 /* v10 : cadeau du jour, pass de saison, couleur Saison */
 {let t0=now+230000+5*3600e3+30000;let g0=S.gems;r=pfApply(src2,S,{action:'shop_gift'},t0);T('v10 : cadeau du jour +5 gemmes',r.result.ok&&r.state.gems===g0+5);let S2=r.state;r=pfApply(src2,S2,{action:'shop_gift'},t0+1000);T('v10 : cadeau du jour une fois',r.result.err==='claimed');
  r=pfApply(src2,S2,{action:'skin',payload:{id:'saison'}},t0);T('v10 : couleur Saison non achetable',!r.result.ok);
  {const Gx=pfMakeEngine(src2,t0);Gx.S=S2;Gx.passState();S2.pass.xp=0;}r=pfApply(src2,S2,{action:'pass_claim',payload:{n:1,track:'f'}},t0);T('v10 : palier non atteint refusé',r.result.err==='pass');
  r=pfApply(src2,S2,{action:'sync'},t0);S2=r.state;const G0=pfMakeEngine(src2,t0);G0.S=S2;G0.passState();const k0=S2.pass.k;S2.gems=100;
  r=pfApply(src2,S2,{action:'pass_buy',payload:{k:1}},t0);T('v12 : 1 palier acheté 15 gemmes, sans pass payant',r.result.ok&&r.state.gems===85&&r.state.pass.xp===15);S2=r.state;
  r=pfApply(src2,S2,{action:'pass_buy',payload:{k:10}},t0);T('v12 : 10 paliers (120) refusés faute de gemmes',r.result.err==='gems'&&r.state.gems===85);
  r=pfApply(src2,S2,{action:'pass_claim',payload:{n:1,track:'p'}},t0);T('v11 : palier acheté sans pass : premium refusé',r.result.err==='pass');
  S2.pass={k:k0,v:2,xp:1485,prem:false,cf:[],cp:[]};S2.gems=999;r=pfApply(src2,S2,{action:'pass_buy',payload:{k:50}},t0);T('v12 : jamais au-delà du palier 100 (1 seul acheté pour 15 gemmes)',r.result.ok&&r.state.pass.xp===1500&&r.state.gems===984);S2=r.state;
  r=pfApply(src2,S2,{action:'pass_buy',payload:{k:1}},t0);T('v11 : palier 100 atteint : plus d\'achat',!r.result.ok);
  g0=S2.gems;r=pfApply(src2,S2,{action:'pass_claim',payload:{n:2,track:'f'}},t0);T('v11 : palier gratuit 2 = 2 gemmes',r.result.ok&&r.state.gems===g0+2);S2=r.state;
  r=pfApply(src2,S2,{action:'pass_claim',payload:{n:2,track:'p'}},t0);T('v10 : piste premium verrouillée sans pass',r.result.err==='pass');
  r=pfApply(src2,S2,{action:'purchase',payload:{id:'pass'},demo:true},t0);T('v10 : achat du pass',r.result.ok&&r.state.pass.prem);S2=r.state;g0=S2.gems;
  r=pfApply(src2,S2,{action:'pass_claim',payload:{n:100,track:'p'}},t0);T('v12 : palier 100 premium : 80 gemmes + couleur Éclat de la saison',r.result.ok&&r.state.gems===g0+80&&r.state.skins.includes('s'+k0+'x'));S2=r.state;
  r=pfApply(src2,S2,{action:'pass_claim',payload:{n:100,track:'p'}},t0);T('v10 : pas deux fois le même palier',r.result.err==='pass');
  g0=S2.gems;r=pfApply(src2,S2,{action:'pass_all'},t0);T('v12 : tout récupérer : 99 premium + 99 gratuits, 1 360 + 98 gemmes, couleur du palier 50',r.result.ok&&r.result.n===198&&r.state.gems===g0+1360+98&&r.state.skins.includes('s'+k0));S2=r.state;
  {const G=pfMakeEngine(src2,t0);const prem=G.PASS.reduce((a,x)=>a+(x.p.g|0),0),free=G.PASS.reduce((a,x)=>a+(x.f.g|0),0),cost=G.passTierCost(10)*10;T('v12 : paliers achetés rentables avec le pass, gain borné par saison (≤ 400 gemmes)',prem===1440&&prem+free>cost&&prem+free-cost<=400&&free<cost);}
  r=pfApply(src2,S2,{action:'purchase',payload:{id:'pass'},demo:true},t0);T('v10 : pass non rachetable dans la saison',!r.result.ok);
  r=pfApply(src2,S2,{action:'sync'},t0+29*864e5);T('v10 : nouvelle saison : pass remis à zéro au premier usage',(()=>{const G=pfMakeEngine(src2,t0+29*864e5);G.S=r.state;return G.passState().prem===false&&G.passTier()===1; /* v12.3 : palier 1 offert */})());}
 r=pfApply(src2,S,{action:'ad',payload:{kind:'offline'}},now+230000+5*3600e3+10000);T('pub hors-ligne : doublé une fois',r.result.ok&&r.result.sparks===6480);S=r.state;r=pfApply(src2,S,{action:'ad',payload:{kind:'offline'}},now+230000+5*3600e3+20000);T('…pas deux',r.result.err==='nooff');
}
console.log(`t7core : ${ok} OK, ${ko} KO`);
