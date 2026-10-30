// v12.9 : packs payants des événements du week-end (moteur serveur + vrai client)
const {pfApply,pfMakeEngine}=require('./pf_core.js');const src=require('./pf_src.js')();
let ok=0,ko=0;const T=(n,c,x)=>{if(c)ok++;else{ko++;console.log('KO',n,x===undefined?'':JSON.stringify(x));}};
const H=36e5,D=864e5,SAT=Date.UTC(2026,9,31,12),WED=SAT+4*D;
const eng=t=>pfMakeEngine(src,t);
function fresh(t){const G=eng(t);const S=G.fresh();S.tz=60;S.lastSeen=t;S.bestStage=40;S.run.stage=40;S.run.max=40;S.gems=0;S.run.sparks=1000;S.run.brate=50;return S;}
const act=(S,action,payload,t)=>pfApply(src,S,{action,payload:payload||{},demo:true},t);
const when={};{const G=eng(SAT);for(let w=0;w<4;w++){const t=SAT+w*7*D;when[G.weekendEvent(t)]=t;}}
T('les 4 événements sont trouvés',Object.keys(when).length===4,Object.keys(when));
const P=eng(SAT).CFG.evPack;
// 1. contenu de chaque pack, pour chaque événement
for(const e of ['spark','build','joker','gift'])for(let i=0;i<3;i++){const t=when[e];let S=fresh(t);const r=act(S,'purchase',{id:'ev'+(i+1)},t);S=r.state;
  const g=P.g[i]+(e==='gift'?P.gift[i]:0);
  T(`${e} palier ${i+1} : acheté`,r.result.ok===true,r.result);T(`${e} palier ${i+1} : gemmes`,S.gems===g,{g:S.gems,att:g});
  if(e==='spark')T(`${e} ${i+1} : ×2 pendant ${P.spark[i]} h`,Math.abs(S.boostUntil-t-P.spark[i]*H)<2000);
  if(e==='build')T(`${e} ${i+1} : ${P.build[i]} jeton(s)`,S.rt===P.build[i]);
  if(e==='joker')T(`${e} ${i+1} : étincelles (${P.joker[i]} min de production)`,S.run.sparks>=1000+P.joker[i]*50*60*0.99,S.run.sparks);
  if(e!=='spark')T(`${e} ${i+1} : pas de ×2`,!(S.boostUntil>t));}
// 2. une seule fois par palier et par événement
{const t=when.spark;let S=fresh(t);S=act(S,'purchase',{id:'ev2'},t).state;const r=act(S,'purchase',{id:'ev2'},t+H);T('même palier racheté le même week-end : refusé',r.result.ok===false&&r.state.gems===P.g[1]);
 const r2=act(r.state,'purchase',{id:'ev2'},t+D);T('…ni le dimanche',r2.result.ok===false);
 const r3=act(r2.state,'purchase',{id:'ev1'},t+D);T('autre palier le dimanche : accepté',r3.result.ok===true);
 const r4=act(r3.state,'purchase',{id:'ev2'},t+7*D);T('le week-end suivant : de nouveau disponible',r4.result.ok===true);}
// 3. en semaine : indisponible ; bornes locales (fuseau +1 h)
{let S=fresh(WED);T('en semaine : refusé',act(S,'purchase',{id:'ev1'},WED).result.ok===false);
 const sun=SAT+D,monLocal=Date.UTC(2026,10,1,23,0)+60*1000;/* lundi 00:01 heure locale (UTC+1) */const sunLocal=Date.UTC(2026,10,1,22,58);
 T('dimanche 23:58 (heure locale) : encore disponible',act(fresh(sunLocal),'purchase',{id:'ev1'},sunLocal).result.ok===true);
 T('lundi 00:01 (heure locale) : terminé',act(fresh(monLocal),'purchase',{id:'ev1'},monLocal).result.ok===false);}
