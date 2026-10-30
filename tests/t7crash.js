// v12.8 : le joueur garde-t-il ses données s'il quitte brutalement (batterie à plat, appli tuée, plus de réseau) ?
// Vrai client (navigateur) contre le vrai noyau serveur (pf_core), profil navigateur persistant = même téléphone.
const {chromium}=require('playwright');const http=require('http');const fs=require('fs');const os=require('os');const path=require('path');
const {pfApply}=require('./pf_core.js');const ENGINE=require('./pf_src.js')();
let ok=0,ko=0;const T=(n,c,x)=>{if(c)ok++;else{ko++;console.log('KO',n,x===undefined?'':JSON.stringify(x));}};
const html=fs.readFileSync('/home/claude/fusion/wrapped.html');
const srv=http.createServer((q,s)=>{s.writeHead(200,{'content-type':'text/html'});s.end(html);}).listen(8767);
const DB={players:{},anomalies:[]};let down=false,acts=[];
function handle(url,a){
  if(down)return [503,{message:'down'}];
  if(url.includes('/rpc/pf_time'))return [200,{now:Date.now()}];
  if(url.includes('/functions/v1/pf-act')){acts.push(a.action);let p=DB.players[a.id];if(!p)p=DB.players[a.id]={secret:a.secret,state:null};if(p.secret!==a.secret)return [401,{ok:false,err:'auth'}];
    const r=pfApply(ENGINE,p.state,a,Date.now(),false);p.state=r.state;if(r.anomalies.length)DB.anomalies.push({action:a.action,kinds:r.anomalies});
    return [200,{ok:true,now:Date.now(),state:r.state,result:r.result,anomalies:r.anomalies,league:null,effects:[]}];}
  if(url.includes('/rpc/pf_board'))return [200,{week:'w',rows:[],joined:false}];
  return [200,null];
}
async function mock(ctx){await ctx.route('https://atmrbzkcneotleuoapdp.supabase.co/**',async route=>{const q=route.request();let a={};try{a=q.postDataJSON()||{};}catch(e){}
  const [st,body]=handle(q.url(),a);await route.fulfill({status:st,contentType:'application/json',body:JSON.stringify(body)});});}
const W=ms=>new Promise(z=>setTimeout(z,ms));
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'pfcrash-'));
async function open(d,init){const c=d?await chromium.launchPersistentContext(d,{viewport:{width:390,height:844},locale:'fr-FR'}):await (await chromium.launch()).newContext({viewport:{width:390,height:844},locale:'fr-FR'});
  if(init)await c.addInitScript(init);await mock(c);const p=c.pages()[0]||await c.newPage();p.on('pageerror',e=>console.log('  PAGEERR',e.message));await p.goto('http://localhost:8767/');await W(2000);await p.evaluate(()=>{document.getElementById('veil').hidden=true;});return {c,p};}
