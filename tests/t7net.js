// Test du client contre le VRAI noyau serveur (pf_core) servi par un faux Supabase (route Playwright).
const {chromium}=require('playwright');const http=require('http');const fs=require('fs');
const {pfApply,pfLeagueMinutes}=require('./pf_core.js');const ENGINE=require('./pf_src.js')().replace('days:[2,4,6]','days:[0,1,2,3,4,5,6]'); // Titan tous les jours pour le test
let ok=0,ko=0;const T=(n,c)=>{if(c)ok++;else{ko++;console.log('KO',n);}};
const html=fs.readFileSync('/home/claude/fusion/wrapped.html');
const srv=http.createServer((q,s)=>{s.writeHead(200,{'content-type':'text/html'});s.end(html);}).listen(8766);
const SKEW=90000;const now=()=>Date.now()+SKEW;
const DB={players:{},league:[],reports:[],anomalies:[]};let calls=[],down=false,pendingLeague={};
function player(id,secret,lang,name){let p=DB.players[id];if(!p){p=DB.players[id]={secret,state:null,ver:0,name,anom:0,banned:false};}return p.secret===secret?p:null;}
function handle(url,a){
  const fn=url.includes('/rpc/')?url.split('/rpc/')[1]:url.includes('/functions/v1/pf-act')?'act':'?';calls.push(fn);
  if(down)return [503,{message:'down'}];
  if(fn==='pf_time')return [200,{now:now()}];
  if(fn==='act'){
    const p=player(a.id,a.secret,a.lang,a.name);if(!p)return [401,{ok:false,err:'auth'}];if(p.banned)return [403,{ok:false,err:'banned'}];
    const r=pfApply(ENGINE,p.state,a,now(),false);
    const effects=[];for(const e of (r.result.effects||[])){if(typeof e.titan==='number'){let m=DB.league.find(x=>x.id===a.id);if(!m){m={id:a.id,score:0,best:e.best};DB.league.push(m);}m.score+=e.titan;m.best=Math.max(m.best,e.best);effects.push({titan:true});}if(e.name){p.name=e.name;}if(e.report)DB.reports.push(e.report);}
    let league=null;if(a.action==='hello'&&pendingLeague[a.id]){const lr=pendingLeague[a.id];delete pendingLeague[a.id];const r2=pfApply(ENGINE,r.state,{action:'league',payload:{gems:lr.gems,minutes:pfLeagueMinutes(lr.rank)}},now(),true);r.state=r2.state;league={...lr,sparks:r2.result.sparks};}
    p.state=r.state;p.ver++;p.anom+=r.anomalies.length;if(r.anomalies.length)DB.anomalies.push({id:a.id,action:a.action,kinds:r.anomalies});
    return [200,{ok:true,now:now(),state:r.state,result:r.result,anomalies:r.anomalies,league,effects}];
  }
  const p=player(a.p_id,a.p_secret);if(!p)return [400,{code:'P0001',message:'auth'}];
  if(fn==='pf_board'){const me=DB.league.find(x=>x.id===a.p_id);if(!me)return [200,{week:'w',rows:[],joined:false}];const rows=DB.league.map(m=>({id:m.id,name:(DB.players[m.id]||{name:'Bot'}).name,score:m.score,best:m.best,me:m.id===a.p_id})).sort((x,y)=>y.score-x.score);return [200,{week:'w',rows,joined:true,bracket:1}];}
  return [404,{message:'nofn'}];
}
async function mock(ctx){await ctx.route('https://atmrbzkcneotleuoapdp.supabase.co/**',async route=>{const q=route.request();
  const [st,body]=handle(q.url(),q.postDataJSON()||{});await route.fulfill({status:st,contentType:'application/json',body:JSON.stringify(body)});});}
