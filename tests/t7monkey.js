// Test « singe » : clics au hasard sur tout le jeu contre le VRAI noyau serveur, avec vérification d'accord téléphone/serveur.
const {chromium}=require('playwright');const http=require('http');const fs=require('fs');
const {pfApply,pfLeagueMinutes}=require('./pf_core.js');const ENGINE=require('./pf_src.js')().replace('days:[2,4,6]','days:[0,1,2,3,4,5,6]'); // Titan tous les jours pour le test
let ok=0,ko=0;const T=(n,c)=>{if(c)ok++;else{ko++;console.log('KO',n);}};
const html=fs.readFileSync('/home/claude/fusion/wrapped.html');
const srv=http.createServer((q,s)=>{s.writeHead(200,{'content-type':'text/html'});s.end(html);}).listen(8767);
const SKEW=90000;const now=()=>Date.now()+SKEW;
const DB={players:{},league:[],reports:[],anomalies:[],events:[]};let calls=[],down=false,pendingLeague={};
function player(id,secret,lang,name){let p=DB.players[id];if(!p){p=DB.players[id]={secret,state:null,ver:0,name,anom:0,banned:false};}return p.secret===secret?p:null;}
function handle(url,a){
  const fn=url.includes('/rpc/')?url.split('/rpc/')[1]:url.includes('/functions/v1/pf-act')?'act':'?';calls.push(fn);
  if(down)return [503,{message:'down'}];
  if(fn==='pf_time')return [200,{now:now()}];
  if(fn==='pf_track_batch'){const pl=DB.players[a.p_id];if(!pl||pl.secret!==a.p_secret)return [200,0];for(const e of a.p_events||[])DB.events.push({id:a.p_id,n:e.n,p:e.p});return [200,(a.p_events||[]).length];}
  if(fn==='act'){
    const p=player(a.id,a.secret,a.lang,a.name);if(!p)return [401,{ok:false,err:'auth'}];if(p.banned)return [403,{ok:false,err:'banned'}];
    const r=pfApply(ENGINE,p.state,a,now(),false);
    if(r.result&&r.result.ok===false&&!['sync','hello','gift_offer'].includes(a.action))(DB.fails=DB.fails||[]).push(a.action+':'+JSON.stringify(a.payload)+' → '+r.result.err);
    if(r.anomalies.length)(DB.anDetail=DB.anDetail||[]).push({action:a.action,an:r.anomalies,cli:a.sim&&a.sim.run&&a.sim.run.sparks,srv:p.state&&p.state.run&&p.state.run.sparks,pay:JSON.stringify(a.payload).slice(0,60)});
    const effects=[];for(const e of (r.result.effects||[])){if(typeof e.titan==='number'){let m=DB.league.find(x=>x.id===a.id);if(!m){m={id:a.id,score:0,best:e.best};DB.league.push(m);}m.score+=e.titan;m.best=Math.max(m.best,e.best);effects.push({titan:true});}if(e.name){p.name=e.name;}if(e.report)DB.reports.push(e.report);}
    let league=null;if(a.action==='hello'&&pendingLeague[a.id]){const lr=pendingLeague[a.id];delete pendingLeague[a.id];const r2=pfApply(ENGINE,r.state,{action:'league',payload:{gems:lr.gems,minutes:pfLeagueMinutes(lr.rank)}},now(),true);r.state=r2.state;league={...lr,sparks:r2.result.sparks};}
    p.state=r.state;p.ver++;p.anom+=r.anomalies.length;if(r.anomalies.length)DB.anomalies.push({id:a.id,action:a.action,kinds:r.anomalies});
    return [200,{ok:true,now:now(),state:r.state,result:r.result,anomalies:r.anomalies,league,effects}];
  }
  const p=player(a.p_id,a.p_secret);if(!p)return [400,{code:'P0001',message:'auth'}];
  if(fn==='pf_board'){const me=DB.league.find(x=>x.id===a.p_id);if(!me)return [200,{week:'w',rows:[],joined:false}];const rows=DB.league.map(m=>({id:m.id,name:(DB.players[m.id]||{name:'Bot'}).name,score:m.score,best:m.best,me:m.id===a.p_id})).concat([{bot:true,k:1,score:1,best:12},{bot:true,k:2,score:2,best:11}]).sort((x,y)=>y.score-x.score);return [200,{week:'w',rows,joined:true,bracket:1,tier:1}];}
  return [404,{message:'nofn'}];
}
let LAT=0;
async function mock(ctx){await ctx.route('https://atmrbzkcneotleuoapdp.supabase.co/**',async route=>{const q=route.request();
  if(LAT&&/pf-act/.test(q.url()))await new Promise(z=>setTimeout(z,LAT));
  const [st,body]=handle(q.url(),q.postDataJSON()||{});await route.fulfill({status:st,contentType:'application/json',body:JSON.stringify(body)});});}
