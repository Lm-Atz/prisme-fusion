// v12.8 : test de la fonction serveur pf-act (Deno) dans Node, avec une base simulée qui reproduit les fonctions SQL.
// Usage : node t7edge.js <chemin esbuild>   (le TypeScript est transpilé à la volée)
const fs=require('fs'),path=require('path'),crypto=require('crypto'),{execFileSync}=require('child_process');
const ESB=process.argv[2];const SRC=path.join(__dirname,'..','src','edge_pf_act.ts');
let ok=0,ko=0;const T=(n,c)=>{if(c)ok++;else{ko++;console.log('KO',n);}};
const js=execFileSync(ESB,['--loader=ts','--format=cjs','--log-level=error'],{input:fs.readFileSync(SRC,'utf8').replace('import { createClient } from "npm:@supabase/supabase-js@2";','const { createClient } = globalThis.__SB;')}).toString();
const RULES=fs.readFileSync(path.join(__dirname,'..','pf_server.js'),'utf8');
// --- base simulée : mêmes règles que supabase/sql/pf_scale.sql
const sha=s=>'s2:'+crypto.createHash('sha256').update(s).digest('hex');
const DB={players:{},events:[],anom:[],rate:{},calls:[],noLoad:false};
const fakeBcrypt=s=>'$2a$08$'+crypto.createHash('md5').update(s).digest('hex'); // ancien format (bcrypt) simulé
function check(id,sec,h){if(!h)return false;if(h.startsWith('s2:'))return h===sha(sec);if(h===fakeBcrypt(sec)){DB.players[id].secret_hash=sha(sec);return true;}return false;}
function rate(k,max){const m=Math.floor(Date.now()/60000);const key=k+'|'+m;DB.rate[key]=(DB.rate[key]||0)+1;return DB.rate[key]<=max;}
function hello(a){let r=DB.players[a.p_id];if(!r){r=DB.players[a.p_id]={secret_hash:sha(a.p_secret),state:null,ver:0,banned:false,anom:0,save:null,name:a.p_name};}else if(!check(a.p_id,a.p_secret,r.secret_hash))throw new Error('auth');return {name:r.name,flags:0};}
const RPC={
  pf_load(a){if(DB.noLoad)return {error:{message:'Could not find the function'}};if(!rate('ip:'+a.p_ip,a.p_rip))return {data:{err:'rate'}};let h;try{h=hello(a);}catch(e){return {data:{err:'auth'}};}if(!rate('p:'+a.p_id,a.p_rpl))return {data:{err:'rate'}};const r=DB.players[a.p_id];return {data:{hello:h,state:r.state,ver:r.ver,banned:r.banned,anom:r.anom,save:r.save}};},
  pf_hello(a){try{return {data:hello(a)};}catch(e){return {error:{message:'auth'}};}},
  pf_rate(a){return {data:rate(a.p_key,a.p_max)};},
  pf_events_add(a){let n=0;for(const e of a.p_events.slice(0,60))if(typeof e.n==='string'){DB.events.push({id:a.p_id,n:e.n});n++;}return {data:n};},
  pf_league_result(){return {data:{none:true}};},
};
function from(t){const q={t,f:{},op:null,v:null};const api={select(){if(!q.op)q.op='select';return api;},eq(k,v){q.f[k]=v;return api;},update(v){q.op='update';q.v=v;return api;},insert(v){if(t==='anomalies')DB.anom.push(v);return Promise.resolve({data:null,error:null});},
  single(){const r=DB.players[q.f.id];return Promise.resolve(r?{data:r,error:null}:{data:null,error:{message:'none'}});},
  then(res,rej){let out;if(q.op==='update'){const r=DB.players[q.f.id];if(r&&r.ver===q.f.ver){Object.assign(r,q.v);out={data:[{ver:r.ver}],error:null};}else out={data:[],error:null};}else out={data:[],error:null};return Promise.resolve(out).then(res,rej);}};return api;}
