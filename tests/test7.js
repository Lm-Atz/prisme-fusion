const {chromium}=require('playwright');
let ok=0,ko=0;const T=(n,c)=>{if(c)ok++;else{ko++;console.log('KO',n);}};
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:390,height:844},locale:'fr-FR'});
const errs=[];let errStack=[];p.on('pageerror',e=>{errs.push(e.message);errStack.push(e.stack.split('\n').slice(0,4).join(' | '));});
await p.goto('file:///home/claude/fusion/wrapped.html');await p.waitForTimeout(500);
const ev=(f,...a)=>p.evaluate(f,...a);
// --- moteur
let r=await ev(()=>{const G=window.__G,R=G.R;R.paused=true;const S=G.S;const o={};
  o.N=R.N;o.cells=R.cells.filter(Boolean).length;o.stage=S.run.stage;
  // fusion manuelle
  R.cells.fill(null);R.cells[0]={l:1};R.cells[1]={l:1};const hp0=R.E.hp;o.mv=G.runMove(0,1,true);o.l2=R.cells[1]&&R.cells[1].l;o.noStrike=R.E.hp===hp0;R.paused=false;for(let i=0;i<20;i++)G.runTick(0.1);R.paused=true;o.dmg=hp0-R.E.hp;o.sparks=S.run.sparks;o.manual=S.st.manual;
  // incompatibles
  R.cells[2]={l:3};o.back=G.runMove(1,2,true);
  // aimant : cible proche compatible
  R.cells.fill(null);R.cells[0]={l:2};R.cells[6]={l:2};R.cells[7]={l:5};const c=G.cell;o.snap=G.snapTarget(0,(6%R.N+.5)*c+c*0.3,Math.floor(6/R.N)*c+c*0.5);o.snapNone=G.snapTarget(0,(7%R.N+.5)*c,Math.floor(7/R.N)*c+c*0.5);
  // boosters
  S.run.sparks=1000;const iv0=G.spawnInterval();o.buy=G.buyTB('cad');o.iv=G.spawnInterval()<iv0;o.pm0=G.powerMult();G.buyTB('power');o.pm=G.powerMult()>o.pm0;const sp1=S.run.sparks;o.poor=G.buyTB('birth')&&S.run.sparks===sp1-300;S.run.sparks=0;o.poor2=G.buyTB('cad');
  return o;});
T('plateau 4x4 au départ',r.N===4);T('3 gemmes au départ',r.cells===3);T('fusion manuelle',r.mv==='merge'&&r.l2===2);T('la fusion ne frappe pas',r.noStrike);T('les gemmes tirent en continu',r.dmg>0);T('étincelles gagnées',r.sparks>0);T('compteur manuel',r.manual===1);
T('gemmes différentes : retour',r.back==='back');T('aimant vers gemme compatible',r.snap===6);T('aimant : pas vers gemme différente',r.snapNone===null);
T('achat booster',r.buy===true&&r.iv);
T('force augmente les dégâts',r.pm);T('achat Niveau à 300',r.poor===true);T('sans étincelles pas d\'achat',r.poor2===false);
r=await ev(()=>{const G=window.__G;const L=G.LANG;G.setLang('de');const o={d:G.DAILY.map(q=>q.t).join('|'),w:G.WEEKLY.map(q=>q.t).join('|'),sk:G.SKINS.map(k=>k.label).join('|'),pk:[0,1,2,3].map(i=>G.packSparks(G.CFG.sparkShop.packs[i]))};G.setLang(L);o.fr=G.WEEKLY[0].t;return o;});
T('v11.8 : quêtes du jour/semaine traduites',!/Vaincre|Fusionner|Affronter|Faire 3/.test(r.d+r.w)&&/Gegner|Titan/.test(r.w));T('v11.8 : couleurs traduites (Gold)',/Gold/.test(r.sk));T('v11.8 : retour en français',/Vaincre/.test(r.fr));T('v11.8 : plancher des packs proportionnel à la durée',r.pk[3]>=r.pk[0]*20&&r.pk[0]>=200);

r=await ev(()=>{const G=window.__G,S=G.S;const o={};const u=G.upById('board');S.bestStage=5;o.l5=G.upLocked?undefined:null;o.lock12=S.bestStage<12&&!!document;S.up.board=1;G.newRun();o.n5=G.R.N;S.up.board=2;G.newRun();o.n6=G.R.N;S.up.board=0;G.newRun();o.n4=G.R.N;
  o.k1=G.CFG.sparks.kill(1),o.k16=G.CFG.sparks.kill(16);o.ref=0.8*Math.pow(1.18,16);return o;});
T('recherche plateau → 5x5',r.n5===5);T('→ 6x6',r.n6===6);T('retour 4x4',r.n4===4);T('étincelles ×3 à l\'étage 1',Math.abs(r.k1-0.8*1.18*3)<1e-9);T('bonus fondu à l\'étage 16',Math.abs(r.k16-r.ref)<1e-9);

r=await ev(()=>{const G=window.__G,S=G.S,R=G.R;const o={};R.paused=false;S.up.loot=0;S.lootX2=false;
  const sh0=S.run.sparks;S.run.stage=10;S.run.fled=false;G.startRun();G.R.E.hp=0.001;G.R.cells.fill(null);G.R.cells[0]={l:3};for(let i=0;i<30;i++)G.runTick(0.1);o.boss=G.R.E.type;o.gain=S.run.sparks-sh0;o.k=G.CFG.shards.kill(10,'boss');o.sp=G.CFG.sparks.kill(10)*5*G.sparkMult();return o;});
T('le boss lâche un bonus d\'étincelles (4 × étage)',r.gain>=40+r.sp-0.01&&r.gain<41+r.sp+1);

r=await ev(()=>{const G=window.__G,S=G.S;const o={};G.R.cells.fill(null);G.R.cells[0]={l:5};G.R.cells[7]={l:2,k:'gold'};G.R.cells[3]={k:'joker'};G.save();const raw=localStorage.getItem('prisme-fusion-v7');o.saved=JSON.parse(raw).run.cells;
  G.load();G.newRun();o.l0=G.R.cells[0]&&G.R.cells[0].l;o.gold=G.R.cells[7]&&G.R.cells[7].k==='gold'&&G.R.cells[7].l===2;o.jok=G.R.cells[3]&&G.R.cells[3].k==='joker';o.empty=G.R.cells.filter(Boolean).length===3;
  // la grille grandit sans perdre les gemmes (après le load, le plateau restauré est en place)
  const S2=G.S;G.R.cells.fill(null);G.R.cells[0]={l:5};G.R.cells[7]={l:2,k:'gold'};S2.run.sparks=1e9;S2.bestStage=40;S2.build=[];S2.up.board=0;const r0=G.startBuild('board',0);S2.build.forEach(b=>b.until=0);G.tickBuild(1);
  o.grown=G.R.N===5&&G.R.cells.length===25&&G.R.cells[0]&&G.R.cells[0].l===5&&G.R.cells[8]&&G.R.cells[8].k==='gold';o.r0=r0;
  return o;});
T('plateau sauvegardé (niveaux, dorée, joker)',Array.isArray(r.saved)&&r.saved[0]===5&&r.saved[7]===-2&&r.saved[3]==='j');T('plateau restauré au relancement',r.l0===5&&r.gold&&r.jok&&r.empty);T('la grille grandit en direct sans perdre les gemmes',r.grown);

r=await ev(()=>{const G=window.__G,S=G.S;const o={};S.run.stage=20;S.run.fled=false;G.startRun();const R=G.R;document.getElementById('veil').hidden=true;o.boss=R.mode==='boss';G.renderActs();o.btn=!!document.getElementById('retreat');
  o.ok=G.retreat();o.farm=R.mode==='farm'&&R.E.stage===19&&S.run.fled===true;G.renderActs();o.btnGone=!document.getElementById('retreat')&&!!document.getElementById('chal');o.again=G.retreat()===false;o.chal=G.challengeBoss()&&R.mode==='boss';return o;});
T('bouton Repli visible pendant le boss',r.boss&&r.btn);T('repli → retour au monstre précédent',r.ok&&r.farm);T('après repli : bouton Redéfier',r.btnGone&&r.again);T('on peut redéfier',r.chal);

r=await ev(()=>{const G=window.__G,S=G.S,R=G.R;const o={};R.paused=false;S.boostUntil=0;
  // débit de référence : 2 min, hors boost
  R.baseWin.length=0;R.sparkWin.length=0;R.cells.fill(null);S.run.tb.auto=0;for(let i=0;i<20;i++){R.cells[0]={l:1};R.cells[1]={l:1};G.runMove(0,1,true);}for(let i=0;i<12;i++)G.runTick(0.1);o.rate=G.rateMin();o.pos=o.rate>0;
  const gained=R.baseWin.reduce((a,x)=>a+x[1],0);o.coh=Math.abs(o.rate-gained/120*60)<1e-6;
  // le boost ×2 ne gonfle pas la référence
  const r0=G.rateMin();S.boostUntil=Date.now()+3600e3;R.baseWin.length=0;R.sparkWin.length=0;for(let i=0;i<20;i++){R.cells[0]={l:1};R.cells[1]={l:1};G.runMove(0,1,true);}for(let i=0;i<12;i++)G.runTick(0.1);o.boostSame=Math.abs(G.rateMin()-r0)<1e-6;S.boostUntil=0;
  // pubs et packs = minutes de production, avec plancher
  R.baseWin.length=0;G.runTick(0.1);G.runTick(1.1);o.zero=G.rateMin()===0;o.giftFloor=G.adSparks('gift')===60;o.shopFloor=G.adSparks('shop')===200;o.packFloor=G.packSparks(G.CFG.sparkShop.packs[0])===200;
  S.run.brate=10;o.gift=G.adSparks('gift')===6000;o.shop=G.adSparks('shop')===18000;o.pack=G.packSparks(G.CFG.sparkShop.packs[2])===600*240;
  // achat en gemmes + plafond journalier
  S.gems=1000;S.day.spMin=0;const sp0=S.run.sparks;o.buy=G.buyPack(0)===true&&S.gems===980&&S.run.sparks===sp0+600*30&&S.day.spMin===30;
  S.day.spMin=1440-200;o.cap=G.buyPack(2)==='cap'&&S.gems===980;S.gems=0;o.poor=G.buyPack(0)===false;S.day.spMin=0;
  // cadeau : fermer = disparaît ; plus de limite journalière
  S.day.gifts=99;o.okNoCap=G.giftOK();const no=G.NET.on;G.NET.on=false;G.forceGift();G.NET.on=no;o.shown=!document.getElementById('gift').hidden;document.getElementById('gift').click();o.modal=!document.getElementById('veil').hidden;document.querySelector('#modal [data-close]').click();o.gone=document.getElementById('gift').hidden&&!G.gift;
  return o;});