const ev=(p,f,...a)=>p.evaluate(f,...a);
const SEED=+(process.argv[2]||1);let rs=SEED;const rnd=()=>{rs=(rs*16807)%2147483647;return rs/2147483647;};
(async()=>{const b=await chromium.launch();const errs=[];
  const cA=await b.newContext({viewport:{width:390,height:844},locale:'fr-FR'});await mock(cA);const A=await cA.newPage();A.on('pageerror',e=>errs.push(e.message));
  await A.addInitScript(()=>{window.__toasts=[];new MutationObserver(()=>{}).observe(document,{childList:true});document.addEventListener('DOMContentLoaded',()=>{const t=document.getElementById('toast');new MutationObserver(()=>{if(!t.hidden)window.__toasts.push({t:Date.now(),m:t.textContent});}).observe(t,{attributes:true,childList:true,characterData:true,subtree:true});});});
  await A.goto('http://localhost:8767/');await A.waitForTimeout(1500);
  const id=await ev(A,()=>window.__G.DEV.id);
  // ressources de départ côté serveur (autorité), puis réveil
  const st=DB.players[id].state;st.gems=4000;st.bestStage=45;st.maxStage=45;st.run.stage=12;st.run.max=12;st.run.sparks=5e6;st.prestiges=1;st.pp=6;st.st.tuto=3;st.st.namePrompted=true;st.settings.age='a';
  await ev(A,async()=>{const G=window.__G;await G.actAsync('hello');document.getElementById('veil').hidden=true;G.refresh();});
  const SKIP=['resetBtn','xferEnter','xferShow','acLink','acLogout','gdLeave','langBtn','privBtn','notifTest'];
  const issues=[];const actions={};let steps=0;
  const ITER=+(process.argv[3]||500);for(let it=0;it<ITER;it++){
    const pick=await ev(A,([r1,r2,SKIP])=>{const vis=e=>e.offsetParent&&!e.disabled&&e.getAttribute('aria-disabled')!=='true';
      const veil=!document.getElementById('veil').hidden;let pool;
      if(veil)pool=[...document.querySelectorAll('#modal button')].filter(vis);
      else if(r1<0.18)pool=[...document.querySelectorAll('.nav button')].filter(vis);
      else pool=[...document.querySelectorAll('#panel:not([hidden]) button,#panel:not([hidden]) [data-claim],#game button')].filter(vis).filter(e=>!SKIP.includes(e.id)&&!e.hasAttribute('data-doreset')&&!/data-gkick/.test(e.outerHTML));
      if(!pool.length)return null;const e=pool[Math.floor(r2*pool.length)];const label=(e.id||Object.keys(e.dataset).join(',')||e.className).slice(0,40)+':'+(e.innerText||'').replace(/\s+/g,' ').slice(0,30);e.click();return label;},[rnd(),rnd(),SKIP]);
    if(pick){steps++;actions[pick.split(':')[0]]=(actions[pick.split(':')[0]]|0)+1;}
    if(rnd()<0.35){const onHome=await ev(A,()=>window.__G.tab==='home'&&document.getElementById('veil').hidden);if(onHome){const bb=await A.locator('#board').boundingBox();if(bb){const N=4,c=bb.width/N,cx=i=>bb.x+c*(i%N)+c/2,cy=i=>bb.y+c*Math.floor(i/N)+c/2;const a1=Math.floor(rnd()*16),a2=Math.floor(rnd()*16);await A.mouse.move(cx(a1),cy(a1));await A.mouse.down();await A.mouse.move(cx(a2),cy(a2),{steps:4});await A.mouse.up();}}}
    await A.waitForTimeout(60);
    if(it%40===39){ // synchronisation + comparaison téléphone / serveur
      const cmp=await ev(A,async()=>{const G=window.__G;const before=JSON.parse(JSON.stringify({gems:G.S.gems,up:G.S.up,jk:G.S.jk,skins:G.S.skins,pass:G.S.pass,slots:G.S.slots,jslots:G.S.jslots,wp:G.S.wp,equip:G.S.equip,settings:G.S.settings,starter:G.S.starter,firstX2:G.S.firstX2}));
        await G.actAsync('sync');await new Promise(z=>setTimeout(z,50));
        const after=JSON.parse(JSON.stringify({gems:G.S.gems,up:G.S.up,jk:G.S.jk,skins:G.S.skins,pass:G.S.pass,slots:G.S.slots,jslots:G.S.jslots,wp:G.S.wp,equip:G.S.equip,settings:G.S.settings,starter:G.S.starter,firstX2:G.S.firstX2}));
        const diff=[];for(const k in before){if(k==='pass'&&(!before.pass||!before.pass.xp&&!before.pass.prem)&&(!after.pass||!after.pass.xp&&!after.pass.prem))continue;if(k==='up'&&Object.keys(before.up).every(u=>(after.up[u]|0)>=(before.up[u]|0)))continue;if(JSON.stringify(before[k])!==JSON.stringify(after[k]))diff.push(k+': '+JSON.stringify(before[k]).slice(0,80)+' → '+JSON.stringify(after[k]).slice(0,80));}return diff;});
      const srvS=DB.players[id].state;const cli=await ev(A,()=>({gems:window.__G.S.gems,sp:window.__G.S.run.sparks,pend:window.__G.PEND.length}));
      if(!cli.pend&&Math.abs(cli.sp-srvS.run.sparks)>Math.max(50,0.02*srvS.run.sparks))issues.push('it'+it+' étincelles téléphone '+Math.round(cli.sp)+' ≠ serveur '+Math.round(srvS.run.sparks));
      if(cmp.length)issues.push('it'+it+' retour en arrière après synchro : '+cmp.join(' | '));
      if(srvS.gems!==cli.gems)issues.push('it'+it+' gemmes téléphone '+cli.gems+' ≠ serveur '+srvS.gems);
    }
  }
  const toasts=await ev(A,()=>window.__toasts);
  const refused=toasts.filter(x=>/refus/i.test(x.m));
  const spam={};for(let i=1;i<toasts.length;i++){if(toasts[i].m===toasts[i-1].m&&toasts[i].t-toasts[i-1].t<1500&&!/^\+|Récompense|émeraude/.test(toasts[i].m))spam[toasts[i].m]=(spam[toasts[i].m]|0)+1;}
  console.log('graine',SEED,'clics',steps,'actions distinctes',Object.keys(actions).length);
  console.log('erreurs JS',errs.length,errs.slice(0,5));
  console.log('refus serveur',refused.length,refused.slice(0,8).map(x=>x.m));
  console.log('messages répétés',JSON.stringify(spam));
  console.log('écarts',issues.length);issues.slice(0,12).forEach(x=>console.log(' ',x));
  console.log('refus serveur (actions)',(DB.fails||[]).length,JSON.stringify((DB.fails||[]).slice(0,12)));console.log('anomalies',(DB.anDetail||[]).length,JSON.stringify((DB.anDetail||[]).slice(0,6)));
  console.log('toasts distincts',[...new Set(toasts.map(x=>x.m))].slice(0,40).join(' | '));
  await b.close();srv.close();})();
