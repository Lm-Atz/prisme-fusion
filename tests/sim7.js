// Simulation 60 jours : joueur virtuel sur le moteur v7 (horloge virtuelle)
const fs=require('fs');
const sp='/tmp/claude-0/-home-claude/81df6a99-c7ba-558a-9b66-58a3676a4af2/scratchpad/';
const code=fs.readFileSync('v7_i18n.js','utf8')+'\n'+fs.readFileSync('parts/r_util.js','utf8')+'\n'+fs.readFileSync('v7_engine.js','utf8')+`
return {get S(){return S},set S(v){S=v},get R(){return R},CFG,UPG,ALLUP,JOKERS,ONB,DAILY:()=>DAILY,newRun,runTick,runMove,buyTB,tbCost,tbLvl,prestigeGain,doPrestige,challengeBoss,startTitan,wpCost,buyWP,titanReady,offlineGains,applyOffline,startBuild,tickBuild,upCost,upTime,upLocked,inBuild,upById,lvlOf,unlockJoker,jokerAvail,useJoker,jokerNeed,claim,questView,collect,accrue,roll,give,loginState,claimLogin,fresh,save,load,hooks,spawnInterval,autoRate,powerMult,enemyFor,adBuild,buySlot,jokerById};`;
let NOW=Date.UTC(2026,9,5,8,0,0);
const localStorage={o:{},getItem(k){return this.o[k]||null},setItem(k,v){this.o[k]=v}};
const G=new Function('Date','localStorage','cell','document','window','navigator',code)(new Proxy(Date,{construct(t,a){return a.length?new t(...a):new t(NOW)},get(t,k){return k==='now'?()=>NOW:t[k]}}),localStorage,60,{documentElement:{}},undefined,{languages:['fr']});
const S=()=>G.S;
const args=Object.fromEntries(process.argv.slice(2).map(a=>a.split('=')));
const PROFILE=args.p||'moyen';
if(args.hp)G.CFG.enemy.hp=n=>400*Math.pow(+args.hp,n-1)*(n%10===0?6:n%5===0?2.2:1);
if(args.bg){G.CFG.tb.birth.g=+args.bg;}if(args.bm)G.CFG.tb.birth.max=+args.bm;
if(args.sm)G.CFG.sparks.merge=l=>Math.pow(+args.sm,l-1);if(args.kill)G.CFG.sparks.kill=+args.kill;
if(args.pg)G.CFG.tb.power.g=+args.pg;if(args.cg)G.CFG.tb.cad.g=+args.cg;
const PROF={actif:{sessions:[[8,600],[12,480],[18,600],[21,900]],mps:1.3,ads:true,buyAds:3},moyen:{sessions:[[8,240],[13,180],[20,420]],mps:1.0,ads:true,buyAds:1},casual:{sessions:[[20,300]],mps:0.8,ads:false,buyAds:0}}[PROFILE];
// priorités de recherche (id → poids), le bot prend la meilleure abordable
const PRIO={cadence:8,rang:6,eveil:5,brule:4,aura:4,st_cad:9,st_power:9,st_auto:8,au_merge:10,st_spark:7,st_bank:5,power:8,spark:8,loot:9,prod:5,cap:3,off:6,au_buy:9,au_boss:7,au_exped:8,au_prestige:6,au_joker:5,au_titan:4,crit:6,combo:2,bossdmg:7,pierce:4,lucky:5,chain:5,gold:4,board:8,sursis:6,killspark:6,catal:3,st_birth:9};
const log=[];const day=()=>Math.floor((NOW-Date.UTC(2026,9,5))/86400e3)+1;
let manualCount=0,titanRuns=0,fledEvents=0,stuck=0;
function mergeOnce(){const R=G.R;const seen={};const cells=R.cells.map((c,i)=>[c,i]).filter(x=>x[0]&&x[0].l&&!x[0].fog).sort((a,b)=>b[0].l-a[0].l);for(const [c,i] of cells){if(seen[c.l]!=null){G.runMove(seen[c.l],i,true);manualCount++;return true;}seen[c.l]=i;}return false;}
function buyBoosters(){let n=0;const floor=S().run.sparks*0.5;for(let k=0;k<20;k++){if(S().run.sparks<floor)break;const keys=['cad','birth','auto','power','spark'];let best=null,bc=Infinity;for(const key of keys){const c=G.tbCost(key);const w={cad:1,birth:0.8,auto:0.9,power:0.9,spark:1}[key];if(c*w<bc){bc=c*w;best=key;}}if(best&&G.buyTB(best))n++;else break;}return n;}
function research(){G.tickBuild(NOW);while(S().build.length<S().slots){let best=null,bs=0;for(const u of G.ALLUP){if(G.upLocked(u)||G.inBuild(u.id))continue;const c=G.upCost(u);if(!isFinite(c)||c>S().run.sparks)continue;const pr=(PRIO[u.id]||3)/(1+G.lvlOf(u)*0.15);const sc=pr/Math.pow(c/Math.max(1,S().run.sparks),0.3);if(sc>bs){bs=sc;best=u;}}if(!best)break;G.startBuild(best.id,NOW);}
  for(const j of G.JOKERS)if(G.jokerAvail(j)&&!S().jk[j.id]&&S().run.sparks>=j.sh*2)G.unlockJoker(j.id,'s');}