(async()=>{
  let {c,p}=await open(dir);const id=await p.evaluate(()=>window.__G.DEV.id);const dev=await p.evaluate(()=>localStorage.getItem('prisme-dev'));
  // on donne des gemmes et des étincelles côté serveur (comme un joueur qui a déjà joué)
  {const st=DB.players[id].state;st.gems=300;st.run.sparks=2000;st.run.stage=7;st.srvAt=Date.now();st.simBy='autre-appareil';} // comme si un autre appareil avait joué
  const r0=await p.evaluate(async()=>{const G=window.__G;const d=await G.actAsync('sync');return {stale:!!(d&&d.result&&d.result.stale),sp:G.S.run.sparks,st:G.S.run.stage,gems:G.S.gems};});
  T('partie plus récente ailleurs : le téléphone la reprend au lieu de l\'écraser',r0.stale&&r0.sp>=2000&&r0.st===7&&r0.gems===300&&DB.players[id].state.run.sparks>=2000,r0);await W(300);
  // 1. ACHATS puis coupure immédiate : enregistrés par le serveur à l'instant de l'achat, sans attendre la synchro
  acts=[];const r1=await p.evaluate(async()=>{const G=window.__G;document.getElementById('veil').hidden=true;G.setTab('atelier');document.querySelector('[data-build="st_cad"]').click();
    G.shopPane='bonus';G.setTab('shop');document.querySelector('[data-gem="boost"]').click();await new Promise(z=>setTimeout(z,600));return {gems:G.S.gems,build:G.S.build.length,boost:G.S.boostUntil>Date.now()};});
  down=true; // plus de réseau / batterie à plat : rien d'autre ne part
  const s1=DB.players[id].state;
  T('achat en gemmes enregistré côté serveur sans attendre la synchro',s1.gems===r1.gems&&s1.boostUntil>Date.now(),{srv:s1.gems,loc:r1.gems});
  T('recherche (étincelles) enregistrée côté serveur sans attendre la synchro',s1.build.length===1&&r1.build===1);
  T('aucune synchro n\'a été nécessaire (1 appel par achat)',!acts.includes('sync'),acts);
  // 2. PROGRESSION de jeu (fusions, combats) jamais synchronisée, puis coupure brutale sans réseau
  down=false;await p.evaluate(()=>window.__G.actAsync('sync'));const srvSp0=DB.players[id].state.run.sparks;down=true;
  await p.evaluate(()=>{window.__G.setTab('home');document.getElementById('veil').hidden=true;if(window.__G.R)window.__G.R.paused=false;});
  await W(25000); // 25 s de jeu, pas de synchro (réseau coupé)
  await p.evaluate(()=>{const G=window.__G;G.S.run.sparks+=60;G.S.st.merges+=12;G.S.st.kills+=4;}); // fusions et combats du joueur pendant ces 25 s
  const loc=await p.evaluate(()=>({sp:window.__G.S.run.sparks,m:window.__G.S.st.merges,k:window.__G.S.st.kills,stage:window.__G.S.run.stage}));
  await W(5500); // la sauvegarde locale (toutes les 5 s) a eu lieu
  const loc2=await p.evaluate(()=>({sp:window.__G.S.run.sparks}));
  await c.close(); // appli tuée (la synchro de sortie échoue : pas de réseau)
  console.log(`  progression non synchronisée : ${Math.round(loc2.sp-srvSp0)} ✦ (serveur ${Math.round(srvSp0)}, téléphone ${Math.round(loc2.sp)})`);
  T('le jeu a bien progressé pendant la coupure',loc2.sp>srvSp0+5,{srvSp0,loc2});
  T('serveur pas au courant de cette progression',Math.abs(DB.players[id].state.run.sparks-srvSp0)<1);
  // 3. réouverture sur le MÊME téléphone, réseau revenu : la sauvegarde locale est renvoyée et acceptée
  down=false;await W(3000);({c,p}=await open(dir));
  const back=await p.evaluate(()=>({sp:window.__G.S.run.sparks,gems:window.__G.S.gems,build:window.__G.S.build.length,boost:window.__G.S.boostUntil>Date.now(),stage:window.__G.S.run.stage,m:window.__G.S.st.merges,k:window.__G.S.st.kills}));
  T('même téléphone : étincelles gagnées pendant la coupure conservées',back.sp>=loc.sp-1,{back:back.sp,avant:loc.sp});
  T('même téléphone : serveur à jour',DB.players[id].state.run.sparks>=loc.sp-1,{srv:DB.players[id].state.run.sparks});
  T('même téléphone : fusions et combats conservés',back.m>=loc.m&&back.k>=loc.k,{back,loc});
  T('même téléphone : achats toujours là',back.gems===r1.gems&&back.boost,back);
  T('aucune fausse alerte triche',DB.anomalies.length===0,DB.anomalies);
  await c.close();
  // 4. pire cas : l'appareil est perdu juste après la coupure → autre téléphone (même compte)
  const before=DB.players[id].state.run.sparks,before_st=DB.players[id].state.run.stage;const id2=await (async()=>{const o=await open(null,`localStorage.setItem('prisme-dev',${JSON.stringify(dev)})`);const v=await o.p.evaluate(()=>({id:window.__G.DEV.id,sp:window.__G.S.run.sparks,gems:window.__G.S.gems,stage:window.__G.S.run.stage}));await o.p.evaluate(()=>window.__G.actAsync('sync'));await o.c.close();return v;})();
  T('autre téléphone : même compte, partie du serveur (achats compris)',id2.id===id&&id2.gems===r1.gems&&id2.sp>=before-1&&id2.stage>=before_st,id2);
  T('autre téléphone : partie du serveur non écrasée par la partie vide',DB.players[id].state.run.sparks>=before-1&&DB.players[id].state.run.stage>=before_st,{srv:DB.players[id].state.run,before,before_st});
  console.log(`t7crash : ${ok} OK, ${ko} KO`);srv.close();process.exit(ko?1:0);
})().catch(e=>{console.log('ERR',e);process.exit(1);});