globalThis.__SB={createClient:()=>({rpc:async(n,a)=>{DB.calls.push(n);const f=RPC[n];return f?f(a):{error:{message:'missing '+n}};},from:(t)=>{DB.calls.push('from:'+t);return from(t);}})};
let handler=null;globalThis.Deno={env:{get:k=>'x'},serve:h=>{handler=h;}};
const realFetch=global.fetch;global.fetch=async(u)=>({ok:true,text:async()=>RULES});
new Function('require','module','exports',js)(require,{exports:{}},{});
const call=async(body,ip='1.2.3.4')=>{const r=await handler(new Request('http://x/',{method:'POST',headers:{'x-forwarded-for':ip,'content-type':'application/json'},body:JSON.stringify(body)}));return {status:r.status,d:await r.json()};};
(async()=>{
  const id=crypto.randomUUID(),sec=crypto.randomBytes(24).toString('hex');
  DB.calls=[];let r=await call({id,secret:sec,action:'hello',lang:'fr',name:'QA',ev:[{n:'open',p:{a:1},t:1}]});
  T('nouveau joueur créé, partie enregistrée',r.status===200&&r.d.ok&&DB.players[id]&&DB.players[id].ver===1&&!!DB.players[id].state);
  T('secret stocké en SHA-256 (format s2:)',DB.players[id].secret_hash===sha(sec));
  T('un seul appel de chargement (pf_load), plus pf_hello / pf_rate séparés',DB.calls.filter(c=>c==='pf_load').length===1&&!DB.calls.includes('pf_hello')&&!DB.calls.includes('pf_rate'));
  T('statistiques jointes enregistrées',DB.events.length===1&&DB.events[0].n==='open');
  DB.calls=[];r=await call({id,secret:sec,action:'sync',sim:{run:{sparks:10,stage:1}}});T('2e requête : partie relue et enregistrée (ver 2)',r.status===200&&DB.players[id].ver===2);
  T('requête sans statistiques : pas d\'appel inutile',!DB.calls.includes('pf_events_add'));
  r=await call({id,secret:'f'.repeat(48),action:'sync'});T('mauvais secret refusé (401)',r.status===401&&r.d.err==='auth'&&DB.players[id].ver===2);
  // ancien hash bcrypt converti au premier succès
  const id2=crypto.randomUUID(),sec2=crypto.randomBytes(24).toString('hex');DB.players[id2]={secret_hash:fakeBcrypt(sec2),state:null,ver:0,banned:false,anom:0,save:null,name:'Old'};
  r=await call({id:id2,secret:sec2,action:'hello'});T('ancien compte (bcrypt) accepté puis converti en SHA-256',r.status===200&&DB.players[id2].secret_hash===sha(sec2));
  r=await call({id:id2,secret:sec2,action:'sync'});T('…et toujours accepté ensuite',r.status===200);
  // limite de débit joueur
  let last;for(let i=0;i<45;i++)last=await call({id,secret:sec,action:'sync'},'9.9.9.'+(i%200));T('limite par joueur : 429 au-delà de 40/min',last.status===429&&last.d.err==='rate');
  // repli si pf_load n'existe pas encore
  DB.noLoad=true;DB.rate={};const id3=crypto.randomUUID(),sec3=crypto.randomBytes(24).toString('hex');DB.calls=[];
  r=await call({id:id3,secret:sec3,action:'hello'});T('repli sans pf_load : ancien chemin, partie créée',r.status===200&&DB.players[id3].ver===1&&DB.calls.includes('pf_hello'));
  r=await call({id:id3,secret:'0'.repeat(48),action:'sync'});T('repli : mauvais secret refusé',r.status===401);DB.noLoad=false;
  // joueur banni
  DB.players[id].banned=true;DB.rate={};r=await call({id,secret:sec,action:'sync'});T('joueur banni : 403',r.status===403);
  console.log(`t7edge : ${ok} OK, ${ko} KO`);
})();
