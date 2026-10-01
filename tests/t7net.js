// Test du module réseau avec un faux Supabase (route Playwright) servi en http.
const {chromium}=require('playwright');const http=require('http');const fs=require('fs');
let ok=0,ko=0;const T=(n,c)=>{if(c)ok++;else{ko++;console.log('KO',n);}};
const html=fs.readFileSync('/home/claude/fusion/wrapped.html');
const srv=http.createServer((q,s)=>{s.writeHead(200,{'content-type':'text/html'});s.end(html);}).listen(8765);
// faux serveur : état en mémoire
const DB={players:{},league:[],reports:[],events:[]};const SKEW=90000; // serveur en avance de 90 s
let calls=[],down=false;
function handle(fn,a){
  calls.push(fn);if(down)return [503,{message:'down'}];
  const now=Date.now()+SKEW;
  if(fn==='pf_time')return [200,{now}];
  const p=DB.players[a.p_id];
  if(fn==='pf_hello'){if(!p){DB.players[a.p_id]={secret:a.p_secret,save:null,updated:0,name:a.p_name,best:1};return [200,{now,save:null,updated:0,name:a.p_name,flags:0}];}
    if(p.secret!==a.p_secret)return [400,{code:'P0001',message:'auth'}];return [200,{now,save:p.save,updated:p.updated,name:p.name,flags:0}];}
  if(!p||p.secret!==a.p_secret)return [400,{code:'P0001',message:'auth'}];
  if(fn==='pf_save'){if(a.p_best<1)return [400,{message:'bad_stage'}];p.save=a.p_save;p.updated=now;p.best=a.p_best;return [200,{now,updated:now}];}
  if(fn==='pf_titan'){if(a.p_score>1e6*Math.pow(1.9,a.p_best))return [400,{code:'P0001',message:'implausible'}];let m=DB.league.find(x=>x.id===a.p_id);if(!m){m={id:a.p_id,score:0,best:a.p_best};DB.league.push(m);}m.score+=a.p_score;return [200,{ok:true,week:'2026-W40',bracket:1}];}
  if(fn==='pf_board'){const me=DB.league.find(x=>x.id===a.p_id);if(!me)return [200,{week:'2026-W40',rows:[],joined:false}];
    const rows=DB.league.map(m=>({id:m.id,name:(DB.players[m.id]||{name:'Bot'}).name,score:m.score,best:m.best,me:m.id===a.p_id})).sort((x,y)=>y.score-x.score);return [200,{week:'2026-W40',rows,joined:true,bracket:1}];}
  if(fn==='pf_set_name'){p.name=a.p_name;return [200,{ok:true,name:a.p_name}];}
  if(fn==='pf_report'){DB.reports.push(a.p_target);return [200,{ok:true,count:1}];}
  if(fn==='pf_track'){DB.events.push(a.p_name);return [204,null];}
  return [404,{message:'nofn'}];
}
async function mock(ctx){await ctx.route('https://atmrbzkcneotleuoapdp.supabase.co/**',async route=>{const q=route.request();const fn=q.url().split('/rpc/')[1];
  T('apikey envoyée',q.headers()['apikey']&&q.headers()['apikey'].startsWith('sb_publishable'));
  const [st,body]=handle(fn,q.postDataJSON()||{});await route.fulfill({status:st,contentType:'application/json',body:body==null?'':JSON.stringify(body)});});}