T('débit de référence mesuré',r.pos&&r.coh);T('boost ×2 exclu de la référence',r.boostSame);T('pub cadeau : plancher 60',r.zero&&r.giftFloor);T('pub boutique : plancher 200',r.shopFloor&&r.packFloor);T('pub = 10 / 30 min de production',r.gift&&r.shop);T('pack 100 gemmes = 4 h',r.pack);T('achat de pack',r.buy);T('plafond 24 h / jour',r.cap);T('sans gemmes : refus',r.poor);T('cadeaux sans limite journalière',r.okNoCap);T('cadeau : fermer le fait disparaître',r.shown&&r.modal&&r.gone);
// --- tick, spawn, auto, kill, étapes, boss
r=await ev(()=>{const G=window.__G,R=G.R,S=G.S;const o={};R.paused=false;
  R.cells.fill(null);const n0=R.cells.filter(Boolean).length;for(let i=0;i<40;i++)G.runTick(0.1);o.spawned=R.cells.filter(Boolean).length>n0;
  // plateau plein → recyclage
  R.cells.fill(null);for(let i=0;i<R.N*R.N;i++)R.cells[i]={l:i+1};for(let i=0;i<60;i++)G.runTick(0.1);o.notDead=R.cells.filter(c=>c&&c.l===1).length===0;
  // tuer : étape suivante
  S.run.tb.auto=5;R.cells.fill(null);const st0=S.run.stage;R.E.hp=0.001;R.cells[0]={l:2};for(let i=0;i<25;i++)G.runTick(0.1);o.next=S.run.stage===st0+1;o.hpFull=R.E.hp>=R.E.max*0.9;
  return o;});
T('apparitions au fil du temps',r.spawned);T('plateau plein : recyclage, jamais bloqué',r.notDead);T('tuer → étape suivante',r.next);T('nouvel ennemi plein',r.hpFull);
r=await ev(()=>{const G=window.__G,S=G.S;const o={};S.run.stage=9;S.run.fled=false;S.run.tb.auto=0;G.startRun();const R=G.R;document.getElementById('veil').hidden=true;R.paused=false;
  // boss à l'étape 10
  R.E.hp=0.001;R.cells.fill(null);R.cells[0]={l:2};for(let i=0;i<25;i++)G.runTick(0.1);o.boss=R.mode==='boss'&&R.E.type==='boss'&&S.run.stage===10;o.bossT=R.bossT;o.dbg=[S.run.stage,R.mode,R.E.type,R.E.hp,S.run.fled,R.cells[0]];
  // le boss fuit après le temps
  R.cells.fill(null);R.spawnT=-1000;for(let i=0;i<700;i++)G.runTick(0.1);o.fled=S.run.fled===true&&R.mode==='farm'&&R.E.stage===9;
  // redéfier
  o.chal=G.challengeBoss()&&R.mode==='boss'&&R.E.stage===10;
  // bouclier phase 2
  R.E.hp=R.E.max*0.45;R.cells.fill(null);R.cells[0]={l:1};for(let i=0;i<25;i++)G.runTick(0.1);o.shield=R.E.phase===2&&R.E.shieldL>0;
  const hp1=R.E.hp;R.cells.fill(null);R.cells[0]={l:1};R.burn=null;for(let i=0;i<20;i++)G.runTick(0.1);o.blocked=R.E.hp===hp1;
  const big=R.E.shieldL;R.cells.fill(null);R.cells[0]={l:big};for(let i=0;i<20;i++)G.runTick(0.1);o.pass=R.E.hp<hp1;
  R.cells.fill(null);R.cells[0]={l:2};for(let i=0;i<20;i++)G.runTick(0.1);o.square=R.E.hp<hp1*0.999||true;const hpc=R.E.hp;R.cells.fill(null);R.cells[0]={l:2};R.burn=null;for(let i=0;i<20;i++)G.runTick(0.1);o.sqPass=R.E.hp<hpc;
  // verrous expirent
  R.spawnT=0;R.cells.fill(null);R.cells[3]={k:'lock',until:R.t+1};for(let i=0;i<15;i++)G.runTick(0.1);o.lockGone=!R.cells[3]||R.cells[3].k!=='lock';
  // tuer le boss → nettoie, étape 11
  R.E.hp=0.001;R.cells.fill(null);R.cells[0]={l:big};for(let i=0;i<20;i++)G.runTick(0.1);o.after=S.run.stage===11&&R.mode==='farm'&&!S.run.fled;
  return o;});
T('boss à l\'étape 10 avec chrono',r.boss&&r.bossT>55&&r.bossT<=60);T('boss fuit, retour à l\'étape 9',r.fled);T('redéfier le boss',r.chal);T('bouclier phase 2',r.shield);T('petite gemme bloquée',r.blocked);T('grosse gemme passe',r.pass);T('le carré perce le bouclier',r.sqPass);T('verrous expirent',r.lockGone);T('boss vaincu → étape 11',r.after);
// --- prestige, offline, titan, jokers
r=await ev(()=>{const G=window.__G,S=G.S,R=G.R;const o={};
  S.run.max=25;o.noPrestige=G.prestigeGain()===0;S.run.max=30;o.gain=G.prestigeGain();const sh=S.run.sparks;S.run.tb.cad=7;const pp0=S.pp||0,first=!S.prestiges;const g=G.doPrestige();o.ppAfter=S.pp===pp0+1+(first?2:0);o.prest=g===o.gain&&S.run.sparks===g+(S.up.st_bank?50*Math.pow(2.2,S.up.st_bank):0)&&S.run.stage===1&&G.refMult()===1.2&&S.run.tb.cad===0&&S.prestiges===1&&R.E.stage===1;
  S.up.st_cad=3;o.startLvl=G.tbLvl('cad')===3;
  // hors-ligne
  S.run.srate=10;S.run.krate=0;S.lastSeen=Date.now()-3600e3;const off=G.offlineGains();o.off=off&&off.sparks===Math.floor(10*3600*G.CFG.offline.factor);
  S.lastSeen=Date.now()-10*3600e3;o.cap=G.offlineGains().sec===2*3600;S.up.off=2;o.cap2=G.offlineGains().sec===4*3600;S.up.off=0;
  S.run.stage=3;S.run.krate=0.1;S.up.au_exped=1;S.lastSeen=Date.now()-2*3600e3;const e=G.offlineGains();o.exped=e.stages>0&&e.stages<=6;S.up.au_exped=0;
  S.lastSeen=Date.now()-10e3;o.short=G.offlineGains()===null;
  // titan
  S.bestStage=20;G.CFG.titan.days=[0,1,2,3,4,5,6];const ts=G.titanState();ts.used=0;ts.ad=0;ts.gem=0;o.tk=G.titanTickets()===2;o.tReady=G.titanReady();o.tStart=G.startTitan()&&R.mode==='titan'&&R.E.type==='titan';o.tk1=G.titanTickets()===1;R.cells.fill(null);R.cells[0]={l:4};for(let i=0;i<20;i++)G.runTick(0.1);o.tDmg=R.titanDmg>0;const wb=S.week.best;G.endTitan();o.tEnd=R.mode==='farm'&&S.week.best>wb;G.startTitan();G.endTitan();o.tNone=G.titanTickets()===0&&!G.titanReady()&&G.startTitan()===false;o.tAd=G.titanAdTicket()&&G.titanTickets()===1&&G.titanAdTicket()===false;S.gems=30;o.tGem=G.titanGemTicket()&&G.titanTickets()===2&&S.gems===10&&G.titanGemTicket()===false;G.CFG.titan.days=[9];o.tDay=!G.titanReady()&&!G.isTitanDay();G.CFG.titan.days=[0,1,2,3,4,5,6];
  // jokers
  S.jk.chameleon=1;S.equip=['chameleon'];G.startRun();const R2=G.R;o.jk=R2.jk.chameleon===0;for(let i=0;i<30;i++){R2.cells[0]={l:1};R2.cells[1]={l:1};G.runMove(0,1,true);}o.charged=R2.jk.chameleon>=G.jokerNeed('chameleon');o.use=G.useJoker('chameleon')&&R2.cells.some(c=>c&&c.k==='joker');
  // auto-fusion consomme le joker
  S.run.tb.auto=10;for(let i=0;i<50;i++)G.runTick(0.1);o.jokerUsed=!R2.cells.some(c=>c&&c.k==='joker');
  return o;});
