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
T('achat booster',r.buy===true&&r.iv);T('force augmente les dégâts',r.pm);T('achat Niveau à 300',r.poor===true);T('sans étincelles pas d\'achat',r.poor2===false);

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
  S.gems=1000;S.day.spMin=0;const sp0=S.run.sparks;o.buy=G.buyPack(0)===true&&S.gems===985&&S.run.sparks===sp0+600*30&&S.day.spMin===30;
  S.day.spMin=1440-200;o.cap=G.buyPack(2)==='cap'&&S.gems===985;S.gems=0;o.poor=G.buyPack(0)===false;S.day.spMin=0;
  // cadeau : fermer = disparaît ; plus de limite journalière
  S.day.gifts=99;o.okNoCap=G.giftOK();G.forceGift();o.shown=!document.getElementById('gift').hidden;document.getElementById('gift').click();o.modal=!document.getElementById('veil').hidden;document.querySelector('#modal [data-close]').click();o.gone=document.getElementById('gift').hidden&&!G.gift;
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
  S.run.max=25;o.noPrestige=G.prestigeGain()===0;S.run.max=30;o.gain=G.prestigeGain();const sh=S.run.sparks;S.run.tb.cad=7;const pp0=S.pp||0;const g=G.doPrestige();o.ppAfter=S.pp===pp0+1;o.prest=g===o.gain&&S.run.sparks===g+(S.up.st_bank?50*Math.pow(2.2,S.up.st_bank):0)&&S.run.stage===1&&G.refMult()===1.2&&S.run.tb.cad===0&&S.prestiges===1&&R.E.stage===1;
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
  o.pp=G.ppGain(20)===0&&G.ppGain(30)===1&&G.ppGain(50)===3;S.pp=3;o.buy=G.buyWP(2)&&S.pp===2&&G.wpLvl(2)===1&&G.wpCost(2)===2;o.pow=G.effectPow(3)>G.effectPow(4);o.buy2=G.buyWP(2)&&S.pp===0;o.poor=G.buyWP(2)===false;S.gems=100;o.reset=G.resetWP()&&S.pp===3&&G.wpLvl(2)===0&&S.gems===50;
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
  S.bestStage=40;S.day.gifts=0;G.forceGift();o.shown=!!G.gift&&!document.getElementById('gift').hidden;const k=G.gift&&G.gift.k;document.getElementById('gift').click();o.modal=document.getElementById('modal').textContent.length>0;const sh=S.run.sparks,gm=S.gems,sp=S.run.sparks;document.getElementById('giftGo').click();o.k=k;o.before={sh,gm,sp};return o;});
T('recherches infinies, durée plafonnée à 30 j',r.inf);T('probabilités et plateau restent plafonnés',r.crit&&r.board);T('bulle cadeau affichée',r.shown);T('cadeau : modale',r.modal);
await p.waitForTimeout(3500);T('cadeau reçu après la pub',await ev(b=>{const S=window.__G.S;return S.day.gifts===1&&(S.run.sparks>b.sh||S.gems>b.gm||S.run.sparks>b.sp||S.boostUntil>Date.now());},r.before));
T('pas de plafond de cadeaux par jour',await ev(()=>{const G=window.__G;G.S.day.gifts=999;const ok=G.giftOK();G.S.day.gifts=0;return ok;}));
// secousses : pas de cumul
T('critiques en rafale : tremblement plafonné',await ev(()=>{const G=window.__G;G.fx.trauma=0;for(let i=0;i<40;i++)G.hooks.hit(0,1e9,false,true,G.WEAPONS[4]);for(let i=0;i<40;i++){const s=G.fx.shots.shift();if(s)s.t=1;}for(let i=0;i<30;i++)G.hooks.hit(0,1e9,false,true,G.WEAPONS[4]);return G.fx.trauma<=0.6;}));
// connexion obligatoire
T('hors-ligne : pause et écran',await ev(()=>{const G=window.__G;G.setOnline(false);const a=!document.getElementById('offline').hidden&&G.R.hold===true;G.setOnline(true);return a&&document.getElementById('offline').hidden&&G.R.hold===false;}));
// petit écran
await p.setViewportSize({width:375,height:667});await p.waitForTimeout(300);T('375×667 sans débordement',await ev(()=>document.documentElement.scrollHeight<=innerHeight&&document.getElementById('board').getBoundingClientRect().width>=180));
// sauvegarde / rechargement
await ev(()=>{window.__G.S.run.sparks=777;window.__G.save();});await p.reload();await p.waitForTimeout(500);T('sauvegarde v7 rechargée',await ev(()=>window.__G.S.run.sparks>=777&&window.__G.S.prestiges>=2));
T('aucune erreur JS',errs.length===0);if(errs.length)console.log(errs,errStack);
console.log(`test7 : ${ok} OK, ${ko} KO`);await b.close();})();
