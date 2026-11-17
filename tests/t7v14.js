// v14 : fin de partie infinie (courbe, Lumière, route des records, mondes), pass refondu, rien au-dessus du plateau (boîte aux lettres)
const {pfApply,pfMakeEngine}=require('./pf_core.js');const src=require('./pf_src.js')();
let ok=0,ko=0;const T=(n,c,x)=>{if(c)ok++;else{ko++;console.log('KO',n,x===undefined?'':JSON.stringify(x));}};
const H=36e5,T0=Date.UTC(2026,10,18,12); // un mercredi (pas de Titan, pas d'événement)
const G=pfMakeEngine(src,T0);const C=G.CFG;
// 1. courbe : identique jusqu'à 100, adoucie ensuite, jamais infinie avant ~9 000 étapes
const old=n=>400*Math.pow(1.6,n-1)*(n%10===0?3:n%5===0?2:1)*(n<5?[0.06,0.25,0.5,0.8][n-1]:1);
T('PV identiques jusqu\'à l\'étape 100',[1,7,30,55,99,100].every(n=>Math.abs(C.enemy.hp(n)/old(n)-1)<1e-9));
T('après 100 : PV ×1,15 par étape (au lieu de ×1,6)',Math.abs(C.enemy.hp(152)/C.enemy.hp(151)-Math.pow(1.6,0.3))<1e-9);
let fin=true,inc=true,prev=0;for(let n=1;n<=9000;n++){const h=C.enemy.hp(n)/(n%10===0?3:n%5===0?2:1);if(!isFinite(h)||!isFinite(C.sparks.kill(n))||!isFinite(C.prestige.shards(n)))fin=false;if(n>5&&h<=prev)inc=false;prev=h;}
T('PV, étincelles et Réfraction finis jusqu\'à l\'étape 9 000',fin);T('PV toujours croissants',inc);
// 2. mondes infinis
const w=[1,5,6,10,11,36,155,156,157,300].map(k=>G.worldInfo(k));
T('5 premiers mondes inchangés',!/·/.test(w[0].name)&&!/·/.test(w[1].name)&&w[0].h===188);
T('6e monde : nom d\'étoile et teinte nouvelle',/· Vega$/.test(w[2].name)&&w[2].h!==w[0].h,w[2]);
const names=new Set();for(let k=1;k<=400;k++)names.add(G.worldInfo(k).name);T('400 mondes, 400 noms différents',names.size===400,names.size);
T('au-delà de 30 étoiles : numéro ajouté',/ 2$/.test(w[7].name),w[7].name);
// 3. Lumière : liée au temps, pas au nombre de Réfractions
function st(t,o){const g=pfMakeEngine(src,t);const S=g.fresh();S.tz=60;S.lastSeen=t;Object.assign(S,o||{});return S;}
let S=st(T0,{runAt:T0-5*H});S.run.max=S.run.stage=80;S.bestStage=80;let r=pfApply(src,S,{action:'prestige'},T0);
T('Réfraction à l\'étape 80 après 5 h : +5 Lumière',r.result.ok&&r.state.lum===5&&r.state.runAt===T0,{lum:r.state.lum});
S=r.state;S.run.max=S.run.stage=80;r=pfApply(src,S,{action:'prestige'},T0+60e3);T('Réfraction juste après : +1 seulement',r.state.lum===6);
S=r.state;S.run.max=S.run.stage=80;r=pfApply(src,S,{action:'prestige'},T0+60e3+50*H);T('après 50 h : plafond 24',r.state.lum===30);
S=r.state;S.run.max=S.run.stage=45;r=pfApply(src,S,{action:'prestige'},T0+80*H);T('record de course < 60 : pas de Lumière',r.result.ok&&r.state.lum===30);
{const g=pfMakeEngine(src,T0);g.S=st(T0);const d0=g.bonusMul('dmg');g.S.lum=100;T('100 Lumière = dégâts ×1,005^100',Math.abs(g.bonusMul('dmg')/d0-Math.pow(1.005,100))<1e-9);}
// 4. route des records (serveur)
S=st(T0,{bestStage:60,gems:0});r=pfApply(src,S,{action:'road'},T0);T('route : 1er palier (25) = 35 gemmes',r.result.ok&&r.state.road===1&&r.state.gems===35);
r=pfApply(src,r.state,{action:'road'},T0);T('route : 2e palier (50) = 40 gemmes',r.result.ok&&r.state.road===2&&r.state.gems===75);
r=pfApply(src,r.state,{action:'road'},T0);T('route : pas de 3e palier à l\'étape 60',!r.result.ok&&r.result.err==='road'&&r.state.road===2);
{const g=pfMakeEngine(src,T0);g.S=r.state;T('route : dégâts ×1,05 par palier',Math.abs(g.roadMult()-1.1025)<1e-9);g.S.road=40;T('gemmes de route plafonnées à 150',C.road.g(41)===150);}
// 5. un joueur fort n'est pas pris pour un tricheur (le contrôle d'avancée tient compte de la Lumière)
S=st(T0,{bestStage:399,lum:4558,road:15,lastSeen:T0,wp:{0:89,1:89,2:89,3:88,4:88,5:88,6:88,7:88}});S.run.stage=S.run.max=365;S.run.tb={cad:30,birth:5,auto:30,power:40,spark:30};Object.assign(S.up,{aura:24,rang:31,cadence:42,board:2,st_birth:18,st_power:51,st_spark:40}); /* profil réel du joueur actif simulé à J200 (sim7) */
r=pfApply(src,S,{action:'sync',sim:{run:{stage:368,sparks:S.run.sparks,tb:S.run.tb}}},T0+120e3);T('joueur actif à J200 (étape 365) : 3 étapes en 2 min acceptées (pas pris pour un tricheur)',r.state.run.stage===368&&!r.anomalies.length,r.anomalies);
{const S2=st(T0,{lastSeen:T0});S2.run.stage=S2.run.max=5;const r2=pfApply(src,S2,{action:'sync',sim:{run:{stage:200,sparks:0}}},T0+120e3);T('tricheur (étape 5 → 200 en 2 min) : refusé',r2.anomalies.includes('stage')&&r2.state.run.stage<60,r2.state.run.stage);}
// 6. pass refondu
{const PS=G.PASS;T('pass gratuit : +5 Lumière tous les 10 paliers',PS[9].f.lum===5&&PS[99].f.lum===5);T('pass gratuit : jeton aux paliers 25/50/75/100',[25,50,75,100].every(n=>PS[n-1].f.rt===1)&&PS.reduce((a,x)=>a+(x.f.rt|0),0)===4);
 T('pass payant : 20 jetons, 140 Lumière, 1 280 gemmes',PS.reduce((a,x)=>a+(x.p.rt|0),0)===20&&PS.reduce((a,x)=>a+(x.p.lum|0),0)===140&&PS.reduce((a,x)=>a+(x.p.g|0),0)===1280);}
