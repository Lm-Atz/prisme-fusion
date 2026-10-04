/* ================= utilitaires ================= */
const $=id=>document.getElementById(id);
const U=()=>I18N[LANG]._units||I18N.fr._units;
function fmt(n){
  if(!isFinite(n))return '∞';
  n=Math.floor(n);
  if(n<10000)return grp(n);
  let e=Math.floor(Math.log10(n)/3);let v=n/Math.pow(10,e*3);
  if(v>=999.5){e++;v=n/Math.pow(10,e*3);}
  const suf=e<=4?U()[e-1]:String.fromCharCode(97+Math.floor((e-5)/26)%26)+String.fromCharCode(97+(e-5)%26);
  return (v<100?dec(v,1):dec(v,0))+'\u202f'+suf;
}
const rnd=(a,b)=>a+Math.random()*(b-a);
const dur=s=>{s=Math.max(0,Math.ceil(s));const U=(I18N[LANG]._dur||I18N.fr._dur);if(s<60)return s+' '+U[0];if(s<3600)return Math.ceil(s/60)+' '+U[1];if(s<86400){const h=Math.floor(s/3600),m=Math.floor(s%3600/60);return h+' '+U[2]+(m?' '+String(m).padStart(2,'0'):'');}const d=Math.floor(s/86400),h=Math.floor(s%86400/3600);return d+' '+U[3]+(h?' '+h+' '+U[2]:'');};
const clock=s=>{s=Math.max(0,Math.floor(s));return Math.floor(s/60)+':'+String(s%60).padStart(2,'0');};
let TZOFF=null; // côté serveur : décalage du joueur en minutes (−getTimezoneOffset) ; null = heure locale de l'appareil
function dparts(t){if(TZOFF==null){const d=new Date(t);return [d.getFullYear(),d.getMonth(),d.getDate(),d.getDay()];}const d=new Date(t+TZOFF*60000);return [d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate(),d.getUTCDay()];}
function dayKey(t=Date.now()){const [y,m,d]=dparts(t);return y+'-'+(m+1)+'-'+d;}
function weekKey(t=Date.now()){const [y,m,d,wd]=dparts(t);const mon=new Date(Date.UTC(y,m,d-((wd+6)%7)));return mon.getUTCFullYear()+'-'+(mon.getUTCMonth()+1)+'-'+mon.getUTCDate();}
const dayOfWeek=(t=Date.now())=>dparts(t)[3];
const esc=s=>String(s).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const ic=(n,c='')=>`<svg class="i ${c}" aria-hidden="true"><use href="#i-${n}"/></svg>`;
const I={e:ic('bolt','ie'),g:ic('gem','ig'),s:ic('shard','is')};

/* ================= pseudos ================= */
const ADJ=['Cobalt','Fulgurant','Pourpre','Stellaire','Vif','Polaire','Ardent','Lunaire','Électrique','Sombre','Radieux','Quantique'];
const NOUN=['Hexagone','Prisme','Pentagone','Comète','Spirale','Vecteur','Nova','Pulsar','Octogone','Photon','Orbite','Fractale'];
const randomName=()=>{const L=I18N[LANG]||I18N.fr,A=L._adj||ADJ,N=L._noun||NOUN;return N[Math.floor(Math.random()*N.length)]+' '+A[Math.floor(Math.random()*A.length)]+' '+Math.floor(rnd(10,999));};
const BAN_SUB=['connard','connasse','salope','salaud','pute','putain','encule','enculer','merde','bite','couille','nique','niquer','batard','enfoire','fuck','shit','bitch','cunt','dick','nigg','negr','nazi','hitler','whore','faggot','pussy','asshole','retard','slut','pedo','viol','tapette','gouine','bougnoul','youpin','chienne','puta','mierda','joder','cabron','maricon','pendejo','scheisse','fotze','hurensohn','arschloch','porra','caralho','viado','buceta','cazzo','stronzo','troia','vaffanculo','frocio'];
const BAN_WORD=['con','conne','pd','fdp','ntm','tg','nazi','cul','fag','kkk','ss'];
function normName(s){return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/0/g,'o').replace(/[1!|]/g,'i').replace(/3/g,'e').replace(/[4@]/g,'a').replace(/[5$]/g,'s').replace(/7/g,'t');}
function checkName(raw){
  const s=raw.trim().replace(/\s+/g,' ');
  if(s.length<3)return {ok:false,msg:t('name_short')};
  if(s.length>16)return {ok:false,msg:t('name_long')};
  if(!/^[\p{L}\p{N} _-]+$/u.test(s))return {ok:false,msg:t('name_chars')};
  const n=normName(s),words=n.split(/[\s_-]+/).map(w=>w.replace(/[^a-z]/g,'')),flatRaw=n.replace(/[^a-z]/g,''),flat=flatRaw.replace(/(.)\1+/g,'$1');
  if(BAN_SUB.some(b=>flatRaw.includes(b)||flat.includes(b.replace(/(.)\1+/g,'$1')))||words.some(w=>BAN_WORD.includes(w))||BAN_WORD.includes(flatRaw))return {ok:false,msg:t('name_banned')};
  return {ok:true,name:s};
}
