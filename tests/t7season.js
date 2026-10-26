// v12 : saisons automatiques, pass premium, événements du week-end, quêtes hebdo tirées, offre de la semaine — côté serveur (règles partagées)
const {pfApply,pfMakeEngine}=require('./pf_core.js');const src=require('./pf_src.js')();
let ok=0,ko=0;const T=(n,c)=>{if(c)ok++;else{ko++;console.log('KO',n);}};
const H=36e5,D=864e5;
const SAT=Date.UTC(2026,9,31,12),SUN=SAT+D,MON=SAT+2*D,WED=SAT+4*D; // 31/10/2026 = samedi
const eng=t=>{const G=pfMakeEngine(src,t);return G;};
function fresh(t){const G=eng(t);const S=G.fresh();S.tz=60;S.lastSeen=t;S.bestStage=40;S.run.stage=40;S.run.max=40;S.gems=1000;S.run.sparks=1e9;return S;}
const act=(S,action,payload,t,extra)=>pfApply(src,S,Object.assign({action,payload:payload||{}},extra||{}),t);

// --- événements du week-end
{const G=eng(SAT);G.S=fresh(SAT);const e1=G.weekendEvent(SAT),e2=G.weekendEvent(SUN),e3=G.weekendEvent(WED);
 T('week-end : un événement le samedi',!!e1);T('…le même le dimanche',e1===e2);T('…aucun en semaine',e3===null);
 const seq=[0,1,2,3].map(w=>G.weekendEvent(SAT+w*7*D));T('4 week-ends de suite : 4 événements différents (rotation)',new Set(seq).size===4);
 T('le 5e week-end reprend le cycle',G.weekendEvent(SAT+4*7*D)===seq[0]);
 T('annonce : nextEvent() en semaine = événement du samedi suivant',G.nextEvent(WED)===G.weekendEvent(SAT+7*D));}
// effets : on cherche le week-end de chaque événement
{const G0=eng(SAT);const when={};for(let w=0;w<4;w++){const t=SAT+w*7*D;when[G0.weekendEvent(t)]=t;}
 // étincelles ×2
 {const t=when.spark,G=eng(t),Gw=eng(t+3*D);const S=fresh(t);G.S=S;Gw.S=JSON.parse(JSON.stringify(S));T('événement étincelles : multiplicateur ×2',Math.abs(G.sparkMult()/Gw.sparkMult()-2)<1e-9);}
 // recherches 2× plus rapides (le serveur fixe la fin de la recherche)
 {const t=when.build,S=fresh(t),r=act(S,'build',{id:'eco_sp'},t);const Gw=eng(t+3*D);Gw.S=fresh(t+3*D);const u=Gw.upById('eco_sp')||Gw.ALLUP.find(x=>x.g==='eco');
  const S2=fresh(t),id=u.id,r2=act(S2,'build',{id},t),b=r2.state.build.find(x=>x.id===id);const S3=fresh(t+3*D),r3=act(S3,'build',{id},t+3*D),b3=r3.state.build.find(x=>x.id===id);
  T('événement recherches : durée divisée par 2 côté serveur',b&&b3&&Math.abs(b.dur*2-b3.dur)<=1);}
 // jokers
 {const t=when.joker,G=eng(t),Gw=eng(t+3*D);const S=fresh(t);S.jk={surge:1};G.S=S;Gw.S=JSON.parse(JSON.stringify(S));T('événement jokers : charge 2× plus rapide',G.jokerNeed('surge')<=Math.ceil(Gw.jokerNeed('surge')/2));}
 // cadeau ×3
 {const t=when.gift,S=fresh(t),g=S.gems,r=act(S,'shop_gift',{},t);T('événement cadeau : cadeau du jour ×3 (15 gemmes)',r.result.ok&&r.state.gems===g+15);
  const S2=fresh(t+3*D),g2=S2.gems,r2=act(S2,'shop_gift',{},t+3*D);T('…5 gemmes en semaine',r2.state.gems===g2+5);}}