console.log(`t7v14 (moteur) : ${ok} OK, ${ko} KO`);
// ---------- vrai client ----------
(async()=>{const {chromium}=require('playwright');const http=require('http');const fs=require('fs');
 const html=fs.readFileSync('/home/claude/fusion/wrapped.html');const srv=http.createServer((q,s)=>{s.writeHead(200,{'content-type':'text/html'});s.end(html);}).listen(8773);
 const b=await chromium.launch();const errs=[];
 async function open(w,h,t0,init){const SK=t0-Date.now();const now=()=>Date.now()+SK;const DB={};
  const c=await b.newContext({viewport:{width:w,height:h},locale:'fr-FR',timezoneId:'Europe/Paris'});
  await c.route(/^https:\/\/[a-z0-9-]+\.supabase\.co\//,async route=>{const q=route.request();let a={};try{a=q.postDataJSON()||{};}catch(e){}let body=null;
   if(q.url().includes('pf_time'))body={now:now()};else if(q.url().includes('pf-act')){let p=DB[a.id];if(!p)p=DB[a.id]={state:null};if(init&&!p.state&&a.action==='hello'){const r0=pfApply(src,null,{action:'sync'},now());p.state=Object.assign(r0.state,init(now()));}
     const r=pfApply(src,p.state,a,now(),false);p.state=r.state;body={ok:true,now:now(),state:r.state,result:r.result,anomalies:r.anomalies,league:DB.league&&a.action==='hello'?DB.league:null,effects:[]};if(a.action==='hello')DB.league=null;}
   else if(q.url().includes('pf_board'))body={week:'w',rows:[],joined:false};
   await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});});
  const p=await c.newPage();p.on('pageerror',e=>errs.push(e.message));await p.clock.install({time:t0});return {c,p,DB,now};}
 const ev=(p,f,a)=>p.evaluate(f,a);
 // A. boîte aux lettres : rien ne s'ouvre seul sur le plateau
 {const {c,p,DB}=await open(390,844,T0,n=>({bestStage:60,maxStage:60,st:Object.assign(pfMakeEngine(src,n).fresh().st,{tuto:3,kills:500}),login:{streak:2,last:'',claimed:''},lum:12,road:0,prestiges:1,runAt:n-3*H,run:Object.assign(pfMakeEngine(src,n).fresh().run,{stage:80,max:80})}));
  DB.league={week:'w-1',rank:2,size:12,gems:40};
  await p.goto('http://localhost:8773/');await p.waitForTimeout(2500);
  let r=await ev(p,()=>({veil:!document.getElementById('veil').hidden,mail:!document.getElementById('mailBtn').hidden,n:window.__G.MAIL.map(m=>m.k)}));
  T('ouverture : aucune fenêtre automatique (connexion du jour, ligue)',!r.veil,r);T('…elles attendent dans la boîte aux lettres',r.mail&&r.n.includes('login')&&r.n.includes('league'),r);
  await ev(p,()=>document.getElementById('mailBtn').click());await p.waitForTimeout(200);
  r=await ev(p,()=>({items:document.querySelectorAll('#modal [data-mail]').length,txt:document.getElementById('modal').innerText}));T('boîte aux lettres : liste des 2 courriers',r.items===2,r);
  await ev(p,()=>[...document.querySelectorAll('#modal [data-mail]')].find(b=>/ligue/i.test(b.textContent)).click());await p.waitForTimeout(300);
  r=await ev(p,()=>({txt:document.getElementById('modal').innerText,left:window.__G.MAIL.length}));T('courrier de ligue ouvert, l\'autre reste',/sur 12/.test(r.txt)&&r.left===1,r);
  await ev(p,()=>document.querySelector('#modal #lgClaim')?.click());await p.waitForTimeout(200);await ev(p,()=>{document.getElementById('veil').hidden=true;});
  // boss raté 3 fois, fin du Titan
  await ev(p,()=>{localStorage.removeItem('prisme-ctx-boss');const G=window.__G;for(let i=0;i<3;i++)G.hooks.bossFled(false);G.hooks.titanEnd(12345);});await p.waitForTimeout(400);
  r=await ev(p,()=>({veil:!document.getElementById('veil').hidden,ban:!document.getElementById('banner').hidden,n:window.__G.MAIL.map(m=>m.k)}));
  T('boss raté 3 fois et fin du Titan : pas de fenêtre, bannière dans l\'arène',!r.veil&&r.ban&&r.n.includes('boss'),r);
  // B. route des records et Lumière dans l'interface
  r=await ev(p,()=>{const G=window.__G;G.setTab('home');G.refresh();return {nav:!document.getElementById('bQ').hidden,ready:G.roadReady()};});T('route prête : pastille sur Quêtes',r.nav&&r.ready===2,r);
  await ev(p,()=>window.__G.setTab('quests'));await p.waitForTimeout(150);
  r=await ev(p,()=>{const c=document.querySelector('#panel .road');return c?{hl:c.classList.contains('hl'),txt:c.innerText}:null;});T('Quêtes : carte de la route, palier 25 à récupérer',r&&r.hl&&/25/.test(r.txt),r);
  const g0=await ev(p,()=>window.__G.S.gems);await ev(p,()=>document.querySelector('#panel [data-road]').click());await p.waitForTimeout(800);
  r=await ev(p,()=>({g:window.__G.S.gems,road:window.__G.S.road}));const id=await ev(p,()=>window.__G.DEV.id);
  T('route : récupérée (+35 gemmes), serveur d\'accord',r.g===g0+35&&r.road===1&&DB[id].state.road===1&&DB[id].state.gems===r.g,{r,srv:DB[id].state.road});
  await ev(p,()=>{window.__G.atPane='refr';});await ev(p,()=>{window.__G.setTab('atelier');const b=document.querySelector('#panel [data-atpane="refr"]');if(b)b.click();});await p.waitForTimeout(200);
  r=await ev(p,()=>{const c=document.querySelector('#panel .lumc');return c?c.innerText:null;});T('Réfraction : carte Lumière (12 points, multiplicateur)',r&&/Lumière/.test(r)&&/12/.test(r)&&/×1,06/.test(r),r);
  await ev(p,()=>{const G=window.__G;G.setTab('home');G.renderActs();document.getElementById('prest').click();});await p.waitForTimeout(150);
  r=await ev(p,()=>document.getElementById('modal').innerText);T('fenêtre de Réfraction : +3 Lumière annoncés',/\+3/.test(r),r);
  await ev(p,()=>document.getElementById('doPrest').click());await p.waitForTimeout(900);
  r=await ev(p,()=>window.__G.S.lum);T('Réfraction : Lumière ajoutée (téléphone et serveur)',r===15&&DB[id].state.lum===15,{cli:r,srv:DB[id].state.lum});
  // C. nom de monde au-delà du 5e
  await ev(p,()=>{const G=window.__G;G.S.run.stage=61;G.S.bestStage=Math.max(G.S.bestStage,61);G.R.E=G.enemyFor(61);G.refresh();});await p.waitForTimeout(300);
  r=await ev(p,()=>document.getElementById('stgW').textContent);T('étape 61 : monde « Néon · Vega »',/· Vega/.test(r),r);
  await c.close();}
 // D. rien au-dessus du plateau, sur 3 tailles d'écran, avec toutes les bulles et actions affichées
 for(const [w,h] of [[360,640],[390,844],[412,915]]){const {c,p}=await open(w,h,Date.UTC(2026,10,21,12),n=>({bestStage:60,maxStage:60,st:Object.assign(pfMakeEngine(src,n).fresh().st,{tuto:3,kills:500})}));
  await p.goto('http://localhost:8773/');await p.waitForTimeout(2500);
  const r=await ev(p,()=>{const G=window.__G,$=id=>document.getElementById(id);$('veil').hidden=true;G.setTab('home');G.S.run.max=60;G.S.run.fled=true;G.renderActs();
   G.forceGift&&(G.NET.on=false,G.forceGift(),G.NET.on=true);G.mailPush('t1','star','x',()=>{});G.refresh();G.qgridFit();
   const B=$('board').getBoundingClientRect();const all=[...document.querySelectorAll('#qgrid button:not([hidden]),#gift,#evChip,#mailBtn,#toast,#banner,#hint')].filter(e=>!e.hidden&&getComputedStyle(e).display!=='none');
   const bad=all.filter(e=>{const r=e.getBoundingClientRect();return r.width&&r.bottom>B.top+1&&r.top<B.bottom&&r.right>B.left&&r.left<B.right;}).map(e=>e.id||e.className);
   return {n:all.length,bad,shown:['gift','evChip','mailBtn'].filter(id=>!$(id).hidden),btns:document.querySelectorAll('#qgrid button:not([hidden])').length};});
  T(`${w}×${h} : aucune bulle ni bouton sur le plateau (${r.btns} boutons affichés)`,r.bad.length===0&&r.btns>=4&&r.shown.length>=2,r);
  await p.screenshot({path:`/tmp/claude-0/-home-claude/88f4d138-66ef-5763-882a-0d473f4a1294/scratchpad/v14_${w}.png`});await c.close();}
 T('aucune erreur JS',errs.length===0,errs);
 console.log(`t7v14 : ${ok} OK, ${ko} KO`);await b.close();srv.close();process.exit(ko?1:0);
})().catch(e=>{console.log('ERR',e);process.exit(1);});
