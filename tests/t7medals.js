// v12.1 : médailles (4 rangs, bonus permanents, gemmes) et couleurs à bonus — règles côté serveur
const {pfApply,pfMakeEngine,pfMaxSparkPerSec,pfMaxDps}=require('./pf_core.js');const src=require('./pf_src.js')();
let ok=0,ko=0;const T=(n,c)=>{if(c)ok++;else{ko++;console.log('KO',n);}};
const D=864e5,MON=Date.UTC(2026,10,2,10),SAT=Date.UTC(2026,9,31,12);
const eng=t=>pfMakeEngine(src,t);
function fresh(t){const G=eng(t);const S=G.fresh();S.tz=60;S.lastSeen=t;S.gems=100;return S;}
const act=(S,action,payload,t)=>pfApply(src,S,{action,payload:payload||{}},t);
const near=(a,b)=>Math.abs(a-b)<1e-9*Math.max(1,Math.abs(b));

// --- médailles : réclamer seulement quand l'objectif est atteint, rang par rang
{const t=MON;let S=fresh(t);let r=act(S,'medal',{id:'explore'},t);T('médaille refusée tant que l\'objectif n\'est pas atteint',!r.result.ok&&r.result.err==='medal');
 S.bestStage=80;r=act(S,'medal',{id:'explore'},t);T('Explorateur bronze (étape 25) : +5 gemmes',r.result.ok&&r.state.medals.explore===1&&r.state.gems===105);S=r.state;
 r=act(S,'medal',{id:'explore'},t);T('…puis argent (étape 75) : +10 gemmes',r.result.ok&&r.state.medals.explore===2&&r.state.gems===115);S=r.state;
 r=act(S,'medal',{id:'explore'},t);T('…pas d\'or avant l\'étape 150',!r.result.ok&&r.state.medals.explore===2);
 S.bestStage=999;for(let i=0;i<2;i++){r=act(S,'medal',{id:'explore'},t);S=r.state;}T('…diamant : rang 4, gemmes 5+10+25+50',S.medals.explore===4&&S.gems===190);
 r=act(S,'medal',{id:'explore'},t);T('…plus rien au-delà du diamant',!r.result.ok);
 r=act(S,'medal',{id:'nope'},t);T('médaille inconnue refusée',!r.result.ok);
 const G=eng(t);G.S=S;T('bonus Explorateur diamant : dégâts +16,5 % (11 % × difficulté 1,5)',near(G.bonusMul('dmg'),1.165));}
// --- toutes les médailles ont 4 paliers croissants, un type de bonus connu et un texte
{const G=eng(MON);G.S=fresh(MON);T('12 médailles, 4 paliers croissants chacune',G.MEDALS.length===12&&G.MEDALS.every(m=>m.th.length===4&&m.th.every((x,i)=>i===0||x>m.th[i-1])&&['dmg','sp','cad','res','jok','off'].includes(m.k)));
 const S=G.S;for(const m of G.MEDALS)S.medals[m.id]=4;const tot=k=>G.MEDALS.filter(m=>m.k===k).reduce((a,m)=>a+0.11*m.q,0);
 T('toutes les médailles au diamant : dégâts ≈ +60 %, étincelles ≈ +57 % (faible à moyen+)',near(G.bonusMul('dmg'),1+tot('dmg'))&&tot('dmg')<0.65&&tot('sp')<0.65);}
// --- couleurs : achat en gemmes uniquement, bonus de la couleur portée, collection
{const t=MON;let S=fresh(t);S.gems=600;let r=act(S,'skin',{id:'rubis'},t);T('couleur Rubis achetée 500 gemmes et portée',r.result.ok&&r.state.gems===100&&r.state.skin==='rubis');S=r.state;
 const G=eng(t);G.S=JSON.parse(JSON.stringify(S));const withR=G.powerMult(),spR=G.bonusMul('sp');G.S.skin='cyan';const without=G.powerMult();
 T('Rubis : dégâts +12 %',near(withR/without,1.12));T('collection : 2 couleurs → étincelles +1 %',near(spR,1.01));
 r=act(S,'skin',{id:'solaire'},t);T('couleur trop chère : refusée',!r.result.ok&&r.state.skin==='rubis');
 r=act(S,'skin',{id:'cyan'},t);T('changer pour une couleur possédée : gratuit',r.result.ok&&r.state.skin==='cyan'&&r.state.gems===100);
 r=act(S,'purchase',{id:'g100'},t);T('pas d\'achat de couleur en euros (seulement des offres de gemmes)',!G.OFFERS.some(o=>/^skin|rubis|solaire/.test(o.id)));}
