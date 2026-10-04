/* ================= réseau : Supabase (RPC PostgREST) ================= */
const NET={url:'https://atmrbzkcneotleuoapdp.supabase.co',key:'sb_publishable_-sVDz1jOVYi_XezSoDcaCA_PlLsIh8q',on:true};
let clockOff=0,netReady=false,netBusy=false,lastSync=0,boardCache=null;
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
/* premier contact : crée ou retrouve le joueur, choisit entre sauvegarde locale et serveur */
async function netHello(localSeen){
  if(!NET.on)return {ok:false};
  try{
    const res=await rpc('pf_hello',Object.assign(auth(),{p_lang:LANG,p_name:S.name}));
    syncClock(res);netReady=true;
    let used='local';
    if(res.save&&res.save.v===3){
      const localT=localSeen||0,serverT=res.updated||0,localFresh=S.st&&(S.st.kills>0||S.st.merges>0);
      if(!localFresh||serverT>localT+5000){S=mergeSave(res.save);used='server';}
    }
    if(res.name&&res.name!==S.name&&used==='server')S.name=res.name;
    return {ok:true,used};
  }catch(e){netReady=false;return {ok:false,err:e.message};}
}
function mergeSave(o){const f=fresh();const m=Object.assign({},f,o);for(const k of ['up','st','settings','run','day','week','login','wp'])m[k]=Object.assign({},f[k],o[k]||{});m.run.tb=Object.assign({},f.run.tb,(o.run||{}).tb||{});return migrate(m);}
async function netSave(force){
  if(!NET.on||!netReady||netBusy)return false;if(!force&&_dateNow()-lastSync<30000)return false;
  netBusy=true;try{snapBoard();const res=await rpc('pf_save',Object.assign(auth(),{p_save:S,p_best:Math.max(1,S.bestStage|0),p_prestiges:S.prestiges|0}),8000,!!force);syncClock(res);lastSync=_dateNow();return true;}
  catch(e){return false;}finally{netBusy=false;}
}
async function netTime(){try{const r=await rpc('pf_time',{},6000);syncClock(r);return true;}catch(e){return false;}}
async function netTitan(score,best){if(!NET.on||!netReady)return null;try{return await rpc('pf_titan',Object.assign(auth(),{p_score:Math.floor(score),p_best:Math.max(1,best|0)}));}catch(e){return null;}}
async function netBoard(){if(!NET.on||!netReady)return null;try{boardCache=await rpc('pf_board',auth());return boardCache;}catch(e){return null;}}
async function netName(name){if(!NET.on||!netReady)return {ok:true};try{return await rpc('pf_set_name',Object.assign(auth(),{p_name:name}));}catch(e){return {ok:false};}}
async function netReport(target){if(!NET.on||!netReady)return;try{await rpc('pf_report',Object.assign(auth(),{p_target:target}));}catch(e){}}
function track(name,props){if(!NET.on||!netReady)return;rpc('pf_track',Object.assign(auth(),{p_name:name,p_props:props||{}}),4000).catch(()=>{});}
function idHue(id){let h=0;for(const c of String(id))h=(h*31+c.charCodeAt(0))>>>0;return h%360;}
/* code de transfert : identité appareil encodée (PF1-<base32 id+secret>) pour retrouver sa partie sur un autre appareil */
const B32='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function b32enc(bytes){let bits=0,v=0,o='';for(const b of bytes){v=(v<<8)|b;bits+=8;while(bits>=5){o+=B32[(v>>>(bits-5))&31];bits-=5;}}if(bits>0)o+=B32[(v<<(5-bits))&31];return o;}
function b32dec(s){let bits=0,v=0;const o=[];for(const ch of s){const i=B32.indexOf(ch);if(i<0)return null;v=(v<<5)|i;bits+=5;if(bits>=8){o.push((v>>>(bits-8))&255);bits-=8;}}return o;}
const hex2b=h=>h.match(/.{2}/g).map(x=>parseInt(x,16));
function xferCode(){const raw=hex2b(DEV.id.replace(/-/g,'')).concat(hex2b(DEV.s));let sum=0;for(const b of raw)sum=(sum+b)&255;const s=b32enc(raw.concat([sum]));return 'PF1-'+s.match(/.{1,6}/g).join('-');}
function xferParse(txt){const s=String(txt||'').toUpperCase().replace(/[^A-Z0-9]/g,'').replace(/^PF1/,'').replace(/O/g,'0').replace(/I/g,'1');const b=b32dec(s);if(!b||b.length<41)return null;const raw=b.slice(0,40),sum=b[40];let c=0;for(const x of raw)c=(c+x)&255;if(c!==sum)return null;const hx=a=>a.map(x=>x.toString(16).padStart(2,'0')).join('');const h=hx(raw.slice(0,16));return {id:`${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`,s:hx(raw.slice(16,40))};}