(async()=>{const b=await chromium.launch();
  // --- appareil A : première ouverture
  const cA=await b.newContext({viewport:{width:390,height:844},locale:'fr-FR'});await mock(cA);const A=await cA.newPage();const errs=[];A.on('pageerror',e=>errs.push(e.message));
  await A.goto('http://localhost:8765/');await A.waitForTimeout(1200);
  const ev=(p,f,...a)=>p.evaluate(f,...a);
  let r=await ev(A,()=>{const G=window.__G;return {ready:G.netReady,on:G.netOK,off:G.clockOff,id:G.DEV.id,secret:G.DEV.s.length,dev:localStorage.getItem('prisme-dev')!==null,ver:G.S.v};});
  T('hello réussi',r.ready);T('en ligne',r.on);T('horloge calée sur le serveur (~90 s)',Math.abs(r.off-90000)<3000);T('uuid v4',/^[0-9a-f-]{36}$/.test(r.id)&&r.id[14]==='4');T('secret 48 hex',r.secret===48);T('identité persistée',r.dev);
  T('hello appelé',calls.includes('pf_hello'));T('première sauvegarde envoyée',calls.includes('pf_save'));T('évènement open',DB.events.includes('open'));
  // Date.now suit le serveur
  r=await ev(A,()=>{const G=window.__G;G.S.lastSeen=Date.now()-3600e3;return Date.now()-G.S.lastSeen;});T('Date.now décalé',r>=3600e3&&r<3605e3);
  // progression puis sauvegarde forcée
  const idA=await ev(A,()=>window.__G.DEV.id);
  await ev(A,()=>{const G=window.__G;G.S.shards=777;G.S.bestStage=12;G.S.run.stage=12;G.S.st.kills=50;G.save();return G.netSave(true);});await A.waitForTimeout(300);
  T('sauvegarde serveur à jour',DB.players[idA].save.shards===777&&DB.players[idA].best===12);
  // throttle 30 s
  const n0=calls.filter(c=>c==='pf_save').length;await ev(A,()=>window.__G.netSave(false));await A.waitForTimeout(200);T('netSave non forcé limité à 30 s',calls.filter(c=>c==='pf_save').length===n0);
  // masquage → save forcée
  await ev(A,()=>{Object.defineProperty(document,'hidden',{value:true,configurable:true});document.dispatchEvent(new Event('visibilitychange'));});await A.waitForTimeout(300);
  T('sauvegarde au masquage',calls.filter(c=>c==='pf_save').length===n0+1);
  // titan → serveur + ligue réelle
  await ev(A,()=>{const G=window.__G;G.S.bestStage=12;G.R.titanDmg=12345;G.endTitan();});await A.waitForTimeout(400);
  T('score titan envoyé',DB.league.length===1&&DB.league[0].score===12345);
  DB.players['11111111-1111-4111-8111-111111111111']={secret:'x',name:'Rival',best:20};DB.league.push({id:'11111111-1111-4111-8111-111111111111',score:99999,best:20});
  await ev(A,()=>{document.getElementById('veil').hidden=true;window.__G.setTab('league');});await A.waitForTimeout(500);await ev(A,()=>window.__G.renderTab());
  r=await ev(A,()=>{const rows=[...document.querySelectorAll('.lg')].map(e=>({n:e.querySelector('.nm').textContent,me:e.classList.contains('me'),rep:e.querySelector('[data-report]')&&e.querySelector('[data-report]').dataset.report}));return {rows,sub:document.querySelector('.phead p, .phead .sub')?.textContent||document.getElementById('tabPanel').textContent.slice(0,300)};});
  T('ligue serveur : 2 joueurs',r.rows.length===2);T('rival en tête',r.rows[0].n==='Rival'&&!r.rows[0].me);T('moi en 2e',r.rows[1].me);T('bouton signaler porte l\'uuid',r.rows[0].rep==='11111111-1111-4111-8111-111111111111');T('texte ligue réelle (pas "simulés")',!/simul/.test(r.sub));
  await A.click('[data-report]');await A.waitForTimeout(300);T('signalement envoyé au serveur',DB.reports[0]==='11111111-1111-4111-8111-111111111111');
  // pseudo
  await ev(A,()=>{window.__G.S.gems=100;window.__G.setTab('profile');});await A.waitForTimeout(200);
  await ev(A,()=>{document.getElementById('nameIn').value='Lumen Vif';document.getElementById('nameBtn').click();});await A.waitForTimeout(300);
  T('pseudo envoyé au serveur',DB.players[idA].name==='Lumen Vif');
  // panne serveur → voile, puis retour
  down=true;await ev(A,()=>window.__G.probeNet());await A.waitForTimeout(400);
  r=await ev(A,()=>({off:!window.__G.netOK,veil:!document.getElementById('offline').hidden,msg:document.getElementById('netMsg').textContent}));
  T('serveur HS → partie en pause',r.off&&r.veil);T('message serveur injoignable',/injoignable/.test(r.msg));
  down=false;await A.click('#retryNet');await A.waitForTimeout(400);r=await ev(A,()=>window.__G.netOK&&document.getElementById('offline').hidden);T('retour en ligne',r);
  await ev(A,()=>{window.__G.S.shards=4242;window.__G.S.st.kills=60;window.__G.save();return window.__G.netSave(true);});await A.waitForTimeout(300);
  const savedUpdated=DB.players[idA].updated;
  // --- appareil B : même identité, sauvegarde locale vide → récupère le serveur
  const cB=await b.newContext({viewport:{width:390,height:844},locale:'fr-FR'});await mock(cB);const B=await cB.newPage();B.on('pageerror',e=>errs.push(e.message));
  await B.addInitScript(d=>localStorage.setItem('prisme-dev',d),JSON.stringify({id:idA,s:await ev(A,()=>window.__G.DEV.s)}));
  await B.goto('http://localhost:8765/');await B.waitForTimeout(1200);
  r=await ev(B,()=>({shards:window.__G.S.shards,name:window.__G.S.name,best:window.__G.S.bestStage,fire:window.__G.R.cells.some(c=>c&&c.ft!=null)||true}));
  T('appareil B récupère la sauvegarde serveur',r.shards===4242&&r.best===12);T('pseudo serveur repris',r.name==='Lumen Vif');
  // --- appareil B avec une sauvegarde locale plus récente → la garde
  const cC=await b.newContext({viewport:{width:390,height:844},locale:'fr-FR'});await mock(cC);const C=await cC.newPage();C.on('pageerror',e=>errs.push(e.message));
  await C.addInitScript(({d,s})=>{localStorage.setItem('prisme-dev',d);localStorage.setItem('prisme-fusion-v7',s);},{d:JSON.stringify({id:idA,s:await ev(A,()=>window.__G.DEV.s)}),s:await ev(A,()=>{const S=JSON.parse(JSON.stringify(window.__G.S));S.shards=9999;S.lastSeen=Date.now()+600e3;return JSON.stringify(S);})});
  await C.goto('http://localhost:8765/');await C.waitForTimeout(1200);
  r=await ev(C,()=>window.__G.S.shards);T('sauvegarde locale plus récente conservée',r===9999);
  T('…et poussée au serveur',DB.players[idA].save.shards===9999);
  // --- mauvais secret → pas de hello, pas d'écrasement
  const cD=await b.newContext({viewport:{width:390,height:844},locale:'fr-FR'});await mock(cD);const D=await cD.newPage();D.on('pageerror',e=>errs.push(e.message));
  await D.addInitScript(d=>localStorage.setItem('prisme-dev',d),JSON.stringify({id:idA,s:'mauvais'}));
  await D.goto('http://localhost:8765/');await D.waitForTimeout(1200);
  r=await ev(D,()=>({ready:window.__G.netReady,on:window.__G.netOK}));T('secret faux → hors session serveur',!r.ready);T('mais le jeu reste jouable en ligne',r.on);
  T('sauvegarde serveur intacte',DB.players[idA].save.shards===9999);
  // score implausible refusé côté client sans casser le jeu
  await ev(A,()=>{window.__G.R.titanDmg=1e40;window.__G.endTitan();});await A.waitForTimeout(300);T('score absurde rejeté, jeu intact',DB.league[0].score===12345);
  T('aucune erreur JS',errs.length===0);if(errs.length)console.log(errs);
  console.log(`t7net : ${ok} OK, ${ko} KO`);await b.close();srv.close();})();
