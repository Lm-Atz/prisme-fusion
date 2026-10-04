/* ================= réseau : Supabase (RPC PostgREST) ================= */
const NET={url:'https://atmrbzkcneotleuoapdp.supabase.co',key:'sb_publishable_-sVDz1jOVYi_XezSoDcaCA_PlLsIh8q',on:true};
let clockOff=0,netReady=false,boardCache=null;
const _dateNow=Date.now;
Date.now=()=>_dateNow()+clockOff; // l'heure du jeu suit l'heure serveur (anti-triche horloge)
function devKey(){
  try{let d=JSON.parse(localStorage.getItem('prisme-dev')||'null');if(d&&d.id&&d.s)return d;
    const u8=new Uint8Array(16);crypto.getRandomValues(u8);u8[6]=(u8[6]&0x0f)|0x40;u8[8]=(u8[8]&0x3f)|0x80;const h=[...u8].map(b=>b.toString(16).padStart(2,'0')).join('');
    const s8=new Uint8Array(24);crypto.getRandomValues(s8);
    d={id:`${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`,s:[...s8].map(b=>b.toString(16).padStart(2,'0')).join('')};
    localStorage.setItem('prisme-dev',JSON.stringify(d));return d;}catch(e){return {id:'00000000-0000-4000-8000-000000000000',s:'nostorage'};}
}
const DEV=devKey();
async function rpc(fn,args,ms=8000,keep=false){
  const ctl=new AbortController();const to=setTimeout(()=>ctl.abort(),ms);
  try{const r=await fetch(`${NET.url}/rest/v1/rpc/${fn}`,{method:'POST',headers:{'apikey':NET.key,'Authorization':'Bearer '+NET.key,'Content-Type':'application/json'},body:JSON.stringify(args||{}),signal:ctl.signal,keepalive:keep});
    if(!r.ok){const e=new Error('http'+r.status);e.status=r.status;try{e.body=await r.json();}catch(x){}throw e;}
    return await r.json();}
  finally{clearTimeout(to);}
}
const auth=()=>({p_id:DEV.id,p_secret:DEV.s});
function syncClock(res){if(res&&res.now){clockOff=res.now-_dateNow();}}
/* ================= serveur juge : toute décision passe par la fonction pf-act ================= */
/* Le téléphone simule la partie (plateau, tirs, étincelles) ; le serveur applique les mêmes règles,
   borne ce qui a été simulé et renvoie l'état officiel, qui remplace le nôtre. */
function mergeSave(o){const f=fresh();const m=Object.assign({},f,o);for(const k of ['up','st','settings','run','day','week','login','wp'])m[k]=Object.assign({},f[k],o[k]||{});m.run.tb=Object.assign({},f.run.tb,(o.run||{}).tb||{});return migrate(m);}
function simSnap(){snapBoard();const r=S.run;return {run:{sparks:r.sparks,stage:r.stage,max:r.max,tb:Object.assign({},r.tb),fled:!!r.fled,cells:r.cells,brate:r.brate||0,srate:r.srate||0,krate:r.krate||0},
  st:{merges:S.st.merges,manual:S.st.manual,kills:S.st.kills,bosses:S.st.bosses,jokerUses:S.st.jokerUses,maxCombo:S.st.maxCombo,tuto:S.st.tuto,namePrompted:S.st.namePrompted,hintW:S.st.hintW},
  day:{merges:S.day.merges,kills:S.day.kills,bosses:S.day.bosses,tb:S.day.tb||0,jokers:S.day.jokers,combo:S.day.combo||0},week:{kills:S.week.kills},bestiary:S.bestiary,settings:S.settings,league:S.league};}