// 4. jetons de recherche : terminent une recherche sans gemmes, puis les gemmes reprennent
{const t=when.build;let S=fresh(t);S.gems=0;S=act(S,'purchase',{id:'ev1'},t).state;const g0=S.gems;
 S=act(S,'build',{id:'st_cad'},t).state;T('recherche lancée',S.build.length===1);
 let r=act(S,'rush',{id:'st_cad'},t+1000);S=r.state;T('jeton : recherche terminée sans dépenser de gemmes',r.result.ok&&S.build.length===0&&S.gems===g0&&(S.rt|0)===0,{rt:S.rt,g:S.gems,g0,b:S.build});
 S=act(S,'build',{id:'st_cad'},t+2000).state;S.gems=0;r=act(S,'rush',{id:'st_cad'},t+3000);T('sans jeton ni gemme : refusé',r.result.ok===false);}
// 5. triche : impossible d'acheter « pour de vrai » hors mode démo sans validation boutique
{const t=when.gift;const r=pfApply(src,fresh(t),{action:'purchase',payload:{id:'ev3'}},t);T('achat sans validation de la boutique : refusé',r.result.ok===false&&r.state.gems===0);}
console.log(`t7evpack (moteur) : ${ok} OK, ${ko} KO`);
// ---------- vrai client ----------
(async()=>{const {chromium}=require('playwright');const http=require('http');const fs=require('fs');
 const html=fs.readFileSync('/home/claude/fusion/wrapped.html');const srv=http.createServer((q,s)=>{s.writeHead(200,{'content-type':'text/html'});s.end(html);}).listen(8768);
 const t0=when.build-3*H;const SK=t0-Date.now();const now=()=>Date.now()+SK;const DB={};
 const b=await chromium.launch();const c=await b.newContext({viewport:{width:390,height:844},locale:'fr-FR',timezoneId:'Europe/Paris'});
 await c.route('https://atmrbzkcneotleuoapdp.supabase.co/**',async route=>{const q=route.request();let a={};try{a=q.postDataJSON()||{};}catch(e){}let st=200,body=null;
   if(q.url().includes('pf_time'))body={now:now()};else if(q.url().includes('pf-act')){let p=DB[a.id];if(!p)p=DB[a.id]={state:null};const r=pfApply(src,p.state,a,now(),false);p.state=r.state;body={ok:true,now:now(),state:r.state,result:r.result,anomalies:r.anomalies,league:null,effects:[]};}
   await route.fulfill({status:st,contentType:'application/json',body:JSON.stringify(body)});});
 const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.clock.install({time:t0});await p.goto('http://localhost:8768/');await p.waitForTimeout(2500);
 const id=await p.evaluate(()=>window.__G.DEV.id);
 {const st=DB[id].state;st.bestStage=40;st.run.stage=40;st.run.max=40;st.maxStage=40;st.st.tuto=3;st.gems=50;st.srvAt=now();st.simBy='autre';}
 await p.evaluate(async()=>{await window.__G.actAsync('sync');window.__G.closeModal&&window.__G.closeModal();document.getElementById('veil').hidden=true;window.__G.setTab('home');});
 await p.waitForTimeout(1500);
 let r=await p.evaluate(()=>({chip:!document.getElementById('evChip').hidden,modal:!document.getElementById('veil').hidden,txt:document.getElementById('modal').innerText,rows:document.querySelectorAll('#modal .evpk .offer').length}));
 T('client : pastille de l\'événement visible sur l\'accueil',r.chip,r);T('client : fenêtre des packs ouverte une fois (3 paliers)',r.modal&&r.rows===3,r);
 await p.screenshot({path:'/tmp/claude-0/-home-claude/88f4d138-66ef-5763-882a-0d473f4a1294/scratchpad/evpk_modal.png'});
 await p.evaluate(()=>document.querySelector('#modal [data-close]').click());await p.waitForTimeout(1200);
 r=await p.evaluate(()=>!document.getElementById('veil').hidden);T('client : la fenêtre ne revient pas toute seule',!r);
 await p.screenshot({path:'/tmp/claude-0/-home-claude/88f4d138-66ef-5763-882a-0d473f4a1294/scratchpad/evpk_home.png'});
 // achat du palier 2 depuis la pastille
 await p.evaluate(()=>document.getElementById('evChip').click());await p.waitForTimeout(300);
 await p.evaluate(()=>document.querySelector('#modal [data-offer="ev2"]').click());await p.waitForTimeout(300);
 r=await p.evaluate(()=>document.getElementById('modal').innerText);T('client : confirmation avec prix',/4,99/.test(r),r);
 await p.evaluate(()=>document.querySelector('#modal [data-confirm]').click());await p.waitForTimeout(1500);
 r=await p.evaluate(()=>({g:window.__G.S.gems,rt:window.__G.S.rt}));T('client : pack reçu (gemmes + 3 jetons) et confirmé par le serveur',r.g===50+P.g[1]&&r.rt===P.build[1]&&DB[id].state.rt===P.build[1]&&DB[id].state.gems===r.g,{r,srv:DB[id].state.gems});
 // boutique : 3 lignes, palier 2 acheté ; les packs ne sont pas en double dans « offres »
 await p.evaluate(()=>window.__G.setTab('shop'));await p.waitForTimeout(300);
 r=await p.evaluate(()=>({rows:document.querySelectorAll('#panel .evpk .offer').length,dis:[...document.querySelectorAll('#panel .evpk [data-offer]')].map(b=>b.disabled),dup:document.querySelectorAll('#panel [data-offer^="ev"]').length}));
 T('client : boutique : 3 paliers, le 2e marqué acheté',r.rows===3&&r.dis.join()==='false,true,false'&&r.dup===3,r);
 await p.screenshot({path:'/tmp/claude-0/-home-claude/88f4d138-66ef-5763-882a-0d473f4a1294/scratchpad/evpk_shop.png',fullPage:false});
 // jeton dans l'Atelier
 await p.evaluate(()=>{const G=window.__G;G.S.run.sparks=1e6;G.setTab('atelier');document.querySelector('[data-build="st_cad"]').click();});await p.waitForTimeout(800);
 r=await p.evaluate(()=>{const b=document.querySelector('#panel [data-rush]');return b?{gold:b.classList.contains('b-gold'),txt:b.innerText}:null;});T('client : bouton « terminer » avec jeton (×3)',r&&r.gold&&/×3/.test(r.txt),r);
 await p.screenshot({path:'/tmp/claude-0/-home-claude/88f4d138-66ef-5763-882a-0d473f4a1294/scratchpad/evpk_atelier.png'});
 await p.evaluate(()=>document.querySelector('#panel [data-rush]').click());await p.waitForTimeout(1200);
 r=await p.evaluate(()=>({rt:window.__G.S.rt,b:window.__G.S.build.length}));T('client : jeton utilisé, recherche terminée (serveur d\'accord)',r.rt===2&&r.b===0&&DB[id].state.rt===2,{r,srv:DB[id].state.rt});
 // tout acheté → la pastille disparaît
 for(const o of ['ev1','ev3'])await p.evaluate(o=>{window.__G.act('purchase',{id:o},()=>window.__G.purchase(o));},o);await p.waitForTimeout(1200);
 await p.evaluate(()=>window.__G.setTab('home'));await p.waitForTimeout(1200);
 T('client : tout acheté → plus de pastille',await p.evaluate(()=>document.getElementById('evChip').hidden));
 // lundi : plus de pastille ni de packs ; en semaine rien en boutique
 await p.clock.setSystemTime(when.build+2*D);await p.waitForTimeout(1500);
 r=await p.evaluate(()=>{window.__G.setTab('shop');return {chip:document.getElementById('evChip').hidden,rows:document.querySelectorAll('#panel .evpk').length};});T('client : lundi : plus de packs',r.chip&&r.rows===0,r);
 // langues
 for(const L of ['en','de','es','it','pt']){const v=await p.evaluate(L=>{window.__G.setLang(L);const o=window.__G.OFFERS.find(x=>x.id==='ev1');return [o.t,window.__G.t('evp_aria'),window.__G.t('rt_use')];},L);T('langue '+L+' : textes présents',v.every(x=>x&&!/evp_|rt_use|ev_/.test(x)),v);}
 T('client : aucune erreur JS',errs.length===0,errs);
 console.log(`t7evpack : ${ok} OK, ${ko} KO`);await b.close();srv.close();process.exit(ko?1:0);
})().catch(e=>{console.log('ERR',e);process.exit(1);});