function claimAll(){const v=G.questView();for(const q of v.onb.concat(v.d,v.w))if(q.p>=q.n&&!q.done)G.claim(q.kind,q.i);}
function session(sec){
  const o=G.offlineGains(NOW);if(o)G.applyOffline(o,PROF.ads?2:1);
  S().lastSeen=NOW;G.roll();G.loginState();G.claimLogin();G.collect();
  if(PROF.ads)G.give({b:1});
  G.newRun();let t=0,lastKill=0,lastStage=S().run.stage,noProg=0;const dt=0.25;
  while(t<sec){
    G.runTick(dt);t+=dt;NOW+=dt*1000;
    if(Math.random()<PROF.mps*dt*(G.R.mode==='farm'?1:2.2))mergeOnce();
    if(Math.random()<dt*0.5)buyBoosters();
    for(const id in G.R.jk)if(G.R.jk[id]>=G.jokerNeed(id))G.useJoker(id);
    if(S().run.fled&&(G.R.t-S().run.fledAt>90||S().run.fledAt>G.R.t))G.challengeBoss();
    if(S().bestStage>=15&&G.titanReady()&&G.R.mode==='farm'){G.startTitan();titanRuns++;}
    if(S().run.stage!==lastStage){lastStage=S().run.stage;noProg=0;}else noProg+=dt;
    const g=G.prestigeGain();
    if(g>0&&(noProg>240||G.R.t>1800)){G.doPrestige();noProg=0;for(let k=0;k<8;k++){let best=-1,bc=99;for(let i=0;i<8;i++){const c=G.wpCost(i);if(c<bc){bc=c;best=i;}}if(!G.buyWP(best))break;}}
    if(Math.random()<dt*0.05){research();claimAll();}
    if(args.dbg&&day()==+args.dbg&&Math.floor(t)%20==0&&t%1<dt){const R=G.R,s=S();console.log(`   t${t.toFixed(0)} étape ${s.run.stage} mode ${R.mode} fled ${s.run.fled} hp ${(R.E.hp/R.E.max*100).toFixed(0)}% shield ${R.E.shieldL} gem ${Math.max(0,...R.cells.filter(c=>c&&c.l).map(c=>c.l))} spawnL ${G.spawnInterval().toFixed(2)}s lvl ${1+G.tbLvl('birth')} auto ${G.autoRate().toFixed(2)} cells ${R.cells.filter(Boolean).length} sparks ${fmtN(s.run.sparks)} pm ${fmtN(G.powerMult())}`);}
  }
  if(args.v&&day()<=+args.v){const R=G.R,s=S();console.log(`  J${day()} session ${sec}s → étape ${s.run.stage} max ${s.run.max} tb ${JSON.stringify(s.run.tb)} gemme max ${Math.max(0,...R.cells.filter(c=>c&&c.l).map(c=>c.l))} sparks ${fmtN(s.run.sparks)} étinc. ${fmtN(s.run.sparks)} pm ${G.powerMult().toFixed(1)}`);}
  research();claimAll();G.buySlot();
  for(let i=0;i<PROF.buyAds;i++){const b=S().build[0];if(b)G.adBuild(b.id,NOW);}
  S().lastSeen=NOW;
}
for(let d=1;d<=60;d++){
  const base=Date.UTC(2026,9,4+d);
  for(const [h,sec] of PROF.sessions){NOW=base+h*3600e3;session(sec);}
  G.tickBuild(NOW);
  if(d<=10||d%5===0){const s=S();const tb=s.run.tb;log.push(`J${String(d).padStart(2)} best ${String(s.bestStage).padStart(3)} prestiges ${String(s.prestiges).padStart(3)} étinc. ${fmtN(s.run.sparks).padStart(8)} recherches ${String(s.st.bought).padStart(3)} jokers ${Object.keys(s.jk).length} onb ${s.onb.length}/50 auto ${s.up.au_merge} st(cad ${s.up.st_cad} pow ${s.up.st_power} auto ${s.up.st_auto} birth ${s.up.st_birth}) auBuy ${s.up.au_buy} exped ${s.up.au_exped} manuel ${manualCount}`);manualCount=0;}
}
function fmtN(n){return n>=1e6?(n/1e6).toFixed(1)+'M':n>=1e3?(n/1e3).toFixed(1)+'k':String(Math.floor(n));}
console.log(PROFILE);console.log(log.join('\n'));
const s=S();console.log('titan',titanRuns,'record',fmtN(s.st.titanBest),'kills',s.st.kills,'bosses',s.st.bosses,'days',s.st.days);
console.log('recherches max :',Object.entries(s.up).filter(([k,v])=>v>0).map(([k,v])=>k+':'+v).join(' '));