// --- pass premium : avantages actifs pendant la saison
{const t=MON;let S=fresh(t);S.slots=1;S.lastSeen=t;
 let r=act(S,'sync',{},t);S=r.state;const G=eng(t);G.S=S;T('sans pass : pas d\'avantage',!G.premOn()&&G.slotsN()===1);
 r=act(S,'purchase',{id:'pass'},t,{demo:true});S=r.state;G.S=S;T('pass acheté : avantages actifs',G.premOn()&&G.slotsN()===2);
 // +1 emplacement : 2 recherches longues en même temps avec 1 seul emplacement acheté
 const ids=G.ALLUP.filter(u=>!G.upLocked(u)&&isFinite(G.upCost(u))&&G.upTime(u)>0).slice(0,3).map(u=>u.id);
 r=act(S,'build',{id:ids[0]},t);S=r.state;r=act(S,'build',{id:ids[1]},t);T('serveur : 2e recherche acceptée grâce au pass',r.result.ok!==false&&r.state.build.length===2);S=r.state;
 r=act(S,'build',{id:ids[2]},t);T('…3e refusée (1 + 1 du pass)',r.state.build.length===2);
 // points de pass ×2 : quête du jour réclamée
 {const G2=eng(t);G2.S=JSON.parse(JSON.stringify(S));const p0=G2.passState().xp;G2.passXP(10);T('points de pass ×2 avec le premium',G2.passState().xp===p0+20);}
 // hors ligne : +4 h de plafond
 {const G3=eng(t+12*H);G3.S=JSON.parse(JSON.stringify(S));G3.S.lastSeen=t;G3.S.up.off=0;G3.S.run.srate=1;const o=G3.offlineGains(t+12*H);T('hors ligne : plafond 2 h + 4 h du pass',o.sec===6*3600);
  G3.S.pass.prem=false;const o2=G3.offlineGains(t+12*H);T('…2 h sans pass',o2.sec===2*3600);}
 // saison suivante : avantages coupés
 {const t2=t+29*D;const G4=eng(t2);G4.S=JSON.parse(JSON.stringify(S));T('nouvelle saison : avantages coupés tant que le pass n\'est pas repris',!G4.premOn()&&G4.slotsN()===1);}}

// --- couleurs de saison
{const t=MON,G=eng(t);const k=G.seasonKey(),k2=eng(t+29*D).seasonKey();
 T('saison : teinte calculée, différente à chaque saison',G.seasonHue(k)!==G.seasonHue(k2)&&new Set(Array.from({length:12},(_,i)=>G.seasonHue(k+i))).size===12);
 let S=fresh(t);let r=act(S,'purchase',{id:'pass'},t,{demo:true});S=r.state;S.pass.xp=50*15;
 r=act(S,'pass_claim',{n:50,track:'p'},t);T('palier 50 premium : couleur de la saison',r.result.ok&&r.state.skins.includes('s'+k));S=r.state;
 r=act(S,'skin',{id:'s'+k},t);T('…qu\'on peut porter',r.result.ok&&r.state.skin==='s'+k);S=r.state;
 r=act(S,'skin',{id:'s'+(k+1)},t);T('couleur d\'une autre saison non obtenue : refusée',!r.result.ok);
 r=act(S,'skin',{id:'s'+k+'x'},t);T('couleur Éclat non obtenue : refusée',!r.result.ok);
 const G5=eng(t);G5.S=S;const i=G5.skinInfo('s'+k+'x');T('Éclat : même teinte, nom distinct',i.hue===G5.seasonHue(k)&&i.label!==G5.skinInfo('s'+k).label);}