T('pas de prestige avant l\'étape 30',r.noPrestige);T('réfraction : trésor de départ + ×1,2 étincelles',r.prest);T('prestige donne des points',r.ppAfter);T('niveau de départ par recherche',r.startLvl);T('gains hors-ligne',r.off);T('plafond 2 h',r.cap);T('Veille étend le plafond',r.cap2);T('expédition avance des étapes, pas au-delà du boss',r.exped);T('absence courte ignorée',r.short);
T('titan prêt',r.tReady);T('titan démarre',r.tStart);T('dégâts titan comptés',r.tDmg);T('fin titan : ligue',r.tEnd);T('2 tickets gratuits',r.tk&&r.tk1);T('sans ticket : pas de Titan',r.tNone);T('ticket pub (1 par jour)',r.tAd);T('ticket gemmes (1 par jour)',r.tGem);T('hors jour Titan : indisponible',r.tDay);T('joker équipé',r.jk);T('joker chargé par les fusions',r.charged);T('caméléon posé',r.use);T('auto-fusion utilise le caméléon',r.jokerUsed);
// --- armes
r=await ev(()=>{const G=window.__G,S=G.S;G.startRun();const R=G.R;const o={};R.cells.fill(null);
  o.w=G.WEAPONS.length===8&&G.weaponOf(1).id==='tri'&&G.weaponOf(9).id==='tri'&&G.weaponOf(3).id==='pen';o.rank=G.rankOf(9)===1&&G.rankOf(8)===0;
  o.pp=G.ppGain(20)===0&&G.ppGain(30)===1&&G.ppGain(40)===3&&G.ppGain(50)===4;S.pp=3;o.buy=G.buyWP(2)&&S.pp===2&&G.wpLvl(2)===1&&G.wpCost(2)===2;o.pow=G.effectPow(3)>G.effectPow(4);o.buy2=G.buyWP(2)&&S.pp===0;o.poor=G.buyWP(2)===false;S.gems=100;o.reset=G.resetWP()&&S.pp===3&&G.wpLvl(2)===0&&S.gems===50;
  // brûlure
  R.cells[0]={l:3};for(let i=0;i<20;i++)G.runTick(0.1);o.burn=!!(R.burn&&R.burn.dps>0);
  // gel : rallonge le chrono
  S.run.stage=10;R.mode='boss';R.bossT=30;R.E=G.enemyFor(10);R.cells.fill(null);R.cells[0]={l:6};for(let i=0;i<20;i++)G.runTick(0.1);o.freeze=R.bossT>30-2.1;R.mode='farm';R.E=G.enemyFor(3);
  // étoile : étincelles
  R.cells.fill(null);R.cells[0]={l:7};const sp=S.run.sparks;for(let i=0;i<20;i++)G.runTick(0.1);o.star=S.run.sparks>sp;
  // éclair charge les jokers
  S.jk.chameleon=1;S.equip=['chameleon'];G.startRun();const R2=G.R;R2.cells.fill(null);R2.cells[0]={l:4};for(let i=0;i<20;i++)G.runTick(0.1);o.hex=R2.jk.chameleon>0;
  // aura
  R2.cells.fill(null);R2.cells[0]={l:1};R2.cells[1]={l:8};R2.E.hp=1e9;R2.E.max=1e9;for(let i=0;i<12;i++)G.runTick(0.1);const dA=1e9-R2.E.hp;R2.cells.fill(null);R2.cells[0]={l:1};R2.E.hp=1e9;for(let i=0;i<12;i++)G.runTick(0.1);const dB=1e9-R2.E.hp;o.aura=dA>dB;
  o.combo=(()=>{R2.combo=5;R2.comboT=3;const a=G.fireRate();R2.combo=0;R2.comboT=0;return a>G.fireRate();})();
  return o;});
T('8 armes par forme, cycle de 8',r.w);T('rang',r.rank);T('points de prestige par étape',r.pp);T('dépenser un point dans une arme',r.buy);T('l\'arme améliorée est plus forte',r.pow);T('coût croissant',r.buy2&&r.poor);T('redistribuer en gemmes',r.reset);T('pentagone brûle',r.burn);T('octogone gèle le chrono',r.freeze);T('étoile rapporte des étincelles',r.star);T('hexagone charge les jokers',r.hex);T('losange : aura',r.aura);T('combo manuel accélère les tirs',r.combo);
// --- atelier, quêtes, calendrier, boutique
r=await ev(()=>{const G=window.__G,S=G.S;const o={};S.run.sparks=100000;S.gems=500;
  o.start=G.startBuild('st_cad');o.busy=G.startBuild('st_power');S.slots=2;o.two=G.startBuild('power');o.locked=G.startBuild('au_prestige');
  const bld=S.build[0];o.rush=G.rushGems(bld)>=1;o.rushed=G.rushBuild('st_cad')&&S.up.st_cad>0;
  o.ad=G.adBuild('power');o.n=G.ALLUP.length;o.groups=G.GROUPS.length;o.max=Math.max(...G.UPG.map(u=>u.max));
  o.q=G.questView();o.onb3=o.q.onb.length===3;o.onbTotal=G.ONB.length;o.daily=o.q.d.length===4;o.week=o.q.w.length===4;
  S.st.manual=10;const g=S.gems;o.claim=G.claim('o',0)&&S.gems===g+10;o.claimTwice=G.claim('o',0)===false;
  o.login=G.loginState().day===1;o.claimL=G.claimLogin()&&!G.claimLogin();
  
  o.buy=G.purchase('starter')&&S.starter&&S.boostUntil>Date.now();o.boostx2=G.powerMult()>=2;
  o.gemBoost=G.buyGemItem('boost');o.skin=G.buySkin('rose')&&S.skin==='rose';
  return o;});
T('recherche lancée',r.start==='ok');T('un seul emplacement',r.busy==='slots');T('2e emplacement',r.two==='ok');T('recherche verrouillée par étape',r.locked==='locked');T('accélérer en gemmes',r.rush&&r.rushed);T('pub −30 min',r.ad);
T('≥ 40 recherches',r.n>=40);T('7 familles',r.groups===7);T('niveaux max élevés',r.max>=50);T('3 premiers pas visibles',r.onb3);T('50 premiers pas',r.onbTotal===50);T('4 quêtes du jour',r.daily);T('4 hebdo',r.week);T('récupérer une quête',r.claim);T('pas deux fois',r.claimTwice);T('calendrier jour 1',r.login&&r.claimL);T('pack de départ',r.buy&&r.boostx2);T('boost ×2 en gemmes',r.gemBoost);T('skin',r.skin);
// --- interface
await ev(()=>{document.getElementById('veil').hidden=true;const G=window.__G;G.S.st.tuto=3;G.tutoStep=0;document.getElementById('hint').hidden=true;G.S.st.namePrompted=true;G.startRun();G.refresh();G.renderTB();});
T('pas d\'énergie',await ev(()=>!document.getElementById('cE')));
T('un seul écran : jeu visible, pas d\'accueil',await ev(()=>!document.getElementById('game').hidden&&!document.getElementById('home')));
T('5 tuiles booster',await p.locator('.tbt').count()===5);
T('pas de barre d\'attaque ni de texte PV',await ev(()=>!document.getElementById('atkBar')&&!document.getElementById('hpTxt')));
await ev(()=>{window.__G.S.run.sparks=5000;window.__G.renderTB();});
await p.locator('[data-tb="power"]').click();T('clic tuile achète',await ev(()=>window.__G.S.run.tb.power>=1));
await p.locator('.nav [data-tab="quests"]').click();await p.waitForTimeout(100);T('panneau quêtes',await ev(()=>!document.getElementById('panel').hidden));
await ev(()=>{window.__G.S.st.kills=3;window.__G.renderTab();});const q=p.locator('.quest[data-claim]').first();T('quête prête cliquable',await q.count()===1);const gm=await ev(()=>window.__G.S.gems);await q.click();T('toucher la quête la récupère',await ev(g=>window.__G.S.gems>g||window.__G.S.run.sparks>0,gm));
await p.locator('#panel .quit').click();T('fermer le panneau',await ev(()=>document.getElementById('panel').hidden&&window.__G.tab==='home'));
await p.locator('.nav [data-tab="atelier"]').click();await p.waitForTimeout(100);T('7 boutons de famille',await p.locator('.grp button').count()===7);
await p.locator('[data-updetail="st_power"]').click();T('détail recherche',await ev(()=>!document.getElementById('veil').hidden&&document.getElementById('modal').textContent.includes('Force de départ')));
await p.locator('#modal [data-close]').click();await p.locator('#panel .quit').click();
await p.locator('#pillG').click();T('gemmes → boutique',await ev(()=>window.__G.tab==='shop'));
T('v10.5 : plus d\'écran d\'âge à l\'ouverture de la boutique',await ev(()=>document.getElementById('veil').hidden&&!document.getElementById('ageY')));
await p.locator('#panel .quit').click();await p.locator('#meBtn').click();T('avatar → profil',await ev(()=>window.__G.tab==='profile'));
await p.locator('.nav [data-tab="home"]').click();
await ev(()=>{const G=window.__G;G.S.run.max=30;G.renderActs();});T('bouton prestige',await p.locator('#prest').count()===1);
await p.locator('#prest').click();T('modale réfraction',await ev(()=>document.getElementById('modal').textContent.includes('Réfraction')));
await p.locator('#doPrest').click();await p.waitForTimeout(100);T('prestige effectué',await ev(()=>window.__G.S.prestiges>=2&&window.__G.S.run.stage===1));
await ev(()=>{if(!document.getElementById('veil').hidden)document.querySelector('#modal [data-close]')?.click();});
// modale hors-ligne
await ev(()=>{const G=window.__G;G.S.run.srate=5;G.S.lastSeen=Date.now()-3600e3;G.offlineModal(G.offlineGains());});T('modale absence',await ev(()=>document.getElementById('modal').textContent.includes('absence')));
await p.locator('#offOk').click();
// cibles tactiles et textes
const small=await ev(()=>{const bad=[];document.querySelectorAll('#game button,.nav button').forEach(b=>{const r=b.getBoundingClientRect();if(r.width&&r.height&&(r.width<44||r.height<44))bad.push(b.className+'#'+b.id+' '+Math.round(r.width)+'x'+Math.round(r.height));});return bad;});T('cibles ≥ 44 px : '+small.join(','),small.length===0);
const txt=await ev(()=>{const bad=[];document.querySelectorAll('#game *').forEach(e=>{if(!e.children.length&&e.textContent.trim()){const fs=parseFloat(getComputedStyle(e).fontSize);if(fs<12)bad.push(e.textContent.trim().slice(0,15)+':'+fs);}});return bad;});T('textes ≥ 12 px : '+txt.join(','),txt.length===0);
T('pas de débordement',await ev(()=>document.documentElement.scrollHeight<=innerHeight));
// recherches infinies, cadeaux
r=await ev(()=>{const G=window.__G,S=G.S;const o={};const u=G.upById('power');S.up.power=200;o.inf=isFinite(G.upCost(u))&&G.upCost(u)>0&&G.upTime(u)<=2592000&&G.upTime(u)>86400;S.up.power=0;o.crit=G.upById('crit').max===25;o.board=G.upById('board').max===2;
  S.bestStage=40;S.day.gifts=0;{const no=G.NET.on;G.NET.on=false;G.forceGift();G.NET.on=no;}o.shown=!!G.gift&&!document.getElementById('gift').hidden;const k=G.gift&&G.gift.k;document.getElementById('gift').click();o.modal=document.getElementById('modal').textContent.length>0;const sh=S.run.sparks,gm=S.gems,sp=S.run.sparks;document.getElementById('giftGo').click();o.k=k;o.before={sh,gm,sp};return o;});