// --- effets de chaque type de bonus dans le moteur
{const t=MON,G=eng(t),S=fresh(t);G.S=S;S.skins=['cyan','emeraude','saphir','obsidienne'];
 const u=G.ALLUP.find(x=>x.g==='start'&&isFinite(G.upCost(x)));S.skin='cyan';const t0=G.upTime(u),si0=G.spawnInterval(),off0=(S.lastSeen=t-3*3600e3,S.run.srate=1,G.offlineGains(t).sparks);S.jk={surge:3};const j0=G.jokerNeed('surge');
 S.skin='emeraude';T('Émeraude : recherches 8 % plus rapides',G.upTime(u)<t0);
 S.skin='saphir';T('Saphir : gemmes qui apparaissent plus vite',G.spawnInterval()<si0||G.spawnInterval()===G.CFG.board.spawnMin);
 S.skin='obsidienne';T('Obsidienne : jokers plus rapides et gains hors ligne +10 %',G.jokerNeed('surge')<=j0&&G.offlineGains(t).sparks>off0);}
// --- couleurs de saison : bonus
{const G=eng(MON);G.S=fresh(MON);const k=G.seasonKey();T('couleur de saison : étincelles +8 %, Éclat : dégâts et étincelles +10 %',G.skinInfo('s'+k).bn.sp===0.08&&G.skinInfo('s'+k+'x').bn.dmg===0.1);}
// --- garde-fous serveur : les plafonds anti-triche suivent les bonus (pas de faux positif pour un joueur très équipé)
{const t=MON,G=eng(t),S=fresh(t);G.S=S;const c0=pfMaxSparkPerSec(G),d0=pfMaxDps(G,60);for(const m of G.MEDALS)S.medals[m.id]=4;S.skins=G.SKINS.map(x=>x.id);S.skin='solaire';
 {const r=(pfMaxSparkPerSec(G)-2)/(c0-2);T('plafond d\'étincelles/s relevé par les bonus',r>1.3&&r<=G.bonusMul('sp')+1e-9);}T('plafond de dégâts (Titan) ajusté aux bonus',near(pfMaxDps(G,60),d0*G.bonusMul('dmg')));
 const Gs=eng(SAT);Gs.S=JSON.parse(JSON.stringify(S));if(Gs.weekendEvent(SAT)==='spark'){const r=(pfMaxSparkPerSec(Gs)-2)/(pfMaxSparkPerSec(G)-2);T('…et au week-end étincelles ×2',r>1.5&&r<=2+1e-9);}
 else{let t2=SAT;for(let w=1;w<4&&eng(t2).weekendEvent(t2)!=='spark';w++)t2=SAT+w*7*D;const G2=eng(t2);G2.S=JSON.parse(JSON.stringify(S));const G3=eng(t2+3*D);G3.S=JSON.parse(JSON.stringify(S));{const r=(pfMaxSparkPerSec(G2)-2)/(pfMaxSparkPerSec(G3)-2);T('…et au week-end étincelles ×2',r>1.5&&r<=2+1e-9);}}}
// --- une médaille « Collection » suit les couleurs possédées, « Saisons » les couleurs de saison
{const t=MON;let S=fresh(t);S.skins=['cyan','rose','or'];let r=act(S,'medal',{id:'collect'},t);T('Collectionneur bronze à 3 couleurs',r.result.ok);
 S=fresh(t);S.skins=['cyan','s3'];r=act(S,'medal',{id:'season'},t);T('Vétéran des saisons bronze avec 1 couleur de saison',r.result.ok);}
console.log(`t7medals : ${ok} OK, ${ko} KO`);