const ev=(p,f,...a)=>p.evaluate(f,...a);
(async()=>{const b=await chromium.launch();const errs=[];
  const cA=await b.newContext({viewport:{width:390,height:844},locale:'fr-FR'});await mock(cA);const A=await cA.newPage();A.on('pageerror',e=>errs.push('A:'+e.message));
  await A.goto('http://localhost:8766/');await A.waitForTimeout(1500);
  const idA=await ev(A,()=>window.__G.DEV.id);
  let r=await ev(A,()=>{const G=window.__G;return {ready:G.netReady,off:G.clockOff,gems:G.S.gems,name:G.S.name};});
  T('hello → joueur créé côté serveur',!!DB.players[idA]&&!!DB.players[idA].state);T('état serveur appliqué (20 gemmes)',r.ready&&r.gems===20);T('horloge calée (+90 s)',Math.abs(r.off-90000)<3000);
  // --- recherche : locale immédiate, confirmée par le serveur, pas de double débit
  await ev(A,()=>{document.getElementById('veil').hidden=true;window.__G.S.run.sparks=500;});
  await ev(A,()=>window.__G.actAsync('sync'));await A.waitForTimeout(200);
  r=await ev(A,async()=>{const G=window.__G;const s0=G.S.run.sparks;G.setTab('atelier');const el=document.querySelector('[data-build="st_cad"]');el.click();const local=G.S.run.sparks;await G.actAsync('sync');return {s0,local,after:G.S.run.sparks,build:G.S.build.length};});
  T('recherche débitée une seule fois (60 ✦)',r.s0-r.local===60&&Math.abs(r.after-r.local)<5&&r.build===1);T('serveur : recherche en cours',DB.players[idA].state.build.length===1&&Math.abs(DB.players[idA].state.run.sparks-r.after)<5);
  // --- triche : étincelles gonflées en mémoire → plafonnées par le serveur
  r=await ev(A,async()=>{const G=window.__G;G.S.run.sparks=1e9;await G.actAsync('sync');return G.S.run.sparks;});
  T('triche étincelles plafonnée',r<1e6);T('anomalie journalisée',DB.anomalies.some(a=>a.kinds.includes('sparks')));
  r=await ev(A,async()=>{const G=window.__G;G.S.run.stage=400;G.S.bestStage=400;await G.actAsync('sync');return {st:G.S.run.stage,best:G.S.bestStage};});
  T('triche étape plafonnée',r.st<50&&r.best<50);
  // --- refus serveur : le téléphone croit avoir 100 gemmes, le serveur sait qu'il en a 20
  r=await ev(A,async()=>{const G=window.__G;G.S.gems=100;G.setTab('shop');document.querySelector('[data-gem="boost"]').click();const local=G.S.gems;await new Promise(z=>setTimeout(z,400));await G.actAsync('sync');return {local,after:G.S.gems,boost:G.S.boostUntil>Date.now()};});
  T('achat local optimiste (75 gemmes)',r.local===75);T('serveur : refusé → 20 gemmes, pas de boost',r.after===20&&!r.boost);
  // --- cadeau : tiré par le serveur, accordé par le serveur après la pub
  r=await ev(A,async()=>{const G=window.__G;G.setTab('home');G.forceGift();await new Promise(z=>setTimeout(z,500));const gf=G.gift;const g0=G.S.gems,s0=G.S.run.sparks;if(!gf)return {gf:null};document.getElementById('gift').click();await new Promise(z=>setTimeout(z,100));document.getElementById('giftGo').click();await new Promise(z=>setTimeout(z,3800));await G.actAsync('sync');return {gf,dg:G.S.gems-g0,ds:G.S.run.sparks-s0,boost:G.S.boostUntil>Date.now()};});
  T('cadeau fourni par le serveur',r.gf&&['sp','g','b'].includes(r.gf.k));
  T('récompense du cadeau accordée une seule fois',r.gf&&((r.gf.k==='g'&&r.dg===r.gf.v)||(r.gf.k==='sp'&&r.ds>=r.gf.v-1&&r.ds<r.gf.v*2+100)||(r.gf.k==='b'&&r.boost)));
  // --- réfraction : le serveur recalcule points et trésor
  {const st=DB.players[idA].state;st.run.stage=31;st.run.max=31;st.bestStage=31;st.maxStage=31;}
  r=await ev(A,async()=>{const G=window.__G;await G.actAsync('hello');document.getElementById('veil').hidden=true;G.renderActs();document.getElementById('prest').click();await new Promise(z=>setTimeout(z,100));document.getElementById('doPrest').click();await new Promise(z=>setTimeout(z,400));await G.actAsync('sync');return {p:G.S.prestiges,pp:G.S.pp,stage:G.S.run.stage,sp:G.S.run.sparks};});
  T('réfraction validée par le serveur',r.p===1&&r.pp===1&&r.stage===1&&DB.players[idA].state.prestiges===1);T('trésor de départ crédité',r.sp>=600);
  // --- Titan (jour forcé) → ticket serveur → score serveur → ligue réelle
  r=await ev(A,async()=>{const G=window.__G;G.CFG.titan.days=[0,1,2,3,4,5,6];await G.actAsync('sync');document.getElementById('veil').hidden=true;const d=await G.actAsync('titan_start');G.R.titanDmg=12345;G.endTitan();await new Promise(z=>setTimeout(z,300));await G.actAsync('sync');return {start:d&&d.result&&d.result.ok,best:G.S.week.best};});
  T('titan : ticket serveur + score accepté',r.start&&r.best===12345&&DB.league[0]&&DB.league[0].score===12345);
  // --- pseudo
  r=await ev(A,async()=>{const G=window.__G;document.getElementById('veil').hidden=true;G.setTab('profile');document.getElementById('nameIn').value='Lumen Vif';document.getElementById('nameBtn').click();await new Promise(z=>setTimeout(z,300));return G.S.name;});
  T('pseudo validé et propagé',r==='Lumen Vif'&&DB.players[idA].name==='Lumen Vif'&&DB.players[idA].state.name==='Lumen Vif');
  // --- hors-ligne : calculé par le serveur au réveil
  DB.players[idA].state.lastSeen=now()-3*3600e3;DB.players[idA].state.run.srate=2;
  r=await ev(A,async()=>{const G=window.__G;const s0=G.S.run.sparks;const d=await G.actAsync('hello');return {off:d&&d.result&&d.result.offline&&d.result.offline.sparks,gain:G.S.run.sparks-s0,modal:!document.getElementById('veil').hidden};});
  T('gains hors-ligne calculés par le serveur (2 h plafond ×0,3)',r.off===Math.floor(2*7200*0.3));T('…crédités',r.gain>=r.off-5);
  await ev(A,()=>{window.__G.S.run.sparks=5000;document.getElementById('veil').hidden=true;return window.__G.actAsync('sync');});
  // --- appareil B : même identité → état complet du serveur + résultat de ligue
  const secretA=await ev(A,()=>window.__G.DEV.s);
  pendingLeague[idA]={week:'w-1',rank:2,size:12,gems:40};
  const cB=await b.newContext({viewport:{width:390,height:844},locale:'fr-FR'});await mock(cB);const B=await cB.newPage();B.on('pageerror',e=>errs.push('B:'+e.message));
  await B.addInitScript(d=>localStorage.setItem('prisme-dev',d),JSON.stringify({id:idA,s:secretA}));
  await B.goto('http://localhost:8766/');await B.waitForTimeout(1800);
  r=await ev(B,()=>{const G=window.__G;return {name:G.S.name,p:G.S.prestiges,gems:G.S.gems,modal:document.getElementById('modal').textContent};});
  T('appareil B reçoit l\'état serveur',r.name==='Lumen Vif'&&r.p===1);T('résultat de ligue accordé par le serveur au réveil (+40 gemmes)',r.gems>=60&&/sur 12/.test(r.modal));
  // --- mauvais secret
  const cD=await b.newContext({viewport:{width:390,height:844},locale:'fr-FR'});await mock(cD);const D=await cD.newPage();D.on('pageerror',e=>errs.push('D:'+e.message));
  await D.addInitScript(d=>localStorage.setItem('prisme-dev',d),JSON.stringify({id:idA,s:'mauvais-secret-mauvais'}));
  await D.goto('http://localhost:8766/');await D.waitForTimeout(1200);
  r=await ev(D,()=>({ready:window.__G.netReady,on:window.__G.netOK}));
  T('secret faux → pas de session serveur, jeu intact',!r.ready&&r.on);T('état serveur intact',DB.players[idA].state.name==='Lumen Vif');
  // --- panne serveur → voile ; retour
  down=true;await ev(A,()=>window.__G.probeNet());await A.waitForTimeout(400);r=await ev(A,()=>!window.__G.netOK&&!document.getElementById('offline').hidden);T('serveur HS → pause',r);
  down=false;await A.click('#retryNet');await A.waitForTimeout(400);r=await ev(A,()=>window.__G.netOK);T('retour en ligne',r);
  // --- code de transfert
  const code=await ev(A,()=>window.__G.xferCode());r=await ev(A,c=>{const d=window.__G.xferParse(c);return d&&d.id===window.__G.DEV.id;},code);T('code de transfert cohérent',r);
  T('aucune erreur JS',errs.length===0);if(errs.length)console.log(errs.slice(0,5));
  console.log(`t7net : ${ok} OK, ${ko} KO`);await b.close();srv.close();})();