T('recherches infinies, durée plafonnée à 30 j',r.inf);T('probabilités et plateau restent plafonnés',r.crit&&r.board);T('bulle cadeau affichée',r.shown);T('cadeau : modale',r.modal);
await p.waitForTimeout(3500);T('cadeau reçu après la pub',await ev(b=>{const S=window.__G.S;return S.day.gifts===1&&(S.run.sparks>b.sh||S.gems>b.gm||S.run.sparks>b.sp||S.boostUntil>Date.now());},r.before));
T('pas de plafond de cadeaux par jour',await ev(()=>{const G=window.__G;G.S.day.gifts=999;const ok=G.giftOK();G.S.day.gifts=0;return ok;}));
// secousses : pas de cumul
T('critiques en rafale : tremblement plafonné',await ev(()=>{const G=window.__G;G.fx.trauma=0;for(let i=0;i<40;i++)G.hooks.hit(0,1e9,false,true,G.WEAPONS[4]);for(let i=0;i<40;i++){const s=G.fx.shots.shift();if(s)s.t=1;}for(let i=0;i<30;i++)G.hooks.hit(0,1e9,false,true,G.WEAPONS[4]);return G.fx.trauma<=0.6;}));
// v9.4 Réfraction : Attaque/Plateau/Économie remis à zéro et mémorisés, automatisations en points, rachat instantané
r=await ev(()=>{const G=window.__G,S=G.S;const o={};S.bestStage=60;S.run.max=45;S.pp=0;S.gems=500;S.build=[];S.slots=1;
  S.up.power=5;S.up.board=1;S.up.spark=4;S.up.loot=2;S.up.st_cad=3;S.up.cadence=2;S.up.au_merge=1;S.up.off=2;S.mem={};
  S.build.push({id:'crit',until:Date.now()+9e6,dur:9e6});S.up.crit=1;
  G.growBoard&&G.growBoard();o.N0=G.R.N;
  const pp0=G.ppGain(45);o.ppGain=pp0===Math.floor(1.5*2.5);
  o.g=G.doPrestige()>0;
  o.reset=S.up.power===0&&S.up.board===0&&S.up.spark===0&&S.up.loot===0&&S.up.crit===0;
  o.kept=S.up.st_cad===3&&S.up.cadence===2&&S.up.au_merge===1&&S.up.off===2; // v9.5 : la Veille est permanente
  o.mem=S.mem.power===5&&S.mem.board===1&&S.mem.spark===4&&S.mem.crit===2; // la recherche en cours compte comme acquise
  o.buildGone=!S.build.length;o.shrunk=G.R.N===4&&G.R.cells.length===16;
  const u=G.upById('power');o.memTag=G.inMem(u);o.half=Math.abs(G.upCost(u)-u.c(0)*0.5)<1e-9;o.instant=G.upTime(u)===0;
  S.run.sparks=1e9;S.slots=1;S.build=[{id:'lucky',until:Date.now()+9e6,dur:9e6}]; // emplacement occupé : le rachat en mémoire passe quand même
  o.buyMem=G.startBuild('power')==='ok'&&S.up.power===1&&S.build.length===1;
  const sp=S.run.sparks;o.n=G.restoreAll();o.all=S.up.power===5&&S.up.board===1&&S.up.spark===4&&S.up.loot===2&&S.up.crit===2&&G.R.N===5;o.paid=S.run.sparks<sp;
  o.noMem=!G.inMem(u)&&G.upTime(u)>0;
  // automatisations : points de réfraction, sans délai
  const a=G.upById('au_buy');S.pp=0;o.ppCost=G.isPP(a)&&G.upCost(a)===1&&G.upTime(a)===0;o.poor=G.startBuild('au_buy')==='poor';S.pp=2;o.auto=G.startBuild('au_buy')==='ok'&&S.up.au_buy===1&&S.pp===1;
  S.up.au_buy=6;o.cost3=G.upCost(a)===3;S.up.au_buy=1;
  // migration : une automatisation en cours de recherche (ancien système) devient acquise
  const m=G.migrate({up:{au_boss:1},build:[{id:'au_boss',until:1,dur:1},{id:'power',until:1,dur:1}],day:{gq:[]}});o.conv=m.up.au_boss===2&&m.build.length===1&&m.build[0].id==='power'&&m.mem&&typeof m.mem==='object';
  return o;});
T('Réfraction : +50 % de points',r.ppGain);T('Réfraction effectuée',r.g);T('Attaque/Plateau/Économie remis à zéro',r.reset);T('Départ, Armes, Automatisation gardés',r.kept);T('niveaux mémorisés (recherche en cours comprise)',r.mem);T('recherches remises à zéro retirées des emplacements',r.buildGone);T('le plateau rétrécit avec la recherche Plateau',r.shrunk);
T('mémoire : moitié prix',r.memTag&&r.half);T('mémoire : instantané',r.instant);T('mémoire : sans emplacement libre',r.buyMem);T('Tout restaurer : tous les niveaux revenus',r.n>0&&r.all&&r.paid);T('au-delà de la mémoire : prix et durée normaux',r.noMem);
T('automatisation : 1 point, immédiat',r.ppCost&&r.poor&&r.auto);T('automatisation : 3 points au plus',r.cost3);T('migration : automatisation en cours acquise',r.conv);
await ev(()=>{const G=window.__G;G.S.up.power=0;G.S.mem.power=3;G.setTab('atelier');document.querySelector('[data-grp="atk"]').click();});
r=await ev(()=>({bar:!!document.getElementById('restoreAll'),tag:!!document.querySelector('.tile.inmem .tmem'),txt:document.getElementById('panel').innerText}));
T('Atelier : barre « Tout restaurer » et repère mémoire',r.bar&&r.tag&&/en mémoire/.test(r.txt));
await ev(()=>document.getElementById('restoreAll').click());T('bouton Tout restaurer',await ev(()=>window.__G.S.up.power===3));
await ev(()=>document.querySelector('[data-grp="auto"]').click());T('onglet Automatisation : solde de points',await ev(()=>/point/.test(document.getElementById('panel').innerText)&&!!document.querySelector('[data-build="au_merge"] .i')));
await ev(()=>{const G=window.__G;G.S.offerAt=Date.now()-3600e3;G.S.starter=false;G.setTab('shop');});
T('boutique : pas de compte à rebours sur le pack de départ',await ev(()=>!/visible encore/.test(document.getElementById('panel').innerText)));
await ev(()=>window.__G.setTab('home'));
// v9.7 prix : packs, bonus exacts, prix en euros, plafonds des pubs
r=await ev(()=>{const G=window.__G,S=G.S;const o={};const g=G.OFFERS.filter(x=>x.n);o.packs=g.map(x=>x.n).join()==='100,600,1300,2800,7500,16000';
  const per=g.map(x=>x.n/x.price);o.mono=per.every((v,i)=>!i||v>per[i-1]);
  o.bonusTrue=g.slice(1).every(x=>{const real=100*(x.n/x.price)/(100/0.99)-100;const shown=+x.d.match(/\+(\d+)/)[1];return shown<=real&&real-shown<1;});
  S.day.adk={};const l0=G.adLeft('shop');G.adUse('shop');o.adcap=l0===5&&G.adLeft('shop')===4;S.day.adk={shop:5};o.adzero=G.adLeft('shop')===0;S.day.adk={};
  return o;});
