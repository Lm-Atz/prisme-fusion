// Guildes : 3 joueurs simulés (A chef, B par code, C via la liste) contre le vrai noyau pf_core + un faux Supabase
// qui reproduit les règles SQL (pf_guild_*) et les branches guilde de la fonction pf-act.
const {chromium}=require('playwright');const http=require('http');const fs=require('fs');
const {pfApply}=require('./pf_core.js');const ENGINE=require('./pf_src.js')().replace('days:[2,4,6]','days:[0,1,2,3,4,5,6]');
let ok=0,ko=0;const T=(n,c)=>{if(c)ok++;else{ko++;console.log('KO',n);}};
const html=fs.readFileSync('/home/claude/fusion/wrapped.html');
const srv=http.createServer((q,s)=>{s.writeHead(200,{'content-type':'text/html'});s.end(html);}).listen(8767);
const now=()=>Date.now();
const TIERS=[200,600,1500,3000,6000],SIZE=30;
const DB={players:{},guilds:{},members:{},points:{},claims:[]};let down=false;
function player(id,secret,name){let p=DB.players[id];if(!p){p=DB.players[id]={secret,state:null,ver:0,name:name||'Prisme'};}return p.secret===secret?p:null;}
const mem=id=>{const m=DB.members[id];return m&&m.active?m:null;};
const nActive=gid=>Object.values(DB.members).filter(m=>m.active&&m.gid===gid).length;
const total=gid=>Object.entries(DB.points).filter(([k])=>k.startsWith(gid+':')).reduce((a,[,v])=>a+v,0);
const err=m=>[400,{code:'P0001',message:m}];
function guildRpc(fn,a,p){
  if(fn==='pf_guild'){const m=mem(a.p_id);if(!m)return [200,{guild:null,tiers:TIERS,now:now()}];const g=DB.guilds[m.gid];
    const members=Object.entries(DB.members).filter(([,x])=>x.active&&x.gid===m.gid).map(([id,x])=>({id,name:DB.players[id].name,best:1,pts:DB.points[m.gid+':'+id]||0,leader:g.leader===id,me:id===a.p_id,since:x.joined,seen:now()})).sort((x,y)=>y.pts-x.pts);
    return [200,{guild:{id:g.id,name:g.name,code:g.code,open:g.open,leader:g.leader,n:nActive(g.id),max:SIZE},week:'w',total:total(g.id),tiers:TIERS,claims:DB.claims.filter(c=>c.id===a.p_id&&c.gid===g.id).map(c=>c.tier),members,since:m.joined,now:now()}];}
  if(fn==='pf_guild_list')return [200,{rows:Object.values(DB.guilds).filter(g=>g.open&&!g.dissolved&&nActive(g.id)>0&&nActive(g.id)<SIZE).map(g=>({id:g.id,name:g.name,code:g.code,n:nActive(g.id),pts:total(g.id)}))}];
  if(fn==='pf_guild_create'){if(mem(a.p_id))return err('in_guild');const n=String(a.p_name||'').trim();if(n.length<3||n.length>20)return err('bad_name');if(Object.values(DB.guilds).some(g=>!g.dissolved&&g.name.toLowerCase()===n.toLowerCase()))return err('name_taken');
    const id='g'+Object.keys(DB.guilds).length,code='CODE'+String(Object.keys(DB.guilds).length).padStart(2,'0');DB.guilds[id]={id,name:n,code,leader:a.p_id,open:true,dissolved:false};DB.members[a.p_id]={gid:id,joined:now(),active:true};return [200,{ok:true,id,code,name:n}];}
  if(fn==='pf_guild_join'){if(mem(a.p_id))return err('in_guild');const g=Object.values(DB.guilds).find(x=>x.code===String(a.p_code).trim().toUpperCase()&&!x.dissolved);if(!g)return err('no_guild');if(nActive(g.id)>=SIZE)return err('full');DB.members[a.p_id]={gid:g.id,joined:now(),active:true};return [200,{ok:true,id:g.id,name:g.name}];}
  if(fn==='pf_guild_leave'){const m=mem(a.p_id);if(!m)return err('no_guild');const g=DB.guilds[m.gid];m.active=false;if(g.leader===a.p_id){const nxt=Object.entries(DB.members).filter(([,x])=>x.active&&x.gid===g.id).sort((x,y)=>x[1].joined-y[1].joined)[0];if(!nxt){g.dissolved=true;g.open=false;}else g.leader=nxt[0];}return [200,{ok:true}];}
  if(fn==='pf_guild_kick'){const m=mem(a.p_id);const g=m&&DB.guilds[m.gid];if(!g||g.leader!==a.p_id)return err('not_leader');if(a.p_target===a.p_id)return err('self');const t=DB.members[a.p_target];if(t&&t.gid===g.id)t.active=false;return [200,{ok:true}];}
  if(fn==='pf_guild_open'){const g=Object.values(DB.guilds).find(x=>x.leader===a.p_id&&!x.dissolved);if(g)g.open=!!a.p_open;return [200,{ok:!!g}];}
  return null;
}
// réservées au serveur
function guildAdd(id,pts){const m=mem(id);if(!m)return {ok:false,err:'no_guild'};DB.points[m.gid+':'+id]=(DB.points[m.gid+':'+id]||0)+pts;return {ok:true,total:total(m.gid)};}
function guildClaim(id,tier){if(tier<1||tier>TIERS.length)return 'bad_tier';const m=mem(id);if(!m)return 'no_guild';if(total(m.gid)<TIERS[tier-1])return 'not_reached';if(m.joined>now()-86400e3)return 'too_recent';if(DB.claims.some(c=>c.id===id&&c.gid===m.gid&&c.tier===tier))return 'claimed';DB.claims.push({id,gid:m.gid,tier});return null;}
function handle(url,a){
  const fn=url.includes('/rpc/')?url.split('/rpc/')[1]:url.includes('/functions/v1/pf-act')?'act':'?';
  if(down)return [503,{message:'down'}];
  if(fn==='pf_time')return [200,{now:now()}];
  if(fn==='act'){
    const p=player(a.id,a.secret,a.name);if(!p)return [401,{ok:false,err:'auth'}];
    let body=a,trusted=false,guildRes=null;const pl=a.payload||{};
    if(a.action==='guild_create'){if(((p.state&&p.state.gems)|0)<50)return [200,{ok:false,err:'gems'}];const c=guildRpc('pf_guild_create',{p_id:a.id,p_name:pl.name});if(c[0]!==200)return [200,{ok:false,err:c[1].message}];guildRes=c[1];body={...a,action:'guild_pay',payload:{gems:50}};trusted=true;}
    else if(a.action==='guild_claim'){const e=guildClaim(a.id,Number(pl.tier)|0);if(e)return [200,{ok:false,err:e}];body={...a,action:'guild_reward',payload:{tier:Number(pl.tier)|0}};trusted=true;}
    else if(a.action==='guild_pay'||a.action==='guild_reward')return [403,{ok:false,err:'trusted'}];
    const r=pfApply(ENGINE,p.state,body,now(),trusted);if(guildRes)r.result.guild=guildRes;
    for(const e of (r.result.effects||[])){if(e.name)p.name=e.name;if(typeof e.gpts==='number'){const g=guildAdd(a.id,e.gpts);if(!g.ok){r.state.day.gq=(r.state.day.gq||[]).filter(x=>x!==e.i);r.result.ok=false;r.result.err='no_guild';}}}
    p.state=r.state;p.ver++;
    return [200,{ok:true,now:now(),state:r.state,result:r.result,anomalies:r.anomalies,league:null,effects:[]}];
  }
  const p=player(a.p_id,a.p_secret);if(!p)return err('auth');
  if(fn==='pf_board')return [200,{week:'w',rows:[],joined:false}];
  const g=guildRpc(fn,a,p);if(g)return g;
  return [404,{message:'nofn'}];
}
async function mock(ctx){await ctx.route('https://atmrbzkcneotleuoapdp.supabase.co/**',async route=>{const q=route.request();const [st,body]=handle(q.url(),q.postDataJSON()||{});await route.fulfill({status:st,contentType:'application/json',body:JSON.stringify(body)});});}
const ev=(p,f,...a)=>p.evaluate(f,...a);const wait=(p,ms)=>p.waitForTimeout(ms);
async function open(b,errs,tag){const c=await b.newContext({viewport:{width:390,height:844},locale:'fr-FR'});await mock(c);const p=await c.newPage();p.on('pageerror',e=>errs.push(tag+':'+e.message));await p.goto('http://localhost:8767/');await wait(p,1200);await ev(p,()=>{document.getElementById('veil').hidden=true;window.__G.CFG.titan.days=[0,1,2,3,4,5,6];});return p;}
const toGuild=async p=>{await ev(p,()=>{const G=window.__G;G.guildCache=null;G.guildList=null;G.clanPane='guild';G.setTab('clan');});await wait(p,500);return ev(p,()=>document.getElementById('panel').innerText);};
(async()=>{const b=await chromium.launch();const errs=[];
  const A=await open(b,errs,'A'),B=await open(b,errs,'B'),C=await open(b,errs,'C');
  const idA=await ev(A,()=>window.__G.DEV.id),idB=await ev(B,()=>window.__G.DEV.id),idC=await ev(C,()=>window.__G.DEV.id);
  // --- onglet Clan : deux volets
  let txt=await ev(A,async()=>{const G=window.__G;G.setTab('clan');await new Promise(z=>setTimeout(z,300));return document.getElementById('panel').innerText;});
  T('onglet Clan : volet Ligue par défaut',/Ligue/.test(txt)&&/Récompenses de fin de semaine/.test(txt));
  txt=await toGuild(A);T('volet Guilde sans guilde : créer / rejoindre / liste',/Créer une guilde/.test(txt)&&/Rejoindre avec un code/.test(txt)&&/Aucune guilde ouverte/.test(txt));
  // --- création : 20 gemmes → refus ; bouton désactivé
  let r=await ev(A,()=>document.getElementById('gdCreate').disabled);T('création désactivée à 20 gemmes',r===true);
  r=await ev(A,async()=>{const G=window.__G;const d=await G.actAsync('guild_create',{name:'Les Prismes'});return d&&d.err;});T('serveur refuse la création sans 50 gemmes',r==='gems');
  DB.players[idA].state.gems=80;await ev(A,()=>window.__G.actAsync('hello'));await wait(A,300);
  r=await ev(A,async()=>{const G=window.__G;G.guildCache=null;G.setTab('clan');await new Promise(z=>setTimeout(z,300));document.getElementById('gdName').value='ab';document.getElementById('gdCreate').click();await new Promise(z=>setTimeout(z,500));return {err:document.getElementById('gdErr')&&document.getElementById('gdErr').textContent,gems:G.S.gems};});
  T('nom trop court refusé, gemmes intactes',/3 à 20/.test(r.err)&&r.gems===80);
  r=await ev(A,async()=>{const G=window.__G;document.getElementById('gdName').value='Les Prismes';document.getElementById('gdCreate').click();await new Promise(z=>setTimeout(z,700));return {gems:G.S.gems,txt:document.getElementById('panel').innerText};});
  T('guilde créée : 50 gemmes débitées côté serveur',r.gems===30&&DB.players[idA].state.gems===30&&DB.guilds.g0&&DB.guilds.g0.leader===idA);
  T('vue guilde : nom, code, jauge, paliers, quêtes, membres',/Les Prismes/.test(r.txt)&&/CODE00/.test(r.txt)&&/Jauge hebdo/.test(r.txt)&&/0 \/ 6 000|0 \/ 6000/.test(r.txt.replace(/ | /g,' '))&&/Quêtes du jour/.test(r.txt)&&/1 \/ 30 membres/.test(r.txt));
  // --- B rejoint par code (minuscule), C via la liste
  txt=await toGuild(B);
  r=await ev(B,async()=>{document.getElementById('gdCode').value='code00';document.getElementById('gdJoin').click();await new Promise(z=>setTimeout(z,700));return document.getElementById('panel').innerText;});
  T('B rejoint par code',/Les Prismes/.test(r)&&/2 \/ 30 membres/.test(r)&&mem(idB)&&mem(idB).gid==='g0');
  txt=await toGuild(C);T('C voit la guilde ouverte dans la liste',/Les Prismes/.test(txt)&&/2\/30/.test(txt));
  r=await ev(C,async()=>{document.querySelector('[data-gjoin]').click();await new Promise(z=>setTimeout(z,700));return document.getElementById('panel').innerText;});
  T('C rejoint via la liste',/3 \/ 30 membres/.test(r));
  r=await ev(C,async()=>{const G=window.__G;const x=await G.actAsync('sync');const j=await (async()=>{try{return await fetch('https://atmrbzkcneotleuoapdp.supabase.co/rest/v1/rpc/pf_guild_join',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({p_id:G.DEV.id,p_secret:G.DEV.s,p_code:'CODE00'})}).then(r=>r.json());}catch(e){return null;}})();return j&&j.message;});
  T('rejoindre deux fois → in_guild',r==='in_guild');
  // --- quêtes de guilde : 3 par jour, une par niveau, validation serveur → points dans la jauge
  r=await ev(A,()=>window.__G.guildQuests().map(q=>q.pts));T('3 quêtes du jour (10/20/30)',r.join()==='10,20,30');
  r=await ev(A,async()=>{const G=window.__G;const q=G.guildQuests()[0];const d=await G.actAsync('gquest',{i:q.i});return d&&d.result&&d.result.err;});T('quête non remplie refusée par le serveur',r==='quest');
  // A remplit ses compteurs légitimement côté serveur (le serveur ne fait confiance qu'à l'état qu'il tient)
  {const st=DB.players[idA].state;st.day.kills=200;st.day.merges=200;st.day.tb=20;st.day.bosses=3;st.day.gifts=3;st.day.jokers=5;st.day.started=3;st.day.prestiges=1;st.day.titans=1;}
  r=await ev(A,async()=>{const G=window.__G;await G.actAsync("hello");G.guildCache=null;G.setTab("clan");await new Promise(z=>setTimeout(z,400));const n0=document.querySelectorAll('[data-gquest]').length;document.querySelector('[data-gquest]').click();await new Promise(z=>setTimeout(z,600));const n1=document.querySelectorAll('[data-gquest]').length;return {n0,n1,gq:G.S.day.gq.length,txt:document.getElementById('panel').innerText};});
  T('3 quêtes validables, une validée → 2 restent',r.n0===3&&r.n1===2&&r.gq===1);
  const pA=DB.points['g0:'+idA]|0;T('points de la quête dans la jauge (serveur)',pA>0&&total('g0')===pA&&new RegExp(pA+' \\/').test(r.txt.replace(/ | /g,' ')));
  r=await ev(A,async()=>{const G=window.__G;const q=G.guildQuests().find(x=>x.done);const d=await G.actAsync('gquest',{i:q.i});return d&&d.result&&d.result.err;});T('même quête deux fois → refusée',r==='quest'&&total('g0')===pA);
  r=await ev(A,async()=>{const G=window.__G;for(const q of G.guildQuests().filter(x=>!x.done))await G.actAsync('gquest',{i:q.i});return G.S.day.gq.length;});T('les 3 quêtes validées = 60 pts',r===3&&total('g0')===60);
  // B triche : marque ses quêtes faites en local → le serveur ne compte rien
  r=await ev(B,async()=>{const G=window.__G;G.S.day.gq=[0,1,2,3,4,5,6,7,8,9];G.S.day.kills=999;await G.actAsync('sync');return G.S.day.gq.length;});T('triche B : quêtes locales ignorées par le serveur',r===0&&total('g0')===60&&!DB.points['g0:'+idB]);
  // --- paliers : pas atteint ; atteint mais < 24 h ; OK ; déjà pris
  r=await ev(A,async()=>{const d=await window.__G.actAsync('guild_claim',{tier:1});return d&&d.err;});T('palier non atteint → not_reached',r==='not_reached');
  DB.points['g0:'+idB]=200;DB.points['g0:'+idC]=400; // 660 pts → paliers 1 et 2
  r=await ev(A,async()=>{const d=await window.__G.actAsync('guild_claim',{tier:1});return d&&d.err;});T('membre depuis < 24 h → too_recent',r==='too_recent');
  txt=await toGuild(A);T('UI : paliers atteints sans bouton (24 h), mention affichée',/24 h après ton arrivée/.test(txt)&&(await ev(A,()=>document.querySelectorAll('[data-gclaim]').length))===0);
  for(const id of [idA,idB,idC])DB.members[id].joined=now()-2*86400e3;
  r=await ev(A,async()=>{const G=window.__G;G.guildCache=null;G.setTab('clan');await new Promise(z=>setTimeout(z,400));const btns=document.querySelectorAll('[data-gclaim]').length;const g0=G.S.gems,s0=G.S.run.sparks;document.querySelector('[data-gclaim="1"]').click();await new Promise(z=>setTimeout(z,700));return {btns,dg:G.S.gems-g0,ds:G.S.run.sparks-s0,txt:document.getElementById('panel').innerText};});
  T('2 paliers réclamables (660 pts)',r.btns===2);T('palier 1 : +5 gemmes, ≥ 200 ✦, serveur d\'accord',r.dg===5&&r.ds>=200&&DB.players[idA].state.gems===35&&DB.claims.length===1);
  T('UI : palier 1 « Reçu », palier 2 encore réclamable',/Reçu/.test(r.txt)&&(await ev(A,()=>document.querySelectorAll('[data-gclaim]').length))===1);
  r=await ev(A,async()=>{const d=await window.__G.actAsync('guild_claim',{tier:1});return d&&d.err;});T('palier déjà pris → claimed',r==='claimed');
  r=await ev(A,async()=>{const d=await window.__G.actAsync('guild_claim',{tier:3});return d&&d.err;});T('palier 3 non atteint',r==='not_reached');
  r=await ev(A,async()=>{const d=await window.__G.actAsync('guild_reward',{tier:5});return d&&d.err;});T('guild_reward direct → refusé (trusted)',r==='trusted');
  r=await ev(B,async()=>{const G=window.__G;const g0=G.S.gems;const d=await G.actAsync('guild_claim',{tier:2});return {ok:d&&d.ok,dg:G.S.gems-g0};});T('B réclame le palier 2 indépendamment (+10 gemmes)',r.ok&&r.dg===10);
  // --- chef : exclure C ; fermer la guilde ; C ne la voit plus dans la liste
  r=await ev(A,async()=>{const G=window.__G;G.guildCache=null;G.setTab('clan');await new Promise(z=>setTimeout(z,400));const k=document.querySelectorAll('[data-gkick]').length;return k;});
  T('chef voit 2 boutons d\'exclusion',r===2);
  r=await ev(A,async()=>{document.querySelector('[data-gkick]').click();await new Promise(z=>setTimeout(z,150));document.querySelector('[data-gkickok]').click();await new Promise(z=>setTimeout(z,500));return document.getElementById('panel').innerText;});
  T('membre exclu → 2 membres',/2 \/ 30 membres/.test(r)&&nActive('g0')===2);
  r=await ev(B,()=>document.querySelectorAll('[data-gkick]').length);T('B (non chef) n\'a pas de bouton d\'exclusion',r===0);
  await ev(A,async()=>{document.getElementById('gdToggle').click();await new Promise(z=>setTimeout(z,400));});T('guilde passée sur invitation',DB.guilds.g0.open===false);
  txt=await toGuild(C);T('C (exclu) revient à l\'écran sans guilde, liste vide',/Créer une guilde/.test(txt)&&/Aucune guilde ouverte/.test(txt));
  // --- A quitte : B devient chef ; B quitte : guilde dissoute
  r=await ev(A,async()=>{document.getElementById('gdLeave').click();await new Promise(z=>setTimeout(z,150));document.getElementById('gdLeaveOk').click();await new Promise(z=>setTimeout(z,500));return document.getElementById('panel').innerText;});
  T('A quitte → écran sans guilde',/Créer une guilde/.test(r)&&DB.guilds.g0.leader===idB);
  txt=await toGuild(B);T('B est devenu chef (bouton ouvrir/fermer)',(await ev(B,()=>!!document.getElementById('gdToggle'))));
  await ev(B,async()=>{document.getElementById('gdLeave').click();await new Promise(z=>setTimeout(z,150));document.getElementById('gdLeaveOk').click();await new Promise(z=>setTimeout(z,500));});
  T('dernier membre parti → guilde dissoute',DB.guilds.g0.dissolved===true);
  r=await ev(A,async()=>{const G=window.__G;G.guildCache=null;G.setTab('clan');await new Promise(z=>setTimeout(z,300));document.getElementById('gdName').value='Les Prismes';document.getElementById('gdCreate').click();await new Promise(z=>setTimeout(z,700));return {gems:G.S.gems,dis:document.getElementById('gdCreate').disabled};});
  T('35 gemmes < 50 → bouton désactivé, rien créé',r.gems===35&&r.dis&&Object.keys(DB.guilds).length===1);
  DB.players[idA].state.gems=100;await ev(A,()=>window.__G.actAsync('hello'));
  r=await ev(A,async()=>{const G=window.__G;G.guildCache=null;G.setTab('clan');await new Promise(z=>setTimeout(z,300));document.getElementById('gdName').value='Les Prismes';document.getElementById('gdCreate').click();await new Promise(z=>setTimeout(z,700));return {gems:G.S.gems,txt:document.getElementById('panel').innerText};});
  T('recréation avec le même nom OK (dissoute)',r.gems===50&&Object.keys(DB.guilds).length===2&&/Les Prismes/.test(r.txt));
  // --- accessibilité / mise en page du volet guilde
  r=await ev(A,()=>{const small=[...document.querySelectorAll('#panel button')].filter(b=>!b.hidden&&b.offsetParent&&(b.offsetHeight<40||b.offsetWidth<40)).map(b=>b.className+':'+b.offsetWidth+'x'+b.offsetHeight);return {small,over:document.getElementById('panel').scrollWidth<=innerWidth+1};});
  T('boutons ≥ 40 px, pas de débordement horizontal',r.small.length===0&&r.over);if(r.small.length)console.log(r.small);
  await A.screenshot({path:'g-guild.png',fullPage:false});await ev(A,()=>{const p=document.getElementById('panel');p.scrollTop=640;});await A.screenshot({path:'g-guild-2.png'});
  T('aucune erreur JS',errs.length===0);if(errs.length)console.log(errs.slice(0,5));
  console.log(`t7guild : ${ok} OK, ${ko} KO`);await b.close();srv.close();})();