// --- quêtes de la semaine tirées
{const sets=[];for(let w=0;w<6;w++){const t=MON+w*7*D;const G=eng(t);G.S=fresh(t);G.roll();sets.push(G.WEEKLY.map(q=>q.k+(q.a?q.a.n:'')).join('|'));}
 T('4 quêtes de la semaine',sets[0].split('|').length===4);T('les quêtes changent d\'une semaine à l\'autre',new Set(sets).size>=3);
 const t=MON,G=eng(t);G.S=fresh(t);G.roll();const a=G.WEEKLY.map(q=>q.k).join();const G2=eng(t+2*D);G2.S=G.S;G2.roll();T('même tirage toute la semaine (téléphone = serveur)',G2.WEEKLY.map(q=>q.k).join()===a);
 // réclamer une quête hebdo côté serveur
 let S=fresh(t);let r=act(S,'sync',{},t);S=r.state;S.week.kills=9999;S.week.bosses=99;S.week.merges=99999;S.week.titans=9;S.week.prestiges=9;r=act(S,'claim',{kind:'w',i:0},t);T('quête hebdo réclamée côté serveur',r.result.ok!==false&&r.state.week.claimed.includes(0));}

// --- offre de la semaine
{const t=MON;let S=fresh(t);const g=S.gems;let r=act(S,'week_offer',{},t);const G=eng(t);const o=G.weekOffer();
 T('offre de la semaine achetée',r.result.ok&&r.state.gems===g-o.g);S=r.state;r=act(S,'week_offer',{},t+H);T('…une seule fois par semaine',!r.result.ok);
 r=act(S,'week_offer',{},t+7*D);T('…de nouveau la semaine suivante',r.result.ok);
 const offs=new Set(Array.from({length:8},(_,w)=>eng(t+w*7*D).weekOffer().id));T('l\'offre change au fil des semaines',offs.size>=2);
 S=fresh(t);S.gems=5;r=act(S,'week_offer',{},t);T('sans gemmes : refusée',!r.result.ok&&r.state.gems===5);}

// --- compteurs de la semaine acceptés du téléphone (fusions, boss)
{const t=MON;let S=fresh(t);let r=act(S,'sync',{},t);S=r.state;const w=Object.assign({},S.week,{merges:50,bosses:3,kills:30});
 r=pfApply(src,S,{action:'sync',sim:{run:S.run,st:S.st,day:S.day,week:w}},t+60e3);T('fusions / boss de la semaine synchronisés',r.state.week.merges===50&&r.state.week.bosses===3);}

// --- autonomie : 3 ans de jours simulés, rien ne doit casser (quêtes, guilde, pass, saisons, événements, offres)
{let bad=[],evs=new Set(),seasons=new Set();const t0=Date.UTC(2026,10,1,10);let S=fresh(t0);
 for(let d=0;d<3*365;d++){const t=t0+d*D;const G=eng(t);G.S=S;try{G.roll();const q=G.questView();const gq=G.guildQuests();const p=G.passState();
   if(q.d.some(x=>!x||!x.t||!(x.n>0))||q.w.length!==4||q.w.some(x=>!x||!x.t||!(x.n>0))||gq.some(x=>!x||!x.t))bad.push(d+':quetes');
   if(!(p.k>=0)||G.seasonLeft()<1||G.seasonLeft()>28)bad.push(d+':pass');const e=G.weekendEvent(t);if(e)evs.add(e);seasons.add(p.k);
   if(!G.weekOffer()||!(G.weekOffer().g>0))bad.push(d+':offre');if(!(G.weekTheme()>=0))bad.push(d+':theme');S=G.S;}catch(err){bad.push(d+':'+err.message);if(bad.length>5)break;}}
 T('3 ans simulés jour par jour : aucune quête, saison, offre ou thème cassé',bad.length===0);if(bad.length)console.log(bad.slice(0,5));
 T('…tous les événements tournent',evs.size===4);T('…une saison toutes les 4 semaines (≈ 39)',seasons.size>=38&&seasons.size<=41);}
console.log(`t7season : ${ok} OK, ${ko} KO`);