T('packs : 100 → 16 000 gemmes',r.packs);T('packs : plus on paie, plus la gemme est bon marché',r.mono);T('bonus affiché ≤ bonus réel, arrondi vers le bas',r.bonusTrue);T('pubs : plafond de 5 par jour en boutique',r.adcap&&r.adzero);
await ev(()=>{window.__G.S.day.adk={shop:5};window.__G.setTab('shop');});T('boutique : pub épuisée → bouton désactivé',await ev(()=>document.getElementById('adSparks').disabled&&/0 restante/.test(document.getElementById('adSparks').textContent)));
await ev(()=>{window.__G.S.day.adk={};window.__G.setTab('home');});
// v9.8 : plafond des gemmes de cadeaux, coffre de gemmes
r=await ev(()=>{const G=window.__G,S=G.S;const o={};S.day.gg=0;const g0=S.gems;
  G.giftTake({k:'g',v:10});G.giftTake({k:'g',v:10});G.giftTake({k:'g',v:10});G.giftTake({k:'g',v:10});o.cap=S.gems-g0===30&&S.day.gg===30;
  let rolls=[];for(let i=0;i<300;i++)rolls.push(G.giftRoll().k);o.noGem=!rolls.includes('g');S.day.gg=0;
  S.chest=0;const c0=G.chestG();G.chestFill(30);o.half=G.chestG()===c0+15;
  const pre=S.gems;G.purchase('g100');o.paidNoFill=G.chestG()===15;S.gems=pre;
  o.closed=G.purchase('chest')===false;
  G.chestFill(5000);o.capped=G.chestG()===600;const gb=S.gems;o.open=G.purchase('chest')&&S.gems===gb+600&&G.chestG()===0;
  o.again=G.purchase('chest')===false;
  return o;});
T('cadeaux : au plus 30 gemmes par jour',r.cap);T('cadeaux : plus de gemmes une fois le plafond atteint',r.noGem);T('coffre : 1 gemme pour 2 gemmes gratuites',r.half);T('coffre : les gemmes achetées ne le remplissent pas',r.paidNoFill);
T('coffre : fermé sous 300',r.closed);T('coffre : plafonné à 600',r.capped);T('coffre : ouverture = contenu exact, puis vide',r.open&&r.again);
await ev(()=>{const G=window.__G;G.S.chest=700;G.setTab('shop');});T('boutique : coffre affiché avec son contenu',await ev(()=>/Coffre de gemmes/.test(document.getElementById('panel').innerText)&&/350 gemmes sur 600/.test(document.getElementById('panel').innerText)));
await ev(()=>{window.__G.S.chest=0;window.__G.setTab('home');});
// ===== v10 : boutique, pass de saison, achats encadrés, notifications, offres contextuelles, confidentialité =====
await ev(()=>{const G=window.__G;G.S.settings.age='a';G.S.firstX2=false;G.S.spend=null;G.S.day.sgift=0;G.S.pass=null;G.setTab('shop');});
r=await ev(()=>{const G=window.__G,o={};const pn=document.getElementById('panel');const H=pn.innerHTML;o.order=H.indexOf('shopGift')<H.indexOf('data-tab="pass"')&&H.indexOf('data-tab="pass"')<H.indexOf('data-offer="g100"');
  o.light=pn.querySelectorAll('.pt').length===0&&!pn.querySelector('[data-pass]');o.x2=/doublée/.test(pn.innerText)&&pn.querySelectorAll('.x2bar').length===1&&pn.querySelectorAll('.x2').length===0;o.best=pn.querySelectorAll('.offer.best .ribbon').length===1&&!!pn.querySelector('.offer.best [data-offer="g16000"]');o.nopct=!/par rapport au petit paquet/.test(pn.innerText)&&pn.querySelectorAll('.bon').length===5;o.starter=pn.innerHTML.indexOf('data-offer="starter"')<pn.innerHTML.indexOf('data-tab="pass"');return o;});
T('v11 : boutique : cadeau, puis carte du pass, puis gemmes',r.order);T('v11 : la boutique n\'affiche plus les paliers (menu dédié)',r.light);T('v11.2 : ×2 annoncé une fois (bandeau)',r.x2);T('v11.2 : un seul « Meilleur rapport », sur le vrai meilleur pack',r.best);T('v11.2 : bonus en pastille, plus de phrase répétée',r.nopct);T('v11.2 : pack de départ en haut tant qu\'il n\'est pas pris',r.starter);
r=await ev(()=>{const G=window.__G;const g=G.S.gems;document.getElementById('shopGift').click();const a=G.S.gems===g+5&&document.getElementById('shopGift').disabled;return a;});T('v10 : cadeau du jour +5, puis bouton désactivé',r);
await p.locator('#panel [data-tab="pass"]').first().click();
r=await ev(()=>{const G=window.__G,pn=document.getElementById('panel'),o={};o.tab=G.tab==='pass';o.rows=pn.querySelectorAll('.pt:not(.ph)').length===10&&/Paliers 1 à 10/.test(pn.innerText)&&/Palier 0 \/ 100/.test(pn.innerText);o.nav=document.querySelector('.nav [data-tab="shop"]').getAttribute('aria-selected')==='true';return o;});
T('v11 : menu du pass dédié, 100 paliers par pages de 10',r.tab&&r.rows);T('v11 : onglet Boutique reste allumé',r.nav);
await ev(()=>{const G=window.__G;G.passXP(120);G.renderTab();});
r=await ev(()=>{const G=window.__G;const o={};o.tier=G.passTier()===8;const s=G.S.run.sparks;document.querySelector('[data-pass="1"][data-track="f"]').click();o.free=G.S.run.sparks>s&&G.passState().cf.includes(1);
  o.lock9=document.querySelector('[data-pass="9"][data-track="f"]').disabled;document.querySelector('[data-pass="1"][data-track="p"]').click();o.modal=!!document.querySelector('#modal [data-confirm="pass"]');return o;});
T('v11 : 120 points = palier 8 (15 points par palier)',r.tier);T('v10 : palier gratuit récupéré',r.free);T('v10 : palier non atteint désactivé',r.lock9);T('v10 : piste premium → proposition du pass',r.modal);
await p.locator('#modal [data-close]').click();
r=await ev(()=>{const G=window.__G,o={};G.S.gems=100;const g=G.S.gems;document.querySelector('[data-passtier="1"]').click();o.buy1=G.passTier()===9&&G.S.gems===g-15;o.freeOnly=!document.querySelector('[data-pass="9"][data-track="f"]').disabled&&document.querySelector('[data-pass="9"][data-track="p"]').classList.contains('lock');
  const before=G.passState().cf.length;document.getElementById('passAll').click();o.all=G.passState().cf.length===9&&G.passState().cp.length===0&&before===1;
  G.S.gems=5;G.renderTab();o.poor=document.querySelector('[data-passtier="1"]').disabled;G.S.gems=999;G.renderTab();
  document.querySelector('[data-ppage="1"]').click();o.next=/Paliers 11 à 20/.test(document.getElementById('panel').innerText)&&!!document.querySelector('[data-pass="20"].big');return o;});
T('v12 : acheter 1 palier = 15 gemmes',r.buy1);T('v11 : sans pass payant, seul le gratuit se débloque',r.freeOnly);T('v11 : tout récupérer (gratuit seulement sans pass)',r.all);T('v11 : achat de palier impossible sans gemmes',r.poor);T('v11 : page suivante, palier 20 mis en avant',r.next);
await ev(()=>{window.__G.passXP(0);window.__G.renderTab();});await p.locator('#panel [data-passbuy]').click();await p.locator('#modal [data-confirm="pass"]').click();await p.waitForTimeout(100);await ev(()=>{const G=window.__G;window.__pp=-1;});
r=await ev(()=>{const G=window.__G;G.setTab('pass');const g=G.S.gems;document.querySelector('[data-ppage="0"]')?.click();const b=document.querySelector('[data-pass="1"][data-track="p"]');b.click();const o={one:G.passState().prem&&G.S.gems===g+8&&G.S.spend.eur===4.99};
  const g2=G.S.gems;document.getElementById('passAll').click();o.all=G.passState().cp.length===9&&G.S.gems===g2+7*8;return o;}); /* v12 : palier 5 = coffre (production + boost), sans gemmes */T('v11 : pass acheté, palier premium 1 = 8 gemmes, dépense notée',r.one);T('v11 : paliers achetés avant le pass : leurs récompenses premium deviennent récupérables',r.all);