let srvQ=Promise.resolve(),srvLast=0,srvErr=0,onServer=()=>{};
/* act : capture la simulation AVANT l'application locale, exécute l'action locale (retour immédiat), puis confirme auprès du serveur */
function act(action,payload,localFn){
  const snap=simSnap(),sent=S.run.sparks;let out=true;
  if(localFn){try{out=localFn();}catch(e){out=false;}if(out===false||(typeof out==='string'&&out!=='ok'))return out;}
  if(!NET.on)return out;
  srvQ=srvQ.then(()=>actNow(action,payload,snap,sent)).catch(()=>null);
  return out;
}
const actAsync=(action,payload)=>{const snap=simSnap(),sent=S.run.sparks;const p=srvQ.then(()=>actNow(action,payload,snap,sent));srvQ=p.catch(()=>null);return p;};
async function actNow(action,payload,snap,sent,retry=1){
  if(!NET.on)return null;
  const body={id:DEV.id,secret:DEV.s,action,payload:payload||{},sim:snap,tz:-new Date().getTimezoneOffset(),lang:LANG,name:S.name,demo:true};
  const ctl=new AbortController();const to=setTimeout(()=>ctl.abort(),12000);
  let d=null;
  try{const r=await fetch(`${NET.url}/functions/v1/pf-act`,{method:'POST',headers:{'apikey':NET.key,'Authorization':'Bearer '+NET.key,'Content-Type':'application/json'},body:JSON.stringify(body),signal:ctl.signal,keepalive:action==='sync'&&!!payload&&payload.bye===true});
    if(r.status===409&&retry>0){await new Promise(z=>setTimeout(z,350));return actNow(action,payload,snap,sent,retry-1);}
    d=await r.json();}
  catch(e){srvErr++;return null;}
  finally{clearTimeout(to);}
  if(!d||!d.ok){onServer({action,fail:d&&d.err});return d;}
  srvErr=0;srvLast=_dateNow();netReady=true;syncClock({now:d.now});
  applyServer(d,sent);
  onServer({action,d});
  return d;
}
/* l'état serveur remplace le nôtre ; on conserve seulement ce qui a bougé pendant l'aller-retour */
function applyServer(d,sent){
  const st=d.state,prev=S,an=d.anomalies||[];
  const gained=Math.max(0,prev.run.sparks-sent);
  const m=mergeSave(st);
  m.run.sparks=an.includes('sparks')?st.run.sparks:Math.max(0,st.run.sparks+gained);
  if(!an.includes('stage')){m.run.stage=Math.max(st.run.stage,prev.run.stage);m.run.max=Math.max(st.run.max,prev.run.max);m.maxStage=Math.max(st.maxStage,prev.maxStage);m.bestStage=Math.max(st.bestStage,prev.bestStage);}
  m.run.tb=prev.run.tb;m.run.cells=prev.run.cells;m.run.fled=prev.run.fled;m.run.fledAt=prev.run.fledAt;m.run.brate=prev.run.brate;m.run.srate=prev.run.srate;m.run.krate=prev.run.krate;m.run.rate=prev.run.rate;
  for(const k of ['merges','manual','kills','bosses','jokerUses','maxCombo'])m.st[k]=Math.max(m.st[k]|0,prev.st[k]|0);
  for(const k of ['merges','kills','bosses','tb','jokers','combo'])m.day[k]=Math.max(m.day[k]|0,prev.day[k]|0);
  m.week.kills=Math.max(m.week.kills|0,prev.week.kills|0);m.bestiary=Object.assign({},m.bestiary,prev.bestiary);
  S=m;
}
async function netTime(){try{const r=await rpc('pf_time',{},6000);syncClock(r);return true;}catch(e){return false;}}
async function netBoard(){if(!NET.on||!netReady)return null;try{boardCache=await rpc('pf_board',auth());return boardCache;}catch(e){return null;}}
function track(name,props){if(!NET.on||!netReady)return;rpc('pf_track',Object.assign(auth(),{p_name:name,p_props:props||{}}),4000).catch(()=>{});}
function idHue(id){let h=0;for(const c of String(id))h=(h*31+c.charCodeAt(0))>>>0;return h%360;}
/* code de transfert : identité appareil encodée (PF1-<base32 id+secret>) pour retrouver sa partie sur un autre appareil */
const B32='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function b32enc(bytes){let bits=0,v=0,o='';for(const b of bytes){v=(v<<8)|b;bits+=8;while(bits>=5){o+=B32[(v>>>(bits-5))&31];bits-=5;}}if(bits>0)o+=B32[(v<<(5-bits))&31];return o;}
function b32dec(s){let bits=0,v=0;const o=[];for(const ch of s){const i=B32.indexOf(ch);if(i<0)return null;v=(v<<5)|i;bits+=5;if(bits>=8){o.push((v>>>(bits-8))&255);bits-=8;}}return o;}
const hex2b=h=>h.match(/.{2}/g).map(x=>parseInt(x,16));
function xferCode(){const raw=hex2b(DEV.id.replace(/-/g,'')).concat(hex2b(DEV.s));let sum=0;for(const b of raw)sum=(sum+b)&255;const s=b32enc(raw.concat([sum]));return 'PF1-'+s.match(/.{1,6}/g).join('-');}
function xferParse(txt){const s=String(txt||'').toUpperCase().replace(/[^A-Z0-9]/g,'').replace(/^PF1/,'').replace(/O/g,'0').replace(/I/g,'1');const b=b32dec(s);if(!b||b.length<41)return null;const raw=b.slice(0,40),sum=b[40];let c=0;for(const x of raw)c=(c+x)&255;if(c!==sum)return null;const hx=a=>a.map(x=>x.toString(16).padStart(2,'0')).join('');const h=hx(raw.slice(0,16));return {id:`${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`,s:hx(raw.slice(16,40))};}
