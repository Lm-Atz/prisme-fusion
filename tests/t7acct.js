// Compte e-mail + mot de passe : lier, retrouver sur un autre appareil, récupération automatique de l'ancien appareil.
// Faux Supabase (Auth + RPC pf_link_account/pf_account/pf_recover) autour du vrai noyau pf_core.
const {chromium}=require('playwright');const http=require('http');const fs=require('fs');
const {pfApply}=require('./pf_core.js');const ENGINE=require('./pf_src.js')();
let ok=0,ko=0;const T=(n,c)=>{if(c)ok++;else{ko++;console.log('KO',n);}};
const html=fs.readFileSync('/home/claude/fusion/wrapped.html');
const srv=http.createServer((q,s)=>{s.writeHead(200,{'content-type':'text/html'});s.end(html);}).listen(8768);
const now=()=>Date.now();
const DB={players:{},users:{},tokens:{}};let confirmOn=false,nSecret=0;
function player(id,secret,name){let p=DB.players[id];if(!p){p=DB.players[id]={secret,state:null,ver:0,name:name||'Prisme',auth_uid:null};}return p.secret===secret?p:null;}
const authErr=(code,st=400)=>[st,{code:st,error_code:code,msg:code}];
const session=u=>{const at='at-'+u.id+'-'+Math.random().toString(36).slice(2),rt='rt-'+Math.random().toString(36).slice(2);DB.tokens[at]=u.id;DB.tokens[rt]=u.id;return {access_token:at,refresh_token:rt,expires_in:3600,user:{id:u.id,email:u.email}};};
function handle(url,a,hdr){
  const path=url.replace('https://atmrbzkcneotleuoapdp.supabase.co','');
  if(path.startsWith('/auth/v1/signup')){if(!/^[^@]+@[^@]+\.[a-z]+$/i.test(a.email||''))return authErr('email_address_invalid');if((a.password||'').length<6)return authErr('weak_password',422);
    if(DB.users[a.email]){if(confirmOn)return [200,{id:'fake',email:a.email}];return authErr('user_already_exists',422);}
    const u=DB.users[a.email]={id:'u'+Object.keys(DB.users).length,email:a.email,pw:a.password};if(confirmOn)return [200,{id:u.id,email:u.email,confirmation_sent_at:'x'}];return [200,session(u)];}
  if(path.startsWith('/auth/v1/token?grant_type=password')){const u=DB.users[a.email];if(!u||u.pw!==a.password)return authErr('invalid_credentials');return [200,session(u)];}
  if(path.startsWith('/auth/v1/token?grant_type=refresh_token')){const uid=DB.tokens[a.refresh_token];if(!uid)return authErr('refresh_token_not_found');const u=Object.values(DB.users).find(x=>x.id===uid);return [200,session(u)];}
  const fn=path.includes('/rpc/')?path.split('/rpc/')[1]:path.includes('/functions/v1/pf-act')?'act':'?';
  if(fn==='pf_time')return [200,{now:now()}];
  if(fn==='act'){const p=player(a.id,a.secret,a.name);if(!p)return [401,{ok:false,err:'auth'}];const r=pfApply(ENGINE,p.state,a,now(),false);for(const e of (r.result.effects||[]))if(e.name)p.name=e.name;p.state=r.state;p.ver++;return [200,{ok:true,now:now(),state:r.state,result:r.result,anomalies:r.anomalies,league:null,effects:[]}];}
  const bearer=(hdr.authorization||'').replace('Bearer ','');const uid=bearer.startsWith('at-')?DB.tokens[bearer]:null;
  const err=m=>[400,{code:'P0001',message:m}];
  if(fn==='pf_link_account'){const p=player(a.p_id,a.p_secret);if(!p)return err('auth');if(!uid)return err('login');const em=Object.values(DB.users).find(x=>x.id===uid).email;const o=Object.entries(DB.players).find(([,x])=>x.auth_uid===uid);
    if(o&&o[0]!==a.p_id)return [200,{ok:false,err:'linked_other',other:{name:o[1].name,best:o[1].state.bestStage,prestiges:o[1].state.prestiges},email:em}];p.auth_uid=uid;return [200,{ok:true,email:em}];}
  if(fn==='pf_account'){const p=player(a.p_id,a.p_secret);if(!p)return err('auth');if(!uid)return [200,{login:false}];const em=Object.values(DB.users).find(x=>x.id===uid).email;const o=Object.entries(DB.players).find(([,x])=>x.auth_uid===uid);
    return [200,{login:true,email:em,linked:!!o,mine:!!o&&o[0]===a.p_id,other:o&&o[0]!==a.p_id?{name:o[1].name,best:o[1].state.bestStage,prestiges:o[1].state.prestiges}:null}];}
  if(fn==='pf_recover'){if(!uid)return err('login');const o=Object.entries(DB.players).find(([,x])=>x.auth_uid===uid);if(!o)return err('none');const s='recovered-secret-'+(++nSecret)+'-0123456789abcdef';o[1].secret=s;return [200,{ok:true,id:o[0],secret:s,name:o[1].name,best:o[1].state.bestStage}];}
  if(fn==='pf_board')return [200,{week:'w',rows:[],joined:false}];
  if(fn==='pf_guild')return [200,{guild:null}];
  return [404,{message:'nofn'}];
}
async function mock(ctx){await ctx.route('https://atmrbzkcneotleuoapdp.supabase.co/**',async route=>{const q=route.request();const [st,body]=handle(q.url(),q.postDataJSON()||{},q.headers());await route.fulfill({status:st,contentType:'application/json',body:JSON.stringify(body)});});}
const ev=(p,f,...a)=>p.evaluate(f,...a);const wait=(p,ms)=>p.waitForTimeout(ms);
async function open(b,errs,tag){const c=await b.newContext({viewport:{width:390,height:844},locale:'fr-FR'});await mock(c);const p=await c.newPage();p.on('pageerror',e=>errs.push(tag+':'+e.message));await p.goto('http://localhost:8768/');await wait(p,1200);await ev(p,()=>{document.getElementById('veil').hidden=true;});return p;}
const profile=async p=>{await ev(p,()=>{window.__G.acct=null;window.__G.setTab('profile');});await wait(p,400);return ev(p,()=>document.getElementById('panel').innerText);};
const fill=async(p,em,pw,btn)=>{await ev(p,([em,pw,btn])=>{document.getElementById('acEmail').value=em;document.getElementById('acPw').value=pw;document.getElementById(btn).click();},[em,pw,btn]);await wait(p,700);return ev(p,()=>({txt:document.getElementById('panel').innerText,err:(document.getElementById('acErr')||{}).textContent||''}));};
(async()=>{const b=await chromium.launch();const errs=[];
  const A=await open(b,errs,'A');const idA=await ev(A,()=>window.__G.DEV.id);
  // A joue un peu (nom + étape) puis crée un compte
  await ev(A,async()=>{const G=window.__G;G.setTab('profile');document.getElementById('nameIn').value='Lumen Vif';document.getElementById('nameBtn').click();await new Promise(z=>setTimeout(z,300));});
  DB.players[idA].state.bestStage=17;DB.players[idA].state.run.stage=17;
  let txt=await profile(A);T('profil : section Compte avec formulaire',/Compte/.test(txt)&&/Créer un compte/.test(txt)&&/Se connecter/.test(txt));
  let r=await fill(A,'lumen@exemple.fr','court','acSignup');T('mot de passe < 8 → message local, aucun appel',/8 caractères/.test(r.err)&&!DB.users['lumen@exemple.fr']);
  r=await fill(A,'pas-un-email','motdepasse1','acSignup');T('e-mail invalide → message serveur traduit',/E-mail invalide/.test(r.err));
  r=await fill(A,'lumen@exemple.fr','motdepasse1','acSignup');T('compte créé et partie liée',/Partie sauvegardée sur ce compte/.test(r.txt)&&/lumen@exemple.fr/.test(r.txt)&&DB.players[idA].auth_uid==='u0');
  T('session mémorisée (localStorage)',await ev(A,()=>!!window.__G.AUTH&&window.__G.AUTH.email==='lumen@exemple.fr'));
  // persistance de la session au rechargement
  await A.reload();await wait(A,1200);await ev(A,()=>{document.getElementById('veil').hidden=true;});txt=await profile(A);T('session conservée après rechargement',/Partie sauvegardée sur ce compte/.test(txt));
  // déconnexion → formulaire, partie intacte
  await ev(A,()=>document.getElementById('acLogout').click());await wait(A,200);txt=await ev(A,()=>document.getElementById('panel').innerText);T('déconnexion : formulaire de retour, partie intacte',/Créer un compte/.test(txt)&&DB.players[idA].auth_uid==='u0');
  r=await fill(A,'lumen@exemple.fr','motdepasse1','acSignup');T('créer avec un e-mail existant → « connecte-toi »',/existe déjà/.test(r.err));
  r=await fill(A,'lumen@exemple.fr','mauvais-mdp','acLogin');T('mauvais mot de passe → message',/incorrect/.test(r.err));
  r=await fill(A,'lumen@exemple.fr','motdepasse1','acLogin');T('reconnexion : partie reconnue comme la mienne',/Partie sauvegardée sur ce compte/.test(r.txt));
  // --- appareil B : partie neuve, se connecte au compte → propose de récupérer la partie d'A
  const B=await open(b,errs,'B');const idB=await ev(B,()=>window.__G.DEV.id);T('B a sa propre partie',idB!==idA&&!!DB.players[idB]);
  txt=await profile(B);r=await fill(B,'lumen@exemple.fr','motdepasse1','acLogin');
  T('B : le compte contient une autre partie (Lumen Vif, étape 17)',/autre partie/.test(r.txt)&&/Lumen Vif/.test(r.txt)&&/17/.test(r.txt)&&/Récupérer/.test(r.txt));
  T('B : sa partie n\'a PAS été liée par-dessus',DB.players[idB].auth_uid===null&&DB.players[idA].auth_uid==='u0');
  await ev(B,()=>document.getElementById('acRecover').click());await wait(B,200);txt=await ev(B,()=>document.getElementById('modal').innerText);T('B : modale de confirmation',/remplacée/.test(txt));
  const oldSecretA=DB.players[idA].secret;
  await ev(B,()=>document.getElementById('acRecoverOk').click());await wait(B,2500);
  r=await ev(B,()=>({id:window.__G.DEV.id,name:window.__G.S.name,best:window.__G.S.bestStage,ready:window.__G.netReady}));
  T('B a récupéré la partie d\'A (identité + état serveur)',r.id===idA&&r.name==='Lumen Vif'&&r.best===17&&r.ready);
  T('secret renouvelé côté serveur',DB.players[idA].secret!==oldSecretA);
  await ev(B,()=>{document.getElementById('veil').hidden=true;});txt=await profile(B);T('B : profil « partie sauvegardée sur ce compte »',/Partie sauvegardée sur ce compte/.test(txt));
  // --- A (ancien appareil, encore connecté au compte) : son secret est périmé → récupération automatique
  r=await ev(A,async()=>{const G=window.__G;const d=await G.actAsync('sync');return d&&d.err;});T('A : ancien secret refusé',r==='auth');
  await wait(A,2500);r=await ev(A,()=>({id:window.__G.DEV.id,ready:window.__G.netReady,name:window.__G.S.name}));
  T('A : récupération automatique via le compte (rechargé, reconnecté)',r.id===idA&&r.ready&&r.name==='Lumen Vif');
  // --- confirmation e-mail activée côté serveur : message clair, pas de session
  confirmOn=true;const C=await open(b,errs,'C');txt=await profile(C);r=await fill(C,'autre@exemple.fr','motdepasse1','acSignup');T('confirmation activée → message « confirme ton e-mail »',/confirme ton e-mail/.test(r.err)&&!(await ev(C,()=>!!window.__G.AUTH)));confirmOn=false;
  // --- accessibilité
  r=await ev(B,()=>[...document.querySelectorAll('#panel button')].filter(b=>b.offsetParent&&(b.offsetHeight<40||b.offsetWidth<40)).map(b=>b.id||b.className));T('boutons ≥ 40 px',r.length===0);if(r.length)console.log(r);
  await B.screenshot({path:'acct-linked.png'});
  T('aucune erreur JS',errs.length===0);if(errs.length)console.log(errs.slice(0,5));
  console.log(`t7acct : ${ok} OK, ${ko} KO`);await b.close();srv.close();})();