await ev(()=>window.__G.setTab('shop'));await p.locator('[data-offer="g100"]').click();await p.locator('#modal [data-confirm="g100"]').click();await p.waitForTimeout(100);
r=await ev(()=>{const G=window.__G;return G.S.firstX2===true&&document.querySelectorAll('#panel .x2').length===0;});T('v10 : premier pack doublé puis ×2 retiré',r);
await ev(()=>{const G=window.__G;G.S.spend.eur=200;G.setTab('shop');});const gA=await ev(()=>window.__G.S.gems);
await p.locator('[data-offer="g600"]').click();await p.locator('#modal [data-confirm="g600"]').click();await p.waitForTimeout(100);
T('v10.6 : plus d\'alerte de dépenses, achat direct',await ev(g=>window.__G.S.gems===g+600&&!/Alerte de dépenses/.test(document.getElementById('modal').innerText)&&!/Dépensé ce mois/.test(document.getElementById('panel').innerText),gA));
await ev(()=>{const G=window.__G;delete G.S.settings.age;G.S.spend=null;G.setTab('shop');});const gB=await ev(()=>window.__G.S.gems);await p.locator('[data-offer="g100"]').click();await p.locator('#modal [data-confirm="g100"]').click();await p.waitForTimeout(100);
T('v10.5 : achat possible sans âge déclaré (contrôles Google/Apple)',await ev(g=>window.__G.S.gems===g+100&&!/Achats indisponibles/.test(document.getElementById('modal').innerText),gB));
T('v12 : couleurs de la saison : non achetables, marquées palier 50 / 100',await ev(()=>{const G=window.__G,k=G.seasonKey();G.S.skins=G.S.skins.filter(s=>!/^s\d/.test(s));G.setTab('shop');const b=document.querySelector(`[data-skin="s${k}"]`),bx=document.querySelector(`[data-skin="s${k}x"]`);const g=G.S.gems;b.click();return !!b&&!!bx&&/50/.test(b.innerText)&&/100/.test(bx.innerText)&&!G.S.skins.includes('s'+k)&&G.S.gems===g&&!document.querySelector('[data-skin="saison"]');}));
// profil : plafond, confidentialité, âge
await ev(()=>window.__G.setTab('profile'));
T('v10 : profil : plus de plafond, pas d\'interrupteur de notifications sans téléphone',await ev(()=>!document.getElementById('setCap')&&!/Âge déclaré/.test(document.getElementById('panel').innerText)&&!document.getElementById('setNotif')));
await p.locator('#privBtn').click();T('v10 : politique de confidentialité dans le jeu',await ev(()=>{const x=document.getElementById('modal').innerText;return /Supabase/.test(x)&&/Irlande/.test(x)&&/CNIL/.test(x)&&/suppression/.test(x)&&!/24 mois/.test(x)&&/16 ans/.test(x)&&/consentement/.test(x)&&!/tranche d'âge/.test(x);}));
await p.locator('#modal [data-close]').click();
// notifications (faux plugin Capacitor)
await ev(()=>{window.__notif={sched:[],cancel:0};window.Capacitor={Plugins:{LocalNotifications:{async checkPermissions(){return {display:'granted'};},async checkExactNotificationSetting(){return {exact_alarm:'denied'};},async requestPermissions(){return {display:'granted'};},async schedule(o){window.__notif.sched=o.notifications;window.__notif.all=(window.__notif.all||[]).concat(o.notifications);},async cancel(){window.__notif.cancel++;}}}};localStorage.removeItem('prisme-nlog');});
r=await ev(()=>{const G=window.__G,o={};const d=new Date();d.setHours(10,0,0,0);const now=d.getTime();
  const M=60e3;G.S.build=[{id:'st_cad',until:now+30*M,dur:1800},{id:'st_power',until:now+60*M,dur:3600},{id:'st_auto',until:now+65*M,dur:3600},{id:'st_spark',until:now+5*3600e3,dur:3600}];const off0=G.S.up.off;G.S.up.off=4;G.S.bestStage=40;
  const pl=G.notifPlan(now);const rs=pl.filter(n=>n.r),rm=pl.filter(n=>!n.r);
  o.res=rs.length===3&&rs.some(n=>n.k==='n_res'&&n.at===now+30*M)&&rs.some(n=>n.k==='n_res2'&&n.v.n===2)&&rs.some(n=>n.at===now+5*3600e3);
  o.max2=rm.length<=2;o.full=rm.some(n=>n.k==='n_full');o.sorted=pl.every((n,i)=>!i||n.at>=pl[i-1].at);
  const ln=new Date();ln.setHours(21,30,0,0);const sh=G.notifShift(ln.getTime()+3600e3);o.quiet=new Date(sh).getHours()===9;
  G.S.build=[{id:'st_cad',until:ln.getTime()+3600e3,dur:3600}];o.resNight=G.notifPlan(ln.getTime()).filter(n=>n.r).every(n=>n.at===ln.getTime()+3600e3);
  G.S.build=[{id:'st_cad',until:now+30*M,dur:1800},{id:'st_power',until:now+60*M,dur:3600}];
  localStorage.setItem('prisme-nlog',JSON.stringify([now-3600e3,now-7200e3]));const pb=G.notifPlan(now);o.budget=pb.length===2&&pb.every(n=>n.r);localStorage.removeItem('prisme-nlog');
  G.S.build=[];G.S.up.off=off0;return o;});
T('v10.7 : chaque fin de recherche notifiée (regroupées à moins de 10 min)',r.res);T('v10 : rappels : 2 au plus, triés',r.max2&&r.sorted);T('v10 : notification de réserve pleine',r.full);T('v10 : rappels jamais la nuit (22 h → 9 h)',r.quiet);T('v10.8 : fin de recherche signalée même la nuit',r.resNight);T('v10.7 : 2 rappels déjà envoyés → plus de rappel, mais les recherches restent',r.budget);
await ev(()=>{const G=window.__G;delete G.S.settings.notif;G.notifPrompt();});T('v10 : demande de permission dans le jeu',await ev(()=>/Te prévenir/.test(document.getElementById('modal').innerText)));
await p.locator('#notifYes').click();await p.waitForTimeout(100);T('v10 : permission accordée → activées',await ev(()=>window.__G.S.settings.notif===true));
r=await ev(async()=>{const G=window.__G;G.S.build=[{id:'st_cad',until:Date.now()+3*3600e3,dur:3600}];const pl=await G.notifSchedule();const n=window.__notif.sched;return n.length===pl.length&&n.some(x=>x.id>=201)&&n.filter(x=>x.id<200).length<=2&&n.every(x=>x.title==='Prisme Fusion'&&x.body&&x.schedule.at instanceof Date);});T('v10 : notifications programmées en quittant',r);
r=await ev(async()=>{const c=window.__notif.cancel;await window.__G.notifCancel();return window.__notif.cancel===c+1;});T('v10 : annulées au retour',r);
await ev(()=>window.__G.setTab('profile'));T('v10 : interrupteur de notifications sur téléphone',await ev(()=>document.getElementById('setNotif')&&document.getElementById('setNotif').checked));
await p.locator('#notifTest').click();await p.waitForTimeout(200);T('v11.4 : test des notifications depuis Profil (programmée dans 10 s, diagnostic affiché)',await ev(()=>/10 secondes/.test(document.getElementById('modal').innerText)&&/alarmes exactes denied/.test(document.getElementById('modal').innerText)&&window.__notif.all.some(n=>n.id===299&&n.schedule.at-Date.now()<11000)&&window.__notif.all.every(n=>n.isExactNotification===false)));await p.locator('#modal [data-close]').click();
T('v11.4 : programmation en file (deux départs simultanés → pas de doublon)',await ev(async()=>{const G=window.__G;G.S.settings.notif=true;G.S.build=[{id:'st_cad',until:Date.now()+3*3600e3,dur:3600}];window.__notif.all=[];await Promise.all([G.notifSchedule(),G.notifSchedule()]);const r=window.__notif.all.filter(n=>n.id===201).length;G.S.build=[];return r===2&&window.__notif.sched.filter(n=>n.id===201).length===1;}));
await p.locator('#setNotif').uncheck();T('v10 : notifications coupées dans Profil',await ev(()=>window.__G.S.settings.notif===false));
r=await ev(async()=>{window.__notif.sched=[];await window.__G.notifSchedule();return window.__notif.sched.length===0;});T('v10 : coupées → rien de programmé',r);
await ev(()=>{delete window.Capacitor;window.__G.S.build=[];window.__G.setTab('home');});
// offre contextuelle : boss raté 3 fois
await ev(()=>{localStorage.removeItem('prisme-ctx-boss');const G=window.__G;for(let i=0;i<3;i++)G.hooks.bossFled(false);});await p.waitForTimeout(3100);
T('v10 : boss raté 3 fois → conseil (Atelier, boost), sans compte à rebours',await ev(()=>/Ce boss résiste/.test(document.getElementById('modal').innerText)&&!/\d+:\d\d/.test(document.getElementById('modal').innerText)));
await p.locator('#modal [data-go="atelier"]').click();T('v10 : conseil → Atelier',await ev(()=>window.__G.tab==='atelier'));
await ev(()=>{const G=window.__G;for(let i=0;i<3;i++)G.hooks.bossFled(false);});await p.waitForTimeout(3100);T('v10 : une seule fois par jour',await ev(()=>document.getElementById('veil').hidden));
await ev(()=>window.__G.setTab('home'));
// v10.9 : plus aucun équivalent en euros à côté des prix en gemmes
T('v10.9 : aucun « ≈ € » en boutique, Atelier et Profil',await ev(()=>{const G=window.__G;let ok=true;for(const tb of ['shop','atelier','profile']){G.setTab(tb);const x=document.getElementById('panel').innerText;if(/≈\s*[\d.,\s\u202f]+\s*(€|\$)/.test(x)||[...document.querySelectorAll('#panel .eur')].some(e=>/€|\$/.test(e.textContent))||/100 gemmes =/.test(x))ok=false;}G.setTab('home');return ok;}));
// v11 : Atelier séparé, Réfraction claire, petits textes des boutons, débordements
r=await ev(async()=>{const G=window.__G,o={};document.getElementById('veil').hidden=true;G.S.bestStage=50;G.S.prestiges=Math.max(1,G.S.prestiges);G.setTab('atelier');const pn=document.getElementById('panel');
  const keep=[...pn.querySelectorAll('.grpk.keep [data-grp]')].map(b=>b.dataset.grp),cyc=[...pn.querySelectorAll('.grpk.cyc [data-grp]')].map(b=>b.dataset.grp);
  o.rows=keep.join()==='start,auto,jok,arm'&&cyc.join()==='atk,grid,eco'&&cyc.every(g=>G.CFG.refr.reset.includes(g))&&keep.every(g=>!G.CFG.refr.reset.includes(g));
  pn.querySelector('[data-grp="atk"]').click();await new Promise(z=>setTimeout(z,30));o.tagC=[...document.querySelectorAll('#panel .tile')].every(t=>t.querySelector('.ttag.cyc'));
  document.querySelector('#panel [data-grp="start"]').click();await new Promise(z=>setTimeout(z,30));o.tagK=[...document.querySelectorAll('#panel .tile')].every(t=>t.querySelector('.ttag.keep'));
  const f=document.querySelector('#panel .b small');o.font=!f||/Lilita/.test(getComputedStyle(f).fontFamily);G.setTab('home');
  G.S.run.max=35;G.renderActs();document.getElementById('prest').click();const m=document.getElementById('modal');o.pre=!!m.querySelector('.prek .keep')&&!!m.querySelector('.prek .cyc')&&/Tu gardes/.test(m.innerText)&&/Tu repars à zéro/.test(m.innerText);m.querySelector('[data-close]').click();
  G.setTab('shop');const sm=[...document.querySelectorAll('#panel .b small')];o.adFont=sm.length>0&&sm.every(e=>/Lilita/.test(getComputedStyle(e).fontFamily));G.setTab('home');return o;});
T('v11 : Atelier : rangée « Définitives » et rangée « Remises à zéro »',r.rows);T('v11 : étiquette cyan sur les recherches remises à zéro',r.tagC);T('v11 : étiquette or sur les recherches gardées',r.tagK);
T('v11 : Réfraction : « Tu gardes » / « Tu repars à zéro »',r.pre);T('v11 : petits textes des boutons dans la police du jeu',r.font&&r.adFont);
r=await ev(async()=>{const G=window.__G,o=[];const lang0=G.LANG;for(const lg of ['fr','de','pt']){G.setLang(lg);for(const tb of ['shop','pass','quests','profile','atelier']){G.setTab(tb);document.querySelectorAll('#panel button,#panel .b').forEach(e=>{if(!e.offsetParent)return;const R=e.getBoundingClientRect();e.querySelectorAll('*').forEach(c=>{const q=c.getBoundingClientRect();if(q.width&&(q.right>R.right+2||q.left<R.left-2))o.push(lg+'/'+tb+': '+c.textContent.trim().slice(0,25));});});}}G.setLang(lang0);G.setTab('home');return o;});
T('v11 : aucun texte qui déborde de son bouton (fr, de, pt) '+r.slice(0,3).join(' | '),r.length===0);
// v11.1 : game feel des menus, onglets verrouillés, Échap
r=await ev(async()=>{const G=window.__G,o={};document.getElementById('veil').hidden=true;const sv={b:G.S.bestStage,p:G.S.prestiges};G.S.bestStage=1;G.S.prestiges=0;G.refresh();
  const b=document.querySelector('.nav [data-tab="shop"]');b.click();o.lockTap=G.tab!=='shop'&&/étape 8/.test(document.getElementById('toast').textContent);G.S.bestStage=sv.b;G.S.prestiges=sv.p;G.refresh();o.unl=!document.querySelector('.nav [data-tab="shop"]').classList.contains('lockd');
  G.S.day.sgift=0;G.setTab('shop');const g0=G.S.gems;document.getElementById('shopGift').click();const pop=document.querySelector('.rwpop');o.pop=!!pop&&/\+5/.test(pop.textContent)&&G.S.gems===g0+5;
  await new Promise(z=>setTimeout(z,1100));o.gone=!document.querySelector('.rwpop');
  G.setTab('home');await new Promise(z=>setTimeout(z,600));const c=document.getElementById('cG');G.S.gems+=500;G.refresh();await new Promise(z=>setTimeout(z,120));const mid=+c.textContent.replace(/\D/g,'');await new Promise(z=>setTimeout(z,600));const end=+c.textContent.replace(/\D/g,'');
  o.count=mid<G.S.gems&&end===G.S.gems;G.S.gems-=500;G.refresh();
  G.privacyModal();document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape'}));o.esc=document.getElementById('veil').hidden;return o;});
T('v11.1 : onglet verrouillé : message « se débloque à l\'étape 8 »',r.lockTap);T('v11.1 : onglet débloqué ensuite',r.unl);T('v11.1 : récompense qui jaillit du bouton (+5 gemmes)',r.pop);T('v11.1 : effet transitoire (disparaît)',r.gone);T('v11.1 : compteur de gemmes qui défile',r.count);T('v11.1 : Échap ferme la fenêtre',r.esc);
// v11.2 : revue design
r=await ev(async()=>{const G=window.__G,o={};document.getElementById('veil').hidden=true;G.setTab('atelier');const pn=document.getElementById('panel');
  o.sub=!/sont définitifs/.test(pn.querySelector('.phead').innerText);document.querySelector('#panel [data-grp="start"]').click();await new Promise(z=>setTimeout(z,30));
  o.inf=[...document.querySelectorAll('#panel .pips.inf')].every(e=>!/gradient/.test(getComputedStyle(e).backgroundImage));
  const ic=id=>document.querySelector(`#panel [data-updetail="${id}"] use`)?.getAttribute('href');o.icons=ic('off')!==ic('st_cad')&&ic('off')==='#i-clock';
  const sv0=G.S.bestStage;G.seenReset();G.S.bestStage=1;['start','auto','atk','grid','eco','jok','arm'].forEach(g=>G.seenGroup(g));G.S.bestStage=sv0;G.S.bestStage=1;o.seen0=['start','auto','atk','grid','eco','jok','arm'].every(g=>!G.grpNew(g));
  const sv=sv0;G.S.bestStage=999;o.newB=['start','auto','atk','grid','eco','jok','arm'].some(g=>G.grpNew(g));const g1=['start','auto','atk','grid','eco','jok','arm'].find(g=>G.grpNew(g));G.seenGroup(g1);o.seenAfter=!G.grpNew(g1);G.S.bestStage=sv;
  G.setTab('clan');const c=document.getElementById('panel');o.lg=!/montent en/.test(c.innerText)&&!c.querySelector('.zone')&&/étapes/.test(c.querySelector('h2.sec').innerText);
  document.getElementById('lgHelp').click();o.help=/division dépend/.test(document.getElementById('modal').innerText);document.querySelector('#modal [data-close]').click();
  o.allsim=!!c.querySelector('.simall')&&!c.querySelector('.simtag');
  G.setTab('profile');o.nosel=!document.querySelector('#panel select');document.getElementById('langBtn').click();const b=document.querySelector('#modal [data-setlang="en"]');o.langs=document.querySelectorAll('#modal [data-setlang]').length>=6;b.click();await new Promise(z=>setTimeout(z,50));o.en=G.LANG==='en';G.setLang('fr');G.setTab('home');return o;});
T('v11.2 : Atelier sans en-tête redondant',r.sub);T('v11.2 : plus de fausse barre pleine (recherches sans maximum)',r.inf);T('v11.2 : Veille a sa propre icône',r.icons);
T('v11.2 : pastilles : rien de neuf → aucune',r.seen0);T('v11.2 : pastille sur une famille avec une recherche nouvellement débloquée',r.newB);T('v11.2 : pastille effacée une fois la famille ouverte',r.seenAfter);
T('v11.2 : ligue : plus de « montée », tranche d\'étapes affichée',r.lg);T('v11.2 : ligue : explication derrière « ? »',r.help);T('v11.2 : classement tout simulé : une seule mention',r.allsim);
T('v11.2 : langue : plus de menu déroulant système',r.nosel);T('v11.2 : langue choisie dans une fenêtre du jeu',r.langs&&r.en);
// v11.3 : identité visuelle par onglet
r=await ev(async()=>{const G=window.__G,o={};document.getElementById('veil').hidden=true;const acc=t=>{G.setTab(t);return getComputedStyle(document.querySelector('#panel .phead .ttl')).color;};
  o.diff=new Set(['atelier','quests','clan','shop'].map(acc)).size===4;G.S.st.manual=Math.max(G.S.st.manual,20);G.setTab('quests');o.one=document.querySelectorAll('#panel .hero').length<=1;
  G.S.starter=false;G.setTab('shop');o.shop=!!document.querySelector('#panel .offer.feat.hero .herol');G.setTab('profile');o.none=!document.querySelector('#panel .hero');G.setTab('home');return o;});
T('v11.3 : une couleur du spectre par onglet',r.diff);T('v11.3 : au plus un élément mis en avant par écran',r.one&&r.none);T('v11.3 : offre de bienvenue mise en avant en boutique',r.shop);
// v11.5 : « Nouvel onglet » une seule fois, même après une synchronisation qui réécrit la partie
r=await ev(async()=>{const G=window.__G;document.getElementById('veil').hidden=true;const sv={b:G.S.bestStage,p:G.S.prestiges};G.navReset();localStorage.removeItem('prisme-nav');
  G.S.bestStage=4;G.S.prestiges=0;const tt=document.getElementById('toast');tt.hidden=true;G.refresh();const first=!tt.hidden&&/Nouvel onglet/.test(tt.textContent);
  let again=0;for(let i=0;i<4;i++){tt.hidden=true;delete G.S.st.nav;G.S.st={...G.S.st};G.refresh();if(!tt.hidden&&/Nouvel onglet/.test(tt.textContent))again++;}
  G.S.bestStage=sv.b;G.S.prestiges=sv.p;G.refresh();return {first,again};});
T('v11.5 : « Nouvel onglet » annoncé au déblocage',r.first);T('v11.5 : … et plus jamais ensuite, même si la partie est réécrite',r.again===0);
// v11.6 : messages d'erreur du pseudo, pub non fermable au Retour
r=await ev(async()=>{const G=window.__G;document.getElementById('veil').hidden=true;G.setTab('profile');document.getElementById('nameIn').value='x';document.getElementById('nameBtn').click();const m=document.getElementById('nameErr').textContent;G.setTab('home');return m;});
T('v11.6 : pseudo refusé : le message s\'affiche',r.length>3&&r!=='undefined');
// v10.3 : son de victoire discret
r=await ev(async()=>{const G=window.__G;G.S.settings.sound=true;G.S.settings.music=false;G.Music.stop();G.soundBg(false);const A=G.AC;const types=[],freqs=[];const co=A.createOscillator.bind(A);A.createOscillator=()=>{const o=co();const d=Object.getOwnPropertyDescriptor(OscillatorNode.prototype,'type');Object.defineProperty(o,'type',{set(v){types.push(v);d.set.call(o,v);},get(){return d.get.call(o);}});const sv=o.frequency.setValueAtTime.bind(o.frequency);o.frequency.setValueAtTime=(f,t)=>{freqs.push(f);return sv(f,t);};return o;};
  for(let i=0;i<6;i++)G.sfx.pop();const n1=types.length;G.sfx.tick();A.createOscillator=co;return {n1,noSquare:!types.includes('square'),maxF:Math.max(...freqs)};});
T('v10.3 : ennemi vaincu : un seul son pour 6 victoires rapprochées',r.n1===1);T('v10.3 : plus de bip carré aigu',r.noSquare&&r.maxF<1000);
// v10.2 : son coupé en arrière-plan
r=await ev(async()=>{const G=window.__G,o={};G.S.settings.music=true;G.S.settings.sound=true;G.Music.start();await new Promise(z=>setTimeout(z,200));o.ac=!!G.AC;o.on0=G.Music.on;
  Object.defineProperty(document,'hidden',{value:true,configurable:true});Object.defineProperty(document,'visibilityState',{value:'hidden',configurable:true});document.dispatchEvent(new Event('visibilitychange'));await new Promise(z=>setTimeout(z,300));
  o.off=G.Music.on===false&&G.AC.state!=='running';
  Object.defineProperty(document,'hidden',{value:false,configurable:true});Object.defineProperty(document,'visibilityState',{value:'visible',configurable:true});document.dispatchEvent(new Event('visibilitychange'));await new Promise(z=>setTimeout(z,300));
  o.back=G.Music.on===true&&G.AC.state==='running';G.S.settings.music=false;G.Music.stop();G.soundBg(false);G.soundBg(true);G.soundBg(false);o.noMusic=G.Music.on===false;return o;});
T('v10.2 : musique lancée',r.ac&&r.on0);T('v10.2 : arrière-plan → musique arrêtée, son suspendu',r.off);T('v10.2 : retour → musique reprise',r.back);T('v10.2 : musique désactivée → ne reprend pas',r.noMusic);
// v9.9 : premières minutes
r=await ev(()=>{const G=window.__G,S=G.S,o={};const sv={b:S.bestStage,p:S.prestiges,m:S.run.max,st:S.st.nav};S.bestStage=1;S.prestiges=0;S.run.max=1;G.refresh();
  const hid=k=>{const b=document.querySelector(`.nav [data-tab="${k}"]`);return !b.hidden&&b.classList.contains('lockd')&&!!b.querySelector('.lk');};o.start=hid('atelier')&&hid('quests')&&hid('shop')&&hid('clan');
  S.bestStage=3;G.refresh();o.s3=!hid('atelier')&&hid('quests');S.bestStage=8;G.refresh();o.s8=!hid('shop')&&hid('clan');S.bestStage=10;G.refresh();o.s10=!hid('clan');
  S.bestStage=15;S.run.max=15;G.refresh();const rg=document.getElementById('refrG');o.gauge=!rg.hidden&&/15 \/ 30/.test(rg.textContent);S.run.max=30;G.refresh();o.gaugeOff=rg.hidden;
  S.bestStage=sv.b;S.prestiges=sv.p;S.run.max=sv.m;G.refresh();return o;});
T('v11.1 : onglets verrouillés visibles (cadenas) au départ',r.start);T('v9.9 : Atelier à l\'étape 3',r.s3);T('v9.9 : Boutique à l\'étape 8',r.s8);T('v9.9 : Clan à l\'étape 10',r.s10);T('v9.9 : jauge de Réfraction 10–29',r.gauge&&r.gaugeOff);
// connexion obligatoire
T('hors-ligne : pause et écran',await ev(()=>{const G=window.__G;G.setOnline(false);const a=!document.getElementById('offline').hidden&&G.R.hold===true;G.setOnline(true);return a&&document.getElementById('offline').hidden&&G.R.hold===false;}));
// petit écran
await p.setViewportSize({width:375,height:667});await p.waitForTimeout(300);T('375×667 sans débordement',await ev(()=>document.documentElement.scrollHeight<=innerHeight&&document.getElementById('board').getBoundingClientRect().width>=180));
// v11.9 : onglets Jokers et Armes en vrais clics
await p.setViewportSize({width:390,height:844});
r=await ev(async()=>{const G=window.__G,S=G.S,o={};document.getElementById('veil').hidden=true;S.bestStage=20;S.jk={};S.equip=[];S.jslots=1;S.run.sparks=1e7;S.pp=5;S.wp={};G.setTab('atelier');
  document.querySelector('[data-grp="jok"]').click();await new Promise(r=>setTimeout(r,50));const P=document.getElementById('panel');
  o.how=!!P.querySelector('.howto li');o.new=!!P.querySelector('.jst.new');o.lock=!!P.querySelector('.jst.lock');o.lab=!!P.querySelector('.jlab');
  P.querySelector('[data-unlock="chameleon:s"]').click();await new Promise(r=>setTimeout(r,50));o.unl=(G.S.jk.chameleon|0)===1&&!!document.querySelector('#panel .jst.eq'); /* débloquer équipe d'office s'il reste une place */
  document.querySelector('#panel [data-equip="chameleon"]').click();await new Promise(r=>setTimeout(r,50));const off=!G.S.equip.includes('chameleon')&&!!document.querySelector('#panel .jst.own');document.querySelector('#panel [data-equip="chameleon"]').click();await new Promise(r=>setTimeout(r,50));o.eq=off&&G.S.equip.includes('chameleon')&&!!document.querySelector('#panel .jst.eq');
  S.jk.magnet=1;G.setTab('atelier');o.diff=/3 → 4/.test(document.getElementById('panel').textContent);
  document.querySelector('[data-grp="arm"]').click();await new Promise(r=>setTimeout(r,50));const Q=document.getElementById('panel');
  o.gem=/Gemme 1/.test(Q.textContent);o.nores=!document.getElementById('wpReset');
  Q.querySelector('[data-wp="0"]').click();await new Promise(r=>setTimeout(r,50));o.wp=S.wp[0]===1&&S.pp===4&&/effet \+20/.test(document.getElementById('panel').textContent)&&!!document.getElementById('wpReset');
  document.getElementById('wpHelp').click();await new Promise(r=>setTimeout(r,50));o.help=!document.getElementById('veil').hidden;document.querySelector('#modal [data-close]').click();return o;});
T('v11.9 jokers : mode d\'emploi et statuts',r.how&&r.new&&r.lock&&r.lab);T('v11.9 jokers : débloquer au clic',r.unl);T('v11.9 jokers : équiper au clic',r.eq);T('v11.9 jokers : niveau suivant « 3 → 4 »',r.diff);
T('v11.9 armes : « Gemme 1 », pas de Redistribuer sans dépense',r.gem&&r.nores);T('v11.9 armes : Améliorer au clic + bonus affiché',r.wp);T('v11.9 armes : aide des points',r.help);
// v12 : pass premium, saisons, événement, offre de la semaine (vrais clics)
r=await ev(async()=>{const G=window.__G,o={};const w=ms=>new Promise(z=>setTimeout(z,ms));document.getElementById('veil').hidden=true;G.S.gems=2000;G.setTab('pass');const P=()=>document.getElementById('panel');
  o.perks=!!P().querySelector('.perks')&&/emplacement de recherche/.test(P().textContent)&&/Saison /.test(P().textContent);o.price=!!P().querySelector('[data-passtier="1"]')&&/15/.test(P().querySelector('[data-passtier="1"]').textContent);
  o.active=G.premOn()&&!!P().querySelector('.perks.on');
  G.setTab('atelier');document.querySelector('[data-grp="start"]')?.click();await w(30);o.slot=/grâce au pass/.test(P().textContent);
  G.setTab('shop');await w(30);const k=G.seasonKey();o.skins=!!P().querySelector(`[data-skin="s${k}"]`)&&!!P().querySelector(`[data-skin="s${k}x"]`);
  const b=document.getElementById('weekOffer');const g=G.S.gems,c=G.weekOffer().g;b.click();await w(80);o.wo=G.S.gems===g-c&&document.getElementById('weekOffer').disabled;
  const real=Date.now;const sat=(()=>{let t=real();for(let i=0;i<8;i++){if(G.weekendEvent(t))return t;t+=864e5;}return t;})();Date.now=()=>sat;G.renderTab();o.ev=!!P().querySelector('.evcard.on');G.setTab('quests');o.evq=!!P().querySelector('.evcard');Date.now=real;G.renderTab();
  return o;});
T('v12 : pass : avantages premium et prix 15 gemmes',r.perks&&r.price);T('v12 : pass acheté → avantages « Actif »',r.active);T('v12 : atelier : emplacement du pass signalé',r.slot);
T('v12 : boutique : couleurs de la saison',r.skins);T('v12 : offre de la semaine achetée au clic',r.wo);T('v12 : carte d\'événement le week-end (boutique et quêtes)',r.ev&&r.evq);
// sauvegarde / rechargement
await ev(()=>{window.__G.S.run.sparks=777;window.__G.save();});await p.reload();await p.waitForTimeout(500);T('sauvegarde v7 rechargée',await ev(()=>window.__G.S.run.sparks>=777&&window.__G.S.prestiges>=2));
T('aucune erreur JS',errs.length===0);if(errs.length)console.log(errs,errStack);
console.log(`test7 : ${ok} OK, ${ko} KO`);await b.close();})();
